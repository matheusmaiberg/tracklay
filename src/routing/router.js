/**
 * @fileoverview Router - Ultra-aggressive obfuscation routing layer
 * @module routing/router
 * @author Tracklay Team
 * @version 3.0.0
 *
 * @description
 * Central request router implementing ultra-aggressive obfuscation where tracking scripts
 * and endpoints share the same paths. Differentiation is automatic based on:
 * - HTTP method (Facebook: POST=endpoint, GET=script)
 * - Query parameters (Google: v=2/tid=/_p=endpoint, c=/id=script)
 * - Path patterns for library proxying and dynamic content
 *
 * This prevents ad-blockers from maintaining effective blacklists since the same URL
 * serves different content based on request context.
 *
 * @example
 * // Usage in worker.js
 * import { Router } from './routing/router.js';
 * const response = await Router.route(request, rateLimit);
 *
 * @see {@link src/handlers/scripts.js} For script caching and injection logic
 * @see {@link src/handlers/endpoints.js} For tracking endpoint forwarding
 * @see {@link src/routing/mapping.js} For UUID-based path generation
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

/**
 * Main Router class for request routing and dispatch
 *
 * @class Router
 * @description
 * Stateless request routing engine that:
 * 1. Parses incoming URL and method
 * 2. Loads dynamic script and endpoint maps (UUID-based obfuscation)
 * 3. Routes to appropriate handler based on path and request context
 * 4. Implements smart differentiation of scripts vs tracking endpoints
 * 5. Handles fallbacks and error cases gracefully
 *
 * All methods are static - no instance state is maintained between requests.
 * This ensures compatibility with Cloudflare Workers' stateless architecture.
 *
 * @example
 * // Route a request through the worker
 * const response = await Router.route(request, rateLimitData);
 */
export class Router {
  /**
   * Main routing dispatcher for all incoming requests
   *
   * @static
   * @async
   * @param {Request} request - Cloudflare Worker request object
   * @param {Request.url} request.url - Full request URL
   * @param {string} request.method - HTTP method (GET, POST, OPTIONS, etc)
   * @param {Headers} request.headers - Request headers
   * @param {Object} [request._parsedUrl] - Pre-parsed URL object (optional cache optimization)
   * @param {Object} [rateLimit=null] - Rate limit tracking data from middleware
   * @param {string} [rateLimit.clientIp] - Client IP address
   * @param {number} [rateLimit.remaining] - Remaining requests in window
   * @param {number} [rateLimit.reset] - Reset timestamp for rate limit window
   * @returns {Promise<Response>} HTTP response from matched handler
   *
   * @description
   * Routing Decision Tree:
   *
   * 1. **CORS Preflight** (OPTIONS → handleOptions)
   *    - Returns CORS headers for cross-origin requests
   *
   * 2. **Health Check** (/health → handleHealthCheck)
   *    - Returns 200 OK with status for monitoring
   *
   * 3. **Endpoints Info** (/endpoints → handleEndpointsInfo)
   *    - Returns current endpoint configuration (authenticated)
   *
   * 4. **Event Proxy** (POST /cdn/events → handleEventProxy)
   *    - Server-side event forwarding to GTM/Meta
   *    - Bypasses ad-blocker detection via `/cdn/events` endpoint
   *
   * 5. **Facebook Script/Endpoint** (/cdn/f/{UUID})
   *    - POST → Tracking endpoint (handleEndpointProxy)
   *    - GET  → fbevents.js script (handleScriptProxy)
   *
   * 6. **Google Script/Endpoint** (/cdn/g/{UUID}?params)
   *    - Query params v=2/tid=/_p= → Tracking endpoint (handleEndpointProxy)
   *    - Query params c=/id= → gtm.js/gtag.js script (handleScriptProxy)
   *    - No tracking params → gtm.js script (handleScriptProxy)
   *
   * 7. **Dynamic Proxy** (/x/{UUID} → handleDynamicProxy)
   *    - Full URL as UUID for arbitrary script proxy
   *    - Decodes UUID to original URL and proxies with caching
   *
   * 8. **Library Proxy** (/lib/{libname})
   *    - Quick proxy for common libraries: fbevents, ga4, clarity, etc
   *    - Maps to canonical CDN URLs without UUID obfuscation
   *
   * 9. **Script Proxy Fallback** (/cdn/*, /assets/*, /static/*)
   *    - Any GET request to these prefixes treated as script proxy
   *    - Useful for custom CDN setups and compatibility
   *
   * 10. **GTM Fallback Endpoint** (/g/collect)
   *     - Only if GTM_SERVER_URL configured
   *     - Logs warning as this indicates transport_url misconfiguration
   *     - Forwards to GTM endpoint as fallback
   *
   * 11. **404 Not Found**
   *     - No matching route, returns 404 response
   *
   * @example
   * // Facebook script request
   * Router.route({
   *   url: 'https://cdn.example.com/cdn/f/a8f3c2e1-4b9d?c=1',
   *   method: 'GET'
   * });
   * // → handleScriptProxy (returns fbevents.js)
   *
   * @example
   * // Facebook tracking endpoint
   * Router.route({
   *   url: 'https://cdn.example.com/cdn/f/a8f3c2e1-4b9d',
   *   method: 'POST',
   *   body: '{event data}'
   * });
   * // → handleEndpointProxy (forwards to Meta)
   *
   * @example
   * // Google Analytics tracking
   * Router.route({
   *   url: 'https://cdn.example.com/cdn/g/b7e4d3f2?v=2&tid=GA-123',
   *   method: 'GET'
   * });
   * // → handleEndpointProxy (forwards to Google Analytics)
   *
   * @throws {Response} May throw 400 Invalid UUID format for /x/ routes
   * @throws {Response} Always throws Response object, never JS Error
   */
  static async route(request, rateLimit = null) {
    // ============ 1. PARSE REQUEST ============
    // Extract URL components, reusing pre-parsed URL if available (performance optimization)
    const { _parsedUrl, url, method } = request;
    const { pathname, search } = _parsedUrl ?? new URL(url);

    // ============ 2. SYSTEM ROUTES ============
    // These routes are always available and not subject to obfuscation

    // CORS Preflight
    if (method === 'OPTIONS') {
      return handleOptions(request, rateLimit);
    }

    // Health check for monitoring and uptime verification
    if (pathname === '/health') {
      return handleHealthCheck(request, rateLimit);
    }

    // Endpoint configuration info (requires authentication)
    if (pathname === '/endpoints') {
      return handleEndpointsInfo(request);
    }

    // Server-side event forwarding (bypasses ad-blocker by using /cdn path)
    if (pathname === '/cdn/events' && method === 'POST') {
      return handleEventProxy(request, rateLimit);
    }

    // ============ 3. LOAD DYNAMIC MAPS ============
    // Generate UUID-based endpoint and script maps at runtime
    // This is the "secret sauce" - paths change per request/rotation
    const [endpointMap, scriptMap] = await Promise.all([
      getEndpointMap(),    // Maps /cdn/g/{UUID} → Google tracking/script
      getScriptMap()       // Maps /cdn/f/{UUID} → Facebook tracking/script
    ]);

    // Check if path exists in either map
    const pathExists = endpointMap[pathname] ?? scriptMap[pathname];

    if (pathExists) {
      // ============ 4A. FACEBOOK OBFUSCATION ============
      // Differentiate by HTTP method: POST=tracking, GET=script
      if (pathname.startsWith(PATH_PREFIXES.FACEBOOK)) {
        return method === 'POST'
          ? handleEndpointProxy(request, rateLimit)     // fbevents tracking endpoint
          : handleScriptProxy(request, rateLimit);      // fbevents.js script
      }

      // ============ 4B. GOOGLE OBFUSCATION ============
      // Differentiate by query parameters (more complex than Facebook)
      // Tracking hits have Google Analytics query params: v=2 (version), tid= (tracking ID), _p= (page view)
      // Scripts have no tracking params or have c=/id= (container/ID params)
      if (pathname.startsWith(PATH_PREFIXES.GOOGLE)) {
        const isTrackingHit = GOOGLE_TRACKING_PARAMS.some(param => search.includes(param));

        return isTrackingHit
          ? handleEndpointProxy(request, rateLimit)     // gtm.js/gtag.js tracking hit
          : handleScriptProxy(request, rateLimit);      // gtm.js/gtag.js script
      }

      // ============ 4C. OTHER OBFUSCATED PATHS ============
      // For any other UUID-based paths, check which map it belongs to
      return endpointMap[pathname]
        ? handleEndpointProxy(request, rateLimit)
        : handleScriptProxy(request, rateLimit);
    }

    // ============ 5. DYNAMIC PROXY ============
    // Full URL proxying with UUID encoding/decoding
    if (pathname.startsWith('/x/')) {
      const uuid = extractUuidFromPath(pathname);
      return uuid
        ? handleDynamicProxy(request, uuid, rateLimit)
        : new Response('Invalid UUID format', { status: 400 });
    }

    // ============ 6. LIBRARY PROXY ============
    // Quick access to common libraries without UUID obfuscation
    // Examples: /lib/fbevents, /lib/ga4, /lib/clarity
    if (pathname.startsWith('/lib/')) {
      return handleLibProxy(request);
    }

    // ============ 7. SCRIPT PROXY FALLBACK ============
    // Any GET request to these CDN-like paths is treated as script request
    // Useful for custom CDN setups and backward compatibility
    if (['/cdn/', '/assets/', '/static/'].some(prefix => pathname.startsWith(prefix))) {
      return handleScriptProxy(request, rateLimit);
    }

    // ============ 8. GTM FALLBACK ENDPOINT ============
    // Only available if GTM_SERVER_URL is configured
    // This logs a warning because ideally transport_url should be injected in scripts
    // If this endpoint is hit, it means the auto-injection didn't work
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

    // ============ 9. NOT FOUND ============
    // No matching route found
    return new Response('Not found', { status: 404 });
  }
}

// ============================================================
// HANDLER IMPORTS DOCUMENTATION
// ============================================================

/**
 * @description Handler Functions Guide
 *
 * The Router delegates to these handler modules based on request context:
 *
 * **System Handlers** (always available):
 * - `handleOptions()` - CORS preflight responses (OPTIONS method)
 * - `handleHealthCheck()` - Health/status endpoint (/health)
 * - `handleEndpointsInfo()` - Configuration info endpoint (/endpoints)
 *
 * **Proxy Handlers** (main routing targets):
 * - `handleScriptProxy()` - Script serving with caching & transport_url injection
 *   * Serves: fbevents.js, gtm.js, gtag.js from cache
 *   * Injects transport_url for first-party tracking
 *   * Uses script-cache.js for SHA-256 change detection
 *
 * - `handleEndpointProxy()` - Tracking event forwarding
 *   * Forwards to: Google Analytics, GTM Server-Side, Meta Pixel
 *   * Adds first-party headers, validates payloads
 *   * Logs tracking hits for analysis
 *
 * **Specialized Handlers**:
 * - `handleEventProxy()` - Server-side event batching (/cdn/events POST)
 * - `handleLibProxy()` - Quick library access (/lib/{name})
 * - `handleDynamicProxy()` - Full URL proxying (/x/{encodedUrl})
 *
 * @see src/handlers/ for implementation details
 */

// ============================================================
// ERROR RESPONSES
// ============================================================

/**
 * @description
 * Standard error responses returned by the Router:
 *
 * **400 Bad Request**
 * - Invalid UUID format in /x/{uuid} paths
 * - Malformed request structure
 *
 * **404 Not Found**
 * - No matching route for the requested path
 * - Unrecognized URL pattern
 *
 * **500 Internal Server Error**
 * - Returned by handlers if processing fails
 * - Check handler logs for details
 *
 * All responses include proper content-type and security headers
 * via the response-factory.js module.
 */
