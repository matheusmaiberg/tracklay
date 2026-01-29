/**
 * @fileoverview Cache Manager - Cloudflare Cache API wrapper
 * @module core/cache
 */

export class CacheManager {
  static async get(key) {
    return await caches.default.match(key);
  }

  static async put(key, response, ttl) {
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
