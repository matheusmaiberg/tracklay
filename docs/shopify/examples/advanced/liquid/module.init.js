/**
 * @fileoverview GTM Loader - Google Tag Manager ES6 Module Loader
 * @module gtm-loader
 *
 * @description
 * Loads and initializes Google Tag Manager (GTM) in the theme.
 * Provides a clean API for GTM initialization and dataLayer event pushing.
 * Automatically creates the dataLayer array and injects the GTM script.
 *
 * Supports advanced features:
 * - Configurable GTM ID via options or ConfigManager
 * - Server-side GTM (transport_url) for first-party tracking
 * - Proxy loading for bypassing ad blockers
 * - Default currency for e-commerce tracking
 *
 * @example
 * import { GTMLoader } from './module.gtm-loader.js';
 *
 * // Initialize GTM with your container ID
 * GTMLoader.init({ gtmId: 'GTM-XXXXX', debug: false });
 *
 * // Or use GTM.ID from ConfigManager as fallback
 * GTMLoader.init({ debug: false });
 *
 * // Push events to dataLayer
 * GTMLoader.push({ event: 'purchase', value: 100, currency: 'USD' });
 * GTMLoader.push({ event: 'page_view', page_title: 'Home' });
 *
 * // Configure transport URL at runtime
 * GTMLoader.configureTransport('https://gtm.your-domain.com/collect');
 *
 * @see {@link https://developers.google.com/tag-manager} Google Tag Manager Documentation
 * @see {@link https://developers.google.com/tag-platform/tag-manager/web/datalayer} dataLayer API
 * @see {@link https://developers.google.com/tag-platform/tag-manager/server-side} Server-side GTM
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
 * Get configuration value from ConfigManager with fallback
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
 * Build the GTM script URL based on proxy configuration
 * @param {string} gtmId - GTM container ID
 * @returns {string} Full URL for loading GTM script
 * @private
 */
function buildGtmScriptUrl(gtmId) {
  const proxyActive = getConfig('GTM.PROXY.ACTIVE', false);
  
  if (proxyActive) {
    const proxyDomain = getConfig('GTM.PROXY.DOMAIN');
    if (proxyDomain) {
      const url = `${proxyDomain}/gtm.js?id=${gtmId}`;
      log.debug('Using proxy URL:', url);
      return url;
    }
    log.warn('PROXY.ACTIVE is true but PROXY.DOMAIN is not set');
  }
  
  return `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
}

/**
 * Get the transport URL for server-side GTM
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
 * Get the default currency for e-commerce tracking
 * @returns {string} Currency code (e.g., 'USD', 'EUR')
 * @private
 */
function getDefaultCurrency() {
  return getConfig('GTM.CURRENCY', 'USD');
}

// ============= LOGGER =============

/**
 * Logger instance for GTMLoader
 * Uses centralized Logger module with fallback to console
 */
const log = Logger ? Logger.create('GTMLoader') : {
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

// ============= STATE =============

/**
 * Current transport URL (can be updated at runtime)
 * @type {string|undefined}
 * @private
 */
let currentTransportUrl = undefined;

/**
 * Initialization state
 * @type {boolean}
 * @private
 */
let isInitialized = false;

/**
 * Current GTM ID
 * @type {string|undefined}
 * @private
 */
let currentGtmId = undefined;

// ============= PUBLIC API =============

/**
 * @typedef {Object} GTMInitOptions
 * @property {string} [gtmId] - GTM container ID (format: GTM-XXXXX). If not provided, uses GTM.ID from ConfigManager
 * @property {boolean} [debug] - Enable debug logging (default: false)
 * @property {string} [currency] - Default currency for e-commerce (overrides GTM.CURRENCY config)
 * @property {boolean} [useProxy] - Force proxy usage (overrides GTM.PROXY.ACTIVE config)
 * @property {string} [transportUrl] - Server-side GTM URL (overrides GTM.TRANSPORT.URL config)
 * @description
 * Configuration options for initializing the GTM loader.
 */

/**
 * @typedef {Object} GTMDataLayerEvent
 * @property {string} [event] - Event name for GTM triggers
 * @property {number} [value] - Monetary value for e-commerce events
 * @property {string} [currency] - Currency code (e.g., 'USD', 'EUR'). Uses GTM.CURRENCY if not specified
 * @property {string} [transport_url] - Server-side GTM endpoint URL
 * @property {*} [...props] - Additional custom properties
 * @description
 * Object structure for dataLayer push events.
 * @see {@link https://developers.google.com/tag-platform/tag-manager/web/datalayer} dataLayer API
 */

/**
 * Initializes Google Tag Manager
 * @function init
 * @param {GTMInitOptions} [options={}] - Configuration options
 * @param {string} [options.gtmId] - GTM container ID (e.g., 'GTM-XXXXX'). Falls back to GTM.ID config
 * @param {boolean} [options.debug] - Enable debug logging
 * @param {string} [options.currency] - Override default currency
 * @param {boolean} [options.useProxy] - Force proxy usage
 * @param {string} [options.transportUrl] - Override server-side GTM URL
 * @returns {boolean} True if initialization was successful, false otherwise
 * @throws {Warning} Logs warning to console if GTM ID is not provided
 * @description
 * Initializes GTM by:
 * 1. Validating the GTM ID (from options or ConfigManager)
 * 2. Creating/initializing the dataLayer array
 * 3. Pushing the GTM start event with default currency
 * 4. Injecting transport_url if server-side GTM is enabled
 * 5. Injecting the GTM script tag (via proxy if configured)
 *
 * The script is loaded asynchronously to prevent blocking page rendering.
 * Supports server-side GTM via transport_url configuration.
 * Supports proxy loading for bypassing ad blockers.
 *
 * @example
 * // Basic initialization with explicit GTM ID
 * GTMLoader.init({ gtmId: 'GTM-ABC123' });
 *
 * // Using ConfigManager GTM.ID as fallback
 * GTMLoader.init({ debug: true });
 *
 * // With custom currency and transport URL
 * GTMLoader.init({
 *   gtmId: 'GTM-ABC123',
 *   currency: 'EUR',
 *   transportUrl: 'https://gtm.your-domain.com/collect'
 * });
 *
 * // Force proxy usage
 * GTMLoader.init({ gtmId: 'GTM-ABC123', useProxy: true });
 * @see {@link https://developers.google.com/tag-platform/tag-manager/web} GTM Web Implementation
 * @see {@link https://developers.google.com/tag-platform/tag-manager/server-side} Server-side GTM
 */
const init = (options = {}) => {
  // Get GTM ID from options or ConfigManager (GTM.ID as fallback)
  const gtmId = options.gtmId || getConfig('GTM.ID');
  
  if (!gtmId) {
    console.warn('[GTMLoader] GTM ID not provided and GTM.ID config is not set');
    return false;
  }

  // Store current GTM ID
  currentGtmId = gtmId;

  // Merge options into ConfigManager
  if (options.debug !== undefined) {
    if (typeof ConfigManager !== 'undefined' && ConfigManager.merge) {
      ConfigManager.merge({ COOKIE: { DEBUG: !!options.debug } });
    }
    LOCAL_CONFIG.DEBUG = !!options.debug;
  }

  // Override currency if provided
  if (options.currency !== undefined) {
    if (typeof ConfigManager !== 'undefined' && ConfigManager.set) {
      ConfigManager.set('GTM.CURRENCY', options.currency);
    }
  }

  // Override transport URL if provided
  if (options.transportUrl !== undefined) {
    currentTransportUrl = options.transportUrl;
  } else {
    currentTransportUrl = getTransportUrl();
  }

  // Initialize dataLayer
  window.dataLayer = window.dataLayer || [];
  
  // Build initial dataLayer push with currency and transport_url
  const initialPush = {
    'gtm.start': new Date().getTime(),
    event: 'gtm.js'
  };
  
  // Add default currency to dataLayer
  const defaultCurrency = options.currency || getDefaultCurrency();
  initialPush.currency = defaultCurrency;
  
  // Add transport_url if server-side GTM is enabled
  if (currentTransportUrl) {
    initialPush.transport_url = currentTransportUrl;
    log.debug('Server-side GTM enabled with transport_url:', currentTransportUrl);
  }
  
  // Check for proxy configuration
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

  // Load GTM script (via proxy if configured)
  const script = document.createElement('script');
  script.async = true;
  script.src = buildGtmScriptUrl(gtmId);

  script.onerror = () => {
    console.error('[GTMLoader] Failed to load GTM from:', script.src);
  };

  // Append script with error handling
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
    log('✅ GTM initialized:', gtmId);
  }
  
  return true;
};

/**
 * Configures server-side GTM transport URL at runtime
 * @function configureTransport
 * @param {string} url - Server-side GTM endpoint URL (e.g., 'https://gtm.your-domain.com/collect')
 * @returns {boolean} True if configuration was successful, false otherwise
 * @description
 * Updates the transport_url for server-side GTM at runtime.
 * This allows dynamic configuration of the server-side endpoint
 * after initial GTM load.
 *
 * The transport_url is pushed to the dataLayer and will be used
 * for subsequent GTM requests, enabling first-party tracking.
 *
 * @example
 * // Configure transport URL at runtime
 * GTMLoader.configureTransport('https://gtm.your-domain.com/collect');
 *
 * // Disable server-side GTM
 * GTMLoader.configureTransport(null);
 * @see {@link https://developers.google.com/tag-platform/tag-manager/server-side} Server-side GTM Documentation
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

  // Push transport_url to dataLayer for immediate effect
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    transport_url: url,
    event: 'gtm_transport_configured'
  });

  // Update ConfigManager if available
  if (typeof ConfigManager !== 'undefined' && ConfigManager.set) {
    ConfigManager.set('GTM.TRANSPORT.URL', url);
    ConfigManager.set('GTM.TRANSPORT.ACTIVE', true);
  }

  log.success('Server-side GTM transport URL configured:', url);
  return true;
};

/**
 * Pushes data to the GTM dataLayer
 * @function push
 * @param {GTMDataLayerEvent} data - Event data to push to dataLayer
 * @param {string} [data.event] - Event name for GTM triggers
 * @param {number} [data.value] - Monetary value for e-commerce
 * @param {string} [data.currency] - Currency code (uses GTM.CURRENCY if not specified)
 * @param {string} [data.transport_url] - Server-side GTM endpoint
 * @returns {void}
 * @description
 * Pushes an event object to the GTM dataLayer array.
 * Creates the dataLayer array if it doesn't exist.
 * Automatically adds default currency if not specified in e-commerce events.
 * Adds transport_url if server-side GTM is enabled.
 * Logs the event name when debug mode is enabled.
 *
 * Use this method to send custom events to GTM for tracking
 * user interactions, conversions, and other analytics data.
 *
 * @example
 * // Simple event
 * GTMLoader.push({ event: 'button_click', button_id: 'buy-now' });
 *
 * // E-commerce purchase (uses default currency if not specified)
 * GTMLoader.push({
 *   event: 'purchase',
 *   value: 99.99,
 *   currency: 'USD',
 *   transaction_id: 'TXN-12345'
 * });
 *
 * // E-commerce without currency (will use GTM.CURRENCY default)
 * GTMLoader.push({
 *   event: 'add_to_cart',
 *   value: 29.99
 * });
 *
 * // Page view
 * GTMLoader.push({
 *   event: 'page_view',
 *   page_title: document.title,
 *   page_location: window.location.href
 * });
 * @see {@link https://developers.google.com/tag-platform/tag-manager/web/datalayer} dataLayer API
 */
const push = (data) => {
  if (!data || typeof data !== 'object') {
    log.warn('Invalid data provided to push:', data);
    return;
  }

  window.dataLayer = window.dataLayer || [];
  
  // Clone data to avoid mutating the original object
  const enrichedData = { ...data };
  
  // Add default currency if not specified and event has value (e-commerce)
  if (enrichedData.value !== undefined && enrichedData.currency === undefined) {
    enrichedData.currency = getDefaultCurrency();
    log.debug('Added default currency:', enrichedData.currency);
  }
  
  // Add transport_url if server-side GTM is enabled and not already in data
  if (currentTransportUrl && enrichedData.transport_url === undefined) {
    enrichedData.transport_url = currentTransportUrl;
  }
  
  window.dataLayer.push(enrichedData);
  
  if (log.event) {
    log.event('Push dataLayer:', enrichedData.event || 'no-event', enrichedData);
  } else {
    log('📊 Push dataLayer:', enrichedData.event || 'no-event', enrichedData);
  }
};

/**
 * Gets the current GTM configuration status
 * @function getStatus
 * @returns {Object} Current GTM loader status
 * @property {boolean} initialized - Whether GTM has been initialized
 * @property {string|undefined} gtmId - Current GTM container ID
 * @property {string|undefined} transportUrl - Current server-side GTM URL
 * @property {string} currency - Default currency for e-commerce
 * @property {boolean} proxyActive - Whether proxy mode is enabled
 * @property {boolean} transportActive - Whether server-side GTM is enabled
 * @description
 * Returns the current status and configuration of the GTMLoader.
 * Useful for debugging and monitoring the GTM setup.
 *
 * @example
 * const status = GTMLoader.getStatus();
 * console.log('GTM initialized:', status.initialized);
 * console.log('GTM ID:', status.gtmId);
 * console.log('Transport URL:', status.transportUrl);
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

/**
 * GTMLoader public API
 * @constant {Object}
 * @property {Function} init - Initialize GTM
 * @property {Function} push - Push events to dataLayer
 * @property {Function} configureTransport - Configure server-side GTM URL
 * @property {Function} getStatus - Get current configuration status
 * @property {Object} CONFIG - Configuration constants
 * @description
 * Main export containing all public methods for Google Tag Manager integration.
 * Provides GTM initialization, event pushing, and server-side configuration capabilities.
 * @see {@link init}
 * @see {@link push}
 * @see {@link configureTransport}
 * @see {@link getStatus}
 */

/**
 * Re-export ConfigManager for external access
 */
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

// Browser global fallback
if (typeof window !== 'undefined') {
  window.GTMLoader = GTMLoader;
}
