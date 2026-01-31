/**
 * @fileoverview Cache Invalidation - Centralized cache invalidation logic
 * @module cache/cache-invalidation
 */

import { CacheManager } from '../core/cache.js';
import { normalizeUrl } from '../utils/url.js';
import { Logger } from '../core/logger.js';

// Track URL to script key mappings for cache invalidation
const urlToScriptKeys = new Map();
const MAX_CACHE_SIZE = 10000;

/**
 * Register that a script contains specific URLs for cache invalidation
 * @param {string} scriptKey - Script key
 * @param {string[]} urls - URLs contained in the script
 */
export function registerScriptUrls(scriptKey, urls) {
  // Limpar se muito grande
  if (urlToScriptKeys.size > MAX_CACHE_SIZE) {
    const entriesToDelete = Math.floor(MAX_CACHE_SIZE * 0.2); // 20%
    const keys = Array.from(urlToScriptKeys.keys()).slice(0, entriesToDelete);
    keys.forEach(k => urlToScriptKeys.delete(k));
    Logger.info('Cleaned URL cache', { removed: entriesToDelete, remaining: urlToScriptKeys.size });
  }
  
  for (const url of urls) {
    const normalized = normalizeUrl(url);
    const keys = urlToScriptKeys.get(normalized) || new Set();
    keys.add(scriptKey);
    urlToScriptKeys.set(normalized, keys);
  }
}

/**
 * Invalidate script cache for scripts containing a specific URL
 * @param {string} url - URL to search for
 * @returns {Promise<void>}
 */
export async function invalidateScriptCacheForUrl(url) {
  const normalized = normalizeUrl(url);
  const keys = urlToScriptKeys.get(normalized);
  if (keys) {
    for (const scriptKey of keys) {
      await invalidateScriptCache(scriptKey);
    }
    // Clean up mappings after invalidation
    urlToScriptKeys.delete(normalized);
  }
}

/**
 * Invalidates script cache to force re-fetch
 * @param {string} scriptKey - Script key (e.g., 'fbevents', 'gtm:GTM-XXX')
 * @returns {Promise<boolean>} True if cache was invalidated
 */
export async function invalidateScriptCache(scriptKey) {
  const CACHE_BASE = 'https://cache.internal/';
  const CACHE_PREFIX = `${CACHE_BASE}script/`;
  const STALE_PREFIX = `${CACHE_BASE}script-stale/`;
  const HASH_PREFIX = `${CACHE_BASE}script-hash/`;

  const cacheKey = `${CACHE_PREFIX}${scriptKey}`;
  const staleKey = `${STALE_PREFIX}${scriptKey}`;
  const hashKey = `${HASH_PREFIX}${scriptKey}`;

  await Promise.all([
    CacheManager.delete(cacheKey),
    CacheManager.delete(staleKey),
    CacheManager.delete(hashKey)
  ]);

  return true;
}


