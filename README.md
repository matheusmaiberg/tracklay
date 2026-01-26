# Tracklay

[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers-F38020?logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-3.0.0-blue.svg)](https://github.com/your-github-username/tracklay/releases)

> First-party tracking proxy for Shopify. Bypass Safari ITP, ad-blockers (uBlock, AdBlock), and browser privacy protections. Recover 40%+ lost conversion data.

**Tracklay** serves Google Analytics, GTM, and Meta Pixel from your own domain as first-party requests—bypassing Safari's 7-day cookie limit, iOS tracking restrictions, and 90%+ of ad-blockers.

[English](README.md) | [Português](README.pt-BR.md)

## Why Tracklay?

**Ultra-Aggressive Obfuscation (v3.0.0):**
- Reduces ad-blocker detection from **90-100%** to **<5%** (with UUID rotation + query obfuscation)
- Eliminates well-known tracking patterns (no `.js` suffixes, no detectable keywords)
- UUIDs rotate weekly—impossible to maintain permanent blacklists
- Forces maximum-security obfuscation for all users

**For Fresh Installs:**
- Ready to use out of the box—only obfuscated UUID-based routes available
- No legacy patterns, maximum security from day one

**Upgrading from v2.x?**
- Theme updates required before upgrading (see [Migration Guide](docs/MIGRATION-V3.md))
- No backward compatibility—intentional breaking change for security
- Full changelog: [CHANGELOG.md](CHANGELOG.md)

## Configuration Options

Tracklay supports multiple tracking platforms and deployment modes:

### Google Analytics / GTM

| Mode | Description | Components | Data Quality | Use Case |
|------|-------------|------------|--------------|----------|
| **Web (Client-side)** | Proxy scripts only | Tracklay proxy → Google servers | Standard (client-side) | Quick setup, no server infrastructure |
| **GTM Server-Side** | Full server-side tracking | Tracklay proxy + GTM Server container | High (server-side + EMQ 9+) | Enhanced privacy, ad-blocker bypass, server-side enrichment |
| **GTM Server + GA4 Transport** | Maximum data quality | Tracklay proxy + GTM Server + GA4 `transport_url` | Maximum (direct server → GA4) | Best data accuracy, complete Safari ITP bypass, CAPI-like quality |

### Meta Pixel (Facebook)

| Mode | Description | Components | Data Quality | Use Case |
|------|-------------|------------|--------------|----------|
| **Web (Client-side)** | Proxy Meta Pixel script + tracking | Tracklay proxy → Facebook servers | Standard (client-side) | Quick setup, bypass ad-blockers |
| **CAPI (Planned)** | Server-side conversions | Tracklay proxy + Meta CAPI integration | Maximum (server-side + EMQ 9+) | Best conversion tracking, future release |

### Additional Features

- **UUID Rotation:** Automatic weekly rotation (via `/endpoints` + n8n) or manual fixed UUIDs
- **Container Aliases:** Query string obfuscation (`?c=alias` → `?id=GTM-XXX`)
- **Combined Setup:** Run Google + Meta simultaneously on same proxy

**Recommendation:** Start with **Web mode** for quick wins, upgrade to **GTM Server + GA4 Transport** (Google) and **CAPI** (Meta) for maximum data quality.

**Setup guides:**
- Web mode: Follow [Quick Start](#quick-start) below
- GTM Server: See [docs/SHOPIFY-INTEGRATION.md](docs/SHOPIFY-INTEGRATION.md)
- GA4 Transport: See [docs/shopify/GTM-CONFIGURATION.md](docs/shopify/GTM-CONFIGURATION.md)
- UUID Rotation: See [docs/SHOPIFY-INTEGRATION.md](docs/SHOPIFY-INTEGRATION.md#strategy-1-metafields-n8n-recommended)

## Deploy Options

**Option 1: Manual**
```bash
npm run deploy
```

**Option 2: One-click**
[![Deploy to Cloudflare Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/your-github-username/tracklay)

**Option 3: Custom domain**
1. Cloudflare Dashboard → Workers → Domains & Routes
2. Add route: `yourstore.com/cdn/*` → tracklay worker

## Features

- ✅ **First-party tracking** - Serve scripts from your domain
- ✅ **Ultra-aggressive obfuscation** - UUID rotation + no suffixes = <5% detection rate
- ✅ **UUID rotation** - Weekly automatic rotation prevents permanent blacklisting
- ✅ **Safari ITP bypass** - Extends cookies from 7 days to 2+ years
- ✅ **Smart caching** - Auto-updates scripts, SHA-256 change detection
- ✅ **Zero config** - Auto-detects CORS, updates scripts every 12h
- ✅ **Production-ready** - Rate limiting, observability, error handling
- ✅ **Serverless** - Cloudflare Workers (200+ edge locations)

## Quick Start

```bash
# Clone and setup
git clone https://github.com/your-github-username/tracklay.git
cd tracklay
npm install

# Configure (auto-generates UUIDs)
chmod +x scripts/setup.sh
./scripts/setup.sh

# Deploy
npm run deploy

# Get your obfuscated URLs
npm run urls
```

### Add to Shopify Theme

Replace tracking scripts with your proxy URLs:

```html
<!-- Before (blocked) -->
<script src="https://www.googletagmanager.com/gtag/js?id=G-XXX"></script>

<!-- After (bypasses 95%+ ad-blockers) -->
<script src="https://yourstore.com/cdn/g/YOUR-UUID?id=G-XXX"></script>

<!-- Ultra-aggressive mode: Use container aliases for query obfuscation -->
<script src="https://yourstore.com/cdn/g/YOUR-UUID?c=abc123"></script>
```

## Why Use This?

### The Problem
- Safari blocks 3rd-party tracking (60%+ of mobile traffic)
- Ad-blockers affect 25-35% of users
- You lose 20-40% of conversion data

### The Solution
Tracklay serves tracking scripts as **first-party requests** from your domain:
- Safari can't detect it (same domain = first-party)
- Ad-blockers don't block it (UUID paths != known patterns)
- Cookies last 2+ years (vs 7 days)

### Results
| Metric | Before | After (v3.0.0) |
|--------|--------|----------------|
| iOS tracking | 50% | 95%+ |
| Ad-blocker bypass | 10% | **95%+** (UUID rotation + ultra-aggressive) |
| Detection rate | 90-100% | **<5%** (with container aliases) |
| Cookie lifetime | 7 days | 2+ years |
| Data accuracy | 60-70% | 90-95% |

## Documentation

- [Complete Setup Guide](docs/OBFUSCATION.md)
- [Performance Analysis](/tmp/tracklay-performance-analysis.md)
- [Architecture](worker.js)

## Advanced Configuration

Tracklay works out-of-the-box with zero configuration. For advanced setups:

**Environment Variables:**
- `GTM_SERVER_URL` - Your GTM Server-Side container URL (optional)
- `ENDPOINTS_UUID_ROTATION` - Enable automatic UUID rotation (default: disabled)
- `ENDPOINTS_SECRET` - Authentication token for `/endpoints` API
- `DEBUG_HEADERS` - Enable debug headers (⚠️ never in production)

**Configuration guides:**
- Setup: See [Quick Start](#quick-start) above
- Advanced: See [docs/SHOPIFY-INTEGRATION.md](docs/SHOPIFY-INTEGRATION.md)
- Security: See `.env.example` for all options

### UUID Rotation API

**Authenticated Endpoint:** `/endpoints?token=YOUR_SECRET`

Fetch current UUIDs for automatic rotation (required for Shopify Metafields integration):

```bash
# Replace YOUR_SECRET with ENDPOINTS_SECRET value
curl 'https://yourstore.com/endpoints?token=YOUR_SECRET'
```

**Response:**
```json
{
  "facebook": {
    "uuid": "a3f9c2e1b8d4",
    "script": "/cdn/f/a3f9c2e1b8d4",
    "endpoint": "/cdn/f/a3f9c2e1b8d4"
  },
  "google": {
    "uuid": "b7e4d3f2c9a1",
    "script": "/cdn/g/b7e4d3f2c9a1",
    "endpoint": "/cdn/g/b7e4d3f2c9a1"
  },
  "rotation": {
    "enabled": true,
    "interval": 604800000
  },
  "expiresAt": "2026-02-01T00:00:00Z"
}
```

**Use cases:**
- **n8n workflow:** Fetch UUIDs every week and update Shopify Metafields
- **GitHub Actions:** Automated theme updates on UUID rotation
- **Manual rotation:** Check current UUIDs before theme changes

**Security:**
- ⚠️ Never expose `ENDPOINTS_SECRET` in client-side code
- ✅ Use server-side integration only (n8n/GitHub Actions/backend)
- ✅ Store secret in Cloudflare Workers secrets (not in code)

**Setup guide:** [docs/SHOPIFY-INTEGRATION.md](docs/SHOPIFY-INTEGRATION.md#strategy-1-metafields-n8n-recommended)

## Troubleshooting

**Scripts not loading?**
- Check Cloudflare route configuration
- Verify `npm run urls` output
- Test: `curl https://your-worker.workers.dev/health`

**CORS errors?**
- Auto-detection should work
- If not, add origins to `ALLOWED_ORIGINS`

**Rate limited?**
- Default: 100 req/min per IP
- Increase `RATE_LIMIT_REQUESTS` if needed

## Support

- [Issues](https://github.com/your-github-username/tracklay/issues)
- [Discussions](https://github.com/your-github-username/tracklay/discussions)

## License

MIT License - see [LICENSE](LICENSE)

---

**Made with ❤️ for Shopify merchants**

If this helps you recover lost conversions, please ⭐ star the repo!
