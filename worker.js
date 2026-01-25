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
import { handleError } from './src/middleware/error-handler.js';
import { Metrics } from './src/middleware/metrics.js';
import { errorResponse } from './src/utils/response.js';
import { HTTP_STATUS } from './src/utils/constants.js';
import { initConfig, CONFIG } from './src/config/index.js';
import { addRateLimitHeaders } from './src/headers/rate-limit.js';

// ============= MODERN ES MODULES EXPORT =============
// Export default handler for ES modules format (recommended)
export default {
  async fetch(request, env) {
    // Initialize config with environment variables
    initConfig(env);
    return handleRequest(request);
  },

  // Scheduled event handler (Cloudflare Cron Triggers)
  // Runs every 12 hours to update script cache
  async scheduled(event, env, ctx) {
    try {
      initConfig(env);
      const { updateScripts } = await import('./src/scheduled/update-scripts.js');

      // Execute script update in background
      ctx.waitUntil(updateScripts());
    } catch (error) {
      console.error('Scheduled event failed:', error);
    }
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
    // Registrar request recebido
    Metrics.recordRequest(request);

    // Validar request - verificar tamanho
    const contentLength = request.headers.get('Content-Length');
    if (contentLength && parseInt(contentLength) > CONFIG.MAX_REQUEST_SIZE) {
      return errorResponse('Request too large', 413);
    }

    // Rate limiting
    const clientIP = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimit = await RateLimiter.check(clientIP);

    if (!rateLimit.allowed) {
      const retryAfter = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
      const headers = new Headers({
        'Retry-After': retryAfter.toString()
      });

      addRateLimitHeaders(headers, { ...rateLimit, remaining: 0 });

      return new Response('Too Many Requests', {
        status: HTTP_STATUS.TOO_MANY_REQUESTS,
        headers
      });
    }

    // Roteamento (passar rateLimit para evitar chamada duplicada no health check)
    const response = await Router.route(request, rateLimit);

    // Rate limit headers são adicionados diretamente em buildResponse
    // Não é necessário clonar a response

    // Registrar métricas
    const duration = Date.now() - startTime;
    Metrics.record(request, response, duration);

    return response;

  } catch (error) {
    // Error handling global
    return handleError(error, request);
  }
}
