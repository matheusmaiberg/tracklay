/**
 * @fileoverview Rate limit headers utility
 */

import { HEADERS } from '../utils/constants.js';
import { timestampToISO } from '../utils/time.js';

/**
 * @param {Headers} headers
 * @param {Object} rateLimit
 * @param {number} rateLimit.limit
 * @param {number} rateLimit.remaining
 * @param {number} rateLimit.resetAt
 */
export const addRateLimitHeaders = (headers, rateLimit) => {
  if (!rateLimit) return;

  const { limit, remaining, resetAt } = rateLimit;

  headers.set(HEADERS.X_RATELIMIT_LIMIT, limit?.toString() ?? '0');
  headers.set(HEADERS.X_RATELIMIT_REMAINING, remaining?.toString() ?? '0');
  headers.set(HEADERS.X_RATELIMIT_RESET, timestampToISO(resetAt));
};
