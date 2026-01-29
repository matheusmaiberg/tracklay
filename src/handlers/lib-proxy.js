/**
 * @fileoverview Lib Proxy Handler - Handle third-party script proxying
 * @module handlers/lib-proxy
 */

import { proxyRequest } from '../proxy/index.js';
import { errorResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { Logger } from '../core/logger.js';

const LIB_MAP = {
  'fbevents': 'https://connect.facebook.net/en_US/fbevents.js',
  'fb-convert': 'https://www.facebook.com/tr',
  'clarity': 'https://www.clarity.ms/tag/{tagId}',
  'clarity-collect': 'https://z.clarity.ms/collect',
  'googleads': 'https://googleadservices.com/pagead/conversion_async.js',
  'google-ads-conversion': 'https://www.googleadservices.com/pagead/conversion',
  'ga4': 'https://www.googletagmanager.com/gtag/js',
  'ga-collect': 'https://www.google-analytics.com/collect',
  'quantcast': 'https://tag.tiqcdn.com/utag/main/prod/utag.js',
  'segment': 'https://cdn.segment.com/analytics.js',
};

/**
 * @param {Request} request - Incoming request
 * @returns {Promise<Response>} Proxied library or 404
 */
export async function handleLibProxy(request) {
  const url = new URL(request.url);
  const pathParts = url.pathname.split('/').filter(Boolean);

  Logger.info(`[LibProxy] Request received: ${request.method} ${request.url}`);

  if (pathParts[0] !== 'lib' || pathParts.length < 2) {
    Logger.warn(`[LibProxy] Invalid path: ${url.pathname}`);
    return errorResponse('Invalid library path', HTTP_STATUS.BAD_REQUEST);
  }

  const libName = pathParts[1];
  let targetUrl = LIB_MAP[libName];

  if (!targetUrl) {
    Logger.warn(`[LibProxy] Unknown library: ${libName}`);
    return errorResponse(`Library not found: ${libName}`, HTTP_STATUS.NOT_FOUND);
  }

  const { searchParams } = url;
  if (libName === 'clarity' && searchParams.has('tag')) {
    const tagId = searchParams.get('tag');
    targetUrl = targetUrl.replace('{tagId}', tagId);
  }

  try {
    Logger.info(`[LibProxy] Proxying ${libName}: ${request.method} ${url.pathname} → ${targetUrl}`);

    const response = await proxyRequest(targetUrl, request, {
      preserveHeaders: false,
      allowCache: true,
      cacheTTL: 604800
    });

    Logger.info(`[LibProxy] ✓ Response: ${response.status} (${libName})`);

    const headers = new Headers(response.headers);
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('Cache-Control', 'public, max-age=604800');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  } catch (error) {
    Logger.error(`[LibProxy] ✗ Failed to proxy ${libName}: ${error.message}`);
    return errorResponse(`Failed to fetch library: ${error.message}`, HTTP_STATUS.BAD_GATEWAY);
  }
}
