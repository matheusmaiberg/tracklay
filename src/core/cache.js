// ============================================================
// CACHE MANAGER - CLOUDFLARE CACHE API WRAPPER
// ============================================================
// RESPONSIBILITY:
// - Wrapper for caches.default
// - get(key) → Response | null
// - put(key, value, ttl) → void
// - delete(key) → void
// - purge(pattern) → void (optional)

// FUNCTIONS:
// - CacheManager.get(key)
// - CacheManager.put(key, value, ttl)
// - CacheManager.delete(key)

// NOTE: Can be simple wrapper or add extra logic

export class CacheManager {
  static async get(key) {
    return await caches.default.match(key);
  }

  static async put(key, response, ttl) {
    // Clone response and add Cache-Control header
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', `public, max-age=${ttl}`);

    const modifiedResponse = new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });

    await caches.default.put(key, modifiedResponse);
  }

  static async delete(key) {
    return await caches.default.delete(key);
  }
}
