/**
 * @fileoverview Metrics collection
 */

import { Logger } from '../core/logger.js';

export class Metrics {
  /**
   * @param {Request} request
   * @param {Response} response
   * @param {number} duration
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
   * @param {Request} request
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
