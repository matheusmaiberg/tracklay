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
 * Two modes:
 * 1. With aliases: ?c=abc123 → ?id=GTM-XXXXX (uses alias mapping)
 * 2. Without aliases + uppercase: ?c=MJ7DW8H → ?id=GTM-MJ7DW8H (auto-converts)
 *
 * @param {string} search - Query string (e.g., '?c=MJ7DW8H' or '?c=abc123')
 * @param {Object} aliases - Container aliases map { "alias": "real_id" }
 * @returns {string} Deobfuscated query string (e.g., '?id=GTM-XXXXX')
 *
 * Fallback behavior:
 * - If no search string: returns empty string
 * - If no 'c' parameter: returns original search (passthrough)
 * - On error: returns original search
 */
export function deobfuscateQuery(search, aliases = {}) {
  if (!search) {
    return '';
  }

  try {
    const params = new URLSearchParams(search);
    const containerParam = params.get('c'); // 'c' = container alias or short ID

    if (!containerParam) {
      // No 'c' parameter, return original
      return search;
    }

    const hasAliases = Object.keys(aliases ?? {}).length > 0;

    if (hasAliases) {
      // MODE 1: Use alias mapping
      const realId = aliases[containerParam];

      if (realId) {
        // Replace 'c' param with 'id' param
        params.delete('c');
        params.set('id', realId);

        Logger.debug('Query string deobfuscated via alias', {
          alias: containerParam,
          realId: realId.substring(0, 8) + '...', // Log partial ID only for security
        });

        return '?' + params.toString();
      } else {
        // Alias not found in configuration
        Logger.warn('Container alias not found', {
          alias: containerParam,
          availableAliases: Object.keys(aliases),
        });

        // Return original search (passthrough on missing alias)
        return search;
      }
    } else {
      // MODE 2: Auto-convert if uppercase (e.g., MJ7DW8H → GTM-MJ7DW8H)
      const isUpperCase = containerParam === containerParam.toUpperCase() && /^[A-Z0-9]+$/.test(containerParam);

      if (isUpperCase) {
        // Auto-convert to GTM-{ID} format
        const gtmId = `GTM-${containerParam}`;

        params.delete('c');
        params.set('id', gtmId);

        Logger.debug('Query string auto-converted', {
          shortId: containerParam,
          fullId: gtmId.substring(0, 12) + '...',
        });

        return '?' + params.toString();
      } else {
        // Not uppercase, passthrough
        Logger.debug('Query string passthrough (no aliases, not uppercase)', {
          param: containerParam,
        });
        return search;
      }
    }

  } catch (error) {
    Logger.error('Query deobfuscation failed', { error: error?.message });
    // Fallback to original on error
    return search;
  }
}
