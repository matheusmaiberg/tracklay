/**
 * Tracklay Server-Side Theme Tracking (Standalone)
 *
 * Script standalone para theme.liquid.
 * Não requer ES6 modules. Cole antes de </head>.
 *
 * Envia eventos de navegação diretamente para /cdn/events.
 * Use este arquivo se NÃO estiver usando os módulos Dawn ES6.
 */

(function() {
  'use strict';

  // ==========================================
  // CONFIGURAÇÃO
  // ==========================================
  var CONFIG = {
    WORKER_URL: 'https://cdn.yourstore.com/cdn/events',
    MEASUREMENT_ID: 'G-XXXXXXXXXX',
    DEBUG: false,
    SESSION_TIMEOUT: 30 * 60 * 1000
  };

  // ==========================================
  // LOGGER
  // ==========================================
  function log() {
    if (CONFIG.DEBUG) {
      var args = Array.prototype.slice.call(arguments);
      args.unshift('[Tracklay Theme]');
      console.log.apply(console, args);
    }
  }

  // ==========================================
  // CLIENT ID
  // ==========================================
  function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }

  function setCookie(name, value, days) {
    var expires = new Date();
    expires.setTime(expires.getTime() + days * 24 * 60 * 60 * 1000);
    document.cookie = name + '=' + encodeURIComponent(value) +
      '; expires=' + expires.toUTCString() +
      '; path=/' +
      '; SameSite=Lax' +
      '; Secure';
  }

  function generateCid() {
    return 'tl_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  }

  var cid = getCookie('_tracklay_cid');
  if (!cid) {
    cid = generateCid();
    setCookie('_tracklay_cid', cid, 730);
  }

  // ==========================================
  // EVENT SENDER
  // ==========================================
  function sendEvent(eventName, params) {
    params = params || {};

    var payload = {
      event_name: eventName,
      client_id: cid,
      measurement_id: CONFIG.MEASUREMENT_ID,
      timestamp_micros: String(Date.now() * 1000),
      page_location: window.location.href,
      page_title: document.title,
      page_referrer: document.referrer || '',
      engagement_time_msec: '100'
    };

    // Merge custom params
    for (var key in params) {
      if (params.hasOwnProperty(key)) {
        payload[key] = params[key];
      }
    }

    log('Sending event:', eventName, payload);

    fetch(CONFIG.WORKER_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true
    }).then(function(res) {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      log('Event sent:', eventName);
    }).catch(function(err) {
      log('Send failed:', eventName, err.message);
    });
  }

  // ==========================================
  // AUTO-TRACKING
  // ==========================================

  // 1. Page view
  sendEvent('page_view');

  // 2. Scroll tracking
  var scrollMarks = { 25: false, 50: false, 75: false, 90: false };
  window.addEventListener('scroll', function() {
    var scrollPercent = Math.round((window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100);
    if (isNaN(scrollPercent)) scrollPercent = 0;

    for (var mark in scrollMarks) {
      if (!scrollMarks[mark] && scrollPercent >= parseInt(mark)) {
        scrollMarks[mark] = true;
        sendEvent('scroll', { engagement_time_msec: String(mark * 100) });
      }
    }
  }, { passive: true });

  // 3. Add to cart detection (Shopify standard buttons)
  document.addEventListener('click', function(e) {
    var target = e.target;
    var isAddToCart = target.matches && (
      target.matches('[type="submit"][name="add"]') ||
      target.matches('.add-to-cart') ||
      target.matches('[data-add-to-cart]') ||
      target.closest('form[action*="/cart/add"]')
    );

    if (isAddToCart) {
      sendEvent('add_to_cart');
    }
  });

  log('Tracklay theme tracking active');
})();
