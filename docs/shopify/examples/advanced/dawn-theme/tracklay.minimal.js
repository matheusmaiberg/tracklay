/**
 * Tracklay Minimal - Tracking Pixel Simplificado
 * Toda a funcionalidade em um único arquivo (~300 linhas)
 */

(function() {
  'use strict';

  // ============ CONFIG ============
  const CONFIG = {
    GTM_ID: 'GTM-MJ7DW8H',
    PROXY_DOMAIN: 'https://cdn.suevich.com/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f',
    TRANSPORT_URL: 'https://data.suevich.com/',
    CURRENCY: 'EUR',
    DEBUG: false
  };

  // ============ LOGGER ============
  const log = {
    debug: (...args) => CONFIG.DEBUG && console.log('[Tracklay]', ...args),
    info: (...args) => console.log('[Tracklay]', ...args),
    error: (...args) => console.error('[Tracklay]', ...args)
  };

  // ============ DEDUPLICAÇÃO SIMPLES ============
  const processedEvents = new Set();
  const MAX_CACHE_SIZE = 100;

  function isDuplicate(event) {
    const key = `${event.name}-${event.id || event.timestamp}`;
    if (processedEvents.has(key)) return true;
    processedEvents.add(key);
    if (processedEvents.size > MAX_CACHE_SIZE) {
      const first = processedEvents.values().next().value;
      processedEvents.delete(first);
    }
    return false;
  }

  // ============ GTM LOADER ============
  const GTMLoader = {
    initialized: false,
    
    init() {
      if (this.initialized) return;
      if (window.self !== window.top && document.title === 'sw_iframe.html') {
        log.debug('Dentro do iframe, pulando');
        return;
      }

      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        'gtm.start': new Date().getTime(),
        event: 'gtm.js',
        transport_url: CONFIG.TRANSPORT_URL,
        currency: CONFIG.CURRENCY
      });

      const script = document.createElement('script');
      script.async = true;
      script.src = `${CONFIG.PROXY_DOMAIN}?id=${CONFIG.GTM_ID}`;
      document.head.appendChild(script);

      this.initialized = true;
      log.info('GTM inicializado:', CONFIG.GTM_ID);
    },

    push(data) {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        ...data,
        currency: data.currency || CONFIG.CURRENCY,
        transport_url: CONFIG.TRANSPORT_URL
      });
    }
  };

  // ============ EVENT HANDLER ============
  const EventHandler = {
    process(event) {
      if (!event || !event.name) return;
      if (isDuplicate(event)) {
        log.debug('Duplicado ignorado:', event.name);
        return;
      }

      log.info('Evento:', event.name);

      const payload = {
        event: event.name,
        ...(event.data || {}),
        page_title: document.title,
        page_location: window.location.href,
        page_path: window.location.pathname,
        _tracklay_event_id: event.id,
        _tracklay_timestamp: event.timestamp
      };

      GTMLoader.push(payload);
    }
  };

  // ============ COOKIE SYNC SIMPLES ============
  const CookieSync = {
    broadcastChannel: null,
    
    init() {
      if (!window.BroadcastChannel) return;
      
      try {
        this.broadcastChannel = new BroadcastChannel('_tracklay_sync');
        this.broadcastChannel.onmessage = (e) => {
          if (e.data?.type === 'CUSTOMER_DATA') {
            window.__tracklayCustomerData = e.data.payload;
          }
        };
        log.debug('BroadcastChannel ativo');
      } catch (err) {
        log.debug('BroadcastChannel não disponível');
      }
    },

    send(data) {
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'CUSTOMER_DATA', payload: data });
      }
    }
  };

  // ============ THEME GTM ============
  const ThemeGTM = {
    init() {
      log.info('Inicializando Tracklay...');
      
      if (window.self !== window.top && document.title === 'sw_iframe.html') {
        log.debug('Iframe detectado, pulando inicialização');
        return false;
      }

      CookieSync.init();
      GTMLoader.init();
      
      log.info('Tracklay pronto');
      return true;
    },

    push(event) {
      EventHandler.process(event);
    },

    setCustomerData(data) {
      CookieSync.send(data);
      window.__tracklayCustomerData = data;
    }
  };

  // ============ AUTO INIT ============
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ThemeGTM.init());
  } else {
    ThemeGTM.init();
  }

  // ============ EXPORTS ============
  window.ThemeGTM = ThemeGTM;
  window.Tracklay = ThemeGTM;

})();
