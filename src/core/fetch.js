// ============================================================
// FETCH - FETCH COM TIMEOUT E RETRY
// ============================================================
// RESPONSABILIDADE:
// - fetchWithTimeout(url, options) → Promise<Response>
// - Usar AbortController para timeout
// - Timeout configurável (default: 10s)
// - Throw Error('Request timeout') se abortar
// - Retry opcional (fetchWithRetry)

// FUNÇÕES:
// - fetchWithTimeout(url, options) → Promise<Response>
// - fetchWithRetry(url, options, maxRetries) → Promise<Response> (opcional)

import { CONFIG } from '../config/index.js';

export async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), CONFIG.FETCH_TIMEOUT);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  }
}
