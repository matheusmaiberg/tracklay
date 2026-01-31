/**
 * @fileoverview Header utilities - Header manipulation helpers
 */

/**
 * @param {Headers} source
 * @param {Headers} target
 * @param {string} headerName
 */
export function copyHeaderIfExists(source, target, headerName) {
  const value = source.get(headerName);
  if (value != null) {
    target.set(headerName, value);
  }
}
