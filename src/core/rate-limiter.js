// ============================================================
// RATE LIMITER - RATE LIMITING BY IP
// ============================================================
// RESPONSIBILITY:
// - Implement rate limiting using Cloudflare Cache API
// - 100 requests/minute per IP (configurable)
// - Store counter in cache with TTL
// - Automatic reset after time window
// - Return { allowed, remaining, resetAt }

// FUNCTIONS:
// - RateLimiter.check(ip) → { allowed: boolean, remaining: number, resetAt: timestamp }
// - RateLimiter.reset(ip) → void (optional)

import { CONFIG } from '../config/index.js';
import { Logger } from './logger.js';

export class RateLimiter {
  static async check(ip) {
    const key = `ratelimit:${ip}`;
    const now = Date.now();

    try {
      const cache = caches.default;
      const cacheKey = new Request(`https://internal/${key}`);
      const cached = await cache.match(cacheKey);

      let data = { count: 0, resetAt: now + CONFIG.RATE_LIMIT_WINDOW };

      if (cached) {
        data = await cached.json();

        // Reset se janela expirou
        if (now > data.resetAt) {
          data = { count: 0, resetAt: now + CONFIG.RATE_LIMIT_WINDOW };
        }
      }

      // Verificar limite ANTES de incrementar
      const wouldBeAllowed = (data.count + 1) <= CONFIG.RATE_LIMIT_REQUESTS;

      if (wouldBeAllowed) {
        data.count++;  // Só incrementa se allowed

        // Salvar no cache
        const response = new Response(JSON.stringify(data), {
          headers: {
            'Cache-Control': `max-age=${Math.ceil(CONFIG.RATE_LIMIT_WINDOW / 1000)}`,
            'Content-Type': 'application/json'
          }
        });
        await cache.put(cacheKey, response);
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
      // Em caso de erro, permitir (fail open)
      return {
        allowed: true,
        remaining: CONFIG.RATE_LIMIT_REQUESTS,
        resetAt: now,
        limit: CONFIG.RATE_LIMIT_REQUESTS
      };
    }
  }
}
