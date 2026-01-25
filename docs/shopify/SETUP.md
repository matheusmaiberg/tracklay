# Shopify Integration Setup Guide

Complete guide to integrate Tracklay with your Shopify store using Custom Pixels and Google Tag Manager.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     SHOPIFY STORE                            │
│                                                              │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Custom Pixel (Shopify Sandbox)                    │     │
│  │  - Loads GTM from proxy                            │     │
│  │  - Subscribes to all_standard_events               │     │
│  │  - Pushes to window.dataLayer                      │     │
│  └────────────────┬───────────────────────────────────┘     │
│                   │                                          │
│                   ▼                                          │
│  ┌────────────────────────────────────────────────────┐     │
│  │  Google Tag Manager (Browser)                      │     │
│  │  - Reads from window.dataLayer                     │     │
│  │  - Fires tags (Meta Pixel, GA4, etc)               │     │
│  │  - Uses proxy URLs for all scripts                 │     │
│  └────────────────┬───────────────────────────────────┘     │
└────────────────────┼────────────────────────────────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  Cloudflare Worker Proxy   │
        │  (cdn.yourdomain.com)      │
        │  - Proxies GTM script      │
        │  - Proxies Meta Pixel      │
        │  - Proxies tracking calls  │
        └────────────┬───────────────┘
                     │
                     ▼
        ┌────────────────────────────┐
        │  Tracking Providers        │
        │  - Google Analytics        │
        │  - Meta Pixel              │
        │  - etc.                    │
        └────────────────────────────┘
```

---

## Step 1: Deploy Cloudflare Worker

Before setting up Shopify, you need your Cloudflare Worker deployed.

### 1.1 Configure Environment

Create `.env` file:

```bash
# Your Shopify domain
ALLOWED_ORIGINS=https://yourstore.myshopify.com,https://www.yourstore.com

# Generate UUIDs for obfuscation (run: node -e "console.log(crypto.randomUUID())")
FACEBOOK_ENDPOINT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
GOOGLE_ENDPOINT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
UUID_SECRET=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# Rate limiting
RATE_LIMIT=100
```

### 1.2 Deploy Worker

```bash
npm install
npm run deploy
```

### 1.3 Configure Custom Domain

In Cloudflare dashboard:
1. Go to Workers & Pages → Your Worker → Settings → Triggers
2. Add custom domain: `cdn.yourstore.com`
3. Verify DNS is configured correctly

Test the worker:
```bash
curl https://cdn.yourstore.com/cdn/health
# Should return: {"status":"ok","version":"2.0.0"}
```

---

## Step 2: Install Custom Pixel in Shopify

### 2.1 Copy Custom Pixel Code

1. Open [custom-pixel.js](examples/custom-pixel.js)
2. Copy the entire file content

### 2.2 Configure Custom Pixel

Edit these values at the top of the file:

```javascript
const CONFIG = {
  // Your GTM container ID
  GTM_ID: 'GTM-XXXXXXX',  // ← Replace with your GTM ID

  // Your proxy domain
  PROXY_DOMAIN: 'https://cdn.yourstore.com',  // ← Replace with your domain

  // Enable debug logging (disable in production)
  DEBUG: true,  // ← Set to false in production

  // Default currency
  DEFAULT_CURRENCY: 'EUR'  // ← Your store currency
};
```

### 2.3 Install in Shopify

1. Go to Shopify Admin
2. Navigate to: **Settings → Customer Events**
3. Click: **Add custom pixel**
4. Name it: `GTM First-Party Tracking`
5. Paste the configured code
6. Click: **Save**

### 2.4 Grant Permissions

The pixel needs these permissions (Shopify will ask):
- ✅ Customer events - Read
- ✅ Customer privacy - Read

---

## Step 3: Configure Google Tag Manager

### 3.1 Update GTM Configuration

You need to configure GTM tags to use your proxy URLs instead of default URLs.

#### Option A: Using GTM Variables (Recommended)

1. In GTM, create a **Constant Variable**:
   - Name: `Proxy Domain`
   - Value: `https://cdn.yourstore.com`

2. Create another variable:
   - Name: `Google Endpoint UUID`
   - Value: `your-google-uuid-from-env`

3. Create another variable:
   - Name: `Facebook Endpoint UUID`
   - Value: `your-facebook-uuid-from-env`

#### Option B: Direct Configuration

Update each tag individually (see next section).

### 3.2 Configure Meta Pixel Tag

1. Go to your Meta Pixel tag in GTM
2. Enable "Override Configuration Settings"
3. Add these settings:

```
Script URL: {{Proxy Domain}}/cdn/fbevents.js
Event Endpoint: {{Proxy Domain}}/tr/{{Facebook Endpoint UUID}}
```

Or if using direct values:

```
Script URL: https://cdn.yourstore.com/cdn/fbevents.js
Event Endpoint: https://cdn.yourstore.com/tr/19ea1d6f-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

### 3.3 Configure Google Analytics 4 Tag

1. Go to your GA4 Configuration tag
2. Click on "Fields to Set"
3. Add these fields:

| Field Name | Value |
|------------|-------|
| `transport_url` | `{{Proxy Domain}}/g/collect` |
| `first_party_collection` | `true` |

Or direct:
```
transport_url: https://cdn.yourstore.com/g/collect
first_party_collection: true
```

### 3.4 Test GTM Configuration

1. Enable GTM Preview mode
2. Visit your Shopify store
3. Verify in Network tab:
   - GTM loads from: `cdn.yourstore.com/cdn/gtm.js`
   - Meta Pixel loads from: `cdn.yourstore.com/cdn/fbevents.js`
   - Requests go to: `cdn.yourstore.com/tr/...` and `cdn.yourstore.com/g/collect`

---

## Step 4: Test the Integration

### 4.1 Enable Debug Mode

In Custom Pixel, set:
```javascript
DEBUG: true
```

### 4.2 Test Standard Events

Open browser console and:

1. **Visit homepage**: Should see `page_view` event
2. **Visit product page**: Should see `view_item` event
3. **Add to cart**: Should see `add_to_cart` event
4. **Start checkout**: Should see `begin_checkout` event
5. **Complete purchase**: Should see `purchase` event

### 4.3 Verify in GTM Preview

1. Open GTM in Preview mode
2. Visit your store
3. Check if events appear in GTM debugger
4. Verify tags are firing correctly

### 4.4 Verify in Meta Events Manager

1. Go to Meta Events Manager
2. Click "Test Events"
3. Enter your store URL
4. Verify events are received with high Event Match Quality (EMQ 7+)

### 4.5 Check Event Match Quality

Good EMQ requires these parameters:
- ✅ `em` (email) - hashed
- ✅ `ph` (phone) - hashed
- ✅ `client_ip_address`
- ✅ `client_user_agent`
- ✅ `fbp` (Facebook browser ID)
- ✅ `fbc` (Facebook click ID)
- ✅ `event_id` (for deduplication)

The Custom Pixel provides email/phone on checkout events.
The Worker adds IP and User-Agent automatically.

---

## Step 5: Privacy & Consent

### 5.1 Consent Mode Configuration

The Custom Pixel automatically:
- ✅ Reads Shopify's consent state
- ✅ Updates GTM Consent Mode
- ✅ Respects user privacy choices
- ✅ Subscribes to consent changes

Events are filtered based on consent:
- **Marketing events** (add_to_cart, checkout, purchase) require `marketingAllowed`
- **Analytics events** (page_view, view_item) require `analyticsProcessingAllowed`

### 5.2 Configure Shopify Consent Banner

1. Go to: **Settings → Customer Privacy**
2. Enable: **Customer Privacy API**
3. Configure your consent banner (or use Shopify's default)

### 5.3 Test Consent Flow

1. Visit store in incognito
2. Reject marketing cookies
3. Verify checkout events are NOT sent
4. Accept cookies
5. Verify events are sent

---

## Step 6: Production Deployment

### 6.1 Disable Debug Mode

In Custom Pixel:
```javascript
DEBUG: false
```

### 6.2 Monitor Performance

Check Cloudflare Analytics:
- Requests per minute
- Cache hit rate (should be >80%)
- Error rate (should be <1%)
- P95 latency (should be <100ms)

### 6.3 Monitor Event Quality

Check Meta Events Manager:
- Event Match Quality (target: 7-9)
- Events received
- Deduplication rate

### 6.4 Set Up Alerts (Optional)

In Cloudflare:
1. Workers → Your Worker → Triggers → Configure alerts
2. Set alert for:
   - Error rate >5%
   - Request rate anomaly

---

## Troubleshooting

### Events Not Appearing in GTM

**Symptoms**: Console shows events pushed, but GTM doesn't see them

**Solutions**:
1. Check if GTM loaded: `console.log(window.dataLayer)`
2. Verify GTM ID is correct in Custom Pixel
3. Check browser console for errors
4. Enable GTM Preview mode to debug

### Events Not Reaching Meta

**Symptoms**: GTM fires Meta tag, but Meta doesn't receive

**Solutions**:
1. Check proxy URLs in Meta Pixel tag settings
2. Verify UUID is correct (`FACEBOOK_ENDPOINT_ID`)
3. Check Network tab: requests should go to `cdn.yourstore.com/tr/...`
4. Check Cloudflare logs for errors

### Low Event Match Quality

**Symptoms**: EMQ below 6

**Solutions**:
1. Verify customer email/phone are included (checkout events)
2. Check if Worker forwards IP and User-Agent correctly
3. Ensure `fbp` and `fbc` cookies are set
4. Use Test Events in Meta to see missing parameters

### Rate Limiting Issues

**Symptoms**: 429 errors in console

**Solutions**:
1. Increase `RATE_LIMIT` in `.env` (default: 100 req/min)
2. Check if bot is hitting your endpoints
3. Review Cloudflare Analytics for traffic patterns

### CORS Errors

**Symptoms**: Console shows CORS errors

**Solutions**:
1. Verify `ALLOWED_ORIGINS` includes all your store domains
2. Include both `yourstore.myshopify.com` and custom domain
3. Check if domain has `www` subdomain variant

---

## Advanced Configuration

### Multi-Currency Support

If your store uses multiple currencies:

```javascript
const CONFIG = {
  // ...
  DEFAULT_CURRENCY: 'USD',  // Fallback currency
};
```

GTM events will use Shopify's currency from event data automatically.

### Custom Events

To track custom Shopify events, add mapper to Custom Pixel:

```javascript
const EventMappers = {
  // ... existing mappers

  my_custom_event(event) {
    return {
      event: 'custom_action',
      custom_param: getPath(event, 'data.customField')
    };
  }
};
```

### Additional Tracking Tags

To add more tracking providers (TikTok, Pinterest, etc):
1. Create tag in GTM
2. Configure to use proxy URLs
3. Add endpoint mapping in Worker if needed

---

## Performance Best Practices

### 1. Cache Optimization

Worker automatically caches:
- GTM script: 1 hour
- Meta Pixel script: 1 hour
- UUID-rotated scripts: 1 hour

### 2. Request Optimization

Custom Pixel:
- Uses `all_standard_events` (1 subscription instead of 10+)
- Pushes directly to dataLayer (no unnecessary analytics.publish calls)
- No retry queue (dataLayer.push is synchronous)

### 3. Consent Optimization

- Filters events before sending (saves bandwidth)
- Updates consent state dynamically
- No events sent without consent

---

## Next Steps

Once basic integration is working:

1. **Enable Meta CAPI**: See [CAPI-V2-GAP-ANALYSIS.md](../CAPI-V2-GAP-ANALYSIS.md) for server-side conversion tracking
2. **Set up GTM Server-Side**: Extend cookie lifetime from 7 days to 90 days
3. **Implement Advanced Evasion**: Service Worker, WebSocket streaming (98-99% ad-blocker bypass)
4. **Add Profit Tracking**: COGS tracking for margin-based bidding

---

## Support

- **Documentation**: [../README.md](../README.md)
- **FAQ**: [../FAQ.md](../FAQ.md)
- **Issues**: GitHub Issues
- **Shopify Docs**: https://shopify.dev/docs/api/web-pixels-api

---

**Made with ❤️ for the Shopify community**
