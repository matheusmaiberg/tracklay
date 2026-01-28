/**
 * @fileoverview Deduplicator - Fast Event Deduplication System
 * @module deduplicator
 *
 * @description
 * Lightweight event deduplication using in-memory Map cache (max 1000 events).
 * Prevents duplicate events by checking ID and fingerprint matching.
 * Automatically manages cache size with FIFO eviction.
 *
 * @example
 * import { Deduplicator } from './module.deduplicator.js';
 * if (!Deduplicator.isDuplicate(event)) {
 *   Deduplicator.markProcessed(event);
 * }
 */

// ============= IMPORTS =============

import { ConfigManager } from './module.config.js';
import { Logger } from './module.logger.js';

// ============= LOGGER SETUP =============
const log = Logger ? Logger.create('Deduplicator') : {
  debug: () => {},
  info: () => {},
  warn: (...args) => console.warn('[Deduplicator]', ...args),
  error: (...args) => console.error('[Deduplicator]', ...args)
};

// ============= CONFIGURATION =============

/**
 * Local config fallback - used when ConfigManager is not available
 * These values are overridden by config.js central configuration
 * @deprecated Use ConfigManager.get() instead
 */
const LOCAL_CONFIG = {
  MAX_CACHE_SIZE: 1000,
  FINGERPRINT_FIELDS: ['name', 'data.transaction_id', 'data.value', 'data.currency']
};

/**
 * Get configuration value from ConfigManager with fallback
 * @param {string} path - Dot-notation config path
 * @param {string} localKey - Local config key for fallback
 * @returns {*} Configuration value
 */
function getConfig(path, localKey) {
  const localVal = LOCAL_CONFIG[localKey];
  if (typeof ConfigManager !== 'undefined' && ConfigManager.get) {
    return ConfigManager.get(path, localVal);
  }
  return localVal;
}

// ============= STATE =============

// NOTE: These module-level caches are intentionally shared across all instances.
// This design enables deduplication across multiple Deduplicator calls/references
// within the same module context. Do not convert to instance properties.
let memoryCache = new Map();
let fingerprintCache = new Set();

// WeakMap to track generated IDs for events without an ID
// This prevents race condition between isDuplicate() and markProcessed()
const generatedIdMap = new WeakMap();

// ============= UTILITY FUNCTIONS =============

const getNestedValue = (obj, path) => {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
};

const createFingerprint = (event) => {
  const fingerprintFields = getConfig('FINGERPRINT_FIELDS', 'FINGERPRINT_FIELDS');
  const values = fingerprintFields.map(field => getNestedValue(event, field));
  const str = values.filter(Boolean).join('|');

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & 0xFFFFFFFF;
  }
  return hash.toString(36);
};

// ============= PUBLIC API =============

/**
 * Checks if an event is a duplicate by ID or fingerprint match
 * @param {Object} event - Event to check
 * @returns {boolean} True if event has been processed before
 */
const isDuplicate = (event) => {
  if (!event) return false;

  // Get or generate consistent ID (stored in WeakMap to avoid race condition)
  let eventId = event.id;
  if (!eventId) {
    eventId = generatedIdMap.get(event);
    if (!eventId) {
      eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      generatedIdMap.set(event, eventId);
    }
  }
  const eventFingerprint = createFingerprint(event);

  // Check by ID
  if (memoryCache.has(eventId)) {
    return true;
  }

  // Check by fingerprint (O(1) lookup)
  if (fingerprintCache.has(eventFingerprint)) {
    return true;
  }

  return false;
};

/**
 * Marks an event as processed and adds it to cache
 * Uses FIFO eviction when cache exceeds max size
 * @param {Object} event - Event to mark as processed
 * @returns {void}
 */
const markProcessed = (event) => {
  if (!event) return;

  // Get or generate consistent ID (reuse ID from isDuplicate if already generated)
  let eventId = event.id;
  if (!eventId) {
    eventId = generatedIdMap.get(event);
    if (!eventId) {
      eventId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      generatedIdMap.set(event, eventId);
    }
  }
  const fingerprint = createFingerprint(event);

  const record = {
    id: eventId,
    fingerprint,
    name: event.name,
    timestamp: Date.now()
  };

  memoryCache.set(eventId, record);
  fingerprintCache.add(fingerprint);

  // FIFO eviction: remove oldest entries while cache exceeds max size
  // This handles burst insertions where multiple items are added at once
  const maxCacheSize = getConfig('DEDUPLICATOR.MAX_CACHE_SIZE', 'MAX_CACHE_SIZE') || 1000;
  while (memoryCache.size > maxCacheSize) {
    const firstKey = memoryCache.keys().next().value;
    const removedRecord = memoryCache.get(firstKey);
    if (removedRecord) {
      fingerprintCache.delete(removedRecord.fingerprint);
    }
    memoryCache.delete(firstKey);
  }
};

/**
 * Initialize Deduplicator with options
 * @param {Object} [options={}] - Configuration options to merge
 * @returns {Object} Deduplicator instance
 * 
 * @example
 * Deduplicator.init({
 *   FINGERPRINT_FIELDS: ['name', 'data.checkout.order.id', 'data.value'],
 *   DEDUPLICATOR: { MAX_CACHE_SIZE: 500 }
 * });
 */
const init = (options = {}) => {
  if (typeof ConfigManager !== 'undefined' && ConfigManager.merge) {
    ConfigManager.merge(options);
  }
  return Deduplicator;
};

/**
 * Returns debug statistics about the cache
 * @returns {Object} Stats with cache size and sample events
 */
const getStats = () => {
  return {
    cacheSize: memoryCache.size,
    maxSize: getConfig('DEDUPLICATOR.MAX_CACHE_SIZE', 'MAX_CACHE_SIZE') || 1000,
    events: Array.from(memoryCache.values()).slice(-10)
  };
};

/**
 * Clears all cached events
 * @returns {void}
 */
const clear = () => {
  memoryCache.clear();
  fingerprintCache.clear();
};

// ============= EXPORT =============

export const Deduplicator = {
  isDuplicate,
  markProcessed,
  getStats,
  clear,
  init,
  shouldProcess: (event) => !isDuplicate(event),
  get CONFIG() {
    return {
      MAX_CACHE_SIZE: getConfig('DEDUPLICATOR.MAX_CACHE_SIZE', 'MAX_CACHE_SIZE') || 1000,
      FINGERPRINT_FIELDS: getConfig('FINGERPRINT_FIELDS', 'FINGERPRINT_FIELDS')
    };
  }
};

// Browser global fallback
if (typeof window !== 'undefined') {
  window.Deduplicator = Deduplicator;
}
