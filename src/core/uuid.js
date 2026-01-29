/**
 * @fileoverview UUID Generator - Secure UUID with SHA-256
 * @module core/uuid
 */

import { CONFIG } from '../config/index.js';
import { Logger } from './logger.js';
import { generateSHA256 } from '../utils/crypto.js';

/**
 * @param {string} salt - Optional salt for UUID generation
 * @returns {Promise<string>} 12-character UUID
 */
export async function generateSecureUUID(salt = '') {
  try {
    const now = Date.now();
    const weekNumber = Math.floor(now / CONFIG.UUID_ROTATION_INTERVAL_MS);

    const data = `${weekNumber}:${CONFIG.OBFUSCATION_SECRET}${salt ? `:${salt}` : ''}`;

    const hashHex = await generateSHA256(data);

    return hashHex.slice(0, 12);

  } catch (error) {
    Logger.error('UUID generation failed', { error: error?.message });
    return Date.now().toString(36).slice(0, 12);
  }
}

/**
 * @param {string} provider - Provider name ('facebook' or 'google')
 * @returns {Promise<string>} UUID for endpoint
 */
export async function generateEndpointUUID(provider) {
  if (CONFIG.UUID_ROTATION_ENABLED === false) {
    const providerKey = provider?.toUpperCase() === 'FACEBOOK' ? 'FB' : 'GA';
    const endpoint = CONFIG[`OBFUSCATION_${providerKey}_UUID`];
    if (endpoint) return endpoint;

    Logger.warn('Unknown provider for endpoint UUID', { provider });
    return CONFIG.OBFUSCATION_FB_UUID;
  }

  return generateSecureUUID(provider);
}
