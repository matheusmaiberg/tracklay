// ============================================================
// SCHEDULED SCRIPT UPDATES - CLOUDFLARE CRON HANDLER
// ============================================================
// RESPONSABILIDADE:
// - Handler para Cloudflare Cron Triggers (scheduled events)
// - Atualizar scripts de terceiros a cada 12 horas
// - Verificar mudanças via SHA-256 hash
// - Logar quando scripts são atualizados
//
// EXECUÇÃO: A cada 12 horas (00:00 e 12:00 UTC)
// SCRIPTS: fbevents.js, gtm.js, gtag.js
//
// NOTA: Este handler é chamado pelo worker.js via scheduled() export

import { Logger } from '../core/logger.js';
import { fetchAndCompareScript, SCRIPT_URLS } from '../cache/script-cache.js';

/**
 * Atualiza todos os scripts em cache
 * Chamado pelo Cloudflare Cron Trigger a cada 12 horas
 */
export async function updateScripts() {
  Logger.info('Starting scheduled script cache update');

  const startTime = Date.now();
  const results = {
    fbevents: null,
    gtm: null,
    gtag: null
  };

  // Atualizar cada script em paralelo
  const updatePromises = Object.entries(SCRIPT_URLS).map(async ([scriptKey, url]) => {
    try {
      const result = await fetchAndCompareScript(url, scriptKey);
      results[scriptKey] = result;

      if (result.updated) {
        Logger.info('Script updated in cache', { scriptKey });
      } else if (result.error) {
        Logger.warn('Script update failed', { scriptKey, error: result.error });
      } else {
        Logger.info('Script unchanged, cache TTL refreshed', { scriptKey });
      }

      return { scriptKey, ...result };
    } catch (error) {
      Logger.error('Unexpected error updating script', {
        scriptKey,
        error: error.message,
        stack: error.stack
      });
      results[scriptKey] = { updated: false, error: error.message };
      return { scriptKey, updated: false, error: error.message };
    }
  });

  // Aguardar todas as atualizações
  const allResults = await Promise.all(updatePromises);

  const duration = Date.now() - startTime;
  const updatedCount = allResults.filter(r => r.updated).length;
  const errorCount = allResults.filter(r => r.error).length;

  Logger.info('Scheduled script cache update completed', {
    duration: `${duration}ms`,
    total: allResults.length,
    updated: updatedCount,
    unchanged: allResults.length - updatedCount - errorCount,
    errors: errorCount,
    results: Object.fromEntries(
      Object.entries(results).map(([key, val]) => [
        key,
        val.updated ? 'updated' : val.error ? `error: ${val.error}` : 'unchanged'
      ])
    )
  });

  return {
    success: errorCount === 0,
    duration,
    updated: updatedCount,
    total: allResults.length,
    results
  };
}
