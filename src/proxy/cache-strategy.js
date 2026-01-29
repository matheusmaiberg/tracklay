/**
 * @fileoverview Cache decision logic
 */

import { CONFIG } from '../config/index.js';

/**
 * @param {Request} request
 * @returns {boolean}
 */
export function shouldCache(request) {
  if (request?.method !== 'GET') {
    return false;
  }

  const url = new URL(request.url);

  if (url.pathname === '/health' || url.pathname === '/options') {
    return false;
  }

  const { search } = url;
  const isTrackingHit = search.includes('v=2') ||
                        search.includes('tid=') ||
                        search.includes('_p=');

  if (isTrackingHit) {
    return false;
  }

  return true;
}

/**
 * @param {string} targetUrl
 * @returns {Request}
 */
export const getCacheKey = (targetUrl) => new Request(targetUrl, { method: 'GET' });

/**
 * @param {Request} request
 * @returns {number}
 */
export function getCacheTTL(request) {
  if (shouldCache(request)) {
    return CONFIG?.CACHE_TTL ?? 3600;
  }

  return 0;
}
