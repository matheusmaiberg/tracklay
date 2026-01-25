// ============================================================
// MAPPING - URL MAPPINGS (SCRIPTS E ENDPOINTS)
// ============================================================
// RESPONSIBILITY:
// - Exportar SCRIPT_MAP: { path → targetUrl }
// - Exportar ENDPOINT_MAP: { path → targetUrl }
// - ULTRA-AGGRESSIVE: Scripts and endpoints share same path (no suffixes)

import { CONFIG } from '../config/index.js';
import { deobfuscateQuery } from '../utils/query-obfuscation.js';
import { generateEndpointUUID } from '../core/uuid.js';

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
 * Get script mappings with ultra-aggressive obfuscation (no suffixes)
 * Scripts and endpoints share same path - differentiated by query string or HTTP method
 * Supports UUID rotation via generateEndpointUUID()
 * Memoized for performance (1-3ms improvement)
 * @returns {Promise<Object>} Script path to target URL mapping
 */
export async function getScriptMap() {
  if (scriptMapCache) {
    return scriptMapCache;
  }

  // Generate UUIDs (rotating or fixed based on ENDPOINTS_UUID_ROTATION config)
  const fbUUID = await generateEndpointUUID('facebook');
  const googleUUID = await generateEndpointUUID('google');

  scriptMapCache = {
    // ============= ULTRA-OBFUSCATED SCRIPTS (NO SUFFIXES) =============
    // Facebook Events - Pure UUID (no suffix)
    // Format: /cdn/f/{UUID}
    // NOTE: Same path as endpoint - differentiated by HTTP method
    //       GET = script loading, POST = tracking event
    // UUID ROTATION: Changes weekly if ENDPOINTS_UUID_ROTATION=false
    [`/cdn/f/${fbUUID}`]: 'https://connect.facebook.net/en_US/fbevents.js',

    // Google Tag Manager & GTag - Pure UUID + obfuscated query
    // Format: /cdn/g/{UUID}?c=alias
    // NOTE: Same path for GTM and GTag - differentiated by query string
    //       Query with c= or id= = script loading (cacheable)
    //       Query with v=2, tid=, _p= = tracking event (never cache)
    // UUID ROTATION: Changes weekly if ENDPOINTS_UUID_ROTATION=false
    [`/cdn/g/${googleUUID}`]: 'https://www.googletagmanager.com/gtm.js'

    // ============= REMOVED 2026-01-25: ALL SUFFIXES (v3.0.0 BREAKING CHANGE) =============
    // BREAKING CHANGE: Removed ALL detectable suffixes for maximum obfuscation
    // See: docs/MIGRATION-V3.md for migration guide
    //
    // REMOVED: /cdn/f/{UUID}-script.js (suffix '-script' detectable)
    // REMOVED: /cdn/g/{UUID}-gtm.js (suffix '-gtm' detectable)
    // REMOVED: /cdn/g/{UUID}-tag.js (suffix '-tag' detectable)
    //
    // REMOVED: Legacy routes
    // REMOVED: /cdn/fbevents.js, /cdn/gtm.js, /cdn/gtag.js
    // REMOVED: /assets/*, /static/* variants
  };

  return scriptMapCache;
}

// Note: SCRIPT_MAP is now async and should be accessed via getScriptMap()
// For backward compatibility, we export a promise that resolves to the map
export const SCRIPT_MAP = getScriptMap();

// ============= ENDPOINT MAPPINGS =============
// Map proxy endpoints to original tracking URLs
// ULTRA-AGGRESSIVE: Same path as scripts (no suffixes, no .js extension)
// Supports UUID rotation via generateEndpointUUID()
//
// DIFFERENTIATION STRATEGY:
// - Facebook: HTTP method (GET = script, POST = tracking)
// - Google: Query string (c=/id= = script, v=2/tid= = tracking)
export async function getEndpointMap() {
  if (endpointMapCache) {
    return endpointMapCache;
  }

  // Generate UUIDs (rotating or fixed based on ENDPOINTS_UUID_ROTATION config)
  const fbUUID = await generateEndpointUUID('facebook');
  const googleUUID = await generateEndpointUUID('google');

  const map = {};

  // ============= ULTRA-OBFUSCATED ENDPOINTS (NO SUFFIXES) =============
  // Facebook Pixel - Same path as script
  // Format: /cdn/f/{UUID}
  // NOTE: Facebook uses POST for tracking events, GET for script loading
  //       This method-based differentiation works reliably for Facebook
  // UUID ROTATION: Changes weekly if ENDPOINTS_UUID_ROTATION=false
  map[`/cdn/f/${fbUUID}`] = 'https://www.facebook.com/tr';

  // Google Analytics - Same path as script
  // Format: /cdn/g/{UUID}
  // NOTE: GA4 uses GET for BOTH scripts and tracking events
  //       Detection via query string params (v=2, tid=, _p= = tracking)
  // UUID ROTATION: Changes weekly if ENDPOINTS_UUID_ROTATION=false
  if (CONFIG.GTM_SERVER_URL) {
    map[`/cdn/g/${googleUUID}`] = `${CONFIG.GTM_SERVER_URL}/g/collect`;
  }

  // ============= REMOVED 2026-01-25: ALL SUFFIXES (v3.0.0 BREAKING CHANGE) =============
  // BREAKING CHANGE: Removed ALL detectable suffixes and legacy endpoints
  // See: docs/MIGRATION-V3.md for migration guide
  //
  // REMOVED: /cdn/f/{UUID}.js (suffix '.js' detectable)
  // REMOVED: /cdn/g/{UUID}.js (suffix '.js' detectable)
  // REMOVED: /cdn/g/{UUID}-j.js (suffix '-j.js' detectable)
  //
  // REMOVED: Legacy endpoints
  // REMOVED: /tr, /g/collect, /j/collect

  endpointMapCache = map;
  return endpointMapCache;
}

// Note: ENDPOINT_MAP is now async and should be accessed via getEndpointMap()
// For backward compatibility, we export a promise that resolves to the map
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
 * Handles query string deobfuscation and dynamic URLs
 * Supports async UUID rotation
 *
 * ULTRA-AGGRESSIVE MODE:
 * - Deobfuscates query strings: ?c=abc123 → ?id=GTM-XXXXX
 * - Supports both Google paths (/cdn/g/{UUID})
 * - Facebook paths (/cdn/f/{UUID}) don't use query strings
 * - UUID rotation: UUIDs change weekly if ENDPOINTS_UUID_ROTATION=false
 *
 * @param {string} path - Request path (e.g., '/cdn/g/{UUID}')
 * @param {string} search - Query string (e.g., '?c=abc123' or '?id=GTM-XXXX')
 * @returns {Promise<string|null>} Target URL or null if not found
 */
export async function getScriptTarget(path, search = '') {
  const scriptMap = await getScriptMap();
  const baseUrl = scriptMap[path];

  if (!baseUrl) {
    return null;
  }

  // Deobfuscate query string if container aliases configured
  // This converts ?c=abc123 to ?id=GTM-XXXXX before forwarding to upstream
  const deobfuscatedSearch = deobfuscateQuery(search, CONFIG.CONTAINER_ALIASES);

  // For Google scripts (GTM/GTag), append deobfuscated query string
  // Google paths contain '/g/' prefix
  if (path.includes('/g/')) {
    return `${baseUrl}${deobfuscatedSearch}`;
  }

  // For Facebook scripts, no query string needed
  return baseUrl;
}
