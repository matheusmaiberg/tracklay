// ============================================================
// CACHE STRATEGY - CACHE DECISION LOGIC
// ============================================================
// RESPONSABILIDADE:
// - shouldCache(url, request) → boolean
// - getCacheKey(url) → Request (apenas targetUrl + GET)
// - getCacheTTL(url) → number (CACHE_TTL para scripts)
// - Nunca cachear endpoints (/g/collect, /tr)
// - Sempre cachear scripts (.js)

// FUNÇÕES:
// - shouldCache(url, request) → boolean
// - getCacheKey(url) → Request
// - getCacheTTL(url) → number

import { CONFIG } from '../config/index.js';

/**
 * Determina se uma URL deve ser cacheada
 * @param {URL} url - URL object do request
 * @param {Request} request - Request object
 * @returns {boolean} - true se deve cachear
 */
export function shouldCache(url, request) {
  // Nunca cachear endpoints de tracking
  const trackingEndpoints = ['/g/collect', '/tr', '/collect'];
  if (trackingEndpoints.some(endpoint => url.pathname.includes(endpoint))) {
    return false;
  }

  // Sempre cachear scripts (.js)
  if (url.pathname.endsWith('.js')) {
    return true;
  }

  return false;
}

/**
 * Cria a cache key correta usando apenas targetUrl + GET
 * @param {string} targetUrl - URL completa do destino
 * @returns {Request} - Request object para usar como cache key
 */
export function getCacheKey(targetUrl) {
  return new Request(targetUrl, { method: 'GET' });
}

/**
 * Retorna o TTL de cache para uma URL
 * @param {URL} url - URL object do request
 * @returns {number} - TTL em segundos
 */
export function getCacheTTL(url) {
  // Scripts: usar CACHE_TTL configurado
  if (url.pathname.endsWith('.js')) {
    return CONFIG.CACHE_TTL;
  }

  // Default: sem cache
  return 0;
}
