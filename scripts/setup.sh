#!/bin/bash

# ============================================================
# TRACKLAY - SETUP ENTRY POINT
# ============================================================
# Simple wrapper that calls the factory setup orchestrator
#
# Usage: ./scripts/setup.sh
# ============================================================

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Call the factory setup orchestrator
"${SCRIPT_DIR}/setup/setup.sh" "$@"
