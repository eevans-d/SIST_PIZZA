#!/usr/bin/env bash
set -euo pipefail

# Configura Supabase CLI: login + link al proyecto
# Requiere variables de entorno:
#   SUPABASE_ACCESS_TOKEN  (PAT de Supabase)
#   SUPABASE_PROJECT_REF   (ref del proyecto, ej: abcd1234)

BIN="${SUPABASE_BIN:-supabase}"

need() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "::error::Falta variable ${name}. Exporta ${name} y reintenta." >&2
    exit 1
  fi
}

if ! command -v ${BIN} >/dev/null 2>&1; then
  if [ -x "$HOME/.supabase/bin/supabase" ]; then
    BIN="$HOME/.supabase/bin/supabase"
  else
    echo "::error::No se encuentra 'supabase' en PATH ni en ~/.supabase/bin. Ejecuta scripts/install_supabase_cli.sh primero." >&2
    exit 1
  fi
fi

need SUPABASE_ACCESS_TOKEN
need SUPABASE_PROJECT_REF

echo "[1/3] Login en Supabase CLI (no se guarda token en texto plano en este script)."
"${BIN}" logout >/dev/null 2>&1 || true
echo "${SUPABASE_ACCESS_TOKEN}" | "${BIN}" login --no-browser || {
  echo "::error::Fallo el login. Verifica que el token sea válido y no expiró." >&2
  exit 1
}

echo "[2/3] Vinculando proyecto (${SUPABASE_PROJECT_REF}) con el repo actual..."
"${BIN}" link --project-ref "${SUPABASE_PROJECT_REF}"

echo "[3/3] Estado del proyecto linkeado:"
"${BIN}" status || true

cat <<'EOF'
✅ Setup de Supabase CLI completado.
Siguientes pasos útiles:
  - supabase db dump                      # volcar esquema local/remoto
  - supabase db push                      # aplicar migraciones al remoto
  - supabase db reset                     # reset de DB local (cautela)
  - supabase start / stop                 # servicios locales (Docker)

Para seguridad, no persistas SUPABASE_ACCESS_TOKEN en .env committeado.
Usa variables de entorno del shell o secrets de CI.
EOF
