# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- Support for Meta CAPI (Conversion API)
- Support for TikTok Pixel
- Built-in analytics dashboard
- Advanced bot detection
- A/B testing for tracking methods
- Shopify App for easier installation

## [1.0.0] - 2026-01-31

### First Release

**Tracklay - First-Party Tracking Proxy for Shopify Stores**

A Cloudflare Workers-based serverless proxy that serves Google Analytics 4 (GA4), Google Tag Manager (GTM), and Meta Pixel from your own domain to bypass Safari ITP, ad-blockers, and iOS tracking restrictions.

### Features

**Ultra-Aggressive Obfuscation:**
- Rotating, cryptographically secure UUID endpoints
- Prevents permanent blacklisting by ad-blockers
- Dynamic endpoint generation with unique UUIDs (`/x/{uuid}` paths)
- Automatic UUID rotation for maximum security

**Full Script Proxy:**
- Deep URL extraction and replacement in tracking scripts
- Automatic proxy of ALL external URLs found in GTM, gtag, and Facebook scripts
- Container-specific cache keys for GTM/gtag (`gtm:GTM-XXX`, `gtag:G-XXX` format)
- On-demand fetch and cache for container-specific scripts
- 30+ trackable domains supported

**Server-Side Event Tracking:**
- Direct event forwarding to Google Analytics and Meta
- Bypasses client-side blocking entirely
- Automatic protocol detection (Facebook vs Google)

**Edge Computing:**
- 200+ Cloudflare edge locations with <50ms latency
- Smart placement - Worker runs closest to backend
- SHA-256 streaming for efficient hash verification
- Gzip compression for scripts

**Security & Rate Limiting:**
- IP + endpoint-based rate limiting
- DoS protection with container ID validation
- Security headers on all responses
- Stratified rate limiting per endpoint

**Cache System:**
- Container-specific caching (GTM/gtag per-container)
- Stale-while-revalidate pattern
- 7-day TTL for dynamic endpoint mappings
- URL index uses SHA-256 hash for deduplication

### Deployment Modes

1. **Web (Client-Side)** - Scripts served from your domain
2. **GTM Server-Side** - Events forwarded to GTM server container
3. **GTM + GA4 Transport** - Hybrid approach with transport_url override

### Configuration

Environment variables for customization:
- `OBFUSCATION_FB_UUID` - Facebook Pixel endpoint UUID
- `OBFUSCATION_GA_UUID` - Google Analytics endpoint UUID
- `OBFUSCATION_SECRET` - Hash generation secret
- `GTM_SERVER_URL` - GTM Server-Side URL (optional)
- `RATE_LIMIT_REQUESTS` - Rate limit per window (default: 100)
- `CACHE_TTL` - Cache TTL in seconds (default: 3600)
- `FULL_SCRIPT_PROXY_ENABLED` - Enable full script proxy (default: true)

### Documentation

- [README.md](README.md) - Main documentation
- [docs/setup/SETUP.md](docs/setup/SETUP.md) - Setup guide
- [AGENTS.md](AGENTS.md) - Developer architecture guide
- [SECURITY.md](SECURITY.md) - Security policy

[Unreleased]: https://github.com/matheusmaiberg/tracklay/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/matheusmaiberg/tracklay/releases/tag/v1.0.0
