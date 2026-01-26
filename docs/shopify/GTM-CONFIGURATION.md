# GTM Tag Configuration Guide

Detailed guide to configure Google Tag Manager tags to use your first-party proxy.

---

## Prerequisites

- ✅ Cloudflare Worker deployed at `cdn.yourdomain.com`
- ✅ Custom Pixel installed in Shopify
- ✅ GTM container created
- ✅ UUIDs generated and configured in `.env`

---

## Understanding the Proxy URLs

Your Worker provides these proxy endpoints:

| Original URL                                     | Proxy URL                                    | Purpose             |
| ------------------------------------------------ | -------------------------------------------- | ------------------- |
| `https://www.googletagmanager.com/gtm.js`        | `https://cdn.yourdomain.com/cdn/gtm.js`      | GTM script          |
| `https://connect.facebook.net/en_US/fbevents.js` | `https://cdn.yourdomain.com/cdn/fbevents.js` | Meta Pixel script   |
| `https://www.google-analytics.com/g/collect`     | `https://cdn.yourdomain.com/g/collect`       | GA4 endpoint        |
| `https://www.facebook.com/tr/`                   | `https://cdn.yourdomain.com/tr/{UUID}`       | Meta Pixel endpoint |

The UUID endpoints use the values from your `.env`:

- `ENDPOINTS_GOOGLE` for Google endpoints
- `ENDPOINTS_FACEBOOK` for Facebook endpoints

---

## Step 1: Create GTM Variables

Create these variables in GTM for easy configuration.

### 1.1 Create "Proxy Domain" Variable

1. In GTM, go to: **Variables → User-Defined Variables → New**
2. Click on Variable Configuration
3. Choose: **Constant**
4. Configure:
   - **Variable Name**: `Proxy Domain`
   - **Value**: `https://cdn.yourdomain.com` (replace with your domain)
5. Click **Save**

### 1.2 Create "Google Endpoint UUID" Variable

1. Create new **Constant** variable
2. Configure:
   - **Variable Name**: `Google Endpoint UUID`
   - **Value**: Your UUID from `.env` → `ENDPOINTS_GOOGLE`
   - Example: `05f23ffe-acfb-4676-9958-60c13aacd6b2`
3. Click **Save**

### 1.3 Create "Facebook Endpoint UUID" Variable

1. Create new **Constant** variable
2. Configure:
   - **Variable Name**: `Facebook Endpoint UUID`
   - **Value**: Your UUID from `.env` → `ENDPOINTS_FACEBOOK`
   - Example: `19ea1d6f-e84e-4aa5-8156-e00f052f7e68`
3. Click **Save**

**Why use variables?**

- Easy to update all tags at once
- No hardcoded URLs in tags
- Easier to test (swap to different domain for staging)

---

## Step 2: Configure Meta Pixel Tag

### 2.1 Find Your Meta Pixel Tag

1. Go to: **Tags**
2. Find your Facebook Pixel tag (usually named "FB Pixel" or "Meta Pixel")
3. Click to edit

### 2.2 Update Tag Configuration

Depending on your Meta Pixel tag type:

#### If Using "Facebook Pixel" Tag Template:

1. Scroll to **Advanced Settings**
2. Find **"Server Container URL"** or **"Custom Endpoint"**
3. Set to: `{{Proxy Domain}}/tr/{{Facebook Endpoint UUID}}`

Example result: `https://cdn.yourdomain.com/tr/19ea1d6f-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

#### If Using Custom HTML Tag:

Replace the standard Facebook Pixel code with this:

```html
<script>
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = '2.0';
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = '{{Proxy Domain}}/cdn/fbevents.js';
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, 'script');

  // Configure endpoint
  fbq.disablePushState = true; // Prevent automatic pageview
  fbq('set', 'autoConfig', false, '{{Facebook Pixel ID}}');
  fbq(
    'init',
    '{{Facebook Pixel ID}}',
    {},
    {
      eventID: '{{Event ID}}', // Optional: for deduplication
      agent: 'gtm_custom',
    }
  );

  // Override endpoint
  window._fbq.loadPlugin = function (plugin) {
    if (plugin === 'inferredEvents') return;
  };

  // Set custom endpoint
  if (window.fbq && window.fbq.instance) {
    window.fbq.instance.endpoint = '{{Proxy Domain}}/tr/{{Facebook Endpoint UUID}}';
  }
</script>

<!-- Track PageView -->
<script>
  fbq('track', 'PageView');
</script>
```

**Variables used:**

- `{{Proxy Domain}}` → Your proxy domain
- `{{Facebook Endpoint UUID}}` → Your Facebook UUID
- `{{Facebook Pixel ID}}` → Your Facebook Pixel ID (e.g., 1234567890)
- `{{Event ID}}` → Optional: GTM variable for event deduplication

### 2.3 Test Meta Pixel Tag

1. Enable **Preview Mode** in GTM
2. Visit your Shopify store
3. Open **Network tab** in DevTools
4. Filter by: `cdn.yourdomain.com`
5. You should see:
   - `GET cdn.yourdomain.com/cdn/fbevents.js`
   - `POST cdn.yourdomain.com/tr/19ea1d6f-...`

---

## Step 3: Configure Google Analytics 4 Tag

### 3.1 Find Your GA4 Configuration Tag

1. Go to: **Tags**
2. Find "GA4 Configuration" tag (usually named "GA4 Config" or similar)
3. Click to edit

### 3.2 Update Configuration

1. Scroll to **"Fields to Set"**
2. Click **"Add Field"**
3. Add these fields:

| Field Name               | Value                        |
| ------------------------ | ---------------------------- |
| `transport_url`          | `{{Proxy Domain}}/g/collect` |
| `first_party_collection` | `true`                       |

**Result:**

- `transport_url`: `https://cdn.yourdomain.com/g/collect`
- `first_party_collection`: `true`

### 3.3 Why These Settings?

- **transport_url**: Routes GA4 requests through your proxy
- **first_party_collection**: Tells GA4 this is first-party context (improves cookie lifetime)

### 3.4 Test GA4 Tag

1. Enable **Preview Mode** in GTM
2. Visit your store
3. Open **Network tab**
4. Filter by: `collect`
5. You should see requests to:
   - `https://cdn.yourdomain.com/g/collect?v=2&...`

---

## Step 4: Configure Other Tags (Optional)

### 4.1 Google Ads Conversion Tracking

If you use Google Ads conversion tracking:

1. Find your Google Ads Conversion tag
2. Add to **Fields to Set**:

| Field Name      | Value                        |
| --------------- | ---------------------------- |
| `transport_url` | `{{Proxy Domain}}/g/collect` |

### 4.2 TikTok Pixel (If Applicable)

TikTok Pixel can also be proxied. You would need to:

1. Add TikTok endpoint mapping to Worker
2. Update TikTok tag to use proxy URL

**Not implemented yet** - See [CAPI-V2-GAP-ANALYSIS.md](../CAPI-V2-GAP-ANALYSIS.md) for roadmap.

### 4.3 Pinterest Tag (If Applicable)

Similar to TikTok, would require Worker endpoint mapping.

**Not implemented yet** - See roadmap.

---

## Step 5: Configure Custom Events

### 5.1 Create Custom Event Triggers

Create triggers for Shopify events:

#### Trigger: View Item

1. Go to: **Triggers → New**
2. Trigger Type: **Custom Event**
3. Event name: `view_item`
4. This trigger fires on: **All Custom Events**
5. Save as: `CE - View Item`

#### Trigger: Add to Cart

1. Trigger Type: **Custom Event**
2. Event name: `add_to_cart`
3. Save as: `CE - Add to Cart`

#### Trigger: Begin Checkout

1. Trigger Type: **Custom Event**
2. Event name: `begin_checkout`
3. Save as: `CE - Begin Checkout`

#### Trigger: Purchase

1. Trigger Type: **Custom Event**
2. Event name: `purchase`
3. Save as: `CE - Purchase`

### 5.2 Create Meta Pixel Event Tags

Now create tags for each event:

#### Tag: Meta Pixel - Add to Cart

1. Go to: **Tags → New**
2. Tag Type: **Facebook Pixel** (or Custom HTML)
3. Configure:
   - **Event Name**: `AddToCart`
   - **Pixel ID**: Your Facebook Pixel ID
4. Use proxy endpoint (same as Step 2)
5. Trigger: `CE - Add to Cart`
6. Save

Repeat for:

- `ViewContent` (trigger: `CE - View Item`)
- `InitiateCheckout` (trigger: `CE - Begin Checkout`)
- `Purchase` (trigger: `CE - Purchase`)

### 5.3 Include Ecommerce Data

For better event quality, include ecommerce data:

1. Enable **Ecommerce Variables**:
   - Go to: **Variables → Configure**
   - Check: **Ecommerce Variables** (all)

2. In Meta Pixel tags, add parameters:
   - `value`: `{{Transaction Total}}` or `{{Ecommerce Value}}`
   - `currency`: `{{Ecommerce Currency}}`
   - `content_ids`: `{{Ecommerce Items - IDs}}`
   - `content_type`: `product`

---

## Step 6: Test Complete Setup

### 6.1 Enable GTM Preview

1. In GTM, click **Preview**
2. Enter your store URL
3. Click **Connect**

### 6.2 Test Each Event

**Page View:**

1. Visit homepage
2. In GTM Preview, verify:
   - `page_view` event received
   - Meta Pixel PageView fired
   - GA4 Config fired

**View Item:**

1. Click on a product
2. Verify in GTM Preview:
   - `view_item` event received
   - Ecommerce data populated
   - Meta Pixel ViewContent fired

**Add to Cart:**

1. Add product to cart
2. Verify:
   - `add_to_cart` event
   - Ecommerce items included
   - Meta Pixel AddToCart fired

**Begin Checkout:**

1. Click "Checkout"
2. Verify `begin_checkout` event

**Purchase:**

1. Complete a test order
2. Verify:
   - `purchase` event
   - Transaction ID included
   - Meta Pixel Purchase fired with correct value

### 6.3 Verify Network Requests

In Chrome DevTools → Network tab:

1. Filter by your domain: `cdn.yourdomain.com`
2. Verify all requests go through proxy
3. Check Status: should be `200 OK`
4. Check Response: should match original endpoints

### 6.4 Verify in Meta Events Manager

1. Go to Meta Events Manager
2. Click **Test Events**
3. Enter your store URL
4. Perform actions (view product, add to cart)
5. Verify events appear in Test Events
6. Check **Event Match Quality** (should be 7-9)

Required parameters for high EMQ:

- ✅ `em` (email) - on checkout/purchase events
- ✅ `ph` (phone) - on checkout/purchase events
- ✅ `client_ip_address` - added by Worker
- ✅ `client_user_agent` - added by Worker
- ✅ `fbp` - Facebook browser ID cookie
- ✅ `fbc` - Facebook click ID (if from ad)
- ✅ `event_id` - for deduplication

---

## Step 7: Publish GTM Container

Once testing is complete:

1. In GTM, click **Submit**
2. Add Version Name: "Shopify First-Party Tracking"
3. Add Version Description: "Configured proxy URLs for all tags"
4. Click **Publish**

---

## Advanced Configuration

### Event Deduplication

To avoid duplicate events (Pixel + CAPI):

1. Create GTM variable for Event ID:

   ```javascript
   function() {
     return 'shopify_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
   }
   ```

2. Include in Meta Pixel tags:

   ```javascript
   fbq(
     'track',
     'AddToCart',
     {
       // ... other params
     },
     {
       eventID: '{{Event ID}}',
     }
   );
   ```

3. Use same Event ID in server-side CAPI call

### Multi-Domain Tracking

If you have multiple domains:

1. Update `.env`:

   ```bash
   ALLOWED_ORIGINS=https://store1.com,https://store2.com,https://store3.com
   ```

2. Configure cross-domain tracking in GA4:
   - Add to GA4 Config → Fields to Set:
   - Field: `linker`, Value: `{"domains": ["store1.com", "store2.com"]}`

### A/B Testing

To test proxy vs direct:

1. Create GTM variable:

   ```javascript
   function() {
     return Math.random() < 0.5 ? '{{Proxy Domain}}' : 'https://www.facebook.com';
   }
   ```

2. Use in tags to split traffic 50/50

---

## Troubleshooting

### Tag Not Firing

**Check:**

1. Trigger is configured correctly
2. Event name matches (case-sensitive)
3. GTM Preview shows event received
4. No blocking errors in console

### Requests to Original Domain

**Check:**

1. Proxy domain variable is correct
2. Tag configuration uses `{{Proxy Domain}}` variable
3. No hardcoded URLs in tags
4. GTM container is published (not just preview)

### CORS Errors

**Check:**

1. `.env` has correct `ALLOWED_ORIGINS`
2. Includes both `myshopify.com` and custom domain
3. Uses `https://` protocol
4. Worker is deployed with latest .env

### Low Event Match Quality

**Check:**

1. Customer email/phone included (checkout events)
2. Worker forwards IP and User-Agent
3. `fbp` cookie is set (check cookies in DevTools)
4. Event ID is included for deduplication

---

## Performance Optimization

### Reduce Tag Load Time

1. Load only necessary tags
2. Use tag firing priority (Configuration tag = 1, Event tags = 2)
3. Enable async loading where possible

### Cache Optimization

Worker automatically caches:

- Scripts: 1 hour
- Ensure cache hit rate >80% in Cloudflare Analytics

### Request Batching

For high-traffic stores:

- Consider GTM Server-Side container (reduces client-side requests)
- See [CAPI-V2-GAP-ANALYSIS.md](../CAPI-V2-GAP-ANALYSIS.md) for setup

---

## Next Steps

- **Meta CAPI**: Add server-side conversion tracking for higher EMQ
- **GTM Server-Side**: Extend cookie lifetime, reduce client load
- **Advanced Evasion**: Service Worker, WebSocket for 98%+ bypass

See [SETUP.md](SETUP.md) for complete integration guide.

---

**Made with ❤️ for the Shopify community**
