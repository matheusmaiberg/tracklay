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
 *
 * ULTRA-AGGRESSIVE MODE:
 * Scripts and endpoints share same path (no suffixes).
 * Differentiation strategy:
 * - Facebook: POST = tracking (never cache), GET = script (cache)
 * - Google: Query params differentiate (v2.x breaking change)
 *
 * CRITICAL: GA4/GTM uses GET for BOTH scripts AND tracking events!
 * We MUST detect tracking hits by query parameters, not HTTP method.
 *
 * @param {Request} request - Request object
 * @returns {boolean} - true if should cache
 */
export function shouldCache(request) {
  // Never cache non-GET requests (POST/PUT/DELETE)
  // This handles Facebook tracking (POST method)
  if (request.method !== 'GET') {
    return false;
  }

  const url = new URL(request.url);

  // Health and options endpoints (never cache)
  if (url.pathname === '/health' || url.pathname === '/options') {
    return false;
  }

  // CRITICAL FIX: Detect GA4 tracking hits by query parameters
  // GA4 tracking events include these params:
  // - v=2 (protocol version)
  // - tid= (tracking ID, e.g., tid=G-XXXXX)
  // - _p= (page hit counter)
  //
  // These indicate tracking events that must NEVER be cached.
  // Script loading uses: c= (container alias) or id= (container ID)
  const search = url.search;
  const isTrackingHit = search.includes('v=2') ||
                        search.includes('tid=') ||
                        search.includes('_p=');

  if (isTrackingHit) {
    return false; // Never cache tracking events
  }

  // All other GET requests to UUID paths are scripts (cacheable)
  // Pattern: /cdn/f/{UUID} or /cdn/g/{UUID}?c=alias
  return true;
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
 *
 * ULTRA-AGGRESSIVE MODE:
 * No .js suffix anymore, so we can't rely on file extension.
 * Use CONFIG.CACHE_TTL for all cacheable requests.
 *
 * @param {Request} request - Request object
 * @returns {number} - TTL in seconds
 */
export function getCacheTTL(request) {
  // If shouldCache returned true, use configured CACHE_TTL
  // This covers all script loading requests (GET without tracking params)
  if (shouldCache(request)) {
    return CONFIG.CACHE_TTL;
  }

  // Default: no cache
  return 0;
}
