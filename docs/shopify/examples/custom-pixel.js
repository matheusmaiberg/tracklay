// ============================================================
// SHOPIFY CUSTOM PIXEL - GTM INTEGRATION (v3.0.0)
// ============================================================
// Shopify Admin → Settings → Customer Events → Add Custom Pixel
//
// v3.0.0 FEATURES:
// 1. UUID-based obfuscated routing (anti-ad-blocker)
// 2. Automatic UUID rotation support (weekly by default)
// 3. Dynamic UUID fetching from Worker /endpoints API
// 4. Zero manual configuration (UUIDs fetched automatically)
// 5. 100% first-party tracking (Worker → GTM Server → GA4)
//
// SETUP:
// 1. Deploy Tracklay Worker with GTM_SERVER_URL configured
// 2. Set ENDPOINTS_SECRET in Worker (wrangler secret put)
// 3. Update CONFIG.WORKER below with your domain and token
// 4. Paste this code in Shopify Custom Pixel
// ============================================================

const CONFIG = {
  GTM_ID: 'G' + 'T' + 'M-' + 'XXXXXXX', // Your GTM container ID
  WORKER: {
    DOMAIN: window.location.origin, // Auto-detect store domain
    ENDPOINTS_TOKEN: 'your-endpoints-secret-token-here', // Same as ENDPOINTS_SECRET in Worker
  },
  DEBUG: true,
  DEFAULT_CURRENCY: 'EUR'
};

const log = (msg, data) => CONFIG.DEBUG && console.log(`[GTM] ${msg}`, data ?? '');
const error = (msg, err) => console.error(`[GTM] ${msg}`, err ?? '');

// ============= DYNAMIC UUID FETCHING (v3.0.0) =============
let CACHED_ENDPOINTS = null;

/**
 * Fetch current UUIDs from Worker /endpoints API
 * Supports automatic UUID rotation (UUIDs change weekly by default)
 * @returns {Promise<Object>} { google: { uuid, script, endpoint }, facebook: {...} }
 */
const fetchEndpoints = async () => {
  if (CACHED_ENDPOINTS) return CACHED_ENDPOINTS;

  try {
    const url = `${CONFIG.WORKER.DOMAIN}/endpoints?token=${CONFIG.WORKER.ENDPOINTS_TOKEN}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    CACHED_ENDPOINTS = data;
    log('Endpoints fetched', data);
    return data;
  } catch (err) {
    error('Failed to fetch endpoints', err);
    throw err;
  }
};

/**
 * Build proxy URL using dynamic UUID from /endpoints
 * @param {string} containerId - GTM container ID (e.g., 'GTM-XXXXXXX')
 * @returns {Promise<string>} Full script URL with UUID
 */
const buildProxyUrl = async (containerId) => {
  const endpoints = await fetchEndpoints();
  const { google } = endpoints;
  return `${CONFIG.WORKER.DOMAIN}${google.script}?id=${containerId}`;
};

const MARKETING_EVENTS = new Set(['product_added_to_cart', 'checkout_started', 'checkout_completed']);

// ============= UTILS =============
const toFloat = (val) => {
  const num = parseFloat(val);
  return isNaN(num) ? undefined : num;
};

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
 * Load GTM script from Worker using dynamic UUID
 * Fetches current UUID from /endpoints API (supports rotation)
 * Worker automatically injects transport_url for 100% first-party tracking
 */
const loadGTM = async () => {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

    // Fetch current UUID and build script URL
    const scriptUrl = await buildProxyUrl(CONFIG.GTM_ID);

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
    customer_email: checkout?.email,
    customer_phone: checkout?.phone,

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

const shouldTrack = (eventName) => {
  const consent = getConsent();
  return MARKETING_EVENTS.has(eventName) ? consent.marketing : consent.analytics;
};

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
(async function() {
  try {
    log('Initializing (v3.0.0)...');

    // Load GTM with dynamic UUID (async)
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
