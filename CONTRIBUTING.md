# Contributing to Tracklay

Thank you for your interest in contributing! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Style](#code-style)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Project Structure](#project-structure)
- [Common Tasks](#common-tasks)

## Code of Conduct

This project follows a simple code of conduct:

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what is best for the community
- Show empathy towards others

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Cloudflare account (free tier works)
- Git
- Wrangler CLI (`npm install -g wrangler`)

### Setup Development Environment

1. Fork the repository on GitHub

2. Clone your fork:

```bash
git clone https://github.com/YOUR_USERNAME/tracklay.git
cd tracklay
```

3. Add upstream remote:

```bash
git remote add upstream https://github.com/ORIGINAL_OWNER/tracklay.git
```

4. Install dependencies:

```bash
npm install
```

5. Run setup (optional):

```bash
./scripts/setup.sh
```

6. Start development server:

```bash
npm run dev
```

## Development Workflow

### 1. Create a Feature Branch

Always create a new branch for your work:

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes

### 2. Make Changes

- Follow the [Code Style](#code-style) guidelines
- Write tests for new features
- Update documentation as needed
- Keep commits focused and atomic

### 3. Commit Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "Add feature: description of what you did"
```

Commit message format:

```
<type>: <subject>

<body (optional)>

<footer (optional)>
```

Types:

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

Examples:

```
feat: add support for TikTok pixel proxy

Add TikTok pixel proxying functionality with proper
header forwarding and caching strategy.

Closes #123
```

### 4. Stay Updated

Regularly sync with upstream:

```bash
git fetch upstream
git rebase upstream/main
```

### 5. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a Pull Request on GitHub.

## Code Style

### JavaScript/ES6

This project uses modern JavaScript (ES6+) with the following conventions:

#### General Rules

- Use ES6 modules (`import`/`export`)
- Use `const` by default, `let` when reassignment is needed
- Never use `var`
- Use arrow functions for callbacks
- Use template literals for string interpolation
- Use async/await instead of promise chains

#### Naming Conventions

- **Variables/Functions**: camelCase

  ```javascript
  const userName = 'John';
  function getUserData() {}
  ```

- **Constants**: UPPER_SNAKE_CASE

  ```javascript
  const MAX_RETRY_COUNT = 3;
  const API_BASE_URL = 'https://api.example.com';
  ```

- **Classes**: PascalCase

  ```javascript
  class UserManager {}
  class HttpClient {}
  ```

- **Files**: kebab-case
  ```
  user-manager.js
  http-client.js
  ```

#### Code Organization

**Single Responsibility Principle**

Each file/function should have one clear responsibility:

```javascript
// ✅ Good - Single responsibility
export function buildCORSHeaders(request) {
  // Only builds CORS headers
}

// ❌ Bad - Multiple responsibilities
export function buildHeadersAndProxy(request) {
  // Builds headers AND proxies request
}
```

**Modular Factory Pattern**

The project uses a factory architecture:

```
src/
├── cache/           # Caching logic
├── config/          # Configuration
├── core/            # Core functionality
├── factories/       # Object factories
├── handlers/        # Request handlers
├── headers/         # Header builders
├── middleware/      # Middleware
├── proxy/           # Proxy engine
├── routing/         # Routing logic
├── scheduled/       # Cron job handlers
├── services/        # Business logic services
└── utils/           # Utilities
```

Each module exports specific functions:

```javascript
// headers/cors.js
export function buildCORSHeaders(request) {
  // Implementation
}

// handlers/scripts.js
import { buildCORSHeaders } from '../headers/cors.js';

export function handleScriptRequest(request) {
  const headers = buildCORSHeaders(request);
  // Use headers
}
```

#### Comments and Documentation

**File Headers**

Every file should start with a header:

```javascript
// ============================================================
// MODULE NAME - BRIEF DESCRIPTION
// ============================================================
// RESPONSIBILITY:
// - What this module does
// - Main functions exported
// - Dependencies
```

**Function Documentation**

Use JSDoc for functions:

```javascript
/**
 * Build CORS headers for response
 * Auto-detects origin from request URL if ALLOWED_ORIGINS is empty
 * @param {Request} request - Cloudflare Worker Request object
 * @returns {Headers} Headers with CORS configured or empty if origin not allowed
 */
export function buildCORSHeaders(request) {
  // Implementation
}
```

**Inline Comments**

Use comments to explain "why", not "what":

```javascript
// ✅ Good - Explains reasoning
// Set max-age to 1 hour to balance freshness and performance
headers.set('Cache-Control', 'public, max-age=3600');

// ❌ Bad - States the obvious
// Set cache control header
headers.set('Cache-Control', 'public, max-age=3600');
```

#### Error Handling

Always handle errors gracefully:

```javascript
// ✅ Good
try {
  const response = await fetch(url);
  return response;
} catch (error) {
  logger.error('Fetch failed', { error: error.message, url });
  throw new Error('Failed to fetch resource');
}

// ❌ Bad
const response = await fetch(url); // Unhandled error
```

#### Formatting

- Indentation: 2 spaces (no tabs)
- Line length: 80-100 characters max
- Semicolons: Required
- Trailing commas: Use for multi-line arrays/objects
- Quotes: Single quotes for strings

Example:

```javascript
const config = {
  timeout: 10000,
  retries: 3,
  headers: {
    'Content-Type': 'application/json',
  },
};
```

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm run test:watch

# Coverage report
npm run test:coverage
```

### Writing Tests

Tests should be placed in the `tests/` directory:

```
tests/
├── unit/            # Unit tests
├── integration/     # Integration tests
├── e2e/            # End-to-end tests
├── fixtures/       # Test data
└── helpers/        # Test utilities
```

Example unit test:

```javascript
import { describe, it, expect } from 'vitest';
import { buildCORSHeaders } from '../src/headers/cors.js';

describe('buildCORSHeaders', () => {
  it('should build CORS headers for allowed origin', () => {
    const request = new Request('https://example.com', {
      headers: { Origin: 'https://example.com' },
    });

    const headers = buildCORSHeaders(request);

    expect(headers.get('Access-Control-Allow-Origin')).toBe('https://example.com');
    expect(headers.get('Access-Control-Allow-Credentials')).toBe('true');
  });

  it('should return empty headers for disallowed origin', () => {
    const request = new Request('https://example.com', {
      headers: { Origin: 'https://malicious.com' },
    });

    const headers = buildCORSHeaders(request);

    expect(headers.get('Access-Control-Allow-Origin')).toBeNull();
  });
});
```

### Test Coverage

Aim for:

- 80%+ code coverage
- All core functionality tested
- Edge cases covered
- Error scenarios tested

## Pull Request Process

### Before Submitting

1. **Update your branch** with latest main:

   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests**:

   ```bash
   npm test
   ```

3. **Check code style**:
   - Follow conventions above
   - Add comments where needed
   - Remove debug code

4. **Update documentation**:
   - Update README.md if needed
   - Update inline comments
   - Add JSDoc to new functions

### PR Title and Description

**Title Format:**

```
<type>: <brief description>
```

Examples:

- `feat: add TikTok pixel proxy support`
- `fix: correct CORS header for Safari`
- `docs: update deployment guide`

**Description Template:**

```markdown
## Description

Brief description of what this PR does.

## Changes

- Change 1
- Change 2
- Change 3

## Testing

How to test these changes:

1. Step 1
2. Step 2

## Screenshots (if applicable)

[Add screenshots]

## Checklist

- [ ] Tests pass
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
- [ ] Follows code style
```

### Review Process

1. Maintainer will review your PR
2. Address any feedback
3. Once approved, PR will be merged
4. Your contribution will be acknowledged!

### After Merge

1. Delete your feature branch:

   ```bash
   git branch -d feature/your-feature-name
   git push origin --delete feature/your-feature-name
   ```

2. Update your main branch:
   ```bash
   git checkout main
   git pull upstream main
   ```

## Project Structure

### Factory Architecture

The project uses a modular factory pattern:

```
worker.js (Entry Point)
    ↓
Router (Routes requests)
    ↓
Handlers (Process specific requests)
    ↓
Proxy Engine (Proxies to GTM/Google)
    ↓
Response (Returns to client)
```

### Module Responsibilities

| Module | Key Files | Responsibility |
|--------|-----------|----------------|
| `cache/` | `script-cache.js`, `dynamic-endpoints.js`, `response-factory.js`, `cache-invalidation.js` | Caching logic |
| `config/` | `index.js` | Centralized configuration management |
| `core/` | `logger.js`, `uuid.js`, `cache.js`, `fetch.js`, `rate-limiter.js`, `metrics.js` | Core services (logging, caching, rate limiting) |
| `factories/` | `headers-factory.js` | Object factories for headers |
| `handlers/` | `scripts.js`, `endpoints.js`, `events.js`, `dynamic-proxy.js`, `lib-proxy.js`, `health.js`, `base-proxy.js` | HTTP request handlers |
| `headers/` | `cors.js`, `security.js`, `rate-limit.js`, `proxy.js` | Header manipulation |
| `middleware/` | `error-handler.js` | Middleware functions |
| `proxy/` | `index.js`, `url-extractor.js`, `url-rewriter.js`, `response-builder.js`, `cache-strategy.js` | Proxy request handling |
| `routing/` | `router.js`, `mapping.js` | Route dispatch and path mapping |
| `scheduled/` | `update-scripts.js` | Cron job handlers |
| `services/` | `endpoint-recovery.js`, `event-validator.js`, `full-script-proxy.js`, `payload-builder.js`, `protocol-detector.js` | Business logic services |
| `utils/` | `constants.js`, `validation.js`, `response.js`, `request.js`, `headers.js`, `crypto.js`, `time.js`, `url.js`, `parsing.js`, `cache-control.js`, `query-obfuscation.js` | Utility functions |

## Common Tasks

### Adding a New Feature

1. **Identify the module** where feature belongs
2. **Create/update file** in appropriate directory
3. **Export functions** with clear names
4. **Write tests** for new functionality
5. **Update documentation**
6. **Submit PR**

Example: Adding Meta CAPI support

```bash
# 1. Create handler
touch src/handlers/meta-capi.js

# 2. Add tests
touch tests/unit/handlers/meta-capi.test.js

# 3. Update routing
# Edit src/routing/mapping.js

# 4. Document
# Update README.md
```

### Fixing a Bug

1. **Write a failing test** that reproduces the bug
2. **Fix the bug** in the code
3. **Verify test passes**
4. **Submit PR** with test and fix

### Adding Configuration

1. **Add option** to `src/config/index.js`
2. **Document** in README.md configuration section
3. **Add example** in `wrangler.toml` if needed
4. **Update setup script** if applicable

## Questions?

- Open an [issue](https://github.com/your-github-username/tracklay/issues)
- Start a [discussion](https://github.com/your-github-username/tracklay/discussions)
- Check existing documentation

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

Thank you for contributing! 🎉
