# Frequently Asked Questions (FAQ)

Common questions and answers about Tracklay.

## General Questions

### What is this project?

A first-party proxy that serves Google Tag Manager, Google Analytics, and other tracking scripts from your own domain instead of third-party domains. This bypasses ad-blockers and browser tracking protections.

### Why do I need this?

Modern browsers (Safari, Firefox) and ad-blockers block third-party tracking scripts, causing you to lose 20-40% of conversion data. This proxy serves scripts as first-party, making them unblockable.

### Is this legal?

Yes. You're serving the same tracking scripts, just from your own domain. However, you still need to comply with privacy laws (GDPR, CCPA) and obtain user consent for tracking.

### Does this work with Shopify?

Yes! This was built specifically for Shopify stores, but works with any e-commerce platform.

### How much does it cost?

The Cloudflare Workers free tier includes 100,000 requests/day, which is enough for most stores. Paid plans start at $5/month for unlimited requests.

## Technical Questions

### How does it work?

1. Your store loads scripts from your domain (e.g., `yourstore.com/cdn/gtag/js`)
2. Cloudflare Worker proxies the request to Google's servers
3. Worker adds proper CORS headers and returns the script
4. Browser treats it as first-party and doesn't block it

### What gets proxied?

- GTM scripts (`/gtm.js`, `/gtag/js`)
- Analytics endpoints (`/collect`, `/g/collect`)
- Custom endpoints you configure

### Does it slow down my site?

No. Cloudflare Workers run on the edge (near your users) with < 10ms processing time. Scripts are also cached.

### Can I use this without GTM Server-Side?

Yes! The proxy works standalone. GTM Server-Side is optional but recommended for better tracking.

### What tracking providers are supported?

Currently:

- Google Tag Manager (GTM)
- Google Analytics (GA4, Universal Analytics)
- Google Ads conversion tracking

Planned:

- Meta Pixel (Facebook)
- TikTok Pixel
- Custom tracking providers

## Setup Questions

### Do I need coding skills?

No. The setup script handles everything automatically. You just need to:

1. Run the setup script
2. Deploy to Cloudflare
3. Update your theme

### How long does setup take?

5-10 minutes for automatic setup, including:

- Installation: 2 minutes
- Configuration: 1 minute
- Deployment: 1 minute
- Theme update: 2-5 minutes

### What if I don't have a GTM Server?

That's fine! You can:

- Use the proxy standalone (works great)
- Set up GTM Server later (optional)
- Leave `GTM_SERVER_URL` empty in config

### Can I test before going live?

Yes! Deploy to a staging environment:

```bash
npm run deploy:staging
```

Test on a development store first.

## Configuration Questions

### What is auto-detection?

The worker automatically detects your domain from the request URL. No manual CORS configuration needed!

Just set:

```javascript
ALLOWED_ORIGINS: []; // Empty = auto-detect
```

### When should I use manual CORS configuration?

Only if:

- You have specific security requirements
- You need to allow only certain subdomains
- Auto-detection isn't working for your setup

### How do I add custom paths?

Edit `src/config/index.js`:

```javascript
CDN_PATHS: ['/cdn/', '/assets/', '/custom-path/'];
```

Then update your Cloudflare routes.

### What rate limits should I use?

Default is 100 requests/minute per IP. Adjust based on your traffic:

- Small store (< 1000 visitors/day): 100-200
- Medium store (1000-10000 visitors/day): 200-500
- Large store (> 10000 visitors/day): 500-1000

## Deployment Questions

### How do I deploy?

```bash
npm run deploy
```

That's it! Automatic deployment via GitHub Actions is also available.

### Can I use my own domain?

Yes! Configure routes in Cloudflare Dashboard:

- `yourstore.com/cdn/*` → Your Worker

### How do I update the worker?

Just redeploy:

```bash
npm run deploy
```

GitHub Actions can also deploy automatically on push to main.

### Can I rollback?

Yes. In Cloudflare Dashboard:

1. Go to Workers > Your Worker
2. Click **Deployments**
3. Click **Rollback** on previous version

## Troubleshooting Questions

### Scripts aren't loading. What do I check?

1. **Route configured?** Check Cloudflare Dashboard > Workers > Routes
2. **Worker deployed?** Run `npm run deploy`
3. **DNS correct?** Domain must be on Cloudflare

Test:

```bash
curl https://yourstore.com/cdn/gtag/js?id=G-XXXXX
```

### I'm getting CORS errors. Why?

Most common causes:

1. Auto-detection disabled but domain not in `ALLOWED_ORIGINS`
2. Request origin doesn't match allowed origins
3. Browser cached old CORS headers

Fix:

```javascript
// Enable auto-detection
ALLOWED_ORIGINS: [];
```

### I'm getting rate limited. What do I do?

Increase limit in `src/config/index.js`:

```javascript
RATE_LIMIT_REQUESTS: 200,  // Increase this
```

Then redeploy.

### GTM Server connection fails. Why?

Check:

1. `GTM_SERVER_URL` is correct
2. GTM Server is running
3. No firewall blocking Cloudflare IPs

Test directly:

```bash
curl https://gtm.yourstore.com/health
```

### How do I view logs?

```bash
npm run tail
```

Or in Cloudflare Dashboard > Workers > Logs.

## Performance Questions

### How fast is it?

- Edge processing: < 10ms
- Total time (edge to origin): < 50ms
- Cached scripts: < 5ms

Faster than loading directly from Google in most cases!

### Does it cache scripts?

Yes. Static scripts (gtm.js, gtag.js) are cached for 1 hour by default. Tracking endpoints are never cached.

### Can it handle traffic spikes?

Yes. Cloudflare Workers auto-scale. No server to crash or slow down.

### What about global users?

Cloudflare has 200+ edge locations worldwide. Your worker runs near every user.

## Security Questions

### Is it secure?

Yes:

- SHA-256 UUID generation with rotating salt
- Rate limiting per IP
- Request size limits
- Timeout protection
- Security headers (CSP, X-Frame-Options)

See [SECURITY.md](SECURITY.md) for details.

### Can someone abuse this?

Protection against abuse:

- Rate limiting (100 req/min per IP)
- Request size limits (1MB)
- Timeout protection (10s)
- Input validation

### How do I protect my UUID_SECRET?

1. Generate random secret (setup script does this)
2. Set in Cloudflare (not in code)
3. Rotate every 90 days

```bash
# Generate new secret
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32

# Set in Cloudflare
wrangler secret put UUID_SECRET
```

### Does this comply with GDPR?

The proxy itself is just infrastructure. You're responsible for:

- Obtaining user consent
- Privacy policy
- Cookie notices
- Data retention
- Opt-out mechanisms

## Cost Questions

### What does Cloudflare Workers cost?

**Free Tier:**

- 100,000 requests/day
- Enough for most small-medium stores

**Paid Plan ($5/month):**

- Unlimited requests
- Better support
- More features

### Are there other costs?

Optional:

- Custom domain: Free (if already on Cloudflare)
- GTM Server: ~$50-200/month (Google Cloud)
- SSL certificate: Free (Cloudflare provides)

### How many requests will I use?

Estimate:

- 1000 visitors/day × 3 tracking events = 3000 requests/day
- Well within free tier

Monitor in Cloudflare Dashboard.

## Comparison Questions

### How is this different from Segment?

Segment is a CDP (Customer Data Platform). This is a simple proxy. Use this if you:

- Just need to bypass ad-blockers
- Want a free solution
- Already have GTM/GA setup

### How is this different from GTM Server-Side?

GTM Server-Side is a tracking server. This proxy serves scripts and endpoints. They work together:

- Proxy: Serves scripts from your domain
- GTM Server: Processes tracking data server-side

Use both for best results!

### Can I use this with other proxies?

Yes, but there's usually no need. This proxy is designed to work standalone or with GTM Server.

## Advanced Questions

### Can I add custom tracking providers?

Yes! Edit the routing:

```javascript
// src/routing/mapping.js
export const URL_MAPPINGS = {
  '/tiktok/pixel': 'https://analytics.tiktok.com/pixel.js',
  // Add your mappings
};
```

### Can I modify the proxied response?

Yes. Edit `src/proxy/response-builder.js` to modify headers or content.

### Can I add custom middleware?

Yes. Add to `src/middleware/` and import in `worker.js`.

### How do I contribute?

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## Getting Help

### Where can I get help?

- **Documentation**: [README.md](README.md)
- **Quick Start**: [QUICK_START.md](QUICK_START.md)
- **Issues**: [GitHub Issues](https://github.com/matheusmaiberg/tracklay/issues)
- **Discussions**: [GitHub Discussions](https://github.com/matheusmaiberg/tracklay/discussions)

### How do I report a bug?

Use the bug report template:

1. Go to [Issues](https://github.com/matheusmaiberg/tracklay/issues)
2. Click **New Issue**
3. Choose **Bug Report**
4. Fill in details

### How do I request a feature?

Use the feature request template:

1. Go to [Issues](https://github.com/matheusmaiberg/tracklay/issues)
2. Click **New Issue**
3. Choose **Feature Request**
4. Describe your idea

### Can I hire someone to set this up?

Yes! Many Shopify experts can help. This is a standard Cloudflare Worker deployment.

## Common Scenarios

### Scenario: Safari blocks my tracking

**Problem**: Safari ITP blocks third-party cookies

**Solution**: This proxy serves tracking as first-party, bypassing ITP

### Scenario: Ad-blockers block Google Analytics

**Problem**: Ad-blockers block `google-analytics.com`

**Solution**: Proxy serves from your domain (e.g., `yourstore.com/cdn/`)

### Scenario: Conversion tracking is inaccurate

**Problem**: Missing 20-40% of conversions

**Solution**: First-party tracking captures more accurate data

### Scenario: Multiple subdomains

**Problem**: Need to allow `shop.example.com` and `www.example.com`

**Solution**:

```javascript
ALLOWED_ORIGINS: ['https://shop.example.com', 'https://www.example.com'];
```

Or use auto-detection (recommended).

---

**Still have questions?**

Open a [discussion](https://github.com/matheusmaiberg/tracklay/discussions) or [issue](https://github.com/matheusmaiberg/tracklay/issues)!
