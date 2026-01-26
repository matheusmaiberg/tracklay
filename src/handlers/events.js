// ============================================================
// EVENT HANDLER - SERVER-SIDE EVENT FORWARDING
// ============================================================
// RESPONSIBILITY:
// - handleEventProxy(request, rateLimit) → Promise<Response>
// - Receive events from client (browser)
// - Validate event data
// - Convert to GA4 Measurement Protocol format
// - Forward to GTM Server-Side
// - Return success/error response
//
// ARCHITECTURE:
// Browser → Worker (/cdn/events) → GTM Server → GA4
//
// BENEFITS:
// - 95-98% ad-blocker bypass (no client-side tracking code)
// - First-party tracking (all requests to same domain)
// - Server-side enrichment possible
// - No GTM script needed on client
//
// FUNCTIONS:
// - handleEventProxy(request, rateLimit) → Promise<Response>

import { Logger } from '../core/logger.js';
import { CONFIG } from '../config/index.js';
import { buildResponse } from '../proxy/response-builder.js';
import { errorResponse } from '../utils/response.js';
import { HTTP_STATUS } from '../utils/constants.js';

/**
 * Handle server-side event forwarding
 * Receives events from browser and forwards to GTM Server-Side
 *
 * @param {Request} request - Incoming request with event data
 * @param {Object} rateLimit - Rate limit info from worker
 * @returns {Promise<Response>} Success or error response
 *
 * @example
 * // Client-side usage:
 * fetch('https://cdn.yourstore.com/cdn/events', {
 *   method: 'POST',
 *   headers: { 'Content-Type': 'application/json' },
 *   body: JSON.stringify({
 *     event_name: 'page_view',
 *     client_id: 'GA1.1.123456789.1234567890',
 *     measurement_id: 'G-XXXXXXXXXX',
 *     page_location: 'https://yourstore.com/products/product-name',
 *     page_title: 'Product Name',
 *     session_id: '1234567890',
 *     engagement_time_msec: '100'
 *   })
 * });
 */
export async function handleEventProxy(request, rateLimit = null) {
  const startTime = Date.now();

  try {
    // Check if GTM Server URL is configured
    if (!CONFIG.GTM_SERVER_URL) {
      Logger.warn('Event proxy called but GTM_SERVER_URL not configured');
      return errorResponse('Server-side tracking not configured', HTTP_STATUS.SERVICE_UNAVAILABLE);
    }

    // Parse event data from request body
    let eventData;
    try {
      eventData = await request.json();
    } catch (parseError) {
      Logger.warn('Failed to parse event JSON', { error: parseError.message });
      return errorResponse('Invalid JSON', HTTP_STATUS.BAD_REQUEST);
    }

    // Validate required fields
    const validation = validateEventData(eventData);
    if (!validation.valid) {
      Logger.warn('Event validation failed', { errors: validation.errors });
      return errorResponse(`Invalid event: ${validation.errors.join(', ')}`, HTTP_STATUS.BAD_REQUEST);
    }

    // Extract client information
    const clientIP = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
    const userAgent = request.headers.get('User-Agent') || '';
    const referer = request.headers.get('Referer') || '';

    // Build GA4 Measurement Protocol payload
    const ga4Payload = buildGA4Payload(eventData, {
      clientIP,
      userAgent,
      referer
    });

    // Log event for debugging
    Logger.info('Server-side event received', {
      event_name: eventData.event_name,
      client_id: eventData.client_id?.substring(0, 20) + '...',
      measurement_id: eventData.measurement_id,
      clientIP,
      duration: Date.now() - startTime
    });

    // Forward to GTM Server-Side
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
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(CONFIG.FETCH_TIMEOUT || 10000)
    });

    const forwardDuration = Date.now() - forwardStartTime;

    // Check if GTM Server accepted the event
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

    // Return success response with CORS headers
    return buildResponse(
      new Response(JSON.stringify({ success: true }), {
        status: HTTP_STATUS.OK,
        headers: {
          'Content-Type': 'application/json'
        }
      }),
      request,
      {
        preserveHeaders: false,
        allowCache: false,
        rateLimit
      }
    );

  } catch (error) {
    Logger.error('Event proxy failed', {
      error: error.message,
      stack: error.stack,
      duration: Date.now() - startTime
    });

    // Return error response
    return buildResponse(
      errorResponse('Internal server error', HTTP_STATUS.INTERNAL_SERVER_ERROR),
      request,
      {
        preserveHeaders: false,
        allowCache: false,
        rateLimit
      }
    );
  }
}

/**
 * Validate event data
 * Ensures required fields are present and valid
 *
 * @param {Object} eventData - Event data from client
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
function validateEventData(eventData) {
  const errors = [];

  // Required fields
  if (!eventData.event_name || typeof eventData.event_name !== 'string') {
    errors.push('event_name is required and must be a string');
  }

  if (!eventData.client_id || typeof eventData.client_id !== 'string') {
    errors.push('client_id is required and must be a string');
  }

  // Measurement ID is optional (can use default from GTM Server)
  // But if provided, must be valid format
  if (eventData.measurement_id && !/^G-[A-Z0-9]+$/.test(eventData.measurement_id)) {
    errors.push('measurement_id must be in format G-XXXXXXXXXX');
  }

  // Event name validation (alphanumeric and underscore only)
  if (eventData.event_name && !/^[a-zA-Z0-9_]+$/.test(eventData.event_name)) {
    errors.push('event_name must contain only alphanumeric characters and underscores');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Build GA4 Measurement Protocol payload
 * Converts client event data to GA4 format
 *
 * @param {Object} eventData - Event data from client
 * @param {Object} clientInfo - Client information (IP, UA, referer)
 * @returns {Object} GA4 Measurement Protocol payload
 *
 * @see https://developers.google.com/analytics/devguides/collection/protocol/ga4
 */
function buildGA4Payload(eventData, clientInfo) {
  // Base payload structure
  const payload = {
    // Client identification
    client_id: eventData.client_id,

    // Timestamp (use server time if not provided)
    timestamp_micros: eventData.timestamp_micros || (Date.now() * 1000).toString(),

    // User properties (optional)
    user_properties: eventData.user_properties || {},

    // Events array (GA4 supports batch events, we send single event)
    events: [
      {
        name: eventData.event_name,
        params: {
          // Page information
          page_location: eventData.page_location || clientInfo.referer || '',
          page_title: eventData.page_title || '',
          page_referrer: eventData.page_referrer || '',

          // Session information
          session_id: eventData.session_id || '',
          engagement_time_msec: eventData.engagement_time_msec || '100',

          // Custom parameters (all other fields from eventData)
          ...extractCustomParams(eventData)
        }
      }
    ]
  };

  // Add measurement_id if provided
  if (eventData.measurement_id) {
    payload.measurement_id = eventData.measurement_id;
  }

  // Add user_id if provided (for User-ID feature)
  if (eventData.user_id) {
    payload.user_id = eventData.user_id;
  }

  return payload;
}

/**
 * Extract custom parameters from event data
 * Excludes standard GA4 fields and returns rest as custom parameters
 *
 * @param {Object} eventData - Event data from client
 * @returns {Object} Custom parameters
 */
function extractCustomParams(eventData) {
  // Standard GA4 fields to exclude
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

  const customParams = {};

  for (const [key, value] of Object.entries(eventData)) {
    if (!standardFields.has(key)) {
      customParams[key] = value;
    }
  }

  return customParams;
}
