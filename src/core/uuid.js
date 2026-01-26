// ============================================================
// UUID GENERATOR - UUID SEGURO COM SHA-256
// ============================================================
// RESPONSIBILITY:
// - Gerar UUID seguro usando SHA-256
// - Rotação semanal (não diária)
// - Combinar weekNumber + UUID_SECRET
// - Retornar primeiros 12 caracteres do hash
// - Fallback para timestamp em caso de erro

// FUNCTIONS:
// - generateSecureUUID() → Promise<string> (ex: "a3f9c2e1b8d4")
// - getWeekNumber() → number (helper)

import { CONFIG } from '../config/index.js';
import { Logger } from './logger.js';
import { generateSHA256 } from '../utils/crypto.js';

// ============= UUID SEGURO COM SHA-256 =============
export async function generateSecureUUID(salt = '') {
  try {
    // Calcular número da semana (rotação semanal)
    const now = Date.now();
    const weekNumber = Math.floor(now / CONFIG.UUID_SALT_ROTATION);

    // Criar string com date + week + secret + optional salt
    const data = `${weekNumber}:${CONFIG.UUID_SECRET}${salt ? ':' + salt : ''}`;

    // SHA-256 hash
    const hashHex = await generateSHA256(data);

    // Retornar primeiros 12 caracteres (UUID-like)
    return hashHex.substring(0, 12);

  } catch (error) {
    Logger.error('UUID generation failed', { error: error.message });
    // Fallback para UUID baseado em timestamp (menos seguro)
    return Date.now().toString(36).substring(0, 12);
  }
}

// ============= ENDPOINT UUID WITH ROTATION SUPPORT =============
/**
 * Generate endpoint UUID based on rotation configuration
 *
 * @param {string} provider - Provider name ('facebook' or 'google')
 * @returns {Promise<string>} UUID for endpoint
 *
 * Behavior:
 * - If ENDPOINTS_UUID_ROTATION=true: Returns rotating UUID via generateSecureUUID()
 * - If ENDPOINTS_UUID_ROTATION=false: Returns fixed UUID from CONFIG (env vars)
 *
 * Rotation Details (when ENDPOINTS_UUID_ROTATION=true):
 * - Deterministic time-based generation (stateless)
 * - Week-based rotation: Math.floor(Date.now() / UUID_SALT_ROTATION)
 * - Provider-specific salt ensures different UUIDs for Facebook vs Google
 * - All workers generate the same UUID at the same time (no coordination needed)
 * - Cloudflare Workers compatible (no KV/Durable Objects required)
 *
 * Example:
 * - Week 1: facebook = "a3f9c2e1b8d4", google = "b7e4d3f2c9a1"
 * - Week 2: facebook = "d8c3f1e2b9a4", google = "e9f4c2d3a8b1"
 *
 * Security:
 * - UUIDs rotate automatically every UUID_SALT_ROTATION (default: 7 days)
 * - Ad-blockers cannot rely on fixed UUIDs for blacklisting
 * - If discovered, UUIDs expire within 7 days maximum
 */
export async function generateEndpointUUID(provider) {
  // Check if rotation is disabled (use fixed UUIDs from env vars)
  if (CONFIG.ENDPOINTS_UUID_ROTATION === false) {
    if (provider === 'facebook') {
      return CONFIG.ENDPOINTS_FACEBOOK;
    } else if (provider === 'google') {
      return CONFIG.ENDPOINTS_GOOGLE;
    }
    // Fallback to default if provider not recognized
    Logger.warn('Unknown provider for endpoint UUID', { provider });
    return CONFIG.ENDPOINTS_FACEBOOK;
  }

  // Rotation enabled: use generateSecureUUID() with provider-specific salt
  // This generates UUIDs that rotate based on UUID_SALT_ROTATION interval
  // Provider salt ensures Facebook and Google have different UUIDs
  return await generateSecureUUID(provider);
}
