// ============================================================
// ROUTER - ROUTE MATCHING E DISPATCH
// ============================================================
// RESPONSABILIDADE:
// - Classe Router para roteamento
// - match(request) → string (nome do handler)
// - route(request) → Promise<Response>
// - Roteamento:
//   - OPTIONS → handleOptions
//   - /health → handleHealthCheck
//   - /cdn/*, /assets/*, /static/* → handleScriptProxy OR handleEndpointProxy (dynamic)
//   - Legacy: /g/collect, /tr, /j/collect → handleEndpointProxy
//   - default → 404
//
// OBFUSCATION UPDATE:
// - Now supports UUID-based endpoints: /cdn/f/{UUID}.js, /cdn/g/{UUID}.js
// - Dynamic route matching based on endpoint/script maps
// - Backward compatible with legacy paths

// FUNÇÕES:
// - Router.match(request) → string
// - Router.route(request) → Promise<Response>

import { handleOptions } from '../handlers/options.js';
import { handleHealthCheck } from '../handlers/health.js';
import { handleScriptProxy } from '../handlers/scripts.js';
import { handleEndpointProxy } from '../handlers/endpoints.js';
import { getScriptMap, getEndpointMap } from './mapping.js';

export class Router {
  static route(request) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // OPTIONS request
    if (request.method === 'OPTIONS') {
      return handleOptions(request);
    }

    // Health check
    if (pathname === '/health') {
      return handleHealthCheck(request);
    }

    // Check if path is in endpoint map (includes both obfuscated and legacy endpoints)
    const endpointMap = getEndpointMap();
    if (endpointMap[pathname]) {
      return handleEndpointProxy(request);
    }

    // Check if path is in script map (includes both obfuscated and legacy scripts)
    const scriptMap = getScriptMap();
    if (scriptMap[pathname]) {
      return handleScriptProxy(request);
    }

    // Legacy: Script proxy routes (for paths not in script map)
    // This catches any custom paths under /cdn/, /assets/, /static/
    if (pathname.startsWith('/cdn/') || pathname.startsWith('/assets/') || pathname.startsWith('/static/')) {
      return handleScriptProxy(request);
    }

    // Default 404
    return new Response('Not found', { status: 404 });
  }
}
