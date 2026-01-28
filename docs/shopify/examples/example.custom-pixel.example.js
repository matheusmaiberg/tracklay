// ============================================================
// SHOPIFY CUSTOM PIXEL - GTM INTEGRATION (v3.0.0)
// ============================================================
// Shopify Admin → Settings → Customer Events → Add Custom Pixel
//
// v3.0.0 FEATURES:
// 1. UUID-based obfuscated routing (anti-ad-blocker)
// 2. 100% first-party tracking (Worker → GTM Server → GA4)
// 3. Automatic transport_url injection (Worker handles everything)
// 4. Uses window.location.origin (no hardcoded domains)
// 5. Simple setup with fixed UUIDs (recommended)
//
// SETUP (RECOMMENDED - Fixed UUIDs):
// 1. Configure routes in wrangler.toml:
//    [[routes]]
//    pattern = "yourstore.com/cdn/*"
//    zone_name = "yourstore.com"
//
// 2. Deploy Tracklay Worker with:
//    - GTM_SERVER_URL = 'https://gtm.yourstore.com'
//    - ENDPOINTS_UUID_ROTATION = 'false' (UUIDs fixed, no rotation)
//    - AUTO_INJECT_TRANSPORT_URL = 'true' (automatic injection)
//
// 3. Get your UUID: node scripts/get-urls.js
// 4. Update CONFIG.GOOGLE_UUID below with your UUID
// 5. Paste this code in Shopify Custom Pixel
//
// BENEFITS:
// - Zero maintenance (UUIDs never change)
// - No ENDPOINTS_SECRET required (more secure)
// - Worker auto-injects transport_url (100% first-party)
// - Uses window.location.origin (no hardcoded domains)
// - 95%+ ad-blocker bypass
//
// ADVANCED: Dynamic UUID Rotation (Optional)
// - Set ENDPOINTS_UUID_ROTATION = 'true' in Worker
// - Set ENDPOINTS_SECRET in Worker (wrangler secret put)
// - Uncomment CONFIG.ENDPOINTS_TOKEN below
// - UUIDs rotate automatically weekly
// ============================================================

/**
 * @typedef {Object} ConfigObject
 * @property {string} GTM_ID - Google Tag Manager container ID (format: 'GTM-XXXXX' or just 'XXXXX')
 * @property {string} WORKER_DOMAIN - Base URL for Tracklay Worker deployment
 * @property {string} GOOGLE_UUID - Fixed UUID for obfuscated GTM routing (recommended approach)
 * @property {string} [ENDPOINTS_TOKEN] - Optional token for dynamic UUID rotation (advanced setup)
 * @property {boolean} DEBUG - Enable/disable debug logging to console
 * @property {string} DEFAULT_CURRENCY - Fallback currency code (ISO 4217) when not available from event
 * @typecheck {ConfigObject}
 */
const CONFIG = {
  GTM_ID: 'MJ7DW8H', // Your GTM container ID

  // Worker domain (where Tracklay Worker is deployed)
  // This is NOT the GTM Server URL - Worker handles that internally
  // Examples:
  // - Cloudflare Workers: 'https://tracklay.yourcompany.workers.dev'
  // - Custom domain: 'https://cdn.yourstore.com'
  // - Same domain (with routes): Use window.location.origin in loadGTM()
  WORKER_DOMAIN: 'https://cdn.suevich.com', // Replace with your Worker domain

  // ✅ RECOMMENDED: Fixed UUID (simpler, more secure)
  // Get your UUID with: node scripts/get-urls.js
  // Set ENDPOINTS_UUID_ROTATION=false in Worker (fixed UUIDs)
  GOOGLE_UUID: 'b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f', // Replace with your UUID

  // ⚠️ ADVANCED: Dynamic UUID Rotation (Uncomment if needed)
  // Requires: ENDPOINTS_UUID_ROTATION=true (rotation) + ENDPOINTS_SECRET in Worker
  // NOT RECOMMENDED: Exposes ENDPOINTS_SECRET in client code
  // ENDPOINTS_TOKEN: 'your-endpoints-secret-token-here',

  DEBUG: true,
  DEFAULT_CURRENCY: 'EUR'
};

/**
 * Logs debug messages to console if DEBUG mode is enabled.
 * All log messages are prefixed with '[GTM]' for easy filtering in browser console.
 *
 * @function log
 * @param {string} msg - Message to log (will be prefixed with '[GTM]')
 * @param {*} [data] - Optional data object or value to log alongside message
 * @returns {void} Logs to console if CONFIG.DEBUG is true, otherwise no-op
 * @example
 * log('GTM loaded', { container: 'GTM-XXXXX' });
 * // Output: [GTM] GTM loaded {container: 'GTM-XXXXX'}
 * @typecheck {function}
 */
const log = (msg, data) => CONFIG.DEBUG && console.log(`[GTM] ${msg}`, data ?? '');

/**
 * Logs error messages to console unconditionally.
 * All error messages are prefixed with '[GTM]' for consistent error tracking.
 * Errors are logged regardless of DEBUG setting to ensure visibility of failures.
 *
 * @function error
 * @param {string} msg - Error message to log (will be prefixed with '[GTM]')
 * @param {Error|*} [err] - Error object or additional context to log
 * @returns {void} Always logs to console.error
 * @example
 * error('Failed to load GTM', new Error('Network timeout'));
 * // Output: [GTM] Failed to load GTM Error: Network timeout
 * @typecheck {function}
 */
const error = (msg, err) => console.error(`[GTM] ${msg}`, err ?? '');

/**
 * Set of event names that require marketing consent to track.
 * All other events use analytics consent. Events in this set trigger the stricter
 * marketing consent check rather than the general analytics consent check.
 *
 * Event types:
 * - 'product_added_to_cart': User added product to shopping cart (conversion intent)
 * - 'checkout_started': User initiated checkout flow (funnel event)
 * - 'checkout_completed': User completed purchase (transaction)
 *
 * @type {Set<string>}
 * @example
 * MARKETING_EVENTS.has('product_added_to_cart') // true
 * MARKETING_EVENTS.has('product_viewed') // false
 * @typecheck {Set<string>}
 */
const MARKETING_EVENTS = new Set(['product_added_to_cart', 'checkout_started', 'checkout_completed']);

// ============= UTILS =============

/**
 * Safely converts a value to a float number with NaN checking.
 * Returns undefined instead of NaN to prevent invalid data in tracking events.
 * Useful for currency amounts, quantities, and other numeric values.
 *
 * @function toFloat
 * @param {*} val - Value to convert (string, number, or any type)
 * @returns {number|undefined} Parsed float if conversion succeeds, undefined if value is NaN
 * @example
 * toFloat('19.99') // 19.99
 * toFloat(42) // 42
 * toFloat('invalid') // undefined
 * toFloat(null) // undefined
 * @typecheck {function}
 */
const toFloat = (val) => {
  const num = parseFloat(val);
  return isNaN(num) ? undefined : num;
};

/**
 * Recursively cleans objects by removing empty, null, undefined, and NaN values.
 * Produces a compact event payload by filtering out falsy or meaningless data.
 *
 * Removes:
 * - null and undefined values
 * - Empty strings ('')
 * - NaN values
 * - Empty arrays ([])
 * - Empty objects ({})
 *
 * Recursion:
 * - Processes arrays element by element, then filters empty elements
 * - Processes object values recursively, then filters empty entries
 * - Primitives pass through unchanged (strings, numbers, booleans)
 *
 * @function clean
 * @param {*} obj - Value to clean (object, array, or primitive)
 * @returns {*} Cleaned value (same type as input, or undefined if completely empty)
 * @returns {undefined} If input is null/undefined/falsy (except arrays/objects)
 * @returns {Array<*>} If input is array (filtered for non-null values)
 * @returns {Object} If input is object (filtered for non-empty values)
 * @example
 * clean({
 *   name: 'John',
 *   email: '',
 *   phone: null,
 *   address: { city: 'NYC', zip: '' }
 * })
 * // Returns: { name: 'John', address: { city: 'NYC' } }
 *
 * clean([1, null, 'text', undefined, 0])
 * // Returns: [1, 'text', 0]
 *
 * clean(null) // Returns: null
 * @typecheck {function}
 */
const clean = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(clean).filter(v => v != null);

  return Object.fromEntries(
    Object.entries(obj)
      .map(([k, v]) => [k, clean(v)])
      .filter(([_, v]) =>
        v != null &&
        v !== '' &&
        !Number.isNaN(v) &&
        !(Array.isArray(v) && !v.length) &&
        !(typeof v === 'object' && !Object.keys(v).length)
      )
  );
};

// ============= LOAD GTM (v3.0.0) =============

/**
 * Asynchronously loads Google Tag Manager with UUID-based obfuscated routing.
 * Implements v3.0.0 anti-ad-blocker strategy using Worker-hosted script endpoints.
 *
 * Supports two routing modes:
 * 1. FIXED UUID (recommended): Uses CONFIG.GOOGLE_UUID - simple, secure, no maintenance
 * 2. DYNAMIC UUID (advanced): Fetches current UUID from Worker /endpoints API with rotation
 *
 * UUID Behavior:
 * - Fixed UUID: Always routes through /cdn/g/{GOOGLE_UUID}?c={GTM_ID}
 *   Worker converts ?c=XXXXX to ?id=GTM-XXXXX automatically
 * - Dynamic UUID: Attempts to fetch from /endpoints?token={TOKEN}
 *   Falls back to fixed UUID if fetch fails (network error, timeout)
 *
 * Execution Flow:
 * 1. Initialize window.dataLayer with gtm.js event
 * 2. Determine script URL (fixed or dynamic)
 * 3. Create async script tag with src=scriptUrl
 * 4. Inject script into DOM (before first existing script)
 * 5. Log success or error
 *
 * @async
 * @function loadGTM
 * @returns {Promise<void>} Resolves when script is injected (loading may still be pending)
 * @throws {Error} Caught internally and logged, does not re-throw
 * @example
 * // Fixed UUID mode (recommended)
 * await loadGTM();
 * // Loads: https://cdn.suevich.com/cdn/g/b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f?c=MJ7DW8H
 *
 * // Dynamic UUID mode (if CONFIG.ENDPOINTS_TOKEN is set)
 * // Fetches from: https://cdn.suevich.com/endpoints?token=secret-token
 * // Then loads fetched endpoint or falls back to fixed UUID
 * @typecheck {function}
 */
const loadGTM = async () => {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

    let scriptUrl;

    // Extract short GTM ID (GTM-XXXXX → XXXXX)
    const shortId = CONFIG.GTM_ID.replace('GTM-', '');

    // Check if using dynamic UUID rotation
    if (CONFIG.ENDPOINTS_TOKEN) {
      // ADVANCED: Fetch current UUID from Worker /endpoints API
      try {
        const url = `${CONFIG.WORKER_DOMAIN}/endpoints?token=${CONFIG.ENDPOINTS_TOKEN}`;
        const response = await fetch(url);
        const data = await response.json();
        scriptUrl = `${CONFIG.WORKER_DOMAIN}${data.google.script}?c=${shortId}`;
        log('Dynamic UUID fetched', data);
      } catch (err) {
        error('Failed to fetch dynamic UUID, falling back to fixed UUID', err);
        scriptUrl = `${CONFIG.WORKER_DOMAIN}/cdn/g/${CONFIG.GOOGLE_UUID}?c=${shortId}`;
      }
    } else {
      // RECOMMENDED: Use fixed UUID with obfuscated container ID
      // Worker auto-converts ?c=XXXXX to ?id=GTM-XXXXX
      scriptUrl = `${CONFIG.WORKER_DOMAIN}/cdn/g/${CONFIG.GOOGLE_UUID}?c=${shortId}`;
    }

    const script = document.createElement('script');
    script.async = true;
    script.src = scriptUrl;

    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(script, firstScript);

    log('GTM loaded from', scriptUrl);
  } catch (e) {
    error('Load failed', e);
  }
};

// ============= BUILD ITEM =============

/**
 * Builds a GA4 ecommerce item object from product, variant, and price data.
 * Returns null if product is missing (prevents incomplete item creation).
 * Quantities default to 1 if not specified.
 *
 * GA4 Item Schema Fields:
 * - item_id: Product ID (stringified from numeric ID)
 * - item_name: Product title
 * - item_variant: Variant title/name
 * - item_brand: Product vendor
 * - item_category: Product type
 * - price: Unit price (converted to float)
 * - quantity: Number of units (defaults to 1)
 *
 * @function buildItem
 * @param {Object|null} product - Product object with id, title, vendor, type
 * @param {Object|null} variant - Variant object with title and price
 * @param {Object|null} price - Price object with amount and currencyCode
 * @param {number} [qty=1] - Quantity of items (defaults to 1)
 * @returns {Object|null} GA4 item object, or null if product is missing
 * @example
 * const item = buildItem(
 *   { id: 123, title: 'T-Shirt', vendor: 'Brand A', type: 'Apparel' },
 *   { title: 'Red, M', price: { amount: '29.99' } },
 *   { amount: '29.99' },
 *   2
 * );
 * // Returns: {
 * //   item_id: '123',
 * //   item_name: 'T-Shirt',
 * //   item_variant: 'Red, M',
 * //   item_brand: 'Brand A',
 * //   item_category: 'Apparel',
 * //   price: 29.99,
 * //   quantity: 2
 * // }
 * @typecheck {function}
 */
const buildItem = (product, variant, price, qty = 1) => product && ({
  item_id: product.id?.toString(),
  item_name: product.title,
  item_variant: variant?.title,
  item_brand: product.vendor,
  item_category: product.type,
  price: toFloat(price?.amount),
  quantity: qty
});

// ============= BUILD BODY =============

/**
 * Builds a complete GA4 event payload from a Shopify analytics event.
 * Extracts and structures data from multiple sources within the event,
 * handling different event types (product views, cart changes, checkouts, etc).
 *
 * Data Extraction Logic:
 * - Event metadata: name, id from event root
 * - Page data: title, location, path, referrer from event.context.document
 * - Customer data: id, email, phone, address from event.data.checkout
 * - Product data: id, title, vendor, type, variant from event.data.productVariant
 * - Cart data: total amount and id from event.data.cart
 * - Collection data: id and title from event.data.collection
 * - Search data: query from event.data.searchResult
 * - Items: Built from productVariant, cartLine, or checkout.lineItems
 * - Currency/Value: Currency code and transaction value intelligently sourced
 * - Transaction: Order data, tax, shipping, discount from checkout
 *
 * Items Array Construction:
 * 1. Extracts item from productVariant (single product view/detail)
 * 2. Extracts item from cartLine (single cart modification)
 * 3. Extracts items from checkout.lineItems (all items in order)
 * 4. Filters out null/undefined items
 * 5. Returns array (empty array becomes undefined after clean())
 *
 * @function buildBody
 * @param {Object} event - Shopify analytics event
 * @param {string} event.name - Event name (e.g., 'product_viewed', 'checkout_completed')
 * @param {string} event.id - Unique event ID
 * @param {Object} event.data - Event-specific data (varies by event type)
 * @param {Object} event.context - Event context (document, window, etc)
 * @returns {Object} Cleaned GA4 event payload with all extracted fields
 * @returns {Object|undefined} Returns undefined only if completely empty after cleaning
 * @example
 * const event = {
 *   name: 'product_added_to_cart',
 *   id: 'evt-123',
 *   data: {
 *     cartLine: {
 *       quantity: 2,
 *       merchandise: {
 *         product: { id: 456, title: 'Blue Jeans', vendor: 'Denim Co', type: 'Clothing' },
 *         title: 'Blue, 32',
 *         price: { amount: '89.99' }
 *       }
 *     }
 *   },
 *   context: { document: { title: 'Shop - Page', location: { href: 'https://shop.com' } } }
 * };
 * const payload = buildBody(event);
 * // Returns: {
 * //   event: 'product_added_to_cart',
 * //   event_id: 'evt-123',
 * //   page_title: 'Shop - Page',
 * //   page_location: 'https://shop.com',
 * //   items: [{ item_id: '456', item_name: 'Blue Jeans', ... }],
 * //   currency: 'EUR',
 * //   value: 89.99,
 * //   ...
 * // }
 * @typecheck {function}
 */
const buildBody = (event) => {
  const d = event.data || {};
  const ctx = event.context || {};

  // Extract sources
  const pv = d.productVariant;
  const cartLine = d.cartLine;
  const cart = d.cart;
  const collection = d.collection;
  const checkout = d.checkout;
  const search = d.searchResult;

  // Build items from all sources
  const items = [
    buildItem(pv?.product, pv, pv?.price),
    buildItem(cartLine?.merchandise?.product, cartLine?.merchandise, cartLine?.merchandise?.price, cartLine?.quantity),
    ...(checkout?.lineItems?.map(item =>
      buildItem(item.variant?.product, item.variant, item.variant?.price, item.quantity)
    ) || [])
  ].filter(Boolean);

  // Universal body - extract everything
  return clean({
    event: event.name,
    event_id: event.id,

    // Page
    page_title: ctx.document?.title,
    page_location: ctx.document?.location?.href,
    page_path: ctx.document?.location?.pathname,
    page_referrer: ctx.document?.referrer,

    // Customer
    customer_id: checkout?.order?.customer?.id || init.customer?.id,
    customer_email: checkout?.email,
    customer_phone: checkout?.phone,
    customer_city: checkout?.shippingAddress?.city,
    customer_address: checkout?.shippingAddress?.address1,
    customer_address2: checkout?.shippingAddress?.address2,
    customer_zipcode: checkout?.shippingAddress?.zip,
    customer_country: checkout?.shippingAddress?.country,
    customer_province: checkout?.shippingAddress?.province,
    // Collection
    collection_id: collection?.id?.toString(),
    collection_title: collection?.title,

    // Cart
    cart_total: toFloat(cart?.cost?.totalAmount?.amount),
    cart_id: cart?.id,

    // Search
    search_term: search?.query,

    // Product (from productVariant)
    product_id: pv?.product?.id?.toString(),
    product_title: pv?.product?.title,
    product_vendor: pv?.product?.vendor,
    product_type: pv?.product?.type,
    variant_id: pv?.id?.toString(),
    variant_title: pv?.title,

    // Ecommerce
    currency: pv?.price?.currencyCode ??
              cartLine?.cost?.totalAmount?.currencyCode ??
              cart?.cost?.totalAmount?.currencyCode ??
              checkout?.totalPrice?.currencyCode ??
              CONFIG.DEFAULT_CURRENCY,

    value: toFloat(
      pv?.price?.amount ??
      cartLine?.cost?.totalAmount?.amount ??
      checkout?.totalPrice?.amount
    ),

    // Transaction (checkout/purchase)
    transaction_id: checkout?.order?.id?.toString(),
    affiliation: checkout?.order && 'Shopify',
    tax: toFloat(checkout?.totalTax?.amount),
    shipping: toFloat(checkout?.shippingLine?.price?.amount),
    discount: toFloat(checkout?.discountsAmount?.amount),

    // Items
    items: items.length ? items : undefined
  });
};

// ============= CONSENT =============

/**
 * Retrieves current visitor consent status from Shopify's Customer Privacy API.
 * Returns sensible defaults (marketing: true, analytics: true) if API is unavailable.
 * This graceful degradation ensures tracking continues even if privacy API fails.
 *
 * Consent Properties:
 * - marketing: Allows ad/conversion tracking, GDPR "marketing" consent
 * - analytics: Allows analytics/measurement, GDPR "analytics" consent
 *
 * @function getConsent
 * @returns {Object} Consent status object
 * @returns {boolean} consent.marketing - Marketing/advertising consent flag
 * @returns {boolean} consent.analytics - Analytics/measurement consent flag
 * @throws {Error} Caught internally, defaults returned on any error
 * @example
 * const consent = getConsent();
 * console.log(consent);
 * // { marketing: true, analytics: false }
 * @typecheck {function}
 */
const getConsent = () => {
  try {
    if (!init.customerPrivacy) return { marketing: true, analytics: true };
    return {
      marketing: init.customerPrivacy.marketingAllowed,
      analytics: init.customerPrivacy.analyticsProcessingAllowed
    };
  } catch {
    return { marketing: true, analytics: true };
  }
};

/**
 * Determines if a given event should be tracked based on current consent status.
 * Marketing events require stricter marketing consent, other events use analytics consent.
 *
 * Decision Logic:
 * - If event is in MARKETING_EVENTS: requires consent.marketing
 * - Otherwise: requires consent.analytics
 *
 * @function shouldTrack
 * @param {string} eventName - Name of the event to check (e.g., 'product_viewed')
 * @returns {boolean} True if event should be tracked under current consent, false otherwise
 * @example
 * shouldTrack('product_added_to_cart'); // Uses consent.marketing
 * shouldTrack('product_viewed');         // Uses consent.analytics
 * @typecheck {function}
 */
const shouldTrack = (eventName) => {
  const consent = getConsent();
  return MARKETING_EVENTS.has(eventName) ? consent.marketing : consent.analytics;
};

/**
 * Pushes current consent status to dataLayer as a GTM consent_update event.
 * Should be called on page load and whenever consent status changes.
 * Maps Shopify consent flags to GTM/GA4 consent mode parameters.
 *
 * Consent Mapping:
 * - marketing → ad_storage, ad_user_data, ad_personalization
 * - analytics → analytics_storage
 *
 * @function updateConsent
 * @returns {void}
 * @throws {Error} Caught internally and logged, does not prevent other operations
 * @example
 * updateConsent();
 * // Pushes to dataLayer:
 * // {
 * //   event: 'consent_update',
 * //   ad_storage: 'granted',
 * //   analytics_storage: 'granted',
 * //   ad_user_data: 'granted',
 * //   ad_personalization: 'granted'
 * // }
 * @typecheck {function}
 */
const updateConsent = () => {
  try {
    const consent = getConsent();
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({
      event: 'consent_update',
      ad_storage: consent.marketing ? 'granted' : 'denied',
      analytics_storage: consent.analytics ? 'granted' : 'denied',
      ad_user_data: consent.marketing ? 'granted' : 'denied',
      ad_personalization: consent.marketing ? 'granted' : 'denied'
    });
  } catch (e) {
    error('Consent update failed', e);
  }
};

// ============= INIT (v3.0.0) =============

/**
 * Initializes GTM tracking with Shopify analytics event subscription.
 * Runs as an async IIFE at page load to set up all tracking infrastructure.
 *
 * Initialization Sequence (v3.0.0):
 * 1. Load GTM script asynchronously with UUID-based routing
 * 2. Push initial consent status to dataLayer
 * 3. Subscribe to Shopify privacy consent change events
 * 4. Subscribe to all Shopify analytics events
 * 5. Filter events based on consent and process allowed events
 * 6. Build GA4 payloads and push to dataLayer
 * 7. Log completion
 *
 * Event Processing:
 * - All events pass through shouldTrack() consent filter
 * - Only events matching current consent are processed
 * - buildBody() extracts and structures event data
 * - clean() removes empty/null values from payload
 * - Resulting payload pushed to window.dataLayer
 *
 * @async
 * @function IIFE
 * @returns {Promise<void>} Resolves when initialization completes
 * @throws {Error} Caught internally and logged, initialization continues
 * @example
 * // Auto-executes on script load:
 * // 1. Loads GTM from Worker
 * // 2. Sets up consent tracking
 * // 3. Subscribes to analytics events
 * // 4. Logs "[GTM] Initialized ✓ (v3.0.0 UUID-based routing active)"
 * @typecheck {function}
 */
(async function() {
  try {
    log('Initializing (v3.0.0)...');

    // Load GTM (async)
    await loadGTM();
    updateConsent();

    if (init.customerPrivacy?.subscribe) {
      init.customerPrivacy.subscribe('visitorConsentCollected', updateConsent);
    }

    analytics.subscribe('all_events', (event) => {
      if (!shouldTrack(event.name)) {
        log(`Skipped: ${event.name} (no consent)`);
        return;
      }

      const body = buildBody(event);
      if (body) {
        window.dataLayer = window.dataLayer || [];
        window.dataLayer.push(body);
        log(`${event.name}`, body);
      }
    });

    log('Initialized ✓ (v3.0.0 UUID-based routing active)');
  } catch (e) {
    error('Init failed', e);
  }
})();
