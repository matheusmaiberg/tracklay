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

## [2.0.0] - 2024-01-24

### Added

- **Auto-CORS Detection**: Automatically detects request origin, zero configuration needed
- **Complete Documentation**: Comprehensive README in English and Portuguese (pt-BR)
- **Automatic Setup Script**: One-command setup with `scripts/setup.sh`
- **GitHub Actions**: Automatic deployment workflow
- **Contributing Guide**: Detailed contribution guidelines
- **Factory Architecture**: Clean, modular, testable code structure
- **Production-Ready Config**: Complete `wrangler.toml` with all options
- **Developer Experience**: Enhanced package.json with useful scripts
- **Code Style Guide**: Prettier and ESLint configurations
- **Environment Example**: `.env.example` for easy local setup

### Changed

- Refactored from monolithic to factory architecture
- Improved code organization with single responsibility modules
- Enhanced error handling and logging
- Updated all comments to English
- Better separation of concerns (config, core, handlers, middleware)

### Features

- First-party proxy for GTM and tracking scripts
- Ad-blocker bypass with custom paths
- ITP/ETP resistance with first-party cookies
- Rate limiting per IP
- Secure UUID generation with SHA-256
- Configurable caching for static scripts
- Security headers (CORS, CSP, X-Frame-Options)
- Request validation and sanitization
- Edge computing on Cloudflare Workers
- Zero maintenance, auto-scaling

### Security

- SHA-256 UUID hashing with secret salt
- Rotating salt every 7 days (configurable)
- Environment variables for secrets
- IP-based rate limiting
- Request size limits
- Timeout protection

## [1.0.0] - 2024-01-01

### Added

- Initial release
- Basic proxy functionality
- GTM Server-Side support
- CORS handling
- Simple caching

---

## Version Guidelines

### Major Version (X.0.0)

- Breaking changes
- Major architectural changes
- API changes that require user action

### Minor Version (0.X.0)

- New features (backwards compatible)
- New tracking provider support
- New configuration options

### Patch Version (0.0.X)

- Bug fixes
- Performance improvements
- Documentation updates
- Minor refactoring

---

## Change Categories

- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security improvements

---

[Unreleased]: https://github.com/matheusmaiberg/tracklay/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/matheusmaiberg/tracklay/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/matheusmaiberg/tracklay/releases/tag/v1.0.0
