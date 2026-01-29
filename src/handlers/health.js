/**
 * @fileoverview Health Check - Health endpoint with metrics
 * @module handlers/health
 */

import { generateSecureUUID } from '../core/uuid.js';
import { CONFIG } from '../config/index.js';
import { jsonResponse } from '../utils/response.js';
import { Logger } from '../core/logger.js';
import { addRateLimitHeaders } from '../headers/rate-limit.js';
import { getCurrentDateISO, timestampToISO } from '../utils/time.js';

export async function handleHealthCheck(request, rateLimit) {
  try {
    const uuid = await generateSecureUUID();

    const health = {
      status: 'ok',
      timestamp: Date.now(),
      date: getCurrentDateISO(),
      version: '2.0.0-factory'
    };

    if (CONFIG.DEBUG_HEADERS_ENABLED) {
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
