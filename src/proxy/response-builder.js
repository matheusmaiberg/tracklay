/**
 * @fileoverview Build response with headers
 */

import { CONFIG } from '../config/index.js';
import { buildFullHeaders } from '../factories/headers-factory.js';

export function buildResponse(upstreamResponse, request, { cacheStatus = 'MISS', rateLimit } = {}) {
  const response = new Response(upstreamResponse?.body, upstreamResponse);

  const standardHeaders = buildFullHeaders(request, { rateLimit });
  standardHeaders.forEach((value, key) => response.headers.set(key, value));

  if (CONFIG?.DEBUG_HEADERS_ENABLED) {
    response.headers.set('X-Cache-Status', cacheStatus);
  }

  return response;
}
