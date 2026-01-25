// ============================================================
// ERROR HANDLER - GLOBAL ERROR HANDLING
// ============================================================
// RESPONSIBILITY:
// - handleError(error, request) → Response
// - Logar erro com contexto (stack, path, method)
// - Retornar response apropriada (500, 502, etc)
// - createErrorResponse(error, status) → Response

// FUNCTIONS:
// - handleError(error, request) → Response
// - createErrorResponse(message, status) → Response

import { Logger } from '../core/logger.js';
import { errorResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';

export function handleError(error, request) {
  const url = new URL(request.url);
  Logger.error('Request handler failed', {
    error: error.message,
    stack: error.stack,
    path: url.pathname,
  });
  return errorResponse('Internal Server Error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
}
