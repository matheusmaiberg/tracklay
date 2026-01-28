/**
 * Event Orchestrator - Tracklay
 *
 * Orquestra a recepção de eventos do Custom Pixel e envio para GTM.
 * Usa EventBridge para gerenciar BroadcastChannel + cookie polling internamente.
 *
 * ES6 Module - Importa dependências explicitamente:
 * - EventBridge (de module.cookie-tracker.js) - handles BroadcastChannel + polling
 * - Deduplicator (de module.deduplicator.js) - deduplicação de eventos
 * - GTMLoader (de module.loader.js, opcional) - envio para dataLayer
 * - ConfigManager (de module.config.js) - configuração centralizada
 * - Logger (de module.logger.js) - logging centralizado
 *
 * Instalação no theme.liquid:
 * <script type="module" src="{{ 'module.config.js' | asset_url }}"></script>
 * <script type="module" src="{{ 'module.logger.js' | asset_url }}"></script>
 * <script type="module" src="{{ 'module.cookie-tracker.js' | asset_url }}"></script>
 * <script type="module" src="{{ 'module.deduplicator.js' | asset_url }}"></script>
 * <script type="module" src="{{ 'module.loader.js' | asset_url }}"></script>
 * <script type="module" src="{{ 'module.init.js' | asset_url }}"></script>
 * <script>window.ThemeGTMConfig = { gtmId: 'GTM-XXXXX', debug: true };</script>
 */

// ============= ES6 IMPORTS =============
import { ConfigManager } from './module.config.js';
import { Logger } from './module.logger.js';
import { EventBridge } from './module.cookie-tracker.js';
import { Deduplicator } from './module.deduplicator.js';
import { GTMLoader } from './module.loader.js';

const ThemeGTM = (function() {
  'use strict';

  // ============= LOGGER SETUP =============
  // Use Logger from import with fallback to local log function
  let logInstance = null;

  function initLogger() {
    if (logInstance) return logInstance;

    // Try imported Logger first
    if (typeof Logger !== 'undefined' && Logger && typeof Logger.create === 'function') {
      try {
        logInstance = Logger.create('ThemeGTM');
        return logInstance;
      } catch (e) {
        // Fallback below
      }
    }

    // Fallback logger
    let debugEnabled = false;
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
   * Get ConfigManager from import or fallback to window.PixelConfigAPI
   * @returns {Object|null} ConfigManager or null
   */
  function getConfigManager() {
    // Try imported ConfigManager first
    if (typeof ConfigManager !== 'undefined' && ConfigManager) {
      return ConfigManager;
    }
    // Fallback to window.* for legacy compatibility
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
   * Inicializa receivers via EventBridge (importado)
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

/**
 * 
 * Robust auto-init using async/await pattern
 *
 * Padrão recomendado pelo Shopify para inicialização:
 * - Usa async/await em vez de callbacks (mais limpo e legível)
 * - Aguarda DOM estar ready antes de inicializar
 * - Implementa retry com exponential backoff em caso de falha
 * - Seguro para ambiente sandbox do Shopify
 *
 * Motivo para não usar addEventListener:
 * - addEventListener('DOMContentLoaded') não é confiável em Shopify sandbox
 * - setTimeout + retry é mais robusto e previsível
 *
 * @see {@link https://developer.shopify.com/docs/themes/architecture/custom-pixels}
 */
(async function initAutoload() {
  // ⚠️ Valiar contexto global
  if (typeof window === 'undefined') return;

  // Expor ThemeGTM globalmente para uso manual se necessário
  window.ThemeGTM = ThemeGTM;

  // ✅ Verificar se config foi fornecida via window.ThemeGTMConfig
  // Se não foi, o usuário pode inicializar manualmente com:
  // ThemeGTM.init({ gtmId: 'GTM-XXXXX', debug: true });
  if (!window.ThemeGTMConfig) {
    console.log('[ThemeGTM] window.ThemeGTMConfig não definido. Use ThemeGTM.init() manualmente ou defina window.ThemeGTMConfig antes deste script.');
    return;
  }

  // ============= CONFIGURAÇÃO DE RETRY =============
  const MAX_ATTEMPTS = 10;
  const INITIAL_DELAY = 50; // ms - primeiro retry rápido
  const RETRY_DELAY = 100;  // ms - delay entre tentativas normais

  let attempts = 0;

  /**
   * Aguarda o DOM estar ready (interativo) com timeout
   *
   * Em vez de usar addEventListener (não confiável no sandbox do Shopify),
   * fazemos polling do document.readyState que é mais confiável.
   *
   * Estados do DOM:
   * - 'loading': Ainda carregando
   * - 'interactive': DOM pronto (equivalente a DOMContentLoaded)
   * - 'complete': Tudo carregado (equivalente a window.onload)
   *
   * @returns {Promise<void>}
   */
  async function waitForDOM() {
    while (document.readyState === 'loading' && attempts < MAX_ATTEMPTS) {
      // Aguardar RETRY_DELAY ms antes de verificar novamente
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      attempts++;
    }
  }

  /**
   * Tenta inicializar ThemeGTM
   *
   * Se falhar, retorna false e caller pode fazer retry.
   * Se der sucesso, retorna true e para de tentar.
   *
   * @returns {boolean} true se sucesso, false se falha
   */
  function tryInitialize() {
    try {
      const result = ThemeGTM.init(window.ThemeGTMConfig);

      if (result) {
        console.log('[ThemeGTM] Inicialização automática bem-sucedida (tentativa ' + attempts + ')');
      } else {
        console.warn('[ThemeGTM] Inicialização falhou - dependências não carregadas');
      }

      return result;
    } catch (error) {
      console.error('[ThemeGTM] Erro durante inicialização automática:', error.message);
      return false;
    }
  }

  // ============= FLUXO DE INICIALIZAÇÃO =============

  /**
   * Recursively retry initialization with exponential backoff
   * Uses a named function instead of arguments.callee() for compatibility
   * @param {number} attemptNum - Current attempt number
   */
  function retryInitialization(attemptNum) {
    if (tryInitialize()) {
      // Success - initialization complete
      return;
    }

    if (attemptNum >= MAX_ATTEMPTS) {
      console.warn('[ThemeGTM] Máximo de tentativas alcançado (' + MAX_ATTEMPTS + '), abortando inicialização');
      return;
    }

    attemptNum++;
    const delay = RETRY_DELAY * Math.pow(2, Math.min(attemptNum - 1, 3)); // Max 2^3 = 8x
    console.log('[ThemeGTM] Retentando em ' + delay + 'ms (tentativa ' + attemptNum + '/' + MAX_ATTEMPTS + ')');

    setTimeout(() => {
      retryInitialization(attemptNum);
    }, delay);
  }

  try {
    // 1️⃣ Aguardar DOM estar ready (se necessário)
    if (document.readyState === 'loading') {
      // Usar delay inicial curto para primeira tentativa
      await new Promise(resolve => setTimeout(resolve, INITIAL_DELAY));

      // Se ainda tiver carregando, aguardar com retry loop
      if (document.readyState === 'loading') {
        await waitForDOM();
      }
    }

    // 2️⃣ Tentar inicializar
    const success = tryInitialize();

    // 3️⃣ Se falhou, fazer retry com exponential backoff
    if (!success && attempts < MAX_ATTEMPTS) {
      retryInitialization(attempts);
    }

  } catch (error) {
    console.error('[ThemeGTM] Erro fatal durante inicialização automática:', error);
  }
})();

// ============================================
// ES6 MODULE EXPORTS
// ============================================

/**
 * Export ThemeGTM for use in other modules or for manual initialization
 */
export { ThemeGTM };
export default ThemeGTM;

// ============================================
// BROWSER GLOBAL ASSIGNMENT
// ============================================

/**
 * Browser global fallback assignment.
 * Makes ThemeGTM available as window.ThemeGTM in browser environments
 */
if (typeof window !== 'undefined') {
  window.ThemeGTM = ThemeGTM;
}
