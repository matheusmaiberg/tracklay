/**
 * Event Orchestrator - Tracklay
 *
 * Orquestra a recepção de eventos do Custom Pixel e envio para GTM.
 * Usa EventBridge para gerenciar BroadcastChannel + cookie polling internamente.
 *
 * Dependências obrigatórias:
 * - EventBridge (de cookie-tracker.js) - handles BroadcastChannel + polling
 * - Deduplicator (de deduplicator.js) - deduplicação de eventos
 * - GTMLoader (de gtm-loader.js, opcional) - envio para dataLayer
 * - PixelConfigAPI (de config.js) - configuração centralizada
 * - Logger (de module.logger.js) - logging centralizado
 *
 * Instalação no theme.liquid:
 * <script src="config.js"></script>
 * <script src="cookie-tracker.js"></script>
 * <script src="deduplicator.js"></script>
 * <script src="gtm-loader.js"></script>
 * <script src="event-orchestrator.js"></script>
 * <script>ThemeGTM.init({ gtmId: 'GTM-XXXXX' });</script>
 */

var ThemeGTM = (function() {
  'use strict';
  
  // ============= LOGGER SETUP =============
  // Try to use Logger module, fallback to local log function
  var logInstance = null;
  
  function initLogger() {
    if (logInstance) return logInstance;
    
    // Try window.Logger first (loaded via script tag)
    if (typeof window !== 'undefined' && window.Logger) {
      try {
        logInstance = window.Logger.create('ThemeGTM');
        return logInstance;
      } catch (e) {
        // Fallback below
      }
    }
    
    // Fallback logger
    var debugEnabled = false;
    logInstance = {
      debug: function() {},
      info: function() {},
      warn: function() { 
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[ThemeGTM]');
        console.warn.apply(console, args);
      },
      error: function() {
        var args = Array.prototype.slice.call(arguments);
        args.unshift('[ThemeGTM]');
        console.error.apply(console, args);
      },
      success: function() {},
      event: function() {},
      setDebug: function(val) { debugEnabled = !!val; },
      isDebug: function() { return debugEnabled; }
    };
    return logInstance;
  }
  
  /**
   * Get ConfigManager from global API or fallback to defaults
   * @returns {Object|null} ConfigManager or null
   */
  function getConfigManager() {
    if (typeof window !== 'undefined' && window.PixelConfigAPI) {
      return window.PixelConfigAPI;
    }
    if (typeof window !== 'undefined' && window.ConfigManager) {
      return window.ConfigManager;
    }
    return null;
  }
  
  /**
   * Get configuration value from ConfigManager with fallback
   * @param {string} path - Dot-notation config path
   * @param {*} defaultValue - Default value if not found
   * @returns {*} Configuration value
   */
  function getConfig(path, defaultValue) {
    var cm = getConfigManager();
    if (cm && typeof cm.get === 'function') {
      return cm.get(path, defaultValue);
    }
    return defaultValue;
  }
  
  /**
   * Local configuration (fallback when ConfigManager not available)
   */
  var LOCAL_CONFIG = {
    DEBUG: true,
    CHANNEL_NAME: '_tracklay_events',
    MAX_DATALAYER_SIZE: 100
  };
  
  // Track subscription state to prevent duplicate listeners (Bug #6 fix)
  var isSubscribed = false;
  
  // Initialize logger and get local log function
  var logger = initLogger();
  
  /**
   * Legacy log function for backward compatibility
   * Now delegates to logger instance
   */
  function log() {
    var debugEnabled = getConfig('COOKIE.DEBUG', LOCAL_CONFIG.DEBUG);
    if (debugEnabled && logger && logger.info) {
      var args = Array.prototype.slice.call(arguments);
      logger.info.apply(logger, args);
    }
  }
  
  /**
   * Processa evento recebido (com dedup e envio)
   */
  function processEvent(event, source) {
    source = source || 'unknown';
    
    // Verifica duplicado (único dedup no sistema)
    if (typeof Deduplicator !== 'undefined' && typeof Deduplicator.isDuplicate === 'function') {
      if (Deduplicator.isDuplicate(event)) {
        log('  ⚠️ Duplicado ignorado:', event.name);
        return;
      }
      // Marca como processado (Bug #1 fix: removed 'theme' argument)
      if (typeof Deduplicator.markProcessed === 'function') {
        Deduplicator.markProcessed(event);
      }
    }
    
    log('  ✅ Processando:', event.name);
    
    // Envia para GTM/dataLayer
    if (typeof GTMLoader !== 'undefined' && typeof GTMLoader.push === 'function') {
      // Bug #3 fix: Add try-catch around GTMLoader.push()
      try {
        GTMLoader.push({
          event: event.name,
          pixel_data: event.data,
          pixel_id: event.id,
          pixel_timestamp: event.timestamp,  // Bug #5: Verified - pixel sends _sentAt, mapped to timestamp
          _tracklay_source: source
        });
        log('  ✅ Enviado para GTM');
      } catch (e) {
        log('  ❌ Erro ao enviar para GTMLoader:', e.message);
        // Fallback to dataLayer on error
        pushToDataLayer(event, source);
      }
    } else {
      // Fallback direto para dataLayer
      pushToDataLayer(event, source);
    }
  }
  
  /**
   * Bug #3 & #4: Helper function for dataLayer push with size limit
   */
  function pushToDataLayer(event, source) {
    window.dataLayer = window.dataLayer || [];
    
    // Bug #7 fix: Limit dataLayer size to prevent memory leak
    // Only splice when exceeding max, remove correct amount
    var maxDataLayerSize = getConfig('EVENT_ORCHESTRATOR.MAX_DATALAYER_SIZE', LOCAL_CONFIG.MAX_DATALAYER_SIZE);
    if (window.dataLayer.length > maxDataLayerSize) {
      window.dataLayer.splice(0, window.dataLayer.length - maxDataLayerSize);
    }
    
    window.dataLayer.push({
      event: event.name,
      pixel_data: event.data,
      pixel_id: event.id,
      pixel_timestamp: event.timestamp,
      _tracklay_source: source
    });
    log('  ✅ Enviado para dataLayer');
  }
  
  /**
   * Inicializa receivers via EventBridge
   * EventBridge gerencia BroadcastChannel + cookie polling internamente
   */
  function initReceivers() {
    // Bug #2 fix: Check EventBridge exists and has subscribe method
    if (typeof EventBridge === 'undefined' || typeof EventBridge.subscribe !== 'function') {
      log('❌ EventBridge nao disponivel ou metodo subscribe nao encontrado');
      return false;
    }
    
    // Bug #7 fix: Prevent duplicate subscriptions
    if (isSubscribed) {
      log('⚠️ EventBridge ja inicializado, ignorando chamada duplicada');
      return true;
    }

    // EventBridge.subscribe handles BroadcastChannel + cookie polling
    EventBridge.subscribe(function(event) {
      processEvent(event, 'eventbridge');
    });
    
    // Mark as subscribed
    isSubscribed = true;

    log('📡 EventBridge inicializado');
    return true;
  }
  
  /**
   * Bug #6 fix: Reset subscription state to allow re-initialization
   * Call this if EventBridge connection drops and needs re-init
   */
  function resetSubscription() {
    isSubscribed = false;
    log('🔄 Subscription state reset');
    return true;
  }
  
  /**
   * Inicializa tudo
   * @param {Object} [config={}] - Configuration options
   * @param {boolean} [config.debug] - Enable debug mode
   * @param {string} [config.gtmId] - GTM container ID
   * @returns {boolean} Success status
   */
  function init(config) {
    config = config || {};

    log('═══════════════════════════════════════');
    log('🚀 Theme GTM - Inicializando');
    log('═══════════════════════════════════════');

    // Merge config into ConfigManager if available
    var cm = getConfigManager();
    if (cm && typeof cm.merge === 'function') {
      var mergeConfig = {};
      if (config.debug !== undefined) {
        mergeConfig.COOKIE = { DEBUG: !!config.debug };
      }
      if (config.maxDataLayerSize !== undefined) {
        mergeConfig.EVENT_ORCHESTRATOR = { MAX_DATALAYER_SIZE: config.maxDataLayerSize };
      }
      if (Object.keys(mergeConfig).length > 0) {
        cm.merge(mergeConfig);
      }
    }
    
    // Atualiza config local para compatibilidade
    if (config.debug !== undefined) LOCAL_CONFIG.DEBUG = !!config.debug;

    // Verifica dependências obrigatórias (Bug #2 fix: check methods exist)
    var deps = [];
    if (typeof Deduplicator === 'undefined') deps.push('Deduplicator');
    else if (typeof Deduplicator.isDuplicate !== 'function') deps.push('Deduplicator.isDuplicate');
    
    if (typeof EventBridge === 'undefined') deps.push('EventBridge');
    else if (typeof EventBridge.subscribe !== 'function') deps.push('EventBridge.subscribe');

    if (deps.length > 0) {
      console.error('[ThemeGTM] Dependencias nao carregadas:', deps.join(', '));
      console.error('Carregue: cookie-tracker.js, deduplicator.js antes deste arquivo.');
      return false;
    }

    // Inicializa GTM (se ID fornecido e GTMLoader disponivel)
    if (config.gtmId) {
      if (typeof GTMLoader !== 'undefined' && typeof GTMLoader.init === 'function') {
        try {
          var debugMode = getConfig('COOKIE.DEBUG', LOCAL_CONFIG.DEBUG);
          GTMLoader.init({ gtmId: config.gtmId, debug: debugMode });
        } catch (e) {
          console.warn('[ThemeGTM] Erro ao inicializar GTMLoader:', e.message);
        }
      } else {
        console.warn('[ThemeGTM] GTMLoader nao disponivel, GTM nao inicializado');
      }
    }

    // Inicializa receivers via EventBridge
    initReceivers();

    log('✅ Pronto!');
    return true;
  }
  
  // API pública
  return {
    init: init,
    get CONFIG() {
      return {
        DEBUG: getConfig('COOKIE.DEBUG', LOCAL_CONFIG.DEBUG),
        CHANNEL_NAME: getConfig('BROADCAST.CHANNEL', LOCAL_CONFIG.CHANNEL_NAME),
        MAX_DATALAYER_SIZE: getConfig('EVENT_ORCHESTRATOR.MAX_DATALAYER_SIZE', LOCAL_CONFIG.MAX_DATALAYER_SIZE)
      };
    },
    resetSubscription: resetSubscription
  };
  
})();

// Bug #6 fix: Robust auto-init with retry mechanism
(function() {
  if (typeof window === 'undefined') return;
  
  window.ThemeGTM = ThemeGTM;
  
  if (!window.ThemeGTMConfig) return;
  
  var initAttempts = 0;
  var MAX_ATTEMPTS = 10;
  var RETRY_DELAY = 100; // ms
  
  function tryInit() {
    initAttempts++;
    
    // Check if DOM is ready
    if (document.readyState === 'loading' && initAttempts < MAX_ATTEMPTS) {
      // DOM not ready yet, retry
      setTimeout(tryInit, RETRY_DELAY);
      return;
    }
    
    // Try to initialize
    var result = ThemeGTM.init(window.ThemeGTMConfig);
    
    // If failed and we haven't exceeded max attempts, retry
    if (!result && initAttempts < MAX_ATTEMPTS) {
      setTimeout(tryInit, RETRY_DELAY * 2);
    }
  }
  
  // Start initialization
  if (document.readyState === 'loading') {
    // DOM not ready, use event listener AND retry mechanism
    document.addEventListener('DOMContentLoaded', tryInit);
    // Also start retry loop in case event was missed
    setTimeout(tryInit, 50);
  } else {
    // DOM already loaded, init immediately
    tryInit();
  }
})();
