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
// - Retornar response modificada

// FUNÇÕES:
// - buildResponse(upstreamResponse, request, options) → Response
// - addCacheHeaders(response, cached, ttl) → Response

import { buildCORSHeaders } from '../headers/cors.js';
import { addSecurityHeaders } from '../headers/security.js';

export function buildResponse(upstreamResponse, request, options) {
  const response = new Response(upstreamResponse.body, upstreamResponse);

  const corsHeaders = buildCORSHeaders(request);
  corsHeaders.forEach((value, key) => response.headers.set(key, value));

  addSecurityHeaders(response.headers);

  response.headers.set('X-Cache-Status', options.cached ? 'HIT' : 'MISS');

  return response;
}
