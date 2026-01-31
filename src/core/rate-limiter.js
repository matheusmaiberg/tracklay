/**
 * @fileoverview Rate Limiter - Rate limiting by IP using Cloudflare Cache API
 * @module core/rate-limiter
 */

import { CONFIG } from '../config/index.js';
import { Logger } from './logger.js';
import { CacheManager } from './cache.js';

export class RateLimiter {
  static async check(ip, endpointKey = 'default') {
    const key = `ratelimit:${ip}:${endpointKey}`;
    const now = Date.now();

    try {
      const cacheKey = new Request(`https://internal/${key}`);
      const cached = await CacheManager.get(cacheKey);

      let data = { count: 0, resetAt: now + CONFIG.RATE_LIMIT_WINDOW };

      if (cached) {
        data = await cached.json();

        if (now > data.resetAt) {
          data = { count: 0, resetAt: now + CONFIG.RATE_LIMIT_WINDOW };
        }
      }

      const wouldBeAllowed = (data.count + 1) <= CONFIG.RATE_LIMIT_REQUESTS;

      if (wouldBeAllowed) {
        data.count++;

        const response = new Response(JSON.stringify(data), {
          headers: {
            'Cache-Control': `max-age=${Math.ceil(CONFIG.RATE_LIMIT_WINDOW / 1000)}`,
            'Content-Type': 'application/json'
          }
        });
        await CacheManager.put(cacheKey, response, Math.ceil(CONFIG.RATE_LIMIT_WINDOW / 1000));
      }

      const remaining = Math.max(0, CONFIG.RATE_LIMIT_REQUESTS - data.count);

      return {
        allowed: wouldBeAllowed,
        remaining,
        resetAt: data.resetAt,
        limit: CONFIG.RATE_LIMIT_REQUESTS
      };

    } catch (error) {
      Logger.error('Rate limit check failed', { error: error?.message });
      return {
        allowed: true,
        remaining: CONFIG.RATE_LIMIT_REQUESTS,
        resetAt: now,
        limit: CONFIG.RATE_LIMIT_REQUESTS
      };
    }
  }
}
