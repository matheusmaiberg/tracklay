// ============================================================
// CRYPTO - CRYPTOGRAPHIC UTILITIES
// ============================================================
// RESPONSIBILITY:
// - generateSHA256(text) → Promise<string> - Generates SHA-256 hash of a string

/**
 * Generates SHA-256 hash of a string
 * @param {string} text - Text to hash
 * @returns {Promise<string>} Hex hash string
 */
export async function generateSHA256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}
