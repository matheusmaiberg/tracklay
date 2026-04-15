/**
 * Event Orchestrator - Tracklay
 * Orquestra a recepção de eventos do Custom Pixel e envio para GTM.
 * Usa EventBridge para gerenciar BroadcastChannel + cookie polling.
 */

import { ConfigManager } from './module.config.js';
import { Logger } from './module.logger.js';
import { EventBridge } from './module.cookie-tracker.js';
import { Deduplicator } from './module.deduplicator.js';
import { GTMLoader } from './module.loader.js';

const logger = Logger.create('GTM');

const ThemeGTM = (function() {
  'use strict';

  var isSubscribed = false;
  
  function processEvent(event, source) {
    source = source || 'unknown';

    logger.debug('[processEvent] Iniciando processamento de evento:', {
      name: event.name,
      id: event.id,
      source: source,
      timestamp: event.timestamp
    });

    if (typeof Deduplicator !== 'undefined' && typeof Deduplicator.isDuplicate === 'function') {
      if (Deduplicator.isDuplicate(event)) {
        logger.warn('[processEvent] ⚠️ Duplicado ignorado:', event.name);
        return;
      }
      if (typeof Deduplicator.markProcessed === 'function') {
        Deduplicator.markProcessed(event);
        logger.debug('[processEvent] Evento marcado como processado');
      }
    } else {
      logger.warn('[processEvent] Deduplicator não disponível');
    }

    logger.info('[processEvent] ✅ Processando evento:', event.name);

    // Server-side redundancy: also send to Worker /cdn/events
    const workerBaseUrl = ConfigManager.get('GTM.PROXY.DOMAIN');
    if (workerBaseUrl && event.ga4) {
      fetch(workerBaseUrl + '/cdn/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event.ga4)
      }).then(function() {
        logger.debug('[processEvent] Evento enviado para Worker /cdn/events');
      }).catch(function(err) {
        logger.warn('[processEvent] Falha ao enviar para Worker:', err.message);
      });
    }

    if (typeof GTMLoader !== 'undefined' && typeof GTMLoader.push === 'function') {
      try {
        const payload = {
          event: event.name,
          ...event.data,
          _tracklay_event_id: event.id,
          _tracklay_timestamp: event.timestamp,
          _tracklay_source: source
        };
        logger.debug('[processEvent] Enviando payload para GTM:', payload);
        GTMLoader.push(payload);
        logger.info('[processEvent] ✅ Evento enviado para GTM com sucesso');
      } catch (e) {
        logger.error('[processEvent] ❌ Erro ao enviar para GTMLoader:', e.message);
        logger.debug('[processEvent] Caindo para fallback dataLayer');
        pushToDataLayer(event, source);
      }
    } else {
      logger.warn('[processEvent] GTMLoader não disponível, usando fallback dataLayer');
      pushToDataLayer(event, source);
    }
  }
  
  function pushToDataLayer(event, source) {
    logger.debug('[pushToDataLayer] Inicializando dataLayer');
    window.dataLayer = window.dataLayer || [];

    var maxDataLayerSize = ConfigManager.get('EVENT_ORCHESTRATOR.MAX_DATALAYER_SIZE');
    logger.debug('[pushToDataLayer] Tamanho máximo da dataLayer:', maxDataLayerSize);
    logger.debug('[pushToDataLayer] Tamanho atual da dataLayer:', window.dataLayer.length);

    if (window.dataLayer.length > maxDataLayerSize) {
      var removedCount = window.dataLayer.length - maxDataLayerSize;
      window.dataLayer.splice(0, removedCount);
      logger.warn('[pushToDataLayer] ⚠️ Limite de dataLayer excedido, removidos', removedCount, 'itens');
    }

    const dataLayerEntry = {
      event: event.name,
      ...event.data,
      _tracklay_event_id: event.id,
      _tracklay_timestamp: event.timestamp,
      _tracklay_source: source
    };
    window.dataLayer.push(dataLayerEntry);
    logger.info('[pushToDataLayer] ✅ Evento enviado para dataLayer (tamanho agora:', window.dataLayer.length + ')');
    logger.debug('[pushToDataLayer] Entrada da dataLayer:', dataLayerEntry);
  }
  
  function initReceivers() {
    logger.info('[initReceivers] Iniciando inicialização do EventBridge');

    if (typeof EventBridge === 'undefined') {
      logger.error('[initReceivers] ❌ EventBridge não está definido');
      return false;
    }

    if (typeof EventBridge.subscribe !== 'function') {
      logger.error('[initReceivers] ❌ EventBridge.subscribe não é uma função');
      return false;
    }

    logger.debug('[initReceivers] EventBridge disponível e válido');

    if (isSubscribed) {
      logger.warn('[initReceivers] ⚠️ EventBridge já foi inicializado, ignorando chamada duplicada');
      return true;
    }

    logger.debug('[initReceivers] Registrando callback de eventos no EventBridge');

    EventBridge.subscribe(function(event) {
      logger.debug('[initReceivers] Evento recebido do EventBridge:', event.name);
      processEvent(event, 'eventbridge');
    });

    isSubscribed = true;

    logger.info('[initReceivers] 📡 EventBridge inicializado com sucesso');
    return true;
  }
  
  function resetSubscription() {
    isSubscribed = false;
    logger.info('🔄 Subscription state reset');
    return true;
  }
  
  /**
   * @param {Object} [config={}]
   * @returns {boolean}
   */
  function init(config) {
    config = config || {};

    logger.info('═══════════════════════════════════════');
    logger.info('🚀 Theme GTM - Inicializando');
    logger.info('═══════════════════════════════════════');
    logger.debug('Config recebido:', config);

    logger.debug('Tentando acessar ConfigManager para merge');
    if (ConfigManager && typeof ConfigManager.merge === 'function') {
      var mergeConfig = {};
      if (config.debug !== undefined) {
        mergeConfig.COOKIE = { DEBUG: !!config.debug };
        logger.debug('Debug mode configurado:', config.debug);
      }
      if (config.maxDataLayerSize !== undefined) {
        mergeConfig.EVENT_ORCHESTRATOR = { MAX_DATALAYER_SIZE: config.maxDataLayerSize };
        logger.debug('Max dataLayer size configurado:', config.maxDataLayerSize);
      }
      if (Object.keys(mergeConfig).length > 0) {
        logger.debug('Fazendo merge de config:', mergeConfig);
        ConfigManager.merge(mergeConfig);
      }
    }

    logger.info('Verificando dependências obrigatórias...');
    var deps = [];
    if (typeof Deduplicator === 'undefined') {
      deps.push('Deduplicator');
      logger.error('❌ Deduplicator não definido');
    } else if (typeof Deduplicator.isDuplicate !== 'function') {
      deps.push('Deduplicator.isDuplicate');
      logger.error('❌ Deduplicator.isDuplicate não é função');
    } else {
      logger.info('✅ Deduplicator disponível');
    }

    if (typeof EventBridge === 'undefined') {
      deps.push('EventBridge');
      logger.error('❌ EventBridge não definido');
    } else if (typeof EventBridge.subscribe !== 'function') {
      deps.push('EventBridge.subscribe');
      logger.error('❌ EventBridge.subscribe não é função');
    } else {
      logger.info('✅ EventBridge disponível');
    }

    if (deps.length > 0) {
      logger.error('❌ Dependências não carregadas:', deps.join(', '));
      console.error('[ThemeGTM] Carregue os módulos na ordem correta: module.config.js → module.logger.js → module.deduplicator.js → module.cookie-tracker.js → module.init.js');
      return false;
    }

    var gtmId = config.gtmId || ConfigManager.get('GTM.ID');
    if (gtmId) {
      if (!gtmId.startsWith('GTM-')) {
        gtmId = 'GTM-' + gtmId;
      }
      logger.info('GTM ID fornecido:', gtmId);
      if (typeof GTMLoader !== 'undefined' && typeof GTMLoader.init === 'function') {
        try {
          var debugMode = ConfigManager.get('COOKIE.DEBUG');
          logger.debug('Inicializando GTMLoader com debug mode:', debugMode);
          GTMLoader.init({ gtmId: gtmId, debug: debugMode });
          logger.info('✅ GTMLoader inicializado');
        } catch (e) {
          logger.error('❌ Erro ao inicializar GTMLoader:', e.message);
        }
      } else {
        logger.warn('⚠️ GTMLoader não disponível, GTM não inicializado');
      }
    } else {
      logger.debug('Nenhum GTM ID fornecido, pulando inicialização do GTMLoader');
    }

    logger.info('Inicializando receivers de eventos...');
    initReceivers();

    logger.info('═══════════════════════════════════════');
    logger.info('✅ Theme GTM pronto!');
    logger.info('═══════════════════════════════════════');
    return true;
  }
  
  return {
    init: init,
    get CONFIG() {
      return {
        DEBUG: ConfigManager.get('COOKIE.DEBUG'),
        CHANNEL_NAME: ConfigManager.get('BROADCAST.CHANNEL'),
        MAX_DATALAYER_SIZE: ConfigManager.get('EVENT_ORCHESTRATOR.MAX_DATALAYER_SIZE')
      };
    },
    resetSubscription: resetSubscription
  };
  
})();

/**
 * Robust auto-init usando async/await com retry e exponential backoff.
 */
(async function initAutoload() {

  logger.info('🔄 Auto-inicialização iniciada');


  if (typeof window === 'undefined') {
    logger.error('❌ Contexto window não disponível (não é ambiente browser)');
    return;
  }

  logger.debug('Ambiente: Browser (window disponível)');

  window.ThemeGTM = ThemeGTM;
  logger.debug('ThemeGTM exposto globalmente como window.ThemeGTM');

  const userConfig = window.ThemeGTMConfig || {};
  if (Object.keys(userConfig).length > 0) {
    logger.info('✅ Config de usuário encontrada:', userConfig);
  } else {
    logger.info('ℹ️ Usando configuração padrão (nenhum override fornecido)');
  }

  const MAX_ATTEMPTS = 10;
  const INITIAL_DELAY = 50; // ms - primeiro retry rápido
  const RETRY_DELAY = 100;  // ms - delay entre tentativas normais

  let attempts = 0;

  /**
   * @returns {Promise<void>}
   */
  async function waitForDOM() {
    logger.info('[waitForDOM] Aguardando DOM estar ready (estado atual:', document.readyState + ')');
    let domAttempts = 0;
    while (document.readyState === 'loading' && domAttempts < MAX_ATTEMPTS) {
      logger.debug('[waitForDOM] Tentativa', domAttempts + 1, '- DOM ainda está carregando');
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      domAttempts++;
    }
    logger.info('[waitForDOM] ✅ DOM está ready (estado:', document.readyState + ')');
  }

  /**
   * @returns {boolean}
   */
  function tryInitialize() {
    logger.info('Tentando inicializar ThemeGTM (tentativa ' + (attempts + 1) + ')');
    try {
      const result = ThemeGTM.init(userConfig);

      if (result) {
        logger.info('✅ Inicialização automática bem-sucedida (tentativa ' + (attempts + 1) + ')');
      } else {
        logger.error('❌ Inicialização falhou - dependências não carregadas');
      }

      return result;
    } catch (error) {
      logger.error('❌ Erro durante inicialização automática:', error.message);
      logger.debug('Stack trace:', error.stack);
      return false;
    }
  }

  /**
   * @param {number} attemptNum
   */
  function retryInitialization(attemptNum) {
    if (tryInitialize()) {
      return;
    }

    if (attemptNum >= MAX_ATTEMPTS) {
      logger.error('[retryInitialization] ❌ Máximo de tentativas alcançado (' + MAX_ATTEMPTS + '), abortando inicialização');
      return;
    }

    attemptNum++;
    const delay = RETRY_DELAY * Math.pow(2, Math.min(attemptNum - 1, 3)); // Max 2^3 = 8x
    logger.warn('[retryInitialization] ⏳ Retentando em ' + delay + 'ms (tentativa ' + attemptNum + '/' + MAX_ATTEMPTS + ')');

    setTimeout(() => {
      retryInitialization(attemptNum);
    }, delay);
  }

  try {
    logger.debug('DOM readyState atual:', document.readyState);

      if (document.readyState === 'loading') {
      logger.info('1️⃣ DOM ainda está carregando, aguardando...');
      await new Promise(resolve => setTimeout(resolve, INITIAL_DELAY));

      if (document.readyState === 'loading') {
        await waitForDOM();
      }
    } else {
      logger.info('1️⃣ DOM já está ready (estado:', document.readyState + ')');
    }

    logger.info('2️⃣ Tentando inicializar ThemeGTM...');
    const success = tryInitialize();

    if (!success && attempts < MAX_ATTEMPTS) {
      logger.warn('3️⃣ Inicialização falhou, iniciando retry com backoff');
      retryInitialization(attempts);
    } else if (success) {
      logger.info('3️⃣ Inicialização bem-sucedida, finalizando');
    }

  } catch (error) {
    logger.error('❌ Erro fatal durante inicialização automática:', error.message);
    logger.debug('Stack trace:', error.stack);
  }
})();

export { ThemeGTM };
export default ThemeGTM;


