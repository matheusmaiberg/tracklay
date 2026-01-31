/**
 * @fileoverview URL utilities for Tracklay
 * @module utils/url
 */

/**
 * Normalizes a URL for indexing purposes.
 * Extracts protocol, hostname, and pathname, removing query strings and hashes.
 * Falls back to string manipulation if URL parsing fails.
 *
 * @param {string} url - Original URL to normalize
 * @returns {string} Normalized URL (protocol + hostname + pathname) or empty string if input is falsy
 * @example
 * normalizeUrl('https://example.com/path?query=1#hash')
 * // Returns: 'https://example.com/path'
 */
export function normalizeUrl(url) {
  if (!url) return '';

  try {
    const { protocol, hostname, pathname } = new URL(url);
    return `${protocol}//${hostname}${pathname}`;
  } catch {
    return url.split('?')[0].split('#')[0];
  }
}

/**
 * Extracts UUID from a pathname following the /x/{uuid} pattern.
 * Validates UUID format (hexadecimal, 12-64 characters).
 *
 * @param {string} pathname - Request pathname (e.g., '/x/abc123/path')
 * @returns {{uuid: string, remainingPath: string}|null} Object containing UUID and remaining path,
 *                                                      or null if invalid
 * @example
 * extractUuidFromPath('/x/abc123def456/track')
 * // Returns: { uuid: 'abc123def456', remainingPath: '/track' }
 *
 * extractUuidFromPath('/x/abc123def456')
 * // Returns: { uuid: 'abc123def456', remainingPath: '' }
 *
 * extractUuidFromPath('/invalid/path')
 * // Returns: null
 */
/**
 * Safely parses a URL string with error handling.
 * Returns fallback value if URL is invalid, empty, or not a string.
 *
 * @param {string} urlString - URL string to parse
 * @param {*} [fallback=null] - Value to return if parsing fails
 * @returns {URL|null} Parsed URL object or fallback value
 * @example
 * safeParseURL('https://example.com/path')
 * // Returns: URL object
 *
 * safeParseURL('invalid-url')
 * // Returns: null
 *
 * safeParseURL(null, '/default')
 * // Returns: '/default'
 */
export function safeParseURL(urlString, fallback = null) {
  if (!urlString || typeof urlString !== 'string') {
    return fallback;
  }
  try {
    return new URL(urlString);
  } catch {
    return fallback;
  }
}

export function extractUuidFromPath(pathname) {
  if (!pathname?.startsWith('/x/')) {
    return null;
  }

  // Remove '/x/' prefix
  const afterPrefix = pathname.substring(3);

  // Split by '/' to get UUID (first segment) and remaining path
  const slashIndex = afterPrefix.indexOf('/');
  const uuid = slashIndex === -1 ? afterPrefix : afterPrefix.substring(0, slashIndex);
  const remainingPath = slashIndex === -1 ? '' : afterPrefix.substring(slashIndex);

  if (!uuid || uuid.length < 12 || uuid.length > 64) {
    return null;
  }

  if (!/^[a-f0-9]+$/.test(uuid.toLowerCase())) {
    return null;
  }

  return { uuid, remainingPath };
}
