/**
 * GTM Service Worker Iframe Cleaner
 * Remove o sw_iframe.html do GTM para limpar o Tag Assistant
 * 
 * @version 1.0.0
 * @tracklay
 */

(function() {
  'use strict';
  
  const CONFIG = {
    enabled: true,
    debug: false,
    removeInterval: 500,
    maxDuration: 30000 // 30 segundos
  };
  
  const log = function(...args) {
    if (CONFIG.debug) {
      console.log('[GTM-SW-Cleaner]', ...args);
    }
  };
  
  const removeSwIframes = function() {
    if (!CONFIG.enabled) return;
    
    const iframes = document.querySelectorAll('iframe');
    let removed = 0;
    
    iframes.forEach(function(iframe) {
      const src = iframe.getAttribute('src') || '';
      const id = iframe.getAttribute('id') || '';
      
      if (src.includes('sw_iframe.html') || id.includes('sw_iframe')) {
        log('Removendo iframe:', src || id);
        iframe.remove();
        removed++;
        
        // Tenta remover o container pai about:blank
        try {
          const parent = iframe.parentElement;
          if (parent && parent.parentElement && parent.parentElement.tagName === 'IFRAME') {
            const grandparent = parent.parentElement;
            const gpSrc = grandparent.getAttribute('src') || '';
            if (gpSrc === 'about:blank' || gpSrc === '') {
              log('Removendo container pai about:blank');
              grandparent.remove();
            }
          }
        } catch(e) {}
      }
    });
    
    if (removed > 0) {
      console.log('[GTM-SW-Cleaner] Total removido:', removed);
    }
  };
  
  // MutationObserver para capturar criação dinâmica
  const startObserver = function() {
    if (!window.MutationObserver) {
      log('MutationObserver não suportado');
      return;
    }
    
    const observer = new MutationObserver(function(mutations) {
      let shouldCheck = false;
      
      mutations.forEach(function(mutation) {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(function(node) {
            if (node.tagName === 'IFRAME') {
              shouldCheck = true;
            }
          });
        }
      });
      
      if (shouldCheck) {
        removeSwIframes();
      }
    });
    
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
      log('Observer iniciado');
    }
    
    // Para após 30 segundos
    setTimeout(function() {
      observer.disconnect();
      log('Observer finalizado');
    }, CONFIG.maxDuration);
  };
  
  // Inicialização
  const init = function() {
    log('Inicializando...');
    
    // Remove imediatamente
    removeSwIframes();
    
    // Observer para novos iframes
    startObserver();
    
    // Intervalo de backup
    const interval = setInterval(removeSwIframes, CONFIG.removeInterval);
    
    // Para o intervalo após 30 segundos
    setTimeout(function() {
      clearInterval(interval);
    }, CONFIG.maxDuration);
    
    // Também após load
    window.addEventListener('load', function() {
      setTimeout(removeSwIframes, 1000);
      setTimeout(removeSwIframes, 2000);
    });
    
    log('Inicialização completa');
  };
  
  // Executa
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
  
  // API global
  window.gtmSwCleaner = {
    clean: removeSwIframes,
    enable: function() { CONFIG.enabled = true; },
    disable: function() { CONFIG.enabled = false; }
  };
  
})();
