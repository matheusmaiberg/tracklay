// ============================================================
// HEADER UTILITIES
// ============================================================
// RESPONSIBILITY:
// - Header manipulation and copying helpers
// - Simplify header operations across the codebase
//
// FUNCTIONS:
// - copyHeaderIfExists() - Conditionally copy header from source to target

/**
 * Copies a header from source to target if it exists
 * @param {Headers} source - Source Headers object
 * @param {Headers} target - Target Headers object
 * @param {string} headerName - Header name to copy
 */
export function copyHeaderIfExists(source, target, headerName) {
  const value = source.get(headerName);
  if (value) {
    target.set(headerName, value);
  }
}
