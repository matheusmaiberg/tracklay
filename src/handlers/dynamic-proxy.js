/**
 * @fileoverview Dynamic Proxy Handler - Generic proxy for dynamic UUID endpoints
 * @module handlers/dynamic-proxy
 */

import { getTargetUrl } from '../cache/dynamic-endpoints.js';
import { proxyRequest } from '../proxy/index.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { Logger } from '../core/logger.js';
import { buildCORSHeaders } from '../headers/cors.js';
import { buildFullHeaders } from '../factories/headers-factory.js';
import { errorResponse } from '../utils/response.js';
import { recoverEndpointFromReferrer } from '../services/endpoint-recovery.js';
import { safeParseURL } from '../utils/url.js';

/**
 * @param {Request} request - Incoming request object
 * @param {string} uuid - UUID extracted from URL path
 * @param {string} [remainingPath=''] - Additional path segments after UUID
 * @param {Object} [rateLimit=null] - Rate limit information
 * @returns {Promise<Response>} Proxied response from target URL
 */
export async function handleDynamicProxy(request, uuid, remainingPath = '', rateLimit = null) {
  try {
    Logger.debug('Dynamic proxy request', {
      uuid,
      remainingPath,
      method: request.method,
      path: request.url
    });

    let targetUrl = await getTargetUrl(uuid);
    let cacheInvalidated = false;
    let sanitizedReferrer = null;

    // If endpoint not found, try to recover from referrer
    if (!targetUrl) {
      const referrer = request.headers.get('Referer') || request.headers.get('Referrer');
      if (referrer) {
        try {
          sanitizedReferrer = new URL(referrer).hostname;
        } catch {
          sanitizedReferrer = null;
        }
        const recovery = await recoverEndpointFromReferrer(uuid, referrer);
        if (recovery) {
          targetUrl = recovery.url;
          cacheInvalidated = recovery.invalidated;
        }
      }

      if (!targetUrl) {
        // If cache was invalidated, return 503 to trigger client retry
        if (cacheInvalidated) {
          Logger.info('Cache invalidated, returning 503 for client retry', { uuid });
          const headers = buildFullHeaders(request, { includeRateLimit: false });
          headers.set('Retry-After', '2');
          return new Response('Cache refreshed, please retry', {
            status: 503,
            headers
          });
        }

        Logger.warn('UUID not found in cache and recovery failed', { uuid, referrer: sanitizedReferrer });
        const headers = buildFullHeaders(request, { includeRateLimit: false });
        return new Response('Endpoint not found or expired', {
          status: HTTP_STATUS.NOT_FOUND,
          headers
        });
      }
    }

    Logger.info('Dynamic proxy resolved', {
      uuid,
      targetUrl: targetUrl.substring(0, 60),
      remainingPath
    });

    // Build final URL: targetUrl + remainingPath + querystring
    const requestUrl = safeParseURL(request.url);
    if (!requestUrl) {
      return errorResponse('Invalid URL', HTTP_STATUS.BAD_REQUEST);
    }
    const requestSearch = requestUrl.search;
    let finalUrl = targetUrl;

    // Append remaining path if present
    if (remainingPath) {
      // Remove trailing slash from targetUrl if present to avoid double slashes
      finalUrl = finalUrl.replace(/\/$/, '') + remainingPath;
    }

    // Append query string
    if (requestSearch) {
      const separator = finalUrl.includes('?') ? '&' : '?';
      finalUrl = `${finalUrl}${separator}${requestSearch.slice(1)}`;
    }

    return await proxyRequest(finalUrl, request, {
      preserveHeaders: true,
      allowCache: false,
      rateLimit
    });

  } catch (error) {
    Logger.error('Dynamic proxy failed', { 
      uuid, 
      error: error.message
    });

    return errorResponse('Proxy error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
