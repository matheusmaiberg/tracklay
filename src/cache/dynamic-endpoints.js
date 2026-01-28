/**
 * @fileoverview Dynamic Endpoints Manager - UUID generation and caching for URLs
 * @module cache/dynamic-endpoints
 * 
 * @description
 * Manages dynamic endpoint creation for URLs found in scripts.
 * Generates unique UUIDs for each URL and stores mappings in cache.
 * Supports batch creation and URL resolution.
 * 
 * Cache Keys:
 * - dyn-endpoint:{uuid} → targetUrl (JSON Response)
 * - dyn-url-index:{normalizedUrl} → uuid (for UUID reuse)
 * 
 * @example
 * import { createDynamicEndpoint, batchCreateEndpoints, getTargetUrl } from './dynamic-endpoints.js';
 * 
 * const { uuid, proxiedUrl } = await createDynamicEndpoint(
 *   'https://google-analytics.com/collect',
 *   'https://worker.com'
 * );
 */

import { generateSHA256 } from '../utils/crypto.js';
import { Logger } from '../core/logger.js';
import { CacheManager } from '../core/cache.js';

/** @constant {string} */
const CACHE_PREFIX = 'dyn-endpoint:';

/** @constant {string} */
const URL_INDEX_PREFIX = 'dyn-url-index:';

/** @constant {number} Cache TTL in seconds (7 days) */
const CACHE_TTL = 604800;

/**
 * Creates a dynamic endpoint for a target URL
 * Reuses existing UUID if URL was previously registered
 * 
 * @param {string} targetUrl - Original URL to proxy
 * @param {string} workerOrigin - Worker origin (e.g., https://store.com)
 * @returns {Promise<{uuid: string, proxiedUrl: string}>} UUID and proxied URL
 * @throws {Error} If endpoint creation fails
 * 
 * @example
 * const result = await createDynamicEndpoint(
 *   'https://google-analytics.com/collect',
 *   'https://myshop.com'
 * );
 * console.log(result); // { uuid: 'a3f9c2e1b8d4e5f6', proxiedUrl: 'https://myshop.com/x/a3f9c2e1b8d4e5f6' }
 */
export async function createDynamicEndpoint(targetUrl, workerOrigin) {
  try {
    const normalizedUrl = normalizeForIndexing(targetUrl);
    
    const existingUuid = await getUuidForUrl(normalizedUrl);
    if (existingUuid) {
      const proxiedUrl = `${workerOrigin}/x/${existingUuid}`;
      Logger.debug('Reusing existing dynamic endpoint', {
        url: targetUrl.substring(0, 50),
        uuid: existingUuid
      });
      return { uuid: existingUuid, proxiedUrl };
    }

    const uuid = await generateEndpointUuid(targetUrl);
    
    await storeEndpointMapping(uuid, targetUrl, normalizedUrl);
    
    const proxiedUrl = `${workerOrigin}/x/${uuid}`;
    
    Logger.info('Dynamic endpoint created', {
      uuid,
      targetUrl: targetUrl.substring(0, 50),
      proxiedUrl
    });

    return { uuid, proxiedUrl };
  } catch (error) {
    Logger.error('Failed to create dynamic endpoint', {
      error: error.message,
      targetUrl: targetUrl.substring(0, 50)
    });
    throw error;
  }
}

/**
 * Creates multiple dynamic endpoints in batch
 * Processes URLs in parallel with concurrency limiting
 * 
 * @param {string[]} urls - Array of URLs to create endpoints for
 * @param {string} workerOrigin - Worker origin
 * @returns {Promise<Map<string, {uuid: string, proxiedUrl: string}>>} Map of URL to endpoint info
 * 
 * @example
 * const urls = ['https://example1.com', 'https://example2.com'];
 * const mapping = await batchCreateEndpoints(urls, 'https://shop.com');
 * console.log(mapping.get('https://example1.com')); // { uuid: '...', proxiedUrl: '...' }
 */
export async function batchCreateEndpoints(urls, workerOrigin) {
  const results = new Map();
  
  if (!urls?.length) {
    return results;
  }

  Logger.info('Creating dynamic endpoints in batch', {
    count: urls.length
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
 * Retrieves the original target URL from a UUID
 * 
 * @param {string} uuid - The UUID to look up
 * @returns {Promise<string|null>} Original URL or null if not found
 * 
 * @example
 * const targetUrl = await getTargetUrl('a3f9c2e1b8d4e5f6');
 * console.log(targetUrl); // 'https://google-analytics.com/collect'
 */
export async function getTargetUrl(uuid) {
  try {
    const cacheKey = `${CACHE_PREFIX}${uuid}`;
    const response = await CacheManager.get(cacheKey);
    
    if (!response) {
      Logger.debug('Dynamic endpoint not found in cache', { uuid });
      return null;
    }

    const data = await response.json();
    return data?.targetUrl ?? null;
  } catch (error) {
    Logger.error('Error retrieving target URL', {
      uuid,
      error: error.message
    });
    return null;
  }
}

/**
 * Checks if a UUID endpoint exists in cache
 * 
 * @param {string} uuid - UUID to check
 * @returns {Promise<boolean>} True if endpoint exists
 * 
 * @example
 * const exists = await hasEndpoint('a3f9c2e1b8d4e5f6');
 * console.log(exists); // true
 */
export async function hasEndpoint(uuid) {
  const cacheKey = `${CACHE_PREFIX}${uuid}`;
  const response = await CacheManager.get(cacheKey);
  return response !== null;
}

/**
 * Generates a deterministic UUID based on URL and current week
 * Same URL generates same UUID within the same week
 * 
 * @param {string} url - URL to generate UUID for
 * @returns {Promise<string>} 16-character hexadecimal UUID
 * @private
 */
async function generateEndpointUuid(url) {
  const weekNumber = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  const data = `${weekNumber}:${url}`;
  
  const hash = await generateSHA256(data);
  
  return hash.substring(0, 16);
}

/**
 * Stores UUID to URL mapping in cache
 * Also stores reverse index for UUID reuse
 * 
 * @param {string} uuid - Generated UUID
 * @param {string} targetUrl - Original target URL
 * @param {string} normalizedUrl - Normalized URL for indexing
 * @returns {Promise<void>}
 * @private
 */
async function storeEndpointMapping(uuid, targetUrl, normalizedUrl) {
  const cacheKey = `${CACHE_PREFIX}${uuid}`;
  const indexKey = `${URL_INDEX_PREFIX}${normalizedUrl}`;
  
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
}

/**
 * Retrieves existing UUID for a normalized URL
 * 
 * @param {string} normalizedUrl - Normalized URL
 * @returns {Promise<string|null>} UUID or null if not found
 * @private
 */
async function getUuidForUrl(normalizedUrl) {
  try {
    const indexKey = `${URL_INDEX_PREFIX}${normalizedUrl}`;
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
 * Normalizes URL for indexing by removing query params
 * 
 * @param {string} url - Original URL
 * @returns {string} Normalized URL (protocol + hostname + pathname)
 * @private
 */
function normalizeForIndexing(url) {
  if (!url) return '';
  
  try {
    const { protocol, hostname, pathname } = new URL(url);
    return `${protocol}//${hostname}${pathname}`;
  } catch {
    return url.split('?')[0].split('#')[0];
  }
}
