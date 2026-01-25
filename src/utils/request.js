// ============================================================
// REQUEST UTILITIES
// ============================================================
// RESPONSIBILITY:
// - Request parsing and manipulation helpers
// - URL extraction and parsing
//
// FUNCTIONS:
// - getParsedUrl() - Parses request URL into URL object

/**
 * Parses request URL
 * @param {Request} request - Fetch API Request object
 * @returns {URL} Parsed URL object
 */
export function getParsedUrl(request) {
  return new URL(request.url);
}
