// ============================================================
// OPTIONS HANDLER - CORS PREFLIGHT
// ============================================================
// RESPONSABILIDADE:
// - handleOptions(request) → Response
// - Chamar buildCORSHeaders
// - Chamar addSecurityHeaders
// - Retornar Response(null, { status: 204, headers })

// FUNÇÕES:
// - handleOptions(request) → Response

import { buildCORSHeaders } from '../headers/cors.js';
import { addSecurityHeaders } from '../headers/security.js';
import { addRateLimitHeaders } from '../headers/rate-limit.js';

/**
 * Handle OPTIONS request (CORS preflight)
 * @param {Request} request
 * @param {Object} rateLimit - Rate limit info from worker
 * @returns {Response}
 */
export function handleOptions(request, rateLimit = null) {
  const headers = buildCORSHeaders(request);

  // Adicionar headers de segurança
  addSecurityHeaders(headers);

  // Adicionar rate limit headers
  addRateLimitHeaders(headers, rateLimit);

  return new Response(null, {
    status: 204,
    headers
  });
}
