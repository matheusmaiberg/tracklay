/**
 * @fileoverview Cookie Poller - Event receiver via cookies ES6 Module
 * @module cookie-poller
 *
 * @description
 * Polls cookies to receive events from the Custom Pixel (fallback mechanism).
 * This module provides a polling-based event system that reads events from cookies,
 * allowing cross-context communication when direct event passing is not available.
 * Automatically clears cookies after reading to prevent duplicate processing.
 *
 * @example
 * import { CookiePoller } from './cookie-poller.js';
 *
 * // Initialize with event callback
 * CookiePoller.init({
 *   onEvent: (event) => console.log('Received:', event),
 *   interval: 200,
 *   debug: true
 * });
 *
 * // Check if running
 * if (CookiePoller.running()) {
 *   console.log('Poller is active');
 * }
 *
 * // Stop polling when done
 * CookiePoller.stop();
 *
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie} MDN: Document.cookie
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/parse} MDN: JSON.parse
 */

// ============= CONFIGURATION =============

/**
 * Configuration constants for the cookie poller
 * @constant {Object}
 * @property {string} COOKIE_NAME - Name of the cookie used for event transmission
 * @property {number} DEFAULT_INTERVAL - Default polling interval in milliseconds
 * @property {boolean} DEBUG - Debug mode flag for verbose logging
 */
const CONFIG = {
  /** @type {string} */
  COOKIE_NAME: '_tracklay_evt',
  /** @type {number} */
  DEFAULT_INTERVAL: 200,
  /** @type {boolean} */
  DEBUG: false
};

// ============= STATE =============

/**
 * Interval ID returned by setInterval
 * @type {number|null}
 */
let intervalId = null;

/**
 * Flag indicating if the poller is currently running
 * @type {boolean}
 */
let isRunning = false;

/**
 * Callback function for received events
 * @type {Function|null}
 */
let onEventCallback = null;

// ============= LOGGER =============

/**
 * Logs messages to console when debug mode is enabled
 * @function log
 * @param {...*} args - Arguments to log
 * @returns {void}
 */
const log = (...args) => {
  if (CONFIG.DEBUG) {
    console.log('[CookiePoller]', ...args);
  }
};

// ============= COOKIE READER =============

/**
 * Reads and parses the event cookie
 * @function readEventCookie
 * @description
 * Searches for the event cookie by name, extracts its value, immediately clears it
 * to prevent reprocessing, and returns the parsed JSON data.
 * @returns {Object|null} Parsed event object or null if cookie not found or parse error
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Document/cookie} MDN: Document.cookie
 */
const readEventCookie = () => {
  const match = document.cookie.match(new RegExp(`${CONFIG.COOKIE_NAME}=([^;]+)`));
  if (!match) return null;

  // Clear cookie immediately to prevent duplicate processing
  document.cookie = `${CONFIG.COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;`;

  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch (e) {
    console.error('[CookiePoller] Error parsing cookie:', e);
    return null;
  }
};

// ============= POLL LOOP =============

/**
 * Polls for new events in cookies
 * @function poll
 * @description
 * Executes a single poll cycle: reads the event cookie and triggers
 * the registered callback if an event is found.
 * @returns {void}
 */
const poll = () => {
  const event = readEventCookie();
  if (event && onEventCallback) {
    log('🍪 Event received:', event.name || 'no-name');
    onEventCallback(event);
  }
};

// ============= PUBLIC API =============

/**
 * @typedef {Object} CookiePollerOptions
 * @property {Function} onEvent - Callback function invoked when an event is received
 * @property {number} [interval] - Polling interval in milliseconds (default: 200ms)
 * @property {boolean} [debug] - Enable debug logging (default: false)
 */

/**
 * Initializes the cookie poller
 * @function init
 * @param {CookiePollerOptions} [options={}] - Configuration options
 * @param {Function} options.onEvent - Required callback for received events
 * @param {number} [options.interval] - Polling interval in milliseconds
 * @param {boolean} [options.debug] - Enable debug mode
 * @returns {boolean} True if initialization was successful, false otherwise
 * @throws {Error} Logs error to console if onEvent is not a function
 * @description
 * Starts the polling loop with the specified configuration.
 * Validates that onEvent is a function before starting.
 * Prevents multiple simultaneous polling instances.
 * @example
 * CookiePoller.init({
 *   onEvent: (event) => {
 *     console.log('Event:', event.name, event.data);
 *   },
 *   interval: 100,
 *   debug: true
 * });
 */
const init = (options = {}) => {
  if (isRunning) {
    log('⚠️ Already running');
    return false;
  }

  if (typeof options.onEvent !== 'function') {
    console.error('[CookiePoller] onEvent callback is required');
    return false;
  }

  onEventCallback = options.onEvent;
  CONFIG.DEBUG = !!options.debug;
  const interval = options.interval || CONFIG.DEFAULT_INTERVAL;

  intervalId = setInterval(poll, interval);
  isRunning = true;

  log(`✅ Initialized (interval: ${interval}ms)`);
  return true;
};

/**
 * Stops the cookie poller
 * @function stop
 * @returns {void}
 * @description
 * Clears the polling interval, resets the running state,
 * and removes the event callback reference.
 * Safe to call even if poller is not running.
 * @example
 * CookiePoller.stop();
 * console.log('Poller stopped');
 */
const stop = () => {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  isRunning = false;
  onEventCallback = null;
  log('🛑 Stopped');
};

/**
 * Checks if the poller is currently running
 * @function running
 * @returns {boolean} True if poller is active, false otherwise
 * @description
 * Returns the current running state of the cookie poller.
 * @example
 * if (CookiePoller.running()) {
 *   console.log('Poller is active');
 * }
 */
const running = () => isRunning;

// ============= EXPORT =============

/**
 * CookiePoller public API
 * @constant {Object}
 * @property {Function} init - Initialize the poller
 * @property {Function} stop - Stop the poller
 * @property {Function} running - Check if running
 * @property {Object} CONFIG - Configuration constants
 * @description
 * Main export containing all public methods for the cookie polling system.
 * Provides initialization, control, and status checking capabilities.
 * @see {@link init}
 * @see {@link stop}
 * @see {@link running}
 */
export const CookiePoller = {
  init,
  stop,
  running,
  CONFIG
};

// Browser global fallback
if (typeof window !== 'undefined') {
  window.CookiePoller = CookiePoller;
}
