// ============================================================
// ROUTER - ROUTE MATCHING E DISPATCH
// ============================================================
// RESPONSIBILITY:
// - Classe Router para roteamento
// - match(request) → string (nome do handler)
// - route(request) → Promise<Response>
// - Roteamento:
//   - OPTIONS → handleOptions
//   - /health → handleHealthCheck (público)
//   - /endpoints → handleEndpointsInfo (autenticado via query string)
//   - /cdn/*, /assets/*, /static/* → handleScriptProxy OR handleEndpointProxy (dynamic)
//   - Legacy: /g/collect, /tr, /j/collect → handleEndpointProxy
//   - default → 404
//
// OBFUSCATION UPDATE:
// - Now supports UUID-based endpoints: /cdn/f/{UUID}, /cdn/g/{UUID}
// - Dynamic route matching based on endpoint/script maps
// - UUID rotation support (time-based, deterministic)
// - Backward compatible with legacy paths

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

    // Check if path is in endpoint map (includes both obfuscated and legacy endpoints)
    // Note: getEndpointMap() is now async due to UUID rotation support
    const endpointMap = await getEndpointMap();
    if (endpointMap[pathname]) {
      return handleEndpointProxy(request, rateLimit);
    }

    // Check if path is in script map (includes both obfuscated and legacy scripts)
    // Note: getScriptMap() is now async due to UUID rotation support
    const scriptMap = await getScriptMap();
    if (scriptMap[pathname]) {
      return handleScriptProxy(request, rateLimit);
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
