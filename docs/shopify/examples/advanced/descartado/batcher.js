/**
 * @fileoverview Smart Batcher - Adaptive event batching with sliding window
 * @module smart-batcher
 * 
 * @description
 * Intelligently batches tracking events for optimal network efficiency.
 * Adapts batch size and flush interval based on event priority, network speed,
 * and page visibility state to minimize requests while ensuring timely delivery.
 * 
 * Features:
 * - Sliding time window (adapts to event frequency)
 * - Priority-based flushing (high priority events sent immediately)
 * - Size-based flushing (batch size limits)
 * - Network-aware batching (slower networks = smaller batches)
 * - Visibility-aware flushing (flushes on page hide using sendBeacon)
 * - Adaptive flush intervals based on batch fill rate
 * 
 * The batcher automatically adjusts its behavior based on:
 * - Event priority (purchase/checkout events flush immediately)
 * - Network conditions (2G/3G/4G affects batch sizes)
 * - Batch fill rate (faster flushes when batch is nearly full)
 * - Page visibility (flushes when user navigates away)
 * 
 * @example
 * import { SmartBatcher } from './smart-batcher.js';
 * 
 * const batcher = new SmartBatcher({
 *   maxBatchSize: 50,
 *   maxBatchBytes: 50000,
 *   minFlushInterval: 1000,
 *   maxFlushInterval: 30000,
 *   priorityThreshold: 70,
 *   beaconUrl: '/analytics/beacon',
 *   onFlush: (events, meta) => {
 *     console.log(`Flushing ${meta.count} events`);
 *     sendToAnalytics(events);
 *   },
 *   onError: (err) => console.error('Batch failed:', err)
 * });
 * 
 * // Regular event - batched normally
 * batcher.add({ name: 'page_view', data: { url: location.href } });
 * 
 * // High priority event - sent immediately
 * batcher.add({ name: 'purchase', value: 100 });
 * 
 * // Force immediate flush
 * await batcher.flush();
 * 
 * // Cleanup when done
 * batcher.destroy();
 * 
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon|sendBeacon API}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API|Network Information API}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API|Page Visibility API}
 */

/**
 * Configuration options for SmartBatcher
 * @typedef {Object} SmartBatcherOptions
 * @property {number} [maxBatchSize=50] - Maximum number of events per batch
 * @property {number} [maxBatchBytes=50000] - Maximum batch size in bytes
 * @property {number} [minFlushInterval=1000] - Minimum flush interval in milliseconds
 * @property {number} [maxFlushInterval=30000] - Maximum flush interval in milliseconds
 * @property {number} [priorityThreshold=70] - Priority threshold for immediate flush (0-100)
 * @property {string} [beaconUrl='/batch'] - URL for sendBeacon fallback on page hide
 * @property {Function} [onFlush] - Callback invoked when batch is flushed
 * @property {Function} [onError] - Callback invoked on flush errors
 */

/**
 * Enriched event object with batcher metadata
 * @typedef {Object} EnrichedEvent
 * @property {string} _id - Unique event identifier
 * @property {number} _timestamp - Unix timestamp when added to batch
 * @property {number} _priority - Calculated event priority (0-100)
 * @property {string} [name] - Event name/type
 * @property {*} [...] - Original event properties
 */

/**
 * Flush metadata object passed to onFlush callback
 * @typedef {Object} FlushMeta
 * @property {number} count - Number of events being flushed
 * @property {number} bytes - Total size of events in bytes
 * @property {string} networkSpeed - Current network speed classification
 */

/**
 * Add event options
 * @typedef {Object} AddOptions
 * @property {boolean} [immediate] - Force immediate flush regardless of priority
 */

/**
 * Event priority mapping for known event types
 * @constant {Object<string, number>}
 * @property {number} checkout_completed - 100 (highest priority)
 * @property {number} purchase - 100 (highest priority)
 * @property {number} checkout_started - 90 (high priority)
 * @property {number} product_added_to_cart - 60 (medium priority)
 * @property {number} page_viewed - 20 (low priority)
 */
const EVENT_PRIORITIES = {
  'checkout_completed': 100,
  'purchase': 100,
  'checkout_started': 90,
  'product_added_to_cart': 60,
  'page_viewed': 20
};

/**
 * Network speed multipliers for adaptive batch sizing
 * @constant {Object<string, number>}
 * @property {number} slow-2g - 0.2 (20% of max batch size)
 * @property {number} 2g - 0.3 (30% of max batch size)
 * @property {number} 3g - 0.6 (60% of max batch size)
 * @property {number} 4g - 1.0 (100% of max batch size)
 */
const NETWORK_MULTIPLIERS = {
  'slow-2g': 0.2,
  '2g': 0.3,
  '3g': 0.6,
  '4g': 1.0
};

/**
 * Default network speed when Network Information API is unavailable
 * @constant {string}
 * @default '4g'
 */
const DEFAULT_NETWORK_SPEED = '4g';

/**
 * Default beacon URL for sendBeacon fallback
 * @constant {string}
 * @default '/batch'
 */
const DEFAULT_BEACON_URL = '/batch';

/**
 * Fill rate threshold for accelerating flush (80% full)
 * @constant {number}
 * @default 0.8
 */
const FILL_RATE_HIGH = 0.8;

/**
 * Fill rate threshold for slowing down flush (10% full)
 * @constant {number}
 * @default 0.1
 */
const FILL_RATE_LOW = 0.1;

/**
 * Interval multiplier when batch is nearly full (flush faster)
 * @constant {number}
 * @default 0.5
 */
const INTERVAL_SPEEDUP = 0.5;

/**
 * Interval multiplier when batch is sparse (flush slower)
 * @constant {number}
 * @default 1.2
 */
const INTERVAL_SLOWDOWN = 1.2;

/**
 * Smart Batcher class for adaptive event batching with network-aware behavior
 * @class
 * @classdesc Efficiently batches tracking events for network optimization while
 * ensuring high-priority events are delivered promptly. Adapts batch sizes based
 * on network conditions and flushes intelligently based on event frequency.
 * @see SmartBatcherOptions
 */
export class SmartBatcher {
  /**
   * Creates a new SmartBatcher instance
   * @constructor
   * @param {SmartBatcherOptions} [options={}] - Configuration options
   * @param {number} [options.maxBatchSize=50] - Maximum events per batch
   * @param {number} [options.maxBatchBytes=50000] - Maximum batch size in bytes
   * @param {number} [options.minFlushInterval=1000] - Minimum flush interval in ms
   * @param {number} [options.maxFlushInterval=30000] - Maximum flush interval in ms
   * @param {number} [options.priorityThreshold=70] - Priority threshold for immediate flush
   * @param {string} [options.beaconUrl='/batch'] - URL for sendBeacon fallback
   * @param {Function} [options.onFlush] - Callback when batch is flushed
   * @param {Function} [options.onError] - Callback on error
   * @property {SmartBatcherOptions} options - Resolved configuration options
   * @property {EnrichedEvent[]} batch - Current batch of pending events
   * @property {number} batchBytes - Current batch size in bytes
   * @property {number|null} flushTimer - Active flush timer ID
   * @property {number} currentInterval - Current adaptive flush interval
   * @property {string} networkSpeed - Current network speed classification
   * @property {Function|null} _networkHandler - Network change listener reference
   * @property {Function|null} _visibilityHandler - Visibility change listener reference
   */
  constructor(options = {}) {
    /**
     * Configuration options
     * @type {SmartBatcherOptions}
     */
    this.options = {
      maxBatchSize: options.maxBatchSize || 50,
      maxBatchBytes: options.maxBatchBytes || 50000,
      minFlushInterval: options.minFlushInterval || 1000,
      maxFlushInterval: options.maxFlushInterval || 30000,
      priorityThreshold: options.priorityThreshold || 70,
      beaconUrl: options.beaconUrl || DEFAULT_BEACON_URL,
      onFlush: options.onFlush || (() => {}),
      onError: options.onError || console.error
    };
    
    /**
     * Current batch of events
     * @type {EnrichedEvent[]}
     */
    this.batch = [];
    
    /**
     * Current batch size in bytes
     * @type {number}
     */
    this.batchBytes = 0;
    
    /**
     * Flush timer ID
     * @type {number|null}
     */
    this.flushTimer = null;
    
    /**
     * Current flush interval
     * @type {number}
     */
    this.currentInterval = this.options.minFlushInterval;
    
    /**
     * Current network speed
     * @type {string}
     */
    this.networkSpeed = DEFAULT_NETWORK_SPEED;
    
    /**
     * Network change handler (stored for cleanup)
     * @type {Function|null}
     * @private
     */
    this._networkHandler = null;
    
    /**
     * Visibility change handler (stored for cleanup)
     * @type {Function|null}
     * @private
     */
    this._visibilityHandler = null;
    
    this._initNetworkDetection();
    this._initVisibilityHandler();
  }
  
  /**
   * Cleans up event listeners and timers
   * @function destroy
   * @description Removes all event listeners and clears pending timers.
   * Must be called when the batcher is no longer needed to prevent memory leaks.
   * Any pending events in the batch should be flushed before calling destroy.
   * @returns {void}
   * @example
   * const batcher = new SmartBatcher({ onFlush: handler });
   * // ... use batcher ...
   * await batcher.flush(); // Flush any pending events
   * batcher.destroy(); // Cleanup
   */
  destroy() {
    this._clearTimer();
    
    if (this._networkHandler && navigator.connection) {
      navigator.connection.removeEventListener('change', this._networkHandler);
      this._networkHandler = null;
    }
    
    if (this._visibilityHandler) {
      document.removeEventListener('visibilitychange', this._visibilityHandler);
      this._visibilityHandler = null;
    }
  }
  
  /**
   * Adds an event to the batch
   * @function add
   * @description Adds a tracking event to the batch. High priority events
   * (priority >= threshold) are flushed immediately. Events that would exceed
   * the byte limit trigger a flush first. The batch is flushed if it reaches
   * the maximum size for the current network conditions.
   * @param {Object} event - Event to batch
   * @param {string} [event.name] - Event name for priority calculation
   * @param {Object} [event.data] - Event data payload
   * @param {AddOptions} [options={}] - Add options
   * @param {boolean} [options.immediate] - Force immediate flush
   * @returns {Promise<void>}
   * @async
   * @throws {Error} If onFlush callback throws (handled internally via onError)
   * @example
   * // Regular event - batched normally
   * await batcher.add({ name: 'page_view', data: { url: location.href } });
   * 
   * // High priority event - sent immediately (purchase has priority 100)
   * await batcher.add({ name: 'purchase', value: 99.99 });
   * 
   * // Force immediate flush
   * await batcher.add({ name: 'custom_event' }, { immediate: true });
   */
  async add(event, options = {}) {
    const enrichedEvent = {
      ...event,
      _id: this._generateId(),
      _timestamp: Date.now(),
      _priority: this._getPriority(event)
    };
    
    const priority = this._getPriority(event);
    if (priority >= this.options.priorityThreshold || options.immediate) {
      await this._flush([enrichedEvent]);
      return;
    }
    
    const eventSize = JSON.stringify(enrichedEvent).length;
    
    if (this.batchBytes + eventSize > this.options.maxBatchBytes) {
      await this._flush();
    }
    
    this.batch.push(enrichedEvent);
    this.batchBytes += eventSize;
    
    if (this.batch.length >= this._getMaxBatchSizeForNetwork()) {
      await this._flush();
      return;
    }
    
    this._scheduleFlush();
  }
  
  /**
   * Forces an immediate flush of the current batch
   * @function flush
   * @description Manually triggers a flush of all pending events in the batch.
   * Does nothing if the batch is empty. Use this when you need to ensure
   * all events are sent before a page navigation or other critical point.
   * @returns {Promise<void>}
   * @async
   * @example
   * // User clicked checkout - flush all pending events
   * await batcher.flush();
   * // Navigate to checkout page
   * window.location.href = '/checkout';
   */
  async flush() {
    if (this.batch.length === 0) return;
    await this._flush();
  }
  
  /**
   * Generates a unique event identifier
   * @function _generateId
   * @private
   * @description Creates a unique identifier using timestamp and random string
   * @returns {string} Unique identifier in format "timestamp-random"
   */
  _generateId() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * Gets the priority for an event
   * @function _getPriority
   * @private
   * @description Looks up the event priority from the EVENT_PRIORITIES mapping.
   * Returns 0 for unknown event types.
   * @param {Object} event - Event to evaluate
   * @param {string} [event.name] - Event name to look up
   * @returns {number} Priority value (0-100)
   * @see EVENT_PRIORITIES
   */
  _getPriority(event) {
    return EVENT_PRIORITIES[event.name] || 0;
  }
  
  /**
   * Gets the maximum batch size for current network conditions
   * @function _getMaxBatchSizeForNetwork
   * @private
   * @description Calculates the effective batch size based on the current
   * network speed. Slower networks use smaller batches to improve reliability.
   * @returns {number} Maximum events for current network
   * @see NETWORK_MULTIPLIERS
   * @example
   * // On 4g: returns full maxBatchSize (50)
   * // On 2g: returns 30% of maxBatchSize (15)
   */
  _getMaxBatchSizeForNetwork() {
    return Math.floor(this.options.maxBatchSize * (NETWORK_MULTIPLIERS[this.networkSpeed] || 1));
  }
  
  /**
   * Schedules the next automatic flush
   * @function _scheduleFlush
   * @private
   * @description Clears any existing timer, adapts the flush interval based
   * on current batch fill rate, and sets a new timeout for the next flush.
   * @returns {void}
   */
  _scheduleFlush() {
    this._clearTimer();
    this._adaptInterval();
    this.flushTimer = setTimeout(() => this._flush(), this.currentInterval);
  }
  
  /**
   * Adapts the flush interval based on batch fill rate
   * @function _adaptInterval
   * @private
   * @description Adjusts the flush interval to optimize for event frequency:
   * - If batch is >80% full: flush faster (reduce interval by 50%)
   * - If batch is <10% full: flush slower (increase interval by 20%)
   * - Stay within min/max bounds
   * @returns {void}
   * @see FILL_RATE_HIGH
   * @see FILL_RATE_LOW
   * @see INTERVAL_SPEEDUP
   * @see INTERVAL_SLOWDOWN
   */
  _adaptInterval() {
    const fillRate = this.batch.length / this._getMaxBatchSizeForNetwork();
    
    if (fillRate > FILL_RATE_HIGH) {
      this.currentInterval = Math.max(this.currentInterval * INTERVAL_SPEEDUP, this.options.minFlushInterval);
    } else if (fillRate < FILL_RATE_LOW) {
      this.currentInterval = Math.min(this.currentInterval * INTERVAL_SLOWDOWN, this.options.maxFlushInterval);
    }
  }
  
  /**
   * Flushes events to the onFlush callback
   * @function _flush
   * @private
   * @description Sends events to the onFlush callback. On success, events
   * are removed from the batch. On failure, events are re-queued and a
   * retry is scheduled. If specific events are provided, only those events
   * are flushed without clearing the main batch.
   * @param {EnrichedEvent[]} [events] - Specific events to flush (optional)
   * @returns {Promise<void>}
   * @async
   * @throws {Error} Errors from onFlush are caught and handled internally
   */
  async _flush(events = null) {
    this._clearTimer();
    const toFlush = events || this.batch;
    if (toFlush.length === 0) return;
    
    if (!events) {
      this.batch = [];
      this.batchBytes = 0;
    }
    
    try {
      /** @type {FlushMeta} */
      const meta = { 
        count: toFlush.length,
        bytes: JSON.stringify(toFlush).length,
        networkSpeed: this.networkSpeed
      };
      await this.options.onFlush(toFlush, meta);
    } catch (err) {
      this.options.onError(err);
      if (!events) {
        // Re-queue failed events at the beginning
        this.batch.unshift(...toFlush);
        this._scheduleFlush();
      }
    }
  }
  
  /**
   * Clears the flush timer
   * @function _clearTimer
   * @private
   * @description Cancels any pending flush timeout and clears the timer ID
   * @returns {void}
   */
  _clearTimer() {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
      this.flushTimer = null;
    }
  }
  
  /**
   * Initializes network detection
   * @function _initNetworkDetection
   * @private
   * @description Sets up the Network Information API listener to track
   * connection speed changes. Falls back to default speed if API unavailable.
   * Updates batch sizing automatically when network conditions change.
   * @returns {void}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Network_Information_API|Network Information API}
   */
  _initNetworkDetection() {
    if ('connection' in navigator) {
      const connection = navigator.connection;
      this._networkHandler = () => {
        this.networkSpeed = connection.effectiveType || DEFAULT_NETWORK_SPEED;
      };
      connection.addEventListener('change', this._networkHandler);
      this._networkHandler();
    }
  }
  
  /**
   * Initializes visibility change handler
   * @function _initVisibilityHandler
   * @private
   * @description Sets up the Page Visibility API listener to flush events
   * when the page becomes hidden (user navigates away). Uses sendBeacon
   * for reliable delivery during page unload.
   * @returns {void}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API|Page Visibility API}
   * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Navigator/sendBeacon|sendBeacon API}
   */
  _initVisibilityHandler() {
    this._visibilityHandler = () => {
      if (document.visibilityState === 'hidden' && this.batch.length > 0) {
        if (navigator.sendBeacon) {
          navigator.sendBeacon(this.options.beaconUrl, new Blob([JSON.stringify(this.batch)]));
          this.batch = [];
          this.batchBytes = 0;
        } else {
          this._flush();
        }
      }
    };
    document.addEventListener('visibilitychange', this._visibilityHandler);
  }
}
