#!/usr/bin/env bash
set -euo pipefail

# genspark_sync.sh
# Sincroniza cambios desde una fuente externa (GENSPARK) a este repositorio.
# Modos soportados: --from-url <git-url> | --from-zip <zip-path> | --from-dir <path>
# Opciones: --branch <name> --map <config.yml> --dry-run --run-tests

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")"/.. && pwd)"
WORK_DIR="$(mktemp -d -t genspark_import_XXXXXXXX)"
CONFIG_FILE="${ROOT_DIR}/.genspark-import.yml"
DRY_RUN=false
RUN_TESTS=false
BRANCH=""
SOURCE_TYPE=""
SOURCE_VALUE=""

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

cleanup() {
  rm -rf "${WORK_DIR}" || true
}
trap cleanup EXIT

usage() {
  cat <<EOF
Uso: $(basename "$0") [--from-url URL | --from-zip ZIP | --from-dir DIR] [opciones]

Opciones:
  --branch BRANCH         Rama a usar si la fuente es un repo git
  --map FILE              Archivo YAML de configuración (default: .genspark-import.yml)
  --dry-run               Muestra diff sin escribir cambios (recommended first)
  --run-tests             Ejecuta tests después de sincronizar (backend)
  -h, --help              Muestra esta ayuda

Ejemplos:
  $(basename "$0") --from-url https://github.com/user/proyecto-genspark.git --branch main --dry-run
  $(basename "$0") --from-zip /path/export.zip --run-tests
  $(basename "$0") --from-dir /path/proyecto-genspark
EOF
}

# Parse args
while [[ $# -gt 0 ]]; do
  case "$1" in
    --from-url) SOURCE_TYPE=url; SOURCE_VALUE="$2"; shift 2;;
    --from-zip) SOURCE_TYPE=zip; SOURCE_VALUE="$2"; shift 2;;
    --from-dir) SOURCE_TYPE=dir; SOURCE_VALUE="$2"; shift 2;;
    --branch) BRANCH="$2"; shift 2;;
    --map) CONFIG_FILE="$2"; shift 2;;
    --dry-run) DRY_RUN=true; shift;;
    --run-tests) RUN_TESTS=true; shift;;
    -h|--help) usage; exit 0;;
    *) echo -e "${RED}Argumento no reconocido:${NC} $1"; usage; exit 1;;
  esac
done

if [[ -z "${SOURCE_TYPE}" ]]; then
  echo -e "${RED}Debes especificar una fuente: --from-url | --from-zip | --from-dir${NC}"
  usage; exit 1
fi

if [[ ! -f "${CONFIG_FILE}" ]]; then
  echo -e "${YELLOW}WARN:${NC} No se encontró ${CONFIG_FILE}, se usarán defaults."
fi

echo -e "${GREEN}→ Preparando fuente en${NC} ${WORK_DIR}"
SOURCE_DIR="${WORK_DIR}/source"
mkdir -p "${SOURCE_DIR}"

case "${SOURCE_TYPE}" in
  url)
    echo -e "Clonando repo: ${SOURCE_VALUE}"
    if [[ -n "${BRANCH}" ]]; then
      git clone --depth 1 --branch "${BRANCH}" "${SOURCE_VALUE}" "${SOURCE_DIR}"
    else
      git clone --depth 1 "${SOURCE_VALUE}" "${SOURCE_DIR}"
    fi
    ;;
  zip)
    echo -e "Extrayendo ZIP: ${SOURCE_VALUE}"
    unzip -q "${SOURCE_VALUE}" -d "${SOURCE_DIR}"
    # Si el zip contiene una carpeta raíz, entrar a ella
    ROOT_CANDIDATE=$(find "${SOURCE_DIR}" -maxdepth 1 -type d ! -path "${SOURCE_DIR}" | head -n1 || true)
    if [[ -n "${ROOT_CANDIDATE}" ]]; then SOURCE_DIR="${ROOT_CANDIDATE}"; fi
    ;;
  dir)
    echo -e "Copiando directorio: ${SOURCE_VALUE}"
    rsync -a --delete "${SOURCE_VALUE}/" "${SOURCE_DIR}/"
    ;;
  *) echo "Tipo de fuente desconocido"; exit 1;;
esac

# Leer exclusiones básicas del YAML si existe (requiere yq para leer; si no, usar defaults)
EXCLUDES=(".git/" "node_modules/" "dist/" "build/" ".vscode/" ".vscode-server/" ".idea/" "logs/" "*.log" "tmp/" "temp/" ".env" ".env.*" "*.Zone.Identifier")
if command -v yq >/dev/null 2>&1 && [[ -f "${CONFIG_FILE}" ]]; then
  mapfile -t YAML_EXCLUDES < <(yq '.exclude[]' -r "${CONFIG_FILE}" 2>/dev/null || true)
  if [[ ${#YAML_EXCLUDES[@]} -gt 0 ]]; then EXCLUDES=("${YAML_EXCLUDES[@]}"); fi
fi

RSYNC_EXCLUDES=()
for p in "${EXCLUDES[@]}"; do RSYNC_EXCLUDES+=(--exclude "$p"); done

# Mapeo (si existe) – si no, copiar todo a la raíz preservando estructura
MAP_COUNT=0
if command -v yq >/dev/null 2>&1 && [[ -f "${CONFIG_FILE}" ]]; then
  MAP_COUNT=$(yq '.mappings | length' -r "${CONFIG_FILE}" 2>/dev/null || echo 0)
fi

perform_rsync() {
  local FROM="$1"; local TO="$2"; local DRY="$3"
  local DRY_FLAG=()
  [[ "$DRY" == "true" ]] && DRY_FLAG=(--dry-run -i)
  rsync -a ${DRY_FLAG[@]} ${RSYNC_EXCLUDES[@]} --prune-empty-dirs --no-perms --no-owner --no-group \
    "${FROM}/" "${TO}/"
}

CHANGES_SUMMARY="${WORK_DIR}/changes.txt"
: > "${CHANGES_SUMMARY}"

if [[ "${MAP_COUNT}" -gt 0 ]]; then
  echo -e "Usando mapeos definidos en ${CONFIG_FILE} (${MAP_COUNT})"
  for i in $(seq 0 $((MAP_COUNT-1))); do
    FROM_SUB="$(yq ".mappings[$i].from" -r "${CONFIG_FILE}")"
    TO_SUB="$(yq ".mappings[$i].to" -r "${CONFIG_FILE}")"
    [[ -z "${FROM_SUB}" || -z "${TO_SUB}" ]] && continue
    echo -e "→ Sync: ${FROM_SUB} → ${TO_SUB}"
    mkdir -p "${ROOT_DIR}/${TO_SUB}"
    perform_rsync "${SOURCE_DIR}/${FROM_SUB}" "${ROOT_DIR}/${TO_SUB}" "${DRY_RUN}" | tee -a "${CHANGES_SUMMARY}" || true
  done
else
  echo -e "Sin mapeos: se sincroniza la raíz preservando estructura"
  perform_rsync "${SOURCE_DIR}" "${ROOT_DIR}" "${DRY_RUN}" | tee -a "${CHANGES_SUMMARY}" || true
fi

if [[ "${DRY_RUN}" == "true" ]]; then
  echo -e "\n${YELLOW}DRY-RUN COMPLETADO${NC}. Revisa los cambios listados arriba.\n"
  echo "Resumen de cambios (limpio):"
  grep -E '^[><ch]+	|^\*deleting ' -n "${CHANGES_SUMMARY}" || true
  echo -e "\nPara aplicar cambios, re-ejecuta sin --dry-run."
  exit 0
fi

# Post-sync: mostrar status y realizar commit
cd "${ROOT_DIR}"
CHANGED=$(git status --porcelain | wc -l | tr -d ' ')
if [[ "${CHANGED}" -eq 0 ]]; then
  echo -e "${YELLOW}No hay cambios para commitear.${NC}"
else
  echo -e "${GREEN}${CHANGED}${NC} cambios detectados. Preparando commit..."
  git add -A
  NOW="$(date -u +"%Y-%m-%d %H:%M:%S UTC")"
  MSG="chore(genspark): Importación desde fuente externa (${SOURCE_TYPE})\n\nOrigen: ${SOURCE_VALUE}\nFecha: ${NOW}\nNota: Sincronizado con reglas de .genspark-import.yml"
  git commit -m "$MSG"
  echo -e "${GREEN}Commit creado.${NC} Puedes pushear con: git push"
fi

if [[ "${RUN_TESTS}" == "true" ]]; then
  echo -e "\n${GREEN}→ Ejecutando tests del backend${NC}"
  if [[ -d "${ROOT_DIR}/backend" ]]; then
    (cd "${ROOT_DIR}/backend" && npm test || true)
  else
    echo -e "${YELLOW}Backend no encontrado en ./backend, saltando tests.${NC}"
  fi
fi

echo -e "\n${GREEN}Sincronización finalizada.${NC}"
