#!/bin/bash

# ============================================================
# SECRET GENERATOR - UUID SECRET GENERATION
# ============================================================
# RESPONSIBILITY:
# - Generate cryptographically secure random secrets
# - Create UUID_SECRET for worker
# ============================================================

# Source logger for output
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../core/logger.sh"

# ============================================================
# SECRET GENERATION
# ============================================================

generate_uuid_secret() {
    local secret

    # Generate random 32-character secret using OpenSSL
    secret=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

    if [ -z "$secret" ] || [ ${#secret} -ne 32 ]; then
        print_error "Failed to generate UUID_SECRET"
        return 1
    fi

    echo "$secret"
    return 0
}

# ============================================================
# DISPLAY SECRET INFORMATION
# ============================================================

display_secret_info() {
    local secret="$1"

    print_success "Generated UUID_SECRET: ${secret}"
    echo ""
    print_info "This secret will be used for secure UUID generation."
    print_info "Keep it safe! You'll need to set it in Cloudflare."
}
