/**
 * @fileoverview Request utilities - Request parsing helpers
 */

/**
 * @param {Request} request
 * @returns {URL}
 */
export function getParsedUrl(request) {
  return new URL(request.url);
}
