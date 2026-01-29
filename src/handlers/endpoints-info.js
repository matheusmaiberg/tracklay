/**
 * @fileoverview Endpoints Info Handler - Authenticated UUID exposure
 * @module handlers/endpoints-info
 */

import { CONFIG } from '../config/index.js';
import { generateEndpointUUID } from '../core/uuid.js';
import { errorResponse, jsonResponse } from '../utils/response.js';
import { Logger } from '../core/logger.js';
import { getCurrentDateISO, getNextRotationISO } from '../utils/time.js';

/**
 * @param {Request} request - Incoming request
 * @returns {Promise<Response>} JSON with endpoint UUIDs or error
 */
export async function handleEndpointsInfo(request) {
  if (!CONFIG.ENDPOINTS_SECRET) {
    Logger.error('ENDPOINTS_SECRET not configured');
    return errorResponse(
      'Endpoint not available - ENDPOINTS_SECRET not configured',
      503
    );
  }

  const url = new URL(request.url);
  const token = url.searchParams.get('token');

  if (!token) {
    Logger.warn('Missing token in query string', {
      ip: request.headers.get('CF-Connecting-IP') ?? 'unknown'
    });
    return errorResponse('Unauthorized - token query parameter required', 401);
  }

  if (token !== CONFIG.ENDPOINTS_SECRET) {
    Logger.warn('Invalid ENDPOINTS_SECRET', {
      ip: request.headers.get('CF-Connecting-IP') ?? 'unknown'
    });
    return errorResponse('Unauthorized - Invalid token', 401);
  }

  const fbUUID = await generateEndpointUUID('facebook');
  const googleUUID = await generateEndpointUUID('google');

  const expiresAt = CONFIG.ENDPOINTS_UUID_ROTATION 
    ? getNextRotationISO(Date.now(), CONFIG.UUID_SALT_ROTATION)
    : null;

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
