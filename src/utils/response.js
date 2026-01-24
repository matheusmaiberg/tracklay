// ============================================================
// RESPONSE UTILS - RESPONSE HELPERS
// ============================================================
// RESPONSABILIDADE:
// - jsonResponse(data, status) → Response (JSON com headers)
// - errorResponse(message, status) → Response (texto)
// - successResponse(data) → Response (JSON 200)

// FUNÇÕES:
// - jsonResponse(data, status = 200) → Response
// - errorResponse(message, status = 500) → Response
// - successResponse(data) → Response (alias para jsonResponse)

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

export function successResponse(data) {
  return jsonResponse(data, HTTP_STATUS.OK);
}
