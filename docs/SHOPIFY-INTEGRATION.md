# Shopify Theme Integration - UUID Rotation Strategies

## Overview

This guide covers 3 strategies for integrating rotating UUIDs with Shopify themes.

**Version:** 3.0.0
**Last Updated:** 2026-01-25

---

## Table of Contents

1. [Strategy 1: Metafields + n8n (RECOMMENDED)](#strategy-1-metafields--n8n-recommended)
2. [Strategy 2: Fixed UUIDs (SIMPLE)](#strategy-2-fixed-uuids-simple)
3. [Strategy 3: Client-Side Fetch (NOT RECOMMENDED)](#strategy-3-client-side-fetch-not-recommended)
4. [Comparison Table](#comparison-table)
5. [Security Best Practices](#security-best-practices)
6. [Alternative: GitHub Actions](#alternative-github-actions)
7. [Troubleshooting](#troubleshooting)

---

## ⭐ Strategy 1: Metafields + n8n (RECOMMENDED)

**Best for:** Production deployments with maximum security

### How it Works

```
n8n Workflow → Worker /endpoints?token=xxx → Shopify Admin API
(every 6 days)   (authenticated)              (update metafields)

Shopify Theme → Read metafields (public, rotating)
```

### Architecture Flow

1. n8n workflow runs every 6 days (before 7-day expiration)
2. Fetches current UUIDs from `/endpoints?token=SECRET` (server-side)
3. Updates Shopify metafields via Admin API
4. Theme reads metafields (public access, no secret exposed)

### Pros & Cons

✅ **Pros:**

- Secret never exposed to client
- Automatic rotation every 7 days
- UUIDs public but rotate frequently
- Maximum security (ad-blockers cannot scrape secret)
- Zero manual intervention

❌ **Cons:**

- Requires n8n or GitHub Actions setup
- Needs Shopify Admin API token
- Initial setup complexity (30-60 minutes)

---

### Setup: n8n Workflow

**Step 1: Create n8n Workflow**

```javascript
// Node 1: Schedule Trigger
// Cron: 0 0 */6 * * (every 6 days at midnight)

// Node 2: HTTP Request - Fetch UUIDs
{
  "method": "GET",
  "url": "https://cdn.yourstore.com/endpoints?token={{ $credentials.endpoints_secret }}",
  "authentication": "none" // Using query string, not header
}

// Node 3: Code - Extract UUIDs
const response = $input.item.json;
return {
  facebook_uuid: response.facebook.uuid,
  google_uuid: response.google.uuid,
  expires_at: response.expiresAt
};

// Node 4: Shopify - Set Metafields
// Use Shopify node or HTTP Request with GraphQL
```

**Step 2: Shopify GraphQL Mutation**

```graphql
mutation UpdateTrackingMetafields($metafields: [MetafieldsSetInput!]!) {
  metafieldsSet(metafields: $metafields) {
    metafields {
      id
      namespace
      key
      value
    }
    userErrors {
      field
      message
    }
  }
}
```

**Variables:**

```json
{
  "metafields": [
    {
      "namespace": "tracklay",
      "key": "facebook_uuid",
      "value": "{{ $node['Code'].json.facebook_uuid }}",
      "type": "single_line_text_field",
      "ownerId": "gid://shopify/Shop/YOUR_SHOP_ID"
    },
    {
      "namespace": "tracklay",
      "key": "google_uuid",
      "value": "{{ $node['Code'].json.google_uuid }}",
      "type": "single_line_text_field",
      "ownerId": "gid://shopify/Shop/YOUR_SHOP_ID"
    }
  ]
}
```

**Step 3: Add to Shopify Theme**

```liquid
<!-- theme.liquid - Before </head> -->
<script>
// Read UUIDs from metafields (public, rotating every 7 days)
const fbUUID = '{{ shop.metafields.tracklay.facebook_uuid }}';
const googleUUID = '{{ shop.metafields.tracklay.google_uuid }}';

// Initialize Facebook Pixel
!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=`https://cdn.yourstore.com/cdn/f/${fbUUID}`;
s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script');

fbq('init', 'YOUR_PIXEL_ID');
fbq('track', 'PageView');

// Initialize Google Analytics
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-XXXXXXXXXX', {
  'transport_url': `https://cdn.yourstore.com/cdn/g/${googleUUID}`
});

const gtagScript = document.createElement('script');
gtagScript.async = true;
gtagScript.src = `https://cdn.yourstore.com/cdn/g/${googleUUID}?c=YOUR_CONTAINER_ALIAS`;
document.head.appendChild(gtagScript);
</script>
```

**Step 4: n8n Credentials Setup**

1. Create credential: `endpoints_secret`
2. Type: Generic credential
3. Value: Your `ENDPOINTS_SECRET` from Cloudflare Workers
4. Use in HTTP Request node: `{{ $credentials.endpoints_secret }}`

---

## 🔧 Strategy 2: Fixed UUIDs (SIMPLE)

**Best for:** Quick setup, manual rotation acceptable

### Setup

**Step 1: Configure Worker**

```bash
# .env or Cloudflare Dashboard
ENDPOINTS_UUID_ROTATION=true
ENDPOINTS_FACEBOOK=a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e
ENDPOINTS_GOOGLE=b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f
```

**Step 2: Hardcode in Theme**

```liquid
<script>
const fbUUID = 'a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e';
const googleUUID = 'b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f';

// ... rest of tracking code (same as Strategy 1)
</script>
```

**Step 3: Manual Rotation (every 1-3 months)**

```bash
# Generate new UUIDs
node -e "console.log(require('crypto').randomUUID())"
# Output: a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e

# Update worker env vars
wrangler secret put ENDPOINTS_FACEBOOK
# Paste new UUID

wrangler secret put ENDPOINTS_GOOGLE
# Paste new UUID

# Update theme code with new UUIDs
# Deploy new theme version
```

### Pros & Cons

✅ **Pros:**

- Zero infrastructure (no n8n/GitHub Actions)
- Simple setup (5 minutes)
- Works immediately
- No external dependencies

❌ **Cons:**

- UUIDs don't auto-rotate
- Manual rotation needed (every 1-3 months)
- If discovered, valid until manually rotated
- Requires theme redeployment for rotation

---

## ⚠️ Strategy 3: Client-Side Fetch (NOT RECOMMENDED)

**Why NOT recommended:**

```javascript
// ❌ PROBLEM: Secret exposed in browser source code
fetch('https://cdn.yourstore.com/endpoints?token=abc123...')
  .then((r) => r.json())
  .then((data) => {
    // Use data.facebook.uuid and data.google.uuid
  });
```

**Ad-blockers can:**

1. Inspect page source (View Source or DevTools)
2. Extract `ENDPOINTS_SECRET` from fetch URL
3. Scrape `/endpoints?token=SECRET` themselves
4. Blacklist all current and future UUIDs
5. Monitor for new UUIDs and blacklist automatically

**Result:** Authentication is defeated. Maximum security becomes minimum security.

**When to use:** Only for testing/development in localhost, never production.

---

## 📋 Comparison Table

| Strategy              | Security      | Complexity | Auto-Rotation | Setup Time | Maintenance |
| --------------------- | ------------- | ---------- | ------------- | ---------- | ----------- |
| **Metafields + n8n**  | ⭐⭐⭐⭐⭐    | Medium     | ✅ Yes (7d)   | 30-60 min  | Zero        |
| **Fixed UUIDs**       | ⭐⭐⭐        | Low        | ❌ Manual     | 5 min      | Monthly     |
| **Client-Side Fetch** | ⭐ (INSECURE) | Low        | ✅ Yes (7d)   | 10 min     | Zero        |

**Recommendation:** Use Strategy 1 (Metafields + n8n) for production. Use Strategy 2 for testing or low-traffic sites.

---

## 🔐 Security Best Practices

1. ✅ **NEVER** commit `ENDPOINTS_SECRET` to git
2. ✅ Use `wrangler secret put` for production secrets
3. ✅ Rotate UUIDs regularly (automatic with Strategy 1)
4. ✅ Monitor ad-blocker detection rates via analytics
5. ✅ Use HTTPS only (Cloudflare provides free SSL)
6. ✅ Limit `/endpoints` access to known IPs (optional Cloudflare WAF rule)
7. ❌ **NEVER** expose `ENDPOINTS_SECRET` in theme Liquid code
8. ❌ **NEVER** use Strategy 3 (client-side fetch) in production

**Additional Security Layers:**

- **Cloudflare WAF:** Restrict `/endpoints` to n8n/GitHub Actions IPs
- **Rate Limiting:** Worker already includes rate limiting (100 req/min)
- **Monitoring:** Log authentication attempts (already implemented)

---

## 🛠️ Alternative: GitHub Actions

If you don't have n8n, use GitHub Actions for free:

**File:** `.github/workflows/update-shopify-metafields.yml`

```yaml
name: Update Shopify Tracking Metafields

on:
  schedule:
    - cron: '0 0 */6 * *' # Every 6 days at midnight UTC
  workflow_dispatch: # Manual trigger button

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - name: Fetch Current UUIDs
        id: fetch
        run: |
          RESPONSE=$(curl -s "https://cdn.yourstore.com/endpoints?token=${{ secrets.ENDPOINTS_SECRET }}")

          FB_UUID=$(echo $RESPONSE | jq -r '.facebook.uuid')
          GOOGLE_UUID=$(echo $RESPONSE | jq -r '.google.uuid')

          echo "fb_uuid=$FB_UUID" >> $GITHUB_OUTPUT
          echo "google_uuid=$GOOGLE_UUID" >> $GITHUB_OUTPUT

      - name: Update Shopify Metafields
        run: |
          curl -X POST "https://${{ secrets.SHOPIFY_STORE }}.myshopify.com/admin/api/2024-01/graphql.json" \
            -H "X-Shopify-Access-Token: ${{ secrets.SHOPIFY_ADMIN_TOKEN }}" \
            -H "Content-Type: application/json" \
            -d '{
              "query": "mutation { metafieldsSet(metafields: [{ namespace: \"tracklay\", key: \"facebook_uuid\", value: \"${{ steps.fetch.outputs.fb_uuid }}\", type: \"single_line_text_field\", ownerId: \"gid://shopify/Shop/${{ secrets.SHOPIFY_SHOP_ID }}\" }, { namespace: \"tracklay\", key: \"google_uuid\", value: \"${{ steps.fetch.outputs.google_uuid }}\", type: \"single_line_text_field\", ownerId: \"gid://shopify/Shop/${{ secrets.SHOPIFY_SHOP_ID }}\" }]) { metafields { id } userErrors { field message } } }"
            }'
```

**Required GitHub Secrets:**

1. `ENDPOINTS_SECRET` - Your Cloudflare Workers secret
2. `SHOPIFY_STORE` - Your store handle (e.g., `yourstore`)
3. `SHOPIFY_ADMIN_TOKEN` - Shopify Admin API token
4. `SHOPIFY_SHOP_ID` - Your Shopify shop ID (numeric)

**Get Shopify Shop ID:**

```graphql
query {
  shop {
    id
  }
}
```

Result: `gid://shopify/Shop/12345678` → Use `12345678`

---

## 🐛 Troubleshooting

### Metafields not updating

**Problem:** n8n workflow succeeds but metafields don't change

**Solutions:**

1. Check Shopify Admin API token permissions:
   - Required: `write_metafields`, `read_metafields`
2. Verify `tracklay` namespace exists:
   - Create manually: Settings → Custom Data → Metafields
3. Check n8n workflow logs for GraphQL errors
4. Test GraphQL mutation in Shopify GraphiQL explorer

### 401 Unauthorized on /endpoints

**Problem:** `curl` returns 401 Unauthorized

**Solutions:**

1. Verify `ENDPOINTS_SECRET` matches worker secret:
   ```bash
   wrangler secret list
   ```
2. Check query string format:

   ```bash
   # ✅ Correct
   curl 'https://cdn.yourstore.com/endpoints?token=abc123'

   # ❌ Wrong (missing quotes)
   curl https://cdn.yourstore.com/endpoints?token=abc123
   ```

3. Ensure secret is set in Cloudflare:
   ```bash
   wrangler secret put ENDPOINTS_SECRET
   ```

### UUIDs not rotating

**Problem:** UUIDs stay the same after 7 days

**Solutions:**

1. Confirm `ENDPOINTS_UUID_ROTATION=false` (not `true`):
   ```bash
   # In Cloudflare Dashboard or .env
   ENDPOINTS_UUID_ROTATION=false
   ```
2. Check `UUID_SALT_ROTATION` interval (default: 604800000ms = 7 days):
   ```bash
   # Verify in worker logs or /health endpoint (if DEBUG_HEADERS=true)
   ```
3. Clear Cloudflare cache:
   ```bash
   # Cloudflare Dashboard → Caching → Purge Everything
   ```

### Ad-blockers still detecting

**Problem:** Tracking blocked despite UUID rotation

**Solutions:**

1. Ensure using Strategy 1 (Metafields + n8n)
2. Verify no legacy routes active:
   ```bash
   # These should return 404
   curl https://cdn.yourstore.com/cdn/fbevents.js
   curl https://cdn.yourstore.com/tr
   ```
3. Check `DEBUG_HEADERS=false` in production:
   ```bash
   # In Cloudflare Dashboard → Workers → Settings → Variables
   DEBUG_HEADERS=false
   ```
4. Test with multiple ad-blockers:
   - uBlock Origin
   - AdBlock Plus
   - Privacy Badger
5. Monitor detection rate via Google Analytics:
   - Compare `gtag.js` requests vs page views
   - <90% = good, <95% = excellent

### Theme not loading scripts

**Problem:** Tracking scripts 404 or don't load

**Solutions:**

1. Verify metafields are populated:
   ```liquid
   <!-- Add to theme for debugging -->
   <!-- Debug: {{ shop.metafields.tracklay.facebook_uuid }} -->
   ```
2. Check Cloudflare route configuration:
   - Workers → Routes → `yourstore.com/cdn/*`
3. Test `/endpoints` directly:
   ```bash
   curl 'https://cdn.yourstore.com/endpoints?token=SECRET'
   ```
4. Verify Shopify metafield namespace/key:
   - Settings → Custom Data → Metafields → `tracklay`

---

## 📚 Additional Resources

- [Tracklay Main README](../README.md)
- [Obfuscation Documentation](OBFUSCATION.md)
- [Migration Guide v3.0.0](MIGRATION-V3.md)
- [Cloudflare Workers Docs](https://developers.cloudflare.com/workers/)
- [Shopify Admin API](https://shopify.dev/api/admin)

---

**Last Updated:** 2026-01-25
**Version:** 3.0.0
**Contributors:** Claude Sonnet 4.5

---

If you have questions or need help with integration, please open an issue on GitHub.
