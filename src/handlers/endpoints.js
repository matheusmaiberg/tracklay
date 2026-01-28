// ============================================================
// ENDPOINT HANDLER - HANDLE ENDPOINT PROXY
// ============================================================
// RESPONSIBILITY:
// - handleEndpointProxy(request) → Promise<Response>
// - Buscar endpoint em ENDPOINT_MAP (mapping.js)
// - Chamar proxyRequest com allowCache=false, preserveHeaders=true
// - Retornar 404 se endpoint não encontrado
// - NUNCA cachear (/g/collect, /tr, /j/collect)

// FUNCTIONS:
// - handleEndpointProxy(request) → Promise<Response>

import { proxyRequest } from '../proxy/index.js';
import { getEndpointMap } from '../routing/mapping.js';
import { errorResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';

/**
 * Handle endpoint proxy requests
 * Supports both obfuscated UUID-based endpoints and legacy endpoints
 * Handles tracking pixels and analytics collection endpoints
 *
 * @param {Request} request - Incoming request
 * @param {Object} rateLimit - Rate limit info from worker
 * @returns {Promise<Response>} Proxied response
 */
export async function handleEndpointProxy(request, rateLimit = null) {
  const { _parsedUrl, url: requestUrl } = request;
  const url = _parsedUrl ?? new URL(requestUrl);

  // Get dynamic endpoint map (includes both obfuscated and legacy endpoints)
  // GTM endpoints are only included if GTM_SERVER_URL is configured
  // NOTE: getEndpointMap() is async due to UUID rotation support
  const endpointMap = await getEndpointMap();
  const targetUrl = endpointMap[url.pathname];

  if (!targetUrl) {
    return errorResponse('Not found', HTTP_STATUS.NOT_FOUND);
  }

  // NEVER cache tracking endpoints
  // Preserve headers for accurate tracking data
  return await proxyRequest(`${targetUrl}${url.search}`, request, {
    preserveHeaders: true,
    allowCache: false,
    rateLimit
  });
}
