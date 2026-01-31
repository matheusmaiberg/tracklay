/**
 * @fileoverview Payload Builder - Builds GA4 Measurement Protocol payloads
 * @module services/payload-builder
 */

/**
 * Extracts custom parameters from event data (non-standard fields)
 * @param {Object} eventData - Event data from client
 * @returns {Object} Custom parameters
 */
export function extractCustomParams(eventData) {
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

/**
 * Builds GA4 Measurement Protocol payload
 * @param {Object} eventData - Event data from client
 * @param {Object} clientInfo - Client information (IP, UA, referer)
 * @returns {Object} GA4 Measurement Protocol payload
 */
export function buildGA4Payload(eventData, clientInfo) {
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
