// ============================================================
// LIB PROXY HANDLER - HANDLE THIRD-PARTY SCRIPT PROXYING
// ============================================================
// RESPONSIBILITY:
// - handleLibProxy(request) → Promise<Response>
// - Map obfuscated paths (/lib/fbevents) to original URLs
// - Proxy third-party scripts (Facebook, Clarity, Google Ads, etc)
// - Cache responses for 1 week (aggressive caching for static libs)
// - Return 404 if library mapping not found
// - Strip original domain from requests, serve via first-party domain

// FEATURES:
// - Transparent proxy: Intercepts third-party scripts
// - Caching: 1-week TTL for better performance
// - Security: No credential leaking, clean headers
// - Obfuscation: Original URLs hidden, served from cdn.suevich.com

import { proxyRequest } from '../proxy/index.js';
import { errorResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { Logger } from '../core/logger.js';

const logger = Logger.create('LibProxy');

/**
 * Mapping of obfuscated library names to their original URLs
 * Used by browser interceptor to redirect tracking requests
 *
 * Format: 'libname' → 'https://original-domain.com/path'
 */
const LIB_MAP = {
  // Facebook Pixel
  'fbevents': 'https://connect.facebook.net/en_US/fbevents.js',
  'fb-convert': 'https://www.facebook.com/tr',

  // Microsoft Clarity
  'clarity': 'https://www.clarity.ms/tag/{tagId}',
  'clarity-collect': 'https://z.clarity.ms/collect',

  // Google Ads
  'googleads': 'https://googleadservices.com/pagead/conversion_async.js',
  'google-ads-conversion': 'https://www.googleadservices.com/pagead/conversion',

  // Google Analytics
  'ga4': 'https://www.googletagmanager.com/gtag/js',
  'ga-collect': 'https://www.google-analytics.com/collect',

  // Quantcast
  'quantcast': 'https://tag.tiqcdn.com/utag/main/prod/utag.js',

  // Segment
  'segment': 'https://cdn.segment.com/analytics.js',
};

/**
 * Handle library proxy requests
 * Intercepts requests to third-party trackers and serves them from first-party domain
 * This bypasses ad-blocker filters that target specific domains
 *
 * @param {Request} request - Incoming request (e.g., /lib/fbevents or /lib/clarity-collect?param=value)
 * @returns {Promise<Response>} Proxied library or 404
 */
export async function handleLibProxy(request) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean); // ['lib', 'fbevents']

  logger.info(`[LibProxy] Request received: ${request.method} ${request.url}`);

  if (pathParts[0] !== 'lib' || pathParts.length < 2) {
    logger.warn(`[LibProxy] Invalid path: ${url.pathname}`);
    return errorResponse('Invalid library path', HTTP_STATUS.BAD_REQUEST);
  }

  const libName = pathParts[1];
  let targetUrl = LIB_MAP[libName];

  if (!targetUrl) {
    logger.warn(`[LibProxy] Unknown library: ${libName}`);
    return errorResponse(`Library not found: ${libName}`, HTTP_STATUS.NOT_FOUND);
  }

  // Handle dynamic query parameters (e.g., Clarity tag ID)
  const { searchParams } = url;
  if (libName === 'clarity' && searchParams.has('tag')) {
    const tagId = searchParams.get('tag');
    targetUrl = targetUrl.replace('{tagId}', tagId);
  }

  try {
    logger.info(`[LibProxy] Proxying ${libName}: ${request.method} ${url.pathname} → ${targetUrl}`);

    // Proxy the request
    const response = await proxyRequest(targetUrl, request, {
      preserveHeaders: false,
      allowCache: true,
      cacheTTL: 604800 // 1 week for static libs
    });

    logger.info(`[LibProxy] ✓ Response: ${response.status} (${libName})`);

    // Add security headers
    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Cache-Control', 'public, max-age=604800'); // 1 week

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (error) {
    logger.error(`[LibProxy] ✗ Failed to proxy ${libName}: ${error.message}`);
    return errorResponse(`Failed to fetch library: ${error.message}`, HTTP_STATUS.BAD_GATEWAY);
  }
}
