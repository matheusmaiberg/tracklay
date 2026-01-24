// ============================================================
// ENDPOINT HANDLER - HANDLE ENDPOINT PROXY
// ============================================================
// RESPONSABILIDADE:
// - handleEndpointProxy(request) → Promise<Response>
// - Buscar endpoint em ENDPOINT_MAP (mapping.js)
// - Chamar proxyRequest com allowCache=false, preserveHeaders=true
// - Retornar 404 se endpoint não encontrado
// - NUNCA cachear (/g/collect, /tr, /j/collect)

// FUNÇÕES:
// - handleEndpointProxy(request) → Promise<Response>

import { proxyRequest } from '../proxy/index.js';
import { getEndpointMap } from '../routing/mapping.js';
import { errorResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';

/**
 * Handle endpoint proxy requests
 * @param {Request} request - Incoming request
 * @returns {Promise<Response>} Proxied response
 */
export async function handleEndpointProxy(request) {
  const url = new URL(request.url);

  // Get dynamic endpoint map (includes GTM endpoints if GTM_SERVER_URL is configured)
  const endpointMap = getEndpointMap();
  const targetUrl = endpointMap[url.pathname];

  if (!targetUrl) {
    return errorResponse('Not found', HTTP_STATUS.NOT_FOUND);
  }

  // NUNCA cachear endpoints de tracking
  return await proxyRequest(targetUrl + url.search, request, {
    preserveHeaders: true,
    allowCache: false
  });
}
