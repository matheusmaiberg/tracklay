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

const log = (msg, data) => CONFIG.DEBUG && console.log(`[GTM] ${msg}`, data ?? '');
const error = (msg, err) => console.error(`[GTM] ${msg}`, err ?? '');

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
 * Load GTM script from Worker using UUID
 * Two modes:
 * 1. Fixed UUID (recommended): Uses CONFIG.GOOGLE_UUID
 * 2. Dynamic UUID (advanced): Fetches from /endpoints API
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
