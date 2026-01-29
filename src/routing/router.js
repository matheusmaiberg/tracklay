/**
 * @fileoverview Router - Ultra-aggressive obfuscation routing layer
 */

import { handleOptions } from '../handlers/options.js';
import { handleHealthCheck } from '../handlers/health.js';
import { handleScriptProxy } from '../handlers/scripts.js';
import { handleEndpointProxy } from '../handlers/endpoints.js';
import { handleEndpointsInfo } from '../handlers/endpoints-info.js';
import { handleEventProxy } from '../handlers/events.js';
import { handleLibProxy } from '../handlers/lib-proxy.js';
import { handleDynamicProxy, extractUuidFromPath } from '../handlers/dynamic-proxy.js';
import { getScriptMap, getEndpointMap } from './mapping.js';
import { CONFIG } from '../config/index.js';
import { Logger } from '../core/logger.js';
import { PATH_PREFIXES, GOOGLE_TRACKING_PARAMS } from '../utils/constants.js';

export class Router {
  /**
   * @param {Request} request
   * @param {Object} [rateLimit=null]
   * @returns {Promise<Response>}
   */
  static async route(request, rateLimit = null) {
    const { _parsedUrl, url, method } = request;
    const { pathname, search } = _parsedUrl ?? new URL(url);

    if (method === 'OPTIONS') {
      return handleOptions(request, rateLimit);
    }

    if (pathname === '/health') {
      return handleHealthCheck(request, rateLimit);
    }

    if (pathname === '/endpoints') {
      return handleEndpointsInfo(request);
    }

    if (pathname === '/cdn/events' && method === 'POST') {
      return handleEventProxy(request, rateLimit);
    }

    const [endpointMap, scriptMap] = await Promise.all([
      getEndpointMap(),
      getScriptMap()
    ]);

    const pathExists = endpointMap[pathname] ?? scriptMap[pathname];

    if (pathExists) {
      if (pathname.startsWith(PATH_PREFIXES.FACEBOOK)) {
        return method === 'POST'
          ? handleEndpointProxy(request, rateLimit)
          : handleScriptProxy(request, rateLimit);
      }

      if (pathname.startsWith(PATH_PREFIXES.GOOGLE)) {
        const isTrackingHit = GOOGLE_TRACKING_PARAMS.some(param => search.includes(param));

        return isTrackingHit
          ? handleEndpointProxy(request, rateLimit)
          : handleScriptProxy(request, rateLimit);
      }

      return endpointMap[pathname]
        ? handleEndpointProxy(request, rateLimit)
        : handleScriptProxy(request, rateLimit);
    }

    if (pathname.startsWith('/x/')) {
      const uuid = extractUuidFromPath(pathname);
      return uuid
        ? handleDynamicProxy(request, uuid, rateLimit)
        : new Response('Invalid UUID format', { status: 400 });
    }

    if (pathname.startsWith('/lib/')) {
      return handleLibProxy(request);
    }

    if (['/cdn/', '/assets/', '/static/'].some(prefix => pathname.startsWith(prefix))) {
      return handleScriptProxy(request, rateLimit);
    }

    if (pathname === PATH_PREFIXES.GTM_FALLBACK && CONFIG.GTM_SERVER_URL) {
      const origin = request.headers.get('Origin');
      const referrer = request.headers.get('Referer');

      Logger.warn('[Router] GTM fallback ' + PATH_PREFIXES.GTM_FALLBACK + ' hit - transport_url auto-injection may have failed', {
        origin,
        referrer,
        pathname,
        search
      });
      return handleEndpointProxy(request, rateLimit);
    }

    return new Response('Not found', { status: 404 });
  }
}
