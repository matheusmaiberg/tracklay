#!/bin/bash

# ============================================================
# CONFIG UPDATER - UPDATE SRC/CONFIG/INDEX.JS
# ============================================================
# RESPONSIBILITY:
# - Update src/config/index.js with GTM_SERVER_URL
# - Update src/config/index.js with ALLOWED_ORIGINS
# ============================================================

# Source dependencies
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/../core/logger.sh"
source "${SCRIPT_DIR}/../core/helpers.sh"

# ============================================================
# CONFIG FILE UPDATES
# ============================================================

update_gtm_server_url() {
    local gtm_url="$1"
    local project_root=$(get_project_root)
    local config_file="${project_root}/src/config/index.js"

    if [ -z "$gtm_url" ]; then
        # No GTM URL provided, skip
        return 0
    fi

    if [ ! -f "$config_file" ]; then
        print_error "Config file not found at ${config_file}"
        return 1
    fi

    # Update GTM_SERVER_URL in config file
    sed -i "s|GTM_SERVER_URL: 'https://gtm.yourstore.com'|GTM_SERVER_URL: '${gtm_url}'|" "$config_file"
    sed -i "s|GTM_SERVER_URL: ''|GTM_SERVER_URL: '${gtm_url}'|" "$config_file"

    print_success "Updated GTM_SERVER_URL in src/config/index.js"
    return 0
}

update_allowed_origins() {
    local store_domains="$1"
    local project_root=$(get_project_root)
    local config_file="${project_root}/src/config/index.js"

    if [ -z "$store_domains" ]; then
        # No domains provided, use auto-detection
        return 0
    fi

    if [ ! -f "$config_file" ]; then
        print_error "Config file not found at ${config_file}"
        return 1
    fi

    # Format domains as JavaScript array
    local formatted_domains=$(format_domains_array "$store_domains")

    # Update ALLOWED_ORIGINS in config file
    sed -i "s|ALLOWED_ORIGINS: \[\]|ALLOWED_ORIGINS: [${formatted_domains}]|" "$config_file"

    print_success "Updated ALLOWED_ORIGINS in src/config/index.js"
    return 0
}

update_config_file() {
    local gtm_url="$1"
    local store_domains="$2"

    print_header "Updating Configuration File"

    update_gtm_server_url "$gtm_url"
    update_allowed_origins "$store_domains"

    return 0
}
