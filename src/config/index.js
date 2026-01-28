/**
 * @fileoverview Config - Centralized configuration for Tracklay worker
 * @module config/index
 */

import { parsePositiveInt } from '../utils/validation.js';

/**
 * @param {string} csvString - Comma-separated values
 * @returns {string[]} Array of trimmed strings
 */
const parseArrayConfig = (csvString) => {
  if (!csvString) return [];
  return csvString.split(',').map(s => s.trim()).filter(s => s.length > 0);
};

/**
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
 * @returns {string} Random UUID or timestamp-based secret
 */
const generateDefaultSecret = () => {
  try {
    if (crypto?.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    // Fallback to timestamp-based secret
  }

  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 15);
  return `${timestamp}-${random}`;
};

export let CONFIG = {
  GTM_SERVER_URL: '',
  ALLOWED_ORIGINS: [],
  RATE_LIMIT_REQUESTS: 100,
  RATE_LIMIT_WINDOW: 60000,
  FETCH_TIMEOUT: 10000,
  UUID_SALT_ROTATION: 604800000,
  UUID_SECRET: generateDefaultSecret(),
  CACHE_TTL: 3600,
  MAX_REQUEST_SIZE: 1048576,
  ENDPOINTS_FACEBOOK: generateDefaultSecret(),
  ENDPOINTS_GOOGLE: generateDefaultSecret(),
  LOG_LEVEL: 'info',
  DEBUG_HEADERS: false,
  CONTAINER_ALIASES: {},
  ENDPOINTS_UUID_ROTATION: false,
  ENDPOINTS_SECRET: generateDefaultSecret(),
  FULL_SCRIPT_PROXY: true
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

  CONFIG.UUID_SECRET = env.UUID_SECRET ?? CONFIG.UUID_SECRET;
  if (!env.UUID_SECRET) {
    console.log('[CONFIG] UUID_SECRET auto-generated (not set in env)');
    console.log('[CONFIG] ℹ️ INFO: This is used for UUID generation (deterministic hashing)');
  }

  CONFIG.ENDPOINTS_FACEBOOK = env.ENDPOINTS_FACEBOOK ?? CONFIG.ENDPOINTS_FACEBOOK;
  CONFIG.ENDPOINTS_GOOGLE = env.ENDPOINTS_GOOGLE ?? CONFIG.ENDPOINTS_GOOGLE;

  CONFIG.LOG_LEVEL = env.LOG_LEVEL ?? CONFIG.LOG_LEVEL;

  if (env.DEBUG_HEADERS !== undefined) {
    CONFIG.DEBUG_HEADERS = env.DEBUG_HEADERS === 'true' || env.DEBUG_HEADERS === true;
  }

  if (env.CONTAINER_ALIASES) {
    try {
      CONFIG.CONTAINER_ALIASES = JSON.parse(env.CONTAINER_ALIASES);
    } catch {
      CONFIG.CONTAINER_ALIASES = {};
    }
  }

  if (env.ENDPOINTS_UUID_ROTATION !== undefined) {
    CONFIG.ENDPOINTS_UUID_ROTATION = env.ENDPOINTS_UUID_ROTATION === 'true' || env.ENDPOINTS_UUID_ROTATION === true;
  }

  CONFIG.ENDPOINTS_SECRET = env.ENDPOINTS_SECRET ?? CONFIG.ENDPOINTS_SECRET;
  if (!env.ENDPOINTS_SECRET) {
    console.log('[CONFIG] ENDPOINTS_SECRET auto-generated (not set in env)');
    console.log('[CONFIG] Auto-generated token:', CONFIG.ENDPOINTS_SECRET);
    console.log('[CONFIG] ⚠️ WARNING: Use this token for /endpoints API access');
    console.log('[CONFIG] ⚠️ PRODUCTION: Set via "wrangler secret put ENDPOINTS_SECRET"');
  }

  if (env.FULL_SCRIPT_PROXY !== undefined) {
    CONFIG.FULL_SCRIPT_PROXY = env.FULL_SCRIPT_PROXY === 'true' || env.FULL_SCRIPT_PROXY === true;
  }

  const {
    GTM_SERVER_URL,
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

  console.log('[CONFIG] ============================================================');
  console.log('[CONFIG] Tracklay Worker Configuration Summary');
  console.log('[CONFIG] ============================================================');
  console.log('[CONFIG] GTM_SERVER_URL:', GTM_SERVER_URL || '(not set - client-side only)');
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
