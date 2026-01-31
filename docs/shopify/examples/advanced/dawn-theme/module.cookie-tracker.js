/**
 * @fileoverview Event Bridge for Shopify Custom Pixel to Theme Communication
 * Bridges sandboxed Custom Pixel with theme using BroadcastChannel API (with cookie fallback).
 */

// ============= IMPORTS =============

import { ConfigManager } from './module.config.js';
import { Logger } from './module.logger.js';

// ============= LOGGER SETUP =============

const log = Logger.create('EventBridge');

// ============= TYPE DEFINITIONS =============

// ============= UTILITY FUNCTIONS =============

/**
 * @returns {boolean} Whether LZString is available
 */
function checkLZString() {
  if (typeof LZString === 'undefined') {
    log.warn('LZString not available, compression disabled');
    return false;
  }
  return true;
}

/**
 * @param {Object} data - Data object to compress
 * @returns {string} Compressed or serialized string with format prefix
 */
function compress(data) {
  // Check compression enabled first
  if (!ConfigManager.get('COOKIE.COMPRESSION_ENABLED')) {
    try {
      return 'J:' + JSON.stringify(data);
    } catch (e) {
      log.error('JSON stringify failed:', e);
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
    log.error('Compression failed:', e);
    // Fallback to JSON on any error (including circular references)
    try {
      return 'J:' + JSON.stringify(data);
    } catch (e2) {
      log.error('JSON stringify fallback failed:', e2);
      return null;
    }
  }
}

/**
 * @param {string} str - Compressed or serialized string
 * @returns {Object|null} Decompressed data object or null on failure
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
    log.error('Decompression failed:', e);
    return null;
  }
}

/**
 * @returns {string} Unique event identifier
 */
function generateEventId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}-${Math.random().toString(36).slice(2, 7)}`;
}


// ============= COOKIE MANAGER =============

const CookieManager = {
  /**
   * @param {string} name - Cookie name (without prefix)
   * @param {string} value - Cookie value
   * @param {number} [days] - Expiry time in days (default: from config)
   * @returns {boolean} Success status (false if too large)
   */
  set(name, value, days) {
    try {
      const expiryDays = Number(days !== undefined ? days : ConfigManager.get('COOKIE.POLLER.EXPIRY'));
      const expires = new Date();
      expires.setTime(expires.getTime() + expiryDays * 24 * 60 * 60 * 1000);
      
      const prefix = ConfigManager.get('COOKIE.PREFIX');
      const maxSize = ConfigManager.get('COOKIE.MAX_SIZE');
      const cookieStr = `${prefix}${name}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/; SameSite=Lax`;
      
      // Check size before setting
      if (cookieStr.length > maxSize) {
        log.warn('Cookie too large, using IndexedDB fallback');
        return false;
      }
      
      document.cookie = cookieStr;
      return true;
    } catch (e) {
      log.error('CookieManager Set failed:', e);
      return false;
    }
  },

  /**
   * @param {string} name - Cookie name (without prefix)
   * @returns {string|null} Cookie value or null if not found
   */
  get(name) {
    try {
      const prefix = ConfigManager.get('COOKIE.PREFIX');
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
      log.error('CookieManager Get failed:', e);
      return null;
    }
  },

  /**
   * @param {string} name - Cookie name (without prefix)
   * @returns {void}
   */
  delete(name) {
    try {
      const prefix = ConfigManager.get('COOKIE.PREFIX');
      document.cookie = `${prefix}${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
    } catch (e) {
      log.error('CookieManager Delete failed:', e);
    }
  },

  /**
   * @returns {Object} Map of cookie names to values
   */
  getAll() {
    const result = {};
    try {
      const cookies = document.cookie.split(';');
      
      const prefix = ConfigManager.get('COOKIE.PREFIX');
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
      log.error('CookieManager GetAll failed:', e);
    }
    
    return result;
  }
};


// ============= INDEXEDDB FALLBACK =============

const IndexedDBManager = {
  db: null,
  initPromise: null,
  
  /**
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
            log.error('IndexedDB Database error:', event.target.error);
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
        log.warn('IndexedDB Init failed:', e);
        this.initPromise = null;
        resolve(false);
      }
    });
    
    return this.initPromise;
  },

  /**
   * @param {Object} event - Event to store
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
        log.warn('IndexedDB Store failed:', e);
        resolve(false);
      }
    });
  },

  /**
   * @returns {Promise<Array<Object>>} Events array
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
        log.warn('IndexedDB GetAll failed:', e);
        resolve([]);
      }
    });
  },

  /**
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
        log.warn('IndexedDB Clear failed:', e);
        resolve(false);
      }
    });
  },
  
  close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }
};


// ============= BROADCAST CHANNEL =============

const BroadcastChannelManager = {
  channel: null,
  listeners: new Set(),
  isClosed: false,

  /**
   * @returns {boolean} Success status
   */
  init() {
    if (typeof BroadcastChannel === 'undefined') return false;
    if (this.channel) return true;
    if (this.isClosed) return false;
    
    try {
      const prefix = ConfigManager.get('COOKIE.PREFIX');
      const channelName = ConfigManager.get('BROADCAST.CHANNEL');
      this.channel = new BroadcastChannel(channelName);
      this.channel.onmessage = (event) => {
        this.listeners.forEach(listener => {
          try {
            listener(event.data);
          } catch (e) {
            log.error('BroadcastChannel Listener error:', e);
          }
        });
      };
      
      // Handle channel errors
      this.channel.onmessageerror = (event) => {
        log.error('BroadcastChannel Message error:', event);
      };
      
      return true;
    } catch (e) {
      log.warn('BroadcastChannel Init failed:', e);
      return false;
    }
  },

  /**
   * @param {Object} data - Data to send
   * @returns {boolean} Success status
   */
  send(data) {
    if (!this.channel || this.isClosed) return false;
    
    try {
      this.channel.postMessage(data);
      return true;
    } catch (e) {
      log.error('BroadcastChannel Send failed:', e);
      return false;
    }
  },

  /**
   * @param {Function} callback - Message handler callback
   * @returns {void}
   */
  subscribe(callback) {
    this.listeners.add(callback);
  },

  /**
   * @param {Function} callback - Handler to remove
   * @returns {void}
   */
  unsubscribe(callback) {
    this.listeners.delete(callback);
  },
  
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

const SimplePoll = {
  intervalId: null,
  listeners: new Set(),

  /**
   * @returns {void}
   */
  start() {
    if (this.intervalId) return;

    const pollInterval = ConfigManager.get('COOKIE.POLLER.INTERVAL_MAX');
    this.intervalId = setInterval(() => {
      this.listeners.forEach(listener => {
        try {
          listener(CookieManager.getAll());
        } catch (e) {
          log.error('SimplePoll Listener error:', e);
        }
      });
    }, pollInterval);
  },

  /**
   * @returns {void}
   */
  stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  },

  /**
   * @param {Function} callback - Event handler
   * @returns {Function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    // Return unsubscribe function
    return () => this.unsubscribe(callback);
  },
  
  /**
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
   * @returns {boolean}
   */
  isActive() {
    return this.intervalId !== null;
  }
};

// ============= MAIN EVENT BRIDGE =============

const EventBridge = {
  eventHistory: new Set(),
  isEmitter: false,
  isReceiver: false,
  initialized: false,
  eventCallbacks: new Set(),

  /**
   * @param {Object} [options={}] - Configuration options to merge
   * @returns {Object} EventBridge instance
   */
  init(options = {}) {
    if (this.initialized) return this;

    // Merge options into config
    if (options && typeof options === 'object') {
      ConfigManager.merge(options);
    }

    this.initialized = true;
    return this;
  },

  /**
   * @returns {void}
   */
  initEmitter() {
    if (this.isEmitter) return;
    
    this.isEmitter = true;

    // Try BroadcastChannel first
    if (BroadcastChannelManager.init()) {
      if (ConfigManager.get('COOKIE.DEBUG')) {
        log.debug('Emitter: Using BroadcastChannel');
      }
      return;
    }

    if (ConfigManager.get('COOKIE.DEBUG')) {
      log.debug('Emitter: Using Cookie fallback');
    }
  },

  /**
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
      if (ConfigManager.get('COOKIE.DEBUG')) {
        log.debug('Receiver: BroadcastChannel active');
      }
    }

    // Strategy 2: Simple polling (fallback)
    SimplePoll.subscribe((cookies) => {
      this.processCookies(cookies, onEvent);
    });
    SimplePoll.start();
    if (ConfigManager.get('COOKIE.DEBUG')) {
      log.debug('Receiver: Simple polling active');
    }
    
    // Strategy 3: IndexedDB fallback polling
    this.startIndexedDBPoll(onEvent);
  },

  indexedDBPollIntervalId: null,
  indexedDBPollActive: false,

  /**
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
        log.error('IndexedDB poll error:', e);
      }
    };
    
    // Poll every 2 seconds and store the interval ID for cleanup
    this.indexedDBPollIntervalId = setInterval(poll, 2000);
  },

  stopIndexedDBPoll() {
    this.indexedDBPollActive = false;
    if (this.indexedDBPollIntervalId) {
      clearInterval(this.indexedDBPollIntervalId);
      this.indexedDBPollIntervalId = null;
      if (ConfigManager.get('COOKIE.DEBUG')) log.info('IndexedDB polling stopped');
    }
  },

  /**
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
    if (bcSuccess && ConfigManager.get('COOKIE.DEBUG')) {
      log.debug('Event sent via BroadcastChannel');
    }

    // Always use cookie as backup (even when BroadcastChannel succeeds)
    this.emitViaCookie(event);
  },

  /**
   * @param {Object} event - Event object to store
   * @returns {Promise<void>}
   */
  async emitViaCookie(event) {
    const compressed = compress(event);
    const maxSize = ConfigManager.get('COOKIE.MAX_SIZE');

    if (!compressed) {
      log.error('Failed to compress event');
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
        const ttlMinutes = ConfigManager.get('COOKIE.POLLER.TTL');
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
   * @param {Object} event - Event to store
   */
  async fallbackToIndexedDB(event) {
    if (ConfigManager.get('COOKIE.DEBUG')) {
      log.warn('Attempting IndexedDB fallback');
    }
    const success = await IndexedDBManager.store(event);
    if (success) {
      if (ConfigManager.get('COOKIE.DEBUG')) {
        log.success('Event stored in IndexedDB');
      }
    } else {
      if (ConfigManager.get('COOKIE.DEBUG')) {
        log.error('Failed to store event');
      }
    }
  },

  cleanupEventHistory() {
    const maxHistorySize = ConfigManager.get('COOKIE.MAX_HISTORY_SIZE') || 1000;
    const evictionPercent = ConfigManager.get('COOKIE.HISTORY_EVICTION_PERCENT') || 0.2;
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
      if (ConfigManager.get('COOKIE.DEBUG')) {
        log.debug(`Cleaned up ${evictionCount} history entries, new size: ${this.eventHistory.size}`);
      }
    }
  },

  /**
   * @param {Object} event - Event data
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
        log.error('Callback error:', e);
      }
    });

    // Call the specific callback
    if (onEvent) {
      try {
        onEvent(event);
      } catch (e) {
        log.error('Event handler error:', e);
      }
    }
  },

  /**
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
   * @param {Function} onEvent - Event handler to remove
   */
  unsubscribe(onEvent) {
    this.eventCallbacks.delete(onEvent);
  },
  
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
    
    if (ConfigManager.get('COOKIE.DEBUG')) {
      log.debug('Destroyed and cleaned up');
    }
  },
  
  /**
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
    log.error('Auto-init failed:', e);
  }
}

// ============= GLOBAL BROWSER ASSIGNMENT =============

if (typeof window !== 'undefined') {
  window.EventBridge = EventBridge;
  window.TracklayEventBridge = EventBridge;
}

// ============= ES MODULE EXPORTS =============

export { EventBridge };
export default EventBridge;
