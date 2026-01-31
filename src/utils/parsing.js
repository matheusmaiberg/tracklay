/**
 * @fileoverview Parsing utilities - String/array parsing helpers
 */

/**
 * @param {string} csvString - Comma-separated values
 * @returns {string[]} Array of trimmed strings
 */
export const parseArrayConfig = (csvString) => {
  if (!csvString) return [];
  if (Array.isArray(csvString)) return csvString;
  return csvString.split(',').map(s => s.trim()).filter(Boolean);
};
