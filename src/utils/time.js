// ============================================================
// TIME - TIME UTILITIES
// ============================================================
// RESPONSIBILITY:
// - timestamp() → number - Returns current timestamp in milliseconds
// - timestampToISO() → string - Returns current timestamp as ISO string

/**
 * Returns current timestamp in milliseconds
 * @returns {number} Current timestamp
 */
export function timestamp() {
  return Date.now();
}

/**
 * Returns current timestamp as ISO string
 * @returns {string} ISO timestamp string
 */
export function timestampToISO() {
  return new Date().toISOString();
}
