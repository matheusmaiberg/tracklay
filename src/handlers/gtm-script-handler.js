/**
 * Handler para scripts do GTM
 * Detecta modo debug e serve container apropriado
 * 
 * @minimal
 */

import { isDebugMode, processGtmResponse } from '../utils/gtm-debug-detector.js';

/**
 * Manipula requisições para scripts do GTM
 * @param {Request} request - Requisição do worker
 * @param {Object} env - Variáveis de ambiente
 * @returns {Promise<Response>} - Resposta do script
 */
export async function handleGtmScript(request, env) {
  const url = new URL(request.url);
  
  // Extrair ID do container
  const containerId = url.searchParams.get('id');
  if (!containerId) {
    return new Response('Container ID required', { status: 400 });
  }
  
  // Verificar se está em modo debug
  const debugMode = isDebugMode(request);
  
  console.log(`[GTM Handler] Container: ${containerId}, Debug: ${debugMode}`);
  
  // Buscar script do cache ou origem
  const cacheKey = `gtm:${containerId}:${debugMode ? 'debug' : 'prod'}`;
  
  // Tentar buscar do cache
  const cache = caches.default;
  let response = await cache.match(request);
  
  if (!response) {
    // Buscar do servidor de origem (proxy para GTM)
    const gtmUrl = `https://www.googletagmanager.com/gtm.js?id=${containerId}`;
    
    response = await fetch(gtmUrl, {
      headers: {
        'Accept': 'application/javascript',
        'Accept-Encoding': 'gzip, deflate, br'
      }
    });
    
    if (!response.ok) {
      return new Response('Failed to fetch GTM script', { 
        status: response.status 
      });
    }
  }
  
  // Se estiver em modo debug, processar script
  if (debugMode) {
    response = await processGtmResponse(response, true);
  }
  
  // Adicionar headers de cache
  const newHeaders = new Headers(response.headers);
  newHeaders.set('Cache-Control', debugMode 
    ? 'private, no-cache'  // Não cachear em debug
    : 'public, max-age=3600'  // Cachear em produção
  );
  
  if (debugMode) {
    newHeaders.set('X-GTM-Mode', 'debug');
  }
  
  return new Response(response.body, {
    status: response.status,
    headers: newHeaders
  });
}

/**
 * Handler minimal para rotas do GTM
 * @param {Request} request - Requisição
 * @returns {Promise<Response>} - Resposta
 */
export async function handleGtmRoute(request) {
  const url = new URL(request.url);
  
  // Verificar modo debug
  const debug = isDebugMode(request);
  
  // Log para debug
  if (debug) {
    console.log('[GTM Route] Modo debug detectado:', {
      url: url.href,
      referrer: request.headers.get('referer'),
      userAgent: request.headers.get('user-agent')?.substring(0, 50)
    });
  }
  
  // Aqui você integraria com seu proxy existente
  // e aplicaria as modificações de debug se necessário
  
  // Por enquanto, retorna informação
  return new Response(JSON.stringify({
    debug: debug,
    message: debug 
      ? 'Modo debug ativo - container será modificado'
      : 'Modo produção - container normal'
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
}
