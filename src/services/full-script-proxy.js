/**
 * @fileoverview Full Script Proxy Service - Processes scripts for full proxy mode
 * @module services/full-script-proxy
 */

import { Logger } from '../core/logger.js';
import { extractUrls, filterTrackableUrls } from '../proxy/url-extractor.js';
import { rewriteScriptUrls } from '../proxy/url-rewriter.js';
import { batchCreateEndpoints } from '../cache/dynamic-endpoints.js';
import { CONFIG } from '../config/index.js';

/**
 * Processes script for Full Script Proxy mode
 * @param {string} scriptContent - Original script
 * @param {string} scriptKey - Script identifier
 * @param {string} [workerOrigin] - Worker origin for absolute URLs (e.g., https://cdn.yourstore.com)
 * @returns {Promise<{content: string, urlsProcessed: number}>}
 */
export async function processScript(scriptContent, scriptKey, workerOrigin = '') {
  if (!CONFIG.FULL_SCRIPT_PROXY_ENABLED) {
    return { content: scriptContent, urlsProcessed: 0 };
  }

  try {
    const allUrls = extractUrls(scriptContent);
    const trackableUrls = filterTrackableUrls(allUrls);

    Logger.info('Full Script Proxy: URLs extracted', {
      scriptKey,
      total: allUrls.length,
      trackable: trackableUrls.length,
      workerOrigin: workerOrigin || '(relative)'
    });

    if (trackableUrls.length === 0) {
      return { content: scriptContent, urlsProcessed: 0 };
    }

    const urlMappings = await batchCreateEndpoints(trackableUrls, workerOrigin);
    const processedContent = rewriteScriptUrls(scriptContent, urlMappings);

    Logger.info('Full Script Proxy: Script rewritten', {
      scriptKey,
      urlsReplaced: urlMappings.size
    });

    return { content: processedContent, urlsProcessed: urlMappings.size };

  } catch (error) {
    Logger.error('Full Script Proxy processing failed', {
      scriptKey,
      error: error.message
    });
    return { content: scriptContent, urlsProcessed: 0 };
  }
}
