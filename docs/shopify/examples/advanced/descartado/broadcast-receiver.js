/**
 * @fileoverview Broadcast Receiver - ES6 BroadcastChannel Event Receiver
 * @module broadcast-receiver
 *
 * @description
 * Receives events from Custom Pixel via BroadcastChannel API.
 * Provides a simple interface for cross-context communication between
 * browser tabs, windows, and iframes. Useful for coordinating event
 * handling between Shopify themes and custom pixels.
 *
 * @example
 * import { BroadcastReceiver } from './broadcast-receiver.js';
 * BroadcastReceiver.init({
 *   channel: '_tracklay_events',
 *   onEvent: (event) => console.log(event)
 * });
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/BroadcastChannel|MDN: BroadcastChannel API}
 * @see {@link https://shopify.dev/docs/api/pixels/customer-events|Shopify Customer Events}
 */

// ============= CONFIGURATION =============

/**
 * Configuration object for the broadcast receiver
 * @constant {Object}
 * @property {string} DEFAULT_CHANNEL - Default channel name for broadcast communication
 * @property {boolean} DEBUG - Flag to enable debug logging (default: false)
 */
const CONFIG = {
  DEFAULT_CHANNEL: '_tracklay_events',
  DEBUG: false
};

// ============= STATE =============

/**
 * BroadcastChannel instance for communication
 * @type {BroadcastChannel|null}
 */
let channel = null;

/**
 * Flag indicating if the receiver has been initialized
 * @type {boolean}
 */
let isInitialized = false;

/**
 * Callback function for handling received events
 * @type {Function|null}
 */
let onEventCallback = null;

// ============= TYPEDEFINITIONS =============

/**
 * Configuration options for initialization
 * @typedef {Object} BroadcastReceiverOptions
 * @property {string} [channel] - Name of the BroadcastChannel to use
 * @property {Function} onEvent - Callback function for received events
 * @property {boolean} [debug] - Enable debug logging
 */

/**
 * Broadcast message structure
 * @typedef {Object} BroadcastMessage
 * @property {BroadcastEvent} event - The customer event data
 * @property {string} [source] - Source identifier of the sender
 * @property {number} [timestamp] - Message timestamp
 */

/**
 * Customer event structure
 * @typedef {Object} BroadcastEvent
 * @property {string} name - Event name (e.g., 'page_viewed', 'product_viewed')
 * @property {*} [context] - Event context data
 * @property {*} [data] - Event-specific data
 * @property {Object} [clientId] - Client identification
 * @property {Object} [timestamp] - Event timestamp information
 */

// ============= LOGGER =============

/**
 * Conditional logger that only outputs when DEBUG is enabled
 * @function log
 * @param {...*} args - Arguments to log
 * @returns {void}
 * @description Prepends '[BroadcastReceiver]' to all log messages
 */
const log = (...args) => {
  if (CONFIG.DEBUG) {
    console.log('[BroadcastReceiver]', ...args);
  }
};

// ============= MESSAGE HANDLER =============

/**
 * Handles incoming BroadcastChannel messages
 * @function onMessage
 * @param {MessageEvent} e - The message event from BroadcastChannel
 * @returns {void}
 * @description
 * Extracts the event data from the message and validates it.
 * Invalid events (missing name) are ignored with a warning.
 * Valid events are passed to the onEventCallback.
 */
const onMessage = (e) => {
  const { data } = e;

  log('📡 Message received:', data);

  const event = data?.event || data;

  if (!event?.name) {
    log('  ⚠️ Invalid event, ignoring');
    return;
  }

  onEventCallback?.(event, data);
};

// ============= PUBLIC API =============

/**
 * Initializes the broadcast receiver
 * @function init
 * @param {BroadcastReceiverOptions} [options={}] - Configuration options
 * @param {string} [options.channel] - Name of the BroadcastChannel (default: '_tracklay_events')
 * @param {Function} options.onEvent - Required callback for received events
 * @param {BroadcastEvent} options.onEvent.event - The received event object
 * @param {BroadcastMessage} options.onEvent.rawData - The complete message data
 * @param {boolean} [options.debug] - Enable debug logging
 * @returns {boolean} True if initialization was successful
 * @throws {Error} Silently returns false if BroadcastChannel is not available
 * @description
 * Sets up the BroadcastChannel listener with the specified configuration.
 * Must be called before any events can be received. The onEvent callback
 * is required and will receive all valid events from the channel.
 *
 * @example
 * BroadcastReceiver.init({
 *   channel: 'my_custom_channel',
 *   onEvent: (event, rawData) => {
 *     console.log('Event received:', event.name);
 *   },
 *   debug: true
 * });
 */
const init = (options = {}) => {
  if (isInitialized) {
    log('⚠️ Already initialized');
    return true;
  }

  if (typeof BroadcastChannel === 'undefined') {
    console.warn('[BroadcastReceiver] BroadcastChannel not available');
    return false;
  }

  if (typeof options.onEvent !== 'function') {
    console.error('[BroadcastReceiver] onEvent callback is required');
    return false;
  }

  onEventCallback = options.onEvent;
  CONFIG.DEBUG = !!options.debug;
  const channelName = options.channel || CONFIG.DEFAULT_CHANNEL;

  try {
    channel = new BroadcastChannel(channelName);
    channel.onmessage = onMessage;
    isInitialized = true;

    log('✅ Initialized on channel:', channelName);
    return true;
  } catch (e) {
    console.error('[BroadcastReceiver] Error initializing:', e);
    return false;
  }
};

/**
 * Closes the broadcast channel connection
 * @function close
 * @returns {void}
 * @description
 * Closes the BroadcastChannel and resets the receiver state.
 * After calling close(), you must call init() again to receive events.
 * Safe to call even if not initialized.
 */
const close = () => {
  channel?.close();
  channel = null;
  isInitialized = false;
  onEventCallback = null;
  log('🛑 Channel closed');
};

/**
 * Checks if the receiver is initialized
 * @function initialized
 * @returns {boolean} True if the receiver has been initialized
 * @description Useful for checking state before operations that require initialization
 */
const initialized = () => isInitialized;

/**
 * Gets the current BroadcastChannel instance
 * @function getChannel
 * @returns {BroadcastChannel|null} The current channel or null if not initialized
 * @description
 * Returns the raw BroadcastChannel instance for advanced use cases.
 * Use with caution - modifying the channel directly may break functionality.
 */
const getChannel = () => channel;

// ============= EXPORT =============

/**
 * BroadcastReceiver public API
 * @constant {Object}
 * @property {Function} init - Initialize the receiver
 * @property {Function} close - Close the channel connection
 * @property {Function} initialized - Check initialization status
 * @property {Function} getChannel - Get the channel instance
 * @property {Object} CONFIG - Configuration constants
 */
export const BroadcastReceiver = {
  init,
  close,
  initialized,
  getChannel,
  CONFIG
};

// Browser global fallback
if (typeof window !== 'undefined') {
  window.BroadcastReceiver = BroadcastReceiver;
}
