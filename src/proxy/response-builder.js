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
 * @param {boolean} [options.isScript=false] - Whether this is a script response (disables frame options for GTM iframes)
 * @returns {Response}
 */
export function buildResponse(upstreamResponse, request, { cacheStatus = 'MISS', rateLimit, isProxy = true, isScript = true } = {}) {
  const response = new Response(upstreamResponse?.body, upstreamResponse);

  // Disable CSP for proxy responses to avoid breaking third-party content (e.g., Facebook sw_iframe.html)
  // X-Frame-Options disabled by default (includeFrameOptions: false) to support GTM/Facebook iframes
  const standardHeaders = buildFullHeaders(request, { 
    rateLimit, 
    includeCSP: !isProxy,
    includeFrameOptions: false  // Always disable X-Frame-Options for proxy responses
  });
  standardHeaders.forEach((value, key) => response.headers.set(key, value));

  if (CONFIG?.DEBUG_HEADERS_ENABLED) {
    response.headers.set('X-Cache-Status', cacheStatus);
  }

  return response;
}
