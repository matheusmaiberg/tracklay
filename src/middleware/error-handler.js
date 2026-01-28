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

export const handleError = (error, request) => {
  const { pathname } = new URL(request.url);
  const { message, stack } = error;
  
  Logger.error('Request handler failed', {
    error: message,
    stack,
    path: pathname,
  });
  
  return errorResponse('Internal Server Error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
};
