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
const parseArrayConfig = (csvString) => {
  if (!csvString) return [];
  return csvString.split(',').map(s => s.trim()).filter(s => s.length > 0);
};

/**
 * Auto-detect request origin for CORS
 * Extracts the origin from the request URL automatically
 * Fallback to ALLOWED_ORIGINS if manual configuration is needed
 *
 * @param {Request} request - Incoming request
 * @returns {string} Origin URL (protocol + hostname)
 */
export const getOriginFromRequest = (request) => {
  try {
    const { protocol, hostname } = new URL(request.url);
    return `${protocol}//${hostname}`;
  } catch {
    return null;
  }
};

/**
 * Generate a random UUID secret if not provided
 * Uses crypto.randomUUID() or fallback to timestamp-based
 * @returns {string} Random UUID or timestamp-based secret
 */
const generateDefaultSecret = () => {
  try {
    // Try crypto.randomUUID() (available in Cloudflare Workers)
    if (crypto?.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // Fallback to timestamp-based secret
  }

  // Fallback: timestamp + random number
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 15);
  return `${timestamp}-${random}`;
};

/**
 * Configuration object type definition for Tracklay worker
 *
 * @typedef {Object} Config
 *
 * @property {string} GTM_SERVER_URL - GTM Server-Side container URL for proxying GA4/GTM tracking requests. Optional (leave empty for client-side only). Default: '' (empty). Example: 'https://gtm.yourstore.com'. Set via GTM_SERVER_URL in wrangler.toml. Used by: proxy-handler.js, router.js
 *
 * @property {string[]} ALLOWED_ORIGINS - CORS allowed origins for cross-origin requests. Auto-detects if empty. Default: [] (auto-detect). Example: ['https://yourstore.com', 'https://www.yourstore.com']. Set via ALLOWED_ORIGINS (comma-separated) in wrangler.toml. Used by: cors.js, options.js
 *
 * @property {number} RATE_LIMIT_REQUESTS - Maximum requests per IP per window. Default: 100. Range: 1-10000 (recommended 50-200). Set via RATE_LIMIT_REQUESTS in wrangler.toml. Used by: rate-limiter.js
 *
 * @property {number} RATE_LIMIT_WINDOW - Rate limit time window in milliseconds. Default: 60000 (1 min). Common values: 60000 (1min), 300000 (5min), 3600000 (1hr). Set via RATE_LIMIT_WINDOW in wrangler.toml. Used by: rate-limiter.js
 *
 * @property {number} FETCH_TIMEOUT - Timeout for upstream HTTP requests in milliseconds. Default: 10000 (10s). Range: 1000-30000. Set via FETCH_TIMEOUT in wrangler.toml. Used by: proxy-handler.js, script-cache.js
 *
 * @property {number} UUID_SALT_ROTATION - UUID rotation interval in milliseconds for time-based deterministic UUIDs. Default: 604800000 (7 days). Common: 86400000 (1d), 604800000 (7d), 2592000000 (30d). Controls how often endpoint UUIDs rotate when ENDPOINTS_UUID_ROTATION=true. Set via UUID_SALT_ROTATION in wrangler.toml. Used by: uuid.js, endpoints-info.js
 *
 * @property {string} UUID_SECRET - Secret key for UUID generation using SHA-256. Auto-generated if not provided. Recommended: Set via 'wrangler secret put UUID_SECRET'. Format: 32+ char random hex. Example: 'a3f9c2e1b8d4f5a6c7e8d9f0a1b2c3d4'. Set via .dev.vars (local) or wrangler secret (production). Used by: uuid.js
 *
 * @property {number} CACHE_TTL - Cache Time-To-Live for proxied static scripts in seconds. Default: 3600 (1hr). Range: 300-86400 (5min-24hr). Applies to: gtm.js, gtag.js, fbevents.js. Does NOT apply to tracking endpoints (/collect) which are NEVER cached. Set via CACHE_TTL in wrangler.toml. Used by: cache.js, script-cache.js
 *
 * @property {number} MAX_REQUEST_SIZE - Maximum request body size in bytes (DoS protection). Default: 1048576 (1MB). Range: 10240-10485760 (10KB-10MB). Set via MAX_REQUEST_SIZE in wrangler.toml. Used by: validator.js (deprecated, inlined in worker.js)
 *
 * @property {string} ENDPOINTS_FACEBOOK - Facebook Pixel endpoint UUID for obfuscated routing. Auto-generated if not provided. Format: UUID recommended. Example: 'a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e'. Creates route: /cdn/f/{UUID} (script GET + endpoint POST). Set via ENDPOINTS_FACEBOOK in wrangler.toml. Used by: router.js, uuid.js
 *
 * @property {string} ENDPOINTS_GOOGLE - Google Analytics/GTM endpoint UUID for obfuscated routing. Auto-generated if not provided. Format: UUID recommended. Example: 'b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f'. Creates route: /cdn/g/{UUID} (script GET + endpoint POST). Set via ENDPOINTS_GOOGLE in wrangler.toml. Used by: router.js, uuid.js
 *
 * @property {string} LOG_LEVEL - Logging verbosity level. Default: 'info'. Valid: 'debug' | 'info' | 'warn' | 'error'. Production: use 'info' or 'warn'. Development: use 'debug' for detail. Set via LOG_LEVEL in wrangler.toml. Used by: logger.js
 *
 * @property {boolean} DEBUG_HEADERS - Enable debug headers in responses (X-Script-Key, X-Cache-Status, etc). Default: false. Production: MUST be false (exposes implementation). Development: can be true. Security warning: debug headers enable ad-blocker fingerprinting. Set via DEBUG_HEADERS in wrangler.toml. Used by: script-cache.js, response-builder.js
 *
 * @property {boolean} ENDPOINTS_UUID_ROTATION - Control automatic UUID rotation. Default: false (fixed UUIDs - RECOMMENDED). When false: UUIDs fixed from ENDPOINTS_FACEBOOK/ENDPOINTS_GOOGLE (simpler, no /endpoints API needed). When true: UUIDs rotate weekly via UUID_SALT_ROTATION (advanced, max security, requires /endpoints API). Set via ENDPOINTS_UUID_ROTATION in wrangler.toml. Used by: uuid.js, endpoints-info.js
 *
 * @property {string} ENDPOINTS_SECRET - Secret token for /endpoints API authentication (query string). Auto-generated if not provided. Recommended: Set via 'wrangler secret put ENDPOINTS_SECRET'. Format: 32+ char random hex. Example: 'a3f9c2e1b8d4f5a6c7e8d9f0a1b2c3d4e5f6a7b8c9d0'. Usage: GET /endpoints?token=SECRET. Security: NEVER expose publicly, NEVER commit to git. Set via .dev.vars (local) or wrangler secret (production). Used by: endpoints-info.js
 *
 * @property {boolean} AUTO_INJECT_TRANSPORT_URL - Automatically inject transport_url into Google scripts (gtag.js/gtm.js) for 100% first-party tracking. Default: true (enabled). When enabled: Worker modifies scripts to force tracking via Worker endpoint → GTM Server → GA4. When disabled: Client sends tracking directly to Google (third-party, bloqueável). Requires: GTM_SERVER_URL configured. Benefits: Zero Shopify config, automatic UUID rotation, 95%+ ad-blocker bypass, ITP bypass. Security: Safe (only modifies Google CDN scripts). Performance: +300 bytes per script, no runtime impact. Set via AUTO_INJECT_TRANSPORT_URL in wrangler.toml. Used by: handlers/scripts.js, proxy/script-injector.js
 * @property {boolean} FULL_SCRIPT_PROXY - Enable full script proxy mode. Default: true (enabled). When enabled: Worker extracts ALL URLs from scripts (Google, Facebook, Clarity, etc), creates unique UUIDs for each URL, and substitutes them in the script. This enables 100% first-party proxy for all tracking calls made by the script. Routes: /x/{uuid} for dynamic endpoints. Benefits: Complete ad-blocker bypass, all third-party requests become first-party. Performance: +1-5ms processing per script, cacheable results. Set via FULL_SCRIPT_PROXY in wrangler.toml. Used by: handlers/scripts.js, cache/dynamic-endpoints.js
 *
 * @property {Object<string, string>} CONTAINER_ALIASES - GTM/GA4 container ID aliases for query obfuscation. Default: {} (passthrough, no obfuscation). Format: JSON object {"alias": "real_id"}. Example: {"abc123": "GTM-XXXXX", "def456": "G-YYYYY"}. Purpose: Hide GTM-/G- patterns from ad-blockers. Client: /cdn/g/{UUID}?c=abc123 → Upstream: ?id=GTM-XXXXX. Set via CONTAINER_ALIASES (JSON string) in wrangler.toml. Used by: query-mapper.js
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
  // Can be set via environment variables: ENDPOINTS_FACEBOOK, ENDPOINTS_GOOGLE

  // Facebook endpoint ID (f prefix: /cdn/f/{ID}.js)
  // AUTO-GENERATED: Random UUID for obfuscation
  ENDPOINTS_FACEBOOK: generateDefaultSecret(),

  // Google endpoint ID (g prefix: /cdn/g/{ID}.js)
  // AUTO-GENERATED: Random UUID for obfuscation
  ENDPOINTS_GOOGLE: generateDefaultSecret(),

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
  // ROTATION DISABLED (false - default, RECOMMENDED):
  //   - Uses fixed ENDPOINTS_FACEBOOK and ENDPOINTS_GOOGLE from env
  //   - UUIDs never change (valid forever)
  //   - Simpler setup (hardcode in theme)
  //   - No /endpoints API needed
  //   - Recommended for most users
  //
  // ROTATION ENABLED (true - advanced):
  //   - Uses generateEndpointUUID() with time-based rotation
  //   - UUIDs rotate automatically every UUID_SALT_ROTATION interval
  //   - Maximum security (UUIDs expire automatically)
  //   - Requires Shopify theme to fetch UUIDs dynamically via /endpoints
  //   - Week-based rotation: Math.floor(Date.now() / UUID_SALT_ROTATION)
  //
  // Can be set via environment variable: ENDPOINTS_UUID_ROTATION
  // Default: false (fixed UUIDs - simpler, recommended for most users)
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
  ENDPOINTS_SECRET: generateDefaultSecret(),

  // ============= AUTOMATIC TRANSPORT_URL INJECTION =============
  // Automatically inject transport_url into Google Analytics/GTM scripts
  // When enabled, Worker modifies gtag.js/gtm.js to force first-party tracking
  //
  // HOW IT WORKS:
  // 1. Worker intercepts Google script responses
  // 2. Worker injects JavaScript that wraps gtag() function
  // 3. Wrapper automatically adds transport_url to gtag('config') calls
  // 4. Client sends tracking to Worker endpoint (first-party!)
  // 5. Worker forwards to GTM_SERVER_URL → GA4
  //
  // BENEFITS:
  // - Zero configuration in Shopify theme (plug-and-play)
  // - Automatic UUID rotation (Worker injects current UUID)
  // - 95%+ ad-blocker bypass (scripts + tracking first-party)
  // - ITP/ETP complete bypass (cookies first-party)
  //
  // REQUIREMENTS:
  // - GTM_SERVER_URL must be configured
  // - If empty, injection is skipped (client-side only)
  //
  // SECURITY:
  // - Injection is safe (only modifies scripts from Google CDN)
  // - Does NOT modify tracking data (only routing)
  // - Compatible with Google's TOS (first-party proxy)
  //
  // PERFORMANCE:
  // - Adds ~300 bytes to script size
  // - No runtime performance impact
  // - Scripts remain cacheable
  //
  // Can be set via environment variable: AUTO_INJECT_TRANSPORT_URL
  // Default: true (automatic if GTM_SERVER_URL is set)
  AUTO_INJECT_TRANSPORT_URL: true,

  // ============= FULL SCRIPT PROXY =============
  // Enable full script proxy mode for complete ad-blocker bypass
  // When enabled, Worker extracts ALL URLs from scripts and creates dynamic endpoints
  //
  // HOW IT WORKS:
  // 1. Worker downloads the script (gtm.js, gtag.js, fbevents.js)
  // 2. Extracts all URLs from the script content using regex
  // 3. Filters URLs related to tracking (Google, Facebook, etc)
  // 4. Creates unique UUID for each URL: /x/{uuid} → original URL
  // 5. Substitutes all URLs in the script with the proxied versions
  // 6. Client receives modified script with all URLs pointing to Worker
  //
  // EXAMPLE:
  // Original script contains: "https://www.google-analytics.com/collect"
  // Modified script contains: "https://worker.com/x/a3f9c2e1b8d4e5f6"
  // When client calls /x/a3f9c2e1b8d4e5f6 → Worker proxies to Google Analytics
  //
  // BENEFITS:
  // - 100% first-party requests (all tracking calls)
  // - Complete ad-blocker bypass (no third-party domains)
  // - Works with any tracking script (Google, Facebook, Clarity, Segment, etc)
  // - Dynamic UUIDs rotate weekly for maximum security
  //
  // PERFORMANCE:
  // - +1-5ms processing time per script (one-time, on cache miss)
  // - Scripts remain cacheable (processed once per 12h update cycle)
  // - Minimal memory overhead (UUIDs stored in Cloudflare Cache API)
  //
  // Can be set via environment variable: FULL_SCRIPT_PROXY
  // Default: true (enabled)
  FULL_SCRIPT_PROXY: true
};

/**
 * Initialize configuration with environment variables
 * Called from worker.js with Cloudflare Workers env object
 *
 * @param {Object} env - Environment variables from Cloudflare Workers
 */
export const initConfig = (env = {}) => {
  // Update CONFIG with environment variables if provided
  CONFIG.GTM_SERVER_URL = env.GTM_SERVER_URL ?? CONFIG.GTM_SERVER_URL;

  // Parse ALLOWED_ORIGINS from comma-separated string
  if (env.ALLOWED_ORIGINS) {
    CONFIG.ALLOWED_ORIGINS = parseArrayConfig(env.ALLOWED_ORIGINS);
  }

  // Parse integer configs
  const intConfigs = [
    'RATE_LIMIT_REQUESTS',
    'RATE_LIMIT_WINDOW',
    'FETCH_TIMEOUT',
    'UUID_SALT_ROTATION',
    'CACHE_TTL',
    'MAX_REQUEST_SIZE'
  ];

  for (const key of intConfigs) {
    const envValue = env[key];
    if (envValue) {
      const parsed = parsePositiveInt(envValue);
      if (parsed !== null) {
        CONFIG[key] = parsed;
      }
    }
  }

  // UUID secret (not parsed as int)
  CONFIG.UUID_SECRET = env.UUID_SECRET ?? CONFIG.UUID_SECRET;
  if (!env.UUID_SECRET) {
    // Log auto-generated UUID secret for development
    console.log('[CONFIG] UUID_SECRET auto-generated (not set in env)');
    console.log('[CONFIG] ℹ️ INFO: This is used for UUID generation (deterministic hashing)');
  }

  // Obfuscation IDs
  CONFIG.ENDPOINTS_FACEBOOK = env.ENDPOINTS_FACEBOOK ?? CONFIG.ENDPOINTS_FACEBOOK;
  CONFIG.ENDPOINTS_GOOGLE = env.ENDPOINTS_GOOGLE ?? CONFIG.ENDPOINTS_GOOGLE;

  // Logging
  CONFIG.LOG_LEVEL = env.LOG_LEVEL ?? CONFIG.LOG_LEVEL;

  // Debug headers (parse boolean)
  if (env.DEBUG_HEADERS !== undefined) {
    CONFIG.DEBUG_HEADERS = env.DEBUG_HEADERS === 'true' || env.DEBUG_HEADERS === true;
  }

  // Container aliases (parse JSON string)
  if (env.CONTAINER_ALIASES) {
    try {
      CONFIG.CONTAINER_ALIASES = JSON.parse(env.CONTAINER_ALIASES);
    } catch {
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
  CONFIG.ENDPOINTS_SECRET = env.ENDPOINTS_SECRET ?? CONFIG.ENDPOINTS_SECRET;
  if (!env.ENDPOINTS_SECRET) {
    // Log auto-generated secret for development/debugging
    // In production, ALWAYS set via: wrangler secret put ENDPOINTS_SECRET
    console.log('[CONFIG] ENDPOINTS_SECRET auto-generated (not set in env)');
    console.log('[CONFIG] Auto-generated token:', CONFIG.ENDPOINTS_SECRET);
    console.log('[CONFIG] ⚠️ WARNING: Use this token for /endpoints API access');
    console.log('[CONFIG] ⚠️ PRODUCTION: Set via "wrangler secret put ENDPOINTS_SECRET"');
  }

  // Auto-inject transport_url (parse as boolean)
  if (env.AUTO_INJECT_TRANSPORT_URL !== undefined) {
    CONFIG.AUTO_INJECT_TRANSPORT_URL = env.AUTO_INJECT_TRANSPORT_URL === 'true' || env.AUTO_INJECT_TRANSPORT_URL === true;
  }

  // Full script proxy (parse as boolean)
  if (env.FULL_SCRIPT_PROXY !== undefined) {
    CONFIG.FULL_SCRIPT_PROXY = env.FULL_SCRIPT_PROXY === 'true' || env.FULL_SCRIPT_PROXY === true;
  }

  // Destructure frequently used values for cleaner logging
  const {
    GTM_SERVER_URL,
    AUTO_INJECT_TRANSPORT_URL,
    ENDPOINTS_UUID_ROTATION,
    ENDPOINTS_FACEBOOK,
    ENDPOINTS_GOOGLE,
    DEBUG_HEADERS,
    FULL_SCRIPT_PROXY,
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_WINDOW,
    CACHE_TTL,
    LOG_LEVEL
  } = CONFIG;

  // Log configuration summary (useful for debugging in Cloudflare logs)
  console.log('[CONFIG] ============================================================');
  console.log('[CONFIG] Tracklay Worker Configuration Summary');
  console.log('[CONFIG] ============================================================');
  console.log('[CONFIG] GTM_SERVER_URL:', GTM_SERVER_URL || '(not set - client-side only)');
  console.log('[CONFIG] AUTO_INJECT_TRANSPORT_URL:', AUTO_INJECT_TRANSPORT_URL);
  console.log('[CONFIG] ENDPOINTS_UUID_ROTATION:', ENDPOINTS_UUID_ROTATION ? 'enabled (weekly rotation)' : 'disabled (fixed UUIDs)');
  console.log('[CONFIG] ENDPOINTS_FACEBOOK:', ENDPOINTS_FACEBOOK);
  console.log('[CONFIG] ENDPOINTS_GOOGLE:', ENDPOINTS_GOOGLE);
  console.log('[CONFIG] DEBUG_HEADERS:', DEBUG_HEADERS);
  console.log('[CONFIG] FULL_SCRIPT_PROXY:', FULL_SCRIPT_PROXY ? 'enabled (full proxy)' : 'disabled (transport_url only)');
  console.log('[CONFIG] RATE_LIMIT:', RATE_LIMIT_REQUESTS, 'requests per', RATE_LIMIT_WINDOW / 1000, 'seconds');
  console.log('[CONFIG] CACHE_TTL:', CACHE_TTL, 'seconds');
  console.log('[CONFIG] LOG_LEVEL:', LOG_LEVEL);
  console.log('[CONFIG] ============================================================');
};
