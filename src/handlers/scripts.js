/**
 * @fileoverview Script Handler - Handle script proxy
 * @module handlers/scripts
 */

import { proxyRequest } from '../proxy/index.js';
import { getScriptTarget } from '../routing/mapping.js';
import { errorResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { Logger } from '../core/logger.js';

/**
 * @param {Request} request - Incoming request
 * @param {Object} rateLimit - Rate limit info from worker
 * @returns {Promise<Response>} Proxied script or 404
 */
export async function handleScriptProxy(request, rateLimit = null) {
  const url = request._parsedUrl ?? new URL(request.url);

  try {
    const targetUrl = await getScriptTarget(url.pathname, url.search);

    if (!targetUrl) {
      return errorResponse('Not found', HTTP_STATUS.NOT_FOUND);
    }

    return await proxyRequest(targetUrl, request, {
      preserveHeaders: false,
      allowCache: true,
      rateLimit
    });
  } catch (error) {
    Logger.error('Script proxy failed', {
      path: url.pathname,
      error: error.message
    });
    return errorResponse('Internal server error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
