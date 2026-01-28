/**
 * @fileoverview Router - Route matching and dispatch
 * @module routing/router
 * 
 * @description
 * Main router class for handling all incoming requests.
 * Routes requests to appropriate handlers based on path and method.
 * Implements ultra-aggressive obfuscation mode where scripts and endpoints
 * share the same path, differentiated by HTTP method or query parameters.
 * 
 * Routing table:
 * - OPTIONS → handleOptions
 * - /health → handleHealthCheck
 * - /endpoints → handleEndpointsInfo (authenticated)
 * - /cdn/events → handleEventProxy (POST)
 * - /cdn/f/{UUID} → Facebook (POST=endpoint, GET=script)
 * - /cdn/g/{UUID} → Google (query-based differentiation)
 * - /x/{UUID} → Dynamic proxy for full script proxy
 * - /lib/* → Third-party library proxy
 * - /cdn/*, /assets/*, /static/* → Script proxy fallback
 * - /g/collect → GTM fallback endpoint
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

/**
 * Main Router class for request routing and dispatch
 */
export class Router {
  /**
   * Routes an incoming request to the appropriate handler
   * 
   * @param {Request} request - Incoming request object
   * @param {Object} [rateLimit=null] - Rate limit information
   * @returns {Promise<Response>} Response from handler
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

    const [endpointMap, scriptMap] = await Promise.all([getEndpointMap(), getScriptMap()]);

    const pathExists = endpointMap[pathname] ?? scriptMap[pathname];

    if (pathExists) {
      if (pathname.startsWith('/cdn/f/')) {
        return method === 'POST'
          ? handleEndpointProxy(request, rateLimit)
          : handleScriptProxy(request, rateLimit);
      }

      if (pathname.startsWith('/cdn/g/')) {
        const isTrackingHit = ['v=2', 'tid=', '_p='].some(param => search.includes(param));

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

    if (pathname === '/g/collect' && CONFIG.GTM_SERVER_URL) {
      const origin = request.headers.get('Origin');
      const referrer = request.headers.get('Referer');
      
      Logger.warn('GTM hit to fallback /g/collect endpoint - transport_url may be misconfigured', {
        origin,
        referrer,
        search
      });
      return handleEndpointProxy(request, rateLimit);
    }

    return new Response('Not found', { status: 404 });
  }
}
