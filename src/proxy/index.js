// ============================================================
// PROXY - FUNÇÃO PRINCIPAL DE PROXY
// ============================================================
// RESPONSIBILITY:
// - proxyRequest(targetUrl, request, options) → Promise<Response>
// - options: { preserveHeaders, allowCache }
// - Verificar cache (se allowCache=true)
// - Clonar request antes de usar body
// - Fazer fetch com timeout
// - Error handling completo (try/catch)
// - Adicionar CORS headers
// - Adicionar security headers
// - Salvar em cache (se allowCache=true e .js)
// - Retornar response modificada

// FUNCTIONS:
// - proxyRequest(targetUrl, request, options) → Promise<Response>

import { Logger } from '../core/logger.js';
import { fetchWithTimeout } from '../core/fetch.js';
import { CacheManager } from '../core/cache.js';
import { buildProxyHeaders } from '../headers/proxy.js';
import { buildResponse } from './response-builder.js';
import { shouldCache, getCacheKey, getCacheTTL } from './cache-strategy.js';
import { CONFIG } from '../config/index.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { errorResponse } from '../utils/response.js';
import { getScriptFromCache, identifyScriptKey } from '../cache/script-cache.js';

export async function proxyRequest(targetUrl, request, options = {}) {
  const { preserveHeaders = false, allowCache = false, rateLimit = null } = options;

  try {
    // OTIMIZAÇÃO: Verificar script cache inteligente primeiro
    // Economiza ~300ms por não fazer fetch para scripts conhecidos
    const scriptKey = identifyScriptKey(targetUrl);
    if (scriptKey) {
      const cachedScript = await getScriptFromCache(scriptKey);
      if (cachedScript) {
        Logger.debug('Script cache hit (intelligent cache)', {
          scriptKey,
          url: targetUrl
        });

        // Build response com headers CORS/security
        const response = buildResponse(cachedScript, request, {
          cacheStatus: 'HIT-SCRIPT',
          rateLimit
        });

        return response;
      }
    }

    // Obter cache key
    const cacheKey = getCacheKey(targetUrl);

    // Verificar cache se permitido
    // OTIMIZAÇÃO: calcular shouldCache uma vez e reusar
    const targetUrlObj = new URL(targetUrl);
    const canCache = allowCache && shouldCache(targetUrlObj, request);

    if (canCache) {
      const cached = await CacheManager.get(cacheKey);
      if (cached) {
        Logger.debug('Cache hit', { url: targetUrl });

        // Build response com headers CORS/security
        const response = buildResponse(cached, request, {
          cacheStatus: 'HIT',
          rateLimit
        });

        return response;
      }
    }

    // Clonar request ANTES de usar body
    const requestClone = request.clone();

    // Build headers
    const headers = buildProxyHeaders(request, preserveHeaders);

    // Fetch com timeout
    let response;
    try {
      response = await fetchWithTimeout(targetUrl, {
        method: request.method,
        headers: headers,
        body: request.method !== 'GET' && request.method !== 'HEAD'
          ? requestClone.body
          : undefined,
        redirect: 'follow'
      });
    } catch (fetchError) {
      Logger.error('Fetch failed', {
        error: fetchError.message,
        url: targetUrl
      });

      return errorResponse('Bad Gateway', HTTP_STATUS.BAD_GATEWAY);
    }

    // Verificar se resposta é válida
    if (!response.ok) {
      Logger.warn('Upstream error', {
        status: response.status,
        url: targetUrl
      });
    }

    // Build response com CORS/security headers
    const modifiedResponse = buildResponse(response, request, {
      cacheStatus: 'MISS',
      rateLimit
    });

    // Adicionar Cache-Control header
    const cacheTTL = getCacheTTL(targetUrlObj, request);
    if (canCache) {
      modifiedResponse.headers.set('Cache-Control', `public, max-age=${cacheTTL}`);
    } else {
      modifiedResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    }

    // Salvar em cache se permitido
    if (canCache) {
      try {
        const responseToCache = modifiedResponse.clone();
        await CacheManager.put(cacheKey, responseToCache, cacheTTL);
        Logger.debug('Cached response', { url: targetUrl });
      } catch (cacheError) {
        Logger.warn('Cache put failed', { error: cacheError.message });
      }
    }

    return modifiedResponse;

  } catch (error) {
    Logger.error('Proxy request failed', {
      error: error.message,
      stack: error.stack,
      url: targetUrl
    });

    return errorResponse('Internal Server Error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
