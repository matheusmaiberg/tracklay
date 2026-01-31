/**
 * @fileoverview Response factory - Creates standardized Response objects for script cache
 * @module cache/response-factory
 */

import { CONFIG } from '../config/index.js';
import { getCurrentDateISO } from '../utils/time.js';

/**
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

  if (CONFIG.DEBUG_HEADERS_ENABLED) {
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
