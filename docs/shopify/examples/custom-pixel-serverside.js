/**
 * Tracklay Server-Side Custom Pixel
 *
 * Este pixel roda no checkout sandboxed da Shopify e envia eventos
 * diretamente para o Worker Tracklay via fetch POST /cdn/events.
 *
 * Também usa browser.sessionStorage (Web Pixel API) para enviar
 * eventos para o tema via bridge (dual tracking).
 *
 * Instalação:
 * 1. Shopify Admin → Settings → Customer Events
 * 2. Add Custom Pixel
 * 3. Cole este código inteiro
 * 4. Configure WORKER_URL e MEASUREMENT_ID abaixo
 * 5. Connect
 */

(function() {
  'use strict';

  // ==========================================
  // CONFIGURAÇÃO OBRIGATÓRIA
  // ==========================================
  var CONFIG = {
    WORKER_URL: 'https://cdn.suevich.com/cdn/events',
    MEASUREMENT_ID: 'G-N5ZZGL11MW',
    DEBUG: false,
    MAX_RETRIES: 3,
    SESSION_PREFIX: 'tracklay_event_'
  };

  // ==========================================
  // LOGGER
  // ==========================================
  function log() {
    if (CONFIG.DEBUG) {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('[Tracklay Pixel]');
      console.log.apply(console, args);
    }
  }

  function error() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('[Tracklay Pixel]');
    console.error.apply(console, args);
  }

  // ==========================================
  // CLIENT ID
  // ==========================================
  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function generateCid() {
    return 'tl_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  function getClientId() {
    var cid = getCookie('_tracklay_cid');
    if (!cid) {
      cid = generateCid();
      // Tenta setar cookie no sandbox (pode funcionar dependendo do contexto)
      try {
        var expires = new Date();
        expires.setTime(expires.getTime() + 730 * 24 * 60 * 60 * 1000);
        document.cookie = '_tracklay_cid=' + encodeURIComponent(cid) +
          '; expires=' + expires.toUTCString() +
          '; path=/' +
          '; SameSite=None' +
          '; Secure';
      } catch (e) {}
    }
    return cid;
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
  // GA4 PAYLOAD BUILDER
  // ==========================================
  function buildItem(product, variant, price, qty) {
    if (!product) return null;
    return clean({
      item_id: product.id ? product.id.toString() : undefined,
      item_name: product.title,
      item_variant: variant ? variant.title : undefined,
      item_brand: product.vendor,
      item_category: product.type,
      price: toFloat(price ? price.amount : undefined),
      quantity: qty || 1
    });
  }

  function buildPayload(event) {
    var d = event.data || {};
    var ctx = event.context || {};
    var pv = d.productVariant;
    var cartLine = d.cartLine;
    var cart = d.cart;
    var checkout = d.checkout;

    var items = [];

    if (pv) {
      items.push(buildItem(pv.product, pv, pv.price));
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
          item.variant && item.variant.product ? item.variant.product : null,
          item.variant,
          item.variant && item.variant.price ? item.variant.price : null,
          item.quantity
        ));
      });
    }

    items = items.filter(function(i) { return i != null; });

    var currencyCode = (pv && pv.price ? pv.price.currencyCode : null)
      || (cartLine && cartLine.cost && cartLine.cost.totalAmount ? cartLine.cost.totalAmount.currencyCode : null)
      || (checkout && checkout.totalPrice ? checkout.totalPrice.currencyCode : null)
      || 'USD';

    var value = toFloat(
      (pv && pv.price ? pv.price.amount : null)
      || (cartLine && cartLine.cost && cartLine.cost.totalAmount ? cartLine.cost.totalAmount.amount : null)
      || (checkout && checkout.totalPrice ? checkout.totalPrice.amount : null)
    );

    var payload = clean({
      event_name: event.name,
      client_id: getClientId(),
      measurement_id: CONFIG.MEASUREMENT_ID,
      timestamp_micros: String(Date.now() * 1000),
      page_location: ctx.document && ctx.document.location ? ctx.document.location.href : '',
      page_title: ctx.document ? ctx.document.title : '',
      page_path: ctx.document && ctx.document.location ? ctx.document.location.pathname : '',
      page_referrer: ctx.document && ctx.document.referrer ? ctx.document.referrer : '',
      currency: currencyCode,
      value: value,
      transaction_id: checkout && checkout.order && checkout.order.id ? checkout.order.id.toString() : undefined,
      tax: checkout && checkout.totalTax ? toFloat(checkout.totalTax.amount) : undefined,
      shipping: checkout && checkout.shippingLine && checkout.shippingLine.price ? toFloat(checkout.shippingLine.price.amount) : undefined,
      discount: checkout && checkout.discountsAmount ? toFloat(checkout.discountsAmount.amount) : undefined,
      items: items.length ? items : undefined
    });

    return payload;
  }

  // ==========================================
  // SESSION STORAGE BRIDGE (→ TEMA)
  // ==========================================
  var sessionIndex = 0;

  function bridgeToTheme(event) {
    try {
      if (typeof browser !== 'undefined' && browser.sessionStorage) {
        var data = {
          id: event.id || ('evt_' + Date.now()),
          name: event.name,
          data: event.data || {},
          timestamp: Date.now(),
          ga4: buildPayload(event)
        };
        browser.sessionStorage.setItem(CONFIG.SESSION_PREFIX + sessionIndex, JSON.stringify(data));
        sessionIndex++;
        log('Bridge sessionStorage:', event.name);
      }
    } catch (e) {
      log('sessionStorage bridge failed:', e.message);
    }
  }

  // ==========================================
  // FETCH TO WORKER (→ SERVER-SIDE)
  // ==========================================
  function sendToWorker(payload, attempt) {
    attempt = attempt || 0;

    fetch(CONFIG.WORKER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    }).then(function(response) {
      if (!response.ok) {
        throw new Error('HTTP ' + response.status);
      }
      log('Event sent to Worker:', payload.event_name);
    }).catch(function(err) {
      if (attempt < CONFIG.MAX_RETRIES) {
        var delay = Math.pow(2, attempt) * 1000;
        log('Retry in ' + delay + 'ms (' + (attempt + 1) + '/' + CONFIG.MAX_RETRIES + ')');
        setTimeout(function() {
          sendToWorker(payload, attempt + 1);
        }, delay);
      } else {
        error('Failed after retries:', payload.event_name, err.message);
      }
    });
  }

  // ==========================================
  // EVENT HANDLER
  // ==========================================
  function handleEvent(event) {
    if (!event || !event.name) return;

    log('Event captured:', event.name);

    // 1. Bridge para o tema via sessionStorage
    bridgeToTheme(event);

    // 2. Server-side via fetch
    var payload = buildPayload(event);
    sendToWorker(payload);
  }

  // ==========================================
  // SUBSCRIPTION
  // ==========================================
  function subscribe() {
    if (typeof analytics === 'undefined' || !analytics.subscribe) {
      error('analytics.subscribe not available');
      return false;
    }

    try {
      analytics.subscribe('all_events', function(event) {
        handleEvent(event);
      });
      log('Subscribed to all_events');
      return true;
    } catch (e) {
      error('Subscription failed:', e.message);
      return false;
    }
  }

  // Start
  log('Starting Tracklay Server-Side Pixel...');
  subscribe();
})();
