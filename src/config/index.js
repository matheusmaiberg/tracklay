// ============================================================
// CONFIG - CENTRALIZED CONFIGURATION
// ============================================================
// RESPONSIBILITY:
// - Export CONFIG object with all settings
// - Accept environment variables from Cloudflare Workers
// - Provide smart defaults for zero-configuration deployment
// - Server URLs (GTM_SERVER_URL, ALLOWED_ORIGINS)
// - Rate limiting (RATE_LIMIT_REQUESTS, RATE_LIMIT_WINDOW)
// - Timeouts (FETCH_TIMEOUT)
// - UUID (UUID_SALT_ROTATION, UUID_SECRET)
// - Cache (CACHE_TTL)
// - Security (MAX_REQUEST_SIZE)
// - Paths (CDN_PATHS)
// - Logging (LOG_LEVEL)

/**
 * Auto-detect request origin for CORS
 * Extracts the origin from the request URL automatically
 * Fallback to ALLOWED_ORIGINS if manual configuration is needed
 *
 * @param {Request} request - Incoming request
 * @returns {string} Origin URL (protocol + hostname)
 */
export function getOriginFromRequest(request) {
  try {
    const url = new URL(request.url);
    return `${url.protocol}//${url.hostname}`;
  } catch (error) {
    return null;
  }
}

/**
 * Generate a random UUID secret if not provided
 * Uses crypto.randomUUID() or fallback to timestamp-based
 * @returns {string} Random UUID or timestamp-based secret
 */
function generateDefaultSecret() {
  try {
    // Try crypto.randomUUID() (available in Cloudflare Workers)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (error) {
    // Fallback to timestamp-based secret
  }

  // Fallback: timestamp + random number
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
}

// ============= CONFIG OBJECT =============
// Will be initialized with environment variables via initConfig()
export let CONFIG = {
  // ============= SERVER CONFIGURATION =============
  // GTM Server-Side URL (server container)
  // OPTIONAL: Leave empty if not using GTM Server-Side
  // Can be set via environment variable: GTM_SERVER_URL
  GTM_SERVER_URL: '',

  // Allowed origins for CORS (main store domain)
  // AUTO-DETECTION: The worker automatically detects the request origin
  // MANUAL FALLBACK: Set via environment variable ALLOWED_ORIGINS (comma-separated)
  // Example: "https://yourstore.com,https://www.yourstore.com"
  ALLOWED_ORIGINS: [],

  // ============= RATE LIMITING =============
  // Abuse protection: limits requests per IP
  // Can be set via environment variables
  RATE_LIMIT_REQUESTS: 100, // Maximum allowed requests
  RATE_LIMIT_WINDOW: 60000, // Time window in ms (1 minute = 60000)

  // ============= TIMEOUTS =============
  // Timeout for upstream requests
  // Can be set via environment variable: FETCH_TIMEOUT
  FETCH_TIMEOUT: 10000, // 10 seconds (10000ms)

  // ============= UUID CONFIGURATION =============
  // Secure UUID system with rotating salt
  // Can be set via environment variable: UUID_SALT_ROTATION
  UUID_SALT_ROTATION: 604800000, // Rotation every 7 days (604800000ms)

  // Secret for UUID generation (SHA-256)
  // AUTO-GENERATED: If not provided, a random UUID is generated
  // Can be set via environment variable (secret): UUID_SECRET
  // Recommended: Set via wrangler secret put UUID_SECRET
  UUID_SECRET: generateDefaultSecret(),

  // ============= CACHE CONFIGURATION =============
  // TTL for static scripts cache (gtm.js, gtag.js)
  // Tracking endpoints (/collect, /g/collect) are NEVER cached
  // Can be set via environment variable: CACHE_TTL
  CACHE_TTL: 3600, // 1 hour (3600 seconds)

  // ============= SECURITY =============
  // Request body size limit (protection against large payloads)
  // Can be set via environment variable: MAX_REQUEST_SIZE
  MAX_REQUEST_SIZE: 1048576, // 1MB (1048576 bytes)

  // ============= OBFUSCATION CONFIGURATION =============
  // UUID-based obfuscated endpoints for anti-ad-blocker detection
  // Format: /cdn/{provider}/{uuid}.js
  // These IDs should be unique per deployment for maximum obfuscation
  // Can be set via environment variables: FACEBOOK_ENDPOINT_ID, GOOGLE_ENDPOINT_ID

  // Facebook endpoint ID (f prefix: /cdn/f/{ID}.js)
  // AUTO-GENERATED: Random UUID for obfuscation
  FACEBOOK_ENDPOINT_ID: generateDefaultSecret(),

  // Google endpoint ID (g prefix: /cdn/g/{ID}.js)
  // AUTO-GENERATED: Random UUID for obfuscation
  GOOGLE_ENDPOINT_ID: generateDefaultSecret(),

  // ============= LOGGING =============
  // Log level for debugging and monitoring
  // Options: 'debug', 'info', 'warn', 'error'
  // Can be set via environment variable: LOG_LEVEL
  LOG_LEVEL: 'info'
};

/**
 * Initialize configuration with environment variables
 * Called from worker.js with Cloudflare Workers env object
 *
 * @param {Object} env - Environment variables from Cloudflare Workers
 */
export function initConfig(env = {}) {
  // Update CONFIG with environment variables if provided
  CONFIG.GTM_SERVER_URL = env.GTM_SERVER_URL || CONFIG.GTM_SERVER_URL;

  // Parse ALLOWED_ORIGINS from comma-separated string
  if (env.ALLOWED_ORIGINS) {
    CONFIG.ALLOWED_ORIGINS = env.ALLOWED_ORIGINS.split(',').map(s => s.trim());
  }

  // Rate limiting
  if (env.RATE_LIMIT_REQUESTS) {
    const parsed = parseInt(env.RATE_LIMIT_REQUESTS, 10);
    if (!isNaN(parsed) && parsed > 0) {
      CONFIG.RATE_LIMIT_REQUESTS = parsed;
    }
  }
  if (env.RATE_LIMIT_WINDOW) {
    const parsed = parseInt(env.RATE_LIMIT_WINDOW, 10);
    if (!isNaN(parsed) && parsed > 0) {
      CONFIG.RATE_LIMIT_WINDOW = parsed;
    }
  }

  // Timeouts
  if (env.FETCH_TIMEOUT) {
    const parsed = parseInt(env.FETCH_TIMEOUT, 10);
    if (!isNaN(parsed) && parsed > 0) {
      CONFIG.FETCH_TIMEOUT = parsed;
    }
  }

  // UUID configuration
  if (env.UUID_SALT_ROTATION) {
    const parsed = parseInt(env.UUID_SALT_ROTATION, 10);
    if (!isNaN(parsed) && parsed > 0) {
      CONFIG.UUID_SALT_ROTATION = parsed;
    }
  }
  if (env.UUID_SECRET) {
    CONFIG.UUID_SECRET = env.UUID_SECRET;
  }

  // Cache
  if (env.CACHE_TTL) {
    const parsed = parseInt(env.CACHE_TTL, 10);
    if (!isNaN(parsed) && parsed > 0) {
      CONFIG.CACHE_TTL = parsed;
    }
  }

  // Security
  if (env.MAX_REQUEST_SIZE) {
    const parsed = parseInt(env.MAX_REQUEST_SIZE, 10);
    if (!isNaN(parsed) && parsed > 0) {
      CONFIG.MAX_REQUEST_SIZE = parsed;
    }
  }

  // Obfuscation IDs
  if (env.FACEBOOK_ENDPOINT_ID) {
    CONFIG.FACEBOOK_ENDPOINT_ID = env.FACEBOOK_ENDPOINT_ID;
  }
  if (env.GOOGLE_ENDPOINT_ID) {
    CONFIG.GOOGLE_ENDPOINT_ID = env.GOOGLE_ENDPOINT_ID;
  }

  // Logging
  if (env.LOG_LEVEL) {
    CONFIG.LOG_LEVEL = env.LOG_LEVEL;
  }
}
