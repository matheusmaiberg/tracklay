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
import { HEADERS } from '../utils/constants.js';

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

  // Adicionar rate limit headers se fornecidos
  if (rateLimit) {
    headers.set(HEADERS.X_RATELIMIT_LIMIT, rateLimit.limit.toString());
    headers.set(HEADERS.X_RATELIMIT_REMAINING, rateLimit.remaining.toString());
    headers.set(HEADERS.X_RATELIMIT_RESET, new Date(rateLimit.resetAt).toISOString());
  }

  return new Response(null, {
    status: 204,
    headers
  });
}
