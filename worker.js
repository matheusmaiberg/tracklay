// ============================================================
// CLOUDFLARE WORKER - ENTRY POINT
// ============================================================
// RESPONSABILIDADE:
// - addEventListener('fetch', ...) ou export default (ES modules)
// - Inicializar serviços (Logger, RateLimiter, Router, Metrics)
// - Orquestrar fluxo principal de request/response
// - Error handling global
// - Logging de requests
// - Receber e passar environment variables

import { Router } from './src/routing/router.js';
import { RateLimiter } from './src/core/rate-limiter.js';
import { validateRequest } from './src/middleware/validator.js';
import { handleError } from './src/middleware/error-handler.js';
import { Metrics } from './src/middleware/metrics.js';
import { errorResponse } from './src/utils/response.js';
import { HTTP_STATUS, HEADERS } from './src/utils/constants.js';
import { initConfig } from './src/config/index.js';

// ============= MODERN ES MODULES EXPORT =============
// Export default handler for ES modules format (recommended)
export default {
  async fetch(request, env) {
    // Initialize config with environment variables
    initConfig(env);
    return handleRequest(request);
  }
};

// ============= LEGACY SERVICE WORKER FORMAT =============
// Fallback for legacy format (if not using ES modules)
if (typeof addEventListener !== 'undefined') {
  addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
  });
}

// ============= HANDLER PRINCIPAL =============
async function handleRequest(request) {
  const startTime = Date.now();

  try {
    // Parse URL once and cache it on request object
    request._parsedUrl = new URL(request.url);

    // Registrar request recebido
    Metrics.recordRequest(request);

    // Validar request
    const validation = validateRequest(request);
    if (!validation.valid) {
      return errorResponse(validation.error, validation.status);
    }

    // Rate limiting
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimit = await RateLimiter.check(clientIP);

    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);

      return new Response('Too Many Requests', {
        status: HTTP_STATUS.TOO_MANY_REQUESTS,
        headers: {
          'Retry-After': retryAfter.toString(),
          [HEADERS.X_RATELIMIT_LIMIT]: rateLimit.limit.toString(),
          [HEADERS.X_RATELIMIT_REMAINING]: '0',
          [HEADERS.X_RATELIMIT_RESET]: new Date(rateLimit.resetAt).toISOString(),
        }
      });
    }

    // Roteamento (passar rateLimit para evitar chamada duplicada no health check)
    let response = await Router.route(request, rateLimit);

    // Criar nova Response com headers adicionais (headers são imutáveis)
    response = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers)
    });

    response.headers.set(HEADERS.X_RATELIMIT_LIMIT, rateLimit.limit.toString());
    response.headers.set(HEADERS.X_RATELIMIT_REMAINING, rateLimit.remaining.toString());
    response.headers.set(HEADERS.X_RATELIMIT_RESET, new Date(rateLimit.resetAt).toISOString());

    // Registrar métricas
    const duration = Date.now() - startTime;
    Metrics.record(request, response, duration);

    return response;

  } catch (error) {
    // Error handling global
    return handleError(error, request);
  }
}
