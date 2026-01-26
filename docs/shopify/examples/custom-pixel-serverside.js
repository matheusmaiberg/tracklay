// ============================================================
// SHOPIFY CUSTOM PIXEL - SERVER-SIDE EVENTS (v3.1.0)
// ============================================================
// Shopify Admin → Settings → Customer Events → Custom Pixel
//
// ARCHITECTURE:
// Custom Pixel (Shopify API) → Worker (/cdn/events) → GTM Server → GA4
//
// BENEFITS:
// - Uses official Shopify Web Pixels API
// - No theme editing required
// - Automatic event tracking
// - Server-side forwarding (80-90% ad-blocker bypass)
//
// LIMITATION:
// - If uBlock Origin blocks Custom Pixel iframe, this won't work
// - For maximum bypass (95-98%), use theme.liquid version instead
//
// DOCUMENTATION:
// - Web Pixels API: https://shopify.dev/docs/api/web-pixels-api
// - Analytics API: https://shopify.dev/docs/api/web-pixels-api/standard-api/analytics
// - Standard Events: https://shopify.dev/docs/api/web-pixels-api/standard-events
// ============================================================

const CONFIG = {
  // Worker endpoint for server-side forwarding
  WORKER_URL: 'https://cdn.suevich.com/cdn/events',

  // GA4 Measurement ID
  MEASUREMENT_ID: 'G-N5ZZGL11MW',

  // Debug mode
  DEBUG: true,

  // Default currency
  DEFAULT_CURRENCY: 'EUR'
};

const log = (msg, data) => CONFIG.DEBUG && console.log(`[Tracking] ${msg}`, data ?? '');
const error = (msg, err) => console.error(`[Tracking] ${msg}`, err ?? '');

// ============= CLIENT ID & SESSION MANAGEMENT =============

/**
 * Get or create client ID from browser storage
 * Uses Shopify's browser API (sandboxed environment)
 */
async function getClientId() {
  try {
    // Try to get existing client ID
    let clientId = await browser.cookie.get('_ga');

    if (!clientId) {
      // Generate new client ID
      const random = Math.random().toString(36).substring(2, 11);
      const timestamp = Date.now();
      clientId = `GA1.1.${random}.${timestamp}`;

      // Store in cookie (2 years)
      await browser.cookie.set('_ga', clientId, {
        expires: new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000)
      });

      log('Generated new client ID', clientId);
    }

    return clientId;
  } catch (err) {
    error('Failed to get client ID', err);
    // Fallback to session-based ID
    return `GA1.1.fallback.${Date.now()}`;
  }
}

/**
 * Get or create session ID
 * Uses Shopify's browser API
 */
async function getSessionId() {
  try {
    const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes

    let sessionId = await browser.sessionStorage.getItem('_ga_session_id');
    let sessionStart = await browser.sessionStorage.getItem('_ga_session_start');
    const now = Date.now();

    // Check if session expired
    if (sessionId && sessionStart) {
      const elapsed = now - parseInt(sessionStart);
      if (elapsed > SESSION_TIMEOUT) {
        sessionId = null;
        log('Session expired');
      }
    }

    // Create new session
    if (!sessionId) {
      sessionId = now.toString();
      await browser.sessionStorage.setItem('_ga_session_id', sessionId);
      await browser.sessionStorage.setItem('_ga_session_start', now.toString());
      log('Created new session', sessionId);
    }

    return sessionId;
  } catch (err) {
    error('Failed to get session ID', err);
    return Date.now().toString();
  }
}

// ============= EVENT FORWARDING =============

/**
 * Send event to Worker for server-side forwarding
 */
async function forwardEventToWorker(eventName, eventData = {}) {
  try {
    const clientId = await getClientId();
    const sessionId = await getSessionId();

    // Build payload for Worker
    const payload = {
      // Required fields
      event_name: eventName,
      client_id: clientId,
      measurement_id: CONFIG.MEASUREMENT_ID,

      // Session info
      session_id: sessionId,
      engagement_time_msec: '100',

      // Page info (from Shopify context)
      page_location: eventData.page_location || '',
      page_title: eventData.page_title || '',
      page_referrer: eventData.page_referrer || '',

      // Timestamp
      timestamp_micros: (Date.now() * 1000).toString(),

      // Custom parameters
      ...eventData
    };

    // Send to Worker via fetch
    await fetch(CONFIG.WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    log(`Event forwarded: ${eventName}`, eventData);

  } catch (err) {
    error(`Failed to forward event: ${eventName}`, err);
  }
}

// ============= EVENT MAPPERS =============

/**
 * Map Shopify event to GA4 format
 */
function mapEventToGA4(shopifyEvent) {
  const eventName = shopifyEvent.name;
  const data = shopifyEvent.data || {};
  const context = shopifyEvent.context || {};

  // Base event data
  const ga4Event = {
    // Page context
    page_location: context.document?.location?.href || '',
    page_title: context.document?.title || '',
    page_referrer: context.document?.referrer || ''
  };

  // Map event-specific data
  switch (eventName) {
    case 'page_viewed':
      // Already have page data
      break;

    case 'product_viewed':
      const product = data.productVariant?.product;
      const variant = data.productVariant;
      if (product) {
        ga4Event.product_id = product.id?.toString() || '';
        ga4Event.product_name = product.title || '';
        ga4Event.product_type = product.type || '';
        ga4Event.product_vendor = product.vendor || '';
        ga4Event.variant_id = variant?.id?.toString() || '';
        ga4Event.variant_name = variant?.title || '';
        ga4Event.price = variant?.price?.amount || '';
        ga4Event.currency = variant?.price?.currencyCode || CONFIG.DEFAULT_CURRENCY;
      }
      break;

    case 'product_added_to_cart':
      const cartLine = data.cartLine;
      if (cartLine) {
        const cartProduct = cartLine.merchandise?.product;
        const cartVariant = cartLine.merchandise;
        ga4Event.product_id = cartProduct?.id?.toString() || '';
        ga4Event.product_name = cartProduct?.title || '';
        ga4Event.variant_id = cartVariant?.id?.toString() || '';
        ga4Event.variant_name = cartVariant?.title || '';
        ga4Event.price = cartVariant?.price?.amount || '';
        ga4Event.quantity = cartLine.quantity?.toString() || '1';
        ga4Event.currency = cartVariant?.price?.currencyCode || CONFIG.DEFAULT_CURRENCY;
      }
      break;

    case 'checkout_started':
      const checkout = data.checkout;
      if (checkout) {
        ga4Event.cart_total = checkout.totalPrice?.amount || '';
        ga4Event.currency = checkout.totalPrice?.currencyCode || CONFIG.DEFAULT_CURRENCY;
        ga4Event.item_count = checkout.lineItems?.length?.toString() || '0';
      }
      break;

    case 'checkout_completed':
    case 'payment_info_submitted':
      const checkoutComplete = data.checkout;
      if (checkoutComplete) {
        ga4Event.transaction_id = checkoutComplete.order?.id?.toString() || '';
        ga4Event.transaction_total = checkoutComplete.totalPrice?.amount || '';
        ga4Event.currency = checkoutComplete.totalPrice?.currencyCode || CONFIG.DEFAULT_CURRENCY;
        ga4Event.tax = checkoutComplete.totalTax?.amount || '';
        ga4Event.shipping = checkoutComplete.shippingLine?.price?.amount || '';
      }
      break;

    case 'collection_viewed':
      const collection = data.collection;
      if (collection) {
        ga4Event.collection_id = collection.id?.toString() || '';
        ga4Event.collection_name = collection.title || '';
      }
      break;

    case 'search_submitted':
      const search = data.searchResult;
      if (search) {
        ga4Event.search_term = search.query || '';
      }
      break;
  }

  return ga4Event;
}

// ============= INITIALIZATION =============

/**
 * Initialize server-side tracking
 */
(async function init() {
  try {
    log('Initializing server-side Custom Pixel v3.1.0...');

    // Subscribe to all Shopify events
    analytics.subscribe('all_events', async (event) => {
      try {
        log(`Received event: ${event.name}`, event);

        // Map Shopify event to GA4 format
        const ga4EventData = mapEventToGA4(event);

        // Forward to Worker for server-side processing
        await forwardEventToWorker(event.name, ga4EventData);

      } catch (err) {
        error(`Failed to process event: ${event.name}`, err);
      }
    });

    log('Initialized ✓ Server-side Custom Pixel active');

  } catch (err) {
    error('Initialization failed', err);
  }
})();
