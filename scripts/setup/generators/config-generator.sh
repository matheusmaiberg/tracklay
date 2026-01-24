#!/bin/bash

# ============================================================
# CONFIG GENERATOR - CONFIGURATION FILE CREATION
# ============================================================
# RESPONSIBILITY:
# - Generate .setup-config file with all settings
# - Store configuration for future reference
# ============================================================

# Source dependencies
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../core/logger.sh"
source "${SCRIPT_DIR}/../core/helpers.sh"

# ============================================================
# CONFIG FILE GENERATION
# ============================================================

generate_config_file() {
    local account_id="$1"
    local uuid_secret="$2"
    local gtm_server_url="$3"
    local store_domains="$4"

    local project_root=$(get_project_root)
    local config_file="${project_root}/.setup-config"

    cat > "$config_file" << EOF
# ============================================================
# TRACKLAY - SETUP CONFIGURATION
# ============================================================
# Generated: $(date)
# DO NOT COMMIT THIS FILE TO GIT!
#
# This file contains sensitive information.
# .setup-config is already in .gitignore

# ============================================================
# CLOUDFLARE CONFIGURATION
# ============================================================

# Cloudflare Account ID
CLOUDFLARE_ACCOUNT_ID="${account_id}"

# UUID Secret (set in Cloudflare Worker as secret)
UUID_SECRET="${uuid_secret}"

# ============================================================
# GTM CONFIGURATION
# ============================================================

# GTM Server-Side URL (optional)
GTM_SERVER_URL="${gtm_server_url}"

# ============================================================
# CORS CONFIGURATION
# ============================================================

# Store Domains (comma-separated)
STORE_DOMAINS="${store_domains}"

# ============================================================
# NEXT STEPS
# ============================================================
# 1. Deploy worker: npm run deploy
# 2. Configure routes in Cloudflare Dashboard:
#    - yourstore.com/cdn/*
#    - yourstore.com/assets/*
#    - yourstore.com/static/*
# 3. Update Shopify theme with proxy URLs
# 4. Test: curl https://your-worker.workers.dev/health
#
# For more information, see README.md
# ============================================================
EOF

    if [ $? -eq 0 ]; then
        print_success "Configuration saved to .setup-config"
        ensure_gitignore_entry ".setup-config"
        echo "$config_file"
        return 0
    else
        print_error "Failed to save configuration"
        return 1
    fi
}

# ============================================================
# DISPLAY CONFIG SUMMARY
# ============================================================

display_config_summary() {
    local account_id="$1"
    local uuid_secret="$2"
    local gtm_server_url="$3"
    local store_domains="$4"

    echo ""
    echo "Configuration Summary:"
    print_separator
    echo "  Account ID:     ${account_id}"
    echo "  UUID Secret:    $(mask_secret "$uuid_secret" 8) (hidden)"

    if [ -n "$gtm_server_url" ]; then
        echo "  GTM Server:     ${gtm_server_url}"
    fi

    if [ -n "$store_domains" ]; then
        echo "  Store Domains:  ${store_domains}"
    fi

    print_separator
    echo ""
}
