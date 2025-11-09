#!/usr/bin/env bash
set -euo pipefail

# Instala Supabase CLI en Linux en ~/.supabase/bin
# Intenta varios métodos oficiales y deja trazas claras.

TARGET_DIR="${HOME}/.supabase/bin"
mkdir -p "${TARGET_DIR}"

echo "[1/4] Objetivo de instalación: ${TARGET_DIR}"

install_from_cli_domain() {
  echo "[2/4] Intentando instalador oficial (cli.supabase.com)..."
  if command -v curl >/dev/null 2>&1; then
    if curl -sSfL https://cli.supabase.com/install | sh -s -- -b "${TARGET_DIR}"; then
      return 0
    fi
  fi
  return 1
}

install_from_github() {
  echo "[2/4] Intentando instalador desde GitHub Releases..."
  if command -v curl >/dev/null 2>&1; then
    if curl -sSfL https://github.com/supabase/cli/releases/latest/download/install.sh | sh -s -- -b "${TARGET_DIR}"; then
      return 0
    fi
  fi
  return 1
}

add_to_path() {
  # Añade al PATH sólo si no existe
  if ! echo ":${PATH}:" | grep -q ":${TARGET_DIR}:"; then
    echo "export PATH=\"${TARGET_DIR}:$PATH\"" >> "${HOME}/.bashrc"
    export PATH="${TARGET_DIR}:${PATH}"
  fi
}

verify() {
  echo "[3/4] Verificando instalación..."
  if command -v supabase >/dev/null 2>&1; then
    supabase --version || true
    return 0
  elif [ -x "${TARGET_DIR}/supabase" ]; then
    "${TARGET_DIR}/supabase" --version || true
    return 0
  fi
  return 1
}

if install_from_cli_domain || install_from_github; then
  add_to_path
  if verify; then
    echo "[4/4] ✅ Supabase CLI instalada correctamente."
    exit 0
  fi
fi

cat >&2 <<'EOF'
[4/4] ❌ No se pudo instalar Supabase CLI automáticamente.
Posibles causas:
  - Sin conectividad a internet o DNS bloqueado
  - Proxy corporativo/firewall
  - Restricciones del entorno CI/runner

Soluciones:
  1) Reintenta cuando haya red disponible:
     curl -sSfL https://cli.supabase.com/install | sh -s -- -b "$HOME/.supabase/bin"

  2) Descarga binario manualmente:
     - Visita: https://github.com/supabase/cli/releases
     - Descarga el tar.gz para Linux x86_64 o ARM (según tu CPU)
     - Extrae y copia el binario a: $HOME/.supabase/bin/supabase
     - chmod +x $HOME/.supabase/bin/supabase

  3) Homebrew (si está disponible):
     brew install supabase/tap/supabase

Luego abre una nueva terminal o ejecuta:
  export PATH="$HOME/.supabase/bin:$PATH"

Y verifica:
  supabase --version
EOF
exit 2
