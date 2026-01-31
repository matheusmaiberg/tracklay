# Security Policy

## Supported Versions

We release patches for security vulnerabilities. Currently supported versions:

| Version | Supported          |
| ------- | ------------------ |
| 3.0.x   | :white_check_mark: |
| 2.0.x   | :x:                |
| 1.0.x   | :x:                |

## Reporting a Vulnerability

We take the security of Tracklay seriously. If you believe you have found a security vulnerability, please report it to us as described below.

### Please Do

- **Email us directly** at: security@yourdomain.com (replace with your email)
- **Provide detailed information** about the vulnerability:
  - Type of issue (e.g., CORS bypass, XSS, rate limit bypass)
  - Full paths of source file(s) related to the manifestation of the issue
  - Location of the affected source code (tag/branch/commit or direct URL)
  - Step-by-step instructions to reproduce the issue
  - Proof-of-concept or exploit code (if possible)
  - Impact of the issue, including how an attacker might exploit it

### Please Don't

- **DO NOT** open a public GitHub issue for security vulnerabilities
- **DO NOT** disclose the vulnerability publicly until we've had a chance to address it
- **DO NOT** attempt to access data that isn't yours or test on production systems

### What to Expect

1. **Acknowledgment**: We'll acknowledge your email within 48 hours
2. **Updates**: We'll keep you informed about our progress
3. **Fix**: We'll work on a fix and release a patch as soon as possible
4. **Credit**: We'll credit you in the security advisory (if you wish)

### Response Timeline

- **Critical vulnerabilities**: Patch within 7 days
- **High severity**: Patch within 14 days
- **Medium severity**: Patch within 30 days
- **Low severity**: Next regular release

## Security Best Practices

When deploying this worker, follow these best practices:

### 1. Environment Variables

- **NEVER** commit `.env` files to git
- **ALWAYS** use Cloudflare Worker secrets for sensitive data
- **ROTATE** `OBFUSCATION_SECRET` regularly (every 90 days recommended)

```bash
# Generate strong secret
openssl rand -base64 32 | tr -d "=+/" | cut -c1-32

# Set in Cloudflare
wrangler secret put OBFUSCATION_SECRET
```

### 2. CORS Configuration

- **USE** auto-detection (recommended): `ALLOWED_ORIGINS: []`
- **OR** explicitly list allowed origins: `ALLOWED_ORIGINS: ['https://yourstore.com']`
- **NEVER** use `*` for `Access-Control-Allow-Origin` in production

### 3. Rate Limiting

- **CONFIGURE** rate limits based on your traffic:
  ```toml
  RATE_LIMIT_REQUESTS = "100"
  RATE_LIMIT_WINDOW = "60000"
  ```
- **STRATIFIED LIMITING**: Limits are applied per **IP + endpoint**
  - Each endpoint (`/g/collect`, `/tr/{uuid}`, `/x/{uuid}`) has independent counters
  - Prevents one endpoint from consuming all quota
  - Provides fair resource distribution
- **MONITOR** rate limit hits in Cloudflare logs
- **ADJUST** limits if seeing legitimate traffic blocked

### 4. Request Validation

- **ENABLE** request size limits (default 1MB)
- **CONFIGURE** fetch timeout (default 10s)
- **VALIDATE** all inputs before processing

### Script Size Protection

- **10MB LIMIT** on script processing prevents ReDoS (Regular Expression Denial of Service) attacks
- Scripts exceeding this limit are rejected with 413 Payload Too Large
- Standard tracking scripts (GTM, gtag, fbevents) are typically <500KB
- This is a security hardening feature and should not be disabled

### 5. Logging

- **USE** appropriate log levels:
  - Production: `'info'` or `'warn'`
  - Development: `'debug'`
- **AVOID** logging sensitive data (IPs, user data, secrets)

### Log Sanitization

Sensitive data is automatically sanitized before logging:
- **Referrer URLs**: Reduced to hostname only (removes query parameters that may contain tokens)
- **API Tokens**: Truncated to first 4 characters (e.g., `tok_...abcd`)
- **Request Bodies**: Not logged for POST requests to prevent data leakage
- **Client IPs**: Not logged at standard log levels

This prevents accidental exposure of sensitive data in Cloudflare logs.

### 6. Updates

- **KEEP** dependencies updated:
  ```bash
  npm update
  npm audit fix
  ```
- **WATCH** this repository for security updates
- **SUBSCRIBE** to security advisories

### 7. Input Validation

4. **Container ID Validation**
   - Container IDs are validated against strict patterns:
     - GTM: `GTM-[A-Z0-9]{6}`
     - GA4: `G-[A-Z0-9]{10}`
     - Meta Pixel: Numeric only
   - This prevents DoS attacks via malformed container IDs

5. **workerOrigin Validation**
   - The `workerOrigin` parameter is validated to prevent unauthorized proxy usage
   - Only HTTPS origins are accepted
   - Must match configured allowed origins

### 8. Cloudflare Dashboard

- **ENABLE** two-factor authentication (2FA)
- **USE** API tokens with minimal permissions
- **REVIEW** worker logs regularly
- **SET UP** alerts for unusual activity

### 9. Custom Domain

- **USE** HTTPS only (enforced by Cloudflare)
- **ENABLE** HSTS (HTTP Strict Transport Security)
- **CONFIGURE** CAA records for your domain

### 10. Monitoring

- **SET UP** Cloudflare Analytics
- **MONITOR** request patterns
- **ALERT** on anomalies (sudden traffic spikes, error rate increases)

## Known Security Considerations

### 1. Client-Side Tracking

This proxy improves tracking accuracy but doesn't change the fact that tracking is client-side and can be manipulated. For sensitive conversions, use server-side tracking.

### 2. Rate Limiting

Current rate limiting is **IP + endpoint-based** (stratified) and stored in Cloudflare Cache API. Each endpoint has independent rate limit counters. For high-traffic sites, consider using Durable Objects or KV for distributed rate limiting.

### 3. UUID Generation

UUIDs are generated with SHA-256 and rotating salt. While secure for tracking purposes, don't use for cryptographic operations.

### 4. Request Proxying

The worker proxies requests to GTM Server. Ensure your GTM Server is properly secured and configured.

## Security Features

### Current

- [x] CORS validation
- [x] **Rate limiting (IP + endpoint-based, stratified)**
- [x] Request size limits (1MB default)
- [x] **Script size protection (10MB for ReDoS prevention)**
- [x] Timeout protection
- [x] Secure UUID generation (SHA-256, 128-bit)
- [x] **Security headers (CSP, X-Frame-Options: DENY, X-Content-Type-Options)**
- [x] **Log sanitization (referrer, token truncation)**
- [x] **Input validation (container IDs, tagId format)**
- [x] **workerOrigin validation**
- [x] Error handling (no internal exposure)

### Planned

- [ ] Advanced bot detection
- [ ] Distributed rate limiting (Durable Objects)
- [ ] Request fingerprinting
- [ ] Anomaly detection
- [ ] CAPTCHA integration for suspicious traffic

## Compliance

### GDPR

This worker processes:

- IP addresses (for rate limiting)
- User-Agent (forwarded to GTM)
- Cookies (forwarded to GTM)

**Your responsibilities**:

- Obtain user consent for tracking
- Provide privacy policy
- Honor opt-out requests
- Implement data retention policies

### CCPA

Similar to GDPR, ensure you:

- Disclose data collection
- Provide opt-out mechanisms
- Honor "Do Not Sell" requests

## Resources

- [Cloudflare Workers Security](https://developers.cloudflare.com/workers/platform/security/)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Cloudflare Security Center](https://www.cloudflare.com/security/)

## Contact

For security concerns, contact:

- **Email**: security@yourdomain.com
- **PGP Key**: [Your PGP key or link]

For general issues, use [GitHub Issues](https://github.com/your-github-username/tracklay/issues).

---

**Thank you for helping keep this project secure!**
