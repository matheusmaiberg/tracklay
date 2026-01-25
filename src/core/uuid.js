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
export async function generateSecureUUID() {
  try {
    // Calcular número da semana (rotação semanal)
    const now = Date.now();
    const weekNumber = Math.floor(now / CONFIG.UUID_SALT_ROTATION);

    // Criar string com date + week + secret
    const data = `${weekNumber}:${CONFIG.UUID_SECRET}`;

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
