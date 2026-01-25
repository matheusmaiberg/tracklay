// ============================================================
// MAPPING - URL MAPPINGS (SCRIPTS E ENDPOINTS)
// ============================================================
// RESPONSIBILITY:
// - Exportar SCRIPT_MAP: { path → targetUrl }
// - Exportar ENDPOINT_MAP: { path → targetUrl }
// - Suportar múltiplos paths (/cdn/, /assets/, /static/)

import { CONFIG } from '../config/index.js';

// ============= CACHE FOR MEMOIZATION =============
// Cache the maps to avoid rebuilding them on every request (1-3ms gain)
let scriptMapCache = null;
let endpointMapCache = null;

// ============= SCRIPT MAPPINGS =============
// Map proxy paths to original script URLs
//
// OBFUSCATION STRATEGY:
// - Primary (Obfuscated): /cdn/f/{UUID}-script.js for Facebook, /cdn/g/{UUID}-{type}.js for Google
// - Fallback (Legacy): /cdn/fbevents.js, /cdn/gtm.js (for backward compatibility, but DETECTABLE)

/**
 * Get script mappings with obfuscated paths
 * Uses configured UUIDs from CONFIG for maximum anti-detection
 * Memoized for performance (1-3ms improvement)
 * @returns {Object} Script path to target URL mapping
 */
export function getScriptMap() {
  if (scriptMapCache) {
    return scriptMapCache;
  }

  scriptMapCache = {
    // ============= OBFUSCATED SCRIPTS (RECOMMENDED) =============
    // Facebook Events - Obfuscated UUID-based script
    // Format: /cdn/f/{FACEBOOK_ENDPOINT_ID}-script.js
    [`/cdn/f/${CONFIG.FACEBOOK_ENDPOINT_ID}-script.js`]: 'https://connect.facebook.net/en_US/fbevents.js',

    // Google Tag Manager - Obfuscated UUID-based script
    // Format: /cdn/g/{GOOGLE_ENDPOINT_ID}-gtm.js
    [`/cdn/g/${CONFIG.GOOGLE_ENDPOINT_ID}-gtm.js`]: 'https://www.googletagmanager.com/gtm.js',

    // Google Tag (gtag.js) - Obfuscated UUID-based script
    // Format: /cdn/g/{GOOGLE_ENDPOINT_ID}-tag.js
    [`/cdn/g/${CONFIG.GOOGLE_ENDPOINT_ID}-tag.js`]: 'https://www.googletagmanager.com/gtag/js',

    // ============= LEGACY SCRIPTS (BACKWARD COMPATIBILITY - DETECTABLE) =============
    // WARNING: These filenames are well-known and blocked by ad-blockers
    // Kept only for backward compatibility
    // RECOMMENDATION: Migrate to obfuscated scripts above
    '/cdn/fbevents.js': 'https://connect.facebook.net/en_US/fbevents.js',
    '/cdn/gtm.js': 'https://www.googletagmanager.com/gtm.js',
    '/cdn/gtag.js': 'https://www.googletagmanager.com/gtag/js',

    // Alternative paths - same targets (also detectable)
    '/assets/fbevents.js': 'https://connect.facebook.net/en_US/fbevents.js',
    '/assets/gtm.js': 'https://www.googletagmanager.com/gtm.js',

    '/static/fbevents.js': 'https://connect.facebook.net/en_US/fbevents.js',
    '/static/gtm.js': 'https://www.googletagmanager.com/gtm.js'
  };

  return scriptMapCache;
}

// Export static map for backward compatibility
export const SCRIPT_MAP = getScriptMap();

// ============= ENDPOINT MAPPINGS =============
// Map proxy endpoints to original tracking URLs
// Note: GTM endpoints require GTM_SERVER_URL to be configured
//
// OBFUSCATION STRATEGY:
// - Primary (Obfuscated): /cdn/f/{UUID}.js for Facebook, /cdn/g/{UUID}.js for Google
// - Fallback (Legacy): /tr, /g/collect (for backward compatibility, but DETECTABLE)
export function getEndpointMap() {
  if (endpointMapCache) {
    return endpointMapCache;
  }

  const map = {};

  // ============= OBFUSCATED ENDPOINTS (RECOMMENDED) =============
  // Facebook Pixel - Obfuscated UUID-based endpoint
  // Format: /cdn/f/{FACEBOOK_ENDPOINT_ID}.js
  // Example: /cdn/f/a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e.js
  map[`/cdn/f/${CONFIG.FACEBOOK_ENDPOINT_ID}.js`] = 'https://www.facebook.com/tr';

  // Google Analytics - Obfuscated UUID-based endpoint
  // Format: /cdn/g/{GOOGLE_ENDPOINT_ID}.js
  // Example: /cdn/g/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f.js
  if (CONFIG.GTM_SERVER_URL) {
    map[`/cdn/g/${CONFIG.GOOGLE_ENDPOINT_ID}.js`] = `${CONFIG.GTM_SERVER_URL}/g/collect`;

    // Additional Google endpoint for JavaScript collection
    map[`/cdn/g/${CONFIG.GOOGLE_ENDPOINT_ID}-j.js`] = `${CONFIG.GTM_SERVER_URL}/j/collect`;
  }

  // ============= LEGACY ENDPOINTS (BACKWARD COMPATIBILITY - DETECTABLE) =============
  // WARNING: These paths are easily blocked by ad-blockers
  // Kept only for backward compatibility with existing implementations
  // RECOMMENDATION: Migrate to obfuscated endpoints above
  map['/tr'] = 'https://www.facebook.com/tr';

  if (CONFIG.GTM_SERVER_URL) {
    map['/g/collect'] = `${CONFIG.GTM_SERVER_URL}/g/collect`;
    map['/j/collect'] = `${CONFIG.GTM_SERVER_URL}/j/collect`;
  }

  endpointMapCache = map;
  return endpointMapCache;
}

// Export static map for backward compatibility
export const ENDPOINT_MAP = getEndpointMap();

// ============= CACHE INVALIDATION =============
/**
 * Invalidate the map caches
 * Call this if CONFIG values change at runtime
 */
export function invalidateMapCache() {
  scriptMapCache = null;
  endpointMapCache = null;
}

// ============= HELPER FUNCTION =============
/**
 * Get target URL for a script path
 * Handles dynamic query strings for GTM/GTag scripts
 *
 * @param {string} path - Request path (e.g., '/cdn/gtm.js')
 * @param {string} search - Query string (e.g., '?id=GTM-XXXX')
 * @returns {string|null} Target URL or null if not found
 */
export function getScriptTarget(path, search = '') {
  const scriptMap = getScriptMap();
  const baseUrl = scriptMap[path];

  if (!baseUrl) {
    return null;
  }

  // For GTM and GTag scripts, append query string
  // Check for both legacy names and obfuscated paths containing 'gtm' or 'tag'
  if (path.includes('gtm') || path.includes('gtag') || path.includes('tag.js')) {
    return `${baseUrl}${search}`;
  }

  return baseUrl;
}
