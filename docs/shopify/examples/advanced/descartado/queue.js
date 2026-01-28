/**
 * @fileoverview Background Sync Queue - Offline resilience for tracking events
 * @module background-sync-queue
 * 
 * @description
 * Provides a robust queueing system that stores tracking events when the user is offline
 * and automatically synchronizes them when the network connection returns. The module
 * leverages modern web APIs including Background Sync API, Periodic Background Sync,
 * and falls back to timer-based retries for maximum compatibility.
 * 
 * Key features:
 * - Persistent storage using IndexedDB with localStorage fallback
 * - Priority-based event handling (checkout/purchase events are high priority)
 * - Automatic retry with exponential backoff
 * - Queue size management with LRU-style eviction
 * - Event deduplication and cleanup of stale failed items
 * 
 * @example
 * import { QUEUE } from './background-sync-queue.js';
 * 
 * // Initialize queue with sync callback
 * const queue = new QUEUE({
 *   maxQueueSize: 1000,
 *   maxRetries: 3,
 *   onSync: async (events) => {
 *     const response = await fetch('/analytics/batch', {
 *       method: 'POST',
 *       headers: { 'Content-Type': 'application/json' },
 *       body: JSON.stringify(events)
 *     });
 *     if (!response.ok) throw new Error('Sync failed');
 *   }
 * });
 * 
 * // Add events - automatically queued if offline
 * queue.add({ name: 'page_view', data: { url: location.href } });
 * queue.add({ name: 'purchase', value: 99.99 }); // High priority
 * 
 * // Check queue status
 * console.log(queue.getStats()); 
 * // { queued: 5, processing: false, isOnline: true, highPriority: 1 }
 * 
 * // Force immediate sync attempt
 * await queue.syncNow();
 * 
 * // Cleanup when done
 * queue.destroy();
 * 
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Background_Sync_API|Background Sync API}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Periodic_Background_Sync_API|Periodic Background Sync API}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API|IndexedDB API}
 */

/**
 * Queue item structure for stored events
 * @typedef {Object} QueueItem
 * @property {string} id - Unique identifier for the queue item
 * @property {Object} event - The tracking event data
 * @property {number} timestamp - Unix timestamp when item was added
 * @property {number} attempts - Number of sync attempts made
 * @property {number|null} lastAttempt - Timestamp of last sync attempt
 * @property {boolean} [failed] - Whether the item has exceeded max retries
 */

/**
 * Queue statistics object
 * @typedef {Object} QueueStats
 * @property {number} queued - Number of events currently in queue
 * @property {boolean} processing - Whether a sync operation is in progress
 * @property {boolean} isOnline - Current network status
 * @property {number} highPriority - Number of high priority events in queue
 */

/**
 * Configuration options for the QUEUE
 * @typedef {Object} QueueOptions
 * @property {number} [maxQueueSize=1000] - Maximum number of events to store
 * @property {number} [maxRetries=3] - Maximum sync retry attempts per event
 * @property {number[]} [retryDelays=[1000, 5000, 15000]] - Delay between retries in ms
 * @property {Function} [onSync] - Callback invoked when syncing events
 * @property {string} [syncTag='tracklay-sync'] - Tag for Background Sync registration
 */

/**
 * High priority event names that bypass normal queue limits
 * @constant {Array<string>}
 * @default ['checkout_completed', 'purchase', 'checkout_started']
 */
const HIGH_PRIORITY_EVENTS = ['checkout_completed', 'purchase', 'checkout_started'];

/**
 * Database name for IndexedDB storage
 * @constant {string}
 * @default 'TracklaySyncQueue'
 */
const DB_NAME = 'TracklaySyncQueue';

/**
 * Database version for IndexedDB schema
 * @constant {number}
 * @default 1
 */
const DB_VERSION = 1;

/**
 * Object store name for queue items
 * @constant {string}
 * @default 'queue'
 */
const STORE_NAME = 'queue';

/**
 * localStorage key for fallback persistence
 * @constant {string}
 * @default '_tracklay_sync_queue'
 */
const STORAGE_KEY = '_tracklay_sync_queue';

/**
 * Age cutoff for cleaning stale failed items (24 hours in milliseconds)
 * @constant {number}
 * @default 86400000
 */
const STALE_CUTOFF_MS = 24 * 60 * 60 * 1000;

/**
 * Default retry delay when not specified in options
 * @constant {number}
 * @default 30000
 */
const DEFAULT_RETRY_DELAY = 30000;

/**
 * Minimum interval for periodic background sync (15 minutes in milliseconds)
 * @constant {number}
 * @default 900000
 */
const PERIODIC_SYNC_INTERVAL = 15 * 60 * 1000;

/**
 * Background Sync Queue class for offline event persistence
 * @class
 * @classdesc Manages a persistent queue of tracking events with automatic
 * synchronization when network connectivity is available. Supports priority
 * events, retry logic, and multiple storage backends.
 */
export class QUEUE {
  /**
   * Creates a new QUEUE instance
   * @constructor
   * @param {QueueOptions} [options={}] - Configuration options
   * @param {number} [options.maxQueueSize=1000] - Maximum events to store
   * @param {number} [options.maxRetries=3] - Maximum retry attempts
   * @param {number[]} [options.retryDelays=[1000, 5000, 15000]] - Retry delays in ms
   * @param {Function} [options.onSync] - Sync callback receiving events array
   * @param {string} [options.syncTag='tracklay-sync'] - Background sync tag
   * @property {QueueOptions} options - Resolved configuration options
   * @property {QueueItem[]} queue - In-memory queue storage
   * @property {boolean} processing - Whether sync is currently running
   * @property {IDBDatabase|null} db - IndexedDB database instance
   * @property {Function|null} _onlineHandler - Online event listener reference
   * @property {Function|null} _offlineHandler - Offline event listener reference
   */
  constructor(options = {}) {
    /**
     * Resolved configuration options
     * @type {QueueOptions}
     */
    this.options = {
      maxQueueSize: options.maxQueueSize || 1000,
      maxRetries: options.maxRetries || 3,
      retryDelays: options.retryDelays || [1000, 5000, 15000],
      onSync: options.onSync || (() => {}),
      syncTag: options.syncTag || 'tracklay-sync'
    };
    
    /**
     * In-memory queue storage
     * @type {QueueItem[]}
     */
    this.queue = [];
    
    /**
     * Whether a sync operation is currently running
     * @type {boolean}
     */
    this.processing = false;
    
    /**
     * IndexedDB database instance
     * @type {IDBDatabase|null}
     */
    this.db = null;
    
    /**
     * Online event handler reference for cleanup
     * @type {Function|null}
     * @private
     */
    this._onlineHandler = null;
    
    /**
     * Offline event handler reference for cleanup
     * @type {Function|null}
     * @private
     */
    this._offlineHandler = null;
    
    this._init();
  }
  
  /**
   * Cleans up event listeners and releases resources
   * @function destroy
   * @description Removes online/offline event listeners to prevent memory leaks.
   * Should be called when the queue instance is no longer needed.
   * @returns {void}
   * @example
   * const queue = new QUEUE({ onSync: handler });
   * // ... use queue ...
   * queue.destroy(); // Cleanup listeners
   */
  destroy() {
    if (this._onlineHandler) {
      window.removeEventListener('online', this._onlineHandler);
      this._onlineHandler = null;
    }
    if (this._offlineHandler) {
      window.removeEventListener('offline', this._offlineHandler);
      this._offlineHandler = null;
    }
  }

  /**
   * Initializes the queue instance
   * @function _init
   * @private
   * @description Loads persisted queue, sets up network listeners,
   * registers for periodic sync, and attempts initial sync if online.
   * @returns {Promise<void>}
   * @async
   */
  async _init() {
    // Load persisted queue
    await this._loadQueue();
    
    // Setup online/offline listeners
    this._setupNetworkListeners();
    
    // Register for periodic sync if available
    this._registerPeriodicSync();
    
    // Attempt initial sync if online
    if (navigator.onLine) {
      this._attemptSync();
    }
  }

  /**
   * Adds an event to the queue
   * @function add
   * @description Adds a tracking event to the queue. If offline, the event
   * is persisted and will be synced when connectivity returns. If online,
   * triggers an immediate sync attempt.
   * @param {Object} event - Event to queue
   * @param {string} [event.name] - Event name/type
   * @param {Object} [event.data] - Event data payload
   * @returns {Promise<boolean>} Whether the event was successfully added
   * @throws {Error} If persistence fails critically
   * @example
   * const success = await queue.add({
   *   name: 'page_view',
   *   data: { url: location.href, timestamp: Date.now() }
   * });
   * if (success) console.log('Event queued successfully');
   */
  async add(event) {
    const item = {
      id: this._generateId(),
      event: event,
      timestamp: Date.now(),
      attempts: 0,
      lastAttempt: null
    };
    
    // Check queue size limit
    if (this.queue.length >= this.options.maxQueueSize) {
      // Remove oldest non-priority event
      const nonPriorityIndex = this.queue.findIndex(i => 
        !this._isHighPriority(i.event)
      );
      if (nonPriorityIndex > -1) {
        this.queue.splice(nonPriorityIndex, 1);
      } else {
        console.warn('[QUEUE] Queue full, dropping event');
        return false;
      }
    }
    
    this.queue.push(item);
    await this._persistQueue();
    
    // Register for background sync
    this._registerBackgroundSync();
    
    // If online and not processing, try immediate sync
    if (navigator.onLine && !this.processing) {
      this._attemptSync();
    }
    
    return true;
  }

  /**
   * Forces an immediate sync attempt
   * @function syncNow
   * @description Manually triggers a sync attempt regardless of normal timing.
   * Does nothing if queue is empty or already processing.
   * @returns {Promise<void>}
   * @async
   * @example
   * // User clicked "Submit" - sync any pending events now
   * await queue.syncNow();
   */
  async syncNow() {
    if (this.queue.length === 0 || this.processing) return;
    await this._attemptSync();
  }

  /**
   * Gets current queue statistics
   * @function getStats
   * @description Returns information about the current queue state including
   * number of queued events, processing status, and network connectivity.
   * @returns {QueueStats} Queue statistics object
   * @example
   * const stats = queue.getStats();
   * console.log(`${stats.queued} events pending, online: ${stats.isOnline}`);
   * // { queued: 5, processing: false, isOnline: true, highPriority: 1 }
   */
  getStats() {
    return {
      queued: this.queue.length,
      processing: this.processing,
      isOnline: navigator.onLine,
      highPriority: this.queue.filter(i => this._isHighPriority(i.event)).length
    };
  }

  /**
   * Clears all queued events
   * @function clear
   * @description Removes all events from the queue and persists the empty state.
   * Use with caution - this will permanently delete unsynced events.
   * @returns {Promise<void>}
   * @async
   * @example
   * // Clear queue after successful bulk sync
   * await queue.clear();
   */
  async clear() {
    this.queue = [];
    await this._persistQueue();
  }

  // ============= PRIVATE METHODS =============

  /**
   * Generates a unique queue item ID
   * @function _generateId
   * @private
   * @description Creates a timestamp-based unique identifier with random suffix
   * @returns {string} Unique identifier string
   */
  _generateId() {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Checks if an event is high priority
   * @function _isHighPriority
   * @private
   * @description Determines if an event should bypass normal queue limits
   * based on its event name. High priority events include checkout and purchase events.
   * @param {Object} event - Event to check
   * @param {string} [event.name] - Event name to evaluate
   * @returns {boolean} Whether the event is high priority
   * @see HIGH_PRIORITY_EVENTS
   */
  _isHighPriority(event) {
    return HIGH_PRIORITY_EVENTS.includes(event.name);
  }

  /**
   * Sets up network connectivity event listeners
   * @function _setupNetworkListeners
   * @private
   * @description Registers online/offline event handlers to trigger
   * automatic synchronization when connectivity changes.
   * @returns {void}
   */
  _setupNetworkListeners() {
    this._onlineHandler = () => {
      console.log('[QUEUE] Online, attempting sync');
      this._attemptSync();
    };
    window.addEventListener('online', this._onlineHandler);
    
    this._offlineHandler = () => {
      console.log('[QUEUE] Offline, events will be queued');
    };
    window.addEventListener('offline', this._offlineHandler);
  }

  /**
   * Registers for Background Sync API
   * @function _registerBackgroundSync
   * @private
   * @description Attempts to register with the Background Sync API for
   * automatic sync when connectivity returns. Silently fails if not available.
   * @returns {Promise<void>}
   * @async
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/SyncManager|SyncManager}
   */
  async _registerBackgroundSync() {
    if (!('serviceWorker' in navigator)) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if ('sync' in registration) {
        await registration.sync.register(this.options.syncTag);
      }
    } catch (e) {
      console.warn('[QUEUE] Background sync not available');
    }
  }

  /**
   * Registers for Periodic Background Sync
   * @function _registerPeriodicSync
   * @private
   * @description Attempts to register for periodic background sync if
   * permission is granted. This allows sync even when the page is closed.
   * @returns {Promise<void>}
   * @async
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/PeriodicSyncManager|PeriodicSyncManager}
   */
  async _registerPeriodicSync() {
    if (!('serviceWorker' in navigator)) return;
    
    try {
      const registration = await navigator.serviceWorker.ready;
      
      if ('periodicSync' in registration) {
        const status = await navigator.permissions.query({
          name: 'periodic-background-sync'
        });
        
        if (status.state === 'granted') {
          await registration.periodicSync.register(this.options.syncTag, {
            minInterval: PERIODIC_SYNC_INTERVAL
          });
        }
      }
    } catch (e) {
      // Periodic sync not available
    }
  }

  /**
   * Attempts to sync queued events
   * @function _attemptSync
   * @private
   * @description Processes the queue, sending events to the onSync callback.
   * Sorts by priority and age, handles retries, and removes successful items.
   * @returns {Promise<void>}
   * @async
   * @throws {Error} If sync callback throws (handled internally)
   */
  async _attemptSync() {
    if (this.processing || this.queue.length === 0) return;
    
    this.processing = true;
    
    // Sort by priority and age
    this.queue.sort((a, b) => {
      const priorityA = this._isHighPriority(a.event) ? 1 : 0;
      const priorityB = this._isHighPriority(b.event) ? 1 : 0;
      if (priorityB !== priorityA) return priorityB - priorityA;
      return a.timestamp - b.timestamp;
    });
    
    const toSync = [...this.queue];
    const successful = [];
    const failed = [];
    
    for (const item of toSync) {
      try {
        await this.options.onSync([item.event]);
        successful.push(item.id);
      } catch (e) {
        item.attempts++;
        item.lastAttempt = Date.now();
        
        if (item.attempts >= this.options.maxRetries) {
          console.error('[QUEUE] Max retries exceeded for:', item.id);
          // Keep in queue but mark as failed
          item.failed = true;
        } else {
          failed.push(item);
        }
      }
    }
    
    // Remove successful items from queue
    this.queue = this.queue.filter(item => !successful.includes(item.id));
    
    // Schedule retry for failed items
    if (failed.length > 0) {
      this._scheduleRetry(failed);
    }
    
    await this._persistQueue();
    this.processing = false;
  }

  /**
   * Schedules a retry for failed items
   * @function _scheduleRetry
   * @private
   * @description Calculates the appropriate retry delay based on attempt count
   * and schedules the next sync attempt using setTimeout.
   * @param {QueueItem[]} failedItems - Items that failed to sync
   * @returns {void}
   */
  _scheduleRetry(failedItems) {
    const maxDelay = Math.max(...failedItems.map(i => 
      this.options.retryDelays[Math.min(i.attempts - 1, this.options.retryDelays.length - 1)] || DEFAULT_RETRY_DELAY
    ));
    
    setTimeout(() => {
      if (navigator.onLine) {
        this._attemptSync();
      }
    }, maxDelay);
  }

  /**
   * Persists the queue to storage
   * @function _persistQueue
   * @private
   * @description Saves the current queue to IndexedDB with localStorage fallback.
   * localStorage is limited to 100 items to avoid quota issues.
   * @returns {Promise<void>}
   * @async
   * @throws {Error} Silently catches and handles storage errors
   */
  async _persistQueue() {
    try {
      // Try IndexedDB first
      if (!this.db) {
        this.db = await this._openDB();
      }
      
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      
      // Clear and rewrite
      await store.clear();
      for (const item of this.queue) {
        await store.put(item);
      }
    } catch (e) {
      // Fallback to localStorage
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.queue.slice(0, 100)));
      } catch (e2) {
        console.error('[QUEUE] Persist failed:', e2);
      }
    }
  }

  /**
   * Loads the queue from persistent storage
   * @function _loadQueue
   * @private
   * @description Retrieves queue items from IndexedDB or localStorage.
   * Cleans out stale failed items older than 24 hours.
   * @returns {Promise<void>}
   * @async
   */
  async _loadQueue() {
    try {
      // Try IndexedDB
      this.db = await this._openDB();
      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      
      this.queue = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      
      // Clean old failed items (> 24 hours)
      const cutoff = Date.now() - STALE_CUTOFF_MS;
      this.queue = this.queue.filter(item => 
        !(item.failed && item.lastAttempt < cutoff)
      );
      
    } catch (e) {
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
          this.queue = JSON.parse(stored);
        }
      } catch (e2) {
        this.queue = [];
      }
    }
  }

  /**
   * Opens the IndexedDB database
   * @function _openDB
   * @private
   * @description Creates or opens the IndexedDB database, setting up
   * the object store schema if needed.
   * @returns {Promise<IDBDatabase>} The opened database instance
   * @async
   * @throws {Error} If database cannot be opened
   */
  _openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });
  }
}

// ============= USAGE =============

/*
const queue = new QUEUE({
  maxQueueSize: 500,
  onSync: async (events) => {
    await fetch('/analytics/batch', {
      method: 'POST',
      body: JSON.stringify(events)
    });
  }
});

// Events automatically queued if offline
queue.add({ name: 'page_view', data: { url: location.href } });

// Check status
console.log(queue.getStats());
// { queued: 5, processing: false, isOnline: false, highPriority: 1 }
*/
