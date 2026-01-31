/**
 * @fileoverview Script Handler - Handle script proxy
 * @module handlers/scripts
 */

import { getScriptTarget } from '../routing/mapping.js';
import { handleGenericProxy } from './base-proxy.js';

/**
 * @param {Request} request - Incoming request
 * @param {Object} rateLimit - Rate limit info from worker
 * @returns {Promise<Response>} Proxied script or 404
 */
export async function handleScriptProxy(request, rateLimit = null) {
  const url = request._parsedUrl ?? new URL(request.url);

  // Check for force refresh parameter (_refresh=1)
  const forceRefresh = url.searchParams.get('_refresh') === '1';

  return handleGenericProxy(request, {
    resolver: (pathname) => getScriptTarget(pathname, url.search),
    proxyOptions: {
      preserveHeaders: false,
      allowCache: true,
      forceRefresh
    },
    rateLimit,
    handlerName: 'Script proxy'
  });
}
