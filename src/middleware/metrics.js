// ============================================================
// METRICS - METRICS COLLECTION
// ============================================================
// RESPONSIBILITY:
// - Classe Metrics para coletar métricas
// - record(request, response, duration) → void
// - recordRequest(request) → void
// - Pode ser expandido para Analytics Engine no futuro

import { Logger } from '../core/logger.js';

export class Metrics {
  /**
   * Record request completion metrics
   * @param {Request} request - The incoming request
   * @param {Response} response - The outgoing response
   * @param {number} duration - Request duration in milliseconds
   */
  static record(request, response, duration) {
    const url = new URL(request.url);
    Logger.info('Request completed', {
      path: url.pathname,
      status: response.status,
      duration: `${duration}ms`,
      cached: response.headers.get('X-Cache-Status') === 'HIT'
    });
  }

  /**
   * Record incoming request
   * @param {Request} request - The incoming request
   */
  static recordRequest(request) {
    const url = new URL(request.url);
    Logger.info('Request received', {
      method: request.method,
      path: url.pathname,
      origin: request.headers.get('Origin'),
      ip: request.headers.get('CF-Connecting-IP')
    });
  }
}
