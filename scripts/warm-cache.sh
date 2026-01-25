#!/bin/bash
# ============================================================
# CACHE WARMING SCRIPT - POST-DEPLOYMENT OPTIMIZATION
# ============================================================
# RESPONSABILIDADE:
# - Warm cache após deploy do worker
# - Reduzir first request latency (300ms → 50ms)
# - Garantir que cache está populado antes de tráfego real
#
# USAGE:
#   ./scripts/warm-cache.sh [WORKER_URL]
#
# EXEMPLO:
#   ./scripts/warm-cache.sh https://tracklay.groufy-aceleradora.workers.dev

set -e

# ============= CONFIGURAÇÃO =============

WORKER_URL=${1:-""}

# Se não foi passada URL, tentar detectar do wrangler.toml
if [ -z "$WORKER_URL" ]; then
  if [ -f "wrangler.toml" ]; then
    WORKER_NAME=$(grep -E "^name\s*=\s*\"" wrangler.toml | head -n1 | sed 's/.*"\(.*\)".*/\1/')

    if [ -n "$WORKER_NAME" ]; then
      WORKER_URL="https://${WORKER_NAME}.workers.dev"
    fi
  fi
fi

# Se ainda não tem URL, mostrar erro
if [ -z "$WORKER_URL" ]; then
  echo "ERROR: Worker URL not provided"
  echo ""
  echo "Usage: $0 <WORKER_URL>"
  echo ""
  echo "Example:"
  echo "  $0 https://tracklay.groufy-aceleradora.workers.dev"
  echo ""
  exit 1
fi

# ============= FUNÇÕES =============

warm_script() {
  local script_path=$1
  local script_name=$2

  echo -n "  ⏳ Warming ${script_name}... "

  # Fazer request silencioso
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "${WORKER_URL}${script_path}" 2>/dev/null || echo "000")

  if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ OK (HTTP $HTTP_CODE)"
    return 0
  else
    echo "⚠️  WARN (HTTP $HTTP_CODE)"
    return 1
  fi
}

# ============= MAIN =============

echo "============================================="
echo "CACHE WARMING - Tracklay Worker"
echo "============================================="
echo ""
echo "Worker URL: $WORKER_URL"
echo ""
echo "Warming cache for third-party scripts..."
echo ""

# Contador de sucessos
SUCCESS_COUNT=0
TOTAL_COUNT=3

# Warm cache para cada script em paralelo
(warm_script "/cdn/fbevents.js" "Facebook Pixel") &
PID_FB=$!

(warm_script "/cdn/gtag.js" "Google Analytics") &
PID_GA=$!

(warm_script "/cdn/gtm.js" "Google Tag Manager") &
PID_GTM=$!

# Aguardar todos os processos
wait $PID_FB && ((SUCCESS_COUNT++)) || true
wait $PID_GA && ((SUCCESS_COUNT++)) || true
wait $PID_GTM && ((SUCCESS_COUNT++)) || true

echo ""
echo "============================================="
echo "Cache warming completed!"
echo "Success: $SUCCESS_COUNT/$TOTAL_COUNT scripts"
echo "============================================="

# Exit code baseado no sucesso
if [ $SUCCESS_COUNT -eq $TOTAL_COUNT ]; then
  exit 0
else
  exit 1
fi
