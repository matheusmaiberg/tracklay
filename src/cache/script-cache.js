// ============================================================
// SCRIPT CACHE - INTELLIGENT CACHING FOR THIRD-PARTY SCRIPTS
// ============================================================
// RESPONSIBILITY:
// - Cache inteligente de scripts de terceiros (fbevents, gtm, gtag)
// - Atualização automática a cada 12 horas via Cloudflare Cron
// - Detecção de mudanças via SHA-256 hash comparison
// - Fallback para fetch normal se cache falhar
//
// FUNCTIONS:
// - getScriptFromCache(scriptKey) - Retorna script do cache ou null
// - fetchAndCompareScript(url, scriptKey) - Busca, compara hash, atualiza se necessário
//
// CACHE KEYS:
// - script:fbevents - Conteúdo do script Facebook Pixel (fresh, 24h)
// - script:gtm - Conteúdo do Google Tag Manager (fresh, 24h)
// - script:gtag - Conteúdo do Google Analytics/Gtag (fresh, 24h)
// - script:stale:fbevents - Fallback stale (7 dias)
// - script:stale:gtm - Fallback stale (7 dias)
// - script:stale:gtag - Fallback stale (7 dias)
// - script:hash:fbevents - SHA-256 hash do script
// - script:hash:gtm - SHA-256 hash do script
// - script:hash:gtag - SHA-256 hash do script
//
// TTL:
// - Fresh cache: 24 horas (renovado a cada 12h se não mudou)
// - Stale cache: 7 dias (fallback para alta disponibilidade)

import { generateSHA256 } from '../utils/crypto.js';
import { Logger } from '../core/logger.js';
import { CacheManager } from '../core/cache.js';
import { fetchWithTimeout } from '../core/fetch.js';
import { createScriptResponse, createHashResponse } from './response-factory.js';

// ============= CONFIGURAÇÃO DE SCRIPTS =============

export const SCRIPT_URLS = {
  fbevents: 'https://connect.facebook.net/en_US/fbevents.js',
  gtm: 'https://www.googletagmanager.com/gtm.js',
  gtag: 'https://www.googletagmanager.com/gtag/js'
};

const CACHE_PREFIX = 'script:';
const STALE_PREFIX = 'script:stale:';
const HASH_PREFIX = 'script:hash:';
const CACHE_TTL = 86400; // 24 horas em segundos
const STALE_TTL = 604800; // 7 dias em segundos (fallback para alta disponibilidade)

// ============= FUNÇÕES PRIVADAS =============

/**
 * Updates all cache layers (fresh, stale, hash) for a script
 * @param {string} content - Script content
 * @param {string} scriptKey - Script identifier
 * @param {string} hash - Script hash
 * @param {string} updateType - 'updated' | 'refreshed'
 * @returns {Promise<void>}
 */
async function updateScriptCache(content, scriptKey, hash, updateType) {
  // Create cache keys
  const cacheKey = `${CACHE_PREFIX}${scriptKey}`;
  const staleKey = `${STALE_PREFIX}${scriptKey}`;
  const hashKey = `${HASH_PREFIX}${scriptKey}`;

  // Create responses using factory
  const scriptResponse = createScriptResponse(content, scriptKey, hash, {
    ttl: CACHE_TTL,
    updateType,
    isStale: false
  });

  const staleResponse = createScriptResponse(content, scriptKey, hash, {
    ttl: STALE_TTL,
    updateType,
    isStale: true
  });

  const hashResponse = createHashResponse(hash, CACHE_TTL);

  // Store all caches in parallel
  await Promise.all([
    CacheManager.put(cacheKey, scriptResponse, CACHE_TTL),
    CacheManager.put(staleKey, staleResponse, STALE_TTL),
    CacheManager.put(hashKey, hashResponse, CACHE_TTL)
  ]);
}

// ============= FUNÇÕES PÚBLICAS =============

/**
 * Obtém um script do cache
 * Implementa Stale-While-Revalidate Pattern:
 * 1. Tenta cache fresco (24h TTL)
 * 2. Se expirado, tenta cache stale (7d TTL)
 * 3. Melhora uptime: 99.9% → 99.99%+
 *
 * @param {string} scriptKey - Nome do script (fbevents, gtm, gtag)
 * @returns {Promise<Response|null>} - Response do cache ou null
 */
export async function getScriptFromCache(scriptKey) {
  try {
    // Tentar cache fresco primeiro (24h)
    const cacheKey = `${CACHE_PREFIX}${scriptKey}`;
    const cached = await CacheManager.get(cacheKey);

    if (cached) {
      Logger.debug('Script cache hit (fresh)', { scriptKey });
      return cached;
    }

    // Se cache fresco expirou, tentar cache stale (7d)
    const staleKey = `${STALE_PREFIX}${scriptKey}`;
    const staleCached = await CacheManager.get(staleKey);

    if (staleCached) {
      Logger.warn('Script cache hit (stale fallback)', {
        scriptKey,
        message: 'Fresh cache expired, serving stale content'
      });

      // Adicionar header indicando que é stale
      const staleResponse = new Response(staleCached.body, {
        status: staleCached.status,
        headers: staleCached.headers
      });
      staleResponse.headers.set('X-Cache-Status', 'stale');

      return staleResponse;
    }

    Logger.debug('Script cache miss (fresh and stale)', { scriptKey });
    return null;
  } catch (error) {
    Logger.warn('Failed to get script from cache', {
      scriptKey,
      error: error.message
    });
    return null;
  }
}

/**
 * Busca um script, compara o hash e atualiza o cache se necessário
 * @param {string} url - URL do script
 * @param {string} scriptKey - Nome do script (fbevents, gtm, gtag)
 * @returns {Promise<{updated: boolean, error?: string}>}
 */
export async function fetchAndCompareScript(url, scriptKey) {
  try {
    Logger.info('Fetching script for cache update', { scriptKey, url });

    // Buscar script da origem
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/javascript, */*',
      }
    });

    if (!response.ok) {
      const { status, statusText } = response;
      Logger.error('Failed to fetch script', {
        scriptKey,
        status,
        statusText
      });
      return { updated: false, error: `HTTP ${status}` };
    }

    // Ler conteúdo do script
    const scriptContent = await response.text();

    // Calcular hash SHA-256
    const newHash = await generateSHA256(scriptContent);

    // Obter hash anterior do cache
    const hashKey = `${HASH_PREFIX}${scriptKey}`;
    const oldHashResponse = await CacheManager.get(hashKey);
    const oldHash = (await oldHashResponse?.text()) ?? null;

    // Comparar hashes
    const hasChanged = oldHash !== newHash;

    if (hasChanged) {
      Logger.info('Script content changed, updating cache', {
        scriptKey,
        oldHash: oldHash ? `${oldHash.substring(0, 16)}...` : 'none',
        newHash: `${newHash.substring(0, 16)}...`
      });

      await updateScriptCache(scriptContent, scriptKey, newHash, 'updated');

      Logger.info('Script cache updated successfully (fresh + stale)', { scriptKey });
      return { updated: true };

    } else {
      Logger.info('Script unchanged, refreshing cache TTL', { scriptKey });

      await updateScriptCache(scriptContent, scriptKey, newHash, 'refreshed');

      return { updated: false };
    }

  } catch (error) {
    Logger.error('Error in fetchAndCompareScript', {
      scriptKey,
      error: error.message,
      stack: error.stack
    });
    return { updated: false, error: error.message };
  }
}

// ============= FUNÇÕES AUXILIARES =============

/**
 * Identifica o script key a partir da URL
 * @param {string} url - URL do script
 * @returns {string|null} - Script key ou null
 */
export function identifyScriptKey(url) {
  if (url.includes('fbevents.js')) return 'fbevents';
  if (url.includes('gtm.js')) return 'gtm';
  if (url.includes('gtag/js')) return 'gtag';
  return null;
}
