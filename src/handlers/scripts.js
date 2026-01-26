// ============================================================
// SCRIPT HANDLER - HANDLE SCRIPT PROXY
// ============================================================
// RESPONSIBILITY:
// - handleScriptProxy(request) → Promise<Response>
// - Buscar script em SCRIPT_MAP (mapping.js)
// - Verificar se é UUID path (/cdn/{uuid}.js)
// - Chamar proxyRequest com allowCache=true
// - Injetar transport_url em scripts Google (se habilitado)
// - Retornar 404 se script não encontrado

// FUNCTIONS:
// - handleScriptProxy(request) → Promise<Response>
// - isUUIDPath(path) → boolean (helper)

import { proxyRequest } from '../proxy/index.js';
import { getScriptTarget } from '../routing/mapping.js';
import { errorResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { Logger } from '../core/logger.js';
import { CONFIG } from '../config/index.js';
import { generateEndpointUUID } from '../core/uuid.js';
import { injectTransportUrl, shouldInjectTransportUrl } from '../proxy/script-injector.js';

/**
 * Handle script proxy requests
 * Supports both obfuscated UUID-based paths and legacy paths
 * Handles dynamic query strings for GTM/GTag scripts
 * Automatically injects transport_url for Google scripts (if enabled)
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
    // Note: getScriptTarget is now async due to UUID rotation support
    const targetUrl = await getScriptTarget(url.pathname, url.search);

    if (!targetUrl) {
      return errorResponse('Not found', HTTP_STATUS.NOT_FOUND);
    }

    // Proxy the script with caching enabled
    const response = await proxyRequest(targetUrl, request, {
      preserveHeaders: false,
      allowCache: true,
      rateLimit
    });

    // ============= AUTOMATIC TRANSPORT_URL INJECTION =============
    // Check if we should inject transport_url into this script
    // Only inject if:
    // 1. AUTO_INJECT_TRANSPORT_URL is enabled (default: true)
    // 2. GTM_SERVER_URL is configured (required for first-party tracking)
    // 3. Script is from Google (gtag.js, gtm.js, analytics.js)
    const shouldInject =
      CONFIG.AUTO_INJECT_TRANSPORT_URL &&
      CONFIG.GTM_SERVER_URL &&
      shouldInjectTransportUrl(targetUrl);

    if (shouldInject) {
      try {
        // Read script content
        const scriptContent = await response.text();

        // Generate transport_url with current UUID (supports rotation)
        const googleUUID = await generateEndpointUUID('google');
        const origin = new URL(request.url).origin;
        const transportUrl = `${origin}/cdn/g/${googleUUID}`;

        // Inject transport_url into script
        const modifiedScript = injectTransportUrl(scriptContent, transportUrl);

        Logger.info('Transport_url injected', {
          targetUrl,
          transportUrl,
          originalSize: scriptContent.length,
          modifiedSize: modifiedScript.length
        });

        // Return modified script with updated headers
        return new Response(modifiedScript, {
          status: response.status,
          statusText: response.statusText,
          headers: {
            ...Object.fromEntries(response.headers.entries()),
            'Content-Type': 'application/javascript; charset=utf-8',
            'Content-Length': modifiedScript.length.toString(),
            // Keep Cache-Control from original response (allows caching)
          }
        });

      } catch (injectionError) {
        // If injection fails, return original response (graceful degradation)
        Logger.warn('Transport_url injection failed, returning original script', {
          error: injectionError.message,
          targetUrl
        });
        return response;
      }
    }

    // Return original response (no injection needed)
    return response;

  } catch (error) {
    Logger.error('Script proxy failed', {
      path: url.pathname,
      error: error.message
    });
    return errorResponse('Internal server error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
