#!/bin/bash

# ============================================================
# ACCOUNT PROMPT - CLOUDFLARE ACCOUNT ID
# ============================================================
# RESPONSIBILITY:
# - Get Cloudflare Account ID (auto-detect or manual input)
# - Validate account ID format
# ============================================================

# Source dependencies
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../core/logger.sh"
source "${SCRIPT_DIR}/../core/validators.sh"
source "${SCRIPT_DIR}/../core/helpers.sh"

# ============================================================
# ACCOUNT ID PROMPT
# ============================================================

prompt_account_id() {
    print_header "Getting Cloudflare Account ID"

    # Try to auto-detect account ID
    local account_id=$(get_cloudflare_account_id)

    if [ -z "$account_id" ]; then
        print_warning "Could not auto-detect Account ID"
        echo ""
        print_info "Get your Account ID from:"
        print_info "  1. Cloudflare Dashboard > Workers > Overview"
        print_info "  2. Or run: wrangler whoami"
        echo ""

        # Manual input
        while true; do
            read -p "Enter your Cloudflare Account ID: " account_id

            if validate_account_id "$account_id"; then
                break
            else
                print_error "Invalid Account ID format (expected 32 hex characters)"
            fi
        done
    fi

    print_success "Account ID: ${account_id}"
    echo "$account_id"
    return 0
}
