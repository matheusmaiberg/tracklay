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
#   ./scripts/warm-cache.sh https://tracklay.your-account.workers.dev

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
  echo "  $0 https://tracklay.seuworker.workers.dev"
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

# ============= OBTER UUIDs =============

echo "============================================="
echo "CACHE WARMING - Tracklay Worker v3.0.0"
echo "============================================="
echo ""
echo "⚠️  BREAKING CHANGE: Legacy routes removed"
echo "   Only obfuscated UUID-based routes supported"
echo ""
echo "Worker URL: $WORKER_URL"
echo ""

# Obter UUIDs do config (via Node.js)
echo "Detecting obfuscated endpoint UUIDs..."
UUIDS=$(node -e "
  import('../src/config/index.js').then(({ CONFIG, initConfig }) => {
    initConfig(process.env);
    console.log(JSON.stringify({
      facebook: CONFIG.FACEBOOK_ENDPOINT_ID,
      google: CONFIG.GOOGLE_ENDPOINT_ID
    }));
  });
" 2>/dev/null)

if [ -z "$UUIDS" ]; then
  echo "ERROR: Failed to detect UUIDs from config"
  echo "Make sure src/config/index.js is accessible"
  exit 1
fi

FACEBOOK_UUID=$(echo "$UUIDS" | grep -o '"facebook":"[^"]*"' | sed 's/"facebook":"\(.*\)"/\1/')
GOOGLE_UUID=$(echo "$UUIDS" | grep -o '"google":"[^"]*"' | sed 's/"google":"\(.*\)"/\1/')

echo "  Facebook UUID: $FACEBOOK_UUID"
echo "  Google UUID:   $GOOGLE_UUID"
echo ""
echo "Warming cache for obfuscated scripts..."
echo ""

# Contador de sucessos
SUCCESS_COUNT=0
TOTAL_COUNT=3

# Warm cache para cada script obfuscado em paralelo
(warm_script "/cdn/f/${FACEBOOK_UUID}-script.js" "Facebook Pixel (obfuscated)") &
PID_FB=$!

(warm_script "/cdn/g/${GOOGLE_UUID}-tag.js" "Google Analytics (obfuscated)") &
PID_GA=$!

(warm_script "/cdn/g/${GOOGLE_UUID}-gtm.js" "Google Tag Manager (obfuscated)") &
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
