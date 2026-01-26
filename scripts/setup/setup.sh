#!/bin/bash

# ============================================================
# TRACKLAY - SETUP ORCHESTRATOR
# ============================================================
# RESPONSIBILITY:
# - Orchestrate the entire setup process
# - Import and execute factory modules in correct order
# - Handle errors and provide user feedback
#
# ARCHITECTURE:
# This is the entry point that coordinates all setup modules:
# - core/       : logger, validators, helpers
# - generators/ : secret-generator, config-generator
# - prompts/    : account-prompt, gtm-prompt, origins-prompt
# - updaters/   : wrangler-updater, config-updater
# - deployers/  : secret-deployer
#
# Usage: ./scripts/setup/setup.sh
# ============================================================

set -e  # Exit on error

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ============================================================
# IMPORT FACTORY MODULES
# ============================================================

# Core modules
source "${SCRIPT_DIR}/core/logger.sh"
source "${SCRIPT_DIR}/core/validators.sh"
source "${SCRIPT_DIR}/core/helpers.sh"

# Generators
source "${SCRIPT_DIR}/generators/secret-generator.sh"
source "${SCRIPT_DIR}/generators/config-generator.sh"

# Prompts
source "${SCRIPT_DIR}/prompts/account-prompt.sh"
source "${SCRIPT_DIR}/prompts/gtm-prompt.sh"
source "${SCRIPT_DIR}/prompts/origins-prompt.sh"

# Updaters
source "${SCRIPT_DIR}/updaters/wrangler-updater.sh"
source "${SCRIPT_DIR}/updaters/config-updater.sh"

# Deployers
source "${SCRIPT_DIR}/deployers/secret-deployer.sh"

# ============================================================
# MAIN SETUP FLOW
# ============================================================

main() {
    # ============================================================
    # 1. WELCOME
    # ============================================================

    clear
    print_header "TRACKLAY - SETUP"

    echo "This script will help you set up the Cloudflare Worker."
    echo ""
    echo "You'll need:"
    echo "  ✓ Cloudflare account"
    echo "  ✓ Wrangler CLI installed (npm install -g wrangler)"
    echo "  ✓ GTM Server-Side URL (optional)"
    echo ""
    wait_for_enter

    # ============================================================
    # 2. VALIDATE PREREQUISITES
    # ============================================================

    print_header "Checking Prerequisites"

    if ! run_all_validators; then
        print_error "Setup failed: Prerequisites not met"
        exit 1
    fi

    # ============================================================
    # 3. GENERATE UUID SECRET
    # ============================================================

    print_header "Generating UUID Secret"

    UUID_SECRET=$(generate_uuid_secret)
    if [ $? -ne 0 ]; then
        print_error "Setup failed: Could not generate UUID secret"
        exit 1
    fi

    display_secret_info "$UUID_SECRET"

    # ============================================================
    # 4. GET CLOUDFLARE ACCOUNT ID
    # ============================================================

    ACCOUNT_ID=$(prompt_account_id)
    if [ $? -ne 0 ]; then
        print_error "Setup failed: Could not get account ID"
        exit 1
    fi

    # ============================================================
    # 5. UPDATE WRANGLER.TOML
    # ============================================================

    update_wrangler_toml "$ACCOUNT_ID"
    if [ $? -ne 0 ]; then
        print_error "Setup failed: Could not update wrangler.toml"
        exit 1
    fi

    # ============================================================
    # 6. PROMPT FOR GTM SERVER URL
    # ============================================================

    GTM_SERVER_URL=$(prompt_gtm_server_url)

    # ============================================================
    # 7. PROMPT FOR STORE DOMAINS
    # ============================================================

    STORE_DOMAINS=$(prompt_store_domains)

    # ============================================================
    # 8. UPDATE CONFIG FILE
    # ============================================================

    update_config_file "$GTM_SERVER_URL" "$STORE_DOMAINS"

    # ============================================================
    # 9. DEPLOY UUID SECRET
    # ============================================================

    deploy_uuid_secret "$UUID_SECRET"

    # ============================================================
    # 10. GENERATE CONFIG FILE
    # ============================================================

    print_header "Saving Configuration"

    CONFIG_FILE=$(generate_config_file "$ACCOUNT_ID" "$UUID_SECRET" "$GTM_SERVER_URL" "$STORE_DOMAINS")

    # ============================================================
    # 11. DISPLAY SUMMARY
    # ============================================================

    print_header "Setup Complete! 🎉"

    display_config_summary "$ACCOUNT_ID" "$UUID_SECRET" "$GTM_SERVER_URL" "$STORE_DOMAINS"

    # ============================================================
    # 12. NEXT STEPS
    # ============================================================

    print_header "Next Steps"

    echo "1. ${GREEN}Deploy Worker${NC}"
    echo "   npm run deploy"
    echo ""

    echo "2. ${GREEN}Configure Routes${NC} (Cloudflare Dashboard)"
    echo "   Workers > Your Worker > Settings > Domains & Routes"
    echo "   Add routes:"
    echo "     - yourstore.com/cdn/*"
    echo "     - yourstore.com/assets/*"
    echo "     - yourstore.com/static/*"
    echo ""

    echo "3. ${GREEN}Update Shopify Theme${NC}"
    echo "   Replace GTM/Analytics URLs with obfuscated UUID-based proxy URLs"
    echo "   Example:"
    echo "     Before: https://www.googletagmanager.com/gtag/js?id=G-XXXXX"
    echo "     After:  https://yourstore.com/cdn/g/YOUR-UUID?id=G-XXXXX"
    echo "   Note: Use the UUIDs from step 1 (run 'node scripts/get-urls.js' to see them)"
    echo ""

    echo "4. ${GREEN}Test Deployment${NC}"
    echo "   curl https://your-worker.workers.dev/health"
    echo ""

    print_success "Setup completed successfully!"
    print_info "Configuration saved in: ${CONFIG_FILE}"
    print_warning "Keep .setup-config safe and DO NOT commit to git!"

    echo ""
    echo "For more information, see README.md"
    echo ""
}

# ============================================================
# ERROR HANDLER
# ============================================================

handle_error() {
    local line_number=$1
    print_error "Setup failed at line ${line_number}"
    print_info "Check the error message above for details"
    exit 1
}

trap 'handle_error ${LINENO}' ERR

# ============================================================
# RUN MAIN
# ============================================================

main "$@"
