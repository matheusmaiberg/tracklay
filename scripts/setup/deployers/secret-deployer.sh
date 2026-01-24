#!/bin/bash

# ============================================================
# SECRET DEPLOYER - DEPLOY SECRETS TO CLOUDFLARE
# ============================================================
# RESPONSIBILITY:
# - Deploy UUID_SECRET to Cloudflare Workers
# - Provide manual deployment instructions
# ============================================================

# Source dependencies
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../core/logger.sh"
source "${SCRIPT_DIR}/../core/helpers.sh"

# ============================================================
# SECRET DEPLOYMENT
# ============================================================

deploy_uuid_secret() {
    local uuid_secret="$1"

    print_header "Setting Cloudflare Worker Secret"

    echo "The UUID_SECRET needs to be set as a Cloudflare Worker secret."
    echo ""
    print_info "Option 1: Set via wrangler (recommended)"
    echo "  Run: echo \"${uuid_secret}\" | wrangler secret put UUID_SECRET"
    echo ""
    print_info "Option 2: Set via Cloudflare Dashboard"
    echo "  1. Go to Workers > Your Worker > Settings > Variables"
    echo "  2. Add secret: UUID_SECRET = ${uuid_secret}"
    echo ""

    if confirm_action "Do you want to set the secret now via wrangler?" "y"; then
        echo "$uuid_secret" | wrangler secret put UUID_SECRET

        if [ $? -eq 0 ]; then
            print_success "Secret set successfully!"
            return 0
        else
            print_error "Failed to set secret via wrangler"
            print_warning "Please set the secret manually"
            display_manual_secret_instructions "$uuid_secret"
            return 1
        fi
    else
        print_warning "Secret not set via wrangler"
        display_manual_secret_instructions "$uuid_secret"
        return 0
    fi
}

display_manual_secret_instructions() {
    local uuid_secret="$1"

    print_info "Remember to set UUID_SECRET manually!"
    echo ""
    echo "UUID_SECRET = ${uuid_secret}"
    echo ""
}

# ============================================================
# DEPLOYMENT VERIFICATION
# ============================================================

verify_secret_deployment() {
    print_header "Verifying Secret Deployment"

    # Try to list secrets to verify deployment
    if wrangler secret list 2>/dev/null | grep -q "UUID_SECRET"; then
        print_success "UUID_SECRET is set in Cloudflare"
        return 0
    else
        print_warning "Could not verify UUID_SECRET deployment"
        print_info "This is normal if you haven't deployed the worker yet"
        return 0
    fi
}
