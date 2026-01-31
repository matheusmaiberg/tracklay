/**
 * @fileoverview Cache-Control header utilities for Tracklay
 * @module utils/cache-control
 */

/**
 * Cache-Control header builder utilities.
 * Provides standardized Cache-Control header values for different caching strategies.
 */
export const CacheControl = {
  /**
   * Creates a public cache directive with max-age.
   * Suitable for responses that can be cached by any cache.
   *
   * @param {number} ttl - Time-to-live in seconds
   * @returns {string} Cache-Control header value
   * @example
   * CacheControl.public(3600)
   * // Returns: 'public, max-age=3600'
   */
  public(ttl) {
    return `public, max-age=${ttl}`;
  },

  /**
   * Creates a no-store cache directive.
   * Suitable for responses that should never be cached (private data, rate limit responses).
   *
   * @returns {string} Cache-Control header value
   * @example
   * CacheControl.noStore()
   * // Returns: 'no-store, no-cache, must-revalidate'
   */
  noStore() {
    return 'no-store, no-cache, must-revalidate';
  },

  /**
   * Creates a stale-while-revalidate cache directive.
   * Allows serving stale content while revalidating in the background.
   * Useful for script caching with background refresh.
   *
   * @param {number} ttl - Time-to-live (fresh period) in seconds
   * @param {number} [staleTtl=604800] - Stale period in seconds (default: 7 days)
   * @returns {string} Cache-Control header value
   * @example
   * CacheControl.staleWhileRevalidate(3600, 86400)
   * // Returns: 'public, max-age=3600, stale-while-revalidate=86400'
   */
  staleWhileRevalidate(ttl, staleTtl = 604800) {
    return `public, max-age=${ttl}, stale-while-revalidate=${staleTtl}`;
  },

  /**
   * Creates a cache directive for rate-limited responses.
   * Caches the response for the duration of the rate limit window.
   *
   * @param {number} windowMs - Rate limit window in milliseconds
   * @returns {string} Cache-Control header value
   * @example
   * CacheControl.rateLimit(60000)
   * // Returns: 'max-age=60'
   */
  rateLimit(windowMs) {
    return `max-age=${Math.ceil(windowMs / 1000)}`;
  }
};
