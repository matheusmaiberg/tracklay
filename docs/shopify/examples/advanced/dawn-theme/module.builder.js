/**
 * @fileoverview GA4 Event Builder - Constructs GA4-compatible event payloads from Shopify events
 * @module ga4-event-builder
 */

// ============= IMPORTS =============

import { Logger } from './module.logger.js';
import { ConfigManager } from './module.config.js';

// ============= LOGGER SETUP =============

const log = Logger.create('EventBuilder');

// ============= UTILITIES =============

/**
 * @param {*} val - Value to convert
 * @returns {number|undefined} The parsed float number or undefined if conversion fails
 */
export const toFloat = (val) => {
  const num = parseFloat(val);
  return isNaN(num) ? undefined : num;
};

/**
 * @param {*} obj - Object or value to clean
 * @returns {*} The cleaned object/value with only valid entries
 */
export const clean = (obj, seen = new WeakSet()) => {
  if (!obj || typeof obj !== 'object') return obj;
  
  // Protect against circular references
  if (seen.has(obj)) return undefined;
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map(item => clean(item, seen)).filter(v => v != null);
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const cleaned = clean(value, seen);
    if (cleaned != null && cleaned !== '' && !Number.isNaN(cleaned)) {
      result[key] = cleaned;
    }
  }
  seen.delete(obj);
  return result;
};

// ============= BUILDERS =============

const GA4Item = {
  item_id: '',
  item_name: '',
  item_variant: '',
  item_brand: '',
  item_category: '',
  price: 0,
  quantity: 1
};

const ShopifyProduct = {
  id: '',
  title: '',
  vendor: '',
  type: ''
};

const ShopifyVariant = {
  id: '',
  title: '',
  price: { amount: '', currencyCode: '' },
  product: null
};

const ShopifyPrice = {
  amount: '',
  currencyCode: ''
};

/**
 * @param {ShopifyProduct} product - Shopify product object
 * @param {ShopifyVariant} variant - Shopify variant object
 * @param {ShopifyPrice} price - Price information
 * @param {number} [qty=1] - Quantity of items
 * @returns {GA4Item|null} GA4-formatted item object or null if product is missing
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

const GA4EventPayload = {
  event: '',
  event_id: '',
  page_title: '',
  page_location: '',
  page_path: '',
  customer_email: '',
  customer_phone: '',
  customer_city: '',
  customer_country: '',
  cart_total: 0,
  currency: 'BRL',
  value: 0,
  transaction_id: '',
  tax: 0,
  shipping: 0,
  discount: 0,
  items: []
};

const ShopifyEvent = {
  name: '',
  id: '',
  data: {},
  context: {}
};

/**
 * @param {ShopifyEvent} event - Shopify Pixel event object
 * @returns {GA4EventPayload} Complete GA4-formatted event payload
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
 * @namespace GA4EventBuilder
 * @property {function} build - Main function to build GA4 event payloads
 * @property {function} buildItem - Function to build individual GA4 items
 * @property {function} toFloat - Utility to convert values to float
 * @property {function} clean - Utility to clean objects of empty values
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
