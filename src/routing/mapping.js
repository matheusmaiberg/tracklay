import { CONFIG } from '../config/index.js';
import { deobfuscateQuery } from '../utils/query-obfuscation.js';
import { generateEndpointUUID } from '../core/uuid.js';
import { PATH_PREFIXES, UPSTREAM_URLS } from '../utils/constants.js';

let scriptMapCache = null;
let endpointMapCache = null;

/**
 * Get script mappings for script serving (fbevents.js, gtm.js, etc)
 * @async
 * @returns {Promise<Object>} Path → URL mappings, memoized
 */
export async function getScriptMap() {
  if (scriptMapCache) {
    return scriptMapCache;
  }

  // Generate UUIDs (rotating or fixed based on ENDPOINTS_UUID_ROTATION config)
  const [fbUUID, googleUUID] = await Promise.all([
    generateEndpointUUID('facebook'),
    generateEndpointUUID('google')
  ]);

  scriptMapCache = {
    [`${PATH_PREFIXES.FACEBOOK}${fbUUID}`]: UPSTREAM_URLS.FACEBOOK_SCRIPT,
    [`${PATH_PREFIXES.GOOGLE}${googleUUID}`]: UPSTREAM_URLS.GOOGLE_SCRIPT
  };

  return scriptMapCache;
}

/**
 * Get endpoint mappings for tracking event forwarding
 * @async
 * @returns {Promise<Object>} Path → URL mappings (same paths as scripts, different targets)
 */
export async function getEndpointMap() {
  if (endpointMapCache) {
    return endpointMapCache;
  }

  // Generate UUIDs (rotating or fixed based on ENDPOINTS_UUID_ROTATION config)
  const [fbUUID, googleUUID] = await Promise.all([
    generateEndpointUUID('facebook'),
    generateEndpointUUID('google')
  ]);

  const map = {};

  // Facebook: POST /cdn/f/{UUID} → https://www.facebook.com/tr
  map[`${PATH_PREFIXES.FACEBOOK}${fbUUID}`] = UPSTREAM_URLS.FACEBOOK_ENDPOINT;

  // Google: GET /cdn/g/{UUID}?v=2&tid=... → GTM Server-Side (if configured)
  if (CONFIG.GTM_SERVER_URL) {
    map[`${PATH_PREFIXES.GOOGLE}${googleUUID}`] = `${CONFIG.GTM_SERVER_URL}${UPSTREAM_URLS.GTM_TRANSPORT_SUFFIX}`;
    map[PATH_PREFIXES.GTM_FALLBACK] = `${CONFIG.GTM_SERVER_URL}${UPSTREAM_URLS.GTM_TRANSPORT_SUFFIX}`;
  }

  endpointMapCache = map;
  return endpointMapCache;
}

/**
 * Invalidate cached maps (call when CONFIG changes)
 */
export function invalidateMapCache() {
  scriptMapCache = null;
  endpointMapCache = null;
}

/**
 * Resolve target URL for script with deobfuscation
 */
export async function getScriptTarget(path, search = '') {
  const scriptMap = await getScriptMap();
  const baseUrl = scriptMap[path];

  if (!baseUrl) {
    return null;
  }

  // For Google scripts (GTM/GTag), require either id= or c= query parameter
  // Google's gtm.js/gtag.js require a valid container ID to function
  if (path.includes('/g/')) {
    if (!search || (!search.includes('id=') && !search.includes('c='))) {
      // No container ID provided - return null to trigger 404
      return null;
    }

    // Deobfuscate query string if container aliases configured
    // This converts ?c=abc123 to ?id=GTM-XXXXX before forwarding to upstream
    const deobfuscatedSearch = deobfuscateQuery(search, CONFIG.CONTAINER_ALIASES);
    return `${baseUrl}${deobfuscatedSearch}`;
  }

  // For Facebook scripts, no query string needed
  return baseUrl;
}
