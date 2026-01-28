# Migration Guide: v2.x → v3.0.0

**Tracklay v3.0.0 removes ALL legacy detectable routes for maximum anti-tracking protection.**

This is a **BREAKING CHANGE** that requires updating your Shopify theme before upgrading.

---

## Table of Contents

1. [What Changed](#what-changed)
2. [Before/After Comparison](#beforeafter-comparison)
3. [Step-by-Step Migration](#step-by-step-migration)
4. [Getting Your Obfuscated UUIDs](#getting-your-obfuscated-uuids)
5. [Shopify Theme Code Examples](#shopify-theme-code-examples)
6. [Troubleshooting](#troubleshooting)
7. [Rollback Instructions](#rollback-instructions)

---

## What Changed

### Removed Routes (10 Total)

**Scripts (7 routes):**

```
❌ /cdn/fbevents.js
❌ /cdn/gtm.js
❌ /cdn/gtag.js
❌ /assets/fbevents.js
❌ /assets/gtm.js
❌ /static/fbevents.js
❌ /static/gtm.js
```

**Endpoints (3 routes):**

```
❌ /tr (Facebook Pixel tracking)
❌ /g/collect (Google Analytics tracking)
❌ /j/collect (Google Analytics JS errors)
```

### Remaining Routes (Ultra-Aggressive - No Suffixes)

**Scripts & Endpoints (same path, differentiated by method/query):**

```
✅ /cdn/f/{FACEBOOK_UUID}
   - Script: GET /cdn/f/{UUID}
   - Endpoint: POST /cdn/f/{UUID} (tracking events)

✅ /cdn/g/{GOOGLE_UUID}
   - Script: GET /cdn/g/{UUID}?c=alias or ?id=GTM-XXX
   - Endpoint: GET /cdn/g/{UUID}?v=2&tid=... (tracking events)
```

**Note:** v3.0.0 implements ultra-aggressive obfuscation:

- NO file extensions (no `.js`)
- NO suffixes (no `-script`, `-gtm`, `-tag`)
- Same path for scripts and endpoints
- HTTP method or query params differentiate script vs tracking

---

## Before/After Comparison

### Facebook Pixel (Meta Pixel)

**BEFORE (v2.x - Legacy, Detectable):**

```html
<!-- Script Loading -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src='https://yourstore.com/cdn/fbevents.js';  ❌ REMOVED
  s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script');

  fbq('init', 'YOUR_PIXEL_ID');
  fbq('track', 'PageView');
</script>

<!-- Tracking Endpoint -->
<img
  height="1"
  width="1"
  style="display:none"
  src="https://yourstore.com/tr?id=YOUR_PIXEL_ID&ev=PageView&noscript=1"
/>
❌ REMOVED
```

**AFTER (v3.0.0 - Ultra-Aggressive, Undetectable):**

```html
<!-- Script Loading (NO SUFFIX - ultra-aggressive mode) -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src='https://yourstore.com/cdn/f/a8f3c2e1';  ✅ ULTRA-OBFUSCATED (no .js, no -script)
  s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script');

  fbq('init', 'YOUR_PIXEL_ID');
  fbq('track', 'PageView');
</script>

<!-- Tracking Endpoint: Same path, differentiated by POST method -->
<!-- Facebook Pixel automatically sends POST to same domain when tracking -->
```

### Google Tag Manager (GTM)

**BEFORE (v2.x - Legacy, Detectable):**

```html
<!-- GTM Script -->
<script async src="https://yourstore.com/cdn/gtm.js?id=GTM-XXXXX"></script>
❌ REMOVED

<!-- GTM Iframe (noscript fallback) -->
<noscript>
  <iframe
    src="https://yourstore.com/g/collect?id=GTM-XXXXX"
    height="0"
    width="0"
    style="display:none;visibility:hidden"
  ></iframe>
  ❌ REMOVED
</noscript>
```

**AFTER (v3.0.0 - Ultra-Aggressive, Undetectable):**

```html
<!-- GTM Script (NO SUFFIX - ultra-aggressive mode) -->
<script async src="https://yourstore.com/cdn/g/b7e4d3f2?id=GTM-XXXXX"></script>
✅ ULTRA-OBFUSCATED (no .js, no -gtm suffix)

<!-- Or with container alias for query obfuscation (maximum security): -->
<script async src="https://yourstore.com/cdn/g/b7e4d3f2?c=abc123"></script>
✅ MAXIMUM OBFUSCATION (GTM-XXXXX hidden via CONTAINER_ALIASES)

<!-- GTM Iframe (noscript fallback) - not needed, GTM handles endpoint internally -->
```

### Google Analytics 4 (GA4 / GTag)

**BEFORE (v2.x - Legacy, Detectable):**

```html
<!-- GA4 Script -->
<script async src="https://yourstore.com/cdn/gtag.js?id=G-XXXXXXXXXX"></script>
❌ REMOVED

<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

**AFTER (v3.0.0 - Ultra-Aggressive, Undetectable):**

```html
<!-- GA4 Script (NO SUFFIX - ultra-aggressive mode) -->
<script async src="https://yourstore.com/cdn/g/b7e4d3f2?id=G-XXXXXXXXXX"></script>
✅ ULTRA-OBFUSCATED (no .js, no -tag suffix)

<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag('js', new Date());

  // Configure with obfuscated transport_url (NO SUFFIX)
  gtag('config', 'G-XXXXXXXXXX', {
    transport_url: 'https://yourstore.com/cdn/g/b7e4d3f2',
  });
</script>

<!-- Maximum obfuscation with container alias: -->
<script async src="https://yourstore.com/cdn/g/b7e4d3f2?c=def456"></script>
<script>
  gtag('config', 'G-XXXXXXXXXX', {
    transport_url: 'https://yourstore.com/cdn/g/b7e4d3f2',
  });
</script>
✅ MAXIMUM OBFUSCATION (G-XXXXXXXXXX hidden via CONTAINER_ALIASES)
```

---

## Step-by-Step Migration

### Step 1: Get Your Obfuscated UUIDs

You need to obtain your unique UUIDs before updating your theme.

**Option A: Use the `npm run urls` command**

```bash
cd /path/to/tracklay
npm run urls https://yourstore.com
```

This will display your ultra-obfuscated URLs (no suffixes):

```
🔵 FACEBOOK PIXEL (Meta Pixel)

   Ultra-Obfuscated Path (v3.0.0 - no suffix):
   https://yourstore.com/cdn/f/a8f3c2e1

   UUID: a8f3c2e1
   - Script (GET): /cdn/f/a8f3c2e1
   - Endpoint (POST): /cdn/f/a8f3c2e1

🔴 GOOGLE ANALYTICS / TAG MANAGER

   Ultra-Obfuscated Path (v3.0.0 - no suffix):
   https://yourstore.com/cdn/g/b7e4d3f2

   UUID: b7e4d3f2
   - GTM Script: /cdn/g/b7e4d3f2?id=GTM-XXXXX
   - GTag Script: /cdn/g/b7e4d3f2?id=G-XXXXX
   - With alias: /cdn/g/b7e4d3f2?c=abc123 (CONTAINER_ALIASES required)

   Note: Same path for scripts and endpoints, differentiated by query params
```

**Option B: Check your .env file**

```bash
cat .env | grep ENDPOINT_ID
```

You'll see:

```
ENDPOINTS_FACEBOOK=a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e
ENDPOINTS_GOOGLE=b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f
```

**Option C: Generate new UUIDs (recommended for fresh start)**

```bash
# Generate new Facebook UUID
node -e "console.log(require('crypto').randomUUID())"
# Output: a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e

# Generate new Google UUID
node -e "console.log(require('crypto').randomUUID())"
# Output: b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f
```

Then set them in your `.env` file or Cloudflare Dashboard.

### Step 2: Update Shopify Theme Files

1. **Backup your current theme**
   - Shopify Admin → Online Store → Themes
   - Click "Actions" → "Duplicate" on your live theme

2. **Locate tracking code**
   - Usually in `theme.liquid` or `snippets/tracking.liquid`
   - Search for: `fbevents.js`, `gtm.js`, `gtag.js`, `/tr`

3. **Replace with obfuscated URLs**
   - Use the URLs from Step 1
   - See [Shopify Theme Code Examples](#shopify-theme-code-examples) below

4. **Test on preview theme**
   - Preview your changes
   - Check browser console for errors
   - Verify tracking in Facebook Events Manager / Google Analytics Real-Time

5. **Publish updated theme**
   - Once verified, publish the updated theme

### Step 3: Deploy Tracklay v3.0.0

**ONLY after your theme is updated**, deploy v3.0.0:

```bash
cd /path/to/tracklay
git pull origin main
npm run deploy
```

### Step 4: Verify Tracking Works

1. **Facebook Pixel:**
   - Visit your store
   - Check Events Manager → Test Events
   - Should see PageView events arriving

2. **Google Analytics:**
   - Visit your store
   - Check GA4 Real-Time reports
   - Should see active users

3. **Check for errors:**
   - Browser console (F12)
   - Should be zero 404 errors for scripts

---

## Getting Your Obfuscated UUIDs

### Understanding UUIDs

Tracklay uses UUIDs (Universally Unique Identifiers) to create unique, undetectable tracking routes.

**Example UUID:**

```
a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e
```

**Benefits:**

- Ad-blockers can't pattern-match UUIDs (no "fbevents" or "gtm" in URL)
- Each installation has unique UUIDs
- Can be rotated for maximum security

### How UUIDs Are Generated

**Default (Auto-generated):**

- Tracklay auto-generates UUIDs on first run
- Stored in Cloudflare Workers environment variables
- Remain constant unless manually changed

**Custom (Recommended for production):**

```bash
# Generate random UUID
node -e "console.log(require('crypto').randomUUID())"

# Set in .env
ENDPOINTS_FACEBOOK=your-uuid-here
ENDPOINTS_GOOGLE=your-uuid-here

# Deploy
npm run deploy
```

### UUID Rotation (Automatic - v3.0.0 Feature)

**v3.0.0 includes AUTOMATIC UUID rotation** for maximum security:

**How it works:**

- UUIDs rotate weekly (default: 7 days)
- Time-based deterministic generation (all workers synchronized)
- No manual intervention required
- Ad-blockers cannot blacklist permanently

**Configuration:**

```bash
# Rotation enabled (DEFAULT - RECOMMENDED)
ENDPOINTS_UUID_ROTATION=false  # false = rotation ON

# Shopify integration via Metafields + n8n/GitHub Actions
# Fetches current UUIDs from /endpoints?token=SECRET every 6 days
# See: docs/SHOPIFY-INTEGRATION.md for complete guide
```

**Manual Rotation (if rotation disabled):**

If you disabled automatic rotation (`ENDPOINTS_UUID_ROTATION=true`), you can manually rotate every 1-3 months:

```bash
# 1. Generate new UUIDs
FB_UUID=$(node -e "console.log(require('crypto').randomUUID())")
GOOGLE_UUID=$(node -e "console.log(require('crypto').randomUUID())")

# 2. Update Cloudflare Workers environment
wrangler secret put ENDPOINTS_FACEBOOK
wrangler secret put ENDPOINTS_GOOGLE

# 3. Update Shopify theme with new UUIDs
# 4. Deploy: npm run deploy
```

**Recommendation:** Use automatic rotation (default) with n8n/GitHub Actions integration for zero-touch security. See [SHOPIFY-INTEGRATION.md](SHOPIFY-INTEGRATION.md).

---

## Shopify Theme Code Examples

### Complete Facebook Pixel Integration

```liquid
<!-- theme.liquid - Before closing </head> tag -->

<!-- Facebook Pixel Code (v3.0.0 - NO SUFFIX) -->
<script>
  !function(f,b,e,v,n,t,s)
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  n.queue=[];t=b.createElement(e);t.async=!0;
  t.src='https://{{ shop.domain }}/cdn/f/{{ settings.facebook_uuid }}';
  s=b.getElementsByTagName(e)[0];
  s.parentNode.insertBefore(t,s)}(window, document,'script');

  fbq('init', '{{ settings.facebook_pixel_id }}');
  fbq('track', 'PageView');
</script>
<!-- End Facebook Pixel Code -->

<!-- NOTE: NO -script.js suffix! Ultra-aggressive mode uses /cdn/f/{UUID} only -->
```

**Theme Settings Schema (config/settings_schema.json):**

```json
{
  "name": "Tracking",
  "settings": [
    {
      "type": "text",
      "id": "facebook_pixel_id",
      "label": "Facebook Pixel ID",
      "info": "Your Facebook Pixel ID (e.g., 123456789012345)"
    },
    {
      "type": "text",
      "id": "facebook_uuid",
      "label": "Facebook Obfuscated UUID",
      "info": "From Tracklay: npm run urls"
    }
  ]
}
```

### Complete Google Tag Manager Integration

```liquid
<!-- theme.liquid - Before closing </head> tag -->

<!-- Google Tag Manager (v3.0.0 - NO SUFFIX) -->
<script>
  (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
  new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
  j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
  'https://{{ shop.domain }}/cdn/g/{{ settings.google_uuid }}?id='+i+dl;
  f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','{{ settings.gtm_container_id }}');
</script>
<!-- End Google Tag Manager -->

<!-- NOTE: NO -gtm.js suffix! Ultra-aggressive mode uses /cdn/g/{UUID}?id=... -->

<!-- MAXIMUM SECURITY: Use container alias to hide GTM-XXXXX -->
<!-- Requires CONTAINER_ALIASES='{"abc123":"GTM-XXXXX"}' in worker config -->
<!--
<script>
  j.src='https://{{ shop.domain }}/cdn/g/{{ settings.google_uuid }}?c=abc123';
</script>
-->
```

**Theme Settings Schema:**

```json
{
  "type": "text",
  "id": "gtm_container_id",
  "label": "GTM Container ID",
  "info": "Your GTM Container ID (e.g., GTM-XXXXX)"
},
{
  "type": "text",
  "id": "google_uuid",
  "label": "Google Obfuscated UUID",
  "info": "From Tracklay: npm run urls"
}
```

### Complete Google Analytics 4 Integration

```liquid
<!-- theme.liquid - Before closing </head> tag -->

<!-- Google Analytics 4 (v3.0.0 - NO SUFFIX) -->
<script async src="https://{{ shop.domain }}/cdn/g/{{ settings.google_uuid }}?id={{ settings.ga4_measurement_id }}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '{{ settings.ga4_measurement_id }}', {
    'transport_url': 'https://{{ shop.domain }}/cdn/g/{{ settings.google_uuid }}',
    'first_party_collection': true
  });
</script>
<!-- End Google Analytics 4 -->

<!-- NOTE: NO -tag.js suffix! Ultra-aggressive mode uses /cdn/g/{UUID}?id=... -->
<!-- NOTE: transport_url also NO SUFFIX (.js removed) -->

<!-- MAXIMUM SECURITY: Use container alias to hide G-XXXXXXXXXX -->
<!-- Requires CONTAINER_ALIASES='{"def456":"G-XXXXXXXXXX"}' in worker config -->
<!--
<script async src="https://{{ shop.domain }}/cdn/g/{{ settings.google_uuid }}?c=def456"></script>
-->
```

**Theme Settings Schema:**

```json
{
  "type": "text",
  "id": "ga4_measurement_id",
  "label": "GA4 Measurement ID",
  "info": "Your GA4 Measurement ID (e.g., G-XXXXXXXXXX)"
}
```

---

## Troubleshooting

### Scripts not loading (404 errors)

**Problem:** Browser console shows 404 errors for script URLs

**Solutions:**

1. Verify UUIDs are correct (run `npm run urls`)
2. Check Cloudflare Workers deployment status
3. Test Worker directly: `curl https://yourstore.com/health`
4. Verify Cloudflare route configuration (should route `yourstore.com/cdn/*` to Worker)

### Tracking events not arriving

**Facebook Pixel:**

1. Check Events Manager → Test Events
2. Verify Pixel ID is correct in theme
3. Check browser console for JavaScript errors
4. Verify `fbq` function is defined: Open console, type `fbq`, should show function

**Google Analytics:**

1. Check Real-Time reports (Audience → Real-Time → Overview)
2. Verify Measurement ID / Container ID is correct
3. Check browser console for errors
4. Verify `gtag` function is defined: Open console, type `gtag`, should show function

### CORS errors

**Problem:** Console shows CORS errors when loading scripts

**Solutions:**

1. Verify `ALLOWED_ORIGINS` in Cloudflare Workers includes your shop domain
2. Check that both `yourstore.myshopify.com` AND custom domain are listed
3. Redeploy Worker after updating ALLOWED_ORIGINS

### UUIDs changed after redeploy

**Problem:** UUIDs are different after deploying Worker

**Cause:** Auto-generation creates new UUIDs on each deploy if not set in environment

**Solution:** Set UUIDs explicitly in Cloudflare Dashboard or .env:

```bash
wrangler secret put ENDPOINTS_FACEBOOK
wrangler secret put ENDPOINTS_GOOGLE
```

### Ad-blockers still blocking

**Problem:** Some users still have tracking blocked

**Possible causes:**

1. Using legacy URLs (check theme code)
2. Ad-blocker has UUID in custom blacklist (rotate UUIDs)
3. Browser privacy settings blocking all tracking (user choice, can't bypass)

**Verification:**

- v3.0.0 should have ~10-20% detection rate (down from 90-100%)
- Test with uBlock Origin, AdBlock Plus in Incognito mode
- Obfuscated routes should load successfully

---

## Rollback Instructions

If you need to rollback to v2.x after upgrading:

### Option 1: Redeploy v2.x Worker

```bash
cd /path/to/tracklay

# Checkout v2.x tag (replace with actual version)
git checkout v2.9.0

# Redeploy
npm run deploy

# Your v2.x theme code will work again
```

### Option 2: Re-enable Legacy Routes (Emergency Only)

**⚠️ NOT RECOMMENDED** - Defeats the security purpose of v3.0.0

Edit `src/routing/mapping.js` and uncomment removed routes, then redeploy.

---

## Support

**Need help with migration?**

- [Open an issue](https://github.com/your-github-username/tracklay/issues)
- [Discussions](https://github.com/your-github-username/tracklay/discussions)
- [Check OBFUSCATION.md](docs/OBFUSCATION.md) for security best practices

---

**Migrated successfully?** Please star the repo if Tracklay helps you recover lost conversions!
