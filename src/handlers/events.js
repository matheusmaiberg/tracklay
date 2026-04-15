/**
 * @fileoverview Event Handler - Server-side event forwarding
 * @module handlers/events
 */

import { Logger } from '../core/logger.js';
import { CONFIG } from '../config/index.js';
import { buildResponse } from '../proxy/response-builder.js';
import { errorResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';

/**
 * @param {Request} request - Incoming request with event data
 * @param {Object} rateLimit - Rate limit info from worker
 * @returns {Promise<Response>} Success or error response
 */
export async function handleEventProxy(request, rateLimit = null) {
  const startTime = Date.now();

  try {
    if (!CONFIG.GTM_SERVER_URL) {
      Logger.warn('Event proxy called but GTM_SERVER_URL not configured');
      return buildResponse(errorResponse('Server-side tracking not configured', HTTP_STATUS.SERVICE_UNAVAILABLE), request, { preserveHeaders: false, allowCache: false, rateLimit });
    }

    let eventData;
    try {
      eventData = await request.json();
    } catch (parseError) {
      Logger.warn('Failed to parse event JSON', { error: parseError.message });
      return buildResponse(errorResponse('Invalid JSON', HTTP_STATUS.BAD_REQUEST), request, { preserveHeaders: false, allowCache: false, rateLimit });
    }

    const validation = validateEventData(eventData);
    if (!validation.valid) {
      Logger.warn('Event validation failed', { errors: validation.errors });
      return buildResponse(errorResponse(`Invalid event: ${validation.errors.join(', ')}`, HTTP_STATUS.BAD_REQUEST), request, { preserveHeaders: false, allowCache: false, rateLimit });
    }

    const { headers } = request;
    const clientIP = headers.get('CF-Connecting-IP') ?? headers.get('X-Forwarded-For') ?? 'unknown';
    const userAgent = headers.get('User-Agent') ?? '';
    const referer = headers.get('Referer') ?? '';

    const ga4Payload = buildGA4Payload(eventData, { clientIP, userAgent, referer });

    Logger.info('Server-side event received', {
      event_name: eventData.event_name,
      client_id: `${eventData.client_id?.substring(0, 20)}...`,
      measurement_id: eventData.measurement_id,
      clientIP,
      duration: Date.now() - startTime
    });

    const gtmServerUrl = `${CONFIG.GTM_SERVER_URL}/g/collect`;

    const forwardStartTime = Date.now();
    const gtmResponse = await fetch(gtmServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        'X-Forwarded-For': clientIP,
        'Referer': referer
      },
      body: JSON.stringify(ga4Payload),
      signal: AbortSignal.timeout(CONFIG.FETCH_TIMEOUT ?? 10000)
    });

    const forwardDuration = Date.now() - forwardStartTime;

    if (!gtmResponse.ok) {
      Logger.error('GTM Server rejected event', {
        status: gtmResponse.status,
        statusText: gtmResponse.statusText,
        duration: forwardDuration
      });
      return errorResponse('Tracking server error', HTTP_STATUS.BAD_GATEWAY);
    }

    Logger.info('Event forwarded successfully', {
      event_name: eventData.event_name,
      gtmStatus: gtmResponse.status,
      forwardDuration,
      totalDuration: Date.now() - startTime
    });

    return buildResponse(
      new Response(JSON.stringify({ success: true }), {
        status: HTTP_STATUS.OK,
        headers: { 'Content-Type': 'application/json' }
      }),
      request,
      { preserveHeaders: false, allowCache: false, rateLimit }
    );

  } catch (error) {
    Logger.error('Event proxy failed', {
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime
    });

    return buildResponse(
      errorResponse('Internal server error', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      request,
      { preserveHeaders: false, allowCache: false, rateLimit }
    );
  }
}

/**
 * @param {Object} eventData - Event data from client
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
function validateEventData(eventData) {
  const errors = [];

  if (!eventData?.event_name || typeof eventData.event_name !== 'string') {
    errors.push('event_name is required and must be a string');
  }

  if (!eventData?.client_id || typeof eventData.client_id !== 'string') {
    errors.push('client_id is required and must be a string');
  }

  if (eventData?.measurement_id && !/^G-[A-Z0-9]+$/.test(eventData.measurement_id)) {
    errors.push('measurement_id must be in format G-XXXXXXXXXX');
  }

  if (eventData?.event_name && !/^[a-zA-Z0-9_]+$/.test(eventData.event_name)) {
    errors.push('event_name must contain only alphanumeric characters and underscores');
  }

  return { valid: errors.length === 0, errors };
}

/**
 * @param {Object} eventData - Event data from client
 * @param {Object} clientInfo - Client information (IP, UA, referer)
 * @returns {Object} GA4 Measurement Protocol payload
 */
function buildGA4Payload(eventData, clientInfo) {
  const { clientIP, userAgent, referer } = clientInfo;
  
  const payload = {
    client_id: eventData.client_id,
    timestamp_micros: eventData.timestamp_micros ?? (Date.now() * 1000).toString(),
    user_properties: eventData.user_properties ?? {},
    events: [{
      name: eventData.event_name,
      params: {
        page_location: eventData.page_location ?? referer ?? '',
        page_title: eventData.page_title ?? '',
        page_referrer: eventData.page_referrer ?? '',
        session_id: eventData.session_id ?? '',
        engagement_time_msec: eventData.engagement_time_msec ?? '100',
        ...extractCustomParams(eventData)
      }
    }]
  };

  if (eventData.measurement_id) {
    payload.measurement_id = eventData.measurement_id;
  }

  if (eventData.user_id) {
    payload.user_id = eventData.user_id;
  }

  return payload;
}

/**
 * @param {Object} eventData - Event data from client
 * @returns {Object} Custom parameters
 */
function extractCustomParams(eventData) {
  const standardFields = new Set([
    'event_name',
    'client_id',
    'user_id',
    'measurement_id',
    'timestamp_micros',
    'user_properties',
    'page_location',
    'page_title',
    'page_referrer',
    'session_id',
    'engagement_time_msec'
  ]);

  return Object.fromEntries(
    Object.entries(eventData).filter(([key]) => !standardFields.has(key))
  );
}
