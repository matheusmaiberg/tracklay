/**
 * @fileoverview URL Rewriter - Rewrites URLs in script content with proxied paths
 */

import { Logger } from '../core/logger.js';

/**
 * Rewrites URLs in script content with proxied paths
 * @param {string} scriptContent - Original script content
 * @param {Map<string, {uuid: string, proxyPath: string}>} urlMappings - URL to proxy info
 * @returns {string} Script with URLs replaced
 */
export function rewriteScriptUrls(scriptContent, urlMappings) {
  if (!scriptContent || !urlMappings || urlMappings.size === 0) {
    return scriptContent;
  }

  let rewrittenContent = scriptContent;

  // Sort by length descending (replace longer URLs first to avoid partial matches)
  const sortedUrls = Array.from(urlMappings.keys())
    .sort((a, b) => b.length - a.length);

  for (const originalUrl of sortedUrls) {
    const mapping = urlMappings.get(originalUrl);
    if (!mapping?.proxyPath) continue;

    // Replace normal URL (using split/join instead of regex for safety)
    if (rewrittenContent.includes(originalUrl)) {
      rewrittenContent = rewrittenContent.split(originalUrl).join(mapping.proxyPath);
    }

    // Also replace escaped version (https:\/\/example.com\/path)
    const escapedSlashUrl = originalUrl.replace(/\//g, '\\/');
    if (rewrittenContent.includes(escapedSlashUrl)) {
      const escapedSlashProxyPath = mapping.proxyPath.replace(/\//g, '\\/');
      rewrittenContent = rewrittenContent.split(escapedSlashUrl).join(escapedSlashProxyPath);
    }
  }

  Logger.debug('Script URLs rewritten', {
    urlsReplaced: urlMappings.size,
    lengthBefore: scriptContent.length,
    lengthAfter: rewrittenContent.length
  });

  return rewrittenContent;
}
