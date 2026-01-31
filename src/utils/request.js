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
 * @returns {string} Origin URL (from Origin header or Referer)
 */
export const getOriginFromRequest = (request) => {
  try {
    // First try the Origin header (most reliable)
    const originHeader = request.headers.get('Origin');
    if (originHeader && originHeader !== 'null') {
      return originHeader;
    }
    
    // Fallback to Referer header
    const referer = request.headers.get('Referer');
    if (referer) {
      const url = new URL(referer);
      return `${url.protocol}//${url.host}`;
    }
    
    return null;
  } catch {
    return null;
  }
};
