# GTM Server-Side Setup for Tracklay - Complete Guide

**Document Version**: 2.0.0
**Last Updated**: 26/01/2026
**Purpose**: Configure GTM Server-Side to receive Tracklay events and forward to GA4 + Meta CAPI

---

## Overview

This guide walks you through setting up **GTM Server-Side** to receive events from Tracklay Worker and forward to:
- ✅ Google Analytics 4 (GA4)
- ✅ Meta Conversions API (CAPI)
- ✅ Any other server-side destination

### Architecture

```
Shopify Store
  └─ Web Pixel App
      └─ fetch() 
          └─ Tracklay Cloudflare Worker (/cdn/events)
              └─ forward()
                  └─ GTM Server-Side Container (yourdomain.com)
                      ├─ GA4 Client → GA4 API
                      └─ Meta CAPI Client → Meta Graph API
```

---

## Step 1: Create GTM Server-Side Container

### 1.1 Provision GTM Server Container

1. Go to **Google Tag Manager**
2. Click **Admin** → **Create Container**
3. Select: **Server** (not Web)
4. Container name: `Tracklay Server - Your Store`

### 1.2 Setup Server Hosting

#### Option A: Google Cloud (Recommended for beginners)

```bash
# Automatic provisioning (GTM will create Cloud Run instance)
# Cost: ~$40-100/month for low traffic
```

**Steps:**
1. In new Server container, click **Admin** → **Container Settings**
2. Under **Server Container URL**, click **Manually provision tagging server**
3. Choose **Google Cloud Platform**
4. Follow wizard to create Cloud Run service
5. **Save** your server URL: `https://gtm.yourdomain.com`

#### Option B: Self-hosted (Advanced)

```bash
# Use your own server (Node.js)
git clone https://github.com/GoogleCloudPlatform/docker-clamav
# Build and deploy to your infrastructure
```

---

## Step 2: Configure GTM Server Container

### 2.1 Install GA4 Client

1. In GTM Server container, **Templates** → **Search Gallery**
2. Search: **"GA4"**
3. Install **"Google Analytics 4 Client"**

### 2.2 Install Meta CAPI Client

1. **Templates** → **Search Gallery**
2. Search: **"Facebook"** or **"Meta CAPI"**
3. Install **"Meta Conversions API Client"**

### 2.3 Create GA4 Server Tag

1. **Tags** → **New**
2. Tag type: **Google Analytics: GA4**
3. Configuration:
   - **Tag Type**: Google Analytics GA4 Configuration
   - **Measurement ID**: `G-XXXXXXXXXX`
   - **Send to Server Container**: ✅ Check
4. Trigger: **All Events** (or specific events)

---

## Step 3: Configure Tracklay Worker to Forward to GTM

### 3.1 Update wrangler.toml

```toml
# wrangler.toml

[vars]
# Your GTM Server Container URL
GTM_SERVER_URL = "https://gtm.yourstore.com"

# Enable automatic transport_url injection (recommended)
AUTO_INJECT_TRANSPORT_URL = "true"
```

### 3.2 Deploy Worker

```bash
# Add GTM URL as secret
wrangler secret put GTM_SERVER_URL
# Enter: https://gtm.yourstore.com

# Deploy
npm run deploy

# Test
npm run urls
```

---

## Step 4: Event Mapping (Shopify → GA4 → Meta)

### 4.1 Standard Event Mapping

| Shopify Event | GA4 Event | Meta Event | Trigger |
|---------------|-----------|------------|---------|
| `page_viewed` | `page_view` | `ViewContent` | Automatic |
| `product_viewed` | `view_item` | `ViewContent` | On product page |
| `product_added_to_cart` | `add_to_cart` | `AddToCart` | Add to cart |
| `checkout_started` | `begin_checkout` | `InitiateCheckout` | Checkout start |
| `checkout_completed` | `purchase` | `Purchase` | Thank you page |

### 4.2 Custom Event Setup in GTM

#### GA4 Client Configuration

1. **Clients** → **GA4 Client** → **Edit**
2. **Automatic Event Conversion**: ✅ Enabled
3. **Event Mapping**:
   ```javascript
   // In GTM Server, the client automatically converts
   // Tracklay events to GA4 format
   
   // Example event from Tracklay:
   {
     "event_name": "purchase",
     "transaction_id": "12345",
     "value": 99.99,
     "currency": "USD",
     "items": [...]
   }
   
   // GA4 Client converts to Measurement Protocol
   ```

#### Meta CAPI Client Configuration

1. **Clients** → **Meta CAPI Client**
2. Fill **Access Token**:
   - Go to Facebook Events Manager
   - Settings → Conversions API → Generate Access Token
3. **Test ID**: Generate in Events Manager
4. **Event Timeouts**: 72 hours (default)

---

## Step 5: Advanced User Data Collection (EMQ 9+)

### 5.1 User Data Schema

Tracklay collects and forwards user data for **Event Match Quality (EMQ)** optimization.

```javascript
// Example payload sent from Web Pixel to Tracklay
{
  "event_name": "purchase",
  "user_data": {
    // SHA-256 hashed
    "email": "a665a45920422f9d417e4867efdc4fb8a04381aaf8e8b8b5b5b5b5b5b5b5b5b5b",
    "phone_number": "e38b8b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b5b",
    "first_name": "3a5b8b...",
    "last_name": "8b5b5b...",
    "city": "9b5b5b...",
    "state": "2b5b5b...",
    "zip_code": "1b5b5b...",
    "country": "US"
  },
  "custom_data": {
    "currency": "USD",
    "value": 99.99,
    "content_ids": ["12345"]
  }
}
```

### 5.2 Configure Data Mapping in GTM

#### For GA4:
```javascript
// In GA4 Tag → Fields to Set
user_id: {{User ID}}  // From customer.id
custom_parameters: {
  customer_email: {{Hashed Email}},
  customer_id: {{Customer ID}}
}
```

#### For Meta CAPI:
```javascript
// Meta CAPI Client automatically picks up user_data object
// No additional configuration needed if using Tracklay format
```

---

## Step 6: Testing & Verification

### 6.1 Test GA4 Integration

1. **GTM Preview Mode** (Server container)
2. Trigger events on your store
3. Verify in GTM logs:
   ```
   ✅ Event received: purchase
   ✅ Forwarded to GA4: 200 OK
   ```

4. **GA4 DebugView**: https://analytics.google.com/analytics/web/#/debugview
5. Check for events in real-time

### 6.2 Test Meta CAPI Integration

1. **Facebook Events Manager**: https://business.facebook.com/events_manager
2. Go to **Test Events**
3. Enter your **Test ID** from CAPI Client
4. Trigger events on store
5. Verify **Server** events appear (not just Browser)
6. Check **EMQ Score** (should be 8.5+)

### 6.3 Test Ad-Blocker Bypass

1. Install **uBlock Origin**
2. Visit your store with dev tools open
3. Verify:
   ```javascript
   // ❌ Traditional GTM blocked
   https://www.googletagmanager.com/gtm.js  // Status: blocked
   
   // ✅ Tracklay Worker NOT blocked
   https://yourstore.com/cdn/g/YOUR-UUID    // Status: 200 OK
   ```

---

## Step 7: Advanced Configuration

### 7.1 Multiple Measurement IDs

```javascript
// In Web Pixel, send measurement_id per event
eventData.measurement_id = 'G-XXXXXXXXXX';

// GTM Server routes to correct GA4 property
```

### 7.2 Custom Parameters

```javascript
// Add profit tracking
eventData.custom_data = {
  profit: 29.99,  // value - cost_of_goods
  profit_margin: 0.3
};

// Map in GTM GA4 Tag → Custom Parameters
```

### 7.3 Consent Mode

```javascript
// Respect user consent
analytics.subscribe('all_events', (event) => {
  const consent = event.context.consent;
  
  if (!consent.marketing) {
    Logger.log('User denied consent - not tracking');
    return;
  }
  
  // Track with consent
  forwardEventToWorker(event.name, eventData);
});
```

---

## Step 8: Monitoring & Debugging

### 8.1 GTM Server Logs

```bash
# In Google Cloud Console
# Cloud Run → Logs

# Filter for errors:
severity>=ERROR
```

### 8.2 Tracklay Worker Logs

```bash
# Cloudflare Workers Logs
wrangler tail
# or
# Cloudflare Dashboard → Workers → your-worker → Logs
```

### 8.3 Common Issues

#### Issue: Events not appearing in GA4
**Solution:**
```bash
# 1. Check GTM_SERVER_URL in worker
wrangler secret put GTM_SERVER_URL
# Enter: https://gtm.yourstore.com (NO trailing slash)

# 2. Check GA4 Client is installed
# GTM Server → Clients → GA4 Client

# 3. Check measurement_id is correct
# GA4 → Admin → Data Streams → Copy Measurement ID
```

#### Issue: Meta CAPI events not received
**Solution:**
```bash
# 1. Check access token
# Facebook Events Manager → Settings → Conversions API → Generate Token

# 2. Check Test ID
# Must match between Events Manager and GTM Client

# 3. Check user_data hashing
// Tracklay automatically SHA-256 hashes
// Meta requires hashing for privacy
```

#### Issue: uBlock still blocking
**Solution:**
```bash
# 1. Update UUIDs (rotate)
npm run setup  # Generate new UUIDs
npm run deploy

# 2. Update theme URLs
# theme.liquid → Update with new UUIDs

# 3. Enable container aliases
# wrangler.toml → GTM_CONTAINER_ALIASES="{\"abc\":\"GTM-XXX\"}"
```

---

## Step 9: EMQ 9+ Optimization Checklist

### User Data Collection
- [ ] Email (hash)
- [ ] Phone number (hash + normalize)
- [ ] First name (hash)
- [ ] Last name (hash)
- [ ] City (hash)
- [ ] State (hash)
- [ ] Zip code (hash)
- [ ] Country (ISO code)
- [ ] IP address (forward from CF-Connecting-IP)
- [ ] User agent (forward)
- [ ] External ID (customer.id)
- [ ] Click ID (fbc / fbclid)
- [ ] Browser ID (fbp)

### Event Quality
- [ ] Timestamps in microseconds
- [ ] Transaction ID unique
- [ ] Value + Currency together
- [ ] Item-level data
- [ ] Product ID consistent

**Expected Result:** EMQ Score 8.5-9.5/10

---

## Step 10: Cost Optimization

### 10.1 GTM Server Pricing

| Tier | Requests | Cost |
|------|----------|------|
| Free | 1M/month | $0 |
| Paid | 10M/month | ~$40 |
| Enterprise | 100M/month | ~$300 |

### 10.2 Reduce Requests

```javascript
// Batch events in Web Pixel
let eventQueue = [];

function flushQueue() {
  if (eventQueue.length === 0) return;
  
  fetch(WORKER_URL, {
    method: 'POST',
    body: JSON.stringify({
      events: eventQueue  // Batch format
    })
  });
  
  eventQueue = [];
}

// Flush every 5 seconds or on page unload
setInterval(flushQueue, 5000);
window.addEventListener('beforeunload', flushQueue);
```

---

## Complete Configuration Example

### wrangler.toml (Final)

```toml
[vars]
GTM_SERVER_URL = "https://gtm.yourstore.com"
UUID_ROTATION_ENABLED = "false"  # Set true for rotation
GTM_CONTAINER_ALIASES = '{"abc": "GTM-XXXXX", "xyz": "G-YYYYY"}'

# Advanced settings
RATE_LIMIT_REQUESTS = "200"
CACHE_TTL = "7200"  # 2 hours
```

### Web Pixel (Final)

```javascript
// shopify-app/extensions/web-pixel/src/index.js
import { register } from '@shopify/web-pixels-extension';
import { sha256 } from './utils/crypto.js';  // Hash utility

const CONFIG = {
  WORKER_URL: 'https://yourstore.com/cdn/g/a8f3c2e1-b8d4-4f5a-8c3e-2d1f9b4a7c6e',
  MEASUREMENT_ID: 'G-XXXXXXXXXX',
  TEST_ID: 'TEST12345'  // For Meta testing
};

register(async ({ analytics, browser, context }) => {
  // User consent check
  if (!context.consent?.marketing) return;

  // Subscribe to all events
  analytics.subscribe('all_events', async (event) => {
    const userData = await collectUserData(event, browser);
    const eventData = mapEvent(event);
    
    await forwardToTracklay({
      ...eventData,
      user_data: userData
    });
  });
});

async function collectUserData(event, browser) {
  // Get customer data from checkout
  const checkout = event.data.checkout;
  const customer = event.data.customer;
  
  const userData = {
    // From checkout (most reliable)
    email: checkout?.email ? await sha256(checkout.email.toLowerCase()) : undefined,
    phone_number: checkout?.phone ? await sha256(normalizePhone(checkout.phone)) : undefined,
    
    // From customer
    external_id: customer?.id ? await sha256(customer.id) : undefined,
    
    // From browser
    fbp: await browser.localStorage.getItem('_fbp'),
    fbc: await browser.cookie.get('_fbc')
  };
  
  return userData;
}

async function forwardToTracklay(payload) {
  await fetch(CONFIG.WORKER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}
```

---

## Resources

### GTM Server-Side
- **Documentation**: https://developers.google.com/tag-platform/tag-manager/server-side
- **Setup Wizard**: https://tagmanager.google.com

### Meta CAPI
- **Events Manager**: https://business.facebook.com/events_manager
- **CAPI Setup**: https://www.facebook.com/business/help/2041148702652965

### Tracklay
- **Setup Guide**: `docs/QUICK_START.md`
- **Web Pixel**: `docs/SHOPIFY-INTEGRATION.md`
- **UUID Rotation**: `docs/MIGRATION-V3.md`

---

## Support

**GTM Issues**: support.google.com/tagmanager
**Shopify Web Pixels**: community.shopify.com
**Tracklay**: github.com/your-repo/issues

---

**Document Version**: 2.0.0
**Next Review**: 01/02/2026
**Maintained By**: Tracklay Project
