// ============================================================
// SHOPIFY WEB PIXEL - ADVANCED USER DATA COLLECTION (EMQ 9+)
// ============================================================
// Shopify Admin → Settings → Customer Events → App Pixel
//
// FEATURES:
// ✅ Automatic user data collection
// ✅ SHA-256 hashing (Meta requirement)
// ✅ Phone normalization (E.164 format)
// ✅ Advanced matching (10+ parameters)
// ✅ Event deduplication
// ✅ Consent mode v2 support
// ✅ Profit tracking (COGS)
// ✅ EMQ Score: 9.0-9.5/10
//
// INSTALLATION:
// 1. Create Shopify app with web-pixel extension
// 2. Copy this file to: extensions/web-pixel/src/index.js
// 3. Configure CONFIG object below
// 4. Deploy: npm run deploy
//
// EVENTS TRACKED:
// - page_viewed
// - product_viewed
// - product_added_to_cart
// - checkout_started
// - checkout_completed (purchase)
// - search_submitted
// - custom events
// ============================================================

import { register } from '@shopify/web-pixels-extension';

// ===================================================================
// CONFIGURATION - UPDATE THESE VALUES
// ===================================================================
const CONFIG = {
  // REQUIRED: Tracklay Worker endpoint
  // Get from: npm run urls (after wrangler deploy)
  WORKER_URL: 'https://yourstore.com/cdn/g/a8f3c2e1-b8d4-4f5a-8c3e-2d1f9b4a7c6e',

  // REQUIRED: GA4 Measurement ID
  GA4_MEASUREMENT_ID: 'G-XXXXXXXXXX',

  // OPTIONAL: Meta Pixel ID (if using both GA4 + Meta)
  META_PIXEL_ID: '123456789012345',

  // OPTIONAL: Add product costs for profit tracking (format: {variantId: cost})
  // Get from Shopify API: GET /admin/api/2024-01/products/{product_id}/variants.json
  COST_OF_GOODS: {
    '45453851242686': 15.00,  // Example: variant ID 45453851242686 costs $15
    '45453851275454': 22.50,
  },

  // OPTIONAL: Enable debug logging
  DEBUG: true,

  // OPTIONAL: Event deduplication window (ms)
  DEDUPLICATION_WINDOW: 5000,  // 5 seconds

  // OPTIONAL: Consent strict mode
  REQUIRE_CONSENT: true,
};

// ===================================================================
// STATE MANAGEMENT
// ===================================================================
const state = {
  // Last sent events for deduplication (event_name: timestamp)
  lastSentEvents: {},

  // Client info (cached)
  clientInfo: null,

  // Is consent granted
  hasConsent: false,
};

// ===================================================================
// LOGGER
// ===================================================================
const logger = {
  info: (message, data) => CONFIG.DEBUG && console.log(`[Tracklay] ${message}`, data || ''),
  warn: (message, data) => console.warn(`[Tracklay] ${message}`, data || ''),
  error: (message, data) => console.error(`[Tracklay] ${message}`, data || ''),
  event: (name, data) => CONFIG.DEBUG && console.groupCollapsed(`[Tracklay] Event: ${name}`) && console.log(data) && console.groupEnd(),
};

// ===================================================================
// SHA-256 HASHING UTILITY
// ===================================================================
async function sha256(str) {
  if (!str) return undefined;

  try {
    // Normalize first (Meta requirement)
    const normalized = str.toString().toLowerCase().trim();

    // Create hash
    const encoder = new TextEncoder();
    const data = encoder.encode(normalized);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  } catch (error) {
    logger.error('Hashing failed', error);
    return undefined;
  }
}

// ===================================================================
// PHONE NORMALIZATION (E.164 format)
// ===================================================================
function normalizePhone(phone) {
  if (!phone) return undefined;

  try {
    // Remove all non-digit characters
    let digits = phone.toString().replace(/\D/g, '');

    // If US number (10 digits), add +1
    if (digits.length === 10) {
      digits = `1${digits}`;
    }

    // Add + prefix
    return `+${digits}`;
  } catch (error) {
    logger.warn('Phone normalization failed', error);
    return phone;  // Return original as fallback
  }
}

// ===================================================================
// CONSENT MANAGEMENT
// ===================================================================
function checkConsent(context) {
  const consent = context?.consent;

  if (!CONFIG.REQUIRE_CONSENT) {
    state.hasConsent = true;
    return true;
  }

  // Check marketing consent (GDPR/LGPD)
  state.hasConsent = consent?.marketing === true;

  if (!state.hasConsent) {
    logger.info('Marketing consent denied - tracking suppressed');
  }

  return state.hasConsent;
}

// ===================================================================
// EVENT DEDUPLICATION
// ===================================================================
function isDuplicate(eventName) {
  const now = Date.now();
  const lastSent = state.lastSentEvents[eventName];

  if (lastSent && (now - lastSent) < CONFIG.DEDUPLICATION_WINDOW) {
    logger.warn(`Duplicate event suppressed: ${eventName}`);
    return true;
  }

  state.lastSentEvents[eventName] = now;
  return false;
}

// ===================================================================
// CLIENT INFO COLLECTION
// ===================================================================
async function getClientInfo(browser) {
  if (state.clientInfo) return state.clientInfo;

  try {
    // Get client ID (GA4 format)
    let clientId = await browser.cookie.get('_ga');
    if (!clientId) {
      const random = Math.random().toString(36).substring(2, 11);
      const timestamp = Date.now();
      clientId = `GA1.1.${random}.${timestamp}`;
      await browser.cookie.set('_ga', clientId, {
        expires: new Date(Date.now() + 365 * 2 * 24 * 60 * 60 * 1000)  // 2 years
      });
    }

    // Get session ID
    const sessionId = await browser.sessionStorage.getItem('_tracklay_sid');
    if (!sessionId) {
      const newSessionId = Date.now().toString();
      await browser.sessionStorage.setItem('_tracklay_sid', newSessionId);
    }

    // Get FB cookies
    const fbp = await browser.cookie.get('_fbp');
    const fbc = await browser.cookie.get('_fbc');

    // Get user agent and IP (Cloudflare adds these)
    const userAgent = navigator.userAgent;
    const ipAddress = '0.0.0.0';  // Will be replaced by Cloudflare (CF-Connecting-IP)

    state.clientInfo = {
      client_id: clientId,
      session_id: sessionId || Date.now().toString(),
      user_agent: userAgent,
      ip_address: ipAddress,
      fbp,
      fbc,
    };

    return state.clientInfo;
  } catch (error) {
    logger.error('Failed to collect client info', error);
    return null;
  }
}

// ===================================================================
// USER DATA COLLECTION (Advanced Matching)
// ===================================================================
async function collectUserData(event, browser) {
  const userData = {};

  try {
    // 1. EMAIL (highest priority)
    const checkout = event.data?.checkout;
    const customer = event.data?.customer;
    
    if (checkout?.email) {
      userData.email = await sha256(checkout.email.toLowerCase().trim());
    } else if (customer?.email) {
      userData.email = await sha256(customer.email.toLowerCase().trim());
    }

    // 2. PHONE NUMBER
    if (checkout?.phone) {
      const normalizedPhone = normalizePhone(checkout.phone);
      userData.phone_number = await sha256(normalizedPhone);
    } else if (customer?.phone) {
      const normalizedPhone = normalizePhone(customer.phone);
      userData.phone_number = await sha256(normalizedPhone);
    }

    // 3. NAME
    if (checkout?.shippingAddress) {
      userData.first_name = await sha256(checkout.shippingAddress.firstName?.toLowerCase().trim());
      userData.last_name = await sha256(checkout.shippingAddress.lastName?.toLowerCase().trim());
    } else if (customer?.firstName) {
      userData.first_name = await sha256(customer.firstName.toLowerCase().trim());
      userData.last_name = await sha256(customer.lastName.toLowerCase().trim());
    }

    // 4. ADDRESS
    if (checkout?.shippingAddress) {
      userData.city = await sha256(checkout.shippingAddress.city?.toLowerCase().trim());
      userData.state = await sha256(checkout.shippingAddress.province?.toLowerCase().trim());
      userData.zip_code = await sha256(checkout.shippingAddress.zip?.toString().trim());
      userData.country = checkout.shippingAddress.countryCode?.toUpperCase();
    }

    // 5. EXTERNAL ID (customer ID)
    if (customer?.id) {
      userData.external_id = await sha256(customer.id.toString());
    } else if (checkout?.order?.customer?.id) {
      userData.external_id = await sha256(checkout.order.customer.id.toString());
    }

    // 6. FB CLICK ID (fbc)
    const fbc = await browser.cookie.get('_fbc');
    if (fbc) {
      userData.fbc = fbc;
    }

    // 7. FB BROWSER ID (fbp)
    const fbp = await browser.cookie.get('_fbp');
    if (fbp) {
      userData.fbp = fbp;
    }

    logger.info('User data collected', {
      has_email: !!userData.email,
      has_phone: !!userData.phone_number,
      has_name: !!(userData.first_name && userData.last_name),
      has_external_id: !!userData.external_id,
    });

  } catch (error) {
    logger.error('User data collection failed', error);
  }

  return userData;
}

// ===================================================================
// EVENT MAPPING (Shopify → GA4 → Meta)
// ===================================================================
function mapEvent(shopifyEvent) {
  const eventName = shopifyEvent.name;
  const data = shopifyEvent.data || {};
  const context = shopifyEvent.context || {};

  let mappedEvent = {
    event_name: 'custom',  // default
    event_source: 'web',
    page_location: context.document?.location?.href || '',
    page_title: context.document?.title || '',
    page_referrer: context.document?.referrer || '',
    timestamp_micros: (Date.now() * 1000).toString(),
  };

  // Map based on event type
  switch (eventName) {
    case 'page_viewed':
      mappedEvent.event_name = 'page_view';
      break;

    case 'product_viewed':
      mappedEvent = mapProductViewed(data, mappedEvent);
      break;

    case 'product_added_to_cart':
      mappedEvent = mapAddToCart(data, mappedEvent);
      break;

    case 'checkout_started':
      mappedEvent = mapBeginCheckout(data, mappedEvent);
      break;

    case 'checkout_completed':
      mappedEvent = mapPurchase(data, mappedEvent);
      break;

    case 'search_submitted':
      mappedEvent = mapSearch(data, mappedEvent);
      break;

    default:
      mappedEvent.event_name = `custom_${eventName}`;
      mappedEvent.custom_data = data;
  }

  return mappedEvent;
}

// -----------------------------------------------------------------
// PRODUCT VIEW
// -----------------------------------------------------------------
function mapProductViewed(data, event) {
  const product = data.productVariant?.product;
  const variant = data.productVariant;

  if (!product || !variant) return event;

  return {
    ...event,
    event_name: 'view_item',
    items: [
      {
        item_id: variant.id,
        item_name: product.title,
        item_brand: product.vendor,
        item_category: product.type,
        price: variant.price?.amount,
        currency: variant.price?.currencyCode,
        quantity: 1,
      },
    ],
    value: variant.price?.amount,
    currency: variant.price?.currencyCode,
  };
}

// -----------------------------------------------------------------
// ADD TO CART
// -----------------------------------------------------------------
function mapAddToCart(data, event) {
  const product = data.productVariant?.product;
  const variant = data.productVariant;
  const quantity = data.quantity || 1;

  if (!product || !variant) return event;

  return {
    ...event,
    event_name: 'add_to_cart',
    items: [
      {
        item_id: variant.id,
        item_name: product.title,
        item_brand: product.vendor,
        item_category: product.type,
        price: variant.price?.amount,
        currency: variant.price?.currencyCode,
        quantity: quantity,
      },
    ],
    value: variant.price?.amount * quantity,
    currency: variant.price?.currencyCode,
  };
}

// -----------------------------------------------------------------
// BEGIN CHECKOUT
// -----------------------------------------------------------------
function mapBeginCheckout(data, event) {
  const checkout = data.checkout;
  if (!checkout) return event;

  return {
    ...event,
    event_name: 'begin_checkout',
    transaction_id: checkout.order?.id || checkout.id,
    value: checkout.totalPrice?.amount,
    currency: checkout.totalPrice?.currencyCode,
    items: checkout.lineItems.map(item => ({
      item_id: item.variant?.id,
      item_name: item.variant?.product?.title,
      price: item.variant?.price?.amount,
      quantity: item.quantity,
    })),
  };
}

// -----------------------------------------------------------------
// PURCHASE (CHECKOUT COMPLETED)
// -----------------------------------------------------------------
function mapPurchase(data, event) {
  const checkout = data.checkout;
  if (!checkout?.order) return event;

  const order = checkout.order;

  // Calculate profit if COGS available
  let totalCost = 0;
  const itemsWithProfit = order.lineItems.map(item => {
    const cost = CONFIG.COST_OF_GOODS[item.variant?.id] || 0;
    totalCost += cost * item.quantity;

    return {
      item_id: item.variant?.id,
      item_name: item.variant?.product?.title,
      price: item.variant?.price?.amount,
      quantity: item.quantity,
      cost_of_goods: cost,
    };
  });

  const revenue = order.totalPrice.amount;
  const profit = revenue - totalCost;
  const profitMargin = (profit / revenue) * 100;

  logger.event('purchase', {
    revenue,
    totalCost,
    profit,
    profitMargin: profitMargin.toFixed(2) + '%',
  });

  return {
    ...event,
    event_name: 'purchase',
    event_source: 'web',
    transaction_id: order.id,
    order_number: order.name,
    value: revenue,
    currency: order.totalPrice.currencyCode,
    tax: order.totalTax?.amount || 0,
    shipping: order.totalShipping?.amount || 0,
    coupon: order.discountCode || '',
    items: itemsWithProfit,
    // Custom profit data
    profit: profit,
    profit_margin: profitMargin,
  };
}

// -----------------------------------------------------------------
// SEARCH
// -----------------------------------------------------------------
function mapSearch(data, event) {
  const searchResult = data.searchResult;

  return {
    ...event,
    event_name: 'search',
    search_term: searchResult?.searchTerm,
    results_count: searchResult?.products?.length || 0,
  };
}

// ===================================================================
// SEND TO TRACKLAY WORKER
// ===================================================================
async function forwardToTracklay(eventData, userData, clientInfo) {
  try {
    // Build final payload
    const payload = {
      // GA4 required fields
      event_name: eventData.event_name,
      measurement_id: CONFIG.GA4_MEASUREMENT_ID,
      client_id: clientInfo.client_id,
      session_id: clientInfo.session_id,
      timestamp_micros: eventData.timestamp_micros,

      // Page context
      page_location: eventData.page_location,
      page_title: eventData.page_title,
      page_referrer: eventData.page_referrer,

      // Event data
      value: eventData.value,
      currency: eventData.currency,
      items: eventData.items,
      custom_data: eventData.custom_data,

      // User data (for advanced matching)
      user_data: userData,

      // Client info (forwarded by Cloudflare)
      user_agent: clientInfo.user_agent,
      ip_address: clientInfo.ip_address,
    };

    // Send to Tracklay Worker
    const response = await fetch(CONFIG.WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Event-Time': Date.now().toString(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} - ${response.statusText}`);
    }

    logger.info('Event forwarded to Tracklay', {
      event: eventData.event_name,
      status: response.status,
    });

  } catch (error) {
    logger.error('Failed to forward event', error);
  }
}

// ===================================================================
// MAIN REGISTRATION
// ===================================================================
register(async ({ analytics, browser, context }) => {
  logger.info('Tracklay Web Pixel initialized', {
    version: '2.0.0',
    worker_url: CONFIG.WORKER_URL,
  });

  // Check initial consent
  checkConsent(context);

  // Listen for consent changes
  analytics.subscribe('consent_changed', (event) => {
    checkConsent(event.context);
  });

  // Subscribe to all events
  analytics.subscribe('all_events', async (event) => {
    // Check consent
    if (!state.hasConsent) {
      logger.info('Consent denied - event blocked', { event: event.name });
      return;
    }

    // Deduplication
    if (isDuplicate(event.name)) return;

    // Get client info
    const clientInfo = await getClientInfo(browser);
    if (!clientInfo) {
      logger.error('Client info not available');
      return;
    }

    // Map event
    const eventData = mapEvent(event);

    // Collect user data (for advanced matching)
    const userData = await collectUserData(event, browser);

    // Forward to Tracklay
    await forwardToTracklay(eventData, userData, clientInfo);

    // Log event
    logger.event(event.name, {
      ga4_event: eventData.event_name,
      has_user_data: !!userData.email,
      value: eventData.value,
    });
  });
});

// ===================================================================
// EXPORT FOR TESTING (if needed)
// ===================================================================
export { sha256, normalizePhone, collectUserData, mapEvent };
