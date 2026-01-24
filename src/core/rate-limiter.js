// ============================================================
// RATE LIMITER - RATE LIMITING POR IP
// ============================================================
// RESPONSABILIDADE:
// - Implementar rate limiting usando Cloudflare Cache API
// - 100 requests/minuto por IP (configurável)
// - Armazenar contador no cache com TTL
// - Reset automático após janela de tempo
// - Retornar { allowed, remaining, resetAt }

// FUNÇÕES:
// - RateLimiter.check(ip) → { allowed: boolean, remaining: number, resetAt: timestamp }
// - RateLimiter.reset(ip) → void (opcional)

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

      // Incrementar contador
      data.count++;

      // Salvar no cache
      const response = new Response(JSON.stringify(data), {
        headers: {
          'Cache-Control': `max-age=${Math.ceil(CONFIG.RATE_LIMIT_WINDOW / 1000)}`,
          'Content-Type': 'application/json'
        }
      });
      await cache.put(cacheKey, response);

      // Verificar limite
      const allowed = data.count <= CONFIG.RATE_LIMIT_REQUESTS;
      const remaining = Math.max(0, CONFIG.RATE_LIMIT_REQUESTS - data.count);

      return { allowed, remaining, resetAt: data.resetAt };

    } catch (error) {
      Logger.error('Rate limit check failed', { error: error.message });
      // Em caso de erro, permitir (fail open)
      return { allowed: true, remaining: CONFIG.RATE_LIMIT_REQUESTS, resetAt: now };
    }
  }
}
