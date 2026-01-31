/**
 * @fileoverview Dynamic Endpoints Manager - UUID generation and caching for URLs
 * @module cache/dynamic-endpoints
 */

import { generateSHA256 } from '../utils/crypto.js';
import { Logger } from '../core/logger.js';
import { CacheManager } from '../core/cache.js';
import { invalidateScriptCacheForUrl } from './cache-invalidation.js';
import { normalizeUrl } from '../utils/url.js';

const CACHE_BASE = 'https://cache.internal/';
const CACHE_PREFIX = `${CACHE_BASE}dyn-endpoint/`;
const URL_INDEX_PREFIX = `${CACHE_BASE}dyn-url-index/`;
const CACHE_TTL = 1209600; // 14 days (longer than script stale TTL of 7 days)

// Pending creations map for race condition prevention
const pendingCreations = new Map();

/**
 * @param {string} targetUrl - Original URL to proxy
 * @param {string} [workerOrigin] - Worker origin for absolute URLs (e.g., https://cdn.yourstore.com)
 * @returns {Promise<{uuid: string, proxyPath: string}>} UUID and proxy path
 */
export async function createDynamicEndpoint(targetUrl, workerOrigin = '') {
  const normalizedUrl = normalizeForIndexing(targetUrl);
  
  // Check cache first
  const existingUuid = await getUuidForUrl(normalizedUrl);
  if (existingUuid) {
    const proxyPath = workerOrigin ? `${workerOrigin}/x/${existingUuid}` : `/x/${existingUuid}`;
    Logger.debug('Reusing existing dynamic endpoint', {
      url: targetUrl.substring(0, 50),
      uuid: existingUuid
    });
    return { uuid: existingUuid, proxyPath };
  }
  
  // Check pending creation
  if (pendingCreations.has(normalizedUrl)) {
    return pendingCreations.get(normalizedUrl);
  }
  
  // Create promise and store
  const creationPromise = (async () => {
    try {
      const uuid = await generateEndpointUuid(targetUrl);
      await storeEndpointMapping(uuid, targetUrl, normalizedUrl);
      const proxyPath = workerOrigin ? `${workerOrigin}/x/${uuid}` : `/x/${uuid}`;
      
      Logger.info('Dynamic endpoint created', {
        uuid,
        targetUrl: targetUrl.substring(0, 50),
        proxyPath
      });
      
      return { uuid, proxyPath };
    } catch (error) {
      Logger.error('Failed to create dynamic endpoint', {
        error: error.message,
        targetUrl: targetUrl.substring(0, 50)
      });
      throw error;
    } finally {
      pendingCreations.delete(normalizedUrl);
    }
  })();
  
  pendingCreations.set(normalizedUrl, creationPromise);
  return creationPromise;
}

/**
 * @param {string[]} urls - Array of URLs to create endpoints for
 * @param {string} [workerOrigin] - Worker origin for absolute URLs (e.g., https://cdn.yourstore.com)
 * @returns {Promise<Map<string, {uuid: string, proxyPath: string}>>} Map of URL to endpoint info
 */
export async function batchCreateEndpoints(urls, workerOrigin = '') {
  const results = new Map();

  if (!urls?.length) {
    return results;
  }

  Logger.info('Creating dynamic endpoints in batch', {
    count: urls.length,
    workerOrigin: workerOrigin || '(relative)'
  });

  const batchSize = 10;
  for (let i = 0; i < urls.length; i += batchSize) {
    const batch = urls.slice(i, i + batchSize);
    const promises = batch.map(async (url) => {
      try {
        const result = await createDynamicEndpoint(url, workerOrigin);
        results.set(url, result);
      } catch (error) {
        Logger.warn('Failed to create endpoint for URL', {
          url: url.substring(0, 50),
          error: error.message
        });
      }
    });

    await Promise.all(promises);
  }

  Logger.info('Batch endpoints creation completed', {
    requested: urls.length,
    created: results.size
  });

  return results;
}

/**
 * @param {string} uuid - The UUID to look up
 * @returns {Promise<string|null>} Original URL or null if not found
 */
export async function getTargetUrl(uuid) {
  try {
    const cacheKey = `${CACHE_PREFIX}${uuid}`;
    const response = await CacheManager.get(cacheKey);
    
    if (!response) {
      Logger.debug('Dynamic endpoint not found in cache', { uuid });
      return null;
    }

    try {
      const data = await response.json();
      return data?.targetUrl ?? null;
    } catch (error) {
      Logger.error('Failed to parse endpoint data', { uuid, error: error.message });
      return null;
    }
  } catch (error) {
    Logger.error('Error retrieving target URL', {
      uuid,
      error: error.message
    });
    return null;
  }
}

/**
 * @param {string} uuid - UUID to check
 * @returns {Promise<boolean>} True if endpoint exists
 */
export async function hasEndpoint(uuid) {
  const cacheKey = `${CACHE_PREFIX}${uuid}`;
  const response = await CacheManager.get(cacheKey);
  return response !== null;
}

/**
 * @param {string} url - URL to generate UUID for
 * @returns {Promise<string>} 16-character hexadecimal UUID
 */
async function generateEndpointUuid(url) {
  // Use only URL for deterministic UUID (not time-based)
  // This ensures URLs rewritten in cached scripts remain valid
  const normalizedUrl = normalizeForIndexing(url);
  const hash = await generateSHA256(normalizedUrl);
  
  return hash.substring(0, 32); // 128 bits
}

/**
 * @param {string} uuid - Generated UUID
 * @param {string} targetUrl - Original target URL
 * @param {string} normalizedUrl - Normalized URL for indexing
 * @returns {Promise<void>}
 */
async function storeEndpointMapping(uuid, targetUrl, normalizedUrl) {
  const cacheKey = `${CACHE_PREFIX}${uuid}`;
  // Use hash of normalized URL as index key to avoid special characters
  const urlHash = await generateSHA256(normalizedUrl);
  const indexKey = `${URL_INDEX_PREFIX}${urlHash}`;

  const endpointData = {
    uuid,
    targetUrl,
    normalizedUrl,
    createdAt: Date.now()
  };

  const response = new Response(JSON.stringify(endpointData), {
    headers: {
      'Content-Type': 'application/json'
    }
  });

  await Promise.all([
    CacheManager.put(cacheKey, response, CACHE_TTL),
    CacheManager.put(indexKey, new Response(uuid), CACHE_TTL)
  ]);

  // Invalidate scripts containing this URL
  await invalidateScriptCacheForUrl(targetUrl);
}

/**
 * @param {string} normalizedUrl - Normalized URL
 * @returns {Promise<string|null>} UUID or null if not found
 */
async function getUuidForUrl(normalizedUrl) {
  try {
    // Use hash of normalized URL as index key to avoid special characters
    const urlHash = await generateSHA256(normalizedUrl);
    const indexKey = `${URL_INDEX_PREFIX}${urlHash}`;
    const response = await CacheManager.get(indexKey);

    if (!response) {
      return null;
    }

    return await response.text();
  } catch (error) {
    Logger.warn('Error looking up UUID in index', {
      error: error.message
    });
    return null;
  }
}

/**
 * @param {string} url - Original URL
 * @returns {string} Normalized URL (protocol + hostname + pathname)
 */
function normalizeForIndexing(url) {
  return normalizeUrl(url);
}
