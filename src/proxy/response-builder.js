// ============================================================
// RESPONSE BUILDER - BUILD RESPONSE COM HEADERS
// ============================================================
// RESPONSIBILITY:
// - buildResponse(upstreamResponse, request, options) → Response
// - Criar Response com body de upstream
// - Adicionar CORS headers (buildCORSHeaders)
// - Adicionar security headers (addSecurityHeaders)
// - Adicionar cache headers (addCacheHeaders)
// - Adicionar X-Cache-Status (HIT ou MISS) - ONLY if DEBUG_HEADERS enabled
// - Adicionar rate limit headers (se fornecido)
// - Retornar response modificada

// FUNCTIONS:
// - buildResponse(upstreamResponse, request, options) → Response
// - addCacheHeaders(response, cached, ttl) → Response

import { CONFIG } from '../config/index.js';
import { buildFullHeaders } from '../factories/headers-factory.js';

export function buildResponse(upstreamResponse, request, { cacheStatus = 'MISS', rateLimit } = {}) {
  const response = new Response(upstreamResponse?.body, upstreamResponse);

  // Apply all standard headers (CORS + Security + Rate Limit)
  const standardHeaders = buildFullHeaders(request, { rateLimit });
  standardHeaders.forEach((value, key) => response.headers.set(key, value));

  // Debug header (only in development/staging)
  // Remove in production to prevent ad-blocker fingerprinting
  if (CONFIG?.DEBUG_HEADERS) {
    response.headers.set('X-Cache-Status', cacheStatus);
  }

  return response;
}
