/**
 * @fileoverview Endpoint Handler - Handle endpoint proxy
 * @module handlers/endpoints
 */

import { proxyRequest } from '../proxy/index.js';
import { getEndpointMap } from '../routing/mapping.js';
import { errorResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';

/**
 * @param {Request} request - Incoming request
 * @param {Object} rateLimit - Rate limit info from worker
 * @returns {Promise<Response>} Proxied response
 */
export async function handleEndpointProxy(request, rateLimit = null) {
  const { _parsedUrl, url: requestUrl } = request;
  const url = _parsedUrl ?? new URL(requestUrl);

  const endpointMap = await getEndpointMap();
  const targetUrl = endpointMap[url.pathname];

  if (!targetUrl) {
    return errorResponse('Not found', HTTP_STATUS.NOT_FOUND);
  }

  return await proxyRequest(`${targetUrl}${url.search}`, request, {
    preserveHeaders: true,
    allowCache: false,
    rateLimit
  });
}
