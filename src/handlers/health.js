// ============================================================
// HEALTH CHECK - HEALTH ENDPOINT COM MÉTRICAS
// ============================================================
// RESPONSABILIDADE:
// - handleHealthCheck(request) → Promise<Response>
// - Retornar JSON com:
//   - status: 'ok'
//   - timestamp, date
//   - uuid (atual)
//   - version: '2.0.0-factory'
//   - metrics (rateLimit, config)
//   - cloudflare (colo, country, ray)
// - Cache-Control: no-store

// FUNÇÕES:
// - handleHealthCheck(request) → Promise<Response>
// - getMetrics(request) → object (helper)

import { generateSecureUUID } from '../core/uuid.js';
import { RateLimiter } from '../core/rate-limiter.js';
import { CONFIG } from '../config/index.js';
import { jsonResponse } from '../utils/response.js';
import { Logger } from '../core/logger.js';

// ============= HEALTH CHECK HANDLER =============
export async function handleHealthCheck(request) {
  try {
    const uuid = await generateSecureUUID();
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const rateLimit = await RateLimiter.check(ip);

    const health = {
      status: 'ok',
      timestamp: Date.now(),
      date: new Date().toISOString(),
      uuid: uuid,
      version: '2.0.0-factory',
      metrics: {
        rateLimit: {
          remaining: rateLimit.remaining,
          limit: CONFIG.RATE_LIMIT_REQUESTS,
          resetAt: new Date(rateLimit.resetAt).toISOString()
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
