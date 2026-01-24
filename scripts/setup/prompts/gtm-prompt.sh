#!/bin/bash

# ============================================================
# GTM PROMPT - GTM SERVER-SIDE URL
# ============================================================
# RESPONSIBILITY:
# - Prompt for GTM Server-Side URL (optional)
# - Validate URL format
# ============================================================

# Source dependencies
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../core/logger.sh"
source "${SCRIPT_DIR}/../core/validators.sh"
source "${SCRIPT_DIR}/../core/helpers.sh"

# ============================================================
# GTM SERVER URL PROMPT
# ============================================================

prompt_gtm_server_url() {
    print_header "GTM Server-Side Configuration"

    echo "Enter your GTM Server-Side URL (e.g., https://gtm.yourstore.com)"
    echo "Or press ENTER to skip (you can configure later in src/config/index.js)"
    echo ""

    local gtm_url=""

    while true; do
        read -p "GTM Server URL: " gtm_url

        # Allow empty (optional)
        if [ -z "$gtm_url" ]; then
            print_warning "Skipped GTM Server URL configuration"
            print_info "Remember to update GTM_SERVER_URL in src/config/index.js"
            echo ""
            return 0
        fi

        # Validate URL format
        if validate_url "$gtm_url"; then
            echo "$gtm_url"
            return 0
        else
            print_error "Invalid URL format (must start with http:// or https://)"
            echo ""
        fi
    done
}
