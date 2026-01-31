/**
 * @fileoverview Main proxy request handler
 */

import { Logger } from '../core/logger.js';
import { fetchWithTimeout } from '../core/fetch.js';
import { CacheManager } from '../core/cache.js';
import { buildProxyHeaders } from '../headers/proxy.js';
import { buildResponse } from './response-builder.js';
import { shouldCache, getCacheKey, getCacheTTL } from './cache-strategy.js';
import { CONFIG } from '../config/index.js';
import { getOriginFromRequest } from '../utils/request.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { errorResponse } from '../utils/response.js';
import {
  getScriptFromCache,
  identifyScriptKey,
  isContainerSpecificKey,
  fetchAndCacheOnDemand
} from '../cache/script-cache.js';

export async function proxyRequest(targetUrl, request, options = {}) {
  const {
    preserveHeaders = false,
    allowCache = false,
    rateLimit = null,
    forceRefresh = false
  } = options;

  try {
    const scriptKey = identifyScriptKey(targetUrl);
    if (scriptKey) {
      // Skip cache if force refresh is requested
      let cachedScript = forceRefresh ? null : await getScriptFromCache(scriptKey);

      // On-demand fetch if not cached or force refresh (container-specific scripts)
      if (!cachedScript && (isContainerSpecificKey(scriptKey) || forceRefresh)) {
        // Get worker origin from request for absolute URLs in script rewrites
        const workerOrigin = getOriginFromRequest(request) || CONFIG.WORKER_BASE_URL || '';

        Logger.info(forceRefresh ? 'Force refresh triggered' : 'On-demand fetch triggered', {
          scriptKey,
          url: targetUrl,
          forceRefresh,
          workerOrigin
        });
        cachedScript = await fetchAndCacheOnDemand(targetUrl, scriptKey, workerOrigin);
        
        // Fallback se on-demand falha durante force refresh
        if (!cachedScript && forceRefresh) {
          Logger.warn('Force refresh failed, falling back to cache', { scriptKey });
          cachedScript = await getScriptFromCache(scriptKey);
        }
      }

      if (cachedScript) {
        const cacheStatus = forceRefresh ? 'REFRESHED' : (cachedScript.headers?.get('X-Cache-Status') || 'HIT-SCRIPT');
        Logger.debug('Script served', { scriptKey, cacheStatus, url: targetUrl });

        // Pass isScript: true to disable X-Frame-Options for GTM/Facebook scripts that use iframes
        return buildResponse(cachedScript, request, {
          cacheStatus,
          rateLimit,
          isScript: true
        });
      }
    }

    const cacheKey = getCacheKey(targetUrl);
    const canCache = allowCache && shouldCache(request);

    if (canCache) {
      const cached = await CacheManager.get(cacheKey);
      if (cached) {
        Logger.debug('Cache hit', { url: targetUrl });

        return buildResponse(cached, request, {
          cacheStatus: 'HIT',
          rateLimit
        });
      }
    }

    const requestClone = request.clone();
    const headers = buildProxyHeaders(request, preserveHeaders);

    let response;
    try {
      response = await fetchWithTimeout(targetUrl, {
        method: request.method,
        headers,
        body: !['GET', 'HEAD'].includes(request?.method) 
          ? requestClone.body
          : undefined,
        redirect: 'follow'
      });
    } catch (fetchError) {
      Logger.error('Fetch failed', {
        error: fetchError?.message ?? 'Unknown error',
        url: targetUrl
      });

      return errorResponse('Bad Gateway', HTTP_STATUS.BAD_GATEWAY);
    }

    if (!response.ok) {
      Logger.warn('Upstream error', {
        status: response.status,
        url: targetUrl
      });
    }

    const modifiedResponse = buildResponse(response, request, {
      cacheStatus: 'MISS',
      rateLimit
    });

    const cacheTTL = getCacheTTL(request);
    const cacheControl = canCache
      ? `public, max-age=${cacheTTL}`
      : 'no-store, no-cache, must-revalidate';
    modifiedResponse.headers.set('Cache-Control', cacheControl);

    if (canCache) {
      try {
        const responseToCache = modifiedResponse.clone();
        await CacheManager.put(cacheKey, responseToCache, cacheTTL);
        Logger.debug('Cached response', { url: targetUrl });
      } catch (cacheError) {
        Logger.warn('Cache put failed', { error: cacheError?.message ?? 'Unknown error' });
      }
    }

    return modifiedResponse;

  } catch (error) {
    Logger.error('Proxy request failed', {
      error: error?.message ?? 'Unknown error',
      stack: error?.stack,
      url: targetUrl
    });

    return errorResponse('Internal Server Error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
