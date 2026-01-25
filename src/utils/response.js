// ============================================================
// RESPONSE UTILS - RESPONSE HELPERS
// ============================================================
// RESPONSIBILITY:
// - jsonResponse(data, status) → Response (JSON with headers)
// - errorResponse(message, status) → Response (text)

// FUNCTIONS:
// - jsonResponse(data, status = 200) → Response
// - errorResponse(message, status = 500) → Response

import { HTTP_STATUS, CONTENT_TYPES } from './constants.js';

/**
 * Creates a JSON Response with proper Content-Type header
 * @param {Object} data - Data to serialize as JSON
 * @param {number} [status=200] - HTTP status code
 * @returns {Response} Response with JSON content
 */
export function jsonResponse(data, status = HTTP_STATUS.OK) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': CONTENT_TYPES.JSON,
    },
  });
}

/**
 * Creates a plain text error Response
 * @param {string} message - Error message
 * @param {number} [status=500] - HTTP status code
 * @returns {Response} Response with error message
 */
export function errorResponse(message, status = HTTP_STATUS.INTERNAL_SERVER_ERROR) {
  return new Response(message, {
    status,
    headers: {
      'Content-Type': CONTENT_TYPES.TEXT,
    },
  });
}
