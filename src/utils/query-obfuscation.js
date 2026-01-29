/**
 * @fileoverview Query obfuscation - Container ID aliasing
 */

import { Logger } from '../core/logger.js';

/**
 * @param {string} search
 * @param {Object} [aliases={}]
 * @returns {string}
 */
export function deobfuscateQuery(search, aliases = {}) {
  if (!search) {
    return '';
  }

  try {
    const params = new URLSearchParams(search);
    const containerParam = params.get('c');

    if (!containerParam) {
      return search;
    }

    const hasAliases = Object.keys(aliases ?? {}).length > 0;

    if (hasAliases) {
      const realId = aliases[containerParam];

      if (realId) {
        params.delete('c');
        params.set('id', realId);

        Logger.debug('Query string deobfuscated via alias', {
          alias: containerParam,
          realId: realId.substring(0, 8) + '...',
        });

        return '?' + params.toString();
      } else {
        Logger.warn('Container alias not found', {
          alias: containerParam,
          availableAliases: Object.keys(aliases),
        });

        return search;
      }
    } else {
      const isUpperCase = containerParam === containerParam.toUpperCase() && /^[A-Z0-9]+$/.test(containerParam);

      if (isUpperCase) {
        const gtmId = `GTM-${containerParam}`;

        params.delete('c');
        params.set('id', gtmId);

        Logger.debug('Query string auto-converted', {
          shortId: containerParam,
          fullId: gtmId.substring(0, 12) + '...',
        });

        return '?' + params.toString();
      } else {
        Logger.debug('Query string passthrough (no aliases, not uppercase)', {
          param: containerParam,
        });
        return search;
      }
    }

  } catch (error) {
    Logger.error('Query deobfuscation failed', { error: error?.message });
    return search;
  }
}
