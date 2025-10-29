#!/usr/bin/env bash
set -u

BASE=${1:-http://localhost:4000}
PROM=${2:-http://localhost:9090}
STATUS=0

bold() { echo -e "\033[1m$*\033[0m"; }
ok()   { echo -e "\033[1;32m[OK]\033[0m  $*"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m $*"; }
err()  { echo -e "\033[1;31m[ERR]\033[0m  $*"; }

bold "Post-deploy checks"
echo "API base: ${BASE}"
echo "Prometheus: ${PROM}"

echo
bold "1) /health"
CODE=$(curl -sS -o /dev/null -w "%{http_code}" "$BASE/health" || true)
if [[ "$CODE" == "200" ]]; then ok "/health -> 200"; else err "/health -> $CODE"; STATUS=1; fi

echo
bold "2) /api/health"
RESP=$(curl -sS "$BASE/api/health" || true)
CODE=$(echo "$RESP" | jq -r 'try .status // empty' >/dev/null 2>&1 && echo 200 || echo 000)
if echo "$RESP" | jq -e '.status=="ok" and .database=="ok"' >/dev/null 2>&1; then ok "/api/health ok & database ok"; else warn "/api/health inesperado: $RESP"; STATUS=1; fi

echo
bold "3) /metrics (HEAD)"
HEAD=$(curl -sSI "$BASE/metrics" 2>/dev/null | head -n1)
if echo "$HEAD" | grep -q "200"; then ok "/metrics -> 200"; else warn "/metrics HEAD inesperado: $HEAD"; STATUS=1; fi

echo
bold "4) Webhook E2E"
RESP=$(curl -sS -X POST "$BASE/api/webhooks/n8n/pedido" \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {"nombre": "User Check", "telefono": "+541112345679", "direccion": "Avenida Norte 456"},
    "items": [{"nombre": "Muzzarella", "cantidad": 1}],
    "notas": "post-deploy-check",
    "origen": "web"
  }' || true)
if echo "$RESP" | jq -e '.success==true and (.pedido_id|length)>0' >/dev/null 2>&1; then ok "Webhook OK: $(echo "$RESP" | jq -r '.pedido_id')"; else warn "Webhook inesperado: $RESP"; STATUS=1; fi

echo
bold "5) Prometheus targets"
COUNT=$(curl -sS "$PROM/api/v1/targets" | jq '.data.activeTargets | length' 2>/dev/null || echo 0)
if [[ "$COUNT" -ge 3 ]]; then ok "Targets activos: $COUNT"; else warn "Pocos targets activos: $COUNT"; STATUS=1; fi

exit $STATUS
