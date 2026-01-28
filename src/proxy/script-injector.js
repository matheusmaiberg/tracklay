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
 * Inject transport_url into GTM scripts (dataLayer API)
 * Must be prepended BEFORE GTM initializes to configure server_container_url
 *
 * @param {string} scriptContent - Original GTM script content from Google
 * @param {string} transportUrl - Worker endpoint URL (e.g., 'https://yourstore.com/cdn/g/{UUID}')
 * @returns {string} Modified script with transport_url injection
 */
function injectTransportUrlGTM(scriptContent, transportUrl) {
  Logger.debug('Injecting GTM transport_url by modifying internal code', { transportUrl });

  // GTM sends hits to /g/collect by default
  // We need to replace the hardcoded endpoint with our Worker endpoint
  // This is more aggressive than dataLayer configuration

  // Replace all occurrences of Google's collect endpoints with our Worker endpoint
  let modifiedScript = scriptContent;

  // Replace /g/collect endpoint (used by GA4 Measurement Protocol)
  modifiedScript = modifiedScript.replace(
    /["']\/g\/collect["']/g,
    `"${transportUrl}"`
  );

  // Replace www.google-analytics.com/g/collect (full URL)
  modifiedScript = modifiedScript.replace(
    /https?:\/\/www\.google-analytics\.com\/g\/collect/g,
    transportUrl
  );

  // Replace region1.google-analytics.com (regional endpoints)
  modifiedScript = modifiedScript.replace(
    /https?:\/\/region\d\.google-analytics\.com\/g\/collect/g,
    transportUrl
  );

  Logger.debug('GTM endpoint override applied', {
    originalSize: scriptContent?.length,
    modifiedSize: modifiedScript?.length,
    transportUrl
  });

  return modifiedScript;
}

/**
 * Inject transport_url into gtag scripts (gtag API)
 * Wraps gtag() function to automatically add transport_url parameter
 *
 * @param {string} scriptContent - Original gtag script content from Google
 * @param {string} transportUrl - Worker endpoint URL (e.g., 'https://yourstore.com/cdn/g/{UUID}')
 * @returns {string} Modified script with transport_url injection
 */
function injectTransportUrlGtag(scriptContent, transportUrl) {
  Logger.debug('Injecting gtag transport_url via gtag() wrapper', { transportUrl });

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

  // APPEND injection code to the end of the script
  // This ensures gtag() is defined before we wrap it
  const modifiedScript = scriptContent + injectionCode;

  Logger.debug('gtag transport_url injected successfully', {
    originalSize: scriptContent?.length,
    modifiedSize: modifiedScript?.length,
    injectedBytes: injectionCode?.length
  });

  return modifiedScript;
}

/**
 * Inject transport_url into Google Analytics/GTM scripts
 * Automatically detects script type and applies appropriate injection method
 *
 * @param {string} scriptContent - Original script content from Google
 * @param {string} transportUrl - Worker endpoint URL (e.g., 'https://yourstore.com/cdn/g/{UUID}')
 * @param {string} scriptType - Script type ('gtm' | 'gtag' | 'analytics')
 * @returns {string} Modified script with transport_url injection
 *
 * @example
 * // GTM script (dataLayer API)
 * const gtmScript = await fetch('https://www.googletagmanager.com/gtm.js?id=GTM-XXX');
 * const gtmContent = await gtmScript.text();
 * const gtmModified = injectTransportUrl(gtmContent, 'https://yourstore.com/cdn/g/abc123', 'gtm');
 *
 * @example
 * // gtag script (gtag API)
 * const gtagScript = await fetch('https://www.googletagmanager.com/gtag/js?id=G-XXX');
 * const gtagContent = await gtagScript.text();
 * const gtagModified = injectTransportUrl(gtagContent, 'https://yourstore.com/cdn/g/abc123', 'gtag');
 */
export function injectTransportUrl(scriptContent, transportUrl, scriptType = 'gtag') {
  try {
    // Route to appropriate injection method based on script type
    if (scriptType === 'gtm') {
      // GTM uses dataLayer API - inject BEFORE script runs
      return injectTransportUrlGTM(scriptContent, transportUrl);
    }
    // gtag/analytics use gtag() API - inject AFTER script runs
    return injectTransportUrlGtag(scriptContent, transportUrl);
  } catch (error) {
    Logger.error('Transport_url injection failed', {
      error: error?.message ?? 'Unknown error',
      scriptType,
      transportUrl
    });
    // Graceful degradation: return original script
    return scriptContent;
  }
}

/**
 * Detect script type for appropriate injection method
 *
 * @param {string} url - Script URL
 * @returns {Object} Object with shouldInject (boolean) and scriptType ('gtm' | 'gtag' | 'analytics' | null)
 */
export function shouldInjectTransportUrl(url) {
  const urlLower = url?.toLowerCase() ?? '';

  // Detect GTM script (uses dataLayer API)
  if (urlLower.includes('googletagmanager.com/gtm.js')) {
    return { shouldInject: true, scriptType: 'gtm' };
  }

  // Detect gtag script (uses gtag() API)
  if (urlLower.includes('googletagmanager.com/gtag/js')) {
    return { shouldInject: true, scriptType: 'gtag' };
  }

  // Detect legacy analytics.js (uses ga() API, similar to gtag)
  if (urlLower.includes('google-analytics.com/analytics.js')) {
    return { shouldInject: true, scriptType: 'analytics' };
  }

  return { shouldInject: false, scriptType: null };
}
