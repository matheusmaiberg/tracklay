# Tracklay - AI Agent Documentation

> **First-Party Tracking Proxy for Shopify Stores**
> 
> A Cloudflare Workers-based serverless proxy that serves Google Analytics 4 (GA4), Google Tag Manager (GTM), and Meta Pixel from your own domain to bypass Safari ITP, ad-blockers, and iOS tracking restrictions.

---

## Project Overview

Tracklay is a sophisticated tracking proxy solution designed for e-commerce stores. It addresses the data loss problem caused by modern browser privacy protections (60-70% of conversion data is typically lost). The solution achieves 95%+ ad-blocker bypass rates and extends cookie lifetime from 7 days to 2+ years on Safari.

### Key Features

- **UUID-Based Obfuscation**: Rotating, cryptographically secure UUID endpoints prevent blacklisting
- **Full Script Proxy**: Deep URL extraction and rewriting inside tracking scripts (30+ supported domains)
- **Three Deployment Modes**: Web (Client-Side), GTM Server-Side, GTM + GA4 Transport
- **Edge Computing**: 200+ Cloudflare edge locations with <50ms latency
- **Zero Maintenance**: Auto-updating scripts with SHA-256 change detection

---

## Technology Stack

| Category | Technology |
|----------|------------|
| **Runtime** | Cloudflare Workers (Node.js compatibility) |
| **Language** | JavaScript ES6+ Modules |
| **Deployment** | Wrangler CLI |
| **Testing** | Vitest |
| **Linting** | ESLint |
| **Formatting** | Prettier |
| **Cache** | Cloudflare Cache API |
| **Cron Jobs** | Cloudflare Cron Triggers |

### Compatibility

- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0
- **Wrangler**: ^4.60.0

---

## Project Structure

```
├── worker.js                    # Entry point - request handler & cron scheduler
├── wrangler.toml               # Cloudflare Workers configuration
├── package.json                # Dependencies and scripts
├── src/
│   ├── handlers/               # HTTP request handlers
│   │   ├── base-proxy.js       # Generic proxy base class
│   │   ├── dynamic-proxy.js    # /x/{uuid} dynamic endpoint handler
│   │   ├── endpoints.js        # Event forwarding to Google/Meta
│   │   ├── endpoints-info.js   # Authenticated endpoint info API
│   │   ├── events.js           # Server-side event proxy
│   │   ├── health.js           # Health check endpoint
│   │   ├── lib-proxy.js        # Library proxy handler
│   │   ├── options.js          # CORS preflight handler
│   │   └── scripts.js          # Script serving with Full Script Proxy
│   │
│   ├── services/               # Business logic services
│   │   ├── endpoint-recovery.js    # Recover expired UUID endpoints
│   │   ├── event-validator.js      # Validate incoming events
│   │   ├── full-script-proxy.js    # Script transformation pipeline
│   │   ├── payload-builder.js      # GA4/Meta payload construction
│   │   └── protocol-detector.js    # Detect Facebook vs Google protocols
│   │
│   ├── core/                   # Core infrastructure
│   │   ├── cache.js            # Cache operations
│   │   ├── fetch.js            # HTTP fetch with timeout
│   │   ├── logger.js           # Structured JSON logging
│   │   ├── metrics.js          # Request/response metrics
│   │   ├── rate-limiter.js     # IP + endpoint-based rate limiting
│   │   └── uuid.js             # UUID generation and rotation
│   │
│   ├── routing/                # Routing logic
│   │   ├── mapping.js          # UUID → endpoint mappings
│   │   └── router.js           # URL pattern matching (no regex)
│   │
│   ├── cache/                  # Cache implementations
│   │   ├── cache-invalidation.js
│   │   ├── dynamic-endpoints.js
│   │   ├── response-factory.js
│   │   └── script-cache.js
│   │
│   ├── proxy/                  # Proxy engine
│   │   ├── index.js
│   │   ├── cache-strategy.js
│   │   ├── response-builder.js
│   │   ├── url-extractor.js
│   │   └── url-rewriter.js
│   │
│   ├── headers/                # Header builders
│   │   ├── cors.js
│   │   ├── proxy.js
│   │   ├── rate-limit.js
│   │   └── security.js
│   │
│   ├── factories/              # Object factories
│   │   └── headers-factory.js  # Consolidated header building
│   │
│   ├── middleware/             # Middleware
│   │   └── error-handler.js    # Global error handling
│   │
│   ├── utils/                  # Utility functions
│   │   ├── cache-control.js
│   │   ├── constants.js        # HTTP status codes, headers
│   │   ├── crypto.js
│   │   ├── headers.js
│   │   ├── parsing.js
│   │   ├── query-obfuscation.js
│   │   ├── request.js
│   │   ├── response.js
│   │   ├── time.js
│   │   ├── url.js
│   │   └── validation.js
│   │
│   ├── config/                 # Configuration
│   │   └── index.js            # Environment-based config
│   │
│   └── scheduled/              # Cron jobs
│       └── update-scripts.js   # Background script cache refresh
│
├── tests/
│   ├── unit/                   # Unit tests
│   ├── integration/            # Integration tests
│   ├── e2e/                    # End-to-end tests
│   ├── fixtures/               # Test data
│   └── helpers/                # Test utilities
│
├── docs/                       # Documentation
│   ├── cloudflare/             # Cloudflare setup guides
│   ├── facebook/               # Meta Pixel integration
│   ├── google/                 # Google Analytics/GTM setup
│   ├── setup/                  # Setup guides
│   └── shopify/                # Shopify integration examples
│       └── examples/
│           └── advanced/
│               ├── custom-pixel/     # Custom Pixel with sandbox escape
│               └── dawn-theme/       # GTM script for Shopify sandbox
│
├── scripts/                    # Build/deployment scripts
├── theme/                      # Shopify theme files
└── .github/                    # GitHub templates
```

### Frontend Integration Scripts

Important frontend script locations for Shopify integration:

| Path | Purpose |
|------|---------|
| `docs/shopify/examples/advanced/custom-pixel/` | Custom Pixel implementation with **sandbox escape configuration** |
| `docs/shopify/examples/advanced/dawn-theme/` | Google Tag Manager script for **Shopify sandbox integration** |

---

## Build and Development Commands

### Setup

```bash
# Install dependencies
npm install

# Run interactive setup (generates UUIDs, configures secrets)
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### Development

```bash
# Start local development server
npm run dev

# Login to Cloudflare
npm run login

# Check Cloudflare account
npm run whoami
```

### Testing

```bash
# Run all tests
npm test

# Run in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test suites
npm run test:unit
npm run test:integration
```

### Deployment

```bash
# Deploy to production
npm run deploy

# Deploy to development environment
npm run deploy:dev

# Deploy to staging environment
npm run deploy:staging

# Get obfuscated URLs after deployment
npm run urls

# View logs
npm run tail
```

### Code Quality

```bash
# Format code
npm run format

# Lint code
npm run lint
```

### Secrets Management

```bash
# Set a secret in Cloudflare
npm run secret:put

# List secrets
npm run secret:list
```

---

## Code Style Guidelines

### General Rules

- **Modules**: Use ES6 modules (`import`/`export`)
- **Variables**: Use `const` by default, `let` when reassignment needed, never `var`
- **Functions**: Use arrow functions for callbacks
- **Strings**: Use template literals for interpolation
- **Async**: Use async/await instead of promise chains

### Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Variables/Functions | camelCase | `getUserData`, `userName` |
| Constants | UPPER_SNAKE_CASE | `MAX_RETRY_COUNT`, `API_BASE_URL` |
| Classes | PascalCase | `UserManager`, `HttpClient` |
| Files | kebab-case | `user-manager.js`, `http-client.js` |

### File Organization

Every file must start with a header:

```javascript
/**
 * @fileoverview Module Name - Brief description
 * @module path/to/module
 */

/**
 * Function description
 * @param {Request} request - Cloudflare Worker Request object
 * @param {Object} options - Configuration options
 * @returns {Promise<Response>} Response object
 */
export async function handlerName(request, options) {
  // Implementation
}
```

### Formatting

- **Indentation**: 2 spaces (no tabs)
- **Line length**: 100 characters max
- **Semicolons**: Required
- **Trailing commas**: Use for multi-line
- **Quotes**: Single quotes for strings

See `.prettierrc` for complete configuration.

### Error Handling

Always handle errors gracefully:

```javascript
// Good
try {
  const response = await fetch(url);
  return response;
} catch (error) {
  logger.error('Fetch failed', { error: error.message, url });
  throw new Error('Failed to fetch resource');
}
```

### Comments

- Explain "why", not "what"
- Use JSDoc for function documentation
- Keep comments concise and relevant

---

## Architecture Principles

### 1. Single Responsibility

Each file/function has one clear responsibility:

```javascript
// Good - Single responsibility
export function buildCORSHeaders(request) {
  // Only builds CORS headers
}

// Bad - Multiple responsibilities
export function buildHeadersAndProxy(request) {
  // Builds headers AND proxies request
}
```

### 2. No Regex in Router

The router uses string operations only (10-50x faster than regex):

```javascript
// Router configuration in src/routing/router.js
const routes = [
  { pattern: '/cdn/f/', handler: 'facebook_script' },
  { pattern: '/cdn/g/', handler: 'google_script' },
  { pattern: '/x/', handler: 'dynamic_proxy' },
  { pattern: '/e/', handler: 'endpoint' },
  { pattern: '/events', handler: 'events' },
  { pattern: '/health', handler: 'health' }
];
```

### 3. Stratified Rate Limiting

Each endpoint has independent counter to prevent cross-endpoint exhaustion.

### 4. Factory Pattern

Object creation is centralized in factories:

```javascript
// src/factories/headers-factory.js
export function buildFullHeaders(request, options) {
  const headers = new Headers();
  // Consolidate CORS, security, and rate-limit headers
  return headers;
}
```

---

## Request Lifecycle

```
1. Request Arrives
   └── worker.js receives request

2. Router.route() determines handler
   ├── /cdn/f/{uuid} → scripts.js (Facebook)
   ├── /cdn/g/{uuid} → scripts.js (Google/GTM)
   ├── /x/{uuid}     → dynamic-proxy.js
   ├── /e/{uuid}     → endpoints.js (events)
   ├── /events       → events.js (server-side)
   ├── /health       → health.js
   └── /endpoints    → endpoints-info.js (auth required)

3. Handler executes
   ├── Rate limit check (if applicable)
   ├── Cache lookup (if applicable)
   └── Process request

4. Response Built
   └── Headers Factory adds CORS + security headers

5. Response Returned
   └── With metrics + cache headers
```

---

## Configuration

### Environment Variables

Key configuration in `wrangler.toml`:

```toml
[vars]
# GTM Server-Side URL (optional)
GTM_SERVER_URL = "https://gtm.yourstore.com"

# Rate Limiting
RATE_LIMIT_REQUESTS = "100"
RATE_LIMIT_WINDOW = "60000"

# Cache TTL
CACHE_TTL = "3600"

# UUID Obfuscation IDs
OBFUSCATION_FB_UUID = "a8f3c2e1-4b9d-4f5a-8c3e-2d1f9b4a7c6e"
OBFUSCATION_GA_UUID = "b7e4d3f2-5c0e-4a6b-9d4f-3e2a0c5b8d7f"

# Feature Flags
FULL_SCRIPT_PROXY_ENABLED = "true"
DEBUG_HEADERS_ENABLED = "false"
```

### Secrets (Never commit to git)

Set via `wrangler secret put`:

- `OBFUSCATION_SECRET` - Hash generation secret
- `ENDPOINTS_API_TOKEN` - API authentication token

See `.dev.vars.example` for local development template.

---

## Testing Strategy

### Test Organization

```
tests/
├── unit/              # Isolated function tests
├── integration/       # Multi-module tests
├── e2e/              # End-to-end flow tests
├── fixtures/         # Test data
└── helpers/          # Test utilities
```

### Mocking Cloudflare APIs

```javascript
// Example: Mock Cloudflare Cache API
const mockCache = {
  match: vi.fn(),
  put: vi.fn(),
  delete: vi.fn()
};

global.caches = {
  default: mockCache
};
```

### Coverage Goals

- 80%+ code coverage
- All core functionality tested
- Edge cases covered
- Error scenarios tested

---

## Security Considerations

### Headers Applied to All Responses

```javascript
{
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'self'...",
  'Permissions-Policy': 'accelerometer=(), camera=()...'
}
```

### Rate Limiting

- 100 requests/minute per IP per endpoint (configurable)
- Returns: `X-RateLimit-Remaining`, `X-RateLimit-Reset`

### Input Validation

- Request size limits (1MB default, 10MB for scripts)
- Content-Type validation
- Parameter sanitization

### Authentication

- `/endpoints` endpoint requires secret token
- No authentication for tracking endpoints (public by design)

### Best Practices

1. **Never commit `.env` files**
2. **Always use Cloudflare Worker secrets for sensitive data**
3. **Rotate `OBFUSCATION_SECRET` regularly** (every 90 days)
4. **Use CORS auto-detection or explicitly list origins**
5. **Never use `*` for `Access-Control-Allow-Origin` in production**

---

## Deployment Process

1. **Configure** `wrangler.toml` with your settings
2. **Set secrets** via `wrangler secret put`
3. **Run tests**: `npm test`
4. **Deploy**: `npm run deploy`
5. **Verify**: `npm run urls` and test endpoints
6. **Configure custom domain** (optional) via Cloudflare Dashboard

### Cron Jobs

Scheduled tasks configured in `wrangler.toml`:

```toml
[triggers]
crons = ["0 */12 * * *"]  # Update script cache every 12 hours
```

---

## Common Development Tasks

### Adding a New Handler

1. Create file in `src/handlers/`
2. Add route in `src/routing/router.js`
3. Add tests in `tests/unit/handlers/`
4. Update documentation

### Adding a New Service

1. Create file in `src/services/`
2. Export functions with clear names
3. Write unit tests
4. Document in code

### Modifying Configuration

1. Add option to `src/config/index.js`
2. Document in README.md
3. Add example in `wrangler.toml`
4. Update setup script if applicable

---

## Performance Optimizations

11 built-in optimizations:

1. **Smart Placement**: Worker runs closest to backend
2. **URL Parsing Cache**: Memoizes regex patterns
3. **No Response Cloning**: Direct streaming
4. **Memoized Maps**: Caches object lookups
5. **Conditional Debug Headers**: Only if DEBUG=true
6. **SHA-256 Streaming**: Efficient hash verification
7. **Gzip Compression**: Automatic for scripts
8. **Stale-while-revalidate**: Non-blocking cache misses
9. **Early Returns**: Fast paths for common requests
10. **Minimal Dependencies**: Zero bloat
11. **Edge Caching**: 200+ locations worldwide

**Result**: 61-123ms faster than standard GTM implementations.

---

## Troubleshooting

### Scripts Not Loading

```bash
# Check deployment
wrangler whoami
npm run deploy

# Test health endpoint
curl https://your-worker.workers.dev/health
# Should return: {"status":"OK","version":"1.0.0"}

# Verify routes
npm run urls
```

### CORS Errors

Add to `wrangler.toml`:
```toml
[vars]
ALLOWED_ORIGINS = "https://yourstore.com,https://www.yourstore.com"
```

### Rate Limited

Increase limits in `wrangler.toml`:
```toml
[vars]
RATE_LIMIT_REQUESTS = "200"
```

---

## Documentation References

- **[README.md](README.md)** - User-facing documentation
- **[AGENTS.md](AGENTS.md)** - Developer architecture guide (this file)
- **[CONTRIBUTING.md](CONTRIBUTING.md)** - Contribution guidelines
- **[SECURITY.md](SECURITY.md)** - Security policy and best practices
- **[docs/setup/SETUP.md](docs/setup/SETUP.md)** - Detailed setup instructions

---

## Agent Instructions

### 1. Commit Guidelines

**Gradual Commits**: Make focused, single-purpose commits. Avoid mixing unrelated changes.

```bash
# ✅ Good - Single purpose
feat: add workerOrigin validation
docs: update security headers documentation
fix: correct import path for invalidateScriptCache

# ❌ Bad - Mixed purposes
update: fixes and docs and config changes
```

**Commit Categories**:
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code refactoring
- `security:` - Security fixes
- `test:` - Test changes
- `chore:` - Maintenance tasks

### 2. Starting New Chat Sessions

**Always read the latest commits** when starting a new chat:

```bash
# Read recent commit history
git log --oneline -10

# Check current branch and status
git status
```

This provides context about recent changes and current work in progress.

### 3. Report Storage

**Always save reports to `agents/docs/reports/`** (or appropriate subdirectories):

```
agents/
├── docs/
│   ├── reports/        # Analysis reports, audit results
│   ├── guides/         # How-to guides, procedures
│   ├── backups/        # Backup documentation
│   └── fallback/       # General fallback docs
├── templates/          # Reusable templates
└── scripts/           # Helper scripts
```

**Report Categories**:
- Security audits → `agents/docs/reports/security/`
- Performance analysis → `agents/docs/reports/performance/`
- Architecture decisions → `agents/docs/reports/architecture/`
- Bug investigations → `agents/docs/reports/investigations/`

**Fallback Rule**: If unsure where to save, use `agents/docs/fallback/` - never clutter the project root.

### 4. GitHub Files Support

**Support all GitHub file types** (beyond CI/CD):

| File | Purpose | Location |
|------|---------|----------|
| `.github/ISSUE_TEMPLATE/` | Issue templates | `.github/ISSUE_TEMPLATE/` |
| `.github/PULL_REQUEST_TEMPLATE.md` | PR template | `.github/` |
| `.github/FUNDING.yml` | Sponsorship info | `.github/` |
| `.github/CODEOWNERS` | Code ownership | `.github/` |
| `.github/SECURITY.md` | Security policy | `.github/` |
| `.github/CONTRIBUTING.md` | Contribution guide | `.github/` |
| `.github/dependabot.yml` | Dependency updates | `.github/` |
| `.github/labels.yml` | Label definitions | `.github/` |
| `.github/workflows/*.yml` | CI/CD workflows | `.github/workflows/` |
| `.github/actions/` | Custom actions | `.github/actions/` |

**When working with GitHub files**:
1. Validate YAML syntax
2. Follow GitHub's schema for each file type
3. Test workflows when possible
4. Document any custom actions

---

## License

MIT License - See [LICENSE](LICENSE) for details.
