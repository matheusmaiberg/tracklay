// ============================================================
// RESPONSE BUILDER - BUILD RESPONSE COM HEADERS
// ============================================================
// RESPONSABILIDADE:
// - buildResponse(upstreamResponse, request, options) → Response
// - Criar Response com body de upstream
// - Adicionar CORS headers (buildCORSHeaders)
// - Adicionar security headers (addSecurityHeaders)
// - Adicionar cache headers (addCacheHeaders)
// - Adicionar X-Cache-Status (HIT ou MISS)
// - Adicionar rate limit headers (se fornecido)
// - Retornar response modificada

// FUNÇÕES:
// - buildResponse(upstreamResponse, request, options) → Response
// - addCacheHeaders(response, cached, ttl) → Response

import { buildCORSHeaders } from '../headers/cors.js';
import { addSecurityHeaders } from '../headers/security.js';
import { HEADERS } from '../utils/constants.js';

export function buildResponse(upstreamResponse, request, options) {
  const response = new Response(upstreamResponse.body, upstreamResponse);

  const corsHeaders = buildCORSHeaders(request);
  corsHeaders.forEach((value, key) => response.headers.set(key, value));

  addSecurityHeaders(response.headers);

  response.headers.set('X-Cache-Status', options.cacheStatus || 'MISS');

  // Add rate limit headers if provided
  if (options.rateLimit) {
    response.headers.set(HEADERS.X_RATELIMIT_LIMIT, options.rateLimit.limit.toString());
    response.headers.set(HEADERS.X_RATELIMIT_REMAINING, options.rateLimit.remaining.toString());
    response.headers.set(HEADERS.X_RATELIMIT_RESET, new Date(options.rateLimit.resetAt).toISOString());
  }

  return response;
}
