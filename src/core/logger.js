/**
 * @fileoverview Logger - Structured logging
 * @module core/logger
 */

import { CONFIG } from '../config/index.js';
import { timestampToISO } from '../utils/time.js';

const LEVELS = ['debug', 'info', 'warn', 'error'];

export class Logger {
  static _shouldLog(level) {
    const configLevel = CONFIG.LOG_LEVEL ?? 'info';
    return LEVELS.indexOf(level) >= LEVELS.indexOf(configLevel);
  }

  static _log(level, message, data = {}) {
    if (!this._shouldLog(level)) return;

    const logEntry = {
      level,
      message,
      timestamp: timestampToISO(),
      ...data
    };
    console.log(JSON.stringify(logEntry));
  }

  static debug(message, data = {}) {
    this._log('debug', message, data);
  }

  static info(message, data = {}) {
    this._log('info', message, data);
  }

  static warn(message, data = {}) {
    this._log('warn', message, data);
  }

  static error(message, data = {}) {
    this._log('error', message, data);
  }
}
