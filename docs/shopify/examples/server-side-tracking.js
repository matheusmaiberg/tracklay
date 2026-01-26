// ============================================================
// SHOPIFY SERVER-SIDE TRACKING (v3.1.0 - MAXIMUM AD-BLOCKER BYPASS)
// ============================================================
// Add this code to your Shopify theme.liquid file
// Location: Layout → theme.liquid (before </head> or before </body>)
//
// BENEFITS:
// - 95-98% ad-blocker bypass (no GTM script, no tracking code)
// - Zero client-side tracking libraries
// - First-party tracking (all requests to your domain)
// - Works with uBlock Origin, AdBlock Plus, Ghostery, etc.
//
// HOW IT WORKS:
// 1. Browser executes simple JavaScript (this file)
// 2. JavaScript sends events to Worker (/cdn/events)
// 3. Worker forwards to GTM Server-Side
// 4. GTM Server processes and sends to GA4
// 5. Result: No tracking code for ad-blockers to detect!
//
// SETUP:
// 1. Deploy Worker with event handler (already done)
// 2. Add this code to theme.liquid
// 3. Update CONFIG below with your settings
// 4. Remove Shopify Custom Pixel (if using)
// 5. Deploy and test
// ============================================================

(function() {
  'use strict';

  // ============= CONFIGURATION =============
  const CONFIG = {
    // Worker domain (where events are sent)
    WORKER_URL: 'https://cdn.suevich.com/cdn/events',

    // GA4 Measurement ID (optional, GTM Server can use default)
    MEASUREMENT_ID: 'G-N5ZZGL11MW',

    // Debug mode (set to false in production)
    DEBUG: true,

    // Session timeout in milliseconds (30 minutes)
    SESSION_TIMEOUT: 30 * 60 * 1000,

    // Engagement tracking interval (5 seconds)
    ENGAGEMENT_INTERVAL: 5000
  };

  // ============= HELPERS =============
  const log = (msg, data) => CONFIG.DEBUG && console.log(`[Tracking] ${msg}`, data || '');
  const error = (msg, err) => console.error(`[Tracking] ${msg}`, err || '');

  /**
   * Get or create client ID (GA1.1.random.timestamp format)
   */
  function getClientId() {
    let clientId = getCookie('_ga');

    if (!clientId) {
      // Generate new client ID
      const random = Math.random().toString(36).substring(2, 11);
      const timestamp = Date.now();
      clientId = `GA1.1.${random}.${timestamp}`;

      // Store in cookie (2 years expiry)
      setCookie('_ga', clientId, 365 * 2);
      log('Generated new client ID', clientId);
    }

    return clientId;
  }

  /**
   * Get or create session ID
   */
  function getSessionId() {
    let sessionId = sessionStorage.getItem('_ga_session_id');
    const sessionStart = sessionStorage.getItem('_ga_session_start');
    const now = Date.now();

    // Check if session expired
    if (sessionId && sessionStart) {
      const elapsed = now - parseInt(sessionStart);
      if (elapsed > CONFIG.SESSION_TIMEOUT) {
        sessionId = null;
        log('Session expired, creating new session');
      }
    }

    // Create new session
    if (!sessionId) {
      sessionId = now.toString();
      sessionStorage.setItem('_ga_session_id', sessionId);
      sessionStorage.setItem('_ga_session_start', now.toString());
      log('Created new session', sessionId);
    }

    return sessionId;
  }

  /**
   * Get cookie value
   */
  function getCookie(name) {
    const value = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return value ? value.pop() : '';
  }

  /**
   * Set cookie
   */
  function setCookie(name, value, days) {
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/; SameSite=Lax`;
  }

  /**
   * Send event to Worker
   */
  function trackEvent(eventName, eventParams = {}) {
    try {
      const clientId = getClientId();
      const sessionId = getSessionId();

      // Build event payload
      const payload = {
        // Required fields
        event_name: eventName,
        client_id: clientId,
        measurement_id: CONFIG.MEASUREMENT_ID,

        // Session info
        session_id: sessionId,
        engagement_time_msec: '100',

        // Page info
        page_location: window.location.href,
        page_title: document.title,
        page_referrer: document.referrer || '',

        // Timestamp
        timestamp_micros: (Date.now() * 1000).toString(),

        // Custom parameters
        ...eventParams
      };

      // Send to Worker via fetch
      fetch(CONFIG.WORKER_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload),
        // Use keepalive for events sent on page unload
        keepalive: true
      })
      .then(response => {
        if (response.ok) {
          log(`Event sent: ${eventName}`, eventParams);
        } else {
          error(`Event failed: ${eventName}`, response.statusText);
        }
      })
      .catch(err => {
        error(`Event error: ${eventName}`, err);
      });

    } catch (err) {
      error('Track event failed', err);
    }
  }

  // ============= SHOPIFY DATA EXTRACTION =============

  /**
   * Get Shopify product data from page
   */
  function getProductData() {
    // Check if product data is available (Shopify provides this globally)
    if (typeof window.ShopifyAnalytics !== 'undefined' && window.ShopifyAnalytics.meta) {
      const meta = window.ShopifyAnalytics.meta;
      return {
        product_id: meta.product?.id?.toString() || '',
        product_name: meta.product?.title || '',
        product_type: meta.product?.type || '',
        product_vendor: meta.product?.vendor || '',
        variant_id: meta.product?.variants?.[0]?.id?.toString() || '',
        variant_name: meta.product?.variants?.[0]?.name || '',
        price: meta.product?.variants?.[0]?.price || '',
        currency: meta.currency || 'EUR'
      };
    }

    return {};
  }

  /**
   * Get cart data from Shopify Cart API
   */
  async function getCartData() {
    try {
      const response = await fetch('/cart.js');
      const cart = await response.json();

      return {
        cart_total: (cart.total_price / 100).toFixed(2),
        cart_currency: cart.currency || 'EUR',
        cart_item_count: cart.item_count,
        items: cart.items.map(item => ({
          product_id: item.product_id.toString(),
          variant_id: item.variant_id.toString(),
          product_name: item.product_title,
          variant_name: item.variant_title,
          quantity: item.quantity,
          price: (item.price / 100).toFixed(2)
        }))
      };
    } catch (err) {
      error('Failed to fetch cart data', err);
      return {};
    }
  }

  // ============= EVENT TRACKING =============

  /**
   * Track page view
   */
  function trackPageView() {
    const productData = getProductData();
    trackEvent('page_view', productData);
  }

  /**
   * Track add to cart
   */
  function trackAddToCart(form) {
    const productData = getProductData();

    // Get quantity from form
    const quantityInput = form.querySelector('[name="quantity"]');
    const quantity = quantityInput ? parseInt(quantityInput.value) : 1;

    trackEvent('add_to_cart', {
      ...productData,
      quantity: quantity.toString()
    });
  }

  /**
   * Track begin checkout
   */
  async function trackBeginCheckout() {
    const cartData = await getCartData();
    trackEvent('begin_checkout', cartData);
  }

  /**
   * Track scroll depth
   */
  let maxScrollDepth = 0;
  function trackScrollDepth() {
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    const scrollPercent = Math.round((scrollTop / scrollHeight) * 100);

    if (scrollPercent > maxScrollDepth) {
      maxScrollDepth = scrollPercent;

      // Track milestones: 25%, 50%, 75%, 90%
      if ([25, 50, 75, 90].includes(scrollPercent)) {
        trackEvent('scroll', {
          scroll_depth: scrollPercent.toString()
        });
      }
    }
  }

  // ============= INITIALIZATION =============

  /**
   * Initialize tracking
   */
  function init() {
    log('Initializing server-side tracking v3.1.0...');

    // Track page view on load
    trackPageView();

    // Track add to cart (Shopify theme forms)
    document.addEventListener('submit', function(e) {
      const form = e.target;

      // Check if this is an add to cart form
      if (form.action && (form.action.includes('/cart/add') || form.getAttribute('action') === '/cart/add')) {
        trackAddToCart(form);
      }
    });

    // Track checkout button clicks
    document.addEventListener('click', function(e) {
      const button = e.target.closest('a, button');
      if (!button) return;

      // Check if this is a checkout button
      const href = button.getAttribute('href') || '';
      const text = button.textContent.toLowerCase();

      if (href.includes('/checkout') || text.includes('checkout') || text.includes('finalizar')) {
        trackBeginCheckout();
      }
    });

    // Track scroll depth
    let scrollTimeout;
    window.addEventListener('scroll', function() {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(trackScrollDepth, 300);
    }, { passive: true });

    // Track engagement time (send heartbeat every 5 seconds if user is active)
    let lastActivity = Date.now();
    let engagementTime = 0;

    // Update last activity on user interaction
    ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
      document.addEventListener(event, () => {
        lastActivity = Date.now();
      }, { passive: true });
    });

    // Send engagement heartbeat
    setInterval(() => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivity;

      // Only count as engaged if user was active in last 5 seconds
      if (timeSinceActivity < 5000) {
        engagementTime += CONFIG.ENGAGEMENT_INTERVAL;

        trackEvent('user_engagement', {
          engagement_time_msec: engagementTime.toString()
        });
      }
    }, CONFIG.ENGAGEMENT_INTERVAL);

    log('Initialized ✓ Server-side tracking active');
  }

  // ============= START =============
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
