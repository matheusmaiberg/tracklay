# Setup Factory Architecture

This directory contains the modular factory setup system for Tracklay.

## Structure

```
setup/
├── setup.sh              # Main orchestrator (entry point)
├── core/                 # Core utilities
│   ├── logger.sh        # Output formatting (print_* functions)
│   ├── validators.sh    # Prerequisite validation
│   └── helpers.sh       # Utility functions
├── generators/          # Data generators
│   ├── secret-generator.sh    # Generate UUID_SECRET
│   └── config-generator.sh    # Generate .setup-config file
├── prompts/             # User input prompts
│   ├── account-prompt.sh      # Cloudflare Account ID
│   ├── gtm-prompt.sh          # GTM Server URL
│   └── origins-prompt.sh      # Store domains (CORS)
├── updaters/            # File updaters
│   ├── wrangler-updater.sh    # Update wrangler.toml
│   └── config-updater.sh      # Update src/config/index.js
└── deployers/           # Deployment actions
    └── secret-deployer.sh     # Deploy secrets to Cloudflare
```

## Factory Pattern

Each module has a **single responsibility**:

- **core/**: Shared utilities used by all modules
- **generators/**: Create new data (secrets, config files)
- **prompts/**: Gather user input
- **updaters/**: Modify existing files
- **deployers/**: Deploy to external services

## Usage

### Run Setup

```bash
# From project root
./scripts/setup.sh

# Or directly
./scripts/setup/setup.sh
```

### Import Modules

All modules can be sourced independently:

```bash
#!/bin/bash

# Source a specific module
source scripts/setup/core/logger.sh

# Use its functions
print_success "Hello, World!"
```

## Module API

### core/logger.sh

```bash
print_header "Section Title"
print_success "Success message"
print_error "Error message"
print_warning "Warning message"
print_info "Info message"
print_step "Step description"
print_separator
```

### core/validators.sh

```bash
validate_wrangler_installed
validate_cloudflare_login
validate_openssl_installed
validate_url "https://example.com"
validate_account_id "abc123..."
validate_not_empty "value"
run_all_validators  # Run all prerequisite checks
```

### core/helpers.sh

```bash
get_project_root
ensure_gitignore_entry ".env"
trim_whitespace "  text  "
mask_secret "secret123456" 8
format_domains_array "domain1.com,domain2.com"
get_cloudflare_account_id
confirm_action "Continue?" "y"
wait_for_enter
```

### generators/secret-generator.sh

```bash
UUID_SECRET=$(generate_uuid_secret)
display_secret_info "$UUID_SECRET"
```

### generators/config-generator.sh

```bash
CONFIG_FILE=$(generate_config_file "$ACCOUNT_ID" "$UUID_SECRET" "$GTM_URL" "$DOMAINS")
display_config_summary "$ACCOUNT_ID" "$UUID_SECRET" "$GTM_URL" "$DOMAINS"
```

### prompts/account-prompt.sh

```bash
ACCOUNT_ID=$(prompt_account_id)
```

### prompts/gtm-prompt.sh

```bash
GTM_SERVER_URL=$(prompt_gtm_server_url)
```

### prompts/origins-prompt.sh

```bash
STORE_DOMAINS=$(prompt_store_domains)
```

### updaters/wrangler-updater.sh

```bash
update_wrangler_toml "$ACCOUNT_ID"
```

### updaters/config-updater.sh

```bash
update_gtm_server_url "$GTM_URL"
update_allowed_origins "$DOMAINS"
update_config_file "$GTM_URL" "$DOMAINS"
```

### deployers/secret-deployer.sh

```bash
deploy_uuid_secret "$UUID_SECRET"
verify_secret_deployment
```

## Setup Flow

The `setup.sh` orchestrator runs modules in this order:

1. **Welcome & Prerequisites** (validators)
2. **Generate UUID Secret** (secret-generator)
3. **Get Account ID** (account-prompt)
4. **Update wrangler.toml** (wrangler-updater)
5. **Get GTM Server URL** (gtm-prompt)
6. **Get Store Domains** (origins-prompt)
7. **Update config file** (config-updater)
8. **Deploy Secret** (secret-deployer)
9. **Generate Config** (config-generator)
10. **Display Summary** (config-generator)
11. **Show Next Steps** (logger)

## Adding New Modules

To add a new module:

1. **Create the file** in appropriate directory:
   ```bash
   touch scripts/setup/prompts/new-prompt.sh
   ```

2. **Add shebang and header**:
   ```bash
   #!/bin/bash

   # ============================================================
   # MODULE NAME - DESCRIPTION
   # ============================================================
   # RESPONSIBILITY:
   # - What this module does
   # ============================================================
   ```

3. **Source dependencies**:
   ```bash
   SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
   source "${SCRIPT_DIR}/../core/logger.sh"
   ```

4. **Implement functions**:
   ```bash
   my_function() {
       local param="$1"
       # Implementation
       echo "result"
       return 0
   }
   ```

5. **Make executable**:
   ```bash
   chmod +x scripts/setup/prompts/new-prompt.sh
   ```

6. **Import in setup.sh**:
   ```bash
   source "${SCRIPT_DIR}/prompts/new-prompt.sh"
   ```

7. **Call in main flow**:
   ```bash
   RESULT=$(my_function "param")
   ```

## Benefits of Factory Pattern

- **Modularity**: Each module has one responsibility
- **Reusability**: Modules can be used independently
- **Testability**: Easy to test individual modules
- **Maintainability**: Changes isolated to specific modules
- **Readability**: Clear structure, easy to navigate
- **Extensibility**: Simple to add new modules

## Error Handling

All modules return:
- `0` on success
- `1` on error

The main orchestrator uses `set -e` and `trap ERR` to catch errors.

## Conventions

- **File naming**: `kebab-case.sh`
- **Function naming**: `snake_case`
- **Variables**: `UPPER_CASE` for exports, `lower_case` for locals
- **Comments**: Explain "why", not "what"
- **Output**: Use logger functions, not raw echo

## Example: Creating a Custom Setup

```bash
#!/bin/bash

# Import only what you need
source scripts/setup/core/logger.sh
source scripts/setup/generators/secret-generator.sh

# Custom setup flow
print_header "Custom Setup"

UUID_SECRET=$(generate_uuid_secret)
print_success "Secret: $UUID_SECRET"

# Your custom logic here
```

---

**Made with ❤️ using Factory Pattern**
