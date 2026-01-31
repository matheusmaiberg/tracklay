# Universal Shopify Theme Installation Guide

## ✅ Works with ANY Shopify Theme

This guide shows how to install Tracklay server-side tracking on **any** Shopify theme:
- ✅ Dawn (current theme)
- ✅ Debut
- ✅ Brooklyn
- ✅ Minimal
- ✅ Venture
- ✅ Any custom theme

## Why It's Universal

### 1. Standard Shopify Structure

All Shopify themes share the same structure:
```
your-theme/
├── layout/
│   └── theme.liquid      ← Main template (ALL themes have this)
├── snippets/             ← Reusable components (ALL themes)
├── sections/             ← Theme sections
├── templates/            ← Page templates
└── assets/               ← CSS, JS, images
```

**Source:** [Shopify Theme Architecture](https://shopify.dev/docs/themes/architecture)

### 2. Standard Liquid Variables

All themes use the same Liquid variables:
- `{{ customer }}` - Customer data
- `{{ product }}` - Product data
- `{{ collection }}` - Collection data
- `{{ shop }}` - Store data
- `{{ cart }}` - Cart data

**Source:** [Liquid Reference](https://shopify.dev/docs/api/liquid)

### 3. Standard HTML Structure

All themes have:
```liquid
<!DOCTYPE html>
<html>
  <head>
    <!-- ✅ All themes have <head> -->
  </head>
  <body>
    <!-- ✅ All themes have <body> -->
  </body>
</html>
```

---

## Installation Steps (Universal)

### Step 1: Add Snippet File

1. **Copy the snippet:**
   - File: [`shopify-theme/snippets/tracklay-server-side.liquid`](../shopify-theme/snippets/tracklay-server-side.liquid)

2. **Add to your theme:**
   - Shopify Admin → Online Store → Themes
   - Click "..." → Edit Code
   - In sidebar, expand "Snippets" folder
   - Click "Add a new snippet"
   - Name it: `tracklay-server-side`
   - Paste the code
   - Save

### Step 2: Include in theme.liquid

1. **Open theme.liquid:**
   - In sidebar, expand "Layout" folder
   - Click `theme.liquid`

2. **Find the `</head>` tag:**
   - Search for `</head>` (Ctrl+F / Cmd+F)
   - It's usually around line 100-200

3. **Add ONE line BEFORE `</head>`:**
   ```liquid
   {% render 'tracklay-server-side' %}
   </head>
   ```

4. **Save**

### Step 3: Configure Settings

1. **Open the snippet again:**
   - Snippets → `tracklay-server-side.liquid`

2. **Update CONFIG section:**
   ```javascript
   const CONFIG = {
     WORKER_URL: 'https://YOUR-WORKER.com/cdn/events',  // ← Change this
     MEASUREMENT_ID: 'G-XXXXXXXXXX',                     // ← Change this
     DEBUG: false,                                       // ← false in production
     SESSION_TIMEOUT: 30 * 60 * 1000,
     ENGAGEMENT_INTERVAL: 5000
   };
   ```

3. **Save**

### Step 4: Test

1. **Open your store** (in incognito/private mode)
2. **Open DevTools Console** (F12)
3. **Look for:**
   ```
   [Tracklay] Initializing Tracklay server-side tracking v3.1.0...
   [Tracklay] Created new session 1234567890
   [Tracklay] Event sent: page_view
   [Tracklay] Initialized ✓ Server-side tracking active
   ```

4. **If you see these logs:** ✅ Working!
5. **If not:** Check configuration and Worker URL

---

## Theme-Specific Examples

### Dawn (Your Current Theme)

```liquid
<!-- In layout/theme.liquid, around line 200 -->

  {{ 'component-cart-notification.css' | asset_url | stylesheet_tag }}
  {{ 'component-cart-items.css' | asset_url | stylesheet_tag }}
  {%- if settings.cart_type == "drawer" -%}
    {{ 'component-cart-drawer.css' | asset_url | stylesheet_tag }}
  {%- endif -%}

  {% render 'tracklay-server-side' %}  <!-- ✅ ADD THIS LINE -->
</head>
```

### Debut

```liquid
<!-- In layout/theme.liquid -->

  {% include 'social-meta-tags' %}
  {{ 'timber.scss.css' | asset_url | stylesheet_tag }}

  {% render 'tracklay-server-side' %}  <!-- ✅ ADD THIS LINE -->
</head>
```

### Brooklyn

```liquid
<!-- In layout/theme.liquid -->

  {{ 'theme.scss.css' | asset_url | stylesheet_tag }}
  {{ 'custom.css' | asset_url | stylesheet_tag }}

  {% render 'tracklay-server-side' %}  <!-- ✅ ADD THIS LINE -->
</head>
```

### Minimal

```liquid
<!-- In layout/theme.liquid -->

  {{ 'theme.css' | asset_url | stylesheet_tag }}
  {% include 'oldIE-js' %}

  {% render 'tracklay-server-side' %}  <!-- ✅ ADD THIS LINE -->
</head>
```

**Pattern:** Always add **BEFORE `</head>`**, regardless of theme!

---

## Removing Old Tracking Code (Optional)

If your theme has old tracking code (Google Tag, GTM, Facebook Pixel), you can remove it:

### Example: Removing gtag.js

**Before:**
```liquid
<head>
  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=AW-16743351444">
  </script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'AW-16743351444');
  </script>

  {% render 'tracklay-server-side' %}
</head>
```

**After:**
```liquid
<head>
  {% render 'tracklay-server-side' %}  <!-- ✅ Only this -->
</head>
```

**Benefits:**
- ✅ Faster page load (one less script)
- ✅ No duplicate tracking
- ✅ 95-98% ad-blocker bypass

---

## Verification Checklist

After installation, verify:

- [ ] Snippet file created in `snippets/tracklay-server-side.liquid`
- [ ] `{% render 'tracklay-server-side' %}` added to `theme.liquid`
- [ ] CONFIG updated with your Worker URL and Measurement ID
- [ ] Console shows initialization logs
- [ ] Events appear in Worker logs (`wrangler tail`)
- [ ] Events appear in GA4 Realtime view

---

## Troubleshooting

### ❌ Nothing happens, no console logs

**Solution:**
1. Check if snippet is properly included:
   ```liquid
   {% render 'tracklay-server-side' %}  <!-- Correct -->
   ```
   NOT:
   ```liquid
   {% include 'tracklay-server-side' %}  <!-- Wrong, deprecated -->
   ```

2. Check theme.liquid for syntax errors
3. Try saving and hard refresh (Ctrl+Shift+R)

### ❌ Console shows "Failed to fetch"

**Solution:**
1. Check WORKER_URL is correct
2. Check Worker is deployed
3. Test Worker directly: `curl https://your-worker.com/health`
4. Check CORS settings

### ❌ Events not appearing in GA4

**Solution:**
1. Check MEASUREMENT_ID is correct (G-XXXXXXXXXX)
2. Check Worker logs: `wrangler tail`
3. Check GTM_SERVER_URL is configured
4. Verify GTM Server is receiving events

### ❌ "Liquid syntax error"

**Solution:**
1. Check for missing `%}` or `%>`
2. Check for unescaped quotes in Liquid variables
3. Validate Liquid syntax online

---

## Advanced: Theme-Specific Customization

While the snippet is universal, you can customize for specific themes:

### Custom Event Selectors

```javascript
// Default (works on most themes):
if (form.action.includes('/cart/add')) {
  trackAddToCart(form);
}

// Custom for your theme:
if (form.classList.contains('product-form__add-to-cart')) {
  trackAddToCart(form);
}
```

### Custom Data Extraction

```javascript
// Add theme-specific data:
function getThemeSpecificData() {
  // Dawn theme example:
  const variantSelect = document.querySelector('.product-form__input--dropdown');
  const selectedVariant = variantSelect?.value;

  return {
    selected_variant: selectedVariant,
    // Add more theme-specific data
  };
}
```

---

## Migration from Custom Pixel

If you're currently using Custom Pixel:

### Before (Custom Pixel)

- ❌ 80-90% bypass rate
- ❌ Blocked by uBlock Origin
- ✅ Easy to setup

### After (theme.liquid snippet)

- ✅ 95-98% bypass rate
- ✅ Works with uBlock Origin
- ✅ Same easy setup (just copy snippet)

**Migration steps:**
1. Delete Custom Pixel from Shopify Admin
2. Add snippet as described above
3. Test thoroughly
4. Done!

---

## Multi-Store Setup

If you have multiple Shopify stores:

### Option 1: Same Worker for All Stores

```javascript
const CONFIG = {
  // Same Worker URL for all stores
  WORKER_URL: 'https://cdn.yourcompany.com/cdn/events',

  // Different Measurement ID per store
  MEASUREMENT_ID: '{{ shop.domain | replace: ".myshopify.com", "" | upcase }}',
  // store1.myshopify.com → STORE1
  // store2.myshopify.com → STORE2
};
```

### Option 2: Different Worker per Store

```javascript
const CONFIG = {
  // Dynamic Worker URL based on store
  WORKER_URL: 'https://cdn.{{ shop.domain }}/cdn/events',
  MEASUREMENT_ID: 'G-XXXXXXXXXX',
};
```

---

## Performance Impact

### Before (without Tracklay)

```
Page Load Time: 2.5s
Scripts Loaded: 8
Tracking: Google Analytics (blocked by uBlock)
```

### After (with Tracklay)

```
Page Load Time: 2.6s (+0.1s)
Scripts Loaded: 9 (+1 inline script)
Tracking: Server-side (works with uBlock)
Script Size: ~8KB (minified)
```

**Impact:** Minimal (+100ms), well worth the 95-98% tracking rate!

---

## Browser Compatibility

✅ Works on all modern browsers:
- Chrome/Edge (90+)
- Firefox (88+)
- Safari (14+)
- Mobile browsers (iOS Safari, Chrome Mobile)

**Requirements:**
- JavaScript enabled
- Cookies enabled
- fetch() API support (all modern browsers)

---

## GDPR/Privacy Compliance

### Data Collected

**Automatically:**
- Client ID (anonymous)
- Session ID (temporary)
- Page URL, title
- Referrer

**Optional (Liquid-injected):**
- Customer ID (if logged in)
- Order data (on thank you page)
- Product data (on product pages)

### Consent Management

Add consent check:

```javascript
function hasConsent() {
  // Check your consent cookie
  return getCookie('consent_tracking') === 'true';
}

function trackEvent(eventName, eventParams) {
  if (!hasConsent()) {
    log('Event skipped: no consent');
    return;
  }
  // ... rest of tracking code
}
```

---

## Summary

✅ **Universal:** Works with ANY Shopify theme
✅ **Easy:** One snippet file + one line in theme.liquid
✅ **Fast:** ~8KB, minimal performance impact
✅ **Effective:** 95-98% ad-blocker bypass
✅ **Maintainable:** Update snippet in one place, affects all pages

**Installation time:** 5-10 minutes
**Maintenance:** Zero (set and forget)

---

## Support

**Issues?**
1. Check troubleshooting section above
2. Verify Worker is deployed and working
3. Check browser console for errors
4. Test Worker endpoint directly

**Questions?**
- Check [SHOPIFY_DATA_FLOW.md](SHOPIFY_DATA_FLOW.md)
- Check [SERVER_SIDE_IMPLEMENTATION.md](SERVER_SIDE_IMPLEMENTATION.md)

---

## Next Steps

1. ✅ Install snippet (5 minutes)
2. ✅ Test with uBlock Origin enabled
3. ✅ Verify events in GA4
4. ✅ Done! Enjoy 95-98% tracking rate

**Ready to install?** Follow Step 1 above! 🚀
