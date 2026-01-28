/**
 * @fileoverview Event Bridge for Shopify Custom Pixel to Theme Communication
 * @module cookie-tracker
 *
 * @description
 * Lightweight event tracking system that bridges Shopify's sandboxed Custom Pixel
 * with the theme using BroadcastChannel API (with cookie fallback).
 *
 * Communication Strategy:
 * 1. BroadcastChannel API (fastest, most efficient)
 * 2. Cookies with simple polling (fallback)
 *
 * Features:
 * - Data compression using LZ-string
 * - Deduplication via event IDs
 * - Size overflow handling (4KB cookie limit)
 * - Minimal dependencies, production-ready
 *
 * @example
 * // In Custom Pixel (sandboxed context)
 * EventBridge.emit('purchase', {
 *   value: 100,
 *   currency: 'USD',
 *   transaction_id: 'ORDER-123'
 * });
 *
 * // In Theme (unsandboxed context)
 * EventBridge.subscribe((event) => {
 *   if (event.name === 'purchase') {
 *     window.dataLayer.push({
 *       event: 'purchase',
 *       ecommerce: event.data
 *     });
 *   }
 * });
 */

// ============= IMPORTS =============

import { ConfigManager } from './module.config.js';
import { Logger } from './module.logger.js';

// ============= LOGGER SETUP =============
const log = Logger ? Logger.create('EventBridge') : {
  debug: (...args) => console.log('[EventBridge]', ...args),
  info: (...args) => console.log('[EventBridge]', ...args),
  warn: (...args) => console.warn('[EventBridge]', ...args),
  error: (...args) => console.error('[EventBridge]', ...args),
  success: (...args) => console.log('[EventBridge]', ...args),
  event: (...args) => console.log('[EventBridge]', ...args)
};

// ============= CONFIGURATION FALLBACK =============

/**
 * Local config fallback - used when ConfigManager is not available
 * These values are used when ConfigManager is not loaded
 * @deprecated Use ConfigManager.get('COOKIE.XXX') instead when available
 */
const LOCAL_CONFIG = {
  COOKIE_PREFIX: '_tracklay_',
  COOKIE_EXPIRY_DAYS: 7,
  MAX_COOKIE_SIZE: 4000,
  POLL_INTERVAL: 1000,
  COMPRESSION_ENABLED: true,
  DEBUG: false,
  MAX_HISTORY_SIZE: 1000,
  HISTORY_EVICTION_PERCENT: 0.2
};

// ============= CONFIGURATION =============

/**
 * Get configuration value from ConfigManager with fallback to local config
 * @param {string} key - Configuration key
 * @param {string} [localKey] - Optional local config key name if different
 * @returns {*} Configuration value
 */
function getConfig(key, localKey) {
  const localVal = LOCAL_CONFIG[localKey || key];
  if (typeof ConfigManager !== 'undefined' && ConfigManager && ConfigManager.get) {
    return ConfigManager.get(key, localVal);
  }
  return localVal;
}

// ============= TYPE DEFINITIONS =============

/**
 * Event object structure
 * @typedef {Object} TrackingEvent
 * @property {string} id - Unique event identifier
 * @property {string} name - Event name/type
 * @property {Object} data - Event payload data
 * @property {number} timestamp - Event creation timestamp
 */

// ============= UTILITY FUNCTIONS =============

/**
 * Check if LZString is available, log warning if not
 * @returns {boolean} Whether LZString is available
 */
function checkLZString() {
  if (typeof LZString === 'undefined') {
    console.warn('[EventBridge] LZString not available, compression disabled');
    return false;
  }
  return true;
}

/**
 * Compress data using LZ-string algorithm with fallback to JSON
 * Falls back to JSON if compression fails or is not beneficial
 * 
 * @function compress
 * @param {Object} data - Data object to compress
 * @returns {string} Compressed or serialized string with format prefix
 * @example
 * const data = { event: 'purchase', value: 100 };
 * const compressed = compress(data);
 * // Returns: 'C:<compressed_data>' or 'J:<json_data>'
 */
function compress(data) {
  // Check compression enabled first
  if (!getConfig('COOKIE.COMPRESSION_ENABLED', 'COMPRESSION_ENABLED')) {
    try {
      return 'J:' + JSON.stringify(data);
    } catch (e) {
      console.error('[EventBridge] JSON stringify failed:', e);
      return null;
    }
  }
  
  try {
    const json = JSON.stringify(data);
    // Use LZString if available, otherwise use JSON
    if (typeof LZString !== 'undefined') {
      const compressed = LZString.compressToUTF16(json);
      // Only use compression if it actually reduces size
      if (compressed.length < json.length * 0.9) {
        return 'C:' + compressed;
      }
    }
    return 'J:' + json;
  } catch (e) {
    console.error('[EventBridge] Compression failed:', e);
    // Fallback to JSON on any error (including circular references)
    try {
      return 'J:' + JSON.stringify(data);
    } catch (e2) {
      console.error('[EventBridge] JSON stringify fallback failed:', e2);
      return null;
    }
  }
}

/**
 * Decompress data based on prefix indicator
 * Handles both compressed ('C:') and JSON ('J:') formats
 * 
 * @function decompress
 * @param {string} str - Compressed or serialized string
 * @returns {Object|null} Decompressed data object or null on failure
 * @throws {Error} Logs error to console but returns null instead of throwing
 * @example
 * const data = decompress('J:{"event":"purchase"}');
 * // Returns: { event: 'purchase' }
 */
function decompress(str) {
  if (!str) return null;
  
  try {
    if (str.startsWith('C:')) {
      if (typeof LZString !== 'undefined') {
        const json = LZString.decompressFromUTF16(str.slice(2));
        return json ? JSON.parse(json) : null;
      }
    } else if (str.startsWith('J:')) {
      return JSON.parse(str.slice(2));
    }
    // Legacy fallback for unformatted strings
    return JSON.parse(str);
  } catch (e) {
    console.error('[EventBridge] Decompression failed:', e);
    return null;
  }
}

/**
 * Generate unique event ID for deduplication
 * Combines timestamp with random strings for uniqueness
 * 
 * @function generateEventId
 * @returns {string} Unique event identifier
 * @example
 * const id = generateEventId();
 * // Returns: '1706203200000-abc123def-xyz12'
 */
function generateEventId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${Math.random().toString(36).substr(2, 5)}`;
}


// ============= COOKIE MANAGER =============

/**
 * Cookie management utility with size checking and overflow handling
 * @namespace CookieManager
 */
const CookieManager = {
  /**
   * Set cookie with size checking and automatic overflow handling
   * 
   * @function set
   * @memberof CookieManager
   * @param {string} name - Cookie name (without prefix)
   * @param {string} value - Cookie value
   * @param {number} [days] - Expiry time in days (default: from config)
   * @returns {boolean} Success status (false if too large)
   * @example
   * const success = CookieManager.set('event_queue', compressedData, 1/24);
   */
  set(name, value, days) {
    try {
      const expiryDays = days !== undefined ? days : getConfig('COOKIE.POLLER.EXPIRY', 'COOKIE_EXPIRY_DAYS');
      const expires = new Date();
      expires.setTime(expires.getTime() + expiryDays * 24 * 60 * 60 * 1000);
      
      const prefix = getConfig('COOKIE.PREFIX', 'COOKIE_PREFIX');
      const maxSize = getConfig('COOKIE.MAX_SIZE', 'MAX_COOKIE_SIZE');
      const cookieStr = `${prefix}${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
      
      // Check size before setting
      if (cookieStr.length > maxSize) {
        console.warn('[CookieManager] Cookie too large, using IndexedDB fallback');
        return false;
      }
      
      document.cookie = cookieStr;
      return true;
    } catch (e) {
      console.error('[CookieManager] Set failed:', e);
      return false;
    }
  },

  /**
   * Get cookie value by name
   * 
   * @function get
   * @memberof CookieManager
   * @param {string} name - Cookie name (without prefix)
   * @returns {string|null} Cookie value or null if not found
   * @example
   * const value = CookieManager.get('event_queue');
   */
  get(name) {
    try {
      const prefix = getConfig('COOKIE.PREFIX', 'COOKIE_PREFIX');
      const nameEQ = `${prefix}${name}=`;
      const cookies = document.cookie.split(';');
      
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.indexOf(nameEQ) === 0) {
          return decodeURIComponent(cookie.substring(nameEQ.length));
        }
      }
      return null;
    } catch (e) {
      console.error('[CookieManager] Get failed:', e);
      return null;
    }
  },

  /**
   * Delete cookie by name
   * 
   * @function delete
   * @memberof CookieManager
   * @param {string} name - Cookie name (without prefix)
   * @returns {void}
   * @example
   * CookieManager.delete('event_queue');
   */
  delete(name) {
    try {
      const prefix = getConfig('COOKIE.PREFIX', 'COOKIE_PREFIX');
      document.cookie = `${prefix}${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
    } catch (e) {
      console.error('[CookieManager] Delete failed:', e);
    }
  },

  /**
   * Get all cookies with the module prefix
   * 
   * @function getAll
   * @memberof CookieManager
   * @returns {Object} Map of cookie names to values
   * @example
   * const cookies = CookieManager.getAll();
   * // Returns: { event_queue: '...', session_id: '...' }
   */
  getAll() {
    const result = {};
    try {
      const cookies = document.cookie.split(';');
      
      const prefix = getConfig('COOKIE.PREFIX', 'COOKIE_PREFIX');
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(prefix)) {
          const eqIndex = cookie.indexOf('=');
          if (eqIndex > -1) {
            const name = cookie.substring(prefix.length, eqIndex);
            const value = decodeURIComponent(cookie.substring(eqIndex + 1));
            result[name] = value;
          }
        }
      }
    } catch (e) {
      console.error('[CookieManager] GetAll failed:', e);
    }
    
    return result;
  }
};


// ============= INDEXEDDB FALLBACK =============

/**
 * IndexedDB fallback for when cookies fail
 * @namespace IndexedDBManager
 */
const IndexedDBManager = {
  db: null,
  initPromise: null,
  
  /**
   * Get DB config from ConfigManager or fallback
   * @returns {Object} DB configuration
   */
  getDbConfig() {
    if (typeof ConfigManager !== 'undefined' && ConfigManager && ConfigManager.get) {
      return {
        name: ConfigManager.get('COOKIE.DB_NAME', 'EventBridgeDB'),
        store: ConfigManager.get('COOKIE.STORE_NAME', 'events'),
        version: ConfigManager.get('COOKIE.DB_VERSION', 1)
      };
    }
    return {
      name: 'EventBridgeDB',
      store: 'events',
      version: 1
    };
  },

  /**
   * Initialize IndexedDB
   * @returns {Promise<boolean>} Success status
   */
  async init() {
    if (this.db) return true;
    if (this.initPromise) return this.initPromise;
    if (typeof indexedDB === 'undefined') return false;

    const dbConfig = this.getDbConfig();
    
    this.initPromise = new Promise((resolve) => {
      try {
        const request = indexedDB.open(dbConfig.name, dbConfig.version);
        
        request.onerror = () => {
          this.initPromise = null;
          resolve(false);
        };
        
        request.onsuccess = (event) => {
          this.db = event.target.result;
          
          // Handle unexpected database closures
          this.db.onclose = () => {
            this.db = null;
            this.initPromise = null;
          };
          
          this.db.onerror = (event) => {
            console.error('[IndexedDB] Database error:', event.target.error);
          };
          
          resolve(true);
        };
        
        request.onupgradeneeded = (event) => {
          const db = event.target.result;
          if (!db.objectStoreNames.contains(dbConfig.store)) {
            const store = db.createObjectStore(dbConfig.store, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };
      } catch (e) {
        console.warn('[IndexedDB] Init failed:', e);
        this.initPromise = null;
        resolve(false);
      }
    });
    
    return this.initPromise;
  },

  /**
   * Store event in IndexedDB
   * @param {TrackingEvent} event - Event to store
   * @returns {Promise<boolean>} Success status
   */
  async store(event) {
    if (!await this.init()) return false;

    const dbConfig = this.getDbConfig();
    
    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([dbConfig.store], 'readwrite');
        
        transaction.onerror = () => resolve(false);
        transaction.onabort = () => resolve(false);
        
        const store = transaction.objectStore(dbConfig.store);
        const request = store.put(event);
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      } catch (e) {
        console.warn('[IndexedDB] Store failed:', e);
        resolve(false);
      }
    });
  },

  /**
   * Get all events from IndexedDB
   * @returns {Promise<Array<TrackingEvent>>} Events array
   */
  async getAll() {
    if (!await this.init()) return [];

    const dbConfig = this.getDbConfig();
    
    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([dbConfig.store], 'readonly');
        
        transaction.onerror = () => resolve([]);
        
        const store = transaction.objectStore(dbConfig.store);
        const request = store.getAll();
        
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => resolve([]);
      } catch (e) {
        console.warn('[IndexedDB] GetAll failed:', e);
        resolve([]);
      }
    });
  },

  /**
   * Clear all events from IndexedDB
   * @returns {Promise<boolean>} Success status
   */
  async clear() {
    if (!await this.init()) return false;

    const dbConfig = this.getDbConfig();
    
    return new Promise((resolve) => {
      try {
        const transaction = this.db.transaction([dbConfig.store], 'readwrite');
        
        transaction.onerror = () => resolve(false);
        transaction.onabort = () => resolve(false);
        
        const store = transaction.objectStore(dbConfig.store);
        const request = store.clear();
        
        request.onsuccess = () => resolve(true);
        request.onerror = () => resolve(false);
      } catch (e) {
        console.warn('[IndexedDB] Clear failed:', e);
        resolve(false);
      }
    });
  },
  
  /**
   * Close the IndexedDB connection
   */
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
};


// ============= BROADCAST CHANNEL =============

/**
 * BroadcastChannel API manager for cross-context communication
 * Most efficient strategy when supported
 * @namespace BroadcastChannelManager
 * @property {BroadcastChannel|null} channel - BroadcastChannel instance
 * @property {Set<Function>} listeners - Set of message listeners
 */
const BroadcastChannelManager = {
  channel: null,
  listeners: new Set(),
  isClosed: false,

  /**
   * Initialize BroadcastChannel if supported
   * 
   * @function init
   * @memberof BroadcastChannelManager
   * @returns {boolean} Success status
   */
  init() {
    if (typeof BroadcastChannel === 'undefined') return false;
    if (this.channel) return true;
    if (this.isClosed) return false;
    
    try {
      const prefix = getConfig('COOKIE.PREFIX', 'COOKIE_PREFIX');
      const channelName = getConfig('BROADCAST.CHANNEL', prefix + 'events');
      this.channel = new BroadcastChannel(channelName);
      this.channel.onmessage = (event) => {
        this.listeners.forEach(listener => {
          try {
            listener(event.data);
          } catch (e) {
            console.error('[BROADCAST] Listener error:', e);
          }
        });
      };
      
      // Handle channel errors
      this.channel.onmessageerror = (event) => {
        console.error('[BROADCAST] Message error:', event);
      };
      
      return true;
    } catch (e) {
      console.warn('[BROADCAST] Init failed:', e);
      return false;
    }
  },

  /**
   * Send message via BroadcastChannel
   * 
   * @function send
   * @memberof BroadcastChannelManager
   * @param {Object} data - Data to send
   * @returns {boolean} Success status
   */
  send(data) {
    if (!this.channel || this.isClosed) return false;
    
    try {
      this.channel.postMessage(data);
      return true;
    } catch (e) {
      console.error('[BROADCAST] Send failed:', e);
      return false;
    }
  },

  /**
   * Subscribe to messages
   * 
   * @function subscribe
   * @memberof BroadcastChannelManager
   * @param {Function} callback - Message handler callback
   * @returns {void}
   */
  subscribe(callback) {
    this.listeners.add(callback);
  },

  /**
   * Unsubscribe from messages
   * 
   * @function unsubscribe
   * @memberof BroadcastChannelManager
   * @param {Function} callback - Handler to remove
   * @returns {void}
   */
  unsubscribe(callback) {
    this.listeners.delete(callback);
  },
  
  /**
   * Close the BroadcastChannel
   */
  close() {
    this.isClosed = true;
    this.listeners.clear();
    if (this.channel) {
      this.channel.close();
      this.channel = null;
    }
  }
};

// ============= SIMPLE POLLER =============

/**
 * Simple polling manager for cookie changes
 * @namespace SimplePoll
 * @property {number|null} intervalId - Interval ID
 * @property {Set<Function>} listeners - Set of poll listeners
 */
const SimplePoll = {
  intervalId: null,
  listeners: new Set(),

  /**
   * Start simple polling
   *
   * @function start
   * @memberof SimplePoll
   * @returns {void}
   */
  start() {
    if (this.intervalId) return;

    const pollInterval = getConfig('COOKIE.POLLER.INTERVAL_MAX', 'POLL_INTERVAL');
    this.intervalId = setInterval(() => {
      this.listeners.forEach(listener => {
        try {
          listener(CookieManager.getAll());
        } catch (e) {
          console.error('[POLL] Listener error:', e);
        }
      });
    }, pollInterval);
  },

  /**
   * Stop polling
   *
   * @function stop
   * @memberof SimplePoll
   * @returns {void}
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  },

  /**
   * Subscribe to poll events
   *
   * @function subscribe
   * @memberof SimplePoll
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    // Return unsubscribe function
    return () => this.unsubscribe(callback);
  },
  
  /**
   * Unsubscribe from poll events
   *
   * @function unsubscribe
   * @memberof SimplePoll
   * @param {Function} callback - Event handler to remove
   * @returns {void}
   */
  unsubscribe(callback) {
    this.listeners.delete(callback);
    // Auto-stop if no more listeners
    if (this.listeners.size === 0) {
      this.stop();
    }
  },
  
  /**
   * Check if polling is active
   * @returns {boolean}
   */
  isActive() {
    return this.intervalId !== null;
  }
};

// ============= MAIN EVENT BRIDGE =============

/**
 * Main EventBridge interface for cross-context communication
 * @namespace EventBridge
 * @property {Set<string>} eventHistory - Set of processed event IDs for deduplication
 * @property {boolean} isEmitter - Whether initialized as emitter
 * @property {boolean} isReceiver - Whether initialized as receiver
 */
const EventBridge = {
  eventHistory: new Set(),
  isEmitter: false,
  isReceiver: false,
  initialized: false,
  eventCallbacks: new Set(),

  /**
   * Initialize EventBridge with options
   * @param {Object} [options={}] - Configuration options to merge
   * @returns {Object} EventBridge instance
   * 
   * @example
   * EventBridge.init({
   *   COOKIE: { DEBUG: true, COMPRESSION_ENABLED: false }
   * });
   */
  init(options = {}) {
    if (this.initialized) return this;
    
    // Merge options into config
    if (typeof ConfigManager !== 'undefined' && ConfigManager && ConfigManager.merge) {
      ConfigManager.merge(options);
    } else if (options && typeof options === 'object') {
      // Manual merge into LOCAL_CONFIG for fallback
      Object.keys(options).forEach(key => {
        if (typeof options[key] === 'object') {
          Object.keys(options[key]).forEach(subKey => {
            LOCAL_CONFIG[`${key}_${subKey}`] = options[key][subKey];
          });
        } else {
          LOCAL_CONFIG[key] = options[key];
        }
      });
    }
    
    this.initialized = true;
    return this;
  },

  /**
   * Initialize as event emitter (Custom Pixel - sandboxed)
   *
   * @function initEmitter
   * @memberof EventBridge
   * @returns {void}
   */
  initEmitter() {
    if (this.isEmitter) return;
    
    this.isEmitter = true;

    // Try BroadcastChannel first
    if (BroadcastChannelManager.init()) {
      if (getConfig('COOKIE.DEBUG', 'DEBUG')) {
        log.debug('Emitter: Using BroadcastChannel');
      }
      return;
    }

    if (getConfig('COOKIE.DEBUG', 'DEBUG')) {
      log.debug('Emitter: Using Cookie fallback');
    }
  },

  /**
   * Initialize as event receiver (Theme - unsandboxed)
   *
   * @function initReceiver
   * @memberof EventBridge
   * @param {Function} onEvent - Callback for received events
   * @returns {void}
   */
  initReceiver(onEvent) {
    if (this.isReceiver) return;
    
    this.isReceiver = true;
    
    if (onEvent) {
      this.eventCallbacks.add(onEvent);
    }

    // Strategy 1: BroadcastChannel (best performance)
    if (BroadcastChannelManager.init()) {
      BroadcastChannelManager.subscribe((data) => {
        this.processIncomingEvent(data, onEvent);
      });
      if (getConfig('COOKIE.DEBUG', 'DEBUG')) {
        log.debug('Receiver: BroadcastChannel active');
      }
    }

    // Strategy 2: Simple polling (fallback)
    SimplePoll.subscribe((cookies) => {
      this.processCookies(cookies, onEvent);
    });
    SimplePoll.start();
    if (getConfig('COOKIE.DEBUG', 'DEBUG')) {
      log.debug('Receiver: Simple polling active');
    }
    
    // Strategy 3: IndexedDB fallback polling
    this.startIndexedDBPoll(onEvent);
  },

  /**
   * IndexedDB poll interval ID
   */
  indexedDBPollIntervalId: null,
  indexedDBPollActive: false,

  /**
   * Start IndexedDB polling
   * @param {Function} onEvent - Event callback
   */
  startIndexedDBPoll(onEvent) {
    // Prevent multiple intervals
    if (this.indexedDBPollActive) return;
    this.indexedDBPollActive = true;

    const poll = async () => {
      if (!this.indexedDBPollActive) return;
      
      try {
        const events = await IndexedDBManager.getAll();
        for (const event of events) {
          this.processIncomingEvent(event, onEvent);
        }
        if (events.length > 0) {
          await IndexedDBManager.clear();
        }
      } catch (e) {
        console.error('[EventBridge] IndexedDB poll error:', e);
      }
    };
    
    // Poll every 2 seconds and store the interval ID for cleanup
    this.indexedDBPollIntervalId = setInterval(poll, 2000);
  },

  /**
   * Stop IndexedDB polling - cleanup method
   */
  stopIndexedDBPoll() {
    this.indexedDBPollActive = false;
    if (this.indexedDBPollIntervalId) {
      clearInterval(this.indexedDBPollIntervalId);
      this.indexedDBPollIntervalId = null;
      if (getConfig('COOKIE.DEBUG', 'DEBUG')) console.log('[EventBridge] IndexedDB polling stopped');
    }
  },

  /**
   * Emit event from Custom Pixel
   *
   * @function emit
   * @memberof EventBridge
   * @param {string} eventName - Event name
   * @param {Object} [data={}] - Event data payload
   * @returns {void}
   */
  emit(eventName, data = {}) {
    
    const event = {
      id: generateEventId(),
      name: eventName,
      data: data,
      timestamp: Date.now()
    };

    // Try BroadcastChannel first
    const bcSuccess = BroadcastChannelManager.send(event);
    if (bcSuccess && getConfig('COOKIE.DEBUG', 'DEBUG')) {
      log.debug('Event sent via BroadcastChannel');
    }

    // Always use cookie as backup (even when BroadcastChannel succeeds)
    this.emitViaCookie(event);
  },

  /**
   * Store event in cookie for retrieval by theme
   *
   * @function emitViaCookie
   * @memberof EventBridge
   * @param {TrackingEvent} event - Event object to store
   * @returns {Promise<void>}
   */
  async emitViaCookie(event) {
    const compressed = compress(event);
    const maxSize = getConfig('COOKIE.MAX_SIZE', 'MAX_COOKIE_SIZE');

    if (!compressed) {
      console.error('[EventBridge] Failed to compress event');
      await this.fallbackToIndexedDB(event);
      return;
    }

    if (compressed.length < maxSize) {
      const existing = CookieManager.get('event_queue');
      let queue = [];

      if (existing) {
        const decompressed = decompress(existing);
        if (decompressed && Array.isArray(decompressed)) {
          queue = decompressed;
        }
      }

      queue.push(event);
      let compressedQueue = compress(queue);
      
      // Fallback to IndexedDB if compression fails
      if (!compressedQueue) {
        await this.fallbackToIndexedDB(event);
        return;
      }

      // Remove oldest items until the queue fits within cookie size limit
      while (queue.length > 0 && compressedQueue.length >= maxSize) {
        queue.shift(); // Remove oldest item
        compressedQueue = compress(queue);
        if (!compressedQueue) {
          // If compression fails, fall back to IndexedDB
          await this.fallbackToIndexedDB(event);
          return;
        }
      }

      if (queue.length > 0) {
        const ttlMinutes = getConfig('COOKIE.POLLER.TTL', 5);
        const success = CookieManager.set('event_queue', compressedQueue, ttlMinutes / (24 * 60));
        if (success) {
          return;
        }
      }
      // Cookie failed or queue empty, try IndexedDB fallback
      await this.fallbackToIndexedDB(event);
    } else {
      // Event too large for cookie, try IndexedDB fallback
      await this.fallbackToIndexedDB(event);
    }
  },

  /**
   * Fallback to IndexedDB when cookie fails
   * @param {TrackingEvent} event - Event to store
   */
  async fallbackToIndexedDB(event) {
    if (getConfig('COOKIE.DEBUG', 'DEBUG')) {
      log.warn('Attempting IndexedDB fallback');
    }
    const success = await IndexedDBManager.store(event);
    if (success) {
      if (getConfig('COOKIE.DEBUG', 'DEBUG')) {
        log.success('Event stored in IndexedDB');
      }
    } else {
      if (getConfig('COOKIE.DEBUG', 'DEBUG')) {
        log.error('Failed to store event');
      }
    }
  },

  /**
   * Clean up old event history entries using LRU eviction
   * Deletes 20% of entries when limit is exceeded
   */
  cleanupEventHistory() {
    const maxHistorySize = getConfig('COOKIE.MAX_HISTORY_SIZE', 'MAX_HISTORY_SIZE') || 1000;
    const evictionPercent = getConfig('COOKIE.HISTORY_EVICTION_PERCENT', 'HISTORY_EVICTION_PERCENT') || 0.2;
    if (this.eventHistory.size > maxHistorySize) {
      const evictionCount = Math.floor(maxHistorySize * evictionPercent);
      // Convert to array, slice to keep newest entries, rebuild Set
      // This ensures proper LRU eviction (oldest items are removed first)
      const historyArray = Array.from(this.eventHistory);
      const remainingEntries = historyArray.slice(evictionCount);
      this.eventHistory.clear();
      for (const entry of remainingEntries) {
        this.eventHistory.add(entry);
      }
      if (getConfig('COOKIE.DEBUG', 'DEBUG')) {
        console.log(`[EventBridge] Cleaned up ${evictionCount} history entries, new size: ${this.eventHistory.size}`);
      }
    }
  },

  /**
   * Process incoming event with deduplication
   *
   * @function processIncomingEvent
   * @memberof EventBridge
   * @param {TrackingEvent} event - Event data
   * @param {Function} onEvent - User callback
   * @returns {void}
   */
  processIncomingEvent(event, onEvent) {
    if (!event || !event.id) return;

    // Check for duplicate (race condition safe due to single-threaded JS)
    if (this.eventHistory.has(event.id)) {
      return;
    }

    this.eventHistory.add(event.id);

    // Proper LRU eviction: delete 20% when over limit
    this.cleanupEventHistory();

    // Notify all registered callbacks
    this.eventCallbacks.forEach(callback => {
      try {
        if (callback !== onEvent) {
          callback(event);
        }
      } catch (e) {
        console.error('[EventBridge] Callback error:', e);
      }
    });

    // Call the specific callback
    if (onEvent) {
      try {
        onEvent(event);
      } catch (e) {
        console.error('[EventBridge] Event handler error:', e);
      }
    }
  },

  /**
   * Process cookies and extract events
   *
   * @function processCookies
   * @memberof EventBridge
   * @param {Object} cookies - Cookie map
   * @param {Function} onEvent - Event callback
   * @returns {void}
   */
  processCookies(cookies, onEvent) {
    if (!cookies.event_queue) return;

    const queue = decompress(cookies.event_queue);

    if (queue && Array.isArray(queue)) {
      for (const event of queue) {
        this.processIncomingEvent(event, onEvent);
      }
    }

    CookieManager.delete('event_queue');
  },

  /**
   * Subscribe to events (receiver side)
   *
   * @function subscribe
   * @memberof EventBridge
   * @param {Function} onEvent - Event handler callback
   * @returns {Function} Unsubscribe function
   */
  subscribe(onEvent) {
    this.initReceiver(onEvent);
    this.eventCallbacks.add(onEvent);
    
    // Return unsubscribe function
    return () => {
      this.eventCallbacks.delete(onEvent);
      BroadcastChannelManager.unsubscribe(onEvent);
      // Note: SimplePoll unsubscribe is handled by its own mechanism
    };
  },
  
  /**
   * Unsubscribe from events
   * @param {Function} onEvent - Event handler to remove
   */
  unsubscribe(onEvent) {
    this.eventCallbacks.delete(onEvent);
  },
  
  /**
   * Destroy EventBridge and cleanup all resources
   * Call this when the bridge is no longer needed
   */
  destroy() {
    // Stop all polling
    SimplePoll.stop();
    this.stopIndexedDBPoll();
    
    // Close BroadcastChannel
    BroadcastChannelManager.close();
    
    // Close IndexedDB
    IndexedDBManager.close();
    
    // Clear all callbacks and history
    this.eventCallbacks.clear();
    this.eventHistory.clear();
    
    // Reset state
    this.isEmitter = false;
    this.isReceiver = false;
    this.initialized = false;
    
    if (getConfig('COOKIE.DEBUG', 'DEBUG')) {
      log.debug('Destroyed and cleaned up');
    }
  },
  
  /**
   * Get current status of EventBridge
   * @returns {Object} Status object
   */
  getStatus() {
    return {
      isEmitter: this.isEmitter,
      isReceiver: this.isReceiver,
      initialized: this.initialized,
      eventHistorySize: this.eventHistory.size,
      broadcastChannelOpen: !!BroadcastChannelManager.channel,
      simplePollActive: SimplePoll.isActive(),
      indexedDBPollActive: this.indexedDBPollActive,
      registeredCallbacks: this.eventCallbacks.size
    };
  }
};

// ============= EXPORT FOR DIFFERENT ENVIRONMENTS =============

// AMD
if (typeof define === 'function' && define.amd) {
  define(() => EventBridge);
}
// CommonJS
else if (typeof module !== 'undefined' && module.exports) {
  module.exports = EventBridge;
}
// Browser global
else if (typeof window !== 'undefined') {
  window.TracklayEventBridge = EventBridge;
}

// Auto-initialize if in Custom Pixel context
if (typeof analytics !== 'undefined' && analytics.subscribe) {
  // We're in a Custom Pixel (sandboxed)
  try {
    EventBridge.initEmitter();
  } catch (e) {
    console.error('[EventBridge] Auto-init failed:', e);
  }
}

// ============= ES MODULE EXPORTS =============

export { EventBridge };
export default EventBridge;
