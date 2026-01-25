// ============================================================
// PROXY - FUNÇÃO PRINCIPAL DE PROXY
// ============================================================
// RESPONSABILIDADE:
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

// FUNÇÕES:
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

export async function proxyRequest(targetUrl, request, options = {}) {
  const { preserveHeaders = false, allowCache = false } = options;

  try {
    // Obter cache key
    const cacheKey = getCacheKey(targetUrl);

    // Verificar cache se permitido
    const targetUrlObj = new URL(targetUrl);
    if (allowCache && shouldCache(targetUrlObj, request)) {
      const cached = await CacheManager.get(cacheKey);
      if (cached) {
        Logger.debug('Cache hit', { url: targetUrl });

        // Build response com headers CORS/security
        const response = buildResponse(cached, request, {
          cacheStatus: 'HIT'
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
      cacheStatus: 'MISS'
    });

    // Adicionar Cache-Control header
    const cacheTTL = getCacheTTL(targetUrlObj, request);
    if (allowCache && shouldCache(targetUrlObj, request)) {
      modifiedResponse.headers.set('Cache-Control', `public, max-age=${cacheTTL}`);
    } else {
      modifiedResponse.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    }

    // Salvar em cache se permitido
    if (allowCache && shouldCache(targetUrlObj, request)) {
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
