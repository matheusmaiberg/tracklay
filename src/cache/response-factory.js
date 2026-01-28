// ============================================================
// RESPONSE FACTORY - SCRIPT CACHE RESPONSE BUILDERS
// ============================================================
// RESPONSIBILITY:
// - Creates standardized Response objects for script cache
// - Factory functions for script and hash responses
// - Consistent headers and cache control
//
// FUNCTIONS:
// - createScriptResponse() - Creates script Response with cache headers
// - createHashResponse() - Creates hash Response

import { CONFIG } from '../config/index.js';
import { getCurrentDateISO } from '../utils/time.js';

/**
 * Creates a script Response object with proper cache headers
 * @param {string} content - Script content
 * @param {string} scriptKey - Script identifier (fbevents, gtm, gtag)
 * @param {string} hash - SHA-256 hash of script
 * @param {Object} options - Configuration options
 * @param {number} options.ttl - Cache TTL in seconds
 * @param {string} options.updateType - 'updated' | 'refreshed'
 * @param {boolean} [options.isStale=false] - Whether this is stale cache
 * @returns {Response} Script Response object
 */
export function createScriptResponse(content, scriptKey, hash, { ttl, updateType, isStale = false }) {
  const headers = {
    'Content-Type': 'application/javascript; charset=utf-8',
    'Cache-Control': `public, max-age=${ttl}`
  };

  // Add debug headers only if DEBUG_HEADERS is enabled
  // IMPORTANT: Debug headers expose internal implementation details
  // and can be used for fingerprinting. Only enable in development.
  if (CONFIG.DEBUG_HEADERS) {
    headers['X-Script-Key'] = scriptKey;
    headers['X-Script-Hash'] = hash;
    headers[`X-Cache-${updateType === 'updated' ? 'Updated' : 'Refreshed'}`] = getCurrentDateISO();

    if (isStale) {
      headers['X-Cache-Type'] = 'stale';
    }
  }

  return new Response(content, {
    status: 200,
    headers
  });
}

/**
 * Creates a hash Response object
 * @param {string} hash - SHA-256 hash string
 * @param {number} ttl - Cache TTL in seconds
 * @returns {Response} Hash Response object
 */
export function createHashResponse(hash, ttl) {
  return new Response(hash, {
    status: 200,
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': `public, max-age=${ttl}`
    }
  });
}
