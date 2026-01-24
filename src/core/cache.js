// ============================================================
// CACHE MANAGER - CLOUDFLARE CACHE API WRAPPER
// ============================================================
// RESPONSABILIDADE:
// - Wrapper para caches.default
// - get(key) → Response | null
// - put(key, value, ttl) → void
// - delete(key) → void
// - purge(pattern) → void (opcional)

// FUNÇÕES:
// - CacheManager.get(key)
// - CacheManager.put(key, value, ttl)
// - CacheManager.delete(key)

// NOTA: Pode ser simples wrapper ou adicionar lógica extra

export class CacheManager {
  static async get(key) {
    const response = await caches.default.match(key);
    return response || null;
  }

  static async put(key, response, ttl) {
    await caches.default.put(key, response);
  }

  static async delete(key) {
    return await caches.default.delete(key);
  }
}
