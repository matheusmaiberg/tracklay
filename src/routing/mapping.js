// ============================================================
// MAPPING - URL MAPPINGS (SCRIPTS E ENDPOINTS)
// ============================================================
// RESPONSABILIDADE:
// - Exportar SCRIPT_MAP: { path → targetUrl }
// - Exportar ENDPOINT_MAP: { path → targetUrl }
// - Suportar múltiplos paths (/cdn/, /assets/, /static/)

import { CONFIG } from '../config/index.js';

// ============= SCRIPT MAPPINGS =============
// Map proxy paths to original script URLs
// Supports multiple path variations (/cdn/, /assets/, /static/) for anti-detection
export const SCRIPT_MAP = {
  '/cdn/fbevents.js': 'https://connect.facebook.net/en_US/fbevents.js',
  '/cdn/gtm.js': 'https://www.googletagmanager.com/gtm.js',
  '/cdn/gtag.js': 'https://www.googletagmanager.com/gtag/js',

  // Alternative paths - same targets
  '/assets/fbevents.js': 'https://connect.facebook.net/en_US/fbevents.js',
  '/assets/gtm.js': 'https://www.googletagmanager.com/gtm.js',

  '/static/fbevents.js': 'https://connect.facebook.net/en_US/fbevents.js',
  '/static/gtm.js': 'https://www.googletagmanager.com/gtm.js'
};

// ============= ENDPOINT MAPPINGS =============
// Map proxy endpoints to original tracking URLs
// Note: GTM endpoints require GTM_SERVER_URL to be configured
export function getEndpointMap() {
  const map = {
    '/tr': 'https://www.facebook.com/tr'
  };

  // Only add GTM endpoints if GTM_SERVER_URL is configured
  if (CONFIG.GTM_SERVER_URL) {
    map['/g/collect'] = `${CONFIG.GTM_SERVER_URL}/g/collect`;
    map['/j/collect'] = `${CONFIG.GTM_SERVER_URL}/j/collect`;
  }

  return map;
}

// Export static map for backward compatibility
export const ENDPOINT_MAP = getEndpointMap();

// ============= HELPER FUNCTION =============
/**
 * Get target URL for a script path
 * Handles dynamic query strings for GTM/GTag scripts
 *
 * @param {string} path - Request path (e.g., '/cdn/gtm.js')
 * @param {string} search - Query string (e.g., '?id=GTM-XXXX')
 * @returns {string|null} Target URL or null if not found
 */
export function getScriptTarget(path, search = '') {
  const baseUrl = SCRIPT_MAP[path];

  if (!baseUrl) {
    return null;
  }

  // For GTM and GTag scripts, append query string
  if (path.includes('gtm.js') || path.includes('gtag.js')) {
    return `${baseUrl}${search}`;
  }

  return baseUrl;
}
