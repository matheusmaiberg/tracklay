---
name: Bug Report
about: Report a bug or issue with the proxy
title: '[BUG] '
labels: bug
assignees: ''
---

## Bug Description

A clear and concise description of what the bug is.

## Steps to Reproduce

1. Go to '...'
2. Configure '...'
3. Deploy with '...'
4. See error

## Expected Behavior

A clear description of what you expected to happen.

## Actual Behavior

What actually happened instead.

## Environment

- **Worker Version**: [e.g., 2.0.0]
- **Cloudflare Plan**: [Free/Pro/Business/Enterprise]
- **Browser**: [e.g., Chrome 120, Safari 17]
- **GTM Server**: [Yes/No]
- **Store Platform**: [Shopify/Other]

## Configuration

```javascript
// Relevant parts of src/config/index.js (remove sensitive data)
GTM_SERVER_URL: 'https://gtm.example.com',
ALLOWED_ORIGINS: ['https://example.com'],
// ...
```

## Logs

```
Paste relevant worker logs here
(from Cloudflare Dashboard > Workers > Logs)
```

## Screenshots

If applicable, add screenshots to help explain your problem.

## Additional Context

Add any other context about the problem here.

## Possible Solution

If you have ideas on how to fix this, please share.
