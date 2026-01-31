/**
 * @fileoverview Endpoint Recovery Service - Recovers dynamic endpoints from referrer
 * @module services/endpoint-recovery
 */

import { getScriptFromCache, identifyScriptKey } from '../cache/script-cache.js';
import { invalidateScriptCache } from '../cache/cache-invalidation.js';
import { createDynamicEndpoint } from '../cache/dynamic-endpoints.js';
import { extractUrls, filterTrackableUrls } from '../proxy/url-extractor.js';
import { Logger } from '../core/logger.js';

// Rate limiting for recovery attempts
const recoveryAttempts = new Map();

/**
 * Attempts to recover dynamic endpoint by re-processing the referring script
 * @param {string} uuid - The UUID to recover
 * @param {string} referrer - Referrer URL
 * @returns {Promise<{url: string, invalidated: boolean}|null>} Recovered target URL and invalidation status, or null
 */
export async function recoverEndpointFromReferrer(uuid, referrer) {
  // Rate limit recovery attempts
  const key = `${uuid}:${referrer}`;
  const now = Date.now();
  const lastAttempt = recoveryAttempts.get(key);
  
  if (lastAttempt && now - lastAttempt < 60000) { // 1 minuto
    Logger.warn('Recovery rate limited', { uuid });
    return null;
  }
  recoveryAttempts.set(key, now);
  
  try {
    Logger.info('Attempting endpoint recovery from referrer', { uuid, referrer });

    // Parse referrer to get script path
    let referrerUrl;
    try {
      referrerUrl = new URL(referrer);
    } catch {
      Logger.warn('Invalid referrer URL', { referrer });
      return null;
    }
    const scriptKey = identifyScriptKey(referrerUrl.pathname + referrerUrl.search);

    if (!scriptKey) {
      Logger.warn('Could not identify script key from referrer', { referrer });
      return null;
    }

    // Try to get script from cache
    const cachedScript = await getScriptFromCache(scriptKey);
    if (!cachedScript) {
      Logger.warn('Script not found in cache for recovery', { scriptKey });
      return null;
    }

    const scriptContent = await cachedScript.text();
    const allUrls = extractUrls(scriptContent);
    const trackableUrls = filterTrackableUrls(allUrls);

    // Try to find URL matching the UUID by recreating endpoints
    const workerOrigin = `${referrerUrl.protocol}//${referrerUrl.host}`;

    for (const url of trackableUrls) {
      try {
        const result = await createDynamicEndpoint(url, workerOrigin);
        if (result.uuid === uuid) {
          Logger.info('Endpoint recovered successfully', { uuid, url });
          return { url, invalidated: false };
        }
      } catch {
        // Continue to next URL
      }
    }

    // UUID not found in script - likely an old UUID from previous week
    // Invalidate script cache to force re-fetch with new deterministic UUIDs
    Logger.warn('UUID not found in script (likely expired), invalidating script cache', { 
      uuid, 
      scriptKey,
      trackableUrlsCount: trackableUrls.length 
    });
    
    await invalidateScriptCache(scriptKey);
    
    // Return a special marker indicating cache was invalidated
    return { url: null, invalidated: true };

  } catch (error) {
    Logger.error('Endpoint recovery failed', { uuid, error: error.message });
    return null;
  }
}
