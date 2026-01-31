/**
 * @fileoverview Script Cache - Intelligent caching for third-party scripts
 * @module cache/script-cache
 */

import { generateSHA256 } from '../utils/crypto.js';
import { Logger } from '../core/logger.js';
import { CacheManager } from '../core/cache.js';
import { fetchWithTimeout } from '../core/fetch.js';
import { createScriptResponse, createHashResponse } from './response-factory.js';
import { extractUrls, filterTrackableUrls } from '../proxy/url-extractor.js';
import { batchCreateEndpoints } from './dynamic-endpoints.js';
import { processScript } from '../services/full-script-proxy.js';
import { CONFIG } from '../config/index.js';
import { registerScriptUrls, invalidateScriptCacheForUrl } from './cache-invalidation.js';

export { invalidateScriptCacheForUrl };

export const SCRIPT_URLS = {
  fbevents: 'https://connect.facebook.net/en_US/fbevents.js',
  // gtm removed - now on-demand per container (requires ?id=GTM-XXX)
  gtag: 'https://www.googletagmanager.com/gtag/js'
};

// Valid container ID patterns for DoS protection
const VALID_CONTAINER_PATTERN = /^(GTM|G|GT|AW|DC)-[A-Z0-9]{6,12}$/i;

// Shorter TTL for on-demand cached scripts (12h vs 24h for scheduled)
const ON_DEMAND_TTL = 43200;

const CACHE_BASE = 'https://cache.internal/';
const CACHE_PREFIX = `${CACHE_BASE}script/`;
const STALE_PREFIX = `${CACHE_BASE}script-stale/`;
const HASH_PREFIX = `${CACHE_BASE}script-hash/`;
const CACHE_TTL = 86400;
const STALE_TTL = 604800;

// Pending fetches map for request coalescing
const pendingFetches = new Map();

/**
 * @param {string} content - Script content
 * @param {string} scriptKey - Script identifier
 * @param {string} hash - Script hash
 * @param {string} updateType - 'updated' | 'refreshed'
 * @returns {Promise<void>}
 */
async function updateScriptCache(content, scriptKey, hash, updateType) {
  const cacheKey = `${CACHE_PREFIX}${scriptKey}`;
  const staleKey = `${STALE_PREFIX}${scriptKey}`;
  const hashKey = `${HASH_PREFIX}${scriptKey}`;

  const scriptResponse = createScriptResponse(content, scriptKey, hash, {
    ttl: CACHE_TTL,
    updateType,
    isStale: false
  });

  const staleResponse = createScriptResponse(content, scriptKey, hash, {
    ttl: STALE_TTL,
    updateType,
    isStale: true
  });

  const hashResponse = createHashResponse(hash, CACHE_TTL);

  await Promise.all([
    CacheManager.put(cacheKey, scriptResponse, CACHE_TTL),
    CacheManager.put(staleKey, staleResponse, STALE_TTL),
    CacheManager.put(hashKey, hashResponse, CACHE_TTL)
  ]);
}

/**
 * @param {string} scriptKey - Nome do script (fbevents, gtm, gtag)
 * @returns {Promise<Response|null>} - Response do cache ou null
 */
export async function getScriptFromCache(scriptKey) {
  try {
    const cacheKey = `${CACHE_PREFIX}${scriptKey}`;
    const cached = await CacheManager.get(cacheKey);

    if (cached) {
      Logger.debug('Script cache hit (fresh)', { scriptKey });
      return cached;
    }

    const staleKey = `${STALE_PREFIX}${scriptKey}`;
    const staleCached = await CacheManager.get(staleKey);

    if (staleCached) {
      Logger.warn('Script cache hit (stale fallback)', {
        scriptKey,
        message: 'Fresh cache expired, serving stale content'
      });

      const staleResponse = new Response(staleCached.body, {
        status: staleCached.status,
        headers: staleCached.headers
      });
      staleResponse.headers.set('X-Cache-Status', 'stale');

      return staleResponse;
    }

    Logger.debug('Script cache miss (fresh and stale)', { scriptKey });
    return null;
  } catch (error) {
    Logger.warn('Failed to get script from cache', {
      scriptKey,
      error: error.message
    });
    return null;
  }
}

/**
 * @param {string} url - URL do script
 * @param {string} scriptKey - Nome do script (fbevents, gtm, gtag)
 * @returns {Promise<{updated: boolean, urlsProcessed?: number, error?: string}>}
 */
export async function fetchAndCompareScript(url, scriptKey) {
  try {
    Logger.info('Fetching script for cache update', { scriptKey, url });

    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/javascript, */*',
      }
    });

    if (!response.ok) {
      const { status, statusText } = response;
      Logger.error('Failed to fetch script', {
        scriptKey,
        status,
        statusText
      });
      return { updated: false, error: `HTTP ${status}` };
    }

    const scriptContent = await response.text();

    // Process for Full Script Proxy (extract URLs, create endpoints, rewrite)
    // Use WORKER_BASE_URL from config for cron jobs (no request available)
    const { content: processedContent, urlsProcessed } =
      await processScript(scriptContent, scriptKey, CONFIG.WORKER_BASE_URL);

    // Register URLs for cache invalidation
    const allUrls = extractUrls(scriptContent);
    const trackableUrls = filterTrackableUrls(allUrls);
    if (trackableUrls.length > 0) {
      registerScriptUrls(scriptKey, trackableUrls);
    }

    const newHash = await generateSHA256(processedContent);

    const hashKey = `${HASH_PREFIX}${scriptKey}`;
    const oldHashResponse = await CacheManager.get(hashKey);
    const oldHash = (await oldHashResponse?.text()) ?? null;

    const hasChanged = oldHash !== newHash;

    if (hasChanged) {
      Logger.info('Script content changed, updating cache', {
        scriptKey,
        oldHash: oldHash ? `${oldHash.substring(0, 16)}...` : 'none',
        newHash: `${newHash.substring(0, 16)}...`,
        urlsProxied: urlsProcessed
      });

      await updateScriptCache(processedContent, scriptKey, newHash, 'updated');

      Logger.info('Script cache updated (fresh + stale)', { scriptKey });
      return { updated: true, urlsProcessed };

    } else {
      Logger.info('Script unchanged, refreshing TTL', { scriptKey, urlsProxied: urlsProcessed });

      await updateScriptCache(processedContent, scriptKey, newHash, 'refreshed');

      return { updated: false, urlsProcessed };
    }

  } catch (error) {
    Logger.error('Error in fetchAndCompareScript', {
      scriptKey,
      error: error.message,
      stack: error.stack
    });
    return { updated: false, error: error.message };
  }
}

/**
 * Identifies script type and extracts container ID for per-container caching
 * @param {string} url - URL do script
 * @returns {string|null} - Script key (e.g., 'fbevents', 'gtm:GTM-XXX', 'gtag:G-XXX') ou null
 */
export function identifyScriptKey(url) {
  if (url.includes('fbevents.js')) return 'fbevents';

  // GTM/gtag: extract container ID for per-container caching
  if (url.includes('gtm.js') || url.includes('gtag/js')) {
    const type = url.includes('gtm.js') ? 'gtm' : 'gtag';

    try {
      const parsedUrl = new URL(url);
      const containerId = parsedUrl.searchParams.get('id');

      // Validate container ID format to prevent DoS via fake IDs
      if (containerId && VALID_CONTAINER_PATTERN.test(containerId)) {
        return `${type}:${containerId}`;
      }
    } catch {
      // Invalid URL, fall through to generic type
    }

    return type;
  }

  return null;
}

/**
 * Checks if a script key is container-specific (requires on-demand fetch)
 * @param {string} scriptKey - Script key
 * @returns {boolean}
 */
export function isContainerSpecificKey(scriptKey) {
  return scriptKey?.includes(':') ?? false;
}

/**
 * Validates worker origin format
 * @param {string} origin - Worker origin URL
 * @returns {boolean}
 */
function isValidWorkerOrigin(origin) {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Fetches script on-demand, processes through Full Script Proxy, and caches
 * Used for container-specific scripts (GTM/gtag with ?id= parameter)
 * @param {string} targetUrl - Full URL with container ID
 * @param {string} scriptKey - Composite key (e.g., 'gtm:GTM-XXX')
 * @param {string} [workerOrigin] - Worker origin for absolute URLs (e.g., https://cdn.yourstore.com)
 * @returns {Promise<Response|null>}
 */
export async function fetchAndCacheOnDemand(targetUrl, scriptKey, workerOrigin = '') {
  // Check pending fetch
  if (pendingFetches.has(scriptKey)) {
    return pendingFetches.get(scriptKey);
  }
  
  const fetchPromise = (async () => {
    try {
      if (workerOrigin && !isValidWorkerOrigin(workerOrigin)) {
        Logger.warn('Invalid workerOrigin, using relative URLs', { workerOrigin });
        workerOrigin = '';
      }
      Logger.info('On-demand script fetch', { scriptKey, url: targetUrl, workerOrigin: workerOrigin || '(relative)' });

      const response = await fetchWithTimeout(targetUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/javascript, */*',
        }
      });

      if (!response.ok) {
        Logger.error('On-demand fetch failed', {
          scriptKey,
          status: response.status,
          statusText: response.statusText
        });
        return null;
      }

      const scriptContent = await response.text();

      // Process through Full Script Proxy pipeline
      const validOrigin = isValidWorkerOrigin(workerOrigin) ? workerOrigin : '';
      const { content: processedContent, urlsProcessed } =
        await processScript(scriptContent, scriptKey, validOrigin);

      // Register URLs for cache invalidation
      const allUrls = extractUrls(scriptContent);
      const trackableUrls = filterTrackableUrls(allUrls);
      if (trackableUrls.length > 0) {
        registerScriptUrls(scriptKey, trackableUrls);
      }

      const hash = await generateSHA256(processedContent);

      // Cache with shorter TTL for on-demand scripts
      const cacheKey = `${CACHE_PREFIX}${scriptKey}`;
      const staleKey = `${STALE_PREFIX}${scriptKey}`;

      const scriptResponse = createScriptResponse(processedContent, scriptKey, hash, {
        ttl: ON_DEMAND_TTL,
        updateType: 'on-demand',
        isStale: false
      });

      const staleResponse = createScriptResponse(processedContent, scriptKey, hash, {
        ttl: STALE_TTL,
        updateType: 'on-demand',
        isStale: true
      });

      await Promise.all([
        CacheManager.put(cacheKey, scriptResponse, ON_DEMAND_TTL),
        CacheManager.put(staleKey, staleResponse, STALE_TTL)
      ]);

      Logger.info('On-demand script cached', { scriptKey, urlsProcessed });

      // Return fresh response for immediate use
      return createScriptResponse(processedContent, scriptKey, hash, {
        ttl: ON_DEMAND_TTL,
        updateType: 'on-demand',
        isStale: false
      });

    } catch (error) {
      Logger.error('On-demand fetch error', {
        scriptKey,
        error: error.message
      });
      return null;
    } finally {
      pendingFetches.delete(scriptKey);
    }
  })();
  
  pendingFetches.set(scriptKey, fetchPromise);
  return fetchPromise;
}
