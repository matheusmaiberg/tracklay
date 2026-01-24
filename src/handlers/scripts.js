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

import { generateSecureUUID } from '../core/uuid.js';
import { proxyRequest } from '../proxy/index.js';
import { SCRIPT_MAP } from '../routing/mapping.js';
import { errorResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { CONFIG } from '../config/index.js';

/**
 * Handle script proxy requests
 * Supports UUID-based paths for anti-detection
 *
 * @param {Request} request - Incoming request
 * @returns {Promise<Response>} Proxied script or 404
 */
export async function handleScriptProxy(request) {
  const url = new URL(request.url);
  const uuid = await generateSecureUUID();

  try {
    // Check if path is UUID path (cdn/${uuid}.js, assets/${uuid}.js, static/${uuid}.js)
    const uuidPaths = CONFIG.CDN_PATHS.map(path => `${path}${uuid}.js`);

    if (uuidPaths.includes(url.pathname)) {
      // UUID path always maps to Facebook events script
      const targetUrl = SCRIPT_MAP['/cdn/fbevents.js'];
      return await proxyRequest(targetUrl, request, {
        preserveHeaders: false,
        allowCache: true
      });
    }

    // Look up script in SCRIPT_MAP
    const targetUrl = SCRIPT_MAP[url.pathname];

    if (!targetUrl) {
      return errorResponse('Not found', HTTP_STATUS.NOT_FOUND);
    }

    return await proxyRequest(targetUrl, request, {
      preserveHeaders: false,
      allowCache: true
    });

  } catch (error) {
    return errorResponse('Internal server error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
