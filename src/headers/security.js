/**
 * @fileoverview Security headers utility
 */

/**
 * @param {Headers} headers
 * @param {Object} options
 * @param {boolean} options.includeCSP - Whether to include CSP header (default: true)
 * @returns {Headers}
 */
export const addSecurityHeaders = (headers, { includeCSP = true } = {}) => {
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  headers.set('Permissions-Policy', 'interest-cohort=()');
  headers.set('X-Frame-Options', 'DENY');
  
  // Only add CSP for non-proxy responses to avoid breaking third-party content
  if (includeCSP) {
    headers.set('Content-Security-Policy', "default-src 'self'");
  }
  
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Request-Id', crypto.randomUUID());

  return headers;
};
