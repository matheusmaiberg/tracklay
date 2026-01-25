// ============================================================
// CACHE STRATEGY - CACHE DECISION LOGIC
// ============================================================
// RESPONSIBILITY:
// - shouldCache(url, request) → boolean
// - getCacheKey(url) → Request (only targetUrl + GET)
// - getCacheTTL(url) → number (CACHE_TTL for scripts)
// - Never cache endpoints (/g/collect, /tr)
// - Always cache scripts (.js)

// FUNCTIONS:
// - shouldCache(url, request) → boolean
// - getCacheKey(url) → Request
// - getCacheTTL(url) → number

import { CONFIG } from '../config/index.js';

/**
 * Determines if a URL should be cached
 * @param {URL} url - URL object from request
 * @param {Request} request - Request object
 * @returns {boolean} - true if should cache
 */
export function shouldCache(url, request) {
  // OPTIMIZATION: early return for .js scripts (common case)
  if (url.pathname.endsWith('.js')) {
    return true;
  }

  // Never cache tracking endpoints
  const trackingEndpoints = ['/g/collect', '/tr', '/collect'];
  if (trackingEndpoints.some(endpoint => url.pathname.includes(endpoint))) {
    return false;
  }

  return false;
}

/**
 * Creates correct cache key using only targetUrl + GET
 * @param {string} targetUrl - Full target URL
 * @returns {Request} - Request object to use as cache key
 */
export function getCacheKey(targetUrl) {
  return new Request(targetUrl, { method: 'GET' });
}

/**
 * Returns cache TTL for a URL
 * @param {URL} url - URL object from request
 * @returns {number} - TTL in seconds
 */
export function getCacheTTL(url) {
  // Scripts: use configured CACHE_TTL
  if (url.pathname.endsWith('.js')) {
    return CONFIG.CACHE_TTL;
  }

  // Default: no cache
  return 0;
}
