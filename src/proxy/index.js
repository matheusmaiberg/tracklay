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
    rateLimit = null 
  } = options;

  try {
    const scriptKey = identifyScriptKey(targetUrl);
    if (scriptKey) {
      // Try cached version first
      let cachedScript = await getScriptFromCache(scriptKey);

      // On-demand fetch if not cached (container-specific scripts like gtm:GTM-XXX)
      if (!cachedScript && isContainerSpecificKey(scriptKey)) {
        Logger.info('On-demand fetch triggered', { scriptKey, url: targetUrl });
        cachedScript = await fetchAndCacheOnDemand(targetUrl, scriptKey);
      }

      if (cachedScript) {
        const cacheStatus = cachedScript.headers?.get('X-Cache-Status') || 'HIT-SCRIPT';
        Logger.debug('Script served', { scriptKey, cacheStatus, url: targetUrl });

        return buildResponse(cachedScript, request, {
          cacheStatus,
          rateLimit
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
