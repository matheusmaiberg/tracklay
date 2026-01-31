/**
 * Exemplo Minimal: Worker com Detecção de Debug
 * 
 * Este é um exemplo de como integrar a detecção de debug
 * no seu worker existente do Tracklay
 */

import { isDebugMode, activateDebugMode, injectTagAssistantBridge } from './src/utils/gtm-debug-detector.js';

/**
 * Handler principal do worker
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // ==========================================
    // DETECÇÃO DE DEBUG
    // ==========================================
    
    // Verificar se está em modo debug ANTES de processar
    const debugMode = isDebugMode(request);
    
    if (debugMode) {
      console.log('[Worker] 🔍 Modo DEBUG detectado:', url.href);
    }
    
    // ==========================================
    // ROTEAMENTO
    // ==========================================
    
    // Rota para scripts do GTM
    if (url.pathname.includes('/gtm.js') || 
        url.searchParams.has('id')) {
      
      return await handleGtmScript(request, debugMode);
    }
    
    // Outras rotas do seu worker...
    return await handleDefault(request, env);
  }
};

/**
 * Handler para scripts do GTM
 */
async function handleGtmScript(request, debugMode) {
  const url = new URL(request.url);
  const containerId = url.searchParams.get('id') || 'GTM-XXXXXX';
  
  try {
    // 1. Buscar script do cache ou origem
    let scriptContent = await fetchGtmScript(containerId);
    
    // 2. Se estiver em modo debug, MODIFICAR o script
    if (debugMode) {
      console.log('[GTM] Modificando script para modo debug...');
      
      // Ativar flags de debug
      scriptContent = activateDebugMode(scriptContent);
      
      // Injetar comunicação com Tag Assistant
      scriptContent = injectTagAssistantBridge(scriptContent);
      
      console.log('[GTM] ✓ Script modificado para debug');
    }
    
    // 3. Retornar resposta
    return new Response(scriptContent, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': debugMode 
          ? 'private, no-cache'  // Sem cache em debug
          : 'public, max-age=3600',
        'X-GTM-Mode': debugMode ? 'debug' : 'production',
        ...(debugMode && { 'X-Debug-Active': 'true' })
      }
    });
    
  } catch (error) {
    console.error('[GTM] Erro:', error);
    return new Response('Error loading GTM', { status: 500 });
  }
}

/**
 * Busca script do GTM (cache ou origem)
 */
async function fetchGtmScript(containerId) {
  const cache = caches.default;
  const cacheKey = `gtm:${containerId}`;
  
  // Tentar cache
  let cached = await cache.match(cacheKey);
  if (cached) {
    return await cached.text();
  }
  
  // Buscar do GTM oficial
  const response = await fetch(
    `https://www.googletagmanager.com/gtm.js?id=${containerId}`,
    {
      headers: {
        'Accept': 'application/javascript',
        'Accept-Encoding': 'gzip, deflate'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`GTM fetch failed: ${response.status}`);
  }
  
  const content = await response.text();
  
  // Salvar no cache (apenas produção)
  ctx.waitUntil(cache.put(cacheKey, new Response(content)));
  
  return content;
}

/**
 * Handler padrão para outras rotas
 */
async function handleDefault(request, env) {
  // Seu código existente...
  return new Response('Tracklay Proxy', { status: 200 });
}
