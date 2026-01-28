// ============================================================
// OPTIONS HANDLER - CORS PREFLIGHT
// ============================================================
// RESPONSIBILITY:
// - handleOptions(request) → Response
// - Chamar buildCORSHeaders
// - Chamar addSecurityHeaders
// - Retornar Response(null, { status: 204, headers })

// FUNCTIONS:
// - handleOptions(request) → Response

import { buildFullHeaders } from '../factories/headers-factory.js';

/**
 * Handle OPTIONS request (CORS preflight)
 * @param {Request} request
 * @param {Object} rateLimit - Rate limit info from worker
 * @returns {Response}
 */
export function handleOptions(request, rateLimit = null) {
  const headers = buildFullHeaders(request, { rateLimit });

  return new Response(null, { status: 204, headers });
}
