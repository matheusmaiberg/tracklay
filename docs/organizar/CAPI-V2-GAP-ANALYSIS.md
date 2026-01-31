# CAPI-v2 Gap Analysis - Features Not Yet Implemented

**Document Date**: January 24, 2026
**Project**: Tracklay - Shopify Anti-Tracking Proxy
**Reference**: `/home/matheus/Documentos/CAPI-v2/`
**Current Status**: Production-ready proxy with UUID obfuscation

---

## 📋 Executive Summary

This document compares the comprehensive CAPI-v2 documentation (38+ files, 8 categories) with the current Tracklay implementation to identify features and techniques that have NOT yet been implemented.

**Current Implementation Coverage**: ~15% of CAPI-v2 capabilities
**Focus**: First-party proxy with UUID obfuscation (Category 7 - Partial)
**Missing**: Meta CAPI, GTM Server setup, advanced obfuscation, profit optimization, and more

---

## ✅ Already Implemented (Current Tracklay Features)

### Category 7: Ad-Blocker Evasion (Partial)
- ✅ **UUID Rotativo** - Daily rotating UUIDs for script obfuscation
- ✅ **Path-Based Routing** - `/cdn/`, `/assets/`, `/static/` paths
- ✅ **First-Party Proxying** - Cloudflare Workers proxy
- ✅ **Script Proxying** - GTM and Meta Pixel scripts served from own domain
- ✅ **First-party cookies** - Extended lifetime (vs 7-day Safari limit)

### Infrastructure (Partial)
- ✅ **Cloudflare Workers** - Edge deployment
- ✅ **Auto-CORS detection** - Zero configuration
- ✅ **Rate limiting** - IP-based (100 req/min)
- ✅ **Security headers** - CSP, X-Frame-Options, etc.

---

## ❌ NOT Implemented - High Priority

### 1. Meta Conversions API (CAPI) - Category 2 (0/5 files)

**Status**: ❌ **NOT IMPLEMENTED** - Only Meta Pixel proxy exists

The current project proxies Meta Pixel (client-side) but **does NOT implement Meta CAPI** (server-side conversion tracking).

#### Missing Components:

##### 1.1 Meta CAPI Fundamentals
- ❌ Server-side event sending to Facebook Graph API
- ❌ Event Match Quality (EMQ) optimization (target: 9.0+)
- ❌ SHA-256 hashing of user data (email, phone, address)
- ❌ Normalization rules (lowercase, trim, remove spaces)
- ❌ Access token management
- ❌ Test event code support
- ❌ Event deduplication with `event_id`

**Reference**: `CAPI-v2/2-meta-capi/meta-capi-fundamentals.md`

##### 1.2 Advanced Matching (10+ Parameters)
- ❌ Progressive form tracking to collect user data
- ❌ Email hashing and validation
- ❌ Phone number normalization and hashing
- ❌ Address data collection (city, state, zip, country)
- ❌ First name / Last name hashing
- ❌ Gender, date of birth collection
- ❌ External ID tracking
- ❌ `fbp`, `fbc` cookie collection
- ❌ Click ID (`fbclid`) preservation
- ❌ Client IP address forwarding
- ❌ User agent forwarding

**Impact**: Current EMQ is likely 4-5/10. With advanced matching: **EMQ 9.0+/10**

**Reference**: `CAPI-v2/2-meta-capi/advanced-matching.md`

##### 1.3 Deduplication Strategy
- ❌ Pixel + CAPI integration without duplicate events
- ❌ `event_id` generation and syncing
- ❌ `event_time` timestamp alignment
- ❌ Client-side `event_id` injection in Pixel
- ❌ Server-side CAPI with same `event_id`

**Problem**: Without deduplication, events are counted twice (Pixel + CAPI = 2x conversions)

**Reference**: `CAPI-v2/2-meta-capi/deduplication-strategies.md`

##### 1.4 Custom Conversions
- ❌ COGS (Cost of Goods Sold) tracking
- ❌ Profit margin calculation
- ❌ LTV (Lifetime Value) prediction
- ❌ Value-based bidding optimization
- ❌ Custom event parameters

**Business Impact**: Can't optimize for profit, only revenue

**Reference**: `CAPI-v2/2-meta-capi/custom-conversions.md`

---

### 2. GTM Server-Side Container - Category 3 (0/6 files)

**Status**: ❌ **NOT IMPLEMENTED** - Only client-side script proxy exists

The current project proxies GTM scripts but **does NOT set up or configure GTM Server-Side**.

#### Missing Components:

##### 2.1 GTM Server Container Setup
- ❌ Server container creation (Tag Manager)
- ❌ Server container deployment (Stape.io, GCP, self-hosted)
- ❌ Custom domain configuration (`gtm.yourstore.com`)
- ❌ DNS configuration (A record, CNAME)
- ❌ SSL certificate setup
- ❌ Server-side client configuration (GA4, Meta, etc.)
- ❌ Server-side tag configuration

**Reference**: `CAPI-v2/3-gtm-server/gtm-server-introduction.md`

##### 2.2 Hosting Options Comparison
- ❌ Stape.io setup guide
- ❌ Google Cloud Platform (Cloud Run) setup
- ❌ Hetzner VPS setup
- ❌ TAGGRS setup
- ❌ Cost comparison (€39-399/month)
- ❌ Performance benchmarks

**Reference**: `CAPI-v2/3-gtm-server/hosting-options.md`

##### 2.3 Cookie Management
- ❌ HTTP cookie setting (vs JavaScript)
- ❌ Cookie lifetime extension (7 days → 90 days in Safari)
- ❌ `_ga` cookie refresh via server
- ❌ `fbp`, `fbc` cookie handling

**Impact**: Cookies still expire in 7 days on Safari (ITP limitation)

**Reference**: `CAPI-v2/3-gtm-server/cookie-management.md`

##### 2.4 IP Alignment
- ❌ Forwarding user IP to GTM Server
- ❌ IP-based location matching for EMQ
- ❌ User-Agent forwarding

**Impact**: EMQ lower without IP alignment

**Reference**: `CAPI-v2/3-gtm-server/custom-domain-setup.md`

---

### 3. Shopify-Specific Implementation - Category 4 (0/5 files)

**Status**: ❌ **NOT IMPLEMENTED** - Generic proxy, not Shopify-specific

#### Missing Components:

##### 3.1 Shopify Customer Events API (Web Pixel)
- ❌ Web Pixel API implementation (August 2025 requirement)
- ❌ Shopify Customer Events subscription
- ❌ Event mapping (Shopify → Meta/GA4)
- ❌ Cart tracking (`cart_viewed`, `product_added_to_cart`)
- ❌ Checkout tracking (`checkout_started`, `checkout_completed`)
- ❌ `checkout.liquid` deprecation handling

**Important**: After August 2025, `checkout.liquid` was deprecated. Need Customer Events API.

**Reference**: `CAPI-v2/4-shopify/shopify-web-pixel-setup.md`

##### 3.2 Shopify Data Layer
- ❌ Product data extraction from Shopify objects
- ❌ Customer data extraction (email, phone, address)
- ❌ Order data extraction (total, tax, shipping)
- ❌ Variant tracking (SKU, price, inventory)

**Reference**: `CAPI-v2/4-shopify/shopify-data-layer.md`

##### 3.3 Consent Mode v2
- ❌ Shopify Customer Privacy API integration
- ❌ Consent Mode v2 implementation (Google requirement)
- ❌ Banner integration (Cookiebot, OneTrust)
- ❌ Consent signal forwarding to GTM/Meta

**Compliance**: Required for GDPR, LGPD compliance

**Reference**: `CAPI-v2/4-shopify/shopify-consent-mode.md`

##### 3.4 Theme Integration
- ❌ Dawn theme integration guide
- ❌ Liquid template modifications
- ❌ Event listener setup
- ❌ Data layer injection

**Reference**: `CAPI-v2/4-shopify/shopify-theme-integration.md`

---

### 4. Advanced Ad-Blocker Evasion - Category 7 (12/19 tactics missing)

**Status**: ⚠️ **PARTIALLY IMPLEMENTED** - Only 7/19 tactics implemented

#### Already Implemented (7/19):
- ✅ UUID Rotativo (95% bypass)
- ✅ Path-Based Routing (90% bypass)
- ✅ CNAME Cloaking (90% bypass) - via Cloudflare
- ✅ Proxy First-Party Scripts (100% bypass)
- ✅ First-party cookies
- ✅ Rate limiting (basic)
- ✅ Security headers

#### Missing Tactics (12/19):

##### 4.1 Obfuscation Tactics (CAPI-v2/7/obfuscation-tactics.md)
- ❌ **Inline Scripts + Obfuscation** - JavaScript obfuscator (85% bypass)
- ❌ **Dynamic Imports + Lazy Loading** - Load after page ready (85% bypass)
- ❌ **Bundle Scripts** - Combine tracking with jQuery/React (80% bypass)
- ❌ **Timing Attacks** - Delay loading 10+ seconds (75% bypass)
- ❌ **WASM Obfuscation** - WebAssembly binary (70% bypass)
- ❌ **Base64 Steganography** - Hide payloads in images (80% bypass)

##### 4.2 Advanced Evasion (CAPI-v2/7/advanced-evasion.md)
- ❌ **Service Worker Interceptor** - Swap scripts invisibly (98% bypass)
- ❌ **WebSocket Streaming** - Stream code via WebSocket (99% bypass)
- ❌ **Request Encryption + Domain Rotation** - Encrypted payloads (80% bypass)
- ❌ **Server-Side Ad Injection** - Inject tracking in HTML (95% bypass)
- ❌ **Mutation Observer Re-Injection** - Auto-reinject if blocked (70% bypass)
- ❌ **Shadow DOM Encapsulation** - Hide in Web Components (80% bypass)

**Highest ROI Missing Tactics**:
1. **Service Worker Interceptor** - 98% bypass, ROI 120:1
2. **WebSocket Streaming** - 99% bypass, ROI 150:1
3. **Server-Side Ad Injection** - 95% bypass, ROI 80:1

**Reference**: `CAPI-v2/7-adblocker-evasion/advanced-evasion.md`

---

## ❌ NOT Implemented - Medium Priority

### 5. Advanced Optimization - Category 6 (0/5 files)

##### 5.1 EMQ Maximization
- ❌ Systematic approach to EMQ 9.5+
- ❌ Parameter ranking by impact
- ❌ Progressive enhancement strategy
- ❌ EMQ monitoring dashboard

**Reference**: `CAPI-v2/6-advanced-optimization/emq-maximization-guide.md`

##### 5.2 Profit Optimization
- ❌ COGS tracking per product
- ❌ Margin-based bidding
- ❌ Predicted LTV calculation
- ❌ Value-based campaign optimization

**Business Impact**: Can't optimize for profit margin, only revenue

**Reference**: `CAPI-v2/6-advanced-optimization/profit-optimization.md`

##### 5.3 Browser Fingerprinting
- ❌ Canvas fingerprinting (99.5% accuracy)
- ❌ WebGL fingerprinting
- ❌ Audio context fingerprinting
- ❌ FingerprintJS Pro integration
- ❌ Cookieless tracking fallback
- ❌ Cross-device identity matching

**Use Case**: Track users even when cookies are blocked

**Reference**: `CAPI-v2/6-advanced-optimization/fingerprinting-techniques.md`

##### 5.4 Special Events
- ❌ Subscription tracking (recurring revenue)
- ❌ Offline conversions import
- ❌ WhatsApp conversions
- ❌ Phone call tracking
- ❌ In-store visit tracking

**Reference**: `CAPI-v2/6-advanced-optimization/special-events.md`

---

### 6. Infrastructure & Hosting - Category 5 (2/4 files)

##### 6.1 Server Hosting Guide
- ❌ VPS setup guide (Hetzner, GCP, AWS)
- ❌ Docker containerization
- ❌ Auto-scaling configuration
- ❌ Load balancer setup
- ❌ Multi-region deployment

**Reference**: `CAPI-v2/5-infrastructure/server-hosting-guide.md`

##### 6.2 SSL Security
- ❌ Let's Encrypt automation
- ❌ Certificate rotation
- ❌ HSTS configuration
- ❌ TLS 1.3 enforcement

**Reference**: `CAPI-v2/5-infrastructure/ssl-security.md`

---

### 7. Debugging & Monitoring - Category 8 (1/5 files)

##### 7.1 Debugging Guide
- ❌ Chrome DevTools network analysis
- ❌ Meta Pixel Helper usage
- ❌ Meta Events Manager debugging
- ❌ GTM Preview mode guide
- ❌ Common error patterns

**Reference**: `CAPI-v2/8-code-debugging/debugging-guide.md`

##### 7.2 Monitoring Setup
- ❌ Continuous EMQ monitoring
- ❌ Conversion discrepancy alerts
- ❌ Uptime monitoring
- ❌ Performance dashboards
- ❌ Error rate tracking

**Reference**: `CAPI-v2/8-code-debugging/monitoring-setup.md`

##### 7.3 Troubleshooting Checklist
- ❌ Complete diagnostic flowchart
- ❌ Step-by-step problem resolution
- ❌ EMQ score troubleshooting
- ❌ Deduplication verification
- ❌ Cookie lifetime verification

**Reference**: `CAPI-v2/8-code-debugging/troubleshooting-checklist.md`

---

## ❌ NOT Implemented - Lower Priority

### 8. Getting Started Materials - Category 1 (3/4 files)

##### 8.1 Architecture Overview
- ❌ Complete architecture diagrams
- ❌ Client-side vs server-side comparison
- ❌ ROI calculation spreadsheets
- ❌ Expected results benchmarks

**Reference**: `CAPI-v2/1-getting-started/architecture-overview.md`

##### 8.2 Quick Start Guides
- ❌ WooCommerce implementation guide
- ❌ Magento implementation guide
- ❌ Custom platform guide

**Reference**: `CAPI-v2/1-getting-started/quick-start-generic.md`

---

### 9. Additional Features (Roadmap Items)

##### 9.1 Analytics & Reporting
- ❌ Built-in analytics dashboard
- ❌ Event volume charts
- ❌ EMQ score trends
- ❌ Conversion funnel visualization
- ❌ Attribution modeling

##### 9.2 Testing & Experimentation
- ❌ A/B testing framework
- ❌ Traffic split testing
- ❌ Multivariate testing
- ❌ Statistical significance calculator

##### 9.3 Bot Detection
- ❌ Bot pattern recognition
- ❌ IP reputation checking
- ❌ Browser fingerprint validation
- ❌ Challenge-response system

##### 9.4 Additional Tracking Providers
- ❌ TikTok Pixel support
- ❌ Pinterest Tag support
- ❌ Snapchat Pixel support
- ❌ Twitter Pixel support
- ❌ LinkedIn Insight Tag support

##### 9.5 Shopify App
- ❌ One-click installation
- ❌ Shopify App Store listing
- ❌ Admin dashboard integration
- ❌ Automatic configuration
- ❌ Billing integration

---

## 📊 Implementation Priority Matrix

### High Priority (Critical Business Impact)

| Feature | Business Impact | Technical Complexity | ROI | Priority |
|---------|----------------|---------------------|-----|----------|
| **Meta CAPI Integration** | ⭐⭐⭐⭐⭐ Critical | Medium | 40:1 | **P0** |
| **Deduplication Strategy** | ⭐⭐⭐⭐⭐ Critical | Medium | 35:1 | **P0** |
| **Advanced Matching (10+ params)** | ⭐⭐⭐⭐⭐ Critical | Low | 50:1 | **P0** |
| **Service Worker Interceptor** | ⭐⭐⭐⭐ High | High | 120:1 | **P1** |
| **WebSocket Streaming** | ⭐⭐⭐⭐ High | Very High | 150:1 | **P1** |
| **GTM Server Setup Guide** | ⭐⭐⭐⭐ High | Medium | 25:1 | **P1** |
| **Shopify Customer Events API** | ⭐⭐⭐⭐ High | Medium | 30:1 | **P1** |

### Medium Priority (Competitive Advantage)

| Feature | Business Impact | Technical Complexity | ROI | Priority |
|---------|----------------|---------------------|-----|----------|
| **Browser Fingerprinting** | ⭐⭐⭐ Medium | High | 20:1 | **P2** |
| **Profit Optimization (COGS)** | ⭐⭐⭐ Medium | Medium | 15:1 | **P2** |
| **Consent Mode v2** | ⭐⭐⭐ Medium | Low | 12:1 | **P2** |
| **WASM Obfuscation** | ⭐⭐⭐ Medium | Very High | 18:1 | **P2** |
| **Server-Side Ad Injection** | ⭐⭐⭐ Medium | High | 80:1 | **P2** |

### Lower Priority (Nice to Have)

| Feature | Business Impact | Technical Complexity | ROI | Priority |
|---------|----------------|---------------------|-----|----------|
| **Built-in Dashboard** | ⭐⭐ Low | High | 5:1 | **P3** |
| **A/B Testing** | ⭐⭐ Low | Medium | 8:1 | **P3** |
| **TikTok/Pinterest Support** | ⭐⭐ Low | Low | 10:1 | **P3** |
| **Bot Detection** | ⭐⭐ Low | High | 7:1 | **P3** |
| **Shopify App** | ⭐⭐ Low | Very High | 3:1 | **P3** |

---

## 📈 Expected Impact by Feature

### If Meta CAPI is Implemented (P0 Priority):

| Metric | Current | With CAPI | Improvement |
|--------|---------|-----------|-------------|
| **EMQ Score** | 4.5/10 | 8.9/10 | **+98%** |
| **Event Capture Rate** | 70% | 92% | **+31%** |
| **ROAS Accuracy** | ±40% error | ±8% error | **5x better** |
| **Attribution Window** | 7 days (Safari) | 28 days | **+300%** |
| **Conversion Tracking** | 60% | 90%+ | **+50%** |

**Monthly Impact** (for €10k ad spend):
- €3,000-5,000 saved from better optimization
- 30-50% ROAS improvement
- 40% reduction in wasted spend

---

### If Advanced Evasion Tactics are Implemented (P1 Priority):

| Tactic | Current Bypass Rate | With Tactic | Improvement |
|--------|-------------------|-------------|-------------|
| **Service Worker** | 90% | 98% | **+8pp** |
| **WebSocket Streaming** | 90% | 99% | **+9pp** |
| **Server-Side Injection** | 90% | 95% | **+5pp** |
| **Combined All Tactics** | 90% | **99.5%** | **+9.5pp** |

**Business Impact**:
- Additional 9.5% of previously lost conversions recovered
- €100k/month revenue → €9,500/month additional tracked conversions

---

## 🎯 Recommended Implementation Roadmap

### Phase 1 (Q1 2026): Meta CAPI Foundation
**Duration**: 4-6 weeks
**Goal**: Implement server-side conversion tracking

1. ✅ Meta CAPI fundamentals (server-side event sending)
2. ✅ Advanced matching (10+ parameters, EMQ 9+)
3. ✅ Deduplication strategy (Pixel + CAPI sync)
4. ✅ Custom conversions (COGS, profit tracking)
5. ✅ Event testing and validation

**Expected Outcome**: EMQ 4.5 → 8.9, ROAS accuracy ±40% → ±8%

---

### Phase 2 (Q2 2026): Advanced Obfuscation
**Duration**: 6-8 weeks
**Goal**: 99%+ ad-blocker bypass rate

1. ✅ Service Worker interceptor (98% bypass)
2. ✅ WebSocket streaming (99% bypass)
3. ✅ Server-side ad injection (95% bypass)
4. ✅ WASM obfuscation (70% bypass)
5. ✅ Mutation observer re-injection (70% bypass)

**Expected Outcome**: 90% → 99.5% bypass rate

---

### Phase 3 (Q3 2026): GTM Server & Shopify Integration
**Duration**: 4-6 weeks
**Goal**: Complete Shopify e-commerce solution

1. ✅ GTM Server-Side setup guide
2. ✅ Shopify Customer Events API (Web Pixel)
3. ✅ Shopify data layer implementation
4. ✅ Consent Mode v2 integration
5. ✅ Cookie lifetime extension (HTTP cookies)

**Expected Outcome**: Safari cookie 7d → 90d, full Shopify compliance

---

### Phase 4 (Q4 2026): Optimization & Monitoring
**Duration**: 6-8 weeks
**Goal**: Profit optimization and continuous monitoring

1. ✅ Browser fingerprinting (cookieless tracking)
2. ✅ Profit optimization (margin-based bidding)
3. ✅ EMQ monitoring dashboard
4. ✅ Debugging and troubleshooting tools
5. ✅ Alerting and uptime monitoring

**Expected Outcome**: Profit-optimized bidding, 99.9% uptime

---

### Phase 5 (2027): Expansion & Scaling
**Duration**: Ongoing
**Goal**: Multi-platform support and enterprise features

1. ✅ TikTok, Pinterest, Snapchat support
2. ✅ Built-in analytics dashboard
3. ✅ A/B testing framework
4. ✅ Bot detection system
5. ✅ Shopify App Store listing

**Expected Outcome**: Complete marketing platform

---

## 📚 Reference Documentation

### CAPI-v2 Structure (38+ files)

```
CAPI-v2/
├── 1-getting-started/          (4 files) - Architecture, quick starts
├── 2-meta-capi/                (5 files) - Meta CAPI fundamentals ❌ NOT IMPLEMENTED
├── 3-gtm-server/               (6 files) - GTM Server setup ❌ NOT IMPLEMENTED
├── 4-shopify/                  (5 files) - Shopify integration ❌ NOT IMPLEMENTED
├── 5-infrastructure/           (4 files) - Hosting, SSL, load balancing
├── 6-advanced-optimization/    (5 files) - EMQ, profit, fingerprinting ❌ NOT IMPLEMENTED
├── 7-adblocker-evasion/        (5 files) - 19+ tactics (7 implemented, 12 missing)
└── 8-code-debugging/           (5 files) - Debugging, monitoring ❌ NOT IMPLEMENTED
```

### Key Reference Files

**Meta CAPI (Priority P0)**:
- `2-meta-capi/meta-capi-fundamentals.md`
- `2-meta-capi/advanced-matching.md`
- `2-meta-capi/deduplication-strategies.md`

**Advanced Evasion (Priority P1)**:
- `7-adblocker-evasion/advanced-evasion.md`
- `7-adblocker-evasion/obfuscation-tactics.md`

**GTM Server (Priority P1)**:
- `3-gtm-server/gtm-server-introduction.md`
- `3-gtm-server/cookie-management.md`

**Shopify (Priority P1)**:
- `4-shopify/shopify-web-pixel-setup.md`
- `4-shopify/shopify-consent-mode.md`

---

## 🚨 Compliance & Legal Notes

**IMPORTANT**: Many advanced techniques in CAPI-v2 require:

1. **User Consent** - GDPR, LGPD, CCPA compliance
2. **Privacy Policy Disclosure** - Full transparency
3. **Platform ToS Compliance** - Some tactics may violate Facebook/Google ToS
4. **Ethical Usage** - Recommended only for stores >€500k/month

**Tactics with ToS Risk**:
- ⚠️ Service Worker interceptor (may violate ToS)
- ⚠️ WebSocket streaming (gray area)
- ⚠️ Fingerprinting without consent (GDPR violation)
- ⚠️ Cookie lifetime extension beyond user expectations (privacy concern)

**Recommendation**: Implement with legal review and clear user consent.

---

## 🎓 Learning Path

If you want to implement missing features, study in this order:

1. **Start**: `1-getting-started/architecture-overview.md`
2. **Meta CAPI**: `2-meta-capi/meta-capi-fundamentals.md`
3. **GTM Server**: `3-gtm-server/gtm-server-introduction.md`
4. **Shopify**: `4-shopify/shopify-web-pixel-setup.md`
5. **Advanced**: `7-adblocker-evasion/advanced-evasion.md`
6. **Optimize**: `6-advanced-optimization/emq-maximization-guide.md`

Total study time: 20-30 hours for comprehensive understanding

---

## 📞 Next Steps

### For Project Owner:

1. **Review priorities** - Which features align with business goals?
2. **Choose Phase 1** - Meta CAPI vs Advanced Evasion vs GTM Server?
3. **Allocate resources** - Time, budget, technical expertise
4. **Start with P0** - Meta CAPI has highest business impact (ROI 40:1)

### For Contributors:

1. **Pick a feature** from the gap analysis
2. **Study reference docs** in CAPI-v2
3. **Implement incrementally** with tests
4. **Submit PR** with documentation
5. **Iterate** based on feedback

---

## 📄 Document Version

- **Version**: 1.0.0
- **Date**: January 24, 2026
- **Author**: Gap Analysis based on CAPI-v2 exploration
- **Status**: Complete reference document
- **Next Review**: After each major feature implementation

---

**📌 Summary**:

- **Current Coverage**: 15% of CAPI-v2 capabilities
- **Missing Critical Features**: Meta CAPI (P0), Advanced Evasion (P1), GTM Server (P1)
- **Highest ROI Missing**: Service Worker (120:1), WebSocket (150:1), Meta CAPI (40:1)
- **Recommended Next Step**: Implement Meta CAPI for EMQ 4.5 → 8.9 improvement
- **Estimated Impact**: €3,000-5,000/month savings per €10k ad spend

**This is a living document. Update after each feature implementation.**
