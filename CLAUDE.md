# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Tracklay** is a first-party tracking proxy for Shopify stores built on Cloudflare Workers. It serves Google Analytics 4 (GA4), Google Tag Manager (GTM), and Meta Pixel from your domain while bypassing Safari ITP, ad-blockers, iOS tracking restrictions, and Firefox ETP. The project uses UUID-based obfuscation for 90%+ ad-blocker bypass rates.

## Quick Setup & Commands

### Environment Setup
```bash
npm install                 # Install dependencies
./scripts/setup.sh         # Interactive setup (generates secrets, configures wrangler.toml)
npm run dev               # Start local dev server (wrangler dev)
```

### Development & Deployment
```bash
npm run deploy            # Deploy to production
npm run deploy:dev        # Deploy to development environment
npm run deploy:staging    # Deploy to staging environment
npm run tail             # View live logs from production
npm run lint             # Run ESLint
npm run format           # Run Prettier
npm run urls             # Get configured endpoint URLs
```

### Testing (Test structure exists but tests are not yet written)
```bash
npm test                 # Run all tests (vitest)
npm run test:watch      # Watch mode
npm run test:coverage   # Coverage report
npm run test:unit       # Unit tests only
npm run test:integration # Integration tests only
```

### Secrets Management
```bash
wrangler login                          # Authenticate with Cloudflare
wrangler whoami                         # Verify authentication
wrangler secret put OBFUSCATION_SECRET  # Set obfuscation hash secret
wrangler secret put ENDPOINTS_API_TOKEN # Set API token for /endpoints
wrangler secret list                    # List deployed secrets
```

## Project Structure

```
src/
├── config/          # Centralized config (initConfig, CONFIG object)
│                    # Parses env vars from wrangler.toml and .dev.vars
├── core/            # Core services
│   ├── logger.js    # Logging (debug/info/warn/error levels)
│   ├── rate-limiter.js  # IP-based rate limiting with per-client tracking
│   ├── uuid.js      # UUID rotation and secret management
│   ├── cache.js     # Cache operations (get/set/clear)
│   └── fetch.js     # HTTP fetch wrapper with timeout handling
├── routing/
│   ├── router.js    # Route dispatcher (OPTIONS, /health, /endpoints, script/endpoint paths)
│   └── mapping.js   # Path-to-handler mapping (getScriptMap, getEndpointMap)
├── handlers/        # Request handlers for specific routes
│   ├── scripts.js   # Serve cached tracking scripts (gtag.js, fbevents.js)
│   ├── endpoints.js # Forward tracking events to GTM/Meta
│   ├── events.js    # Server-side event forwarding (/cdn/events POST handler)
│   ├── health.js    # Health check endpoint
│   ├── endpoints-info.js  # Authenticated endpoint info (returns current UUIDs)
│   ├── dynamic-proxy.js   # Handle /x/{uuid} dynamic endpoint requests
│   ├── lib-proxy.js       # Proxy /lib/* requests
│   └── options.js   # CORS OPTIONS requests
├── proxy/
│   ├── index.js          # Main proxy handler with script cache integration
│   ├── cache-strategy.js # Cache key generation and TTL logic
│   ├── response-builder.js # Build proxy responses with headers
│   └── url-extractor.js  # Extract and rewrite URLs in scripts (Full Script Proxy)
├── middleware/
│   ├── error-handler.js  # Global error handling
│   └── metrics.js        # Request/response metrics recording
├── cache/
│   ├── script-cache.js   # Fetch, process, and cache scripts with Full Script Proxy
│   ├── dynamic-endpoints.js # Create and resolve /x/{uuid} dynamic endpoints
│   └── response-factory.js  # Build response objects with proper headers
├── headers/
│   ├── rate-limit.js     # Add rate limit headers to responses
│   ├── cors.js           # CORS header handling
│   ├── proxy.js          # Build headers for proxy requests
│   └── security.js       # Security headers
├── utils/
│   ├── constants.js      # HTTP status codes, header names, routing constants
│   ├── validation.js     # Input validation (parsePositiveInt, etc)
│   ├── response.js       # Response builders (errorResponse, jsonResponse)
│   ├── request.js        # Request utilities
│   ├── headers.js        # Header manipulation
│   ├── crypto.js         # Crypto utilities (SHA-256)
│   ├── time.js           # Time utilities
│   └── query-obfuscation.js # Container alias obfuscation
└── scheduled/
    └── update-scripts.js # Cron job handler (runs every 12h to update script cache)

worker.js                  # Entry point for Cloudflare Workers (fetch & scheduled handlers)
wrangler.toml             # Cloudflare Workers configuration
.dev.vars                 # Local development secrets
.env                      # Environment variables for scripts
```

## High-Level Architecture

### Request Flow
```
1. worker.js receives request
2. Router matches path to handler
3. Handler processes (either serve cached script or proxy endpoint)
4. Response includes rate limit headers and security headers
5. Metrics recorded before returning response
```

### Ultra-Aggressive Obfuscation Mode (v1.0.0)
The router uses **same path for both scripts and endpoints**, differentiated by:
- **Facebook**: HTTP method (POST = tracking endpoint, GET = script)
- **Google**: Query parameters (v=2/tid=/_p= = endpoint, c=/id= = script)

This prevents ad-blockers from maintaining permanent blacklists of predictable paths.

### Full Script Proxy (v1.0.0)
When `FULL_SCRIPT_PROXY_ENABLED=true`, the worker performs deep URL extraction and replacement:

```
1. Download script from CDN (Google/Facebook)
2. Extract ALL URLs using regex patterns (30+ trackable domains)
3. For each trackable URL:
   - Generate unique UUID
   - Create /x/{uuid} → original URL mapping in cache
   - Replace URL in script content with /x/{uuid}
4. Cache processed script with SHA-256 hash for change detection
5. Client requests /x/{uuid} → Worker resolves → Proxies to original destination
```

**Container-Specific Caching**: GTM/gtag scripts with `?id=GTM-XXX` are cached per-container:
- Cache key: `gtm:GTM-MJ7DW8H` instead of generic `gtm`
- On-demand fetch: First request fetches and caches, subsequent requests use cache
- Shorter TTL: 12h for on-demand, 24h for scheduled, 7d stale fallback

**Dynamic Endpoints** (`/x/{uuid}`):
- UUID → Target URL mappings stored in Cache API
- 7-day TTL with automatic expiration
- DoS protection via container ID validation regex

### Key Services

**Router** ([src/routing/router.js](src/routing/router.js))
- Matches requests to appropriate handlers
- Supports OPTIONS, /health, /endpoints endpoints
- Auto-detects script vs endpoint requests based on method/query params

**Config** ([src/config/index.js](src/config/index.js))
- Centralized configuration management
- Parses environment variables from wrangler.toml
- Provides smart defaults for zero-config deployment
- Key configs: GTM_SERVER_URL, RATE_LIMIT_*, FETCH_TIMEOUT, CACHE_TTL, UUID settings

**Rate Limiter** ([src/core/rate-limiter.js](src/core/rate-limiter.js))
- IP-based rate limiting (per-client state)
- Configurable requests-per-window
- Returns remaining quota and reset time

**UUID Manager** ([src/core/uuid.js](src/core/uuid.js))
- Manages endpoint UUIDs for obfuscation
- Supports fixed or rotating UUIDs (time-based deterministic)
- Validates OBFUSCATION_FB_UUID and OBFUSCATION_GA_UUID

**Script Cache** ([src/cache/script-cache.js](src/cache/script-cache.js))
- Fetches scripts from CDN and processes through Full Script Proxy pipeline
- SHA-256 change detection (refreshes on script changes)
- Container-specific caching for GTM/gtag (`gtm:GTM-XXX` keys)
- On-demand fetch for first requests, cache for subsequent
- Cron-triggered auto-update every 12 hours

**URL Extractor** ([src/proxy/url-extractor.js](src/proxy/url-extractor.js))
- Extracts all URLs from script content using regex
- Filters trackable domains (30+ supported)
- Rewrites URLs with proxied `/x/{uuid}` paths
- Sorts by length to prevent partial match issues

**Dynamic Endpoints** ([src/cache/dynamic-endpoints.js](src/cache/dynamic-endpoints.js))
- Creates UUID → Target URL mappings
- Resolves `/x/{uuid}` requests to original destinations
- SHA-256 indexed URL deduplication
- 7-day TTL for endpoint mappings

**Proxy Handler** ([src/proxy/index.js](src/proxy/index.js))
- Main proxy request handler with script cache integration
- On-demand fetch for container-specific scripts
- Handles timeout and error scenarios

### Configuration Management

Environment variables are loaded in this order of precedence:
1. `.dev.vars` (local development - git-ignored)
2. Wrangler secrets (`wrangler secret put`)
3. `wrangler.toml` vars section
4. Code defaults

Key variables in wrangler.toml:
- `GTM_SERVER_URL` - GTM Server-Side endpoint (optional)
- `ALLOWED_ORIGINS` - CORS origins (auto-detected if empty)
- `RATE_LIMIT_REQUESTS` - Max requests per IP
- `RATE_LIMIT_WINDOW` - Rate limit window in ms
- `FETCH_TIMEOUT` - Upstream request timeout
- `CACHE_TTL` - Script cache lifetime
- `OBFUSCATION_FB_UUID` & `OBFUSCATION_GA_UUID` - UUID for path obfuscation
- `UUID_ROTATION_ENABLED` - Enable time-based UUID rotation
- `DEBUG_HEADERS_ENABLED` - Expose debug headers (dev only)
- `FULL_SCRIPT_PROXY_ENABLED` - Rewrite URLs in scripts (default: true)

## Important Architectural Decisions

1. **Ultra-Aggressive Obfuscation**: Scripts and tracking endpoints share the same paths, differentiated only by HTTP method or query parameters. This makes it impossible for ad-blockers to maintain effective blacklists.

2. **Full Script Proxy**: All URLs inside tracking scripts are extracted and replaced with proxied `/x/{uuid}` endpoints. This ensures 100% first-party requests even for dynamically loaded resources.

3. **Container-Specific Caching**: GTM/gtag scripts are cached per-container (e.g., `gtm:GTM-MJ7DW8H`) enabling multi-container support and on-demand fetching.

4. **Stateless Design**: All state is stored in Cloudflare Cache API or request context. No in-memory state persists between requests.

5. **No Response Cloning**: Responses are built once and returned directly to avoid performance overhead.

6. **Smart Script Caching**: SHA-256 comparison detects script changes; automatic refresh every 12 hours via Cloudflare Cron triggers.

7. **Server-Side Event Forwarding**: Events can be forwarded from `/cdn/events` endpoint to GTM Server-Side, enabling 95%+ ad-blocker bypass by avoiding client-side tracking code.

8. **DoS Protection**: Container IDs are validated against regex pattern before creating cache entries, preventing cache pollution attacks.

## Development Workflow

1. **Make code changes** in `src/`
2. **Test locally** with `npm run dev` (starts wrangler dev server on localhost:8787)
3. **Lint and format**:
   ```bash
   npm run lint    # Check for issues
   npm run format  # Auto-fix formatting
   ```
4. **Test** (once tests are written):
   ```bash
   npm run test:watch
   ```
5. **Deploy** to appropriate environment:
   ```bash
   npm run deploy         # Production
   npm run deploy:dev     # Development
   npm run deploy:staging # Staging
   ```

## Key Files to Know

- [worker.js](worker.js) - Cloudflare Workers entry point, fetch and scheduled handlers
- [wrangler.toml](wrangler.toml) - All Cloudflare configuration
- [src/config/index.js](src/config/index.js) - Configuration management
- [src/routing/router.js](src/routing/router.js) - Route dispatcher logic
- [src/core/uuid.js](src/core/uuid.js) - UUID obfuscation logic
- [src/cache/script-cache.js](src/cache/script-cache.js) - Full Script Proxy processing
- [src/cache/dynamic-endpoints.js](src/cache/dynamic-endpoints.js) - Dynamic `/x/{uuid}` endpoints
- [src/proxy/url-extractor.js](src/proxy/url-extractor.js) - URL extraction and rewriting
- [README.md](README.md) - Complete user documentation
- [CONTRIBUTING.md](CONTRIBUTING.md) - Development guidelines

## Important Notes

### Testing
Test directories exist but are currently empty (no tests written yet). When adding tests, use Vitest with the existing directory structure:
- `tests/unit/` for unit tests
- `tests/integration/` for integration tests
- `tests/e2e/` for end-to-end tests

### Configuration
Never commit `.env`, `.dev.vars`, or secrets to git. All secrets should be managed via:
- `wrangler secret put` for production secrets
- `.dev.vars` for local development (git-ignored)

### Deployment
Always deploy to `--env development` or `--env staging` first to test changes before pushing to production. Use `npm run tail` to monitor live production logs.

### Scripts
Setup scripts follow a factory pattern in [scripts/ARCHITECTURE.md](scripts/ARCHITECTURE.md). Each module has a single responsibility and can be imported independently.
