/**
 * @fileoverview Cryptographic utilities - SHA-256 hash generation
 */

/**
 * @param {string} text
 * @returns {Promise<string>}
 */
export async function generateSHA256(text) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * @returns {string} Random UUID or timestamp-based secret
 */
export const generateDefaultSecret = () => {
  try {
    if (crypto?.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // Fallback to timestamp-based secret
  }

  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 15);
  return `${timestamp}-${random}`;
};
