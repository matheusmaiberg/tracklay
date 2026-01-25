# Quick Start Guide

Get your Tracklay running in 5 minutes!

## Prerequisites Checklist

- [ ] Cloudflare account (free tier works)
- [ ] Node.js 18+ installed
- [ ] npm or yarn installed
- [ ] Git installed
- [ ] Shopify store (or any e-commerce platform)

## Installation Steps

### 1. Clone Repository

```bash
git clone https://github.com/your-github-username/tracklay.git
cd tracklay
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Login to Cloudflare

```bash
npx wrangler login
```

This will open your browser for authentication.

### 4. Run Automatic Setup

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

The setup script will:

- Generate UUID_SECRET automatically
- Get your Cloudflare Account ID
- Configure wrangler.toml
- Prompt for GTM Server URL (optional)
- Prompt for store domains (optional for auto-detection)
- Set the secret in Cloudflare Workers

### 5. Deploy

```bash
npm run deploy
```

Your worker will be deployed to: `https://tracklay.YOUR_SUBDOMAIN.workers.dev`

## Configuration

### Option A: Auto-Detection (Recommended)

No configuration needed! The worker automatically detects your domain from requests.

Just deploy and you're ready to go!

### Option B: Manual Configuration

If you need manual CORS configuration, edit `src/config/index.js`:

```javascript
export const CONFIG = {
  // Your GTM Server-Side URL
  GTM_SERVER_URL: 'https://gtm.yourstore.com',

  // Add your domains
  ALLOWED_ORIGINS: ['https://yourstore.com', 'https://www.yourstore.com'],
};
```

Then redeploy:

```bash
npm run deploy
```

## Add Custom Domain (Recommended)

### In Cloudflare Dashboard:

1. Go to **Workers & Pages**
2. Click your worker: **tracklay**
3. Go to **Settings** > **Domains & Routes**
4. Click **Add Route**

Add these routes (replace `yourstore.com` with your domain):

| Route Pattern            | Zone          |
| ------------------------ | ------------- |
| `yourstore.com/cdn/*`    | yourstore.com |
| `yourstore.com/assets/*` | yourstore.com |
| `yourstore.com/static/*` | yourstore.com |

## Update Your Store

### Shopify Theme

Edit your theme files (usually `theme.liquid` or similar):

**Before:**

```html
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag('js', new Date());
  gtag('config', 'G-XXXXX');
</script>
```

**After:**

```html
<script async src="https://yourstore.com/cdn/gtag/js?id=G-XXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag() {
    dataLayer.push(arguments);
  }
  gtag('js', new Date());
  gtag('config', 'G-XXXXX', {
    server_container_url: 'https://yourstore.com',
  });
</script>
```

### GTM Container

If using GTM, update the container code:

**Before:**

```html
<!-- Google Tag Manager -->
<script>
  (function (w, d, s, l, i) {
    w[l] = w[l] || [];
    w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var f = d.getElementsByTagName(s)[0],
      j = d.createElement(s),
      dl = l != 'dataLayer' ? '&l=' + l : '';
    j.async = true;
    j.src = 'https://www.googletagmanager.com/gtm.js?id=' + i + dl;
    f.parentNode.insertBefore(j, f);
  })(window, document, 'script', 'dataLayer', 'GTM-XXXXX');
</script>
```

**After:**

```html
<!-- Google Tag Manager -->
<script>
  (function (w, d, s, l, i) {
    w[l] = w[l] || [];
    w[l].push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });
    var f = d.getElementsByTagName(s)[0],
      j = d.createElement(s),
      dl = l != 'dataLayer' ? '&l=' + l : '';
    j.async = true;
    j.src = 'https://yourstore.com/cdn/gtm.js?id=' + i + dl;
    f.parentNode.insertBefore(j, f);
  })(window, document, 'script', 'dataLayer', 'GTM-XXXXX');
</script>
```

## Testing

### 1. Test Health Endpoint

```bash
curl https://yourstore.com/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2024-01-24T18:00:00.000Z"
}
```

### 2. Test Script Loading

Open your browser's developer console and go to your store:

```javascript
// Check if gtag script loaded
console.log(typeof gtag); // Should be "function"

// Check where it loaded from
performance
  .getEntriesByType('resource')
  .filter((r) => r.name.includes('gtag'))
  .forEach((r) => console.log(r.name));
// Should show: https://yourstore.com/cdn/gtag/js?id=...
```

### 3. Test Tracking

Make a test purchase and verify events in:

- Google Analytics Real-Time reports
- GTM Debug mode
- Cloudflare Worker logs

## Monitoring

### View Logs

```bash
npm run tail
```

Or in Cloudflare Dashboard:

1. Go to Workers & Pages
2. Click your worker
3. Click **Logs** tab

### Check Analytics

In Cloudflare Dashboard:

1. Go to Workers & Pages
2. Click your worker
3. Click **Analytics** tab

Monitor:

- Request count
- Error rate
- Response time
- CPU time

## Troubleshooting

### Scripts Not Loading

**Check:**

1. Route configured correctly in Cloudflare
2. Worker deployed successfully
3. Domain DNS pointing to Cloudflare

**Test:**

```bash
curl -I https://yourstore.com/cdn/gtag/js?id=G-XXXXX
```

Should return `200 OK`.

### CORS Errors

**Check:**

1. Auto-detection enabled: `ALLOWED_ORIGINS: []`
2. Or domain added to `ALLOWED_ORIGINS`

**Test:**

```bash
curl -H "Origin: https://yourstore.com" \
  -H "Access-Control-Request-Method: GET" \
  -X OPTIONS \
  https://yourstore.com/cdn/gtag/js?id=G-XXXXX
```

Should include:

```
Access-Control-Allow-Origin: https://yourstore.com
```

### Rate Limiting

**Problem:** Getting 429 errors

**Solution:**

1. Increase `RATE_LIMIT_REQUESTS` in `src/config/index.js`
2. Redeploy: `npm run deploy`

### GTM Server Connection Failed

**Check:**

1. GTM_SERVER_URL is correct
2. GTM Server is running
3. Firewall allows Cloudflare IPs

**Test:**

```bash
curl https://gtm.yourstore.com/health
```

## Next Steps

- [ ] Set up monitoring alerts
- [ ] Configure backup tracking
- [ ] Test conversion tracking
- [ ] Document custom paths used
- [ ] Train team on new setup

## Common Patterns

### Custom CDN Path

Want to use a different path like `/api/` or `/track/`?

Edit `src/config/index.js`:

```javascript
CDN_PATHS: ['/api/', '/track/', '/static/'],
```

Update Cloudflare routes and redeploy.

### Multiple Environments

Want dev/staging/prod environments?

```bash
# Deploy to staging
npm run deploy:staging

# Deploy to production
npm run deploy:prod
```

Each environment can have different:

- GTM Server URLs
- Rate limits
- Logging levels

### Automatic Deployment

Already set up! Every push to `main` branch automatically deploys via GitHub Actions.

Just:

1. Set `CLOUDFLARE_API_TOKEN` in GitHub Secrets
2. Set `CLOUDFLARE_ACCOUNT_ID` in GitHub Secrets
3. Push to main

## Support

Need help?

- **Documentation**: [README.md](README.md)
- **Issues**: [GitHub Issues](https://github.com/your-github-username/tracklay/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-github-username/tracklay/discussions)

## Checklist

After setup, verify:

- [ ] Worker deployed successfully
- [ ] Custom domain routes configured
- [ ] Scripts load from your domain
- [ ] CORS headers working
- [ ] Tracking events firing
- [ ] GTM Server receiving data
- [ ] No console errors
- [ ] Rate limiting appropriate
- [ ] Monitoring enabled
- [ ] Team trained

---

**Congratulations! Your proxy is now running!** 🎉

For advanced configuration, see [README.md](README.md).
