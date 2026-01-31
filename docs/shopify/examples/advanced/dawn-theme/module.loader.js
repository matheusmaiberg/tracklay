/**
 * @fileoverview GTM Loader - Google Tag Manager ES6 Module Loader
 * Loads and initializes Google Tag Manager (GTM) with dataLayer support.
 */

// ============= IMPORTS =============

import { ConfigManager } from './module.config.js';
import { Logger } from './module.logger.js';

// ============= LOGGER SETUP =============

const log = Logger.create('GTMLoader');

/**
 * @param {string} gtmId - GTM container ID
 * @returns {string} Full URL for loading GTM script
 * @private
 */
function buildGtmScriptUrl(gtmId) {
  const normalizedGtmId = gtmId.startsWith('GTM-') ? gtmId : `GTM-${gtmId}`;
  
  const proxyActive = ConfigManager.get('GTM.PROXY.ACTIVE');
  
  if (proxyActive) {
    const proxyDomain = ConfigManager.get('GTM.PROXY.DOMAIN');
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
  const transportActive = ConfigManager.get('GTM.TRANSPORT.ACTIVE');
  
  if (transportActive) {
    const transportUrl = ConfigManager.get('GTM.TRANSPORT.URL');
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
  return ConfigManager.get('GTM.CURRENCY');
}

// ============= LOGGER =============

const log = Logger.create('GTMLoader');

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
  // Prevent duplicate initialization
  if (isInitialized) {
    log.debug('GTM already initialized, skipping duplicate init');
    return true;
  }
  
  // Detect if running inside GTM's first-party iframe
  const isIframe = window.self !== window.top;
  const isGtmIframe = isIframe && (document.title === 'sw_iframe.html' || location.href.includes('sw_iframe'));
  
  if (isGtmIframe) {
    log.debug('Detected GTM first-party iframe, skipping GTM initialization in iframe context');
    return false;
  }
  
  const gtmId = options.gtmId || ConfigManager.get('GTM.ID');
  
  if (!gtmId) {
    console.warn('[GTMLoader] GTM ID not provided and GTM.ID config is not set');
    return false;
  }

  currentGtmId = gtmId;

  if (options.debug !== undefined) {
    ConfigManager.merge({ COOKIE: { DEBUG: !!options.debug } });
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
  
  // Capture page info from main document (not iframe)
  const pageTitle = document.title || '';
  const pageLocation = window.location.href || '';
  const pagePath = window.location.pathname || '';
  
  const initialPush = {
    'gtm.start': new Date().getTime(),
    event: 'gtm.js',
    page_title: pageTitle,
    page_location: pageLocation,
    page_path: pagePath
  };
  
  const defaultCurrency = options.currency || getDefaultCurrency();
  initialPush.currency = defaultCurrency;
  
  if (currentTransportUrl) {
    initialPush.transport_url = currentTransportUrl;
    log.debug('Server-side GTM enabled with transport_url:', currentTransportUrl);
  }
  
  const useProxy = options.useProxy !== undefined 
    ? options.useProxy 
    : ConfigManager.get('GTM.PROXY.ACTIVE');
  
  if (useProxy) {
    const proxyDomain = ConfigManager.get('GTM.PROXY.DOMAIN');
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
    proxyActive: ConfigManager.get('GTM.PROXY.ACTIVE'),
    transportActive: ConfigManager.get('GTM.TRANSPORT.ACTIVE') || !!currentTransportUrl
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
      DEBUG: ConfigManager.get('COOKIE.DEBUG'),
      GTM_ID: currentGtmId,
      CURRENCY: getDefaultCurrency(),
      TRANSPORT_URL: currentTransportUrl,
      PROXY_ACTIVE: ConfigManager.get('GTM.PROXY.ACTIVE'),
      TRANSPORT_ACTIVE: ConfigManager.get('GTM.TRANSPORT.ACTIVE') || !!currentTransportUrl
    };
  }
};

if (typeof window !== 'undefined') {
  window.GTMLoader = GTMLoader;
}
