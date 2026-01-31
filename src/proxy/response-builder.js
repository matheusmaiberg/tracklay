/**
 * @fileoverview Build response with headers
 */

import { CONFIG } from '../config/index.js';
import { buildFullHeaders } from '../factories/headers-factory.js';

/**
 * @param {Response} upstreamResponse
 * @param {Request} request
 * @param {Object} options
 * @param {string} [options.cacheStatus='MISS']
 * @param {Object} [options.rateLimit]
 * @param {boolean} [options.isProxy=true]
 * @returns {Response}
 */
export function buildResponse(upstreamResponse, request, { cacheStatus = 'MISS', rateLimit, isProxy = true } = {}) {
  const response = new Response(upstreamResponse?.body, upstreamResponse);

  // Disable CSP for proxy responses to avoid breaking third-party content (e.g., Facebook sw_iframe.html)
  const standardHeaders = buildFullHeaders(request, { rateLimit, includeCSP: !isProxy });
  standardHeaders.forEach((value, key) => response.headers.set(key, value));

  if (CONFIG?.DEBUG_HEADERS_ENABLED) {
    response.headers.set('X-Cache-Status', cacheStatus);
  }

  return response;
}
