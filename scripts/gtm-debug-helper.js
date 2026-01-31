/**
 * GTM Debug Helper para Tracklay
 * Corrige problemas de debug mode e scroll tracking quando GTM é proxyado
 * 
 * @version 1.0.0
 * @author Tracklay
 */

(function() {
  'use strict';
  
  const CONFIG = {
    debug: false,
    forceDebugMode: true,
    fixScroll: true,
    cleanupSwIframe: true
  };
  
  const log = function(...args) {
    if (CONFIG.debug) {
      console.log('[GTM Helper]', ...args);
    }
  };
  
  /**
   * ============================================
   * FIX 1: Forçar Modo Debug quando necessário
   * ============================================
   */
  function forceDebugMode() {
    if (!CONFIG.forceDebugMode) return;
    
    // Detectar se está em modo preview/debug
    var isPreview = window.location.search.includes('gtm_preview') || 
                    window.location.search.includes('gtm_debug') ||
                    window.location.hostname === 'tagassistant.google.com' ||
                    document.referrer.includes('tagassistant.google.com');
    
    // Também verificar se o Tag Assistant está aberto
    var isTagAssistant = !!document.querySelector('script[src*="tagassistant"]') ||
                         window.name.includes('tag_assistant');
    
    if (isPreview || isTagAssistant) {
      log('Modo preview detectado, configurando flags...');
      
      // Configurar antes do GTM carregar
      window.google_tag_data = window.google_tag_data || {};
      window.google_tag_data.blob = window.google_tag_data.blob || {};
      
      // Flags importantes para modo debug
      window.google_tag_data.blob[28] = true;  // environmentMode
      window.google_tag_data.blob[29] = true;  // previewMode
      window.google_tag_data.blob[32] = true;  // debug features
      
      // Sinalizador customizado
      window._gtmDebugMode = true;
      
      log('Flags de debug configuradas:', window.google_tag_data.blob);
    }
  }
  
  /**
   * ============================================
   * FIX 2: Corrigir Problema de Scroll
   * ============================================
   */
  function fixScrollCalculation() {
    if (!CONFIG.fixScroll) return;
    
    log('Aplicando correção de scroll...');
    
    // CSS para garantir que iframes não afetem layout
    var style = document.createElement('style');
    style.id = 'gtm-helper-scroll-fix';
    style.textContent = `
      /* Fix para iframes do GTM não afetarem cálculo de scroll */
      iframe[src*="sw_iframe"],
      iframe[src="about:blank"] {
        position: absolute !important;
        top: -9999px !important;
        left: -9999px !important;
        width: 0 !important;
        height: 0 !important;
        border: none !important;
        margin: 0 !important;
        padding: 0 !important;
        visibility: hidden !important;
        pointer-events: none !important;
        overflow: hidden !important;
        display: block !important;
      }
      
      /* Garantir que body tenha scroll normal */
      body {
        overflow-x: hidden;
      }
    `;
    
    // Inserir no início do head para ter prioridade
    if (document.head) {
      document.head.insertBefore(style, document.head.firstChild);
    } else {
      // Aguardar head estar disponível
      document.addEventListener('DOMContentLoaded', function() {
        document.head.insertBefore(style, document.head.firstChild);
      });
    }
    
    log('CSS de correção aplicado');
  }
  
  /**
   * ============================================
   * FIX 3: Monitorar e Ajustar sw_iframe
   * ============================================
   */
  function monitorSwIframe() {
    if (!CONFIG.cleanupSwIframe) return;
    
    var processedIframes = new WeakSet();
    
    function processIframe(iframe) {
      if (processedIframes.has(iframe)) return;
      processedIframes.add(iframe);
      
      var src = iframe.src || iframe.getAttribute('src') || '';
      
      // Verificar se é o iframe do Service Worker
      if (src.includes('sw_iframe') || src.includes('service_worker')) {
        log('sw_iframe detectado, aplicando correções...');
        
        // Aplicar estilos de isolamento
        iframe.style.cssText = 'position:absolute!important;top:-9999px!important;left:-9999px!important;width:0!important;height:0!important;border:none!important;margin:0!important;padding:0!important;visibility:hidden!important;pointer-events:none!important;overflow:hidden!important;display:block!important;';
        
        // Remover do fluxo do documento se estiver causando problemas
        if (iframe.parentElement) {
          iframe.parentElement.style.cssText += ';position:static!important;';
        }
        
        // Se o parâmetro remove_sw estiver presente, remover completamente
        if (window.location.search.includes('remove_sw=true')) {
          setTimeout(function() {
            iframe.remove();
            log('sw_iframe removido por parâmetro remove_sw');
          }, 100);
        }
      }
    }
    
    // Processar iframes existentes
    document.querySelectorAll('iframe').forEach(processIframe);
    
    // Observar novos iframes
    if (window.MutationObserver) {
      var observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
          mutation.addedNodes.forEach(function(node) {
            if (node.tagName === 'IFRAME') {
              processIframe(node);
            }
          });
        });
      });
      
      if (document.body) {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
        
        // Parar observação após 30 segundos
        setTimeout(function() {
          observer.disconnect();
          log('Monitoramento de iframes finalizado');
        }, 30000);
      }
    }
  }
  
  /**
   * ============================================
   * FIX 4: Correção de Scroll Customizado (se necessário)
   * ============================================
   */
  function initCustomScrollTracking() {
    // Verificar se o scroll nativo está funcionando corretamente
    // Se não estiver, implementar tracking customizado
    
    var lastScrollPercent = 0;
    var thresholds = [25, 50, 75, 90, 100];
    var triggered = {};
    
    // Listener de scroll otimizado
    var scrollHandler = function() {
      // Usar requestAnimationFrame para performance
      window.requestAnimationFrame(function() {
        var scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
        var winHeight = window.innerHeight;
        var docHeight = Math.max(
          document.body.scrollHeight,
          document.body.offsetHeight,
          document.documentElement.clientHeight,
          document.documentElement.scrollHeight,
          document.documentElement.offsetHeight
        );
        
        // Evitar divisão por zero
        if (docHeight <= winHeight) return;
        
        var scrollPercent = Math.round((scrollTop / (docHeight - winHeight)) * 100);
        
        if (scrollPercent !== lastScrollPercent) {
          lastScrollPercent = scrollPercent;
          
          // Disparar eventos para thresholds
          thresholds.forEach(function(threshold) {
            if (scrollPercent >= threshold && !triggered[threshold]) {
              triggered[threshold] = true;
              
              // Enviar para dataLayer
              window.dataLayer = window.dataLayer || [];
              window.dataLayer.push({
                'event': 'gtm.scrollDepth',
                'scrollDepthThreshold': threshold,
                'scrollDepthUnits': 'percent',
                'scrollDepthDirection': 'vertical',
                'scrollActualPercent': scrollPercent
              });
              
              log('Scroll depth triggered:', threshold + '%');
            }
          });
        }
      });
    };
    
    // Usar throttle para não sobrecarregar
    var ticking = false;
    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(function() {
          scrollHandler();
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
    
    log('Custom scroll tracking inicializado');
  }
  
  /**
   * ============================================
   * Inicialização
   * ============================================
   */
  function init() {
    log('Inicializando GTM Debug Helper...');
    
    forceDebugMode();
    fixScrollCalculation();
    
    // Aguardar DOM para monitorar iframes
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', function() {
        monitorSwIframe();
        // initCustomScrollTracking(); // Descomente se necessário
      });
    } else {
      monitorSwIframe();
      // initCustomScrollTracking(); // Descomente se necessário
    }
    
    log('Inicialização completa');
  }
  
  // Executar imediatamente
  init();
  
  // API pública
  window.gtmDebugHelper = {
    config: CONFIG,
    log: log,
    forceDebug: forceDebugMode,
    fixScroll: fixScrollCalculation,
    cleanupSw: monitorSwIframe
  };
  
})();
