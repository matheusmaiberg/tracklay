/**
 * @fileoverview Event Validator - Validates event data for server-side tracking
 * @module services/event-validator
 */

/**
 * Validates event data from client
 * @param {Object} eventData - Event data from client
 * @returns {Object} Validation result { valid: boolean, errors: string[] }
 */
export function validateEventData(eventData) {
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
