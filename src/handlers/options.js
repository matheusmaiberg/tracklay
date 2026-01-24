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

/**
 * Handle OPTIONS request (CORS preflight)
 * @param {Request} request
 * @returns {Response}
 */
export function handleOptions(request) {
  const headers = buildCORSHeaders(request);

  // Adicionar headers de segurança
  addSecurityHeaders(headers);

  return new Response(null, {
    status: 204,
    headers
  });
}
