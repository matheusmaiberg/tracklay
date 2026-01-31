/**
 * @fileoverview Endpoint Handler - Handle endpoint proxy
 * @module handlers/endpoints
 */

import { getEndpointMap } from '../routing/mapping.js';
import { handleGenericProxy } from './base-proxy.js';

/**
 * @param {Request} request - Incoming request
 * @param {Object} rateLimit - Rate limit info from worker
 * @returns {Promise<Response>} Proxied response
 */
export async function handleEndpointProxy(request, rateLimit = null) {
  const endpointMap = await getEndpointMap();
  
  return handleGenericProxy(request, {
    resolver: (pathname) => {
      const targetUrl = endpointMap[pathname];
      return targetUrl ? `${targetUrl}` : null;
    },
    proxyOptions: {
      preserveHeaders: true,
      allowCache: false
    },
    rateLimit,
    handlerName: 'Endpoint proxy'
  });
}
