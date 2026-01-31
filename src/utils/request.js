/**
 * @fileoverview Request utilities - Request parsing helpers
 */

/**
 * @param {Request} request
 * @returns {URL}
 */
export function getParsedUrl(request) {
  if (!request || !request.url) {
    throw new Error('Invalid request object');
  }
  return new URL(request.url);
}

/**
 * @param {Request} request - Incoming request
 * @returns {string} Origin URL (protocol + hostname)
 */
export const getOriginFromRequest = (request) => {
  try {
    const { protocol, hostname } = new URL(request.url);
    return `${protocol}//${hostname}`;
  } catch {
    return null;
  }
};
