// ============================================================
// VALIDATOR - REQUEST VALIDATION
// ============================================================
// RESPONSABILIDADE:
// - validateRequest(request) → { valid: boolean, error?, status? }
// - Verificar tamanho do request (Content-Length)
// - Verificar DNT header (logar mas permitir)
// - Outras validações conforme necessário

// FUNÇÕES:
// - validateRequest(request) → { valid, error, status }
// - checkRequestSize(request) → boolean
// - checkDNT(request) → void (apenas log)

import { CONFIG } from '../config/index.js';
import { Logger } from '../core/logger.js';

/**
 * Validate incoming request
 * @param {Request} request - Incoming request
 * @returns {Object} Validation result { valid: boolean, error?: string, status?: number }
 */
export function validateRequest(request) {
  // Verificar tamanho do request
  const contentLength = request.headers.get('Content-Length');
  if (contentLength && parseInt(contentLength) > CONFIG.MAX_REQUEST_SIZE) {
    return { valid: false, error: 'Request too large', status: 413 };
  }

  // Respeitar Do Not Track
  const dnt = request.headers.get('DNT');
  if (dnt === '1') {
    Logger.info('DNT header detected', {
      url: new URL(request.url).pathname
    });
  }

  return { valid: true };
}
