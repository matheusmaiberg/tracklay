/**
 * @fileoverview Scheduled script updates - Cloudflare Cron handler
 */

import { Logger } from '../core/logger.js';
import { fetchAndCompareScript, SCRIPT_URLS } from '../cache/script-cache.js';

/**
 * @returns {Promise<Object>}
 */
export async function updateScripts() {
  Logger.info('Starting scheduled script cache update');

  const startTime = Date.now();
  const results = {
    fbevents: null,
    gtm: null,
    gtag: null
  };

  const updatePromises = Object.entries(SCRIPT_URLS).map(async ([scriptKey, url]) => {
    try {
      const result = await fetchAndCompareScript(url, scriptKey);
      results[scriptKey] = result;

      const { updated, error } = result;

      if (updated) {
        Logger.info('Script updated in cache', { scriptKey });
      } else if (error) {
        Logger.warn('Script update failed', { scriptKey, error });
      } else {
        Logger.info('Script unchanged, cache TTL refreshed', { scriptKey });
      }

      return { scriptKey, ...result };
    } catch (error) {
      Logger.error('Unexpected error updating script', {
        scriptKey,
        error: error?.message,
        stack: error?.stack
      });

      const errorMessage = error?.message ?? 'Unknown error';
      results[scriptKey] = { updated: false, error: errorMessage };
      return { scriptKey, updated: false, error: errorMessage };
    }
  });

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
