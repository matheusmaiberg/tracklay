// ============================================================
// HEALTH CHECK - HEALTH ENDPOINT COM MÉTRICAS
// ============================================================
// RESPONSABILIDADE:
// - handleHealthCheck(request, rateLimit) → Promise<Response>
// - Retornar JSON com:
//   - status: 'ok'
//   - timestamp, date
//   - uuid (atual)
//   - version: '2.0.0-factory'
//   - metrics (rateLimit, config)
//   - cloudflare (colo, country, ray)
// - Cache-Control: no-store

// FUNÇÕES:
// - handleHealthCheck(request, rateLimit) → Promise<Response>
// - rateLimit passado do worker.js para evitar chamada duplicada

import { generateSecureUUID } from '../core/uuid.js';
import { CONFIG } from '../config/index.js';
import { jsonResponse } from '../utils/response.js';
import { Logger } from '../core/logger.js';

// ============= HEALTH CHECK HANDLER =============
export async function handleHealthCheck(request, rateLimit) {
  try {
    const uuid = await generateSecureUUID();

    const health = {
      status: 'ok',
      timestamp: Date.now(),
      date: new Date().toISOString(),
      uuid: uuid,
      version: '2.0.0-factory',
      metrics: {
        rateLimit: {
          remaining: rateLimit?.remaining ?? CONFIG.RATE_LIMIT_REQUESTS,
          limit: rateLimit?.limit ?? CONFIG.RATE_LIMIT_REQUESTS,
          resetAt: rateLimit?.resetAt ? new Date(rateLimit.resetAt).toISOString() : new Date().toISOString()
        },
        config: {
          cacheTTL: CONFIG.CACHE_TTL,
          timeout: CONFIG.FETCH_TIMEOUT,
          maxSize: CONFIG.MAX_REQUEST_SIZE
        }
      },
      cloudflare: {
        colo: request.cf?.colo || 'unknown',
        country: request.headers.get('CF-IPCountry') || 'unknown',
        ray: request.headers.get('CF-Ray') || 'unknown'
      }
    };

    const response = jsonResponse(health);
    response.headers.set('Cache-Control', 'no-store');

    // Rate limit headers já foram adicionados no health check metrics
    // Mas vamos garantir que estejam na response também
    if (rateLimit) {
      response.headers.set('X-RateLimit-Limit', rateLimit.limit.toString());
      response.headers.set('X-RateLimit-Remaining', rateLimit.remaining.toString());
      response.headers.set('X-RateLimit-Reset', new Date(rateLimit.resetAt).toISOString());
    }

    return response;

  } catch (error) {
    Logger.error('Health check failed', { error: error.message });

    const errorHealth = {
      status: 'error',
      error: error.message
    };

    return jsonResponse(errorHealth, 500);
  }
}
