/**
 * @fileoverview Logger Shopify-First - Sistema de logging adaptativo
 * Detecta automaticamente contexto (tema vs checkout) e adapta comportamento.
 */

// ==========================================
// DETECÇÃO DE CONTEXTO SHOPIFY
// ==========================================

/** @enum {string} */
const Context = Object.freeze({
  THEME: 'theme',
  CHECKOUT: 'checkout',
  ADMIN: 'admin',
  UNKNOWN: 'unknown'
});

/** @returns {string} */
function detectContext() {
  try {
    const url = window.location.href;
    const hostname = window.location.hostname;
    
    if (url.includes('/checkout') || 
        hostname.includes('checkout.') ||
        url.includes('shopify.com/checkout')) {
      return Context.CHECKOUT;
    }
    
    if (hostname.includes('admin.shopify.com') ||
        url.includes('.myshopify.com/admin')) {
      return Context.ADMIN;
    }
    
    try {
      const parentHref = window.parent.location.href;
      if (window.parent !== window && !parentHref) {
        return Context.CHECKOUT;
      }
    } catch (e) {
      return Context.CHECKOUT;
    }
    
    return Context.THEME;
  } catch (e) {
    return Context.UNKNOWN;
  }
}

/** @returns {boolean} */
const isSandboxed = () => detectContext() === Context.CHECKOUT;

// ==========================================
// NÍVEIS DE LOG
// ==========================================

/** @enum {number} */
const Level = Object.freeze({
  SILENT: 0,
  ERROR: 1,
  WARN: 2,
  INFO: 3,
  DEBUG: 4
});

/** @enum {string} */
const LevelNames = Object.freeze({
  [Level.ERROR]: 'ERROR',
  [Level.WARN]: 'WARN',
  [Level.INFO]: 'INFO',
  [Level.DEBUG]: 'DEBUG'
});

// ==========================================
// TRANSPORTES
// ==========================================

/** @param {Object} options @returns {Object} */
function createConsoleTransport(options) {
  const showTimestamp = options.showTimestamp ?? false;

  const consoleMethods = {
    [Level.ERROR]: console.error.bind(console),
    [Level.WARN]: console.warn.bind(console),
    [Level.INFO]: console.info.bind(console),
    [Level.DEBUG]: console.debug.bind(console)
  };

  return {
    log(level, module, message, meta) {
      const method = consoleMethods[level] || console.log.bind(console);
      const levelName = LevelNames[level];
      const timestamp = showTimestamp ? `[${new Date().toISOString()}] ` : '';
      const fullPrefix = `${timestamp}[${module}][${levelName}]`;
      
      try {
        if (meta !== undefined) {
          method(fullPrefix, message, meta);
        } else {
          method(fullPrefix, message);
        }
      } catch (e) {}
    },
    flush: () => [],
    peek: () => [],
    clear: () => {},
    size: 0
  };
}

/** @param {Object} options @returns {Object} */
function createBufferTransport(options) {
  const maxSize = options.maxSize || 100;
  const buffer = [];
  
  return {
    log(level, module, message, meta) {
      buffer.push({
        timestamp: Date.now(),
        level,
        levelName: LevelNames[level],
        module,
        message,
        meta
      });
      
      if (buffer.length > maxSize) {
        buffer.shift();
      }
    },
    flush() {
      const result = [...buffer];
      buffer.length = 0;
      return result;
    },
    peek() {
      return [...buffer];
    },
    clear() {
      buffer.length = 0;
    },
    get size() {
      return buffer.length;
    }
  };
}

// ==========================================
// LOGGER FACTORY
// ==========================================

const GlobalConfig = {
  level: Level.INFO,
  showTimestamp: false
};

/** @param {string} moduleName @param {Object} [options] @returns {Object} */
function createLogger(moduleName, options = {}) {
  const context = options.context || detectContext();
  const minLevel = options.level ?? GlobalConfig.level;
  const isCheckout = context === Context.CHECKOUT;
  
  const transport = isCheckout
    ? createBufferTransport({ maxSize: options.bufferSize })
    : createConsoleTransport({
        showTimestamp: GlobalConfig.showTimestamp
      });
  
  let silence = false;
  let moduleLevel = minLevel;
  
  function shouldLog(level) {
    return !silence && level <= moduleLevel;
  }
  
  function logInternal(level, message, meta) {
    if (shouldLog(level)) {
      transport.log(level, moduleName, message, meta);
    }
  }
  
  return {
    error: (msg, meta) => logInternal(Level.ERROR, msg, meta),
    warn: (msg, meta) => logInternal(Level.WARN, msg, meta),
    info: (msg, meta) => logInternal(Level.INFO, msg, meta),
    debug: (msg, meta) => logInternal(Level.DEBUG, msg, meta),
    success: (msg, meta) => logInternal(Level.INFO, '✅ ' + msg, meta),
    log: (level, msg, meta) => logInternal(level, msg, meta),
    silence: () => { silence = true; },
    unsilence: () => { silence = false; },
    setLevel: (l) => { moduleLevel = l; },
    getLevel: () => moduleLevel,
    getContext: () => context,
    isBuffered: () => isCheckout,
    flush: () => transport.flush(),
    peek: () => transport.peek(),
    clear: () => transport.clear(),
    getBufferSize: () => transport.size
  };
}

// ==========================================
// API PÚBLICA
// ==========================================

export const Logger = Object.freeze({
  Context,
  detectContext,
  isSandboxed,
  Level,
  LevelNames,
  LEVELS: Level,
  create: createLogger,
  setGlobalLevel: (l) => { GlobalConfig.level = l; },
  getGlobalLevel: () => GlobalConfig.level,
  setTimestamp: (s) => { GlobalConfig.showTimestamp = s; },
  createBuffered: (name, opts) => createLogger(name, { ...opts, context: Context.CHECKOUT }),
  createConsole: (name, opts) => createLogger(name, { ...opts, context: Context.THEME })
});

if (typeof window !== 'undefined') {
  window.Logger = Logger;
  window.detectShopifyContext = detectContext;
}
