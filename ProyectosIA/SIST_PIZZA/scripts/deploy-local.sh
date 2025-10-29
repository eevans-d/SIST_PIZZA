#!/usr/bin/env bash
set -euo pipefail

# SIST_PIZZA - Despliegue local con Docker Compose
# Requisitos: docker, docker compose, Supabase configurado (variables en backend/.env)

ROOT_DIR=$(cd "$(dirname "$0")/.." && pwd)
cd "$ROOT_DIR"

info() { echo -e "\033[1;34m[INFO]\033[0m $*"; }
ok()   { echo -e "\033[1;32m[OK]  \033[0m $*"; }
warn() { echo -e "\033[1;33m[WARN]\033[0m $*"; }
err()  { echo -e "\033[1;31m[ERR] \033[0m $*"; }

command -v docker >/dev/null 2>&1 || { err "Docker no está instalado"; exit 1; }
if ! docker compose version >/dev/null 2>&1; then
  warn "docker compose no detectado; intentando docker-compose"
  alias docker-compose=docker-compose
fi

# Validar env
if [[ ! -f "$ROOT_DIR/backend/.env" ]]; then
  warn "backend/.env no encontrado. Copia backend/.env.example a backend/.env y completa las claves."
  echo "Ejemplo de variables críticas:"
  grep -E '^(SUPABASE_|PORT|NODE_ENV|ALLOWED_ORIGINS|DB_ENCRYPTION_KEY|LOG_LEVEL)' "$ROOT_DIR/backend/.env.example" || true
  exit 2
fi

info "Levantando base de datos y redis primero..."
docker compose up -d postgres redis

info "Esperando salud de postgres y redis (hasta 60s)..."
SECS=0
until docker ps --format '{{.Names}} {{.Status}}' | grep -q "sist-pizza-postgres.*(healthy)"; do
  sleep 3; SECS=$((SECS+3)); [[ $SECS -gt 60 ]] && { err "Postgres no healthy"; exit 3; }
  info "Postgres aún no healthy..."
done
ok "Postgres healthy"

SECS=0
until docker ps --format '{{.Names}} {{.Status}}' | grep -q "sist-pizza-redis.*(healthy)"; do
  sleep 3; SECS=$((SECS+3)); [[ $SECS -gt 60 ]] && { err "Redis no healthy"; exit 4; }
  info "Redis aún no healthy..."
done
ok "Redis healthy"

info "Levantando backend, prometheus y grafana..."
docker compose up -d backend prometheus grafana

API_BASE=${API_URL:-http://localhost:4000}
info "Esperando al backend (hasta 60s) en ${API_BASE}..."
SECS=0
until curl -fsS "${API_BASE}/health" >/dev/null 2>&1; do
  sleep 3; SECS=$((SECS+3)); [[ $SECS -gt 60 ]] && { err "Backend no responde en /health"; exit 5; }
  info "Backend aún iniciando..."
done
ok "Backend responde /health"

cat <<EOF

Endpoints útiles:
- Backend API:           ${API_BASE}
  • Health:              ${API_BASE}/health
  • Health (detalle):    ${API_BASE}/api/health
  • Métricas Prometheus: ${API_BASE}/metrics
- Prometheus:            http://localhost:9090
- Grafana:               http://localhost:3001  (user: admin, pass por env GRAFANA_PASSWORD o 'admin')

Para verificar rápido:
  scripts/check-health.sh

Para ver logs de backend:
  docker logs -f sist-pizza-backend

EOF
ok "Despliegue local listo"
