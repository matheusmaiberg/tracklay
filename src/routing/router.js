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
//   - /cdn/*, /assets/*, /static/* → handleScriptProxy
//   - /g/collect, /tr, /j/collect → handleEndpointProxy
//   - default → 404

// FUNÇÕES:
// - Router.match(request) → string
// - Router.route(request) → Promise<Response>

import { handleOptions } from '../handlers/options.js';
import { handleHealthCheck } from '../handlers/health.js';
import { handleScriptProxy } from '../handlers/scripts.js';
import { handleEndpointProxy } from '../handlers/endpoints.js';

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

    // Script proxy routes
    if (pathname.startsWith('/cdn/') || pathname.startsWith('/assets/') || pathname.startsWith('/static/')) {
      return handleScriptProxy(request);
    }

    // Endpoint proxy routes
    if (pathname === '/g/collect' || pathname === '/tr' || pathname === '/j/collect') {
      return handleEndpointProxy(request);
    }

    // Default 404
    return new Response('Not found', { status: 404 });
  }
}
