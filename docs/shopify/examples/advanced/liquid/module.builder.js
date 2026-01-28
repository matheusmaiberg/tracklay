/**
 * @fileoverview GA4 Event Builder - Constructs GA4-compatible event payloads from Shopify events
 * @module ga4-event-builder
 * @requires module.logger
 * @requires module.config
 *
 * @description
 * This module provides utilities to transform Shopify Pixel events into Google Analytics 4 (GA4) format.
 * It handles product data extraction, price formatting, data cleaning, and event structure normalization.
 * Supports various Shopify event types including product views, cart actions, and checkout events.
 *
 * @example
 * import { GA4EventBuilder } from './ga4-event-builder.js';
 *
 * // Build GA4 event from a Shopify product_view event
 * const shopifyEvent = {
 *   name: 'product_viewed',
 *   id: 'evt_123',
 *   data: { productVariant: { ... } },
 *   context: { document: { title: 'Product Page', location: { href: '...' } } }
 * };
 * const ga4Payload = GA4EventBuilder.build(shopifyEvent);
 *
 * @see {@link https://developers.google.com/analytics/devguides/collection/ga4/reference/events|GA4 Event Reference}
 * @see {@link https://shopify.dev/docs/api/pixels|Shopify Pixels API}
 * @author Tracklay
 * @license MIT
 */

// ============= IMPORTS =============

import { Logger } from './module.logger.js';
import { ConfigManager } from './module.config.js';

// ============= LOGGER SETUP =============
const log = Logger ? Logger.create('EventBuilder') : {
  debug: () => {},
  info: () => {},
  warn: (...args) => console.warn('[EventBuilder]', ...args),
  error: (...args) => console.error('[EventBuilder]', ...args)
};

// ============= UTILITIES =============

/**
 * Converts a value to a safe float number
 * @function toFloat
 * @param {*} val - Value to convert
 * @returns {number|undefined} The parsed float number or undefined if conversion fails
 * @example
 * toFloat('19.99'); // returns 19.99
 * toFloat('invalid'); // returns undefined
 * toFloat(null); // returns undefined
 * @memberof module:ga4-event-builder
 */
export const toFloat = (val) => {
  const num = parseFloat(val);
  return isNaN(num) ? undefined : num;
};

/**
 * Recursively cleans an object by removing empty, null, undefined, or NaN values
 * @function clean
 * @param {*} obj - Object or value to clean
 * @returns {*} The cleaned object/value with only valid entries
 * @description
 * - Removes null, undefined, empty strings, and NaN values
 * - Recursively cleans nested objects and arrays
 * - Preserves valid falsy values like 0 and false
 * @example
 * clean({ a: 1, b: null, c: '', d: { e: undefined, f: 2 } });
 * // returns { a: 1, d: { f: 2 } }
 * @memberof module:ga4-event-builder
 */
export const clean = (obj) => {
  if (!obj || typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) {
    return obj.map(clean).filter(v => v != null);
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const cleaned = clean(value);
    if (cleaned != null && cleaned !== '' && !Number.isNaN(cleaned)) {
      result[key] = cleaned;
    }
  }
  return result;
};

// ============= BUILDERS =============

/**
 * @typedef {Object} GA4Item
 * @property {string} item_id - Unique identifier for the item
 * @property {string} item_name - Display name of the item
 * @property {string} [item_variant] - Variant name (size, color, etc.)
 * @property {string} [item_brand] - Product brand/vendor
 * @property {string} [item_category] - Product category/type
 * @property {number} [price] - Unit price as a number
 * @property {number} quantity - Number of items (defaults to 1)
 * @description Represents a single item in GA4 ecommerce events
 * @see {@link https://developers.google.com/analytics/devguides/collection/ga4/reference/events#add_payment_info|GA4 Item Parameters}
 */

/**
 * @typedef {Object} ShopifyProduct
 * @property {string|number} id - Product identifier
 * @property {string} title - Product title
 * @property {string} [vendor] - Product brand
 * @property {string} [type] - Product category
 * @property {Array<Object>} [variants] - Product variants
 * @description Shopify product object from Pixel events
 * @see {@link https://shopify.dev/docs/api/pixels/customer-events#product|Shopify Product}
 */

/**
 * @typedef {Object} ShopifyVariant
 * @property {string|number} id - Variant identifier
 * @property {string} title - Variant title (e.g., "Large / Red")
 * @property {Object} [price] - Price object with amount and currencyCode
 * @property {string} [price.amount] - Price amount as string
 * @property {string} [price.currencyCode] - Currency code (e.g., "USD", "BRL")
 * @property {ShopifyProduct} [product] - Parent product reference
 * @description Shopify product variant object
 */

/**
 * @typedef {Object} ShopifyPrice
 * @property {string} amount - Price amount as string
 * @property {string} currencyCode - Currency code (e.g., "USD", "BRL")
 * @description Price object from Shopify events
 */

/**
 * Creates a GA4 item object from Shopify product data
 * @function buildItem
 * @param {ShopifyProduct} product - Shopify product object
 * @param {ShopifyVariant} variant - Shopify variant object
 * @param {ShopifyPrice} price - Price information
 * @param {number} [qty=1] - Quantity of items
 * @returns {GA4Item|null} GA4-formatted item object or null if product is missing
 * @description
 * Transforms Shopify product/variant data into GA4 item format.
 * Extracts relevant fields and applies data cleaning.
 * @example
 * const item = buildItem(
 *   { id: '123', title: 'T-Shirt', vendor: 'BrandX', type: 'Apparel' },
 *   { id: '456', title: 'Large' },
 *   { amount: '29.99', currencyCode: 'USD' },
 *   2
 * );
 * // returns { item_id: '123', item_name: 'T-Shirt', item_variant: 'Large', ... }
 * @memberof module:ga4-event-builder
 */
export const buildItem = (product, variant, price, qty) => {
  if (!product) return null;

  return clean({
    item_id: product.id?.toString(),
    item_name: product.title,
    item_variant: variant?.title,
    item_brand: product.vendor,
    item_category: product.type,
    price: toFloat(price?.amount),
    quantity: qty || 1
  });
};

// ============= MAIN BUILDER =============

/**
 * @typedef {Object} GA4EventPayload
 * @property {string} event - Event name
 * @property {string} event_id - Unique event identifier
 * @property {string} [page_title] - Document title
 * @property {string} [page_location] - Full page URL
 * @property {string} [page_path] - URL pathname
 * @property {string} [customer_email] - Customer email from checkout
 * @property {string} [customer_phone] - Customer phone from checkout
 * @property {string} [customer_city] - Shipping city
 * @property {string} [customer_country] - Shipping country
 * @property {number} [cart_total] - Total cart value
 * @property {string} currency - Currency code (defaults to 'BRL')
 * @property {number} [value] - Event value (revenue)
 * @property {string} [transaction_id] - Order/transaction ID
 * @property {number} [tax] - Tax amount
 * @property {number} [shipping] - Shipping cost
 * @property {number} [discount] - Discount amount
 * @property {Array<GA4Item>} [items] - Array of GA4 items
 * @description Complete GA4 event payload structure
 */

/**
 * @typedef {Object} ShopifyEvent
 * @property {string} name - Event name (e.g., 'product_viewed', 'checkout_completed')
 * @property {string} id - Unique event ID
 * @property {Object} [data] - Event-specific data
 * @property {Object} [data.productVariant] - Product variant data
 * @property {Object} [data.cartLine] - Cart line item data
 * @property {Object} [data.cart] - Cart data
 * @property {Object} [data.checkout] - Checkout data
 * @property {Object} [context] - Event context
 * @property {Object} [context.document] - Document information
 * @description Shopify Pixel event object
 * @see {@link https://shopify.dev/docs/api/pixels/customer-events#standard-events|Shopify Standard Events}
 */

/**
 * Builds a complete GA4 event payload from a Shopify event
 * @function build
 * @param {ShopifyEvent} event - Shopify Pixel event object
 * @returns {GA4EventPayload} Complete GA4-formatted event payload
 * @description
 * Transforms a Shopify Pixel event into a GA4-compatible payload.
 * Handles multiple event types including:
 * - Product view events (via productVariant)
 * - Cart events (via cartLine)
 * - Checkout events (via checkout.lineItems)
 *
 * Extracts and formats:
 * - Page context (title, location, path)
 * - Customer data (email, phone, shipping address)
 * - Transaction details (ID, tax, shipping, discount)
 * - Ecommerce items with proper formatting
 * - Currency and value information
 *
 * Currency fallback order: product price → cart total → checkout total → 'USD'
 * @example
 * const shopifyEvent = {
 *   name: 'checkout_completed',
 *   id: 'evt_789',
 *   data: {
 *     checkout: {
 *       email: 'customer@example.com',
 *       totalPrice: { amount: '99.99', currencyCode: 'USD' },
 *       order: { id: 'ORDER123' },
 *       lineItems: [...]
 *     }
 *   },
 *   context: { document: { title: 'Checkout', location: { href: '...', pathname: '/checkout' } } }
 * };
 * const ga4Payload = build(shopifyEvent);
 * @memberof module:ga4-event-builder
 */
export const build = (event) => {
  const d = event.data || {};
  const ctx = event.context || {};

  const { productVariant: pv, cartLine, cart, checkout } = d;

  // Monta array de items
  const items = [];

  if (pv) {
    items.push(buildItem(pv.product, pv, pv.price));
  }

  if (cartLine) {
    items.push(buildItem(
      cartLine.merchandise?.product,
      cartLine.merchandise,
      cartLine.merchandise?.price,
      cartLine.quantity
    ));
  }

  if (Array.isArray(checkout?.lineItems)) {
    checkout.lineItems.forEach(item => {
      items.push(buildItem(
        item.variant?.product,
        item.variant,
        item.variant?.price,
        item.quantity
      ));
    });
  }

  const validItems = items.filter(Boolean);

  return clean({
    event: event.name,
    event_id: event.id,

    // Page
    page_title: ctx.document?.title,
    page_location: ctx.document?.location?.href,
    page_path: ctx.document?.location?.pathname,

    // Customer
    customer_email: checkout?.email,
    customer_phone: checkout?.phone,
    customer_city: checkout?.shippingAddress?.city,
    customer_country: checkout?.shippingAddress?.country,

    // Cart
    cart_total: toFloat(cart?.cost?.totalAmount?.amount),

    // Ecommerce
    currency: pv?.price?.currencyCode
      ?? cartLine?.cost?.totalAmount?.currencyCode
      ?? checkout?.totalPrice?.currencyCode
      ?? 'USD',

    value: toFloat(
      pv?.price?.amount
      ?? cartLine?.cost?.totalAmount?.amount
      ?? checkout?.totalPrice?.amount
    ),

    // Transaction
    transaction_id: checkout?.order?.id?.toString(),
    tax: toFloat(checkout?.totalTax?.amount),
    shipping: toFloat(checkout?.shippingLine?.price?.amount),
    discount: toFloat(checkout?.discountsAmount?.amount),

    // Items
    items: validItems.length ? validItems : undefined
  });
};

// ============= EXPORT =============

/**
 * GA4 Event Builder namespace containing all builder functions
 * @namespace GA4EventBuilder
 * @property {function} build - Main function to build GA4 event payloads
 * @property {function} buildItem - Function to build individual GA4 items
 * @property {function} toFloat - Utility to convert values to float
 * @property {function} clean - Utility to clean objects of empty values
 * @description
 * Main export object providing all GA4 event building functionality.
 * Can be used as ES module import or browser global.
 * @example
 * // ES Module
 * import { GA4EventBuilder } from './ga4-event-builder.js';
 * const payload = GA4EventBuilder.build(shopifyEvent);
 *
 * // Browser global (fallback)
 * const payload = window.GA4EventBuilder.build(shopifyEvent);
 * @memberof module:ga4-event-builder
 */
export const GA4EventBuilder = {
  build,
  buildItem,
  toFloat,
  clean
};

// Browser global fallback
if (typeof window !== 'undefined') {
  window.GA4EventBuilder = GA4EventBuilder;
}
