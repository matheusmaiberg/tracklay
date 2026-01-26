// ============================================================
// ROUTER - ROUTE MATCHING E DISPATCH
// ============================================================
// RESPONSIBILITY:
// - Classe Router para roteamento
// - route(request, rateLimit) → Promise<Response>
// - Roteamento:
//   - OPTIONS → handleOptions
//   - /health → handleHealthCheck (público)
//   - /endpoints → handleEndpointsInfo (autenticado via query string)
//   - /cdn/f/{UUID}, /cdn/g/{UUID} → differentiated routing (v3.0.0 ultra-aggressive)
//   - /cdn/*, /assets/*, /static/* → handleScriptProxy (fallback)
//   - default → 404
//
// ULTRA-AGGRESSIVE MODE (v3.0.0):
// - Scripts and endpoints share SAME path (no suffixes)
// - Differentiation strategy:
//   - Facebook: HTTP method (POST = endpoint, GET = script)
//   - Google: Query params (v=2/tid=/_p= = endpoint, c=/id= = script)
// - UUID rotation support (time-based, deterministic)
// - Legacy routes removed (breaking change)

// FUNCTIONS:
// - Router.route(request, rateLimit) → Promise<Response>

import { handleOptions } from '../handlers/options.js';
import { handleHealthCheck } from '../handlers/health.js';
import { handleScriptProxy } from '../handlers/scripts.js';
import { handleEndpointProxy } from '../handlers/endpoints.js';
import { handleEndpointsInfo } from '../handlers/endpoints-info.js';
import { getScriptMap, getEndpointMap } from './mapping.js';

export class Router {
  static async route(request, rateLimit = null) {
    const url = request._parsedUrl || new URL(request.url);
    const pathname = url.pathname;

    // OPTIONS request
    if (request.method === 'OPTIONS') {
      return handleOptions(request, rateLimit);
    }

    // Health check
    if (pathname === '/health') {
      return handleHealthCheck(request, rateLimit);
    }

    // Endpoints info (authenticated, returns current UUIDs)
    // CRITICAL: Never expose this publicly or to clients
    // Only for server-side Shopify theme/n8n integration
    // Authentication via query string: ?token=SECRET
    if (pathname === '/endpoints') {
      return handleEndpointsInfo(request);
    }

    // Get both maps (they share same paths in ultra-aggressive mode)
    const endpointMap = await getEndpointMap();
    const scriptMap = await getScriptMap();

    // DEBUG: Log maps and pathname
    console.log('[DEBUG] Router pathname:', pathname);
    console.log('[DEBUG] scriptMap keys:', Object.keys(scriptMap));
    console.log('[DEBUG] endpointMap keys:', Object.keys(endpointMap));

    // Check if path exists in either map
    const pathExists = endpointMap[pathname] || scriptMap[pathname];

    if (pathExists) {
      // ULTRA-AGGRESSIVE MODE: Same path for scripts and endpoints
      // Differentiation strategy:
      // - Facebook: HTTP method (POST = tracking, GET = script)
      // - Google: Query params (v=2/tid=/_p= = tracking, c=/id= = script)

      // FACEBOOK: Differentiate by HTTP method
      if (pathname.startsWith('/cdn/f/')) {
        if (request.method === 'POST') {
          // Facebook tracking endpoint (POST)
          return handleEndpointProxy(request, rateLimit);
        } else {
          // Facebook script (GET)
          return handleScriptProxy(request, rateLimit);
        }
      }

      // GOOGLE: Differentiate by query parameters
      if (pathname.startsWith('/cdn/g/')) {
        const search = url.search;

        // Detect GA4/GTM tracking hits by query parameters
        // Tracking events include: v=2, tid=, _p=
        // Script loading uses: c= (container alias) or id= (container ID)
        const isTrackingHit = search.includes('v=2') ||
                              search.includes('tid=') ||
                              search.includes('_p=');

        if (isTrackingHit) {
          // Google tracking endpoint
          return handleEndpointProxy(request, rateLimit);
        } else {
          // Google script loading
          return handleScriptProxy(request, rateLimit);
        }
      }

      // Fallback: If path exists but doesn't match known patterns
      // This handles legacy routes or edge cases
      if (endpointMap[pathname]) {
        return handleEndpointProxy(request, rateLimit);
      } else {
        return handleScriptProxy(request, rateLimit);
      }
    }

    // Legacy: Script proxy routes (for paths not in script map)
    // This catches any custom paths under /cdn/, /assets/, /static/
    if (pathname.startsWith('/cdn/') || pathname.startsWith('/assets/') || pathname.startsWith('/static/')) {
      return handleScriptProxy(request, rateLimit);
    }

    // Default 404
    return new Response('Not found', { status: 404 });
  }
}
