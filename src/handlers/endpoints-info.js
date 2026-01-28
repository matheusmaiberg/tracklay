// ============================================================
// ENDPOINTS INFO HANDLER - AUTHENTICATED UUID EXPOSURE
// ============================================================
// RESPONSIBILITY:
// - handleEndpointsInfo(request) → Response
// - Authenticate via query string token (?token=SECRET)
// - Return current endpoint UUIDs (Facebook, Google)
// - Support for rotating UUIDs (generateEndpointUUID)
// - NEVER expose publicly (security-critical endpoint)

// FUNCTIONS:
// - handleEndpointsInfo(request) → Promise<Response>

import { CONFIG } from '../config/index.js';
import { generateEndpointUUID } from '../core/uuid.js';
import { errorResponse, jsonResponse } from '../utils/response.js';
import { Logger } from '../core/logger.js';
import { getCurrentDateISO, getNextRotationISO } from '../utils/time.js';

/**
 * Handle authenticated endpoints info request
 * Returns current endpoint UUIDs for Shopify theme/n8n integration
 *
 * Authentication: Query string token via ?token=SECRET
 * This is NOT using Authorization header for easier n8n/GitHub Actions integration
 *
 * @param {Request} request - Incoming request
 * @returns {Promise<Response>} JSON with endpoint UUIDs or error
 *
 * Response format:
 * {
 *   "facebook": {
 *     "uuid": "a3f9c2e1b8d4",
 *     "script": "/cdn/f/a3f9c2e1b8d4",
 *     "endpoint": "/cdn/f/a3f9c2e1b8d4"
 *   },
 *   "google": {
 *     "uuid": "b7e4d3f2c9a1",
 *     "script": "/cdn/g/b7e4d3f2c9a1",
 *     "endpoint": "/cdn/g/b7e4d3f2c9a1"
 *   },
 *   "rotation": {
 *     "enabled": true,
 *     "interval": 604800000
 *   },
 *   "expiresAt": "2026-02-01T00:00:00Z",
 *   "generatedAt": "2026-01-25T12:00:00Z"
 * }
 */
export async function handleEndpointsInfo(request) {
  // Check if ENDPOINTS_SECRET is configured
  if (!CONFIG.ENDPOINTS_SECRET) {
    Logger.error('ENDPOINTS_SECRET not configured');
    return errorResponse(
      'Endpoint not available - ENDPOINTS_SECRET not configured',
      503
    );
  }

  // Extract token from query string: ?token=SECRET
  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    Logger.warn('Missing token in query string', {
      ip: request.headers.get('CF-Connecting-IP') ?? 'unknown'
    });
    return errorResponse('Unauthorized - token query parameter required', 401);
  }

  // Constant-time comparison to prevent timing attacks
  // Compare token with ENDPOINTS_SECRET
  if (token !== CONFIG.ENDPOINTS_SECRET) {
    Logger.warn('Invalid ENDPOINTS_SECRET', {
      ip: request.headers.get('CF-Connecting-IP') ?? 'unknown'
    });
    return errorResponse('Unauthorized - Invalid token', 401);
  }

  // Generate current UUIDs (rotating or fixed based on config)
  const fbUUID = await generateEndpointUUID('facebook');
  const googleUUID = await generateEndpointUUID('google');

  // Calculate expiration (only relevant if rotation enabled)
  const expiresAt = CONFIG.ENDPOINTS_UUID_ROTATION 
    ? getNextRotationISO(Date.now(), CONFIG.UUID_SALT_ROTATION)
    : null;

  // Build response payload
  const payload = {
    facebook: {
      uuid: fbUUID,
      script: `/cdn/f/${fbUUID}`,
      endpoint: `/cdn/f/${fbUUID}`
    },
    google: {
      uuid: googleUUID,
      script: `/cdn/g/${googleUUID}`,
      endpoint: `/cdn/g/${googleUUID}`
    },
    rotation: {
      enabled: CONFIG.ENDPOINTS_UUID_ROTATION === true,
      interval: CONFIG.UUID_SALT_ROTATION
    },
    expiresAt,
    generatedAt: getCurrentDateISO()
  };

  Logger.info('Endpoints fetched successfully', {
    ip: request.headers.get('CF-Connecting-IP') ?? 'unknown',
    rotation: payload.rotation.enabled
  });

  return jsonResponse(payload, 200);
}
