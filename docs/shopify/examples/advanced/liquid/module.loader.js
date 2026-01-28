/**
 * @fileoverview GTM Loader - Google Tag Manager ES6 Module Loader
 * Loads and initializes Google Tag Manager (GTM) with dataLayer support.
 */

// ============= IMPORTS =============

import { ConfigManager } from './module.config.js';
import { Logger } from './module.logger.js';

// ============= CONFIGURATION =============

/**
 * Local config fallback - used when ConfigManager is not available
 * @deprecated Use ConfigManager.get('COOKIE.DEBUG') instead
 */
const LOCAL_CONFIG = {
  DEBUG: false
};

/**
 * @param {string} path - Dot-notation config path
 * @param {*} defaultValue - Default value if not found
 * @returns {*} Configuration value
 */
function getConfig(path, defaultValue) {
  if (typeof ConfigManager !== 'undefined' && ConfigManager.get) {
    return ConfigManager.get(path, defaultValue);
  }
  return defaultValue;
}

/**
 * @param {string} gtmId - GTM container ID
 * @returns {string} Full URL for loading GTM script
 * @private
 */
function buildGtmScriptUrl(gtmId) {
  const normalizedGtmId = gtmId.startsWith('GTM-') ? gtmId : `GTM-${gtmId}`;
  
  const proxyActive = getConfig('GTM.PROXY.ACTIVE', false);
  
  if (proxyActive) {
    const proxyDomain = getConfig('GTM.PROXY.DOMAIN');
    if (proxyDomain) {
      const url = `${proxyDomain}?id=${normalizedGtmId}`;
      log.debug('Using proxy URL:', url);
      return url;
    }
    log.warn('PROXY.ACTIVE is true but PROXY.DOMAIN is not set');
  }
  
  return `https://www.googletagmanager.com/gtm.js?id=${normalizedGtmId}`;
}

/**
 * @returns {string|undefined} Transport URL if active, undefined otherwise
 * @private
 */
function getTransportUrl() {
  const transportActive = getConfig('GTM.TRANSPORT.ACTIVE', false);
  
  if (transportActive) {
    const transportUrl = getConfig('GTM.TRANSPORT.URL');
    if (transportUrl) {
      return transportUrl;
    }
    log.warn('TRANSPORT.ACTIVE is true but TRANSPORT.URL is not set');
  }
  
  return undefined;
}

/**
 * @returns {string} Currency code (e.g., 'USD', 'EUR')
 * @private
 */
function getDefaultCurrency() {
  return getConfig('GTM.CURRENCY', 'USD');
}

// ============= LOGGER =============

const createLoggerInstance = () => {
  if (typeof Logger !== 'undefined' && Logger && typeof Logger.create === 'function') {
    try {
      const loggerInstance = Logger.create('GTMLoader');
      if (loggerInstance && typeof loggerInstance.debug === 'function') {
        return loggerInstance;
      }
    } catch (e) {
      // Fallback abaixo
    }
  }
  return {
    debug: (...args) => {
      if (getConfig('COOKIE.DEBUG', LOCAL_CONFIG.DEBUG)) {
        console.log('[GTMLoader]', ...args);
      }
    },
    info: (...args) => console.log('[GTMLoader]', ...args),
    warn: (...args) => console.warn('[GTMLoader]', ...args),
    error: (...args) => console.error('[GTMLoader]', ...args),
    success: (...args) => console.log('[GTMLoader]', ...args),
    event: (...args) => console.log('[GTMLoader]', ...args),
    timer: (...args) => console.log('[GTMLoader]', ...args)
  };
};

const log = createLoggerInstance();

// ============= STATE =============

let currentTransportUrl = undefined;
let isInitialized = false;
let currentGtmId = undefined;

// ============= PUBLIC API =============

/**
 * @param {Object} [options={}] - Configuration options
 * @param {string} [options.gtmId] - GTM container ID
 * @param {boolean} [options.debug] - Enable debug logging
 * @param {string} [options.currency] - Override default currency
 * @param {boolean} [options.useProxy] - Force proxy usage
 * @param {string} [options.transportUrl] - Override server-side GTM URL
 * @returns {boolean} True if initialization was successful
 */
const init = (options = {}) => {
  const gtmId = options.gtmId || getConfig('GTM.ID');
  
  if (!gtmId) {
    console.warn('[GTMLoader] GTM ID not provided and GTM.ID config is not set');
    return false;
  }

  currentGtmId = gtmId;

  if (options.debug !== undefined) {
    if (typeof ConfigManager !== 'undefined' && ConfigManager.merge) {
      ConfigManager.merge({ COOKIE: { DEBUG: !!options.debug } });
    }
    LOCAL_CONFIG.DEBUG = !!options.debug;
  }

  if (options.currency !== undefined) {
    if (typeof ConfigManager !== 'undefined' && ConfigManager.set) {
      ConfigManager.set('GTM.CURRENCY', options.currency);
    }
  }

  if (options.transportUrl !== undefined) {
    currentTransportUrl = options.transportUrl;
  } else {
    currentTransportUrl = getTransportUrl();
  }

  window.dataLayer = window.dataLayer || [];
  
  const initialPush = {
    'gtm.start': new Date().getTime(),
    event: 'gtm.js'
  };
  
  const defaultCurrency = options.currency || getDefaultCurrency();
  initialPush.currency = defaultCurrency;
  
  if (currentTransportUrl) {
    initialPush.transport_url = currentTransportUrl;
    log.debug('Server-side GTM enabled with transport_url:', currentTransportUrl);
  }
  
  const useProxy = options.useProxy !== undefined 
    ? options.useProxy 
    : getConfig('GTM.PROXY.ACTIVE', false);
  
  if (useProxy) {
    const proxyDomain = getConfig('GTM.PROXY.DOMAIN');
    if (proxyDomain) {
      log.debug('Proxy mode enabled, domain:', proxyDomain);
    }
  }
  
  window.dataLayer.push(initialPush);
  log.debug('Initial dataLayer push:', initialPush);

  const script = document.createElement('script');
  script.async = true;
  script.src = buildGtmScriptUrl(gtmId);

  script.onerror = () => {
    console.error('[GTMLoader] Failed to load GTM from:', script.src);
  };

  if (document.head) {
    try {
      document.head.appendChild(script);
    } catch (err) {
      console.error('[GTMLoader] Failed to append script to head:', err);
    }
  } else {
    console.warn('[GTMLoader] document.head not available');
  }

  isInitialized = true;

  if (log.success) {
    log.success('GTM initialized:', gtmId);
    if (currentTransportUrl) {
      log.success('Server-side GTM transport URL:', currentTransportUrl);
    }
  } else {
    log.info('✅ GTM initialized:', gtmId);
  }
  
  return true;
};

/**
 * @param {string} url - Server-side GTM endpoint URL
 * @returns {boolean} True if configuration was successful
 */
const configureTransport = (url) => {
  if (url === null || url === undefined) {
    currentTransportUrl = undefined;
    log.info('Server-side GTM transport URL cleared');
    return true;
  }

  if (typeof url !== 'string' || !url.startsWith('http')) {
    log.error('Invalid transport URL:', url);
    return false;
  }

  currentTransportUrl = url;

  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    transport_url: url,
    event: 'gtm_transport_configured'
  });

  if (typeof ConfigManager !== 'undefined' && ConfigManager.set) {
    ConfigManager.set('GTM.TRANSPORT.URL', url);
    ConfigManager.set('GTM.TRANSPORT.ACTIVE', true);
  }

  log.success('Server-side GTM transport URL configured:', url);
  return true;
};

/**
 * @param {Object} data - Event data to push to dataLayer
 * @returns {void}
 */
const push = (data) => {
  if (!data || typeof data !== 'object') {
    log.warn('Invalid data provided to push:', data);
    return;
  }

  window.dataLayer = window.dataLayer || [];
  
  const enrichedData = { ...data };
  
  if (enrichedData.value !== undefined && enrichedData.currency === undefined) {
    enrichedData.currency = getDefaultCurrency();
    log.debug('Added default currency:', enrichedData.currency);
  }
  
  if (currentTransportUrl && enrichedData.transport_url === undefined) {
    enrichedData.transport_url = currentTransportUrl;
  }
  
  window.dataLayer.push(enrichedData);
  
  if (log.event) {
    log.event('Push dataLayer:', enrichedData.event || 'no-event', enrichedData);
  } else {
    log.info('📊 Push dataLayer:', enrichedData.event || 'no-event', enrichedData);
  }
};

/**
 * @returns {Object} Current GTM loader status
 */
const getStatus = () => {
  return {
    initialized: isInitialized,
    gtmId: currentGtmId,
    transportUrl: currentTransportUrl,
    currency: getDefaultCurrency(),
    proxyActive: getConfig('GTM.PROXY.ACTIVE', false),
    transportActive: getConfig('GTM.TRANSPORT.ACTIVE', false) || !!currentTransportUrl
  };
};

// ============= EXPORT =============

export { ConfigManager };

export const GTMLoader = {
  init,
  push,
  configureTransport,
  getStatus,
  get CONFIG() {
    return {
      DEBUG: getConfig('COOKIE.DEBUG', LOCAL_CONFIG.DEBUG),
      GTM_ID: currentGtmId,
      CURRENCY: getDefaultCurrency(),
      TRANSPORT_URL: currentTransportUrl,
      PROXY_ACTIVE: getConfig('GTM.PROXY.ACTIVE', false),
      TRANSPORT_ACTIVE: getConfig('GTM.TRANSPORT.ACTIVE', false) || !!currentTransportUrl
    };
  }
};

if (typeof window !== 'undefined') {
  window.GTMLoader = GTMLoader;
}
