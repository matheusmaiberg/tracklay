/**
 * @fileoverview Endpoints Info Handler - Authenticated UUID exposure
 * @module handlers/endpoints-info
 */

import { CONFIG } from '../config/index.js';
import { generateEndpointUUID } from '../core/uuid.js';
import { errorResponse, jsonResponse } from '../utils/response.js';
import { Logger } from '../core/logger.js';
import { buildFullHeaders } from '../factories/headers-factory.js';
import { getCurrentDateISO, getNextRotationISO } from '../utils/time.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { safeParseURL } from '../utils/url.js';

/**
 * @param {Request} request - Incoming request
 * @returns {Promise<Response>} JSON with endpoint UUIDs or error
 */
export async function handleEndpointsInfo(request) {
  try {
  if (!CONFIG.ENDPOINTS_API_TOKEN) {
    Logger.error('ENDPOINTS_API_TOKEN not configured');
    return errorResponse(
      'Endpoint not available - ENDPOINTS_API_TOKEN not configured',
      503
    );
  }

  const url = safeParseURL(request.url);
  if (!url) {
    return errorResponse('Invalid URL', HTTP_STATUS.BAD_REQUEST);
  }
  const token = url.searchParams.get('token');

  if (!token) {
    Logger.warn('Missing token in query string', {
      ip: request.headers.get('CF-Connecting-IP') ?? 'unknown'
    });
    return errorResponse('Unauthorized - token query parameter required', 401);
  }

  if (token !== CONFIG.ENDPOINTS_API_TOKEN) {
    Logger.warn('Invalid ENDPOINTS_API_TOKEN', {
      ip: request.headers.get('CF-Connecting-IP') ?? 'unknown'
    });
    return errorResponse('Unauthorized - Invalid token', 401);
  }

  const fbUUID = await generateEndpointUUID('facebook');
  const googleUUID = await generateEndpointUUID('google');

  const expiresAt = CONFIG.UUID_ROTATION_ENABLED
    ? getNextRotationISO(Date.now(), CONFIG.UUID_ROTATION_INTERVAL_MS)
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
      enabled: CONFIG.UUID_ROTATION_ENABLED === true,
      interval: CONFIG.UUID_ROTATION_INTERVAL_MS
    },
    expiresAt,
    generatedAt: getCurrentDateISO()
  };

  Logger.info('Endpoints fetched successfully', {
    ip: request.headers.get('CF-Connecting-IP') ?? 'unknown',
    rotation: payload.rotation.enabled
  });

  const headers = buildFullHeaders(request, { includeRateLimit: false });
  headers.set('Content-Type', 'application/json');
  return new Response(JSON.stringify(payload), { status: 200, headers });
  } catch (error) {
    Logger.error('Endpoints info failed', { error: error.message });
    return errorResponse('Internal server error', HTTP_STATUS.INTERNAL_SERVER_ERROR);
  }
}
