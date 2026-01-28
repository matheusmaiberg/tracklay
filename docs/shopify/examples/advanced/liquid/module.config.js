/**
 * @fileoverview Centralized Configuration Manager for the Tracklay pixel tracking system.
 * Provides a unified API for managing configuration across all modules with validation,
 * deep merging, and path-based access.
 * @module config
 * @author Tracklay Team
 * @version 2.0.0
 *
 * @description
 * This module serves as the single source of truth for all Tracklay configuration settings.
 * It provides a ConfigManager API with methods to get, set, merge and initialize configurations.
 * All settings are organized into logical namespaces for different functional areas.
 *
 * @example
 * // Import and use ConfigManager
 * import { ConfigManager } from './module.config.js';
 *
 * // Get configuration values
 * const gtmId = ConfigManager.get('GTM.ID');
 * const maxSize = ConfigManager.get('COOKIE.MAX_SIZE');
 *
 * // Set configuration values
 * ConfigManager.set('GTM.ID', 'GTM-XXXXX');
 * ConfigManager.set('COOKIE.DEBUG', true);
 *
 * // Merge configurations
 * ConfigManager.merge({
 *   COOKIE: { DEBUG: true, MAX_SIZE: 5000 },
 *   GTM: { CURRENCY: 'USD' }
 * });
 *
 * // Initialize with user options
 * ConfigManager.init({
 *   gtmId: 'GTM-XXXXX',
 *   debug: true,
 *   cookiePrefix: '_myapp_'
 * });
 *
 * @see {@link https://developers.google.com/tag-manager} Google Tag Manager Documentation
 */

// ============================================
// TYPE DEFINITIONS
// ============================================

/**
 * @typedef {Object} GtmConfig
 * @property {string} ID - The GTM container ID for tracking
 * @property {string} CURRENCY - Default currency code for e-commerce tracking
 * @property {Object} TRANSPORT - Data transmission configuration
 * @property {boolean} TRANSPORT.ACTIVE - Whether transport layer is enabled
 * @property {string} TRANSPORT.URL - Endpoint URL for data collection
 * @property {Object} PROXY - Proxy server configuration for CORS handling
 * @property {boolean} PROXY.ACTIVE - Whether proxy routing is enabled
 * @property {string} PROXY.PATH - Unique path segment for proxy routing
 * @property {string} PROXY.DOMAIN - Computed full proxy domain URL
 */

/**
 * @typedef {Object} CookieConfig
 * @property {string} COOKIE_PREFIX - Prefix for all Tracklay cookies
 * @property {string} DB_NAME - IndexedDB database name
 * @property {number} DB_VERSION - IndexedDB schema version
 * @property {string} STORE_NAME - IndexedDB object store name
 * @property {boolean} COMPRESSION_ENABLED - Whether to compress stored data
 * @property {boolean} DEBUG - Debug mode for cookie operations
 * @property {boolean} ACTIVE - Master switch for cookie functionality
 * @property {string} PREFIX - Alternative prefix reference
 * @property {number} MAX_SIZE - Maximum cookie size in bytes (4KB limit)
 * @property {number} EXPIRY_DAYS - Cookie expiry time in days
 * @property {number} POLL_INTERVAL - Polling interval in milliseconds
 * @property {number} MAX_HISTORY_SIZE - Maximum event history size for deduplication
 * @property {number} HISTORY_EVICTION_PERCENT - Percentage of entries to evict when limit exceeded
 * @property {Object} POLLER - Polling configuration for event processing
 * @property {number} POLLER.INTERVAL_MIN - Minimum polling interval in ms
 * @property {number} POLLER.INTERVAL_MAX - Maximum polling interval in ms
 * @property {number} POLLER.EXPIRY - Cookie expiry time in days
 * @property {number} POLLER.TTL - Time-to-live for cached entries in minutes
 */

/**
 * @typedef {Object} DeduplicatorConfig
 * @property {number} MAX_CACHE_SIZE - Maximum number of events in deduplication cache
 * @property {string[]} FINGERPRINT_FIELDS - Field paths for event fingerprinting
 */

/**
 * @typedef {Object} EventOrchestratorConfig
 * @property {boolean} DEBUG - Debug mode for event orchestrator
 * @property {string} CHANNEL_NAME - Broadcast channel name for cross-tab communication
 * @property {number} MAX_DATALAYER_SIZE - Maximum dataLayer size to prevent memory leaks
 */

/**
 * @typedef {Object} BroadcastConfig
 * @property {string} CHANNEL - Name of the BroadcastChannel for event synchronization
 */

/**
 * @typedef {Object} EventsConfig
 * @property {string[]} MARKETING - List of marketing event names to track
 * @property {string[]} IGNORE - List of event names to ignore/filter out
 */

/**
 * @typedef {Object} FingerprintConfig
 * @property {string[]} FINGERPRINT_FIELDS - Dot-notation paths to fields used for event fingerprinting
 */

/**
 * @typedef {Object} InitOptions
 * @property {string} [gtmId] - GTM container ID
 * @property {boolean} [debug] - Global debug mode
 * @property {string} [cookiePrefix] - Custom cookie prefix
 * @property {string} [currency] - Default currency code
 * @property {number} [maxCookieSize] - Maximum cookie size in bytes
 */

// ============================================
// DEFAULT CONFIGURATION
// ============================================

/**
 * Immutable default configuration object.
 * This is the base configuration that can be overridden at runtime.
 * @constant {Object}
 * @readonly
 */
const DEFAULT_CONFIG = Object.freeze({
  /**
   * Google Tag Manager integration settings.
   * @type {GtmConfig}
   */
  GTM: Object.freeze({
    /** @type {string} GTM container identifier */
    ID: 'MJ7DW8H',
    /** @type {string} Default currency for monetary values */
    CURRENCY: 'EUR',
    /** @type {Object} Data transmission settings */
    TRANSPORT: Object.freeze({
      /** @type {boolean} Enable/disable data transport */
      ACTIVE: true,
      /** @type {string} Data collection endpoint URL */
      URL: 'https://data.suevich.com/'.concat(this.PROXY.PATH)
    }),
    /** @type {Object} CORS proxy configuration */
    PROXY: Object.freeze({
      /** @type {boolean} Enable proxy routing */
      ACTIVE: true,
      /** @type {string} Unique proxy path identifier */
      PATH: 'b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f',
      /**
       * Computed proxy domain URL.
       * @type {string}
       * @returns {string} Full proxy domain URL
       */
      get DOMAIN() {
        return `https://cdn.suevich.com/${this.PATH}`;
      }
    })
  }),

  /**
   * Cookie and IndexedDB storage configuration.
   * Unified from cookie-tracker.js
   * @type {CookieConfig}
   */
  COOKIE: Object.freeze({
    /** @type {string} Prefix for all cookie names */
    COOKIE_PREFIX: '_tracklay_',
    /** @type {string} Alternative prefix reference */
    PREFIX: '_tracklay_',
    /** @type {string} IndexedDB database name */
    DB_NAME: 'TracklayEventBridge',
    /** @type {string} IndexedDB object store name */
    STORE_NAME: 'events',
    /** @type {number} IndexedDB schema version number */
    DB_VERSION: 1,
    /** @type {boolean} Enable data compression for storage */
    COMPRESSION_ENABLED: true,
    /** @type {boolean} Enable debug logging for cookie operations */
    DEBUG: false,
    /** @type {boolean} Master toggle for cookie functionality */
    ACTIVE: true,
    /** @type {number} Maximum cookie size in bytes (4KB browser limit) */
    MAX_SIZE: 4000,
    /** @type {number} Cookie expiration time in days */
    EXPIRY_DAYS: 7,
    /** @type {number} Polling interval in milliseconds */
    POLL_INTERVAL: 1000,
    /** @type {number} Maximum event history size for deduplication */
    MAX_HISTORY_SIZE: 1000,
    /** @type {number} Percentage of entries to evict when limit exceeded (0.2 = 20%) */
    HISTORY_EVICTION_PERCENT: 0.2,
    /** @type {Object} Event polling configuration */
    POLLER: Object.freeze({
      /** @type {number} Minimum polling interval in milliseconds */
      INTERVAL_MIN: 300,
      /** @type {number} Maximum polling interval in milliseconds */
      INTERVAL_MAX: 5000,
      /** @type {number} Cookie expiration time in days */
      EXPIRY: 7,
      /** @type {number} Cache entry TTL in minutes */
      TTL: 5
    })
  }),

  /**
   * Deduplicator configuration.
   * Unified from deduplicator.js
   * @type {DeduplicatorConfig}
   */
  DEDUPLICATOR: Object.freeze({
    /** @type {number} Maximum number of events in deduplication cache */
    MAX_CACHE_SIZE: 1000,
    /** @type {string[]} Field paths for event fingerprinting */
    FINGERPRINT_FIELDS: Object.freeze([
      'name',
      'data.transaction_id',
      'data.value',
      'data.currency'
    ])
  }),

  /**
   * Event Orchestrator configuration.
   * Unified from event-orchestrator.js
   * @type {EventOrchestratorConfig}
   */
  EVENT_ORCHESTRATOR: Object.freeze({
    /** @type {boolean} Debug mode for event orchestrator */
    DEBUG: true,
    /** @type {string} Broadcast channel name for cross-tab communication */
    CHANNEL_NAME: '_tracklay_events',
    /** @type {number} Maximum dataLayer size to prevent memory leaks */
    MAX_DATALAYER_SIZE: 100
  }),

  /**
   * Broadcast channel configuration for cross-tab synchronization.
   * @type {BroadcastConfig}
   */
  BROADCAST: Object.freeze({
    /** @type {string} BroadcastChannel name for event sync */
    CHANNEL: '_tracklay_events'
  }),

  /**
   * Event categorization and filtering rules.
   * @type {EventsConfig}
   */
  EVENTS: Object.freeze({
    /** @type {string[]} Marketing conversion events to track */
    MARKETING: Object.freeze([
      'product_added_to_cart',
      'checkout_started',
      'checkout_completed',
      'payment_info_submitted'
    ]),
    /** @type {string[]} Events to filter out (empty = allow all) */
    IGNORE: Object.freeze([])
  }),

  /**
   * Field paths used for generating event fingerprints.
   * These dot-notation paths identify fields used to detect duplicate events.
   * @type {string[]}
   */
  FINGERPRINT_FIELDS: Object.freeze([
    'name',
    'data.checkout.order.id',
    'data.value',
    'data.currency'
  ]),

  /**
   * GTM Loader configuration.
   * Unified from gtm-loader.js
   * @type {Object}
   */
  GTM_LOADER: Object.freeze({
    /** @type {boolean} Debug mode for GTM loader */
    DEBUG: false
  }),

  /**
   * Logger configuration.
   * Unified from module.logger.js
   * @type {Object}
   */
  LOGGER: Object.freeze({
    /** @type {number} Global log level (0=silent, 1=error, 2=warn, 3=info, 4=debug) */
    LEVEL: 4,
    /** @type {boolean} Enable visual styling in console output */
    STYLING: true,
    /** @type {string} Global prefix for all log messages */
    GLOBAL_PREFIX: '[Tracklay]',
    /** @type {boolean} Include ISO timestamps in log output */
    TIMESTAMP: false,
    /** @type {Array<string>} List of silenced module names */
    SILENCED: Object.freeze([])
  })
});

// ============================================
// CONFIG MANAGER STATE
// ============================================

/**
 * Current mutable configuration state.
 * Initialized as a deep clone of DEFAULT_CONFIG.
 * @type {Object}
 */
let currentConfig = deepClone(DEFAULT_CONFIG);

/**
 * Validation rules for configuration values.
 * @constant {Object}
 */
const VALIDATION_RULES = Object.freeze({
  'GTM.ID': { type: 'string', pattern: /^GTM-[A-Z0-9]+$/i },
  'GTM.CURRENCY': { type: 'string', pattern: /^[A-Z]{3}$/ },
  'GTM.TRANSPORT.ACTIVE': { type: 'boolean' },
  'GTM.TRANSPORT.URL': { type: 'string', pattern: /^https?:\/\/.+/ },
  'GTM.PROXY.ACTIVE': { type: 'boolean' },
  'GTM.PROXY.PATH': { type: 'string' },
  'COOKIE.COOKIE_PREFIX': { type: 'string' },
  'COOKIE.PREFIX': { type: 'string' },
  'COOKIE.DB_NAME': { type: 'string' },
  'COOKIE.STORE_NAME': { type: 'string' },
  'COOKIE.DB_VERSION': { type: 'number', min: 1 },
  'COOKIE.COMPRESSION_ENABLED': { type: 'boolean' },
  'COOKIE.DEBUG': { type: 'boolean' },
  'COOKIE.ACTIVE': { type: 'boolean' },
  'COOKIE.MAX_SIZE': { type: 'number', min: 100, max: 8000 },
  'COOKIE.EXPIRY_DAYS': { type: 'number', min: 0.001 },
  'COOKIE.POLL_INTERVAL': { type: 'number', min: 100 },
  'COOKIE.MAX_HISTORY_SIZE': { type: 'number', min: 100 },
  'COOKIE.HISTORY_EVICTION_PERCENT': { type: 'number', min: 0.01, max: 1 },
  'COOKIE.POLLER.INTERVAL_MIN': { type: 'number', min: 50 },
  'COOKIE.POLLER.INTERVAL_MAX': { type: 'number', min: 100 },
  'COOKIE.POLLER.EXPIRY': { type: 'number', min: 1 },
  'COOKIE.POLLER.TTL': { type: 'number', min: 1 },
  'DEDUPLICATOR.MAX_CACHE_SIZE': { type: 'number', min: 10 },
  'DEDUPLICATOR.FINGERPRINT_FIELDS': { type: 'array' },
  'EVENT_ORCHESTRATOR.DEBUG': { type: 'boolean' },
  'EVENT_ORCHESTRATOR.CHANNEL_NAME': { type: 'string' },
  'EVENT_ORCHESTRATOR.MAX_DATALAYER_SIZE': { type: 'number', min: 10 },
  'BROADCAST.CHANNEL': { type: 'string' },
  'EVENTS.MARKETING': { type: 'array' },
  'EVENTS.IGNORE': { type: 'array' },
  'FINGERPRINT_FIELDS': { type: 'array' },
  'GTM_LOADER.DEBUG': { type: 'boolean' },
  'LOGGER.LEVEL': { type: 'number', min: 0, max: 4 },
  'LOGGER.STYLING': { type: 'boolean' },
  'LOGGER.GLOBAL_PREFIX': { type: 'string' },
  'LOGGER.TIMESTAMP': { type: 'boolean' },
  'LOGGER.SILENCED': { type: 'array' }
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Deep clones an object, handling nested objects and arrays.
 * @param {*} obj - Object to clone
 * @returns {*} Deep cloned object
 * @private
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }
  
  if (Object.getPrototypeOf(obj) === Object.prototype) {
    const cloned = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        cloned[key] = deepClone(obj[key]);
      }
    }
    return cloned;
  }
  
  // For other objects (including those with getters), return as-is
  return obj;
}

/**
 * Deep merges source object into target object.
 * @param {Object} target - Target object
 * @param {Object} source - Source object to merge
 * @returns {Object} Merged object
 * @private
 */
function deepMerge(target, source) {
  const result = deepClone(target);
  
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (
        source[key] &&
        typeof source[key] === 'object' &&
        !Array.isArray(source[key]) &&
        Object.getPrototypeOf(source[key]) === Object.prototype &&
        result[key] &&
        typeof result[key] === 'object' &&
        !Array.isArray(result[key])
      ) {
        result[key] = deepMerge(result[key], source[key]);
      } else {
        result[key] = deepClone(source[key]);
      }
    }
  }
  
  return result;
}

/**
 * Gets a nested value from an object using dot notation path.
 * @param {Object} obj - Object to traverse
 * @param {string} path - Dot notation path (e.g., 'COOKIE.MAX_SIZE')
 * @returns {*} Value at path or undefined
 * @private
 */
function getPath(obj, path) {
  if (!path || typeof path !== 'string') {
    return undefined;
  }
  
  const parts = path.split('.');
  let current = obj;
  
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = current[part];
  }
  
  return current;
}

/**
 * Sets a nested value in an object using dot notation path.
 * @param {Object} obj - Object to modify
 * @param {string} path - Dot notation path (e.g., 'COOKIE.MAX_SIZE')
 * @param {*} value - Value to set
 * @returns {boolean} True if set was successful
 * @private
 */
function setPath(obj, path, value) {
  if (!path || typeof path !== 'string') {
    return false;
  }
  
  const parts = path.split('.');
  let current = obj;
  
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined || typeof current[part] !== 'object') {
      current[part] = {};
    }
    current = current[part];
  }
  
  current[parts[parts.length - 1]] = value;
  return true;
}

/**
 * Validates a configuration value against rules.
 * @param {string} path - Configuration path
 * @param {*} value - Value to validate
 * @returns {Object} Validation result { valid: boolean, error?: string }
 * @private
 */
function validateValue(path, value) {
  const rules = VALIDATION_RULES[path];
  
  if (!rules) {
    // No specific rules, accept any value
    return { valid: true };
  }
  
  // Type validation
  if (rules.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rules.type) {
      return {
        valid: false,
        error: `Invalid type for ${path}: expected ${rules.type}, got ${actualType}`
      };
    }
  }
  
  // Pattern validation (for strings)
  if (rules.pattern && typeof value === 'string') {
    if (!rules.pattern.test(value)) {
      return {
        valid: false,
        error: `Invalid format for ${path}: does not match required pattern`
      };
    }
  }
  
  // Min/Max validation (for numbers)
  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) {
      return {
        valid: false,
        error: `Value for ${path} must be >= ${rules.min}`
      };
    }
    if (rules.max !== undefined && value > rules.max) {
      return {
        valid: false,
        error: `Value for ${path} must be <= ${rules.max}`
      };
    }
  }
  
  return { valid: true };
}

/**
 * Logs a warning message.
 * @param {string} message - Message to log
 * @private
 */
function logWarning(message) {
  if (typeof console !== 'undefined' && console.warn) {
    console.warn(`[ConfigManager] ${message}`);
  }
}

/**
 * Logs an info message.
 * @param {string} message - Message to log
 * @private
 */
function logInfo(message) {
  if (typeof console !== 'undefined' && console.info) {
    console.info(`[ConfigManager] ${message}`);
  }
}

// ============================================
// CONFIG MANAGER API
// ============================================

/**
 * Configuration Manager - Centralized configuration management API.
 * Provides methods to get, set, merge and initialize configuration values.
 * 
 * @namespace ConfigManager
 */
export const ConfigManager = {
  /**
   * Gets a configuration value by path.
   * 
   * @function get
   * @memberof ConfigManager
   * @param {string} path - Dot notation path (e.g., 'COOKIE.MAX_SIZE')
   * @param {*} [defaultValue] - Default value if path not found
   * @returns {*} Configuration value or defaultValue
   * 
   * @example
   * const maxSize = ConfigManager.get('COOKIE.MAX_SIZE');
   * const gtmId = ConfigManager.get('GTM.ID', 'GTM-XXXXX');
   */
  get(path, defaultValue) {
    const value = getPath(currentConfig, path);
    return value !== undefined ? value : defaultValue;
  },

  /**
   * Sets a configuration value by path.
   * Validates the value before setting and logs warnings for invalid values.
   * 
   * @function set
   * @memberof ConfigManager
   * @param {string} path - Dot notation path (e.g., 'COOKIE.MAX_SIZE')
   * @param {*} value - Value to set
   * @returns {boolean} True if set was successful, false if validation failed
   * 
   * @example
   * ConfigManager.set('COOKIE.MAX_SIZE', 5000);
   * ConfigManager.set('GTM.DEBUG', true);
   */
  set(path, value) {
    // Validate the value
    const validation = validateValue(path, value);
    if (!validation.valid) {
      logWarning(validation.error);
      return false;
    }
    
    // Check if path is trying to modify a getter-only property
    const parts = path.split('.');
    let current = currentConfig;
    for (let i = 0; i < parts.length - 1; i++) {
      if (current === null || (current !== undefined && typeof current !== 'object')) {
        logWarning(`Invalid path: ${path}`);
        return false;
      }
      current = current?.[parts[i]];
    }
    
    const lastPart = parts[parts.length - 1];
    if (current && Object.getOwnPropertyDescriptor(current, lastPart)?.get && 
        !Object.getOwnPropertyDescriptor(current, lastPart)?.set) {
      logWarning(`Cannot set read-only property: ${path}`);
      return false;
    }
    
    setPath(currentConfig, path, value);
    return true;
  },

  /**
   * Deep merges an object into the current configuration.
   * 
   * @function merge
   * @memberof ConfigManager
   * @param {Object} overrides - Object with configuration overrides
   * @returns {boolean} True if merge was successful
   * 
   * @example
   * ConfigManager.merge({
   *   COOKIE: { DEBUG: true, MAX_SIZE: 5000 },
   *   GTM: { CURRENCY: 'USD' }
   * });
   */
  merge(overrides) {
    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
      logWarning('merge() expects a plain object');
      return false;
    }
    
    // Validate each override before applying
    for (const namespace in overrides) {
      if (Object.prototype.hasOwnProperty.call(overrides, namespace)) {
        const nsValue = overrides[namespace];
        if (typeof nsValue === 'object' && !Array.isArray(nsValue)) {
          for (const key in nsValue) {
            if (Object.prototype.hasOwnProperty.call(nsValue, key)) {
              const path = `${namespace}.${key}`;
              const validation = validateValue(path, nsValue[key]);
              if (!validation.valid) {
                logWarning(validation.error);
                // Continue with merge but log the warning
              }
            }
          }
        }
      }
    }
    
    currentConfig = deepMerge(currentConfig, overrides);
    return true;
  },

  /**
   * Initializes the configuration with user options.
   * Provides a convenient API for common initialization scenarios.
   * 
   * @function init
   * @memberof ConfigManager
   * @param {InitOptions} [options={}] - Initialization options
   * @returns {boolean} True if initialization was successful
   * 
   * @example
   * ConfigManager.init({
   *   gtmId: 'GTM-XXXXX',
   *   debug: true,
   *   cookiePrefix: '_myapp_',
   *   currency: 'USD',
   *   maxCookieSize: 5000
   * });
   */
  init(options = {}) {
    if (!options || typeof options !== 'object') {
      logWarning('init() expects an options object');
      return false;
    }
    
    const overrides = {};
    
    // Map common initialization options
    if (options.gtmId !== undefined) {
      overrides.GTM = overrides.GTM || {};
      overrides.GTM.ID = options.gtmId;
    }
    
    if (options.debug !== undefined) {
      const debugValue = !!options.debug;
      overrides.COOKIE = overrides.COOKIE || {};
      overrides.COOKIE.DEBUG = debugValue;
      overrides.EVENT_ORCHESTRATOR = overrides.EVENT_ORCHESTRATOR || {};
      overrides.EVENT_ORCHESTRATOR.DEBUG = debugValue;
      overrides.GTM_LOADER = overrides.GTM_LOADER || {};
      overrides.GTM_LOADER.DEBUG = debugValue;
    }
    
    if (options.cookiePrefix !== undefined) {
      overrides.COOKIE = overrides.COOKIE || {};
      overrides.COOKIE.COOKIE_PREFIX = options.cookiePrefix;
      overrides.COOKIE.PREFIX = options.cookiePrefix;
      overrides.BROADCAST = overrides.BROADCAST || {};
      overrides.BROADCAST.CHANNEL = options.cookiePrefix + 'events';
      overrides.EVENT_ORCHESTRATOR = overrides.EVENT_ORCHESTRATOR || {};
      overrides.EVENT_ORCHESTRATOR.CHANNEL_NAME = options.cookiePrefix + 'events';
    }
    
    if (options.currency !== undefined) {
      overrides.GTM = overrides.GTM || {};
      overrides.GTM.CURRENCY = options.currency;
    }
    
    if (options.maxCookieSize !== undefined) {
      overrides.COOKIE = overrides.COOKIE || {};
      overrides.COOKIE.MAX_SIZE = options.maxCookieSize;
    }
    
    // Apply any additional overrides from options
    if (options.overrides && typeof options.overrides === 'object') {
      this.merge(options.overrides);
    }
    
    // Apply the mapped overrides
    const result = this.merge(overrides);
    
    if (result) {
      logInfo('Configuration initialized successfully');
    }
    
    return result;
  },

  /**
   * Gets the complete current configuration.
   * Returns a deep clone to prevent external mutations.
   * 
   * @function getAll
   * @memberof ConfigManager
   * @returns {Object} Complete configuration object (cloned)
   * 
   * @example
   * const config = ConfigManager.getAll();
   * console.log(config.GTM.ID);
   */
  getAll() {
    return deepClone(currentConfig);
  },

  /**
   * Resets the configuration to default values.
   * 
   * @function reset
   * @memberof ConfigManager
   * @returns {boolean} True if reset was successful
   * 
   * @example
   * ConfigManager.reset();
   */
  reset() {
    currentConfig = deepClone(DEFAULT_CONFIG);
    logInfo('Configuration reset to defaults');
    return true;
  },

  /**
   * Gets a specific namespace configuration.
   * 
   * @function getNamespace
   * @memberof ConfigManager
   * @param {string} namespace - Namespace name (e.g., 'COOKIE', 'GTM')
   * @returns {Object|undefined} Namespace configuration or undefined
   * 
   * @example
   * const cookieConfig = ConfigManager.getNamespace('COOKIE');
   */
  getNamespace(namespace) {
    return currentConfig[namespace] ? deepClone(currentConfig[namespace]) : undefined;
  },

  /**
   * Checks if a configuration path exists.
   * 
   * @function has
   * @memberof ConfigManager
   * @param {string} path - Dot notation path
   * @returns {boolean} True if path exists
   * 
   * @example
   * if (ConfigManager.has('COOKIE.MAX_SIZE')) { ... }
   */
  has(path) {
    return getPath(currentConfig, path) !== undefined;
  },

  /**
   * Gets the default configuration (immutable).
   * 
   * @function getDefaults
   * @memberof ConfigManager
   * @returns {Object} Default configuration object
   * 
   * @example
   * const defaults = ConfigManager.getDefaults();
   */
  getDefaults() {
    return DEFAULT_CONFIG;
  }
};

// ============================================
// BACKWARD COMPATIBILITY
// ============================================

/**
 * Legacy CONFIG export for backward compatibility.
 * This is a proxy that reads from the current configuration.
 * @deprecated Use ConfigManager.get() or ConfigManager.getAll() instead
 */
export const CONFIG = new Proxy({}, {
  get(target, prop) {
    if (currentConfig[prop]) {
      return currentConfig[prop];
    }
    return target[prop];
  },
  set(target, prop, value) {
    logWarning(`Direct assignment to CONFIG is deprecated. Use ConfigManager.set('${prop}.key', value)`);
    return true;
  }
});

// ============================================
// BROWSER GLOBAL
// ============================================

/**
 * Browser global fallback assignment.
 * Makes the ConfigManager available as window.ConfigManager in browser environments
 * for debugging and legacy script compatibility.
 */
if (typeof window !== 'undefined') {
  window.ConfigManager = ConfigManager;
  window.PixelConfig = CONFIG;
  window.PixelConfigAPI = ConfigManager;
}

// ============================================
// DEFAULT EXPORT
// ============================================

export default ConfigManager;
