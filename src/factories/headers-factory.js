/**
 * @fileoverview Headers Factory - Consolidated header building
 * @module factories/headers-factory
 */

import { buildCORSHeaders } from '../headers/cors.js';
import { addSecurityHeaders } from '../headers/security.js';
import { addRateLimitHeaders } from '../headers/rate-limit.js';

/**
 * @param {Request} request - Incoming request (for CORS origin detection)
 * @param {Object} options - Header options
 * @param {Object} [options.rateLimit] - Rate limit info { limit, remaining, resetAt }
 * @param {boolean} [options.includeSecurity=true] - Include security headers
 * @param {boolean} [options.includeRateLimit=true] - Include rate limit headers
 * @param {boolean} [options.includeCSP=true] - Include CSP header (disable for proxy responses)
 * @param {boolean} [options.includeFrameOptions=true] - Include X-Frame-Options (disable for iframes)
 * @returns {Headers} Headers object with all requested headers
 */
export const buildFullHeaders = (
  request,
  { rateLimit, includeSecurity = true, includeRateLimit = true, includeCSP = true, includeFrameOptions = true } = {}
) => {
  const headers = buildCORSHeaders(request);

  if (includeSecurity) {
    addSecurityHeaders(headers, { includeCSP, includeFrameOptions });
  }

  if (includeRateLimit && rateLimit != null) {
    addRateLimitHeaders(headers, rateLimit);
  }

  return headers;
};
