/**
 * @fileoverview Router - Ultra-aggressive obfuscation routing layer
 */

import { handleOptions } from '../handlers/options.js';
import { handleHealthCheck } from '../handlers/health.js';
import { handleScriptProxy } from '../handlers/scripts.js';
import { handleEndpointProxy } from '../handlers/endpoints.js';
import { handleEndpointsInfo } from '../handlers/endpoints-info.js';

import { handleLibProxy } from '../handlers/lib-proxy.js';
import { handleDynamicProxy } from '../handlers/dynamic-proxy.js';
import { extractUuidFromPath } from '../utils/url.js';
import { getScriptMap, getEndpointMap } from './mapping.js';
import { CONFIG } from '../config/index.js';
import { Logger } from '../core/logger.js';
import { detectProtocol } from '../services/protocol-detector.js';
import { errorResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';

export class Router {
  /**
   * @param {Request} request
   * @param {Object} [rateLimit=null]
   * @returns {Promise<Response>}
   */
  static async route(request, rateLimit = null) {
    const { method } = request;
    const parsedUrl = request._parsedUrl ?? new URL(request.url);
    const { pathname, search } = parsedUrl;

    if (method === 'OPTIONS') {
      return handleOptions(request, rateLimit);
    }

    if (pathname === '/health') {
      return handleHealthCheck(request, rateLimit);
    }

    if (pathname === '/endpoints') {
      return handleEndpointsInfo(request);
    }

    const [endpointMap, scriptMap] = await Promise.all([
      getEndpointMap(),
      getScriptMap()
    ]);

    const pathExists = endpointMap[pathname] ?? scriptMap[pathname];

    if (pathExists) {
      const protocol = detectProtocol(pathname, search, method);

      // Facebook or Google paths with tracking detection
      if (protocol.type === 'facebook' || protocol.type === 'google') {
        return protocol.isTracking
          ? handleEndpointProxy(request, rateLimit)
          : handleScriptProxy(request, rateLimit);
      }

      return endpointMap[pathname]
        ? handleEndpointProxy(request, rateLimit)
        : handleScriptProxy(request, rateLimit);
    }

    if (pathname.startsWith('/x/')) {
      const extracted = extractUuidFromPath(pathname);
      return extracted
        ? handleDynamicProxy(request, extracted.uuid, extracted.remainingPath, rateLimit)
        : errorResponse('Invalid UUID format', HTTP_STATUS.BAD_REQUEST);
    }

    if (pathname.startsWith('/lib/')) {
      return handleLibProxy(request);
    }

    if (['/cdn/', '/assets/', '/static/'].some(prefix => pathname.startsWith(prefix))) {
      return handleScriptProxy(request, rateLimit);
    }

    return errorResponse('Not found', HTTP_STATUS.NOT_FOUND);
  }
}
