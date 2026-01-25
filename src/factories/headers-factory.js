// ============================================================
// HEADERS FACTORY - CONSOLIDATED HEADER BUILDING
// ============================================================
// RESPONSIBILITY:
// - Consolidate header building patterns used across handlers
// - Single point for CORS + Security + Rate Limit headers
// - Reduces duplication in options.js and response-builder.js
//
// FUNCTIONS:
// - buildFullHeaders(request, options) - All headers in one call

import { buildCORSHeaders } from '../headers/cors.js';
import { addSecurityHeaders } from '../headers/security.js';
import { addRateLimitHeaders } from '../headers/rate-limit.js';

/**
 * Build complete set of headers for a response
 * Consolidates CORS + Security + Rate Limit headers
 *
 * @param {Request} request - Incoming request (for CORS origin detection)
 * @param {Object} options - Header options
 * @param {Object} [options.rateLimit] - Rate limit info { limit, remaining, resetAt }
 * @param {boolean} [options.includeSecurity=true] - Include security headers
 * @param {boolean} [options.includeRateLimit=true] - Include rate limit headers
 * @returns {Headers} Headers object with all requested headers
 *
 * Usage:
 * const headers = buildFullHeaders(request, { rateLimit });
 */
export function buildFullHeaders(request, options = {}) {
  const {
    rateLimit = null,
    includeSecurity = true,
    includeRateLimit = true
  } = options;

  // Start with CORS headers
  const headers = buildCORSHeaders(request);

  // Add security headers (CSP, Permissions-Policy, etc.)
  if (includeSecurity) {
    addSecurityHeaders(headers);
  }

  // Add rate limit headers (X-RateLimit-*)
  if (includeRateLimit && rateLimit) {
    addRateLimitHeaders(headers, rateLimit);
  }

  return headers;
}
