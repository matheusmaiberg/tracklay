// ============================================================
// SHOPIFY CUSTOM PIXEL - GTM INTEGRATION
// ============================================================
// Shopify Admin → Settings → Customer Events → Add Custom Pixel
//
// SIMPLE APPROACH:
// 1. Load GTM from proxy
// 2. Subscribe to all_events
// 3. Extract ALL available data
// 4. Push to dataLayer (GTM handles mapping)
// ============================================================

const CONFIG = {
  GTM_ID: 'GTM-XXXXXXX',
  PROXY: {
      DOMAIN: 'https://cdn.suevich.com',
      PATH: '/cdn/',
      FILE: 'gtm.js',
  },
  DEBUG: true,
  DEFAULT_CURRENCY: 'EUR'
};

const log = (msg, data) => CONFIG.DEBUG && console.log(`[GTM] ${msg}`, data ?? '');
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

// ============= LOAD GTM =============
const loadGTM = () => {
  try {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': Date.now(), event: 'gtm.js' });

    const script = document.createElement('script');
    script.async = true;
    script.src = `${CONFIG.PROXY_DOMAIN}?id=${CONFIG.GTM_ID}`;

    const firstScript = document.getElementsByTagName('script')[0];
    firstScript.parentNode.insertBefore(script, firstScript);

    log('GTM loaded');
  } catch (e) {
    console.error('[GTM] Load failed', e);
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
    console.error('[GTM] Consent update failed', e);
  }
};

// ============= INIT =============
(function() {
  try {
    log('Initializing...');

    loadGTM();
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

    log('Initialized ✓');
  } catch (e) {
    console.error('[GTM] Init failed', e);
  }
})();
