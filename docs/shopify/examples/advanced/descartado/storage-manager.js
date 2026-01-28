/**
 * @fileoverview Unified Storage Manager - Multi-layer storage abstraction for browser environments
 * @module storage-manager
 *
 * @description
 * Provides unified access to all browser storage mechanisms with automatic fallback chain:
 * 1. BroadcastChannel (fastest, cross-tab communication, no persistence)
 * 2. localStorage (synchronous, 5-10MB limit)
 * 3. sessionStorage (tab-scoped, survives refresh)
 * 4. IndexedDB (async, 50MB+, structured data)
 * 5. Cookies (4KB limit, shared with server, sandbox escape)
 *
 * All operations are atomic and include automatic JSON serialization/deserialization.
 * The StorageManager writes to all available layers simultaneously for redundancy
 * and reads from the first available layer.
 *
 * Features:
 * - Automatic compression for large values (when LZString is available)
 * - Cross-tab synchronization via BroadcastChannel
 * - Quota management with automatic cleanup
 * - Type-safe storage and retrieval
 *
 * @example
 * import { StorageManager } from './storage-manager.js';
 *
 * // Write to all available layers
 * await StorageManager.set('event_123', { name: 'purchase', value: 100 });
 *
 * // Read from first available layer
 * const event = await StorageManager.get('event_123');
 *
 * // Check existence across all layers
 * const exists = await StorageManager.has('event_123');
 *
 * // Subscribe to real-time changes
 * const unsubscribe = StorageManager.subscribe('event_123', (value) => {
 *   console.log('Value changed:', value);
 * });
 *
 * @author Tracklay
 * @license MIT
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API|Web Storage API}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API|IndexedDB API}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API|BroadcastChannel API}
 */

// ============= CONFIGURATION =============

/**
 * Configuration constants for the storage manager
 * @constant {Object} CONFIG
 * @property {string} PREFIX - Key prefix for all stored items to avoid collisions
 * @property {number} COOKIE_EXPIRY_DAYS - Default cookie expiration in days
 * @property {number} MAX_COOKIE_SIZE - Maximum cookie size in bytes (4KB)
 * @property {string} DB_NAME - IndexedDB database name
 * @property {number} DB_VERSION - IndexedDB schema version
 * @property {string} STORE_NAME - IndexedDB object store name
 * @property {number} COMPRESSION_THRESHOLD - Minimum string length to trigger compression
 * @property {number} SYNC_INTERVAL - Milliseconds between sync checks (deprecated, unused)
 * @readonly
 * @memberof module:storage-manager
 */
const CONFIG = {
  PREFIX: '_tracklay_',
  COOKIE_EXPIRY_DAYS: 7,
  MAX_COOKIE_SIZE: 4000,
  DB_NAME: 'TracklayUnifiedStorage',
  DB_VERSION: 1,
  STORE_NAME: 'kv_store',
  COMPRESSION_THRESHOLD: 1000,
  SYNC_INTERVAL: 100 // ms between sync checks
};

// ============= COMPRESSION UTILITY =============

/**
 * Compression utility using LZ-string algorithm when available
 * @namespace Compression
 * @description
 * Provides transparent compression/decompression for storage operations.
 * Automatically detects if LZString library is loaded and compresses values
 * that exceed the COMPRESSION_THRESHOLD.
 *
 * Format: 'C:' prefix for compressed, 'R:' prefix for raw (uncompressed)
 * @example
 * const compressed = Compression.compress(JSON.stringify(largeObject));
 * const original = Compression.decompress(compressed);
 * @see {@link https://github.com/pieroxy/lz-string|LZ-String Library}
 * @memberof module:storage-manager
 */
const Compression = {
  /**
   * Compress string using LZ-string if available and beneficial
   * @function compress
   * @memberof Compression
   * @param {string} str - String to compress
   * @returns {string} Compressed string with 'C:' prefix or original with 'R:' prefix
   * @description
   * Only compresses if:
   * - LZString library is available (typeof LZString !== 'undefined')
   * - String length exceeds COMPRESSION_THRESHOLD
   * - Compressed result is actually smaller
   */
  compress(str) {
    if (typeof LZString !== 'undefined' && str.length > CONFIG.COMPRESSION_THRESHOLD) {
      const compressed = LZString.compressToUTF16(str);
      return compressed.length < str.length ? `C:${compressed}` : `R:${str}`;
    }
    return `R:${str}`;
  },

  /**
   * Decompress string previously compressed with compress()
   * @function decompress
   * @memberof Compression
   * @param {string} str - Compressed string with 'C:' or 'R:' prefix
   * @returns {string|null} Original string or null if input is falsy
   * @description
   * Handles both compressed ('C:') and raw ('R:') formats.
   * Provides fallback for legacy uncompressed strings.
   */
  decompress(str) {
    if (!str) return null;
    if (str.startsWith('C:') && typeof LZString !== 'undefined') {
      return LZString.decompressFromUTF16(str.slice(2));
    }
    if (str.startsWith('R:')) return str.slice(2);
    // Legacy fallback
    return str;
  }
};

// ============= COOKIE STORAGE =============

/**
 * Cookie-based storage implementation
 * @namespace CookieStorage
 * @description
 * Provides cookie storage with automatic compression and size management.
 * Cookies are shared with the server and have a 4KB limit.
 * Useful for server-side rendering scenarios and sandbox escapes.
 *
 * Cookie format: _tracklay_{key}={compressed_value}; expires=...; path=/; SameSite=Lax
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie|Document.cookie}
 * @memberof module:storage-manager
 */
const CookieStorage = {
  /**
   * Store value in a cookie with automatic size management
   * @function set
   * @memberof CookieStorage
   * @param {string} key - Cookie name (will be prefixed)
   * @param {string} value - Value to store (will be compressed)
   * @param {number} [days=CONFIG.COOKIE_EXPIRY_DAYS] - Expiration time in days
   * @returns {boolean} True if successful, false if value too large or error occurred
   * @description
   * Automatically compresses the value and validates size against MAX_COOKIE_SIZE.
   * Sets SameSite=Lax for security.
   */
  set(key, value, days = CONFIG.COOKIE_EXPIRY_DAYS) {
    try {
      const prefixedKey = `${CONFIG.PREFIX}${key}`;
      const compressed = Compression.compress(value);
      const cookieStr = `${prefixedKey}=${encodeURIComponent(compressed)}; expires=${new Date(Date.now() + days * 86400000).toUTCString()}; path=/; SameSite=Lax`;
      
      if (cookieStr.length > CONFIG.MAX_COOKIE_SIZE) {
        console.warn(`[CookieStorage] Key "${key}" too large (${cookieStr.length} bytes)`);
        return false;
      }
      
      document.cookie = cookieStr;
      return true;
    } catch (e) {
      console.error('[CookieStorage] Set failed:', e);
      return false;
    }
  },

  /**
   * Retrieve value from a cookie
   * @function get
   * @memberof CookieStorage
   * @param {string} key - Cookie name (will be prefixed)
   * @returns {string|null} Decompressed value or null if not found/error
   */
  get(key) {
    try {
      const prefixedKey = `${CONFIG.PREFIX}${key}`;
      const match = document.cookie.match(new RegExp(`${prefixedKey}=([^;]+)`));
      if (match) {
        return Compression.decompress(decodeURIComponent(match[1]));
      }
      return null;
    } catch (e) {
      console.error('[CookieStorage] Get failed:', e);
      return null;
    }
  },

  /**
   * Remove a cookie
   * @function remove
   * @memberof CookieStorage
   * @param {string} key - Cookie name to remove (will be prefixed)
   * @description
   * Sets expiration date to past to immediately invalidate the cookie.
   */
  remove(key) {
    document.cookie = `${CONFIG.PREFIX}${key}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  },

  /**
   * Get all keys stored in cookies with the configured prefix
   * @function keys
   * @memberof CookieStorage
   * @returns {Array<string>} Array of keys (without prefix)
   */
  keys() {
    return document.cookie
      .split(';')
      .map(c => c.trim())
      .filter(c => c.startsWith(CONFIG.PREFIX))
      .map(c => c.split('=')[0].slice(CONFIG.PREFIX.length));
  }
};

// ============= LOCAL STORAGE =============

/**
 * localStorage implementation with quota management
 * @namespace LocalStorage
 * @description
 * Provides synchronous localStorage access with automatic compression.
 * Includes quota exceeded handling with automatic cleanup of oldest items.
 * Data persists indefinitely until explicitly cleared.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage|localStorage}
 * @memberof module:storage-manager
 */
const LocalStorage = {
  /**
   * Store value in localStorage
   * @function set
   * @memberof LocalStorage
   * @param {string} key - Storage key (will be prefixed)
   * @param {string} value - Value to store (will be compressed)
   * @returns {boolean} True if successful, false on quota exceeded or error
   * @description
   * If quota is exceeded, automatically cleans up oldest 20% of items and retries.
   */
  set(key, value) {
    try {
      localStorage.setItem(`${CONFIG.PREFIX}${key}`, Compression.compress(value));
      return true;
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        // Try to make space by removing old items
        this._cleanup();
        try {
          localStorage.setItem(`${CONFIG.PREFIX}${key}`, Compression.compress(value));
          return true;
        } catch (e2) {
          console.error('[LocalStorage] Quota exceeded even after cleanup');
          return false;
        }
      }
      return false;
    }
  },

  /**
   * Retrieve value from localStorage
   * @function get
   * @memberof LocalStorage
   * @param {string} key - Storage key (will be prefixed)
   * @returns {string|null} Decompressed value or null if not found/error
   */
  get(key) {
    try {
      const value = localStorage.getItem(`${CONFIG.PREFIX}${key}`);
      return value ? Compression.decompress(value) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Remove value from localStorage
   * @function remove
   * @memberof LocalStorage
   * @param {string} key - Storage key to remove (will be prefixed)
   */
  remove(key) {
    localStorage.removeItem(`${CONFIG.PREFIX}${key}`);
  },

  /**
   * Get all keys stored in localStorage with the configured prefix
   * @function keys
   * @memberof LocalStorage
   * @returns {Array<string>} Array of keys (without prefix)
   */
  keys() {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(CONFIG.PREFIX))
      .map(k => k.slice(CONFIG.PREFIX.length));
  },

  /**
   * Clean up oldest items to free quota
   * @function _cleanup
   * @memberof LocalStorage
   * @private
   * @description
   * Removes the oldest 20% of items based on timestamp metadata.
   * Items are expected to have a companion key with __ts suffix containing timestamp.
   */
  _cleanup() {
    // Remove oldest 20% of items
    const items = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(CONFIG.PREFIX)) {
        items.push({
          key,
          timestamp: parseInt(localStorage.getItem(`${key}__ts`) || '0')
        });
      }
    }
    items.sort((a, b) => a.timestamp - b.timestamp);
    const toRemove = Math.ceil(items.length * 0.2);
    items.slice(0, toRemove).forEach(item => localStorage.removeItem(item.key));
  }
};

// ============= SESSION STORAGE =============

/**
 * sessionStorage implementation
 * @namespace SessionStorage
 * @description
 * Provides tab-scoped storage that survives page refreshes but is cleared
 * when the tab/window is closed. Useful for temporary session data.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage|sessionStorage}
 * @memberof module:storage-manager
 */
const SessionStorage = {
  /**
   * Store value in sessionStorage
   * @function set
   * @memberof SessionStorage
   * @param {string} key - Storage key (will be prefixed)
   * @param {string} value - Value to store (will be compressed)
   * @returns {boolean} True if successful, false on error
   */
  set(key, value) {
    try {
      sessionStorage.setItem(`${CONFIG.PREFIX}${key}`, Compression.compress(value));
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Retrieve value from sessionStorage
   * @function get
   * @memberof SessionStorage
   * @param {string} key - Storage key (will be prefixed)
   * @returns {string|null} Decompressed value or null if not found/error
   */
  get(key) {
    try {
      const value = sessionStorage.getItem(`${CONFIG.PREFIX}${key}`);
      return value ? Compression.decompress(value) : null;
    } catch (e) {
      return null;
    }
  },

  /**
   * Remove value from sessionStorage
   * @function remove
   * @memberof SessionStorage
   * @param {string} key - Storage key to remove (will be prefixed)
   */
  remove(key) {
    sessionStorage.removeItem(`${CONFIG.PREFIX}${key}`);
  },

  /**
   * Get all keys stored in sessionStorage with the configured prefix
   * @function keys
   * @memberof SessionStorage
   * @returns {Array<string>} Array of keys (without prefix)
   */
  keys() {
    return Object.keys(sessionStorage)
      .filter(k => k.startsWith(CONFIG.PREFIX))
      .map(k => k.slice(CONFIG.PREFIX.length));
  }
};

// ============= INDEXEDDB STORAGE =============

/**
 * IndexedDB implementation for large structured data
 * @namespace IndexedDBStorage
 * @description
 * Provides asynchronous, high-capacity storage using IndexedDB.
 * Suitable for large datasets (50MB+) and complex objects.
 * Uses object store with timestamp index for efficient queries.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API|IndexedDB API}
 * @memberof module:storage-manager
 */
const IndexedDBStorage = {
  /**
   * Database connection instance
   * @type {IDBDatabase|null}
   * @private
   */
  db: null,

  /**
   * Initialize IndexedDB connection
   * @function init
   * @memberof IndexedDBStorage
   * @returns {Promise<IDBDatabase>} Database instance
   * @throws {Error} If database open fails
   * @description
   * Opens/creates the IndexedDB database and object store.
   * Creates timestamp index on first run (onupgradeneeded).
   */
  async init() {
    if (this.db) return this.db;
    
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(CONFIG.DB_NAME, CONFIG.DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(CONFIG.STORE_NAME)) {
          const store = db.createObjectStore(CONFIG.STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  },

  /**
   * Store value in IndexedDB
   * @function set
   * @memberof IndexedDBStorage
   * @param {string} key - Storage key (will be prefixed)
   * @param {string} value - Value to store
   * @returns {Promise<boolean>} True if successful, false on error
   */
  async set(key, value) {
    try {
      const db = await this.init();
      const transaction = db.transaction([CONFIG.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CONFIG.STORE_NAME);
      
      await new Promise((resolve, reject) => {
        const request = store.put({
          key: `${CONFIG.PREFIX}${key}`,
          value: value,
          timestamp: Date.now()
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      return true;
    } catch (e) {
      console.error('[IndexedDBStorage] Set failed:', e);
      return false;
    }
  },

  /**
   * Retrieve value from IndexedDB
   * @function get
   * @memberof IndexedDBStorage
   * @param {string} key - Storage key (will be prefixed)
   * @returns {Promise<string|null>} Stored value or null if not found/error
   */
  async get(key) {
    try {
      const db = await this.init();
      const transaction = db.transaction([CONFIG.STORE_NAME], 'readonly');
      const store = transaction.objectStore(CONFIG.STORE_NAME);
      
      return new Promise((resolve, reject) => {
        const request = store.get(`${CONFIG.PREFIX}${key}`);
        request.onsuccess = () => {
          const result = request.result;
          resolve(result ? result.value : null);
        };
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      return null;
    }
  },

  /**
   * Remove value from IndexedDB
   * @function remove
   * @memberof IndexedDBStorage
   * @param {string} key - Storage key to remove (will be prefixed)
   * @returns {Promise<void>}
   */
  async remove(key) {
    try {
      const db = await this.init();
      const transaction = db.transaction([CONFIG.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(CONFIG.STORE_NAME);
      await new Promise((resolve, reject) => {
        const request = store.delete(`${CONFIG.PREFIX}${key}`);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (e) {
      console.error('[IndexedDBStorage] Remove failed:', e);
    }
  }
};

// ============= BROADCAST CHANNEL =============

/**
 * BroadcastChannel implementation for cross-tab communication
 * @namespace BroadcastStorage
 * @description
 * Enables real-time synchronization between browser tabs/windows.
 * Fastest storage layer but provides no persistence.
 * Useful for immediate cross-tab state updates.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API|BroadcastChannel API}
 * @memberof module:storage-manager
 */
const BroadcastStorage = {
  /**
   * BroadcastChannel instance
   * @type {BroadcastChannel|null}
   * @private
   */
  channel: null,

  /**
   * Map of key -> Set(callback) for subscriptions
   * @type {Map<string, Set<Function>>}
   * @private
   */
  listeners: new Map(),

  /**
   * Initialize BroadcastChannel
   * @function init
   * @memberof BroadcastStorage
   * @returns {boolean} True if initialization succeeded or already initialized
   * @description
   * Creates the BroadcastChannel and sets up message handler.
   * Returns false if BroadcastChannel is not supported (e.g., in some private modes).
   */
  init() {
    if (typeof BroadcastChannel === 'undefined') return false;
    if (this.channel) return true;
    
    try {
      this.channel = new BroadcastChannel(`${CONFIG.PREFIX}sync`);
      this.channel.onmessage = (event) => {
        const { key, value, action } = event.data;
        if (action === 'set' && this.listeners.has(key)) {
          this.listeners.get(key).forEach(cb => cb(value));
        }
      };
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Broadcast a value change to all tabs
   * @function set
   * @memberof BroadcastStorage
   * @param {string} key - Key that changed
   * @param {*} value - New value
   * @returns {boolean} True if broadcast succeeded
   * @description
   * Sends message to all other tabs via BroadcastChannel.
   * Does not persist the value locally.
   */
  set(key, value) {
    if (!this.init()) return false;
    
    try {
      this.channel.postMessage({
        key,
        value,
        action: 'set',
        timestamp: Date.now()
      });
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * Subscribe to real-time changes for a specific key
   * @function subscribe
   * @memberof BroadcastStorage
   * @param {string} key - Key to watch for changes
   * @param {Function} callback - Function to call when value changes
   * @returns {Function} Unsubscribe function - call to stop receiving updates
   * @example
   * const unsubscribe = BroadcastStorage.subscribe('user_pref', (value) => {
   *   console.log('Preference changed:', value);
   * });
   * // Later...
   * unsubscribe();
   */
  subscribe(key, callback) {
    this.init();
    if (!this.listeners.has(key)) {
      this.listeners.set(key, new Set());
    }
    this.listeners.get(key).add(callback);
    
    return () => {
      this.listeners.get(key).delete(callback);
    };
  }
};

// ============= MAIN STORAGE MANAGER =============

/**
 * @typedef {Object} StorageSetResults
 * @property {boolean} broadcast - Success status for BroadcastChannel
 * @property {boolean} localStorage - Success status for localStorage
 * @property {boolean} sessionStorage - Success status for sessionStorage
 * @property {boolean} indexedDB - Success status for IndexedDB
 * @property {boolean} cookie - Success status for cookies
 * @description Results object returned by StorageManager.set()
 */

/**
 * Unified Storage Manager - Main API for all storage operations
 * @namespace StorageManager
 * @description
 * The primary interface for cross-layer storage operations.
 * Writes to all available storage layers for redundancy.
 * Reads from the fastest available layer.
 *
 * Storage Priority (read order):
 * 1. localStorage (sync, fastest persistent)
 * 2. sessionStorage (sync, tab-scoped)
 * 3. IndexedDB (async, large capacity)
 * 4. Cookie (sync, server-shared)
 *
 * @example
 * // Store data
 * await StorageManager.set('config', { theme: 'dark', lang: 'en' });
 *
 * // Retrieve data
 * const config = await StorageManager.get('config');
 *
 * // Check existence
 * if (await StorageManager.has('config')) { ... }
 *
 * // Remove data
 * await StorageManager.remove('config');
 *
 * // Subscribe to changes
 * const unsub = StorageManager.subscribe('config', (newValue) => {
 *   console.log('Config updated:', newValue);
 * });
 * @memberof module:storage-manager
 */
export const StorageManager = {
  /**
   * Store value in all available storage layers
   * @function set
   * @memberof StorageManager
   * @param {string} key - Storage key
   * @param {*} value - Value to store (will be JSON serialized)
   * @returns {Promise<StorageSetResults>} Success status for each storage layer
   * @description
   * Serializes value to JSON and writes to all available storage layers.
   * Each layer may succeed or fail independently.
   * Includes timestamp metadata for sync purposes.
   */
  async set(key, value) {
    const serialized = JSON.stringify(value);
    const timestamp = Date.now();
    const data = JSON.stringify({ value: serialized, ts: timestamp });
    
    const results = {
      broadcast: BroadcastStorage.set(key, value),
      localStorage: LocalStorage.set(key, data),
      sessionStorage: SessionStorage.set(key, data),
      indexedDB: await IndexedDBStorage.set(key, data),
      cookie: CookieStorage.set(key, data)
    };
    
    return results;
  },

  /**
   * Retrieve value from first available storage layer
   * @function get
   * @memberof StorageManager
   * @param {string} key - Storage key
   * @returns {Promise<*>} Parsed value or null if not found
   * @description
   * Attempts to read from storage layers in priority order:
   * localStorage → sessionStorage → IndexedDB → Cookie
   * Returns the first successful result.
   * Automatically parses JSON and extracts nested value structure.
   */
  async get(key) {
    // Try synchronous storages first
    let data = LocalStorage.get(key);
    if (data) return this._parse(data);
    
    data = SessionStorage.get(key);
    if (data) return this._parse(data);
    
    // Try async storages
    data = await IndexedDBStorage.get(key);
    if (data) return this._parse(data);
    
    data = CookieStorage.get(key);
    if (data) return this._parse(data);
    
    return null;
  },

  /**
   * Check if a key exists in any storage layer
   * @function has
   * @memberof StorageManager
   * @param {string} key - Storage key to check
   * @returns {Promise<boolean>} True if key exists in any layer
   */
  async has(key) {
    return (await this.get(key)) !== null;
  },

  /**
   * Remove a key from all storage layers
   * @function remove
   * @memberof StorageManager
   * @param {string} key - Storage key to remove
   * @returns {Promise<void>}
   * @description
   * Removes the key from all storage layers where it may exist.
   * Safe to call even if key doesn't exist in some layers.
   */
  async remove(key) {
    LocalStorage.remove(key);
    SessionStorage.remove(key);
    await IndexedDBStorage.remove(key);
    CookieStorage.remove(key);
  },

  /**
   * Subscribe to real-time changes for a key (BroadcastChannel only)
   * @function subscribe
   * @memberof StorageManager
   * @param {string} key - Key to watch for changes
   * @param {Function} callback - Handler called when value changes in other tabs
   * @returns {Function} Unsubscribe function
   * @description
   * Only receives changes from other tabs via BroadcastChannel.
   * Changes in the current tab must be manually handled.
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Broadcast_Channel_API|BroadcastChannel}
   */
  subscribe(key, callback) {
    return BroadcastStorage.subscribe(key, callback);
  },

  /**
   * Get all unique keys across all storage layers
   * @function getAllKeys
   * @memberof StorageManager
   * @returns {Array<string>} Array of unique keys (without prefix)
   * @description
   * Aggregates keys from localStorage, sessionStorage, and cookies.
   * IndexedDB keys are not included due to async nature.
   */
  getAllKeys() {
    const allKeys = new Set([
      ...LocalStorage.keys(),
      ...SessionStorage.keys(),
      ...CookieStorage.keys()
    ]);
    return Array.from(allKeys);
  },

  /**
   * Synchronize all storage layers by promoting values to faster layers
   * @function sync
   * @memberof StorageManager
   * @returns {Promise<void>}
   * @description
   * Ensures consistency across all storage layers.
   * Re-writes all existing keys to all layers.
   * Useful on application startup to recover from partial storage failures.
   * @example
   * // Run on app initialization
   * await StorageManager.sync();
   */
  async sync() {
    const keys = this.getAllKeys();
    
    for (const key of keys) {
      const value = await this.get(key);
      if (value) {
        await this.set(key, value.value); // Re-write to all layers
      }
    }
  },

  /**
   * Parse stored data structure
   * @function _parse
   * @memberof StorageManager
   * @private
   * @param {string} data - Raw stored data
   * @returns {*} Parsed value
   * @description
   * Internal helper to parse the nested JSON structure.
   * Handles both new format ({ value, ts }) and legacy format.
   */
  _parse(data) {
    try {
      const parsed = JSON.parse(data);
      return parsed.value ? JSON.parse(parsed.value) : parsed;
    } catch (e) {
      return data;
    }
  }
};

// Auto-sync on load
if (typeof window !== 'undefined') {
  StorageManager.sync();
}
