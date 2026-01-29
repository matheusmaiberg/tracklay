/**
 * @fileoverview Response utilities - Response helpers
 */

import { HTTP_STATUS, CONTENT_TYPES } from './constants.js';

/**
 * @param {Object} data
 * @param {number} [status=200]
 * @returns {Response}
 */
export function jsonResponse(data, status = HTTP_STATUS.OK) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': CONTENT_TYPES.JSON },
  });
}

/**
 * @param {string} message
 * @param {number} [status=500]
 * @returns {Response}
 */
export function errorResponse(message, status = HTTP_STATUS.INTERNAL_SERVER_ERROR) {
  return new Response(message, {
    status,
    headers: { 'Content-Type': CONTENT_TYPES.TEXT },
  });
}
