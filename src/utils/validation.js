/**
 * @fileoverview Validation utilities - Input validation helpers
 */

/**
 * @param {string} value
 * @returns {number|null}
 */
export function parsePositiveInt(value) {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}
