/**
 * @fileoverview Options Handler - CORS preflight
 * @module handlers/options
 */

import { buildFullHeaders } from '../factories/headers-factory.js';

/**
 * @param {Request} request
 * @param {Object} rateLimit - Rate limit info from worker
 * @returns {Response}
 */
export function handleOptions(request, rateLimit = null) {
  const headers = buildFullHeaders(request, { rateLimit });

  return new Response(null, { status: 204, headers });
}
