# Tracklay Documentation Index

Complete documentation for Tracklay - First-Party Tracking Proxy for Shopify

---

## 📖 Getting Started

### [Quick Start Guide](QUICK_START.md)
5-minute setup guide to deploy Tracklay
- Installation steps
- Configuration
- Deployment
- Testing

### [FAQ](FAQ.md)
40+ frequently asked questions
- Common issues
- Setup questions
- Troubleshooting
- Best practices

---

## 🛍️ Shopify Integration

### [Shopify Setup Guide](shopify/SETUP.md)
**NEW** - Complete guide to integrate Tracklay with Shopify
- Architecture overview (Custom Pixel + GTM + Worker)
- Step-by-step setup instructions
- Custom Pixel installation
- GTM configuration
- Testing & debugging
- Privacy & consent management
- Troubleshooting

### [GTM Configuration Guide](shopify/GTM-CONFIGURATION.md)
**NEW** - Detailed GTM tag configuration
- Creating GTM variables for proxy URLs
- Configuring Meta Pixel tags
- Configuring GA4 tags
- Custom event triggers
- Event deduplication
- Advanced configuration

### [Custom Pixel Example](shopify/examples/custom-pixel.js)
**NEW** - Production-ready Custom Pixel code
- Loads GTM from first-party proxy
- Subscribes to `all_standard_events`
- Pushes events to `window.dataLayer`
- Consent Mode v2 support
- Automatic event mapping (9+ events)
- Debug logging

---

## 🔒 Security & Obfuscation

### [Obfuscation Guide](OBFUSCATION.md)
Complete anti-detection strategies
- UUID-based obfuscation
- Facebook Pixel migration
- Google Tag Manager migration
- Advanced recommendations

### [Security Policy](SECURITY.md)
Security best practices
- UUID generation
- Rate limiting
- Header security
- Request validation

---

## 📊 Project Status & Planning

### [Implementation Status](IMPLEMENTATION_STATUS.md)
Current project status (v3.2.0)
- ✅ Full Script Proxy - Deep URL extraction and replacement
- ✅ Container-specific caching (GTM/gtag per-container)
- ✅ Dynamic endpoints (`/x/{uuid}` paths)
- ✅ UUID rotation implemented
- ✅ Ultra-aggressive obfuscation (no suffixes)
- ✅ 30+ trackable domains supported
- 📦 Architecture overview
- 🧪 Testing checklist
- 🚀 Deployment steps

### 🆕 [CAPI-v2 Gap Analysis](CAPI-V2-GAP-ANALYSIS.md)
**NEW** - Complete feature comparison with CAPI-v2 documentation
- ✅ What's implemented (15% coverage)
- ❌ What's missing (85% - Meta CAPI, GTM Server, Advanced Evasion, etc.)
- 📊 Priority matrix with ROI calculations
- 🎯 Recommended roadmap (5 phases)
- 📈 Expected impact by feature

### 🆕 [CAPI-v2 Quick Reference](CAPI-V2-QUICK-REFERENCE.md)
**NEW** - Quick lookup for missing features
- Priority 0: Meta CAPI (ROI 40:1)
- Priority 1: Advanced Evasion (ROI 120:1+)
- Priority 2: Profit Optimization
- Recommended implementation order

---

## 📝 Changelog

### [Changelog](CHANGELOG.md)
Version history and release notes
- v3.2.0 (Full Script Proxy + Container-specific caching)
- v3.1.0 (Server-side events + transport_url)
- v3.0.0 (Ultra-aggressive obfuscation + UUID rotation) - **BREAKING**
- v2.0.0-factory (Factory architecture)
- v1.x.x (Legacy versions)

### [Obfuscation Changelog](CHANGELOG-OBFUSCATION.md)
UUID obfuscation system evolution
- UUID generation improvements
- Path obfuscation strategies
- Security enhancements

---

## 🗺️ Feature Roadmap (Based on CAPI-v2 Analysis)

### Phase 1 - Meta CAPI Foundation (Q1 2026)
- Meta Conversions API (server-side)
- Advanced matching (EMQ 9+)
- Event deduplication
- Custom conversions (COGS, profit)

**Impact**: EMQ 4.5 → 8.9, ROAS accuracy ±40% → ±8%

### Phase 2 - Advanced Obfuscation (Q2 2026)
- Service Worker interceptor (98% bypass)
- WebSocket streaming (99% bypass)
- Server-side ad injection (95% bypass)
- WASM obfuscation

**Impact**: 90% → 99.5% ad-blocker bypass

### Phase 3 - GTM Server & Shopify (Q3 2026)
- GTM Server-Side setup
- Shopify Customer Events API
- Consent Mode v2
- Cookie lifetime extension (7d → 90d)

**Impact**: Safari compliance, full Shopify integration

### Phase 4 - Optimization (Q4 2026)
- Browser fingerprinting
- Profit optimization (margin-based bidding)
- EMQ monitoring dashboard
- Continuous monitoring

**Impact**: Profit-optimized bidding, 99.9% uptime

### Phase 5 - Expansion (2027)
- Multi-platform support (TikTok, Pinterest, Snapchat)
- Built-in analytics dashboard
- A/B testing framework
- Shopify App Store

---

## 📚 External References

### CAPI-v2 Documentation
Location: `/home/matheus/Documentos/CAPI-v2/`

**Structure** (38+ files):
```
1-getting-started/      - Architecture, quick starts (4 files)
2-meta-capi/           - Meta CAPI fundamentals (5 files) ❌ NOT IMPLEMENTED
3-gtm-server/          - GTM Server setup (6 files) ❌ NOT IMPLEMENTED
4-shopify/             - Shopify integration (5 files) ❌ NOT IMPLEMENTED
5-infrastructure/      - Hosting, SSL (4 files)
6-advanced-optimization/ - EMQ, profit (5 files) ❌ NOT IMPLEMENTED
7-adblocker-evasion/   - 19+ tactics (5 files) - 7 implemented, 12 missing
8-code-debugging/      - Debugging (5 files) ❌ NOT IMPLEMENTED
```

### Key Reference Files

**Meta CAPI** (Priority 0):
- `2-meta-capi/meta-capi-fundamentals.md`
- `2-meta-capi/advanced-matching.md`
- `2-meta-capi/deduplication-strategies.md`

**Advanced Evasion** (Priority 1):
- `7-adblocker-evasion/advanced-evasion.md`
- `7-adblocker-evasion/obfuscation-tactics.md`

**GTM Server** (Priority 1):
- `3-gtm-server/gtm-server-introduction.md`
- `3-gtm-server/cookie-management.md`

**Shopify** (Priority 1):
- `4-shopify/shopify-web-pixel-setup.md`
- `4-shopify/shopify-consent-mode.md`

---

## 🎯 Quick Links by Use Case

### I want to...

**Deploy Tracklay**
→ [Quick Start Guide](QUICK_START.md)

**Integrate with Shopify**
→ [Shopify Setup Guide](shopify/SETUP.md) (complete guide)
→ [Custom Pixel Example](shopify/examples/custom-pixel.js) (copy-paste ready)

**Configure GTM tags**
→ [GTM Configuration Guide](shopify/GTM-CONFIGURATION.md)

**Understand UUID obfuscation**
→ [Obfuscation Guide](OBFUSCATION.md)

**Check security best practices**
→ [Security Policy](SECURITY.md)

**See what's implemented**
→ [Implementation Status](IMPLEMENTATION_STATUS.md)

**Know what's missing from CAPI-v2**
→ [CAPI-v2 Quick Reference](CAPI-V2-QUICK-REFERENCE.md) (short)
→ [CAPI-v2 Gap Analysis](CAPI-V2-GAP-ANALYSIS.md) (detailed)

**Plan next features**
→ [CAPI-v2 Gap Analysis - Priority Matrix](CAPI-V2-GAP-ANALYSIS.md#-implementation-priority-matrix)

**Implement Meta CAPI**
→ [CAPI-v2 Gap Analysis - Meta CAPI Section](CAPI-V2-GAP-ANALYSIS.md#1-meta-conversions-api-capi---category-2-05-files)
→ External: `CAPI-v2/2-meta-capi/`

**Improve ad-blocker bypass**
→ [CAPI-v2 Gap Analysis - Advanced Evasion](CAPI-V2-GAP-ANALYSIS.md#4-advanced-ad-blocker-evasion---category-7-1219-tactics-missing)
→ External: `CAPI-v2/7-adblocker-evasion/advanced-evasion.md`

**Set up GTM Server**
→ External: `CAPI-v2/3-gtm-server/gtm-server-introduction.md`

**Troubleshoot issues**
→ [FAQ](FAQ.md)
→ [Security Policy - Troubleshooting](SECURITY.md)

---

## 📊 Documentation Statistics

- **Total Docs**: 14 files (11 docs + 3 Shopify guides)
- **Lines**: ~9,000+ lines
- **Coverage**: Getting started, Shopify integration, security, implementation, planning, gap analysis
- **Languages**: English (with some Portuguese context in CAPI-v2 references)
- **Last Updated**: January 29, 2026

---

## 🤝 Contributing to Docs

Found a typo? Want to improve documentation? See [../CONTRIBUTING.md](../CONTRIBUTING.md)

**Quick tips**:
- Keep docs concise and actionable
- Include code examples
- Add links to related docs
- Update this index when adding new docs

---

## 📞 Support

- **Issues**: [GitHub Issues](https://github.com/your-github-username/tracklay/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-github-username/tracklay/discussions)
- **Main README**: [../README.md](../README.md)

---

**Made with ❤️ for the Shopify community**
