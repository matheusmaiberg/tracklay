#!/bin/bash

# ============================================================
# ORIGINS PROMPT - CORS ALLOWED ORIGINS
# ============================================================
# RESPONSIBILITY:
# - Prompt for store domains (optional)
# - Support comma-separated list
# ============================================================

# Source dependencies
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../core/logger.sh"
source "${SCRIPT_DIR}/../core/helpers.sh"

# ============================================================
# STORE DOMAINS PROMPT
# ============================================================

prompt_store_domains() {
    print_header "Store Domain Configuration (Optional)"

    echo "Enter your store domain(s) for manual CORS configuration"
    echo "Or press ENTER to use auto-detection (recommended)"
    echo ""
    echo "Examples:"
    echo "  - https://yourstore.com"
    echo "  - https://yourstore.com,https://www.yourstore.com"
    echo ""

    read -p "Store domain(s) (comma-separated): " store_domains

    if [ -z "$store_domains" ]; then
        print_info "Using auto-detection (ALLOWED_ORIGINS: [])"
        echo ""
        return 0
    fi

    echo "$store_domains"
    return 0
}
