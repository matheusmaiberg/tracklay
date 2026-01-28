// ============================================================
// RATE LIMIT HEADERS - RATE LIMIT HEADERS UTILITY
// ============================================================
// RESPONSIBILITY:
// - addRateLimitHeaders(headers, rateLimit) - Adds rate limit headers to a Headers object

import { HEADERS } from '../utils/constants.js';
import { timestampToISO } from '../utils/time.js';

/**
 * Adds rate limit headers to a Headers object
 * @param {Headers} headers - Headers object to modify
 * @param {Object} rateLimit - Rate limit info
 * @param {number} rateLimit.limit - Max requests allowed
 * @param {number} rateLimit.remaining - Remaining requests
 * @param {number} rateLimit.resetAt - Timestamp when limit resets
 */
export const addRateLimitHeaders = (headers, rateLimit) => {
  if (!rateLimit) return;

  const { limit, remaining, resetAt } = rateLimit;

  headers.set(HEADERS.X_RATELIMIT_LIMIT, limit?.toString() ?? '0');
  headers.set(HEADERS.X_RATELIMIT_REMAINING, remaining?.toString() ?? '0');
  headers.set(HEADERS.X_RATELIMIT_RESET, timestampToISO(resetAt));
};
