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
