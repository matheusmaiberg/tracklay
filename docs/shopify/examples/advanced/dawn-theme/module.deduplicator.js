/**
 * @fileoverview Fast Event Deduplication System - Prevents duplicate events
 * using in-memory Map cache with ID and fingerprint matching.
 */

// ============= IMPORTS =============

import { ConfigManager } from './module.config.js';
import { Logger } from './module.logger.js';

// ============= LOGGER SETUP =============

const log = Logger.create('Deduplicator');

// ============= STATE =============

// Module-level caches are intentionally shared across all instances
let memoryCache = new Map();
let fingerprintCache = new Set();

// WeakMap to track generated IDs for events without an ID
const generatedIdMap = new WeakMap();

// ============= UTILITY FUNCTIONS =============

const getNestedValue = (obj, path) => {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
};

const createFingerprint = (event) => {
  const fingerprintFields = ConfigManager.get('FINGERPRINT_FIELDS');
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
 * @param {Object} event
 * @returns {boolean}
 */
const isDuplicate = (event) => {
  if (!event) return false;

  // Get or generate consistent ID (stored in WeakMap to avoid race condition)
  let eventId = event.id;
  if (!eventId) {
    eventId = generatedIdMap.get(event);
    if (!eventId) {
      eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
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
 * @param {Object} event
 * @returns {void}
 */
const markProcessed = (event) => {
  if (!event) return;

  // Get or generate consistent ID (reuse ID from isDuplicate if already generated)
  let eventId = event.id;
  if (!eventId) {
    eventId = generatedIdMap.get(event);
    if (!eventId) {
      eventId = `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
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

  // FIFO eviction
  let maxCacheSize = Number(ConfigManager.get('DEDUPLICATOR.MAX_CACHE_SIZE')) || 1000;
  if (maxCacheSize <= 0) {
    log.warn('Invalid maxCacheSize, using default 1000');
    maxCacheSize = 1000;
  }
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
 * @param {Object} [options={}]
 * @returns {Object}
 */
const init = (options = {}) => {
  if (typeof ConfigManager !== 'undefined' && ConfigManager.merge) {
    ConfigManager.merge(options);
  }
  return Deduplicator;
};

/**
 * @returns {Object}
 */
const getStats = () => {
  return {
    cacheSize: memoryCache.size,
    maxSize: ConfigManager.get('DEDUPLICATOR.MAX_CACHE_SIZE') || 1000,
    events: Array.from(memoryCache.values()).slice(-10)
  };
};

/**
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
      MAX_CACHE_SIZE: ConfigManager.get('DEDUPLICATOR.MAX_CACHE_SIZE') || 1000,
      FINGERPRINT_FIELDS: ConfigManager.get('FINGERPRINT_FIELDS')
    };
  }
};

// Browser global fallback
if (typeof window !== 'undefined') {
  window.Deduplicator = Deduplicator;
}
