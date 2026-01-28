// ============================================================
// TIME - TIME UTILITIES
// ============================================================
// RESPONSIBILITY:
// - timestamp() → number - Returns current timestamp in milliseconds
// - timestampToISO(ms?) → string - Convert timestamp to ISO string
// - getCurrentDateISO() → string - Get current date/time as ISO string
// - calculateNextRotation() → number - Calculate next rotation timestamp
// - getNextRotationISO() → string - Get next rotation as ISO string

/**
 * Returns current timestamp in milliseconds
 * @returns {number} Current timestamp
 */
export function timestamp() {
  return Date.now();
}

/**
 * Convert timestamp (milliseconds) to ISO 8601 string
 * Flexible version that accepts optional timestamp parameter
 *
 * @param {number} [ms] - Timestamp in milliseconds (defaults to Date.now())
 * @returns {string} ISO 8601 date string
 *
 * Usage:
 * timestampToISO(1234567890000) → "2009-02-13T23:31:30.000Z"
 * timestampToISO() → current time as ISO
 */
export function timestampToISO(ms) {
  return new Date(ms ?? Date.now()).toISOString();
}

/**
 * Get current date/time as ISO 8601 string
 * Alias for timestampToISO() without params
 * Clearer name for common use case
 *
 * @returns {string} ISO 8601 date string of current time
 */
export function getCurrentDateISO() {
  return new Date().toISOString();
}

/**
 * Calculate next rotation time based on rotation window
 * Used for UUID rotation expiration timestamps
 *
 * @param {number} now - Current timestamp (milliseconds)
 * @param {number} rotationWindow - Rotation interval (milliseconds)
 * @returns {number} Timestamp of next rotation
 *
 * Usage:
 * calculateNextRotation(Date.now(), 604800000) → next week
 */
export function calculateNextRotation(now, rotationWindow) {
  return Math.ceil(now / rotationWindow) * rotationWindow;
}

/**
 * Calculate next rotation time as ISO string
 * Convenience wrapper around calculateNextRotation
 *
 * @param {number} now - Current timestamp (milliseconds)
 * @param {number} rotationWindow - Rotation interval (milliseconds)
 * @returns {string} ISO 8601 string of next rotation
 */
export function getNextRotationISO(now, rotationWindow) {
  const nextRotation = calculateNextRotation(now, rotationWindow);
  return new Date(nextRotation).toISOString();
}
