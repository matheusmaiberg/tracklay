// ============================================================
// LOGGER - LOGGING ESTRUTURADO
// ============================================================
// RESPONSABILIDADE:
// - Classe Logger com métodos debug, info, warn, error
// - Logging em JSON estruturado
// - Filtrar por LOG_LEVEL
// - Adicionar timestamp automático
// - Suportar contexto adicional (data object)

// FUNÇÕES:
// - Logger.debug(message, data)
// - Logger.info(message, data)
// - Logger.warn(message, data)
// - Logger.error(message, data)

import { CONFIG } from '../config/index.js';

const LEVELS = ['debug', 'info', 'warn', 'error'];

// OTIMIZAÇÃO: cache de timestamp (reusar se <100ms)
let cachedTimestamp = null;
let cachedTimestampTime = 0;
const TIMESTAMP_CACHE_MS = 100;

export class Logger {
  static _shouldLog(level) {
    const configLevel = CONFIG.LOG_LEVEL || 'info';
    return LEVELS.indexOf(level) >= LEVELS.indexOf(configLevel);
  }

  static _getTimestamp() {
    const now = Date.now();
    if (cachedTimestamp && (now - cachedTimestampTime) < TIMESTAMP_CACHE_MS) {
      return cachedTimestamp;
    }
    cachedTimestamp = new Date().toISOString();
    cachedTimestampTime = now;
    return cachedTimestamp;
  }

  static _log(level, message, data = {}) {
    if (!this._shouldLog(level)) return;

    // OTIMIZAÇÃO: JSON.stringify condicional - string direta para logs simples
    const hasData = Object.keys(data).length > 0;

    if (!hasData) {
      // Logs simples: usar template string (mais rápido)
      const timestamp = this._getTimestamp();
      console.log(`{"level":"${level}","message":"${message}","timestamp":"${timestamp}"}`);
    } else {
      // Logs complexos: usar JSON.stringify
      const logEntry = {
        level,
        message,
        timestamp: this._getTimestamp(),
        ...data
      };
      console.log(JSON.stringify(logEntry));
    }
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
