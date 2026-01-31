/**
 * @fileoverview Response utilities - Response helpers
 */

import { HTTP_STATUS, CONTENT_TYPES } from './constants.js';
import { Logger } from '../core/logger.js';

/**
 * @param {Object} data
 * @param {number} [status=200]
 * @returns {Response}
 */
export function jsonResponse(data, status = HTTP_STATUS.OK) {
  try {
    const body = JSON.stringify(data);
    return new Response(body, {
      status,
      headers: { 'Content-Type': CONTENT_TYPES.JSON },
    });
  } catch (error) {
    Logger.error('JSON stringify failed', { error: error.message });
    return new Response('{}', {
      status: HTTP_STATUS.INTERNAL_SERVER_ERROR,
      headers: { 'Content-Type': CONTENT_TYPES.JSON },
    });
  }
}

/**
 * @param {string} message
 * @param {number} [status=500]
 * @param {Headers} [headers=null]
 * @returns {Response}
 */
export function errorResponse(message, status = HTTP_STATUS.INTERNAL_SERVER_ERROR, headers = null) {
  const responseHeaders = headers || new Headers();
  if (!headers) {
    responseHeaders.set('Content-Type', CONTENT_TYPES.TEXT);
  }
  return new Response(message, { status, headers: responseHeaders });
}
