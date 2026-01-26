// ============================================================
// SCRIPT INJECTOR - TRANSPORT_URL AUTO-INJECTION
// ============================================================
// RESPONSIBILITY:
// - injectTransportUrl(scriptContent, transportUrl) → string
// - Modify Google scripts (gtag.js/gtm.js) to force first-party tracking
// - Inject transport_url parameter into gtag('config') calls
// - Enables 100% first-party tracking without Shopify theme changes
//
// HOW IT WORKS:
// 1. Worker intercepts Google script responses
// 2. Worker injects JavaScript code BEFORE returning to client
// 3. Injected code wraps gtag() function
// 4. Wrapper automatically adds transport_url to all gtag('config') calls
// 5. Client sends tracking to Worker → GTM Server → GA4 (first-party!)
//
// BENEFITS:
// - Zero configuration in Shopify theme (plug-and-play)
// - Automatic UUID rotation support (Worker injects current UUID)
// - 95%+ ad-blocker bypass (scripts + tracking first-party)
// - ITP/ETP complete bypass (cookies first-party)
//
// FUNCTIONS:
// - injectTransportUrl(scriptContent, transportUrl) → string

import { Logger } from '../core/logger.js';

/**
 * Inject transport_url into Google Analytics/GTM scripts
 * Wraps gtag() function to automatically add transport_url parameter
 *
 * @param {string} scriptContent - Original script content from Google
 * @param {string} transportUrl - Worker endpoint URL (e.g., 'https://yourstore.com/cdn/g/{UUID}')
 * @returns {string} Modified script with transport_url injection
 *
 * @example
 * const script = await fetch('https://www.googletagmanager.com/gtag/js?id=G-XXX');
 * const content = await script.text();
 * const modified = injectTransportUrl(content, 'https://yourstore.com/cdn/g/abc123');
 * // Modified script now sends tracking to yourstore.com/cdn/g/abc123 instead of Google
 */
export function injectTransportUrl(scriptContent, transportUrl) {
  Logger.debug('Injecting transport_url', { transportUrl });

  // JavaScript code to inject
  // Wraps gtag() function to add transport_url to all config() calls
  const injectionCode = `
;(function() {
  // Store original gtag function
  var _originalGtag = window.gtag;

  // Override gtag function
  window.gtag = function() {
    // Check if this is a config call: gtag('config', 'G-XXX', {...})
    if (arguments[0] === 'config' && arguments.length >= 2) {
      // Get or create config object (3rd argument)
      var config = arguments[2] || {};

      // Inject transport_url (forces first-party tracking)
      config.transport_url = '${transportUrl}';

      // Enable first-party collection flag
      config.first_party_collection = true;

      // Update arguments with modified config
      arguments[2] = config;
    }

    // Call original gtag with modified arguments
    return _originalGtag.apply(this, arguments);
  };

  // Preserve gtag.l property (timestamp)
  if (_originalGtag.l !== undefined) {
    window.gtag.l = _originalGtag.l;
  }
})();
`;

  // Append injection code to the end of the script
  // This ensures gtag() is defined before we wrap it
  const modifiedScript = scriptContent + injectionCode;

  Logger.debug('Transport_url injected successfully', {
    originalSize: scriptContent.length,
    modifiedSize: modifiedScript.length,
    injectedBytes: injectionCode.length
  });

  return modifiedScript;
}

/**
 * Check if script content should have transport_url injected
 * Only inject for Google Analytics/GTM scripts
 *
 * @param {string} url - Script URL
 * @returns {boolean} True if injection should happen
 */
export function shouldInjectTransportUrl(url) {
  const urlLower = url.toLowerCase();

  // Inject for Google Analytics/GTM scripts
  const isGoogleScript =
    urlLower.includes('googletagmanager.com/gtag/js') ||
    urlLower.includes('googletagmanager.com/gtm.js') ||
    urlLower.includes('google-analytics.com/analytics.js');

  return isGoogleScript;
}
