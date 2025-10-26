#!/usr/bin/env bash
set -euo pipefail

# genspark_diff.sh
# Muestra un diff (dry-run) de lo que se importaría desde una fuente GENSPARK
# Modos: --from-url <git-url> | --from-zip <zip> | --from-dir <path>
# Opciones: --branch <name> --map <config.yml>

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
WORK_DIR="$(mktemp -d -t genspark_diff_XXXXXXXX)"
CONFIG_FILE="${ROOT_DIR}/.genspark-import.yml"
BRANCH=""
SOURCE_TYPE=""
SOURCE_VALUE=""

cleanup() { rm -rf "${WORK_DIR}" || true; }
trap cleanup EXIT

usage() {
  cat <<EOF
Uso: $(basename "$0") [--from-url URL | --from-zip ZIP | --from-dir DIR] [opciones]

Opciones:
  --branch BRANCH     Rama a usar si la fuente es un repo git
  --map FILE          Archivo YAML de configuración (default: .genspark-import.yml)
  -h, --help          Mostrar ayuda
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --from-url) SOURCE_TYPE=url; SOURCE_VALUE="$2"; shift 2;;
    --from-zip) SOURCE_TYPE=zip; SOURCE_VALUE="$2"; shift 2;;
    --from-dir) SOURCE_TYPE=dir; SOURCE_VALUE="$2"; shift 2;;
    --branch) BRANCH="$2"; shift 2;;
    --map) CONFIG_FILE="$2"; shift 2;;
    -h|--help) usage; exit 0;;
    *) echo "Arg no reconocido: $1"; usage; exit 1;;
  esac
done

if [[ -z "${SOURCE_TYPE}" ]]; then
  echo "Debes indicar una fuente"; usage; exit 1
fi

SOURCE_DIR="${WORK_DIR}/source"
mkdir -p "${SOURCE_DIR}"

case "${SOURCE_TYPE}" in
  url)
    if [[ -n "${BRANCH}" ]]; then
      git clone --depth 1 --branch "${BRANCH}" "${SOURCE_VALUE}" "${SOURCE_DIR}"
    else
      git clone --depth 1 "${SOURCE_VALUE}" "${SOURCE_DIR}"
    fi
    ;;
  zip)
    unzip -q "${SOURCE_VALUE}" -d "${SOURCE_DIR}"
    ROOT_CANDIDATE=$(find "${SOURCE_DIR}" -maxdepth 1 -type d ! -path "${SOURCE_DIR}" | head -n1 || true)
    if [[ -n "${ROOT_CANDIDATE}" ]]; then SOURCE_DIR="${ROOT_CANDIDATE}"; fi
    ;;
  dir)
    rsync -a --delete "${SOURCE_VALUE}/" "${SOURCE_DIR}/"
    ;;
  *) echo "Tipo de fuente desconocido"; exit 1;;
esac

EXCLUDES=(".git/" "node_modules/" "dist/" "build/" ".vscode/" ".vscode-server/" ".idea/" "logs/" "*.log" "tmp/" "temp/" ".env" ".env.*" "*.Zone.Identifier")
if command -v yq >/dev/null 2>&1 && [[ -f "${CONFIG_FILE}" ]]; then
  mapfile -t YAML_EXCLUDES < <(yq '.exclude[]' -r "${CONFIG_FILE}" 2>/dev/null || true)
  if [[ ${#YAML_EXCLUDES[@]} -gt 0 ]]; then EXCLUDES=("${YAML_EXCLUDES[@]}"); fi
fi
RSYNC_EXCLUDES=()
for p in "${EXCLUDES[@]}"; do RSYNC_EXCLUDES+=(--exclude "$p"); done

MAP_COUNT=0
if command -v yq >/dev/null 2>&1 && [[ -f "${CONFIG_FILE}" ]]; then
  MAP_COUNT=$(yq '.mappings | length' -r "${CONFIG_FILE}" 2>/dev/null || echo 0)
fi

if [[ "${MAP_COUNT}" -gt 0 ]]; then
  for i in $(seq 0 $((MAP_COUNT-1))); do
    FROM_SUB="$(yq ".mappings[$i].from" -r "${CONFIG_FILE}")"
    TO_SUB="$(yq ".mappings[$i].to" -r "${CONFIG_FILE}")"
    [[ -z "${FROM_SUB}" || -z "${TO_SUB}" ]] && continue
    echo "→ Diff: ${FROM_SUB} → ${TO_SUB}"
    rsync -ai --dry-run ${RSYNC_EXCLUDES[@]} --prune-empty-dirs \
      "${SOURCE_DIR}/${FROM_SUB}/" "${ROOT_DIR}/${TO_SUB}/" || true
  done
else
  echo "→ Diff: raíz (sin mapeos)"
  rsync -ai --dry-run ${RSYNC_EXCLUDES[@]} --prune-empty-dirs \
    "${SOURCE_DIR}/" "${ROOT_DIR}/" || true
fi

echo "\nFin del diff (no se realizaron cambios)."
