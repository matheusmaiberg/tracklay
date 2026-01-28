/**
 * @fileoverview Dynamic Proxy Handler - Generic proxy for dynamic UUID endpoints
 * @module handlers/dynamic-proxy
 * 
 * @description
 * Handles requests to /x/{uuid} routes.
 * Resolves UUID to target URL via DynamicEndpointsManager
 * and proxies to the original destination.
 * Supports GET, POST, and OPTIONS methods.
 * Never caches tracking endpoints.
 * 
 * @example
 * // Route: GET /x/a3f9c2e1b8d4e5f6
 * // Proxies to: https://google-analytics.com/collect
 */

import { getTargetUrl } from '../cache/dynamic-endpoints.js';
import { proxyRequest } from '../proxy/index.js';
import { errorResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { Logger } from '../core/logger.js';

/**
 * Handles dynamic proxy requests
 * Receives a UUID and proxies to the associated original URL
 * 
 * @param {Request} request - Incoming request object
 * @param {string} uuid - UUID extracted from URL path
 * @param {Object} [rateLimit=null] - Rate limit information
 * @returns {Promise<Response>} Proxied response from target URL
 * 
 * @example
 * const response = await handleDynamicProxy(request, 'a3f9c2e1b8d4e5f6', rateLimitInfo);
 */
export async function handleDynamicProxy(request, uuid, rateLimit = null) {
  try {
    Logger.debug('Dynamic proxy request', {
      uuid,
      method: request.method,
      path: request.url
    });

    const targetUrl = await getTargetUrl(uuid);
    
    if (!targetUrl) {
      Logger.warn('UUID not found in cache', { uuid });
      return errorResponse(
        'Endpoint not found or expired',
        HTTP_STATUS.NOT_FOUND
      );
    }

    Logger.info('Dynamic proxy resolved', {
      uuid,
      targetUrl: targetUrl.substring(0, 60)
    });

    const requestSearch = new URL(request.url).search;
    const separator = targetUrl.includes('?') ? '&' : '?';
    const finalUrl = requestSearch 
      ? `${targetUrl}${separator}${requestSearch.slice(1)}`
      : targetUrl;
    
    return await proxyRequest(finalUrl, request, {
      preserveHeaders: true,
      allowCache: false,
      rateLimit
    });

  } catch (error) {
    Logger.error('Dynamic proxy failed', {
      uuid,
      error: error.message,
      stack: error.stack
    });
    
    return errorResponse(
      'Proxy error',
      HTTP_STATUS.INTERNAL_SERVER_ERROR
    );
  }
}

/**
 * Extracts UUID from pathname /x/{uuid}
 * 
 * @param {string} pathname - Request pathname
 * @returns {string|null} UUID string or null if invalid format
 * 
 * @example
 * const uuid = extractUuidFromPath('/x/a3f9c2e1b8d4e5f6');
 * console.log(uuid); // 'a3f9c2e1b8d4e5f6'
 * 
 * const invalid = extractUuidFromPath('/x/short');
 * console.log(invalid); // null
 */
export function extractUuidFromPath(pathname) {
  if (!pathname?.startsWith('/x/')) {
    return null;
  }

  const uuid = pathname.substring(3);
  
  if (!uuid || uuid.length < 12 || uuid.length > 64) {
    return null;
  }

  if (!/^[a-f0-9]+$/.test(uuid.toLowerCase())) {
    return null;
  }

  return uuid.toLowerCase();
}
