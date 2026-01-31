/**
 * @fileoverview Health Check - Health endpoint with metrics
 * @module handlers/health
 */

import { generateSecureUUID } from '../core/uuid.js';
import { CONFIG } from '../config/index.js';
import { jsonResponse, errorResponse } from '../utils/response.js';
import { Logger } from '../core/logger.js';
import { addRateLimitHeaders } from '../headers/rate-limit.js';
import { addSecurityHeaders } from '../headers/security.js';
import { buildCORSHeaders } from '../headers/cors.js';
import { getCurrentDateISO, timestampToISO } from '../utils/time.js';
import { HTTP_STATUS } from '../utils/constants.js';

export async function handleHealthCheck(request, rateLimit) {
  try {
    const uuid = await generateSecureUUID();

    const health = {
      status: 'ok',
      timestamp: Date.now(),
      date: getCurrentDateISO(),
      version: '1.0.0'
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

    const headers = buildCORSHeaders(request);
    addRateLimitHeaders(headers, rateLimit);
    addSecurityHeaders(headers, { includeCSP: true });
    headers.set('Cache-Control', 'no-store');
    headers.set('Content-Type', 'application/json');

    return new Response(JSON.stringify(health), { status: 200, headers });

  } catch (error) {
    Logger.error('Health check failed', { error: error.message });
    return errorResponse('Health check failed', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
