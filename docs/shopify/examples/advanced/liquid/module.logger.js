/**
 * @fileoverview Centralized ES6 logging system for Tracklay modules.
 * Provides a flexible, level-based logging infrastructure with module-specific
 * configuration, styling support, and silence functionality for production control.
 * @module logger
 * @author Tracklay Team
 * @version 1.1.0
 *
 * @description
 * This module implements a comprehensive logging system designed for modular applications.
 * It supports multiple log levels (silent, error, warn, info, debug), per-module
 * configuration, visual styling with icons, and runtime silence/unsilence capabilities.
 * The system is built to minimize overhead in production while providing rich
 * debugging capabilities during development.
 *
 * @example
 * // Basic usage - Create a module-specific logger
 * import { Logger } from './module.logger.js';
 *
 * const log = Logger.create('MyModule');
 * log('Default info message');
 * log.info('Information message');
 * log.warn('Warning message');
 * log.error('Error message');
 * log.success('Success message');
 * log.debug('Debug message');
 * log.event('Event occurred');
 * log.start('Process started');
 * log.stop('Process stopped');
 * log.timer('Timing information');
 *
 * @example
 * // Advanced configuration
 * import { Logger, LEVELS } from './module.logger.js';
 *
 * // Set global log level
 * Logger.setLevel(LEVELS.DEBUG);
 *
 * // Enable timestamps
 * Logger.setTimestamp(true);
 *
 * // Silence specific modules
 * Logger.silence('NoisyModule');
 *
 * // Create logger with custom config
 * const log = Logger.create('CustomModule', { level: LEVELS.WARN });
 *
 * @see {@link ./config.js} For related configuration settings
 */

// ==========================================
// IMPORTS
// ==========================================

/**
 * ConfigManager import for centralized configuration.
 * Uses dynamic import pattern with fallback for compatibility.
 * @type {Object|null}
 */
let ConfigManager = null;

try {
  const configModule = await import('./module.config.js');
  ConfigManager = configModule.ConfigManager || null;
} catch (e) {
  // ConfigManager not available, using local GLOBAL_CONFIG fallback
  ConfigManager = null;
}

// ==========================================
// GLOBAL CONFIGURATION
// ==========================================

/**
 * Global logging configuration object.
 * Controls default behavior for all logger instances.
 *
 * @typedef {Object} GlobalConfig
 * @property {number} LEVEL - Global log level threshold (0=silent, 1=error, 2=warn, 3=info, 4=debug)
 * @property {boolean} STYLING - Whether to apply CSS styling to console output
 * @property {string} GLOBAL_PREFIX - Prefix applied to all log messages
 * @property {boolean} TIMESTAMP - Whether to include timestamps in log output
 * @property {Array<string>} SILENCED - Array of module names that are currently silenced
 *
 * @description
 * The GLOBAL_CONFIG object defines the default behavior for the entire logging system.
 * Individual logger instances can override the LEVEL setting, but other properties
 * like STYLING, GLOBAL_PREFIX, and TIMESTAMP are shared across all loggers.
 * 
 * When ConfigManager is available, this configuration syncs with LOGGER namespace.
 */
const GLOBAL_CONFIG = {
  /** @type {number} Current global log level (0-4) */
  get LEVEL() {
    return ConfigManager?.get('LOGGER.LEVEL', 4) ?? 4;
  },
  set LEVEL(value) {
    if (ConfigManager) {
      ConfigManager.set('LOGGER.LEVEL', value);
    }
  },
  /** @type {boolean} Enable visual styling in console output */
  get STYLING() {
    return ConfigManager?.get('LOGGER.STYLING', true) ?? true;
  },
  set STYLING(value) {
    if (ConfigManager) {
      ConfigManager.set('LOGGER.STYLING', value);
    }
  },
  /** @type {string} Global prefix for all log messages */
  get GLOBAL_PREFIX() {
    return ConfigManager?.get('LOGGER.GLOBAL_PREFIX', '[Tracklay]') ?? '[Tracklay]';
  },
  set GLOBAL_PREFIX(value) {
    if (ConfigManager) {
      ConfigManager.set('LOGGER.GLOBAL_PREFIX', value);
    }
  },
  /** @type {boolean} Include ISO timestamps in log output */
  get TIMESTAMP() {
    return ConfigManager?.get('LOGGER.TIMESTAMP', false) ?? false;
  },
  set TIMESTAMP(value) {
    if (ConfigManager) {
      ConfigManager.set('LOGGER.TIMESTAMP', value);
    }
  },
  /** @type {Array<string>} List of silenced module names */
  get SILENCED() {
    const silenced = ConfigManager?.get('LOGGER.SILENCED', []);
    return Array.isArray(silenced) ? silenced : [];
  },
  set SILENCED(value) {
    if (ConfigManager) {
      ConfigManager.set('LOGGER.SILENCED', value);
    }
  }
};

// ==========================================
// CONSTANTS
// ==========================================

/**
 * Log level constants defining severity thresholds.
 * Used to control which messages are output based on configured levels.
 *
 * @constant
 * @type {Object<string, number>}
 * @property {number} SILENT - No logging output (0)
 * @property {number} ERROR - Error messages only (1)
 * @property {number} WARN - Warning and error messages (2)
 * @property {number} INFO - Info, warning, and error messages (3)
 * @property {number} DEBUG - All messages including debug (4)
 *
 * @description
 * These level constants enable fine-grained control over logging verbosity.
 * Higher levels include all lower level messages. For example, INFO (3)
 * includes ERROR (1), WARN (2), and INFO (3) messages.
 *
 * @example
 * import { Logger, LEVELS } from './module.logger.js';
 * Logger.setLevel(LEVELS.WARN); // Only show warnings and errors
 */
export const LEVELS = {
  /** @type {number} No output */
  SILENT: 0,
  /** @type {number} Errors only */
  ERROR: 1,
  /** @type {number} Warnings and errors */
  WARN: 2,
  /** @type {number} Info, warnings, and errors */
  INFO: 3,
  /** @type {number} All messages including debug */
  DEBUG: 4
};

/**
 * Icon mappings for different log message types.
 * Provides visual indicators to quickly identify message categories.
 *
 * @constant
 * @type {Object<string, string>}
 * @property {string} info - Information indicator
 * @property {string} warn - Warning indicator
 * @property {string} error - Error indicator
 * @property {string} success - Success indicator
 * @property {string} debug - Debug indicator
 * @property {string} event - Event indicator
 * @property {string} start - Start/launch indicator
 * @property {string} stop - Stop/halt indicator
 * @property {string} timer - Timing/performance indicator
 * @property {string} check - Checkmark/confirmation
 * @property {string} cross - Cross/denial indicator
 *
 * @description
 * Unicode emoji icons are used to provide visual context for different log types.
 * These icons appear before log messages when using specialized logging methods
 * like log.info(), log.success(), log.event(), etc.
 */
export const ICONS = {
  /** @type {string} Information icon */
  info: 'ℹ️',
  /** @type {string} Warning icon */
  warn: '⚠️',
  /** @type {string} Error icon */
  error: '❌',
  /** @type {string} Success icon */
  success: '✅',
  /** @type {string} Debug icon */
  debug: '🐛',
  /** @type {string} Event icon */
  event: '📡',
  /** @type {string} Start icon */
  start: '🚀',
  /** @type {string} Stop icon */
  stop: '🛑',
  /** @type {string} Timer icon */
  timer: '⏱️',
  /** @type {string} Checkmark icon */
  check: '✓',
  /** @type {string} Cross icon */
  cross: '✗'
};

// ==========================================
// UTILITIES
// ==========================================

/**
 * Generates a formatted timestamp string for log messages.
 *
 * @function getTimestamp
 * @returns {string} Formatted timestamp in HH:MM:SS format, or empty string if disabled
 *
 * @description
 * Returns the current time formatted as [HH:MM:SS] when GLOBAL_CONFIG.TIMESTAMP
 * is enabled. Returns an empty string when timestamps are disabled to avoid
 * adding unnecessary characters to log output.
 *
 * @example
 * // When TIMESTAMP is true
 * console.log(getTimestamp()); // "[14:30:25] "
 *
 * // When TIMESTAMP is false
 * console.log(getTimestamp()); // ""
 */
const getTimestamp = () => {
  if (!GLOBAL_CONFIG.TIMESTAMP) return '';
  return `[${new Date().toISOString().substr(11, 8)}] `;
};

/**
 * Checks if a specific module is currently silenced.
 *
 * @function isSilenced
 * @param {string} moduleName - Name of the module to check
 * @returns {boolean} True if the module is in the silence list
 *
 * @description
 * Determines whether log output should be suppressed for a given module.
 * Silenced modules are completely muted regardless of log level settings.
 *
 * @example
 * if (isSilenced('MyModule')) {
 *   // Skip logging
 * }
 */
const isSilenced = (moduleName) => GLOBAL_CONFIG.SILENCED.includes(moduleName);

/**
 * Determines if a message at the given level should be logged.
 *
 * @function shouldLog
 * @param {number} level - Log level of the message (from LEVELS constants)
 * @param {Object} [moduleConfig] - Module-specific configuration
 * @param {number} [moduleConfig.level] - Module-specific level override
 * @returns {boolean} True if the message should be output
 *
 * @description
 * Evaluates whether a log message meets the threshold for output. The effective
 * level is determined by the minimum of the global level and any module-specific
 * override. This allows coarse global control with fine-grained module exceptions.
 *
 * @example
 * // Global level is INFO (3), checking INFO message (3)
 * shouldLog(3, {}); // true
 *
 * // Global level is WARN (2), checking INFO message (3)
 * shouldLog(3, {}); // false
 *
 * // Module override allows DEBUG (4)
 * shouldLog(4, { level: 4 }); // true (if global is >= 4)
 */
const shouldLog = (level, moduleConfig) => {
  const globalLevel = GLOBAL_CONFIG.LEVEL;
  const moduleLevel = moduleConfig?.level ?? globalLevel;
  const effectiveLevel = Math.min(globalLevel, moduleLevel);
  return level <= effectiveLevel;
};

// ==========================================
// CORE LOGGING FUNCTION
// ==========================================

/**
 * Internal logging function that handles message formatting and output.
 *
 * @function logInternal
 * @param {string} moduleName - Name of the module generating the log
 * @param {number} level - Severity level of the message (from LEVELS)
 * @param {string|null} icon - Icon to display (from ICONS), or null for no icon
 * @param {Array<*>} args - Arguments to log (message and data)
 * @param {Object} moduleConfig - Configuration for the logging module
 * @param {number} [moduleConfig.level] - Module-specific level override
 * @returns {void}
 *
 * @description
 * The core logging implementation that formats messages with prefixes, icons,
 * and timestamps, then routes to the appropriate console method (log, error,
 * warn, info). Messages are filtered based on level and silence settings
 * before output.
 *
 * @example
 * logInternal('MyModule', LEVELS.INFO, ICONS.info, ['User logged in'], { level: 3 });
 * // Output: [Tracklay] [MyModule] ℹ️ User logged in
 */
const logInternal = (moduleName, level, icon, args, moduleConfig) => {
  if (!shouldLog(level, moduleConfig)) return;
  if (isSilenced(moduleName)) return;

  let prefix = '';
  if (GLOBAL_CONFIG.GLOBAL_PREFIX) {
    prefix += `${GLOBAL_CONFIG.GLOBAL_PREFIX} `;
  }
  prefix += `[${moduleName}]`;
  if (icon) {
    prefix += ` ${icon}`;
  }

  prefix = getTimestamp() + prefix;

  const logArgs = [prefix, ...args];

  let consoleMethod = console.log;
  if (level === LEVELS.ERROR) consoleMethod = console.error;
  else if (level === LEVELS.WARN) consoleMethod = console.warn;
  else if (level === LEVELS.INFO) consoleMethod = console.info;

  consoleMethod(...logArgs);
};

// ==========================================
// LOGGER FACTORY
// ==========================================

/**
 * Logger instance configuration options.
 *
 * @typedef {Object} LoggerConfig
 * @property {number} [level] - Log level override for this instance
 * @property {string} [prefix] - Custom prefix (defaults to module name)
 * @property {boolean} [styling] - Enable/disable styling for this instance
 */

/**
 * Logger instance interface providing all logging methods.
 *
 * @typedef {Object} LoggerInstance
 * @property {function(...*): void} log - Default logging method (info level, no icon)
 * @property {function(...*): void} info - Info level logging with icon
 * @property {function(...*): void} warn - Warning level logging with icon
 * @property {function(...*): void} error - Error level logging with icon
 * @property {function(...*): void} success - Success message logging with icon
 * @property {function(...*): void} debug - Debug level logging with icon
 * @property {function(...*): void} event - Event logging with icon
 * @property {function(...*): void} start - Start/launch logging with icon
 * @property {function(...*): void} stop - Stop/halt logging with icon
 * @property {function(...*): void} timer - Timing log with icon
 * @property {function(): void} enable - Enable logging for this module
 * @property {function(): void} disable - Disable logging for this module
 * @property {function(number): void} setLevel - Set log level for this instance
 * @property {function(): number} getLevel - Get current log level
 */

/**
 * Creates a configured logger instance for a specific module.
 *
 * @function createLogger
 * @param {string} moduleName - Unique name identifying the module
 * @param {LoggerConfig} [config={}] - Configuration options for this logger
 * @returns {LoggerInstance} Configured logger instance with all logging methods
 *
 * @description
 * Factory function that creates a logger instance tailored to a specific module.
 * The returned logger provides multiple methods for different message types,
 * each with appropriate icons and log levels. The instance also includes
 * methods for runtime configuration (enable, disable, setLevel).
 *
 * @example
 * const log = createLogger('PaymentProcessor', { level: LEVELS.DEBUG });
 *
 * log('Processing payment');
 * log.info('Payment validated');
 * log.error('Payment failed', error);
 * log.success('Payment completed');
 *
 * // Runtime control
 * log.disable();  // Silence this module
 * log.enable();   // Unsilence this module
 * log.setLevel(LEVELS.WARN); // Change level
 */
const createLogger = (moduleName, config = {}) => {
  /**
   * Module-specific configuration merged with globals.
   * @type {Object}
   */
  const moduleConfig = {
    level: config.level ?? GLOBAL_CONFIG.LEVEL,
    prefix: config.prefix || moduleName,
    styling: config.styling ?? GLOBAL_CONFIG.STYLING
  };

  /**
   * Default logger function (info level, no icon).
   * @type {function(...*): void}
   */
  const logger = (...args) => {
    logInternal(moduleName, LEVELS.INFO, null, args, moduleConfig);
  };

  // Attach specialized logging methods

  /** @type {function(...*): void} Info level with icon */
  logger.info = (...args) => logInternal(moduleName, LEVELS.INFO, ICONS.info, args, moduleConfig);

  /** @type {function(...*): void} Warning level with icon */
  logger.warn = (...args) => logInternal(moduleName, LEVELS.WARN, ICONS.warn, args, moduleConfig);

  /** @type {function(...*): void} Error level with icon */
  logger.error = (...args) => logInternal(moduleName, LEVELS.ERROR, ICONS.error, args, moduleConfig);

  /** @type {function(...*): void} Success message with icon */
  logger.success = (...args) => logInternal(moduleName, LEVELS.INFO, ICONS.success, args, moduleConfig);

  /** @type {function(...*): void} Debug level with icon */
  logger.debug = (...args) => logInternal(moduleName, LEVELS.DEBUG, ICONS.debug, args, moduleConfig);

  /** @type {function(...*): void} Event notification with icon */
  logger.event = (...args) => logInternal(moduleName, LEVELS.INFO, ICONS.event, args, moduleConfig);

  /** @type {function(...*): void} Start notification with icon */
  logger.start = (...args) => logInternal(moduleName, LEVELS.INFO, ICONS.start, args, moduleConfig);

  /** @type {function(...*): void} Stop notification with icon */
  logger.stop = (...args) => logInternal(moduleName, LEVELS.INFO, ICONS.stop, args, moduleConfig);

  /** @type {function(...*): void} Timing information with icon */
  logger.timer = (...args) => logInternal(moduleName, LEVELS.DEBUG, ICONS.timer, args, moduleConfig);

  /**
   * Enables logging for this module by removing from silence list.
   * @type {function(): void}
   */
  logger.enable = () => {
    const idx = GLOBAL_CONFIG.SILENCED.indexOf(moduleName);
    if (idx !== -1) GLOBAL_CONFIG.SILENCED.splice(idx, 1);
  };

  /**
   * Disables logging for this module by adding to silence list.
   * @type {function(): void}
   */
  logger.disable = () => {
    if (!GLOBAL_CONFIG.SILENCED.includes(moduleName)) {
      GLOBAL_CONFIG.SILENCED.push(moduleName);
    }
  };

  /**
   * Sets the log level for this module instance.
   * @type {function(number): void}
   * @param {number} level - New log level from LEVELS constants
   */
  logger.setLevel = (level) => { moduleConfig.level = level; };

  /**
   * Gets the current log level for this module instance.
   * @type {function(): number}
   * @returns {number} Current log level
   */
  logger.getLevel = () => moduleConfig.level;

  return logger;
};

// ==========================================
// PUBLIC API
// ==========================================

/**
 * Logger factory and configuration API.
 *
 * @namespace Logger
 * @description
 * The main Logger object provides factory methods for creating logger instances
 * and global configuration controls. All methods are static and affect the
 * global logging system state.
 */
export const Logger = {
  /**
   * Creates a new logger instance for a module.
   * @type {function(string, LoggerConfig): LoggerInstance}
   * @param {string} moduleName - Name of the module
   * @param {LoggerConfig} [config] - Optional configuration
   * @returns {LoggerInstance} Configured logger instance
   */
  create: createLogger,

  /**
   * Sets the global log level threshold.
   * @type {function(number): void}
   * @param {number} level - Level from LEVELS constants
   *
   * @example
   * Logger.setLevel(LEVELS.WARN); // Only warnings and errors
   */
  setLevel: (level) => { GLOBAL_CONFIG.LEVEL = level; },

  /**
   * Gets the current global log level.
   * @type {function(): number}
   * @returns {number} Current global level
   */
  getLevel: () => GLOBAL_CONFIG.LEVEL,

  /**
   * Enables or disables visual styling globally.
   * @type {function(boolean): void}
   * @param {boolean} enable - True to enable styling
   */
  setStyling: (enable) => { GLOBAL_CONFIG.STYLING = !!enable; },

  /**
   * Enables or disables timestamps globally.
   * @type {function(boolean): void}
   * @param {boolean} enable - True to enable timestamps
   */
  setTimestamp: (enable) => { GLOBAL_CONFIG.TIMESTAMP = !!enable; },

  /**
   * Sets the global prefix for all log messages.
   * @type {function(string): void}
   * @param {string} prefix - New global prefix
   */
  setPrefix: (prefix) => { GLOBAL_CONFIG.GLOBAL_PREFIX = prefix; },

  /**
   * Silences a specific module by name.
   * @type {function(string): void}
   * @param {string} moduleName - Module to silence
   *
   * @example
   * Logger.silence('VerboseModule');
   */
  silence: (moduleName) => {
    if (!GLOBAL_CONFIG.SILENCED.includes(moduleName)) {
      GLOBAL_CONFIG.SILENCED.push(moduleName);
    }
  },

  /**
   * Unsilences a previously silenced module.
   * @type {function(string): void}
   * @param {string} moduleName - Module to unsilence
   */
  unsilence: (moduleName) => {
    const idx = GLOBAL_CONFIG.SILENCED.indexOf(moduleName);
    if (idx !== -1) GLOBAL_CONFIG.SILENCED.splice(idx, 1);
  },

  /**
   * Silences all logging globally (sets level to SILENT).
   * @type {function(): void}
   */
  silenceAll: () => { GLOBAL_CONFIG.LEVEL = LEVELS.SILENT; },

  /**
   * Unsilences all logging (sets level to DEBUG and clears silence list).
   * @type {function(): void}
   */
  unsilenceAll: () => {
    GLOBAL_CONFIG.LEVEL = LEVELS.DEBUG;
    GLOBAL_CONFIG.SILENCED = [];
  },

  /**
   * Log level constants.
   * @type {Object<string, number>}
   */
  LEVELS,

  /**
   * Icon mappings for log messages.
   * @type {Object<string, string>}
   */
  ICONS,

  /**
   * Gets a copy of the current global configuration.
   * @type {function(): GlobalConfig}
   * @returns {GlobalConfig} Current configuration snapshot
   *
   * @example
   * const config = Logger.getConfig();
   * console.log(config.LEVEL, config.SILENCED);
   */
  getConfig: () => ({
    LEVEL: GLOBAL_CONFIG.LEVEL,
    STYLING: GLOBAL_CONFIG.STYLING,
    GLOBAL_PREFIX: GLOBAL_CONFIG.GLOBAL_PREFIX,
    TIMESTAMP: GLOBAL_CONFIG.TIMESTAMP,
    SILENCED: [...GLOBAL_CONFIG.SILENCED]
  })
};

/**
 * Browser global fallback assignment.
 * Makes the Logger object available as window.Logger in browser environments
 * for debugging and direct console access.
 *
 * @description
 * This conditional assignment ensures the Logger API is accessible globally
 * in browser contexts while avoiding errors in Node.js or other non-browser
 * environments during module loading.
 *
 * @example
 * // In browser console after script loads
 * const log = window.Logger.create('ConsoleTest');
 * log.info('Testing from console');
 */
if (typeof window !== 'undefined') {
  window.Logger = Logger;
}
