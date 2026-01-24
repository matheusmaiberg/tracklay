#!/bin/bash

# ============================================================
# VALIDATORS - PREREQUISITE CHECKING
# ============================================================
# RESPONSIBILITY:
# - Validate that required tools are installed
# - Check Cloudflare authentication status
# - Validate user input
# ============================================================

# Source logger for output
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/logger.sh"

# ============================================================
# PREREQUISITE VALIDATORS
# ============================================================

validate_wrangler_installed() {
    if ! command -v wrangler &> /dev/null; then
        print_error "Wrangler CLI not found!"
        print_info "Install with: npm install -g wrangler"
        return 1
    fi
    print_success "Wrangler CLI found"
    return 0
}

validate_cloudflare_login() {
    if ! wrangler whoami &> /dev/null; then
        print_warning "Not logged in to Cloudflare"
        print_info "Running: wrangler login"
        wrangler login

        # Verify login was successful
        if ! wrangler whoami &> /dev/null; then
            print_error "Failed to login to Cloudflare"
            return 1
        fi
    fi
    print_success "Logged in to Cloudflare"
    return 0
}

validate_openssl_installed() {
    if ! command -v openssl &> /dev/null; then
        print_error "OpenSSL not found!"
        print_info "Install OpenSSL to generate secure secrets"
        return 1
    fi
    return 0
}

# ============================================================
# INPUT VALIDATORS
# ============================================================

validate_url() {
    local url="$1"

    # Check if URL starts with http:// or https://
    if [[ ! "$url" =~ ^https?:// ]]; then
        return 1
    fi

    return 0
}

validate_account_id() {
    local account_id="$1"

    # Account ID should be 32 characters (hex)
    if [[ ! "$account_id" =~ ^[a-f0-9]{32}$ ]]; then
        return 1
    fi

    return 0
}

validate_not_empty() {
    local value="$1"

    if [ -z "$value" ]; then
        return 1
    fi

    return 0
}

# ============================================================
# RUN ALL VALIDATORS
# ============================================================

run_all_validators() {
    local all_valid=true

    validate_wrangler_installed || all_valid=false
    validate_openssl_installed || all_valid=false
    validate_cloudflare_login || all_valid=false

    if [ "$all_valid" = false ]; then
        print_error "Prerequisites check failed"
        return 1
    fi

    return 0
}
