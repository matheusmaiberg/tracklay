/**
 * @fileoverview Security headers utility
 */

/**
 * @param {Headers} headers
 * @param {Object} [options={}]
 * @param {boolean} [options.includeCSP=true] - Whether to include CSP header
 * @param {boolean} [options.includeFrameOptions=true] - Whether to include X-Frame-Options (disable for iframes)
 * @returns {Headers}
 */
export const addSecurityHeaders = (headers, { includeCSP = true, includeFrameOptions = true } = {}) => {
  headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  headers.set('Permissions-Policy', 'interest-cohort=()');
  
  // Only add frame options for non-iframe content (disable for GTM/service worker iframes)
  if (includeFrameOptions) {
    headers.set('X-Frame-Options', 'DENY');
  }
  
  // Only add CSP for non-proxy responses to avoid breaking third-party content
  if (includeCSP) {
    headers.set('Content-Security-Policy', "default-src 'self'");
  }
  
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Request-Id', crypto.randomUUID());

  return headers;
};
