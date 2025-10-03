#!/usr/bin/env bash
set -euo pipefail

# Smoke test para qwen-analyzer (modo local)
# Requiere: node >= 18 instalado. Exportar QWEN_API_KEY dummy antes de ejecutar:
# export QWEN_API_KEY="sk-dummy-for-smoke-test"

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
ANALYZER="$ROOT/.github/scripts/qwen-analyzer.js"
TEST_FILE="$ROOT/tests/sample.js"
REPORT="$ROOT/qwen-report.json"
ARTIFACTS_DIR="$ROOT/artifacts"

# crear archivo de prueba si no existe
mkdir -p "$(dirname "$TEST_FILE")"
if [ ! -f "$TEST_FILE" ]; then
  cat > "$TEST_FILE" <<'JS'
/* sample test file for smoke test */
function sum(a,b){ return a + b; }
console.log(sum(1,2));
JS
fi

echo "==> Verificando Node..."
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node no está instalado o no está en PATH"; exit 10
fi
echo "Node version: $(node -v)"

echo "==> Ejecutando analyzer en modo --files (smoke)..."
node "$ANALYZER" --files "$TEST_FILE"
RC=$?

if [ $RC -ne 0 ]; then
  echo "ERROR: analyzer retornó código $RC"
  exit $RC
fi

# comprobar artefactos
if [ ! -f "$REPORT" ]; then
  echo "ERROR: reporte no generado: $REPORT"
  exit 20
fi

echo "Smoke test OK — reporte generado"
# leave artifacts for inspection; caller can remove them
exit 0
