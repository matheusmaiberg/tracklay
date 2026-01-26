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
// - Logging (LOG_LEVEL)

import { parsePositiveInt } from '../utils/validation.js';

/**
 * Parses comma-separated string into trimmed array
 * @param {string} csvString - Comma-separated values
 * @returns {string[]} Array of trimmed strings
 */
function parseArrayConfig(csvString) {
  if (!csvString) return [];
  return csvString.split(',').map(s => s.trim()).filter(s => s.length > 0);
}

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

/**
 * Configuration object type definition for Tracklay worker
 *
 * @typedef {Object} Config
 *
 * @property {string} GTM_SERVER_URL
 * GTM Server-Side container URL for proxying GA4/GTM tracking requests
 * - **Optional**: Leave empty for client-side only tracking
 * - **Default**: `''` (empty string)
 * - **Example**: `'https://gtm.yourstore.com'` or `'https://your-container.run.app'`
 * - **Environment**: Set via `GTM_SERVER_URL` in wrangler.toml or .env
 * - **Used by**: [proxy-handler.js](../proxy/proxy-handler.js), [router.js](../routing/router.js)
 *
 * @property {string[]} ALLOWED_ORIGINS
 * CORS allowed origins for cross-origin requests
 * - **Auto-detection**: Worker automatically detects request origin if empty
 * - **Default**: `[]` (auto-detect mode)
 * - **Example**: `['https://yourstore.com', 'https://www.yourstore.com']`
 * - **Format**: Array of full origin URLs (protocol + hostname)
 * - **Environment**: Set via `ALLOWED_ORIGINS` (comma-separated) in wrangler.toml
 * - **Used by**: [cors.js](../middleware/cors.js), [options.js](../handlers/options.js)
 *
 * @property {number} RATE_LIMIT_REQUESTS
 * Maximum number of requests allowed per IP per time window
 * - **Default**: `100`
 * - **Range**: 1-10000 (recommended: 50-200 for production)
 * - **Environment**: Set via `RATE_LIMIT_REQUESTS` in wrangler.toml
 * - **Used by**: [rate-limiter.js](../middleware/rate-limiter.js)
 *
 * @property {number} RATE_LIMIT_WINDOW
 * Rate limit time window in milliseconds
 * - **Default**: `60000` (1 minute)
 * - **Common values**: 60000 (1min), 300000 (5min), 3600000 (1hr)
 * - **Environment**: Set via `RATE_LIMIT_WINDOW` in wrangler.toml
 * - **Used by**: [rate-limiter.js](../middleware/rate-limiter.js)
 *
 * @property {number} FETCH_TIMEOUT
 * Timeout for upstream HTTP requests in milliseconds
 * - **Default**: `10000` (10 seconds)
 * - **Range**: 1000-30000 (1s-30s recommended)
 * - **Environment**: Set via `FETCH_TIMEOUT` in wrangler.toml
 * - **Used by**: [proxy-handler.js](../proxy/proxy-handler.js), [script-cache.js](../cache/script-cache.js)
 *
 * @property {number} UUID_SALT_ROTATION
 * UUID rotation interval in milliseconds (for time-based deterministic UUIDs)
 * - **Default**: `604800000` (7 days)
 * - **Common values**: 86400000 (1 day), 604800000 (7 days), 2592000000 (30 days)
 * - **Impact**: How often endpoint UUIDs rotate (when ENDPOINTS_UUID_ROTATION=false)
 * - **Environment**: Set via `UUID_SALT_ROTATION` in wrangler.toml
 * - **Used by**: [uuid.js](../core/uuid.js), [endpoints-info.js](../handlers/endpoints-info.js)
 *
 * @property {string} UUID_SECRET
 * Secret key for UUID generation using SHA-256 hashing
 * - **Auto-generated**: Random UUID if not provided (via generateDefaultSecret)
 * - **Recommended**: Set manually for production via `wrangler secret put UUID_SECRET`
 * - **Format**: Any string (recommended: 32+ character random hex)
 * - **Example**: `'a3f9c2e1b8d4f5a6c7e8d9f0a1b2c3d4'`
 * - **Environment**: Set via `UUID_SECRET` in .dev.vars (local) or wrangler secret (production)
 * - **Used by**: [uuid.js](../core/uuid.js)
 *
 * @property {number} CACHE_TTL
 * Cache Time-To-Live for proxied static scripts in seconds
 * - **Default**: `3600` (1 hour)
 * - **Range**: 300-86400 (5min-24hr recommended)
 * - **Applies to**: gtm.js, gtag.js, fbevents.js proxied scripts
 * - **Does NOT apply to**: Tracking endpoints (/collect, /g/collect) - never cached
 * - **Environment**: Set via `CACHE_TTL` in wrangler.toml
 * - **Used by**: [cache.js](../core/cache.js), [script-cache.js](../cache/script-cache.js)
 *
 * @property {number} MAX_REQUEST_SIZE
 * Maximum request body size in bytes (protection against large payloads)
 * - **Default**: `1048576` (1MB)
 * - **Range**: 10240-10485760 (10KB-10MB)
 * - **Purpose**: Prevents DoS attacks with oversized request bodies
 * - **Environment**: Set via `MAX_REQUEST_SIZE` in wrangler.toml
 * - **Used by**: [validator.js](../middleware/validator.js) - DEPRECATED (inlined in worker.js)
 *
 * @property {string} FACEBOOK_ENDPOINT_ID
 * Facebook Pixel endpoint UUID for obfuscated routing
 * - **Auto-generated**: Random UUID if not provided
 * - **Format**: UUID or any unique string (recommended: UUID format)
 * - **Example**: `'a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e'`
 * - **Creates routes**: `/cdn/f/{UUID}` (script GET + endpoint POST)
 * - **Environment**: Set via `FACEBOOK_ENDPOINT_ID` in wrangler.toml
 * - **Used by**: [router.js](../routing/router.js), [uuid.js](../core/uuid.js)
 *
 * @property {string} GOOGLE_ENDPOINT_ID
 * Google Analytics/GTM endpoint UUID for obfuscated routing
 * - **Auto-generated**: Random UUID if not provided
 * - **Format**: UUID or any unique string (recommended: UUID format)
 * - **Example**: `'b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f'`
 * - **Creates routes**: `/cdn/g/{UUID}` (script GET + endpoint POST)
 * - **Environment**: Set via `GOOGLE_ENDPOINT_ID` in wrangler.toml
 * - **Used by**: [router.js](../routing/router.js), [uuid.js](../core/uuid.js)
 *
 * @property {string} LOG_LEVEL
 * Logging verbosity level for worker output
 * - **Default**: `'info'`
 * - **Valid values**: `'debug'` | `'info'` | `'warn'` | `'error'`
 * - **Production**: Use `'info'` or `'warn'`
 * - **Development**: Use `'debug'` for detailed output
 * - **Environment**: Set via `LOG_LEVEL` in wrangler.toml
 * - **Used by**: [logger.js](../core/logger.js)
 *
 * @property {boolean} DEBUG_HEADERS
 * Enable debug headers in responses (X-Script-Key, X-Cache-Status, etc.)
 * - **Default**: `false`
 * - **Production**: MUST be `false` (debug headers expose implementation details)
 * - **Development**: Can be `true` for debugging
 * - **Impact**: When enabled, adds X-Script-Key, X-Script-Hash, X-Cache-* headers
 * - **Security**: Debug headers can be used for ad-blocker fingerprinting
 * - **Environment**: Set via `DEBUG_HEADERS` in wrangler.toml
 * - **Used by**: [script-cache.js](../cache/script-cache.js), [response-builder.js](../proxy/response-builder.js)
 *
 * @property {boolean} ENDPOINTS_UUID_ROTATION
 * Control whether endpoint UUIDs rotate automatically
 * - **Default**: `false` (rotation ENABLED - recommended)
 * - **When false**: UUIDs rotate weekly based on UUID_SALT_ROTATION (max security)
 * - **When true**: UUIDs are fixed (FACEBOOK_ENDPOINT_ID, GOOGLE_ENDPOINT_ID never change)
 * - **Rotation enabled (false)**: Requires Shopify theme to fetch UUIDs via /endpoints API
 * - **Rotation disabled (true)**: Can hardcode UUIDs in Shopify theme (simpler but less secure)
 * - **Environment**: Set via `ENDPOINTS_UUID_ROTATION` in wrangler.toml
 * - **Used by**: [uuid.js](../core/uuid.js), [endpoints-info.js](../handlers/endpoints-info.js)
 *
 * @property {string} ENDPOINTS_SECRET
 * Secret token for /endpoints API authentication (query string based)
 * - **Auto-generated**: Random UUID if not provided
 * - **Recommended**: Set manually for production via `wrangler secret put ENDPOINTS_SECRET`
 * - **Format**: Any string (recommended: 32+ character random hex)
 * - **Example**: `'a3f9c2e1b8d4f5a6c7e8d9f0a1b2c3d4e5f6a7b8c9d0'`
 * - **Usage**: GET /endpoints?token=YOUR_SECRET
 * - **Security**: NEVER expose publicly, NEVER commit to git
 * - **Environment**: Set via `ENDPOINTS_SECRET` in .dev.vars (local) or wrangler secret (production)
 * - **Used by**: [endpoints-info.js](../handlers/endpoints-info.js)
 *
 * @property {Object<string, string>} CONTAINER_ALIASES
 * GTM/GA4 container ID aliases for query string obfuscation
 * - **Default**: `{}` (passthrough mode, no obfuscation)
 * - **Format**: JSON object mapping aliases to real container IDs
 * - **Example**: `{ "abc123": "GTM-XXXXX", "def456": "G-YYYYY" }`
 * - **Purpose**: Hide GTM-/G- patterns from ad-blocker detection
 * - **Client request**: `/cdn/g/{UUID}?c=abc123`
 * - **Upstream receives**: `?id=GTM-XXXXX`
 * - **Environment**: Set via `CONTAINER_ALIASES` (JSON string) in wrangler.toml
 * - **Used by**: [query-mapper.js](../proxy/query-mapper.js)
 *
 * @example
 * // Access configuration values
 * import { CONFIG } from './config/index.js';
 *
 * console.log(CONFIG.GTM_SERVER_URL); // 'https://gtm.yourstore.com'
 * console.log(CONFIG.RATE_LIMIT_REQUESTS); // 100
 * console.log(CONFIG.ALLOWED_ORIGINS); // ['https://yourstore.com']
 *
 * @example
 * // Initialize configuration with environment variables (worker.js)
 * import { initConfig } from './config/index.js';
 *
 * export default {
 *   async fetch(request, env, ctx) {
 *     initConfig(env); // Loads environment variables into CONFIG
 *     // ... handle request
 *   }
 * }
 *
 * @see {@link ../../wrangler.toml} - Production configuration file
 * @see {@link ../../.env.example} - Environment variables template
 * @see {@link ../../.dev.vars.example} - Local development secrets template
 */

/**
 * Configuration object for Tracklay worker
 *
 * Initialized with smart defaults and overridden by environment variables via initConfig()
 *
 * **Zero-configuration deployment:**
 * - All settings have sensible defaults
 * - UUIDs are auto-generated if not provided
 * - CORS auto-detects request origin
 *
 * **Production setup:**
 * 1. Set secrets via: `wrangler secret put UUID_SECRET` and `wrangler secret put ENDPOINTS_SECRET`
 * 2. Configure environment variables in wrangler.toml [vars] section
 * 3. Deploy with: `wrangler deploy`
 *
 * @type {Config}
 */
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
  LOG_LEVEL: 'info',

  // ============= DEBUG HEADERS =============
  // Enable debug headers in responses (X-Script-Key, X-Script-Hash, X-Cache-Status, etc.)
  // WARNING: Debug headers expose internal implementation details
  // PRODUCTION: Set to false for maximum anti-detection obfuscation
  // DEVELOPMENT: Set to true for debugging and monitoring
  // Can be set via environment variable: DEBUG_HEADERS (true/false)
  DEBUG_HEADERS: false,

  // ============= CONTAINER ALIASES (ULTRA-AGGRESSIVE OBFUSCATION) =============
  // Map obfuscated container IDs to real GTM/GA4 container IDs
  // Enables query string obfuscation: ?c=abc123 → ?id=GTM-XXXXX
  //
  // Format: { "alias": "real_id" }
  // Example: { "abc123": "GTM-XXXXX", "def456": "G-YYYYY" }
  //
  // Usage:
  // - Client requests: /g/{UUID}?c=abc123
  // - Worker maps: abc123 → GTM-XXXXX
  // - Upstream receives: ?id=GTM-XXXXX
  //
  // Can be set via environment variable: CONTAINER_ALIASES (JSON string)
  // Default: empty object (passthrough mode, no query obfuscation)
  CONTAINER_ALIASES: {},

  // ============= ENDPOINT UUID ROTATION =============
  // Control whether endpoint UUIDs rotate automatically based on time
  //
  // HOW IT WORKS:
  // - Rotation uses deterministic time-based UUID generation
  // - UUIDs change weekly based on UUID_SALT_ROTATION interval (default: 7 days)
  // - All workers generate the same UUID at the same time (stateless, deterministic)
  // - No KV/Durable Objects needed (everything is time-based)
  //
  // ROTATION ENABLED (false - default):
  //   - Uses generateEndpointUUID() with time-based rotation
  //   - UUIDs rotate automatically every UUID_SALT_ROTATION interval
  //   - Maximum security (UUIDs expire automatically)
  //   - Requires Shopify theme to fetch UUIDs dynamically via /endpoints
  //   - Week-based rotation: Math.floor(Date.now() / UUID_SALT_ROTATION)
  //
  // ROTATION DISABLED (true):
  //   - Uses fixed FACEBOOK_ENDPOINT_ID and GOOGLE_ENDPOINT_ID from env
  //   - UUIDs never change (valid forever)
  //   - Simpler setup (hardcode in theme)
  //   - Lower security (if discovered, UUIDs remain valid)
  //
  // Can be set via environment variable: ENDPOINTS_UUID_ROTATION
  // Default: false (rotation enabled for maximum security)
  ENDPOINTS_UUID_ROTATION: false,

  // ============= AUTHENTICATED ENDPOINT SECRET =============
  // Secret token for /endpoints authentication (query string based)
  // Used by Shopify theme/n8n to fetch current rotating UUIDs dynamically
  //
  // CRITICAL SECURITY:
  // - NEVER expose UUIDs publicly (e.g., in /health endpoint)
  // - Ad-blockers can scrape public endpoints and blacklist UUIDs
  // - This endpoint requires authentication via query string: ?token=SECRET
  //
  // AUTHENTICATION METHOD:
  // - Query string based: GET /endpoints?token=your-secret
  // - NOT using Authorization header (easier for n8n/GitHub Actions)
  // - Constant-time comparison to prevent timing attacks
  //
  // Set via Cloudflare Workers secret (RECOMMENDED):
  //   wrangler secret put ENDPOINTS_SECRET
  //
  // Generate secure token:
  //   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  //
  // Default: auto-generated (generateDefaultSecret)
  // If not set, endpoint returns 503 Service Unavailable
  ENDPOINTS_SECRET: generateDefaultSecret()
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
    CONFIG.ALLOWED_ORIGINS = parseArrayConfig(env.ALLOWED_ORIGINS);
  }

  // Parse integer configs
  const intConfigs = {
    RATE_LIMIT_REQUESTS: 'RATE_LIMIT_REQUESTS',
    RATE_LIMIT_WINDOW: 'RATE_LIMIT_WINDOW',
    FETCH_TIMEOUT: 'FETCH_TIMEOUT',
    UUID_SALT_ROTATION: 'UUID_SALT_ROTATION',
    CACHE_TTL: 'CACHE_TTL',
    MAX_REQUEST_SIZE: 'MAX_REQUEST_SIZE'
  };

  for (const [configKey, envKey] of Object.entries(intConfigs)) {
    if (env[envKey]) {
      const parsed = parsePositiveInt(env[envKey]);
      if (parsed !== null) {
        CONFIG[configKey] = parsed;
      }
    }
  }

  // UUID secret (not parsed as int)
  if (env.UUID_SECRET) {
    CONFIG.UUID_SECRET = env.UUID_SECRET;
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

  // Debug headers (parse boolean)
  if (env.DEBUG_HEADERS !== undefined) {
    CONFIG.DEBUG_HEADERS = env.DEBUG_HEADERS === 'true' || env.DEBUG_HEADERS === true;
  }

  // Container aliases (parse JSON string)
  if (env.CONTAINER_ALIASES) {
    try {
      CONFIG.CONTAINER_ALIASES = JSON.parse(env.CONTAINER_ALIASES);
    } catch (error) {
      // Note: Logger may not be initialized yet, so we skip logging here
      // Invalid JSON will result in empty object (safe fallback)
      CONFIG.CONTAINER_ALIASES = {};
    }
  }

  // Endpoint UUID rotation (parse as boolean)
  if (env.ENDPOINTS_UUID_ROTATION !== undefined) {
    CONFIG.ENDPOINTS_UUID_ROTATION = env.ENDPOINTS_UUID_ROTATION === 'true' || env.ENDPOINTS_UUID_ROTATION === true;
  }

  // Authenticated endpoint secret (from Cloudflare Workers secret or env var)
  if (env.ENDPOINTS_SECRET) {
    CONFIG.ENDPOINTS_SECRET = env.ENDPOINTS_SECRET;
  }
}
