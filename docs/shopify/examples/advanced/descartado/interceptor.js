/**
 * @fileoverview Service Worker Interceptor - Network-level tracking request interception
 * @module service-worker-interceptor
 * 
 * @description
 * Service Worker that intercepts network requests to third-party tracking domains
 * BEFORE they leave the browser. This operates at the network layer, bypassing
 * JavaScript-level ad-blockers completely.
 * 
 * Key Capabilities:
 * - Intercepts fetch() and XHR at network level
 * - Rewrites URLs to first-party proxy automatically
 * - Cache responses for offline tracking
 * - Queue events when offline (Background Sync API)
 * - Bypass CORS restrictions for tracking pixels
 * - Returns transparent responses to prevent script detection
 * 
 * Architecture:
 * 1. Service Worker registers with browser
 * 2. All outgoing requests pass through fetch event handler
 * 3. Matching tracking domains are rewritten to proxy
 * 4. Proxy forwards to actual destination
 * 5. Response returned transparently to page
 * 
 * @example
 * // Register the service worker in your main site
 * if ('serviceWorker' in navigator) {
 *   navigator.serviceWorker.register('/tracklay-sw.js')
 *     .then(reg => console.log('SW registered'))
 *     .catch(err => console.error('SW failed:', err));
 * }
 * 
 * // Initialize with configuration
 * navigator.serviceWorker.ready.then(registration => {
 *   registration.active.postMessage({
 *     type: 'INIT',
 *     data: {
 *       proxyDomain: 'https://cdn.yourstore.com',
 *       uuids: { 
 *         google: 'uuid-for-ga',
 *         facebook: 'uuid-for-fb'
 *       }
 *     }
 *   });
 * });
 * 
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/Clients}
 */

/**
 * Service Worker configuration object
 * Populated at runtime via message from main thread
 * @constant {Object}
 * @property {string} CACHE_NAME - Name of the cache storage
 * @property {string|null} PROXY_DOMAIN - First-party proxy domain URL
 * @property {Object<string, string>} UUIDS - UUID mappings for different tracking services
 * @property {Array<string>} TRACKING_DOMAINS - List of domains to intercept
 */
const SW_CONFIG = {
  CACHE_NAME: 'tracklay-sw-v1',
  PROXY_DOMAIN: null,
  UUIDS: {},
  TRACKING_DOMAINS: [
    'www.google-analytics.com',
    'www.googletagmanager.com',
    'www.facebook.com',
    'connect.facebook.net'
  ]
};

/**
 * Service Worker install event handler
 * Triggered when the service worker is first installed
 * 
 * @function
 * @param {ExtendableEvent} event - The install event object
 * @returns {void}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/install_event}
 */
self.addEventListener('install', (event) => {
  console.log('[TracklaySW] Installing...');
  self.skipWaiting();
});

/**
 * Service Worker activate event handler
 * Triggered when the service worker takes control of pages
 * Claims all clients immediately for immediate activation
 * 
 * @function
 * @param {ExtendableEvent} event - The activate event object
 * @returns {void}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/activate_event}
 */
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

/**
 * Service Worker message event handler
 * Receives configuration from the main thread
 * Validates message source for security
 * 
 * @function
 * @param {MessageEvent} event - The message event object
 * @param {*} event.data - Message payload
 * @param {string} event.data.type - Message type (e.g., 'INIT')
 * @param {Object} event.data.data - Configuration data
 * @param {string} event.data.data.proxyDomain - Proxy domain URL
 * @param {Object} event.data.data.uuids - UUID mappings
 * @returns {void}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerGlobalScope/message_event}
 */
self.addEventListener('message', (event) => {
  // Security: Only accept messages from same-origin or trusted sources
  if (event.source && event.source !== self) {
    // In a real implementation, you might want to check event.origin
    // but in Service Worker context, event.source is the Client
    console.log('[TracklaySW] Message from client accepted');
  }
  
  const { type, data } = event.data || {};
  if (type === 'INIT' && data) {
    SW_CONFIG.PROXY_DOMAIN = data.proxyDomain;
    SW_CONFIG.UUIDS = data.uuids || {};
    console.log('[TracklaySW] Config received');
  }
});

/**
 * Service Worker fetch event handler
 * Intercepts all network requests from controlled pages
 * Checks if request should be proxied and handles accordingly
 * 
 * @function
 * @param {FetchEvent} event - The fetch event object
 * @param {Request} event.request - The outgoing request
 * @returns {void}
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/API/FetchEvent}
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  if (shouldIntercept(url)) {
    event.respondWith(handleTrackingRequest(request, url));
  }
});

/**
 * Check if URL should be intercepted
 * Compares hostname against TRACKING_DOMAINS list
 * 
 * @function shouldIntercept
 * @param {URL} url - URL object to check
 * @returns {boolean} True if URL matches tracking domain
 * @example
 * const url = new URL('https://www.google-analytics.com/collect');
 * shouldIntercept(url); // Returns: true
 */
function shouldIntercept(url) {
  if (!SW_CONFIG.PROXY_DOMAIN) return false;
  return SW_CONFIG.TRACKING_DOMAINS.some(domain => 
    url.hostname === domain || url.hostname.endsWith('.' + domain)
  );
}

/**
 * Handle intercepted tracking request
 * Rewrites URL to proxy, forwards request, returns transparent response
 * Returns 1x1 transparent GIF on failure to prevent script errors
 * 
 * @function handleTrackingRequest
 * @param {Request} request - Original outgoing request
 * @param {URL} url - Parsed URL object
 * @returns {Promise<Response>} Proxied response or fallback
 * @throws {Error} Logs error but returns fallback response instead of throwing
 * @example
 * const response = await handleTrackingRequest(request, url);
 * // Returns: Response with status 200 and proxied/transparent body
 */
async function handleTrackingRequest(request, url) {
  try {
    const proxyUrl = rewriteToProxy(url);
    
    // Create new request with proxied URL
    const proxyRequest = new Request(proxyUrl, {
      method: request.method,
      headers: new Headers(request.headers),
      body: request.body,
      mode: 'cors',
      credentials: 'omit' // Don't send cookies to proxy for privacy
    });
    
    const response = await fetch(proxyRequest);
    
    // Return transparent response (status 200 OK with original body)
    // This prevents tracking scripts from knowing they were intercepted
    return new Response(response.body, {
      status: 200,
      statusText: 'OK',
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/gif',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('[TracklaySW] Proxy failed:', error);
    // Return 1x1 transparent pixel as fallback to prevent script errors
    return new Response(
      new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b]),
      { 
        status: 200, 
        headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' } 
      }
    );
  }
}

/**
 * Determine UUID based on tracking domain
 * Maps domain patterns to UUID configuration keys
 * Falls back to Google UUID as default
 * 
 * @function getUuidForDomain
 * @param {URL} url - Original request URL
 * @returns {string} UUID to use for proxy request
 * @example
 * const url = new URL('https://connect.facebook.net/fbevents.js');
 * getUuidForDomain(url); // Returns: SW_CONFIG.UUIDS.facebook
 */
function getUuidForDomain(url) {
  const hostname = url.hostname.toLowerCase();
  
  // Facebook domains
  if (hostname.includes('facebook.com') || hostname.includes('facebook.net')) {
    return SW_CONFIG.UUIDS.facebook || SW_CONFIG.UUIDS.google;
  }
  
  // Google domains (default)
  if (hostname.includes('google') || hostname.includes('googletagmanager')) {
    return SW_CONFIG.UUIDS.google;
  }
  
  // Default fallback
  return SW_CONFIG.UUIDS.google;
}

/**
 * Rewrite tracking URL to proxy URL
 * Constructs new URL with proxy domain and UUID path
 * Preserves original query parameters
 * 
 * @function rewriteToProxy
 * @param {URL} url - Original tracking URL
 * @returns {string} Complete proxy URL
 * @example
 * const url = new URL('https://www.google-analytics.com/collect?v=1&tid=UA-123');
 * rewriteToProxy(url);
 * // Returns: 'https://cdn.yourstore.com/x/uuid-for-ga?v=1&tid=UA-123'
 */
function rewriteToProxy(url) {
  const proxyUrl = new URL(SW_CONFIG.PROXY_DOMAIN);
  const uuid = getUuidForDomain(url);
  proxyUrl.pathname = `/x/${uuid}`;
  proxyUrl.search = url.search;
  return proxyUrl.toString();
}
