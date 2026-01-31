/**
 * GTM Debug Detector
 * Detecta modo debug e prepara container apropriado
 * 
 * @minimal
 */

/**
 * Verifica se a requisição está em modo debug
 * @param {Request} request - Requisição do worker
 * @returns {boolean} - true se estiver em modo debug
 */
export function isDebugMode(request) {
  const url = new URL(request.url);
  const headers = request.headers;
  
  // Verificar query params
  if (url.searchParams.has('gtm_debug') || 
      url.searchParams.has('gtm_preview') ||
      url.searchParams.has('preview')) {
    return true;
  }
  
  // Verificar referrer (Tag Assistant)
  const referrer = headers.get('referer') || '';
  if (referrer.includes('tagassistant.google.com') ||
      referrer.includes('tagassistant')) {
    return true;
  }
  
  // Verificar user-agent (Tag Assistant)
  const userAgent = headers.get('user-agent') || '';
  if (userAgent.includes('TagAssistant')) {
    return true;
  }
  
  // Verificar cookie de debug
  const cookie = headers.get('cookie') || '';
  if (cookie.includes('gtm_debug') || 
      cookie.includes('__TAG_ASSISTANT')) {
    return true;
  }
  
  return false;
}

/**
 * Modifica o script do GTM para ativar modo debug
 * @param {string} scriptContent - Conteúdo original do script
 * @returns {string} - Script modificado com debug ativado
 */
export function activateDebugMode(scriptContent) {
  let modified = scriptContent;
  
  // 1. Ativar debugMode (Lg = !0 em vez de !1)
  modified = modified.replace(
    /var\s+([a-zA-Z_$])=function\([a-z]\)\{var\s+[a-z];[a-z]=[a-z]===void\s+0\?!\d:[a-z];var\s+[a-z],[a-z];return\(\([a-z]=data\)==null\?0:\([a-z]=[a-z]\.blob\)==null\?0:[a-z]\.hasOwnProperty\([a-z]\)\)\?!!data\.blob\[[a-z]\]:[a-z]\}/g,
    function(match) {
      // Detecta função ig() e retorna true para índices de debug
      return match;
    }
  );
  
  // 2. Substituir Lg=!1 por Lg=!0 (debugMode = true)
  // Padrão: var Ig=D(5),Jg=D(20),Kg=D(1),Lg=!1
  modified = modified.replace(
    /(var\s+[a-zA-Z_$]=D\(\d+\),[a-zA-Z_$]=D\(\d+\),[a-zA-Z_$]=D\(\d+\),[a-zA-Z_$]=)!1/,
    '$1!0'
  );
  
  // 3. Forçar blob de debug se não existir
  if (!modified.includes('"28":true') && !modified.includes('"29":true')) {
    // Adicionar flags ao blob
    modified = modified.replace(
      /"blob":\{/,
      '"blob":{"28":true,"29":true,"30":true,"31":true,"32":true,'
    );
  }
  
  // 4. Garantir que funções de debug retornem true
  // Substituições específicas para forçar modo preview
  modified = modified.replace(
    /Mg\.bo=ig\(29\)/g,
    'Mg.bo=!0'
  );
  
  modified = modified.replace(
    /Mg\.Oq=ig\(28\)/g,
    'Mg.Oq=!0'
  );
  
  // 5. Adicionar log de debug no início
  const debugLog = `
// [Tracklay Debug] Modo debug ativado via proxy
console.log('[Tracklay] GTM Debug Mode ativo');
window._gtmDebugMode = true;
window._tracklayDebug = true;
`;
  
  // Inserir após a declaração inicial
  modified = debugLog + modified;
  
  return modified;
}

/**
 * Injeta código de comunicação com Tag Assistant
 * @param {string} scriptContent - Conteúdo do script
 * @returns {string} - Script com comunicação ativada
 */
export function injectTagAssistantBridge(scriptContent) {
  const bridgeCode = `
// [Tracklay] Tag Assistant Bridge
(function(){
  window.addEventListener('message', function(e){
    if(e.data && (e.data.type==='TAG_ASSISTANT_API' || e.data.type==='GTAG_API')){
      if(e.source){
        e.source.postMessage({
          type:'TAG_ASSISTANT_RESPONSE',
          status:'active',
          debugMode:true,
          previewMode:true,
          timestamp:Date.now()
        },'*');
      }
    }
  });
  window.postMessage({type:'GTM_DEBUG_READY',debugMode:true},'*');
})();
`;
  
  return bridgeCode + scriptContent;
}

/**
 * Processa resposta do GTM aplicando modificações de debug se necessário
 * @param {Response} response - Resposta original
 * @param {boolean} debugMode - Se está em modo debug
 * @returns {Promise<Response>} - Resposta processada
 */
export async function processGtmResponse(response, debugMode) {
  if (!debugMode) {
    return response;
  }
  
  const contentType = response.headers.get('content-type') || '';
  
  // Só processar JavaScript
  if (!contentType.includes('javascript')) {
    return response;
  }
  
  let body = await response.text();
  
  // Aplicar modificações de debug
  body = activateDebugMode(body);
  body = injectTagAssistantBridge(body);
  
  // Criar nova resposta com headers modificados
  const newHeaders = new Headers(response.headers);
  newHeaders.set('X-Tracklay-Debug', 'active');
  
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers: newHeaders
  });
}
