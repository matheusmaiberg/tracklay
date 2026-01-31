/**
 * @fileoverview Global error handling
 */

import { Logger } from '../core/logger.js';
import { errorResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { CONFIG } from '../config/index.js';

export const handleError = (error, request) => {
  const { pathname } = new URL(request.url);
  const { message, stack } = error;
  
  Logger.error('Request handler failed', {
    error: message,
    path: pathname,
  });
  
  // Logar stack apenas em DEBUG
  if (CONFIG.DEBUG_HEADERS_ENABLED) {
    console.error('Stack:', stack);
  }
  
  return errorResponse('Internal Server Error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
};
