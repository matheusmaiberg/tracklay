# CAPI-v2 Quick Reference - What's Missing

**Quick lookup**: What features from CAPI-v2 are NOT in Tracklay yet

---

## ✅ What We Have (15% coverage)

- ✅ First-party proxy (Cloudflare Workers)
- ✅ UUID obfuscation for scripts
- ✅ GTM/Meta Pixel script proxying
- ✅ Rate limiting, CORS, security headers
- ✅ Basic ad-blocker bypass (90% success)

---

## ❌ What's Missing (85%)

### 🔴 Priority 0 - Critical (Implement First)

#### Meta CAPI - Server-Side Conversions
**Impact**: EMQ 4.5 → 8.9, ROI 40:1
- ❌ Server-side event sending to Facebook Graph API
- ❌ Advanced matching (email, phone, address hashing)
- ❌ Event deduplication (Pixel + CAPI sync)
- ❌ EMQ optimization (10+ parameters)
- ❌ COGS/profit tracking

**Docs**: `CAPI-v2/2-meta-capi/*.md`

---

### 🟡 Priority 1 - High Value

#### Advanced Ad-Blocker Evasion
**Impact**: 90% → 99.5% bypass, ROI 120:1+
- ❌ Service Worker interceptor (98% bypass)
- ❌ WebSocket streaming (99% bypass)
- ❌ Server-side ad injection (95% bypass)
- ❌ WASM obfuscation
- ❌ Shadow DOM encapsulation

**Docs**: `CAPI-v2/7-adblocker-evasion/advanced-evasion.md`

#### GTM Server-Side Setup
**Impact**: Cookie 7d → 90d, ROI 25:1
- ❌ Server container setup guide
- ❌ Cookie management (HTTP vs JS)
- ❌ IP alignment for EMQ
- ❌ Hosting options (Stape, GCP, self-hosted)

**Docs**: `CAPI-v2/3-gtm-server/*.md`

#### Shopify Integration
**Impact**: Compliance + data quality, ROI 30:1
- ❌ Customer Events API (Web Pixel)
- ❌ Shopify data layer
- ❌ Consent Mode v2
- ❌ Theme integration guide

**Docs**: `CAPI-v2/4-shopify/*.md`

---

### 🟢 Priority 2 - Medium Value

#### Profit Optimization
- ❌ COGS tracking
- ❌ Margin-based bidding
- ❌ LTV prediction

**Docs**: `CAPI-v2/6-advanced-optimization/profit-optimization.md`

#### Browser Fingerprinting
- ❌ Canvas/WebGL fingerprinting
- ❌ Cookieless tracking
- ❌ Cross-device matching

**Docs**: `CAPI-v2/6-advanced-optimization/fingerprinting-techniques.md`

#### Monitoring & Debugging
- ❌ EMQ monitoring dashboard
- ❌ Troubleshooting flowchart
- ❌ Continuous monitoring setup

**Docs**: `CAPI-v2/8-code-debugging/*.md`

---

### ⚪ Priority 3 - Nice to Have

- ❌ TikTok/Pinterest Pixel support
- ❌ Built-in analytics dashboard
- ❌ A/B testing framework
- ❌ Bot detection
- ❌ Shopify App

---

## 📊 Impact Summary

| Feature | Current | With Feature | ROI |
|---------|---------|--------------|-----|
| **Meta CAPI** | EMQ 4.5 | EMQ 8.9 | 40:1 |
| **Service Worker** | 90% bypass | 98% bypass | 120:1 |
| **WebSocket** | 90% bypass | 99% bypass | 150:1 |
| **GTM Server** | 7d cookies | 90d cookies | 25:1 |

---

## 🎯 Recommended Order

1. **Meta CAPI** (4-6 weeks) - Biggest business impact
2. **Service Worker + WebSocket** (6-8 weeks) - Best bypass rate
3. **GTM Server Setup** (4-6 weeks) - Cookie lifetime
4. **Shopify Integration** (4-6 weeks) - Compliance
5. **Profit Optimization** (4-6 weeks) - Advanced features

---

## 📚 Full Analysis

See [CAPI-V2-GAP-ANALYSIS.md](CAPI-V2-GAP-ANALYSIS.md) for:
- Complete feature breakdown
- Technical details
- Code references
- Implementation roadmap
- Compliance notes

---

**Last Updated**: January 24, 2026
