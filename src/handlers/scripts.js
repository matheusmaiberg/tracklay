// ============================================================
// SCRIPT HANDLER - HANDLE SCRIPT PROXY
// ============================================================
// RESPONSABILIDADE:
// - handleScriptProxy(request) → Promise<Response>
// - Buscar script em SCRIPT_MAP (mapping.js)
// - Verificar se é UUID path (/cdn/{uuid}.js)
// - Chamar proxyRequest com allowCache=true
// - Retornar 404 se script não encontrado

// FUNÇÕES:
// - handleScriptProxy(request) → Promise<Response>
// - isUUIDPath(path) → boolean (helper)

import { proxyRequest } from '../proxy/index.js';
import { getScriptTarget } from '../routing/mapping.js';
import { errorResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';

/**
 * Handle script proxy requests
 * Supports both obfuscated UUID-based paths and legacy paths
 * Handles dynamic query strings for GTM/GTag scripts
 *
 * @param {Request} request - Incoming request
 * @param {Object} rateLimit - Rate limit info from worker
 * @returns {Promise<Response>} Proxied script or 404
 */
export async function handleScriptProxy(request, rateLimit = null) {
  const url = request._parsedUrl || new URL(request.url);

  try {
    // Get target URL using the script mapping helper
    // This automatically handles query strings for GTM/GTag scripts
    const targetUrl = getScriptTarget(url.pathname, url.search);

    if (!targetUrl) {
      return errorResponse('Not found', HTTP_STATUS.NOT_FOUND);
    }

    // Proxy the script with caching enabled
    return await proxyRequest(targetUrl, request, {
      preserveHeaders: false,
      allowCache: true,
      rateLimit
    });

  } catch (error) {
    return errorResponse('Internal server error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
