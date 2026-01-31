/**
 * @fileoverview Protocol Detector - Detects tracking protocol type
 * @module services/protocol-detector
 */

import { PATH_PREFIXES, GOOGLE_TRACKING_PARAMS } from '../utils/constants.js';

/**
 * Detects the protocol type based on pathname, search and method
 * @param {string} pathname - Request pathname
 * @param {string} search - Query string (including the leading ?)
 * @param {string} method - HTTP method
 * @returns {{ type: 'facebook'|'google'|'gtm_fallback', isTracking: boolean }} Protocol detection result
 */
export function detectProtocol(pathname, search, method) {
  // Facebook paths
  if (pathname.startsWith(PATH_PREFIXES.FACEBOOK)) {
    const isTracking = method === 'POST';
    return { type: 'facebook', isTracking };
  }

  // Google paths
  if (pathname.startsWith(PATH_PREFIXES.GOOGLE)) {
    const isTracking = GOOGLE_TRACKING_PARAMS.some(param => search.includes(param));
    return { type: 'google', isTracking };
  }

  // GTM fallback path
  if (pathname === PATH_PREFIXES.GTM_FALLBACK) {
    return { type: 'gtm_fallback', isTracking: true };
  }

  // Default: treat as non-tracking
  return { type: null, isTracking: false };
}
