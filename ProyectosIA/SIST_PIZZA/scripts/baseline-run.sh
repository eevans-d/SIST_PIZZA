#!/usr/bin/env bash
set -euo pipefail

# Baseline (lean) de endpoints críticos
# Uso:
#   ./scripts/baseline-run.sh                # BASE=http://localhost:4000, N_HEALTH=200, N_WEBHOOK=20
#   ./scripts/baseline-run.sh BASE N_HEALTH N_WEBHOOK
# Ej:
#   ./scripts/baseline-run.sh http://localhost:4000 200 20

BASE="${1:-http://localhost:4000}"
N_HEALTH="${2:-200}"
N_WEBHOOK="${3:-20}"
OUT_DIR="docs/pre-deploy/baseline"
OUT_FILE="$OUT_DIR/baseline.csv"

mkdir -p "$OUT_DIR"
DATE_ISO=$(date -Is)

# Cabecera CSV
if [ ! -f "$OUT_FILE" ]; then
  echo "timestamp_iso,endpoint,method,status,duration_ms" > "$OUT_FILE"
fi

info() { echo -e "\033[1;34m[INFO]\033[0m $*"; }
ok()   { echo -e "\033[1;32m[ OK ]\033[0m $*"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m $*"; }
err()  { echo -e "\033[1;31m[ERR ]\033[0m $*"; }

measure_get() {
  local path="$1"
  local n="$2"
  info "GET $path x$n"
  for i in $(seq 1 "$n"); do
    local res
    res=$(curl -sS -o /dev/null -w "%{http_code},%{time_total}" "$BASE$path" || true)
    local code="$(echo "$res" | cut -d, -f1)"
    local sec="$(echo "$res" | cut -d, -f2)"
    # Convertir a ms con 3 decimales
    local ms
    ms=$(awk -v s="$sec" 'BEGIN { printf("%.3f", s*1000) }')
    echo "$DATE_ISO,$path,GET,$code,$ms" >> "$OUT_FILE"
  done
  ok "GET $path completado"
}

# Payload de ejemplo para webhook (tomado de scripts/post-deploy-check.sh)
WEBHOOK_PAYLOAD=$(cat << 'JSON'
{
  "cliente": { "nombre": "Juan Pérez", "telefono": "+5491123456789", "direccion": "Av. Siempre Viva 123, Zona Centro" },
  "pedido": { "metodo_pago": "efectivo", "observaciones": "puerta negra" },
  "items": [
    { "producto_id": "muzza", "cantidad": 1 },
    { "producto_id": "faina", "cantidad": 1 }
  ]
}
JSON
)

measure_webhook() {
  local path="$1"
  local n="$2"
  info "POST $path x$n (con pacing para evitar rate-limit)"
  for i in $(seq 1 "$n"); do
    local start_ts
    start_ts=$(date +%s%3N)
    local body
    body=$(echo "$WEBHOOK_PAYLOAD")
    local http_code
    http_code=$(curl -sS -o /tmp/baseline_last_resp.json -w "%{http_code}" \
      -X POST "$BASE$path" \
      -H 'Content-Type: application/json' \
      --data "$body" || true)
    local end_ts
    end_ts=$(date +%s%3N)
    local dur_ms=$(( end_ts - start_ts ))
    echo "$DATE_ISO,$path,POST,$http_code,$dur_ms" >> "$OUT_FILE"

    # Pacear a ~1 req/2s para no golpear el limitador (30/min)
    sleep 2
  done
  ok "POST $path completado"
}

# Verificaciones rápidas
info "Backend base: $BASE"
if ! curl -sS "$BASE/health" >/dev/null; then
  warn "GET /health falló - ¿stack levantado? Considera ejecutar ./scripts/deploy-local.sh"
fi

# Ejecución
measure_get "/health" "$N_HEALTH"
measure_get "/api/health" 50
measure_webhook "/api/webhooks/n8n/pedido" "$N_WEBHOOK"

ok "Baseline completado → $OUT_FILE"

# Resumen rápido por endpoint (avg)
info "Resumen (promedio por endpoint)"
awk -F, 'NR>1 {sum[$2]+=$5; cnt[$2]++} END {for (k in sum) printf("%s: avg=%.2f ms (n=%d)\n", k, sum[k]/cnt[k], cnt[k])}' "$OUT_FILE" | sort
