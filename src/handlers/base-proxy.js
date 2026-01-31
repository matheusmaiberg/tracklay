/**
 * @fileoverview Base Proxy Handler - Generic proxy handler for scripts and endpoints
 * @module handlers/base-proxy
 */

/** @typedef {Request & { _parsedUrl?: URL }} RequestWithParsedUrl */

import { proxyRequest } from '../proxy/index.js';
import { errorResponse } from '../utils/response.js';
import { buildFullHeaders } from '../factories/headers-factory.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { Logger } from '../core/logger.js';
import { safeParseURL } from '../utils/url.js';

/**
 * Generic proxy handler for scripts and endpoints
 * @param {Request} request - Incoming request
 * @param {Object} options - Handler options
 * @param {Function} options.resolver - Async function that resolves the target URL
 * @param {Object} [options.proxyOptions={}] - Options passed to proxyRequest
 * @param {Object} [options.rateLimit=null] - Rate limit information
 * @param {string} [options.handlerName='base-proxy'] - Name for logging
 * @returns {Promise<Response>} Proxied response
 */
export async function handleGenericProxy(request, options) {
  const { 
    resolver, 
    proxyOptions = {}, 
    rateLimit = null,
    handlerName = 'base-proxy'
  } = options;
  
  const url = /** @type {RequestWithParsedUrl} */ (request)._parsedUrl ?? safeParseURL(request.url);

  if (!url) {
    return errorResponse('Invalid URL', HTTP_STATUS.BAD_REQUEST);
  }

  try {
    const targetUrl = await resolver(url.pathname, url.search);

    if (!targetUrl) {
      const headers = buildFullHeaders(request, { includeRateLimit: false });
      return errorResponse('Not found', HTTP_STATUS.NOT_FOUND, headers);
    }

    // Check if targetUrl already includes query params (from resolver)
    const finalTargetUrl = typeof targetUrl === 'string' 
      ? (targetUrl.includes('?') ? targetUrl : `${targetUrl}${url.search}`)
      : targetUrl;

    return await proxyRequest(finalTargetUrl, request, {
      rateLimit,
      ...proxyOptions
    });
  } catch (error) {
    Logger.error(`${handlerName} failed`, {
      path: url.pathname,
      error: error.message
    });
    const headers = buildFullHeaders(request, { includeRateLimit: false });
    return errorResponse('Internal server error', HTTP_STATUS.INTERNAL_SERVER_ERROR, headers);
  }
}
