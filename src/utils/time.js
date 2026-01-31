/**
 * @fileoverview Time utilities - Timestamp and date helpers
 */

/**
 * @returns {number}
 */
export function timestamp() {
  return Date.now();
}

/**
 * @param {number} [ms]
 * @returns {string}
 */
export function timestampToISO(ms) {
  return new Date(ms ?? Date.now()).toISOString();
}

/**
 * @returns {string}
 */
export function getCurrentDateISO() {
  return new Date().toISOString();
}

/**
 * @param {number} now
 * @param {number} rotationWindow
 * @returns {number}
 */
export function calculateNextRotation(now, rotationWindow) {
  return Math.ceil(now / rotationWindow) * rotationWindow;
}

/**
 * @param {number} now
 * @param {number} rotationWindow
 * @returns {string}
 */
export function getNextRotationISO(now, rotationWindow) {
  const nextRotation = calculateNextRotation(now, rotationWindow);
  return new Date(nextRotation).toISOString();
}
