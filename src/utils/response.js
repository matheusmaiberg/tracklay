// ============================================================
// RESPONSE UTILS - RESPONSE HELPERS
// ============================================================
// RESPONSABILIDADE:
// - jsonResponse(data, status) → Response (JSON com headers)
// - errorResponse(message, status) → Response (texto)

// FUNÇÕES:
// - jsonResponse(data, status = 200) → Response
// - errorResponse(message, status = 500) → Response

import { HTTP_STATUS, CONTENT_TYPES } from './constants.js';

export function jsonResponse(data, status = HTTP_STATUS.OK) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': CONTENT_TYPES.JSON,
    },
  });
}

export function errorResponse(message, status = HTTP_STATUS.INTERNAL_SERVER_ERROR) {
  return new Response(message, {
    status,
    headers: {
      'Content-Type': CONTENT_TYPES.TEXT,
    },
  });
}
