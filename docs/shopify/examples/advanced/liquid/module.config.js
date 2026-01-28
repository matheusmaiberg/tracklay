/**
 * @fileoverview Centralized Configuration Manager for the Tracklay pixel tracking system.
 * Provides a unified API for managing configuration across all modules.
 */

const DEFAULT_CONFIG = Object.freeze({
  GTM: Object.freeze({
    ID: 'MJ7DW8H',
    CURRENCY: 'EUR',
    TRANSPORT: Object.freeze({ ACTIVE: true, URL: 'https://data.suevich.com/' }),
    PROXY: { ACTIVE: true, PATH: 'b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f', DOMAIN: 'https://cdn.suevich.com/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f' }
  }),
  COOKIE: Object.freeze({
    COOKIE_PREFIX: '_tracklay_', PREFIX: '_tracklay_', DB_NAME: 'TracklayEventBridge',
    STORE_NAME: 'events', DB_VERSION: 1, COMPRESSION_ENABLED: true, DEBUG: false, ACTIVE: true,
    MAX_SIZE: 4000, EXPIRY_DAYS: 7, POLL_INTERVAL: 1000, MAX_HISTORY_SIZE: 1000, HISTORY_EVICTION_PERCENT: 0.2,
    POLLER: Object.freeze({ INTERVAL_MIN: 300, INTERVAL_MAX: 5000, EXPIRY: 7, TTL: 5 })
  }),
  DEDUPLICATOR: Object.freeze({
    MAX_CACHE_SIZE: 1000,
    FINGERPRINT_FIELDS: Object.freeze(['name', 'data.transaction_id', 'data.value', 'data.currency'])
  }),
  EVENT_ORCHESTRATOR: Object.freeze({ DEBUG: true, CHANNEL_NAME: '_tracklay_events', MAX_DATALAYER_SIZE: 100 }),
  BROADCAST: Object.freeze({ CHANNEL: '_tracklay_events' }),
  EVENTS: Object.freeze({
    MARKETING: Object.freeze(['product_added_to_cart', 'checkout_started', 'checkout_completed', 'payment_info_submitted']),
    IGNORE: Object.freeze([])
  }),
  FINGERPRINT_FIELDS: Object.freeze(['name', 'data.checkout.order.id', 'data.value', 'data.currency']),
  GTM_LOADER: Object.freeze({ DEBUG: false }),
  LOGGER: Object.freeze({ LEVEL: 4, STYLING: true, GLOBAL_PREFIX: '', TIMESTAMP: false, SILENCED: Object.freeze([]) })
});

let currentConfig = deepClone(DEFAULT_CONFIG);

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

function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (Array.isArray(obj)) return obj.map(item => deepClone(item));
  if (Object.getPrototypeOf(obj) === Object.prototype) {
    const cloned = {};
    for (const key in obj) if (Object.prototype.hasOwnProperty.call(obj, key)) cloned[key] = deepClone(obj[key]);
    return cloned;
  }
  return obj;
}

function deepMerge(target, source) {
  const result = deepClone(target);
  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key]) &&
          Object.getPrototypeOf(source[key]) === Object.prototype &&
          result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
        result[key] = deepMerge(result[key], source[key]);
      } else {
        result[key] = deepClone(source[key]);
      }
    }
  }
  return result;
}

function getPath(obj, path) {
  if (!path || typeof path !== 'string') return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') return undefined;
    current = current[part];
  }
  return current;
}

function setPath(obj, path, value) {
  if (!path || typeof path !== 'string') return false;
  const parts = path.split('.');
  let current = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (current[part] === undefined || typeof current[part] !== 'object') current[part] = {};
    current = current[part];
  }
  current[parts[parts.length - 1]] = value;
  return true;
}

function validateValue(path, value) {
  const rules = VALIDATION_RULES[path];
  if (!rules) return { valid: true };
  if (rules.type) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rules.type) return { valid: false, error: `Invalid type for ${path}: expected ${rules.type}, got ${actualType}` };
  }
  if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
    return { valid: false, error: `Invalid format for ${path}: does not match required pattern` };
  }
  if (typeof value === 'number') {
    if (rules.min !== undefined && value < rules.min) return { valid: false, error: `Value for ${path} must be >= ${rules.min}` };
    if (rules.max !== undefined && value > rules.max) return { valid: false, error: `Value for ${path} must be <= ${rules.max}` };
  }
  return { valid: true };
}

function logWarning(message) {
  if (typeof console !== 'undefined' && console.warn) console.warn(`[ConfigManager] ${message}`);
}

function logInfo(message) {
  if (typeof console !== 'undefined' && console.info) console.info(`[ConfigManager] ${message}`);
}

export const ConfigManager = {
  get(path, defaultValue) {
    const value = getPath(currentConfig, path);
    return value !== undefined ? value : defaultValue;
  },
  set(path, value) {
    const validation = validateValue(path, value);
    if (!validation.valid) { logWarning(validation.error); return false; }
    const parts = path.split('.');
    let current = currentConfig;
    for (let i = 0; i < parts.length - 1; i++) {
      if (current === null || (current !== undefined && typeof current !== 'object')) {
        logWarning(`Invalid path: ${path}`); return false;
      }
      current = current?.[parts[i]];
    }
    const lastPart = parts[parts.length - 1];
    if (current && Object.getOwnPropertyDescriptor(current, lastPart)?.get && 
        !Object.getOwnPropertyDescriptor(current, lastPart)?.set) {
      logWarning(`Cannot set read-only property: ${path}`); return false;
    }
    setPath(currentConfig, path, value); return true;
  },
  merge(overrides) {
    if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) {
      logWarning('merge() expects a plain object'); return false;
    }
    for (const namespace in overrides) {
      if (Object.prototype.hasOwnProperty.call(overrides, namespace)) {
        const nsValue = overrides[namespace];
        if (typeof nsValue === 'object' && !Array.isArray(nsValue)) {
          for (const key in nsValue) {
            if (Object.prototype.hasOwnProperty.call(nsValue, key)) {
              const validation = validateValue(`${namespace}.${key}`, nsValue[key]);
              if (!validation.valid) logWarning(validation.error);
            }
          }
        }
      }
    }
    currentConfig = deepMerge(currentConfig, overrides); return true;
  },
  init(options = {}) {
    if (!options || typeof options !== 'object') { logWarning('init() expects an options object'); return false; }
    const overrides = {};
    if (options.gtmId !== undefined) { overrides.GTM = overrides.GTM || {}; overrides.GTM.ID = options.gtmId; }
    if (options.debug !== undefined) {
      const debugValue = !!options.debug;
      overrides.COOKIE = overrides.COOKIE || {}; overrides.COOKIE.DEBUG = debugValue;
      overrides.EVENT_ORCHESTRATOR = overrides.EVENT_ORCHESTRATOR || {}; overrides.EVENT_ORCHESTRATOR.DEBUG = debugValue;
      overrides.GTM_LOADER = overrides.GTM_LOADER || {}; overrides.GTM_LOADER.DEBUG = debugValue;
    }
    if (options.cookiePrefix !== undefined) {
      overrides.COOKIE = overrides.COOKIE || {}; overrides.COOKIE.COOKIE_PREFIX = options.cookiePrefix; overrides.COOKIE.PREFIX = options.cookiePrefix;
      overrides.BROADCAST = overrides.BROADCAST || {}; overrides.BROADCAST.CHANNEL = options.cookiePrefix + 'events';
      overrides.EVENT_ORCHESTRATOR = overrides.EVENT_ORCHESTRATOR || {}; overrides.EVENT_ORCHESTRATOR.CHANNEL_NAME = options.cookiePrefix + 'events';
    }
    if (options.currency !== undefined) { overrides.GTM = overrides.GTM || {}; overrides.GTM.CURRENCY = options.currency; }
    if (options.maxCookieSize !== undefined) { overrides.COOKIE = overrides.COOKIE || {}; overrides.COOKIE.MAX_SIZE = options.maxCookieSize; }
    if (options.overrides && typeof options.overrides === 'object') this.merge(options.overrides);
    const result = this.merge(overrides);
    if (result) logInfo('Configuration initialized successfully');
    return result;
  },
  getAll() { return deepClone(currentConfig); },
  reset() { currentConfig = deepClone(DEFAULT_CONFIG); logInfo('Configuration reset to defaults'); return true; },
  getNamespace(namespace) { return currentConfig[namespace] ? deepClone(currentConfig[namespace]) : undefined; },
  has(path) { return getPath(currentConfig, path) !== undefined; },
  getDefaults() { return DEFAULT_CONFIG; }
};

export const CONFIG = new Proxy({}, {
  get(target, prop) { return currentConfig[prop] || target[prop]; },
  set(target, prop, value) {
    logWarning(`Direct assignment to CONFIG is deprecated. Use ConfigManager.set('${prop}.key', value)`); return true;
  }
});

if (typeof window !== 'undefined') {
  window.ConfigManager = ConfigManager;
  window.PixelConfig = CONFIG;
  window.PixelConfigAPI = ConfigManager;
}

export default ConfigManager;
