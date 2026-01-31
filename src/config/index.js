/**
 * @fileoverview Config - Centralized configuration for Tracklay worker
 * @module config/index
 */

import { parsePositiveInt } from '../utils/validation.js';
import { parseArrayConfig } from '../utils/parsing.js';
import { generateDefaultSecret } from '../utils/crypto.js';

export let CONFIG = {
  GTM_SERVER_URL: '',
  ALLOWED_ORIGINS: [],
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW: 60000,
  FETCH_TIMEOUT: 10000,
  UUID_ROTATION_INTERVAL_MS: 604800000,
  OBFUSCATION_SECRET: generateDefaultSecret(),
  CACHE_TTL: 3600,
  MAX_REQUEST_SIZE: 1048576,
  SCRIPT_SIZE_LIMIT: 10485760,  // 10MB default for ReDoS protection
  OBFUSCATION_FB_UUID: generateDefaultSecret(),
  OBFUSCATION_GA_UUID: generateDefaultSecret(),
  LOG_LEVEL: 'info',
  DEBUG_HEADERS_ENABLED: false,
  GTM_CONTAINER_ALIASES: {},
  UUID_ROTATION_ENABLED: false,
  ENDPOINTS_API_TOKEN: generateDefaultSecret(),
  FULL_SCRIPT_PROXY_ENABLED: true,
  WORKER_BASE_URL: ''  // e.g., https://cdn.yourstore.com - required for FULL_SCRIPT_PROXY
};

/**
 * @param {Object} env - Environment variables from Cloudflare Workers
 */
export const initConfig = (env = {}) => {
  CONFIG.GTM_SERVER_URL = env.GTM_SERVER_URL ?? CONFIG.GTM_SERVER_URL;

  if (env.ALLOWED_ORIGINS) {
    CONFIG.ALLOWED_ORIGINS = parseArrayConfig(env.ALLOWED_ORIGINS);
  }

  const intConfigs = [
    'RATE_LIMIT_REQUESTS',
    'RATE_LIMIT_WINDOW',
    'FETCH_TIMEOUT',
    'UUID_ROTATION_INTERVAL_MS',
    'CACHE_TTL',
    'MAX_REQUEST_SIZE',
    'SCRIPT_SIZE_LIMIT'
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

  CONFIG.OBFUSCATION_SECRET = env.OBFUSCATION_SECRET ?? CONFIG.OBFUSCATION_SECRET;
  if (!env.OBFUSCATION_SECRET) {
    console.log('[CONFIG] OBFUSCATION_SECRET auto-generated (not set in env)');
    console.log('[CONFIG] ℹ️ INFO: This is used for UUID generation (deterministic hashing)');
  }

  CONFIG.OBFUSCATION_FB_UUID = env.OBFUSCATION_FB_UUID ?? CONFIG.OBFUSCATION_FB_UUID;
  CONFIG.OBFUSCATION_GA_UUID = env.OBFUSCATION_GA_UUID ?? CONFIG.OBFUSCATION_GA_UUID;

  CONFIG.LOG_LEVEL = env.LOG_LEVEL ?? CONFIG.LOG_LEVEL;

  if (env.DEBUG_HEADERS_ENABLED !== undefined) {
    CONFIG.DEBUG_HEADERS_ENABLED = env.DEBUG_HEADERS_ENABLED === 'true' || env.DEBUG_HEADERS_ENABLED === true;
  }

  if (env.GTM_CONTAINER_ALIASES) {
    try {
      CONFIG.GTM_CONTAINER_ALIASES = JSON.parse(env.GTM_CONTAINER_ALIASES);
    } catch {
      CONFIG.GTM_CONTAINER_ALIASES = {};
    }
  }

  if (env.UUID_ROTATION_ENABLED !== undefined) {
    CONFIG.UUID_ROTATION_ENABLED = env.UUID_ROTATION_ENABLED === 'true' || env.UUID_ROTATION_ENABLED === true;
  }

  CONFIG.ENDPOINTS_API_TOKEN = env.ENDPOINTS_API_TOKEN ?? CONFIG.ENDPOINTS_API_TOKEN;
  if (!env.ENDPOINTS_API_TOKEN) {
    console.log('[CONFIG] ENDPOINTS_API_TOKEN auto-generated (not set in env)');
    console.log('[CONFIG] Auto-generated token:', CONFIG.ENDPOINTS_API_TOKEN.slice(0, 4) + '...');
    console.log('[CONFIG] ⚠️ WARNING: Use this token for /endpoints API access');
    console.log('[CONFIG] ⚠️ PRODUCTION: Set via "wrangler secret put ENDPOINTS_API_TOKEN"');
  }

  if (env.FULL_SCRIPT_PROXY_ENABLED !== undefined) {
    CONFIG.FULL_SCRIPT_PROXY_ENABLED = env.FULL_SCRIPT_PROXY_ENABLED === 'true' || env.FULL_SCRIPT_PROXY_ENABLED === true;
  }

  // WORKER_BASE_URL - required for Full Script Proxy to work correctly
  // e.g., https://cdn.yourstore.com (no trailing slash)
  if (env.WORKER_BASE_URL) {
    CONFIG.WORKER_BASE_URL = env.WORKER_BASE_URL.replace(/\/$/, ''); // Remove trailing slash
  }

  // Validate WORKER_BASE_URL if FULL_SCRIPT_PROXY is enabled
  if (CONFIG.FULL_SCRIPT_PROXY_ENABLED && !CONFIG.WORKER_BASE_URL) {
    console.warn('[CONFIG] ⚠️ WARNING: FULL_SCRIPT_PROXY_ENABLED is true but WORKER_BASE_URL is not set');
    console.warn('[CONFIG] Cron jobs for script cache updates will not work correctly');
    console.warn('[CONFIG] Set WORKER_BASE_URL in wrangler.toml [vars] section');
  }

  const {
    GTM_SERVER_URL,
    UUID_ROTATION_ENABLED,
    OBFUSCATION_FB_UUID,
    OBFUSCATION_GA_UUID,
    DEBUG_HEADERS_ENABLED,
    FULL_SCRIPT_PROXY_ENABLED,
    RATE_LIMIT_REQUESTS,
    RATE_LIMIT_WINDOW,
    CACHE_TTL,
    LOG_LEVEL,
    SCRIPT_SIZE_LIMIT,
    WORKER_BASE_URL
  } = CONFIG;

  console.log('[CONFIG] ============================================================');
  console.log('[CONFIG] Tracklay Worker Configuration Summary');
  console.log('[CONFIG] ============================================================');
  console.log('[CONFIG] GTM_SERVER_URL:', GTM_SERVER_URL || '(not set - client-side only)');
  console.log('[CONFIG] WORKER_BASE_URL:', WORKER_BASE_URL || '(not set - cron jobs may fail)');
  console.log('[CONFIG] UUID_ROTATION_ENABLED:', UUID_ROTATION_ENABLED ? 'enabled (weekly rotation)' : 'disabled (fixed UUIDs)');
  console.log('[CONFIG] OBFUSCATION_FB_UUID:', OBFUSCATION_FB_UUID);
  console.log('[CONFIG] OBFUSCATION_GA_UUID:', OBFUSCATION_GA_UUID);
  console.log('[CONFIG] DEBUG_HEADERS_ENABLED:', DEBUG_HEADERS_ENABLED);
  console.log('[CONFIG] FULL_SCRIPT_PROXY_ENABLED:', FULL_SCRIPT_PROXY_ENABLED ? 'enabled (full proxy)' : 'disabled (transport_url only)');
  console.log('[CONFIG] RATE_LIMIT:', RATE_LIMIT_REQUESTS, 'requests per', RATE_LIMIT_WINDOW / 1000, 'seconds');
  console.log('[CONFIG] CACHE_TTL:', CACHE_TTL, 'seconds');
  console.log('[CONFIG] SCRIPT_SIZE_LIMIT:', SCRIPT_SIZE_LIMIT / 1048576, 'MB');
  console.log('[CONFIG] LOG_LEVEL:', LOG_LEVEL);
  console.log('[CONFIG] ============================================================');
};
