#!/bin/bash

# ============================================================
# HELPERS - UTILITY FUNCTIONS
# ============================================================
# RESPONSIBILITY:
# - Provide utility functions for common operations
# - File operations, string manipulation, etc.
# ============================================================

# Source logger for output
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "${SCRIPT_DIR}/logger.sh"

# ============================================================
# FILE OPERATIONS
# ============================================================

get_project_root() {
    # Get the project root directory (2 levels up from scripts/setup/core)
    echo "$(cd "${SCRIPT_DIR}/../../.." && pwd)"
}

ensure_gitignore_entry() {
    local entry="$1"
    local gitignore_file="$(get_project_root)/.gitignore"

    if [ ! -f "$gitignore_file" ]; then
        touch "$gitignore_file"
    fi

    if ! grep -q "^${entry}$" "$gitignore_file" 2>/dev/null; then
        echo "$entry" >> "$gitignore_file"
        print_success "Added ${entry} to .gitignore"
    fi
}

# ============================================================
# STRING OPERATIONS
# ============================================================

trim_whitespace() {
    local str="$1"
    echo "$str" | xargs
}

mask_secret() {
    local secret="$1"
    local visible_chars="${2:-8}"

    if [ ${#secret} -gt $visible_chars ]; then
        echo "${secret:0:$visible_chars}..."
    else
        echo "${secret}"
    fi
}

format_domains_array() {
    local domains_csv="$1"
    local formatted=""

    IFS=',' read -ra DOMAINS_ARRAY <<< "$domains_csv"
    for domain in "${DOMAINS_ARRAY[@]}"; do
        domain=$(trim_whitespace "$domain")
        formatted="${formatted}'${domain}', "
    done

    # Remove trailing comma and space
    echo "${formatted%, }"
}

# ============================================================
# CLOUDFLARE OPERATIONS
# ============================================================

get_cloudflare_account_id() {
    local account_id=$(wrangler whoami 2>/dev/null | grep "Account ID" | head -n 1 | awk '{print $3}')
    echo "$account_id"
}

# ============================================================
# USER INTERACTION
# ============================================================

confirm_action() {
    local prompt="$1"
    local default="${2:-n}"

    if [ "$default" = "y" ]; then
        read -p "${prompt} (Y/n): " response
        response=${response:-y}
    else
        read -p "${prompt} (y/N): " response
        response=${response:-n}
    fi

    if [ "$response" = "y" ] || [ "$response" = "Y" ]; then
        return 0
    else
        return 1
    fi
}

wait_for_enter() {
    local prompt="${1:-Press ENTER to continue or Ctrl+C to cancel...}"
    read -p "$prompt"
}
