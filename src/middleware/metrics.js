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
    const { pathname } = new URL(request.url);
    const { status, headers } = response;
    
    Logger.info('Request completed', {
      path: pathname,
      status,
      duration: `${duration}ms`,
      cached: headers.get('X-Cache-Status') === 'HIT'
    });
  }

  /**
   * Record incoming request
   * @param {Request} request - The incoming request
   */
  static recordRequest(request) {
    const { pathname } = new URL(request.url);
    const { method, headers } = request;
    
    Logger.info('Request received', {
      method,
      path: pathname,
      origin: headers.get('Origin'),
      ip: headers.get('CF-Connecting-IP')
    });
  }
}
