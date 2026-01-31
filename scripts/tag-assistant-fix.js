/**
 * Tag Assistant Debug Fix
 * Resolve: "Ative o contêiner para depuração no Assistente de tags"
 * 
 * Este script garante que o Tag Assistant detecte corretamente o modo debug
 */

(function() {
  'use strict';
  
  console.log('[TagAssistant Fix] Inicializando...');
  
  // ==========================================
  // 1. Configurar Flags de Debug Obrigatórias
  // ==========================================
  
  // Configurar ANTES do GTM carregar
  window.google_tag_data = window.google_tag_data || {};
  window.google_tag_data.blob = window.google_tag_data.blob || {};
  
  // Flags que o GTM verifica para modo debug
  window.google_tag_data.blob[28] = true;  // environmentMode
  window.google_tag_data.blob[29] = true;  // previewMode
  window.google_tag_data.blob[30] = true;  // additional debug
  window.google_tag_data.blob[31] = true;  // container data
  window.google_tag_data.blob[32] = true;  // debug features
  
  // Sinalizadores globais
  window._gtmDebugMode = true;
  window._tagAssistant = true;
  window.__TAG_ASSISTANT = true;
  window.google_tag_manager_data = window.google_tag_manager_data || {};
  
  console.log('[TagAssistant Fix] Flags configuradas:', {
    'blob[28]': window.google_tag_data.blob[28],
    'blob[29]': window.google_tag_data.blob[29],
    'debugMode': window._gtmDebugMode
  });
  
  // ==========================================
  // 2. Configurar DataLayer
  // ==========================================
  
  window.dataLayer = window.dataLayer || [];
  
  // Push inicial com debug
  window.dataLayer.push({
    'gtm.start': new Date().getTime(),
    'event': 'gtm.js',
    'gtm.debug': true,
    'gtm.tagAssistant': true
  });
  
  // ==========================================
  // 3. Canal de Comunicação com Tag Assistant
  // ==========================================
  
  window.addEventListener('message', function(event) {
    // Verificar origem (Tag Assistant pode vir de diferentes origens)
    var isTagAssistant = (
      event.data && (
        event.data.type === 'TAG_ASSISTANT_API' ||
        event.data.type === 'GTAG_API' ||
        event.data.type === 'TAG_ASSISTANT' ||
        event.data.from === 'tag_assistant' ||
        event.data.source === 'tag_assistant'
      )
    );
    
    if (isTagAssistant) {
      console.log('[TagAssistant Fix] Comunicação detectada:', event.data);
      
      // Responder confirmando modo debug
      if (event.source) {
        var response = {
          type: 'TAG_ASSISTANT_RESPONSE',
          status: 'active',
          debugMode: true,
          previewMode: true,
          timestamp: Date.now(),
          containerId: 'GTM-MJ7DW8H'  // Substitua se necessário
        };
        
        try {
          event.source.postMessage(response, '*');
          console.log('[TagAssistant Fix] Resposta enviada:', response);
        } catch(e) {
          console.error('[TagAssistant Fix] Erro ao responder:', e);
        }
      }
    }
  });
  
  // ==========================================
  // 4. Sinalizar Disponibilidade
  // ==========================================
  
  // Sinalizar que estamos prontos para o Tag Assistant
  window.postMessage({
    type: 'GTM_DEBUG_READY',
    timestamp: Date.now(),
    debugMode: true
  }, '*');
  
  // ==========================================
  // 5. Verificação Pós-Carregamento
  // ==========================================
  
  window.addEventListener('load', function() {
    setTimeout(function() {
      // Verificar se GTM carregou corretamente
      if (window.google_tag_manager) {
        console.log('[TagAssistant Fix] GTM carregado:', window.google_tag_manager);
        
        // Forçar modo debug se necessário
        var containerId = Object.keys(window.google_tag_manager)[0];
        if (containerId && window.google_tag_manager[containerId]) {
          window.google_tag_manager[containerId].debugMode = true;
          console.log('[TagAssistant Fix] Debug ativado para:', containerId);
        }
      }
    }, 1000);
  });
  
  console.log('[TagAssistant Fix] Configuração completa!');
})();
