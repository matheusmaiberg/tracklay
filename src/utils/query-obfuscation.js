// ============================================================
// QUERY OBFUSCATION - CONTAINER ID ALIASING
// ============================================================
// RESPONSIBILITY:
// - Map obfuscated container aliases to real IDs
// - deobfuscateQuery(search, aliases) → string
// - Support for GTM (id param) and GA4 (id param)
//
// FUNCTIONS:
// - deobfuscateQuery(search, aliases) → string

import { Logger } from '../core/logger.js';

/**
 * Deobfuscates query string container aliases
 *
 * Converts obfuscated container aliases to real GTM/GA4 IDs
 * Example: ?c=abc123 → ?id=GTM-XXXXX
 *
 * @param {string} search - Query string (e.g., '?c=abc123')
 * @param {Object} aliases - Container aliases map { "alias": "real_id" }
 * @returns {string} Deobfuscated query string (e.g., '?id=GTM-XXXXX')
 *
 * Fallback behavior:
 * - If no search string: returns empty string
 * - If no aliases configured: returns original search (passthrough)
 * - If alias not found: returns original search with warning
 * - On error: returns original search
 */
export function deobfuscateQuery(search, aliases = {}) {
  if (!search) {
    return '';
  }

  // Passthrough if no obfuscation configured
  if (!aliases || Object.keys(aliases).length === 0) {
    return search;
  }

  try {
    const params = new URLSearchParams(search);
    const containerAlias = params.get('c'); // 'c' = container alias

    if (containerAlias) {
      const realId = aliases[containerAlias];

      if (realId) {
        // Replace 'c' param with 'id' param
        params.delete('c');
        params.set('id', realId);

        Logger.debug('Query string deobfuscated', {
          alias: containerAlias,
          realId: realId.substring(0, 8) + '...' // Log partial ID only for security
        });

        return '?' + params.toString();
      } else {
        // Alias not found in configuration
        Logger.warn('Container alias not found', {
          alias: containerAlias,
          availableAliases: Object.keys(aliases)
        });

        // Return original search (passthrough on missing alias)
        return search;
      }
    }

    // No 'c' parameter, return original
    return search;

  } catch (error) {
    Logger.error('Query deobfuscation failed', { error: error.message });
    // Fallback to original on error
    return search;
  }
}
