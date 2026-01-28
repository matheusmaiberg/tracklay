// ============================================================
// HEALTH CHECK - HEALTH ENDPOINT COM MÉTRICAS
// ============================================================
// RESPONSIBILITY:
// - handleHealthCheck(request, rateLimit) → Promise<Response>
// - Retornar JSON com:
//   - status: 'ok'
//   - timestamp, date
//   - uuid (atual)
//   - version: '2.0.0-factory'
//   - metrics (rateLimit, config)
//   - cloudflare (colo, country, ray)
// - Cache-Control: no-store

// FUNCTIONS:
// - handleHealthCheck(request, rateLimit) → Promise<Response>
// - rateLimit passado do worker.js para evitar chamada duplicada

import { generateSecureUUID } from '../core/uuid.js';
import { CONFIG } from '../config/index.js';
import { jsonResponse } from '../utils/response.js';
import { Logger } from '../core/logger.js';
import { addRateLimitHeaders } from '../headers/rate-limit.js';
import { getCurrentDateISO, timestampToISO } from '../utils/time.js';

// ============= HEALTH CHECK HANDLER =============
export async function handleHealthCheck(request, rateLimit) {
  try {
    const uuid = await generateSecureUUID();

    const health = {
      status: 'ok',
      timestamp: Date.now(),
      date: getCurrentDateISO(),
      version: '2.0.0-factory'
    };

    // Debug information (only in development/staging)
    // Remove in production to prevent information disclosure
    if (CONFIG.DEBUG_HEADERS) {
      health.uuid = uuid;
      health.metrics = {
        rateLimit: {
          remaining: rateLimit?.remaining ?? CONFIG.RATE_LIMIT_REQUESTS,
          limit: rateLimit?.limit ?? CONFIG.RATE_LIMIT_REQUESTS,
          resetAt: rateLimit?.resetAt ? timestampToISO(rateLimit.resetAt) : getCurrentDateISO()
        },
        config: {
          cacheTTL: CONFIG.CACHE_TTL,
          timeout: CONFIG.FETCH_TIMEOUT,
          maxSize: CONFIG.MAX_REQUEST_SIZE
        }
      };
      health.cloudflare = {
        colo: request.cf?.colo ?? 'unknown',
        country: request.headers.get('CF-IPCountry') ?? 'unknown',
        ray: request.headers.get('CF-Ray') ?? 'unknown'
      };
    }

    const response = jsonResponse(health);
    response.headers.set('Cache-Control', 'no-store');

    // Add rate limit headers
    addRateLimitHeaders(response.headers, rateLimit);

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
