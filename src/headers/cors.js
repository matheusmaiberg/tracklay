// ============================================================
// CORS HEADERS - BUILD CORS HEADERS
// ============================================================
// RESPONSIBILITY:
// - buildCORSHeaders(request) → Headers
// - Verify Origin in ALLOWED_ORIGINS or auto-detect
// - Add Access-Control-Allow-Origin
// - Access-Control-Allow-Credentials: true
// - Access-Control-Allow-Methods: GET, POST, OPTIONS, HEAD
// - Access-Control-Allow-Headers: complete list (GTM, Meta)
// - Access-Control-Max-Age: 86400
// - Access-Control-Expose-Headers: X-Request-Id, X-Cache-Status

// FUNCTIONS:
// - buildCORSHeaders(request) → Headers
// - isOriginAllowed(origin) → boolean (helper)

import { CONFIG, getOriginFromRequest } from '../config/index.js';

/**
 * Build CORS headers for response
 * Auto-detects origin from request URL if ALLOWED_ORIGINS is empty
 * @param {Request} request - Cloudflare Worker Request object
 * @returns {Headers} Headers with CORS configured or empty if origin not allowed
 */
export function buildCORSHeaders(request) {
  const headers = new Headers();
  const origin = request.headers.get('Origin');

  // Auto-detect origin if ALLOWED_ORIGINS is empty (recommended)
  let allowedOrigin = null;

  if (CONFIG.ALLOWED_ORIGINS.length === 0) {
    // Auto-detect: use the request URL origin
    allowedOrigin = getOriginFromRequest(request);
  } else if (origin && CONFIG.ALLOWED_ORIGINS.includes(origin)) {
    // Manual configuration: check if origin is in allowed list
    allowedOrigin = origin;
  }

  if (!allowedOrigin) {
    return headers;
  }

  // Complete CORS with all necessary headers
  headers.set('Access-Control-Allow-Origin', allowedOrigin);
  headers.set('Access-Control-Allow-Credentials', 'true');
  headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');

  // Allow ALL headers that GTM/Meta can send
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
    'Authorization'
  ].join(', ');

  headers.set('Access-Control-Allow-Headers', allowedHeaders);
  headers.set('Access-Control-Max-Age', '86400'); // 24 hours
  headers.set('Access-Control-Expose-Headers', 'X-Request-Id, X-Cache-Status');

  return headers;
}
