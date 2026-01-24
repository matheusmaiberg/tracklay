# Tracklay

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

> **First-party tracking proxy for Shopify stores. Bypass ad-blockers and browser protections.**

Bypass ad-blockers, browser tracking protections (ITP, ETP), and improve conversion tracking accuracy by serving analytics scripts and endpoints from your own domain.

[English](README.md) | [Português](README.pt-BR.md)

---

## Features

- **First-Party Context**: Serve Google Analytics, GTM, and Meta Pixel from your domain
- **Ad-Blocker Bypass**: Custom paths (`/cdn/`, `/assets/`) avoid detection
- **ITP/ETP Resistant**: First-party cookies with extended lifetime (7+ days)
- **Auto-CORS Detection**: Automatically detects request origin (zero configuration)
- **Zero Maintenance**: Deployed on Cloudflare Workers (serverless, auto-scaling)
- **Production Ready**: Rate limiting, error handling, security headers
- **Privacy Focused**: Secure UUID generation with SHA-256 and rotating salt
- **Fast & Cached**: Static scripts cached with configurable TTL
- **Factory Architecture**: Clean, modular, testable code structure

## Why Use This?

### The Problem

Modern browsers and ad-blockers block third-party tracking scripts:

- **Safari ITP** (Intelligent Tracking Prevention): Limits cookies to 7 days, blocks cross-site tracking
- **Firefox ETP** (Enhanced Tracking Protection): Blocks known trackers
- **Ad-blockers**: Block `google-analytics.com`, `googletagmanager.com`, `facebook.net`
- **Result**: 20-40% of conversions not tracked, inaccurate attribution

### The Solution

This proxy serves analytics from **your own domain** as **first-party requests**:

```
Before: https://www.googletagmanager.com/gtag/js?id=G-XXXXX
After:  https://yourstore.com/cdn/gtag/js?id=G-XXXXX
```

Benefits:

- Cookies set as first-party (longer lifetime)
- Requests not blocked by ad-blockers or browsers
- Better conversion tracking accuracy
- Works with GTM Server-Side for complete setup

## Quick Start

### Prerequisites

- Shopify store
- Cloudflare account (free tier works)
- Google Tag Manager Server-Side container (optional but recommended)

### 1-Click Deploy

[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/matheusmaiberg/tracklay)

### Manual Setup (5 minutes)

#### 1. Clone and Install

```bash
git clone https://github.com/matheusmaiberg/tracklay.git
cd tracklay
npm install
```

#### 2. Run Automatic Setup

```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

This will:

- Generate a random UUID secret
- Configure `wrangler.toml`
- Prompt for GTM Server URL
- Set up environment variables

#### 3. Configure (if not using setup script)

Edit `src/config/index.js`:

```javascript
export const CONFIG = {
  // Your GTM Server-Side URL
  GTM_SERVER_URL: 'https://gtm.yourstore.com',

  // Auto-detect enabled (recommended)
  // Leave empty for automatic origin detection
  ALLOWED_ORIGINS: [],

  // Or manually configure origins:
  // ALLOWED_ORIGINS: [
  //   'https://yourstore.com',
  //   'https://www.yourstore.com'
  // ],
};
```

#### 4. Deploy

```bash
npm run deploy
```

Your worker will be deployed to: `https://your-worker.workers.dev`

#### 5. Add Custom Domain (Recommended)

In Cloudflare Dashboard:

1. Go to Workers > Your Worker > Settings > Domains & Routes
2. Add Route: `yourstore.com/cdn/*` → Your Worker
3. Repeat for: `yourstore.com/assets/*`, `yourstore.com/static/*`

#### 6. Update Shopify Theme

Replace GTM/Analytics script URLs in your theme:

```html
<!-- Before -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXX"></script>

<!-- After -->
<script async src="https://yourstore.com/cdn/gtag/js?id=G-XXXXX"></script>
```

For GTM Server-Side, update your GTM container to use the proxy:

```javascript
// Server URL
gtag('config', 'G-XXXXX', {
  server_container_url: 'https://yourstore.com',
});
```

## Architecture

```
┌─────────────────┐
│  Browser        │
│  (yourstore.com)│
└────────┬────────┘
         │ 1. Request: /cdn/gtag/js
         ▼
┌─────────────────────────┐
│  Cloudflare Worker      │
│  (First-Party Proxy)    │
│  ┌──────────────────┐   │
│  │ Rate Limiter     │   │
│  │ CORS Handler     │   │
│  │ Cache Strategy   │   │
│  │ UUID Generator   │   │
│  └──────────────────┘   │
└────────┬────────────────┘
         │ 2. Proxy request
         ▼
┌─────────────────────────┐
│  GTM Server-Side        │
│  or Google APIs         │
│  ┌──────────────────┐   │
│  │ Analytics        │   │
│  │ Tag Manager      │   │
│  │ Conversion API   │   │
│  └──────────────────┘   │
└─────────────────────────┘
         │ 3. Response
         ▼
┌─────────────────────────┐
│  Worker                 │
│  (Add CORS, Cache)      │
└────────┬────────────────┘
         │ 4. First-party response
         ▼
┌─────────────────┐
│  Browser        │
│  (Set cookies)  │
└─────────────────┘
```

### Request Flow

1. **Browser** requests `/cdn/gtag/js` from your domain
2. **Worker** receives request, validates, checks rate limit
3. **Worker** proxies to GTM Server or Google APIs
4. **Worker** adds CORS headers, security headers, caches response
5. **Browser** receives response as first-party, sets cookies

### Directory Structure

```
tracklay/
├── src/
│   ├── config/          # Configuration (GTM URL, origins, etc)
│   ├── core/            # Core functionality (logger, UUID, cache, rate-limiter)
│   ├── headers/         # Header builders (CORS, security, proxy)
│   ├── handlers/        # Request handlers (scripts, endpoints, health, options)
│   ├── proxy/           # Proxy engine (cache strategy, response builder)
│   ├── routing/         # Routing logic (URL mapping, router)
│   ├── middleware/      # Middleware (validator, error handler, metrics)
│   └── utils/           # Utilities (response helpers, constants)
├── worker.js            # Entry point
├── wrangler.toml        # Cloudflare configuration
├── package.json         # Dependencies
└── scripts/
    └── setup.sh         # Automatic setup script
```

## Configuration

### Environment Variables

Set in Cloudflare Dashboard (Workers > Settings > Variables):

| Variable      | Description                | Required | Example                        |
| ------------- | -------------------------- | -------- | ------------------------------ |
| `UUID_SECRET` | Secret for UUID generation | Yes      | Auto-generated by setup script |

### Config Options (`src/config/index.js`)

| Option                | Description                                | Default                             | Example                        |
| --------------------- | ------------------------------------------ | ----------------------------------- | ------------------------------ |
| `GTM_SERVER_URL`      | GTM Server-Side URL                        | `''`                                | `https://gtm.yourstore.com`    |
| `ALLOWED_ORIGINS`     | Manual CORS origins (auto-detect if empty) | `[]`                                | `['https://yourstore.com']`    |
| `RATE_LIMIT_REQUESTS` | Max requests per IP per window             | `100`                               | `100`                          |
| `RATE_LIMIT_WINDOW`   | Rate limit window (ms)                     | `60000`                             | `60000` (1 min)                |
| `FETCH_TIMEOUT`       | GTM request timeout (ms)                   | `10000`                             | `10000` (10 sec)               |
| `UUID_SALT_ROTATION`  | UUID salt rotation (ms)                    | `604800000`                         | `604800000` (7 days)           |
| `CACHE_TTL`           | Script cache TTL (seconds)                 | `3600`                              | `3600` (1 hour)                |
| `MAX_REQUEST_SIZE`    | Max request body size (bytes)              | `1048576`                           | `1048576` (1MB)                |
| `CDN_PATHS`           | Proxy paths (ad-blocker evasion)           | `['/cdn/', '/assets/', '/static/']` | Custom paths                   |
| `LOG_LEVEL`           | Logging level                              | `'info'`                            | `'debug'`, `'warn'`, `'error'` |

## Development

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Access at http://localhost:8787
```

### Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage
```

### Scripts

```bash
# Setup (generate UUID, configure)
npm run setup

# Development server
npm run dev

# Deploy to Cloudflare
npm run deploy

# Run tests
npm test
```

## Troubleshooting

### CORS Errors

**Problem**: `Access to fetch at 'https://yourstore.com/cdn/gtag/js' from origin 'https://yourstore.com' has been blocked by CORS policy`

**Solution**:

- Auto-detection should handle this automatically
- If using manual configuration, ensure your domain is in `ALLOWED_ORIGINS`
- Check browser console for exact origin being blocked
- Add that origin to `ALLOWED_ORIGINS` array

### Rate Limiting

**Problem**: `429 Too Many Requests`

**Solution**:

- Default: 100 requests per minute per IP
- Increase `RATE_LIMIT_REQUESTS` in config if needed
- Check if a bot is hitting your endpoint

### GTM Server Connection

**Problem**: `Failed to fetch from GTM Server`

**Solution**:

- Verify `GTM_SERVER_URL` is correct
- Ensure GTM Server-Side container is running
- Check firewall/security settings on GTM server
- Test GTM server directly: `curl https://gtm.yourstore.com/health`

### Scripts Not Loading

**Problem**: Scripts return 404 or timeout

**Solution**:

- Verify Cloudflare route is configured: `yourstore.com/cdn/*`
- Check worker logs in Cloudflare Dashboard
- Test worker directly: `curl https://your-worker.workers.dev/cdn/gtag/js?id=G-XXXXX`
- Ensure `FETCH_TIMEOUT` is sufficient (default 10s)

### Deployment Issues

**Problem**: `wrangler deploy` fails

**Solution**:

```bash
# Login to Cloudflare
wrangler login

# Verify wrangler.toml is configured
cat wrangler.toml

# Check account ID
wrangler whoami

# Deploy with verbose logging
wrangler deploy --verbose
```

## Security

### UUID Generation

- **SHA-256** hashing with secret salt
- **Rotating salt** every 7 days (configurable)
- **Environment variable** for secret (not in code)

### Rate Limiting

- IP-based rate limiting (100 req/min default)
- Configurable limits per environment
- Protection against DDoS and abuse

### Headers

- **CORS**: Restricted to allowed origins
- **CSP**: Content Security Policy
- **X-Frame-Options**: Clickjacking protection
- **X-Content-Type-Options**: MIME sniffing protection

### Request Validation

- Body size limits (1MB default)
- Timeout protection
- Input sanitization
- Error handling without exposing internals

## Performance

- **Edge Computing**: Deployed on Cloudflare's global network (200+ locations)
- **Caching**: Static scripts cached with configurable TTL
- **Fast**: < 10ms processing time, < 50ms total (edge to origin)
- **Scalable**: Auto-scaling, no server management

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

### Quick Contribution Guide

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built for Shopify stores with GTM Server-Side
- Inspired by the need for better conversion tracking
- Powered by Cloudflare Workers

## Support

- **Issues**: [GitHub Issues](https://github.com/matheusmaiberg/tracklay/issues)
- **Discussions**: [GitHub Discussions](https://github.com/matheusmaiberg/tracklay/discussions)
- **Documentation**: This README and inline code comments

## Roadmap

- [ ] Support for more tracking providers (Meta CAPI, TikTok, etc)
- [ ] Built-in analytics dashboard
- [ ] A/B testing for tracking methods
- [ ] Advanced bot detection
- [ ] Shopify App for easier installation

---

**Made with ❤️ for the Shopify community**

If this project helps you, please ⭐ star it on GitHub!
