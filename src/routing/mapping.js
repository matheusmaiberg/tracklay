/**
 * @fileoverview Path to URL mapping utilities
 */

import { CONFIG } from '../config/index.js';
import { deobfuscateQuery } from '../utils/query-obfuscation.js';
import { generateEndpointUUID } from '../core/uuid.js';
import { PATH_PREFIXES, UPSTREAM_URLS } from '../utils/constants.js';

let scriptMapCache = null;
let scriptMapCacheTime = 0;
let endpointMapCache = null;
let endpointMapCacheTime = 0;
const CACHE_MAX_AGE = 3600000; // 1 hour

export async function getScriptMap() {
  if (scriptMapCache && Date.now() - scriptMapCacheTime < CACHE_MAX_AGE) {
    return scriptMapCache;
  }

  const [fbUUID, googleUUID] = await Promise.all([
    generateEndpointUUID('facebook'),
    generateEndpointUUID('google')
  ]);

  scriptMapCache = {
    [`${PATH_PREFIXES.FACEBOOK}${fbUUID}`]: UPSTREAM_URLS.FACEBOOK_SCRIPT,
    [`${PATH_PREFIXES.GOOGLE}${googleUUID}`]: UPSTREAM_URLS.GOOGLE_SCRIPT
  };
  scriptMapCacheTime = Date.now();

  return scriptMapCache;
}

export async function getEndpointMap() {
  if (endpointMapCache && Date.now() - endpointMapCacheTime < CACHE_MAX_AGE) {
    return endpointMapCache;
  }

  const [fbUUID, googleUUID] = await Promise.all([
    generateEndpointUUID('facebook'),
    generateEndpointUUID('google')
  ]);

  const map = {};

  map[`${PATH_PREFIXES.FACEBOOK}${fbUUID}`] = UPSTREAM_URLS.FACEBOOK_ENDPOINT;

  endpointMapCache = map;
  endpointMapCacheTime = Date.now();
  return endpointMapCache;
}

export function invalidateMapCache() {
  scriptMapCache = null;
  scriptMapCacheTime = 0;
  endpointMapCache = null;
  endpointMapCacheTime = 0;
}

export async function getScriptTarget(path, search = '') {
  const scriptMap = await getScriptMap();
  const baseUrl = scriptMap[path];

  if (!baseUrl) {
    return null;
  }

  if (path.includes('/g/')) {
    if (!search || (!search.includes('id=') && !search.includes('c='))) {
      return null;
    }

    const deobfuscatedSearch = deobfuscateQuery(search, CONFIG.GTM_CONTAINER_ALIASES);
    return `${baseUrl}${deobfuscatedSearch}`;
  }

  return baseUrl;
}
