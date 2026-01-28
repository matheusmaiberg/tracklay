// ============================================================
// VALIDATION - VALIDATION UTILITIES
// ============================================================
// RESPONSIBILITY:
// - parsePositiveInt(value) → number|null - Parses a string to a positive integer

/**
 * Parses a string to a positive integer
 * @param {string} value - Value to parse
 * @returns {number|null} Parsed positive integer or null if invalid
 */
export function parsePositiveInt(value) {
  const parsed = parseInt(value, 10);
  return Number.isNaN(parsed) || parsed <= 0 ? null : parsed;
}
