#!/bin/bash

# ============================================================
# WRANGLER UPDATER - UPDATE WRANGLER.TOML
# ============================================================
# RESPONSIBILITY:
# - Update wrangler.toml with account_id
# - Handle different file formats (commented/uncommented)
# ============================================================

# Source dependencies
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../core/logger.sh"
source "${SCRIPT_DIR}/../core/helpers.sh"

# ============================================================
# WRANGLER.TOML UPDATE
# ============================================================

update_wrangler_toml() {
    local account_id="$1"
    local project_root=$(get_project_root)
    local wrangler_file="${project_root}/wrangler.toml"

    print_header "Configuring wrangler.toml"

    if [ ! -f "$wrangler_file" ]; then
        print_error "wrangler.toml not found at ${wrangler_file}"
        return 1
    fi

    # Try different update strategies
    if grep -q "^# account_id" "$wrangler_file"; then
        # Uncomment and replace account_id
        sed -i "s|^# account_id = \"your-account-id-here\"|account_id = \"${account_id}\"|" "$wrangler_file"
        print_success "Updated account_id in wrangler.toml"
    elif grep -q "^account_id" "$wrangler_file"; then
        # Replace existing account_id
        sed -i "s|^account_id = .*|account_id = \"${account_id}\"|" "$wrangler_file"
        print_success "Updated account_id in wrangler.toml"
    else
        # Add account_id after compatibility_date
        sed -i "/^compatibility_date/a account_id = \"${account_id}\"" "$wrangler_file"
        print_success "Added account_id to wrangler.toml"
    fi

    return 0
}
