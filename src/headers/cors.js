/**
 * @fileoverview CORS Headers - Build CORS headers
 * @module headers/cors
 */

import { CONFIG } from '../config/index.js';
import { getOriginFromRequest } from '../utils/request.js';

/**
 * @param {Request} request - Cloudflare Worker Request object
 * @returns {Headers} Headers with CORS configured or empty if origin not allowed
 */
export function buildCORSHeaders(request) {
  const origin = request.headers.get('Origin');

  let allowedOrigin = null;

  if (CONFIG.ALLOWED_ORIGINS.length === 0) {
    allowedOrigin = getOriginFromRequest(request);
  } else if (origin && CONFIG.ALLOWED_ORIGINS.includes(origin)) {
    allowedOrigin = origin;
  } else if (origin === 'null') {
    allowedOrigin = 'null';
  }

  if (!allowedOrigin) {
    return new Headers();
  }

  const headers = new Headers();

  headers.set('Access-Control-Allow-Origin', allowedOrigin);
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');

  const allowedHeaders = [
    'Content-Type',
    'Accept',
    'Accept-Language',
    'X-Client-Data',
    'X-Requested-With',
    'X-Gtm-Server-Preview',
    'X-Gtm-Debug-Id',
    'User-Agent',
    'Referer',
    'Cookie',
    'Authorization',
  ].join(', ');

  headers.set('Access-Control-Allow-Headers', allowedHeaders);
  headers.set('Access-Control-Max-Age', '86400');
  headers.set('Access-Control-Expose-Headers', 'X-Request-Id, X-Cache-Status');

  return headers;
}
