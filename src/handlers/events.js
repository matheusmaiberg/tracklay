/**
 * @fileoverview Event Handler - Server-side event forwarding
 * @module handlers/events
 */

import { Logger } from '../core/logger.js';
import { CONFIG } from '../config/index.js';
import { buildResponse } from '../proxy/response-builder.js';
import { errorResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';
import { validateEventData } from '../services/event-validator.js';
import { buildGA4Payload } from '../services/payload-builder.js';
import { fetchWithTimeout } from '../core/fetch.js';

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
      return errorResponse('Server-side tracking not configured', HTTP_STATUS.SERVICE_UNAVAILABLE);
    }

    let eventData;
    try {
      eventData = await request.json();
    } catch (parseError) {
      Logger.warn('Failed to parse event JSON', { error: parseError.message });
      return errorResponse('Invalid JSON', HTTP_STATUS.BAD_REQUEST);
    }

    const validation = validateEventData(eventData);
    if (!validation.valid) {
      Logger.warn('Event validation failed', { errors: validation.errors });
      return errorResponse(`Invalid event: ${validation.errors.join(', ')}`, HTTP_STATUS.BAD_REQUEST);
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
    const gtmResponse = await fetchWithTimeout(gtmServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': userAgent,
        'X-Forwarded-For': clientIP,
        'Referer': referer
      },
      body: JSON.stringify(ga4Payload)
    }, CONFIG.FETCH_TIMEOUT ?? 10000);

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
