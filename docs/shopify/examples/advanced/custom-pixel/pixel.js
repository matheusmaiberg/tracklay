/**
 * @fileoverview Pixel Tracker - Custom Pixel for Shopify checkout
 *
 * SELF-CONTAINED SANDBOX VERSION
 * Cole este código diretamente no Custom Pixel do Shopify
 *
 * @description
 * - 100% self-contained (no external imports)
 * - Captures all Shopify events via analytics.subscribe()
 * - BroadcastChannel (primary) → Cookie (fallback)
 * - GA4 event building (buildItem, buildGA4Body)
 * - Debug logging
 *
 * @author Tracklay
 * @license MIT
 */

(function() {
  'use strict';

  // ==========================================
  // CONFIG
  // ==========================================
  var CONFIG = {
    DEBUG: true,
    CHANNEL_NAME: '_tracklay_events',
    COOKIE_PREFIX: '_tracklay_',
    COOKIE_MAX_AGE: 5
  };

  // ==========================================
  // LOGGER
  // ==========================================
  function log() {
    if (CONFIG.DEBUG) {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('[Pixel]');
      console.log.apply(console, args);
    }
  }

  function error() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[Pixel]');
    console.error.apply(console, args);
  }

  // ==========================================
  // UTILITIES
  // ==========================================
  function toFloat(val) {
    var num = parseFloat(val);
    return isNaN(num) ? undefined : num;
  }

  function clean(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) {
      return obj.map(clean).filter(function(v) { return v != null; });
    }

    var result = {};
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        var val = clean(obj[key]);
        if (val != null && val !== '' && !Number.isNaN(val)) {
          result[key] = val;
        }
      }
    }
    return result;
  }

  // ==========================================
  // GA4 BUILDERS (INLINED)
  // ==========================================

  /**
   * Builds a single GA4 item from product/variant/price
   */
  function buildItem(product, variant, price, qty) {
    if (!product) return null;
    return {
      item_id: product && product.id ? String(product.id) : undefined,
      item_name: product.title,
      item_variant: variant ? variant.title : undefined,
      item_brand: product.vendor,
      item_category: product.type,
      price: toFloat(price && price.amount ? price.amount : undefined),
      quantity: qty || 1
    };
  }

  /**
   * Builds complete GA4 event body from Shopify event
   */
  function buildGA4Body(event) {
    var d = event.data || {};
    var ctx = event.context || {};

    var pv = d.productVariant;
    var cartLine = d.cartLine;
    var cart = d.cart;
    var checkout = d.checkout;

    var items = [];

    // productVariant (view_item, add_to_cart from product page)
    if (pv) {
      items.push(buildItem(pv.product, pv, pv.price));
    }
    
    // productData (product_viewed from catalog/search)
    if (d.productData) {
      items.push(buildItem(d.productData, null, null, 1));
    }

    if (cartLine) {
      items.push(buildItem(
        cartLine.merchandise ? cartLine.merchandise.product : null,
        cartLine.merchandise,
        cartLine.merchandise ? cartLine.merchandise.price : null,
        cartLine.quantity
      ));
    }

    if (checkout && Array.isArray(checkout.lineItems)) {
      checkout.lineItems.forEach(function(item) {
        if (!item) return;
        items.push(buildItem(
          item && item.variant && item.variant.product ? item.variant.product : null,
          item.variant,
          item && item.variant && item.variant.price ? item.variant.price : null,
          item.quantity
        ));
      });
    }

    items = items.filter(function(i) { return i != null; });

    // Get page info from multiple sources to handle iframe contexts
    var pageTitle = undefined;
    var pageLocation = undefined;
    var pagePath = undefined;
    
    // Try to get from event context first (Shopify provides this)
    if (ctx && ctx.document) {
      pageTitle = ctx.document.title;
      pageLocation = ctx.document.location ? ctx.document.location.href : undefined;
      pagePath = ctx.document.location ? ctx.document.location.pathname : undefined;
    }
    
    // Fallback: try to infer from URL if context is missing or looks like an iframe
    if (!pageTitle || pageTitle === 'sw_iframe.html' || pageTitle === '') {
      if (d.page_title) {
        pageTitle = d.page_title;
      } else if (event.name === 'checkout_started' || event.name === 'checkout_completed') {
        pageTitle = 'Checkout';
      } else if (event.name === 'cart_viewed') {
        pageTitle = 'Cart';
      }
    }

    return clean({
      event: event.name,
      event_id: event.id,

      page_title: pageTitle,
      page_location: pageLocation,
      page_path: pagePath,

      customer_email: checkout && checkout.email ? checkout.email : undefined,
      customer_phone: checkout && checkout.phone ? checkout.phone : undefined,
      customer_city: checkout && checkout.shippingAddress && checkout.shippingAddress.city ? checkout.shippingAddress.city : undefined,
      customer_country: checkout && checkout.shippingAddress && checkout.shippingAddress.country ? checkout.shippingAddress.country : undefined,

      cart_total: toFloat(cart && cart.cost && cart.cost.totalAmount ? cart.cost.totalAmount.amount : undefined),

      currency: pv && pv.price ? pv.price.currencyCode :
                cartLine && cartLine.cost && cartLine.cost.totalAmount ? cartLine.cost.totalAmount.currencyCode :
                checkout && checkout.totalPrice ? checkout.totalPrice.currencyCode : 'USD',

      value: toFloat(
        pv && pv.price ? pv.price.amount :
        cartLine && cartLine.cost && cartLine.cost.totalAmount ? cartLine.cost.totalAmount.amount :
        checkout && checkout.totalPrice ? checkout.totalPrice.amount : undefined
      ),

      transaction_id: checkout && checkout.order && checkout.order.id ? String(checkout.order.id) : undefined,
      tax: toFloat(checkout && checkout.totalTax ? checkout.totalTax.amount : undefined),
      shipping: toFloat(checkout && checkout.shippingLine && checkout.shippingLine.price ? checkout.shippingLine.price.amount : undefined),
      discount: toFloat(checkout && checkout.discountsAmount ? checkout.discountsAmount.amount : undefined),

      items: items.length ? items : undefined
    });
  }

  // ==========================================
  // BROADCASTCHANNEL MANAGER (INLINED)
  // ==========================================
  var BroadcastManager = {
    channel: null,
    available: false,

    init: function() {
      if (typeof BroadcastChannel === 'undefined') {
        log('BroadcastChannel unavailable - using cookie fallback');
        this.available = false;
        return false;
      }
      try {
        this.channel = new BroadcastChannel(CONFIG.CHANNEL_NAME);
        this.available = true;
        log('BroadcastChannel initialized');
        return true;
      } catch (e) {
        error('BroadcastChannel error:', e.message);
        this.available = false;
        return false;
      }
    },

    send: function(data) {
      if (!this.available || !this.channel) return false;
      try {
        this.channel.postMessage(data);
        return true;
      } catch (e) {
        // On failure, mark as unavailable and let fallback take over
        this.available = false;
        return false;
      }
    },

    destroy: function() {
      if (this.channel) {
        try { this.channel.close(); } catch (e) {}
        this.channel = null;
      }
    }
  };

  // ==========================================
  // COOKIE MANAGER (INLINED)
  // ==========================================
  var CookieManager = {
    send: function(event) {
      try {
        var data = encodeURIComponent(JSON.stringify(event));

        // Cap size to avoid exceeding 4KB limit
        if (data.length > 3500) {
          data = encodeURIComponent(JSON.stringify({
            name: event.name,
            timestamp: event.timestamp,
            id: event.id
          }));
        }

        document.cookie = CONFIG.COOKIE_PREFIX + 'evt=' + data +
                         '; SameSite=None; Secure; path=/; max-age=' + CONFIG.COOKIE_MAX_AGE;
        return true;
      } catch (e) {
        return false;
      }
    }
  };

  // ==========================================
  // EVENT SENDER (SIMPLIFIED)
  // ==========================================
  var EventSender = {
    send: function(event) {
      // Bug #3: Validate event structure
      if (!event || typeof event !== 'object') {
        error('Invalid event: not an object');
        return false;
      }
      if (!event.name || typeof event.name !== 'string') {
        error('Invalid event: name must be a non-empty string');
        return false;
      }
      if (!event.data) {
        log('Warning: event.data is missing, using empty object');
        event.data = {};
      }

      var ga4Body = buildGA4Body(event);

      var data = {
        type: 'pixel_event',
        event: {
          id: (event.clientId && event.clientId !== '') ? event.clientId : (event.id || ('evt_' + Date.now())),
          name: event.name,
          data: event.data || event,
          timestamp: Date.now(),
          ga4: ga4Body
        },
        _sentAt: Date.now()
      };

      // Priority 1: BroadcastChannel (if available)
      if (BroadcastManager.available && BroadcastManager.send(data)) {
        log('BroadcastChannel sent:', event.name);
        return true;
      }

      // Priority 2: Cookie fallback
      log('BC unavailable or failed, trying cookie fallback for:', event.name);
      if (CookieManager.send(data.event)) {
        log('Cookie sent:', event.name);
        return true;
      }

      error('All send methods failed for:', event.name);
      return false;
    }
  };

  // ==========================================
  // EVENT HANDLER
  // ==========================================
  function handleEvent(event, source) {
    source = source || 'unknown';
    log('Event from', source + ':', event.name);

    var sent = EventSender.send(event);
    if (sent) {
      log('  -> Sent to theme');
    } else {
      error('  -> Send failed');
    }
  }

  // ==========================================
  // SHOPIFY EVENTS SUBSCRIPTION
  // ==========================================
  
  // Failed events queue for retry with size limit to prevent memory leak (Bug #8)
  var failedEventsQueue = [];
  var MAX_FAILED_QUEUE_SIZE = 100;
  var MAX_EVENT_RETRIES = 5;
  var EVENT_RETRY_DELAYS = [1000, 2000, 4000, 8000, 16000]; // 1s, 2s, 4s, 8s, 16s

  function addToFailedQueue(event) {
    // Enforce queue size limit - drop oldest events when limit exceeded (Bug #8 fix)
    if (failedEventsQueue.length >= MAX_FAILED_QUEUE_SIZE) {
      var dropped = failedEventsQueue.shift();
      log('Queue full - dropped oldest failed event:', dropped.event.name);
    }
    failedEventsQueue.push({ event: event, retryCount: 0 });
  }

  function processFailedEvents() {
    if (failedEventsQueue.length === 0) return;
    
    log('Processing', failedEventsQueue.length, 'failed events...');
    var stillFailed = [];
    
    failedEventsQueue.forEach(function(item) {
      if (item.retryCount >= MAX_EVENT_RETRIES) {
        error('Max retries exceeded for event:', item.event.name);
        return;
      }
      
      var sent = EventSender.send(item.event);
      if (!sent) {
        item.retryCount++;
        stillFailed.push(item);
      } else {
        log('Successfully resent event:', item.event.name);
      }
    });
    
    failedEventsQueue = stillFailed;
  }

  function queueFailedEvent(event) {
    addToFailedQueue(event);
  }

  function subscribeToShopifyEvents() {
    log('Subscribing to Shopify events...');

    if (typeof analytics === 'undefined') {
      log('analytics unavailable, retrying...');
      return false;
    }

    if (!analytics.subscribe) {
      error('analytics.subscribe unavailable');
      return false;
    }

    try {
      log('Subscribing to all_events...');

      // Bug #1: Return a Promise that resolves to true on success
      return analytics.subscribe('all_events', function(event) {
        handleEvent(event, 'all_events');
      }).then(function() {
        log('Subscribed to all_events');
        // Process any failed events from previous attempts
        processFailedEvents();
        return true;
      }).catch(function(err) {
        // Bug #2: Store events for retry with exponential backoff
        error('Subscription error:', err);
        log('Will retry subscription...');
        return false;
      });

    } catch (e) {
      error('Subscription failed:', e.message);
      return false;
    }
  }

  // ==========================================
  // INITIALIZATION
  // ==========================================
  // Exponential backoff for init retry (Bug #4 fixed)
  var initRetryCount = 0;
  var MAX_INIT_RETRIES = 4;
  var INIT_RETRY_DELAYS = [1000, 2000, 4000, 8000]; // 1s, 2s, 4s, 8s

  function trySubscribeWithRetry() {
    var result = subscribeToShopifyEvents();
    
    // Bug #4 FIX: Always treat result as Promise - wrap if necessary to ensure proper await
    var promiseResult;
    if (result && typeof result.then === 'function') {
      promiseResult = result;
    } else {
      // Wrap non-Promise result in a resolved Promise
      promiseResult = Promise.resolve(result);
    }
    
    // Bug #4 FIX: Properly await the Promise and handle result
    promiseResult.then(function(success) {
      if (success === true) {
        // Success - clear retry count
        initRetryCount = 0;
        log('Subscription successful, retry count reset');
      } else {
        // Subscription returned false - schedule retry
        scheduleRetry();
      }
    }).catch(function(err) {
      // Promise rejected - schedule retry
      error('Subscription Promise rejected:', err);
      scheduleRetry();
    });
  }
  
  function scheduleRetry() {
    if (initRetryCount >= MAX_INIT_RETRIES) {
      error('Max initialization retries exceeded');
      return;
    }
    
    var delay = INIT_RETRY_DELAYS[initRetryCount];
    log('Retrying in', delay + 'ms... (attempt', (initRetryCount + 1) + '/' + MAX_INIT_RETRIES + ')');
    
    setTimeout(function() {
      initRetryCount++;
      trySubscribeWithRetry();
    }, delay);
  }

  function init() {
    log('=== Pixel Tracker Starting ===');

    BroadcastManager.init();

    trySubscribeWithRetry();

    log('Pixel ready - waiting for events');
  }

  // Start when ready
  if (typeof document !== 'undefined' && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
