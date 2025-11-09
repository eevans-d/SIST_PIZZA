#!/usr/bin/env bash
set -euo pipefail

# Wrapper seguro para comandos comunes de Supabase DB
# Usa $SUPABASE_BIN si está definido, si no busca en PATH o ~/.supabase/bin

BIN="${SUPABASE_BIN:-supabase}"
if ! command -v ${BIN} >/dev/null 2>&1; then
  if [ -x "$HOME/.supabase/bin/supabase" ]; then
    BIN="$HOME/.supabase/bin/supabase"
  else
    echo "::error::No se encuentra 'supabase'. Ejecuta scripts/install_supabase_cli.sh primero." >&2
    exit 1
  fi
fi

usage() {
  cat <<'USAGE'
Uso: scripts/supabase_db_commands.sh <accion>

Acciones:
  status           - Muestra estado del proyecto linkeado
  dump-schema      - Genera dump del esquema (remoto si está linkeado)
  push             - Aplica migraciones locales al remoto (cautela)
  types            - Genera tipos (si está configurado)

Ejemplos:
  scripts/supabase_db_commands.sh status
  scripts/supabase_db_commands.sh dump-schema
  scripts/supabase_db_commands.sh push
USAGE
}

ACTION="${1:-}" || true
if [ -z "${ACTION}" ]; then
  usage; exit 1
fi

case "${ACTION}" in
  status)
    ${BIN} status
    ;;
  dump-schema)
    mkdir -p supabase/dumps
    TS=$(date +%Y%m%d_%H%M%S)
    OUT="supabase/dumps/schema_${TS}.sql"
    echo "Generando dump en ${OUT} ..."
    ${BIN} db dump --schema-only --if-exists --data-only=false --file "${OUT}"
    echo "OK: ${OUT}"
    ;;
  push)
    echo "Aplicando migraciones locales al remoto linkeado (si corresponde)..."
    echo "Nota: Asegúrate de haber revisado las migraciones en supabase/migrations antes."
    ${BIN} db push
    ;;
  types)
    ${BIN} gen types typescript --project-id "${SUPABASE_PROJECT_REF:-}" --schema public > supabase/types.ts
    echo "Tipos generados en supabase/types.ts (si el comando es compatible en tu versión)."
    ;;
  *)
    usage; exit 1
    ;;
esac
