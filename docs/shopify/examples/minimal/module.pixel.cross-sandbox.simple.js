/**
 * Tracklay Init - Versão Simplificada
 * Integração com Custom Pixel do Shopify
 */

(function() {
  'use strict';

  const CONFIG = window.TracklayConfig || {
    GTM_ID: 'GTM-MJ7DW8H',
    PROXY_DOMAIN: 'https://cdn.suevich.com/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f',
    TRANSPORT_URL: 'https://data.suevich.com/',
    CURRENCY: 'EUR',
    DEBUG: false
  };

  const DEBUG = CONFIG.DEBUG;
  const log = (...args) => DEBUG && console.log('[Tracklay]', ...args);

  // Evita duplicados
  const seen = new Set();
  const dedupe = (id) => {
    if (seen.has(id)) return true;
    seen.add(id);
    if (seen.size > 200) seen.clear();
    return false;
  };

  // Inicializa GTM
  function initGTM() {
    if (window.self !== window.top && document.title === 'sw_iframe.html') {
      return false;
    }

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      'gtm.start': Date.now(),
      event: 'gtm.js',
      transport_url: CONFIG.TRANSPORT_URL,
      currency: CONFIG.CURRENCY
    });

    const script = document.createElement('script');
    script.async = true;
    script.src = `${CONFIG.PROXY_DOMAIN}?id=${CONFIG.GTM_ID}`;
    document.head.appendChild(script);

    log('GTM inicializado');
    return true;
  }

  // Processa evento
  function processEvent(event) {
    if (!event?.name) return;
    if (dedupe(event.id || event.timestamp)) {
      log('Duplicado:', event.name);
      return;
    }

    log('Evento:', event.name);

    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: event.name,
      ...(event.data || {}),
      page_title: document.title,
      page_location: location.href,
      page_path: location.pathname,
      _tracklay_id: event.id,
      _tracklay_ts: event.timestamp
    });
  }

  // BroadcastChannel simples
  let channel;
  try {
    channel = new BroadcastChannel('_tracklay_events');
  } catch (e) { /* ignore */ }

  // API pública
  window.Tracklay = {
    init: initGTM,
    push: processEvent,
    
    subscribe(callback) {
      if (channel) {
        channel.onmessage = (e) => {
          if (e.data?.event) callback(e.data.event);
        };
      }
    }
  };

  // Auto init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGTM);
  } else {
    initGTM();
  }

})();
