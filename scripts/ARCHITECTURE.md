# Scripts Architecture

## Overview

The setup system uses a **modular factory pattern** for maximum maintainability and reusability.

## Directory Structure

```
scripts/
├── setup.sh                    # Entry point wrapper
└── setup/                      # Factory modules
    ├── setup.sh               # Main orchestrator
    ├── README.md              # Module documentation
    ├── core/                  # Core utilities (shared)
    │   ├── logger.sh         # Output formatting
    │   ├── validators.sh     # Prerequisite checking
    │   └── helpers.sh        # Utility functions
    ├── generators/           # Data generators
    │   ├── secret-generator.sh
    │   └── config-generator.sh
    ├── prompts/              # User input
    │   ├── account-prompt.sh
    │   ├── gtm-prompt.sh
    │   └── origins-prompt.sh
    ├── updaters/             # File modifications
    │   ├── wrangler-updater.sh
    │   └── config-updater.sh
    └── deployers/            # External deployments
        └── secret-deployer.sh
```

## Factory Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    scripts/setup.sh                         │
│                   (Entry Point Wrapper)                     │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                 scripts/setup/setup.sh                      │
│                   (Main Orchestrator)                       │
│                                                             │
│  Imports all modules and coordinates setup flow:           │
│  1. Validate prerequisites                                 │
│  2. Generate secrets                                       │
│  3. Gather user input                                      │
│  4. Update configuration files                             │
│  5. Deploy to Cloudflare                                   │
│  6. Generate summary                                       │
└────────┬────────┬────────┬────────┬────────┬───────────────┘
         │        │        │        │        │
         ▼        ▼        ▼        ▼        ▼
    ┌────────┐┌──────┐┌────────┐┌────────┐┌──────────┐
    │  core/ ││ gen/ ││prompt/ ││update/ ││ deploy/  │
    └────────┘└──────┘└────────┘└────────┘└──────────┘
```

## Module Responsibilities

### core/ (Foundation)

**logger.sh**
- Colored output formatting
- Consistent messaging across all modules
- Functions: `print_header`, `print_success`, `print_error`, etc.

**validators.sh**
- Check prerequisites (wrangler, cloudflare login, openssl)
- Validate user input (URLs, account IDs)
- Return 0/1 for success/failure

**helpers.sh**
- Utility functions used across modules
- File operations, string manipulation
- Cloudflare API interactions
- User interaction helpers

### generators/ (Data Creation)

**secret-generator.sh**
- Generate cryptographically secure UUID_SECRET
- 32-character random string using OpenSSL

**config-generator.sh**
- Create `.setup-config` file
- Store all configuration for future reference
- Display configuration summary

### prompts/ (User Input)

**account-prompt.sh**
- Get Cloudflare Account ID
- Auto-detect from `wrangler whoami`
- Fallback to manual input with validation

**gtm-prompt.sh**
- Prompt for GTM Server-Side URL (optional)
- Validate URL format
- Allow skip

**origins-prompt.sh**
- Prompt for store domains (optional)
- Support comma-separated list
- Default to auto-detection

### updaters/ (File Modifications)

**wrangler-updater.sh**
- Update `wrangler.toml` with account_id
- Handle commented/uncommented formats
- Smart sed replacements

**config-updater.sh**
- Update `src/config/index.js` with GTM_SERVER_URL
- Update ALLOWED_ORIGINS array
- Format JavaScript properly

### deployers/ (External Actions)

**secret-deployer.sh**
- Deploy UUID_SECRET to Cloudflare Workers
- Interactive or automatic deployment
- Verify deployment success

## Benefits

### Single Responsibility
Each module does one thing and does it well.

### Reusability
Modules can be imported and used independently:

```bash
source scripts/setup/core/logger.sh
print_success "Task complete!"
```

### Testability
Easy to test individual modules in isolation.

### Maintainability
Changes are isolated to specific modules.

### Extensibility
Add new modules without touching existing code.

## Usage Examples

### Full Setup

```bash
./scripts/setup.sh
```

### Use Individual Modules

```bash
#!/bin/bash

# Import specific modules
source scripts/setup/core/logger.sh
source scripts/setup/generators/secret-generator.sh

# Use their functions
print_header "Generate Secret"
SECRET=$(generate_uuid_secret)
print_success "Generated: $SECRET"
```

### Custom Setup Flow

```bash
#!/bin/bash

# Import only what you need
source scripts/setup/core/logger.sh
source scripts/setup/core/validators.sh
source scripts/setup/prompts/account-prompt.sh

# Custom flow
if run_all_validators; then
    ACCOUNT=$(prompt_account_id)
    print_success "Account: $ACCOUNT"
fi
```

## Error Handling

All modules follow these conventions:

- Return `0` on success
- Return `1` on error
- Use `print_error` for error messages
- No side effects on error

The main orchestrator uses:

```bash
set -e                          # Exit on error
trap 'handle_error ${LINENO}' ERR  # Catch errors
```

## Code Conventions

- **File naming**: `kebab-case.sh`
- **Function naming**: `snake_case`
- **Variables**: `UPPER_CASE` for exports, `lower_case` for locals
- **All scripts**: Executable (`chmod +x`)
- **Comments**: Explain "why", not "what"
- **Headers**: Describe responsibility

## Adding New Modules

1. Create file in appropriate directory
2. Add shebang and header with responsibility
3. Source dependencies from `../core/`
4. Implement functions with clear return codes
5. Make executable
6. Import in `setup/setup.sh`
7. Call in main flow

Example:

```bash
#!/bin/bash

# ============================================================
# NEW MODULE - DESCRIPTION
# ============================================================
# RESPONSIBILITY:
# - What this module does
# ============================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../core/logger.sh"

my_function() {
    local param="$1"
    # Implementation
    print_success "Done!"
    return 0
}
```

## Comparison: Before vs After

### Before (Monolithic)

```
scripts/
└── setup.sh (325 lines, everything in one file)
```

**Problems:**
- Hard to test
- Hard to maintain
- Hard to reuse code
- Hard to extend

### After (Factory)

```
scripts/
├── setup.sh (15 lines, wrapper)
└── setup/
    ├── setup.sh (200 lines, orchestration)
    ├── core/ (3 modules, ~200 lines)
    ├── generators/ (2 modules, ~100 lines)
    ├── prompts/ (3 modules, ~150 lines)
    ├── updaters/ (2 modules, ~100 lines)
    └── deployers/ (1 module, ~80 lines)
```

**Benefits:**
- ✓ Easy to test (12 independent modules)
- ✓ Easy to maintain (single responsibility)
- ✓ Easy to reuse (import what you need)
- ✓ Easy to extend (add new modules)

## Future Extensions

Potential new modules:

- `validators/domain-validator.sh` - Verify domain ownership
- `deployers/route-deployer.sh` - Auto-configure Cloudflare routes
- `generators/theme-generator.sh` - Generate Shopify theme snippets
- `testers/health-tester.sh` - Test worker health endpoint
- `prompts/feature-prompt.sh` - Prompt for optional features

---

**Architecture Pattern**: Factory
**Total Modules**: 12
**Lines of Code**: ~830 lines (modularized)
**Maintainability**: ⭐⭐⭐⭐⭐
