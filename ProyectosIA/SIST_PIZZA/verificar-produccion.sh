#!/bin/bash

# ============================================================================
# SCRIPT DE VERIFICACIÓN - RUTA PRODUCCIÓN
# ============================================================================
# Este script verifica que todas las fases estén configuradas correctamente
# antes de ejecutar en producción

set -e

echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                 🔍 VERIFICACIÓN PRE-PRODUCCIÓN                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TOTAL=0
PASSED=0

check() {
  TOTAL=$((TOTAL + 1))
  if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅${NC} $1"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}❌${NC} $1"
  fi
}

# ============================================================================
# VERIFICACIÓN 1: ARCHIVOS NECESARIOS
# ============================================================================
echo ""
echo "📋 VERIFICACIÓN 1: Archivos necesarios"
echo "──────────────────────────────────────"

test -f .env && check "✓ .env existe"
test -f backend/package.json && check "✓ backend/package.json existe"
test -f docs/03-setup-sql/PASO_2_SCHEMA_SQL.txt && check "✓ PASO_2_SCHEMA_SQL.txt existe"
test -f docs/03-setup-sql/PASO_3_SEED_DATA_SQL.txt && check "✓ PASO_3_SEED_DATA_SQL.txt existe"

# ============================================================================
# VERIFICACIÓN 2: VARIABLES DE ENTORNO
# ============================================================================
echo ""
echo "🔐 VERIFICACIÓN 2: Variables de entorno"
echo "───────────────────────────────────────"

grep -q "SUPABASE_URL=" .env && check "✓ SUPABASE_URL configurada"
grep -q "SUPABASE_SERVICE_ROLE_KEY=" .env && check "✓ SUPABASE_SERVICE_ROLE_KEY configurada"
grep -q "PORT=4000" .env && check "✓ PORT configurado en 4000"

# ============================================================================
# VERIFICACIÓN 3: BACKEND PREPARADO
# ============================================================================
echo ""
echo "🔧 VERIFICACIÓN 3: Backend preparado"
echo "───────────────────────────────────────"

cd backend
test -d node_modules && check "✓ node_modules existe"
npm list express > /dev/null 2>&1 && check "✓ express instalado"
npm list @supabase/supabase-js > /dev/null 2>&1 && check "✓ supabase-js instalado"
test -f vitest.config.ts && check "✓ vitest configurado"
cd ..

# ============================================================================
# VERIFICACIÓN 4: CONECTIVIDAD
# ============================================================================
echo ""
echo "🌐 VERIFICACIÓN 4: Conectividad"
echo "───────────────────────────────"

# Extraer Supabase URL
SUPABASE_URL=$(grep "SUPABASE_URL=" .env | cut -d'=' -f2)
timeout 3 curl -s "${SUPABASE_URL}/auth/v1/healthz" > /dev/null 2>&1 && check "✓ Supabase está online"

# ============================================================================
# VERIFICACIÓN 5: DOCUMENTACIÓN PRODUCCIÓN
# ============================================================================
echo ""
echo "📚 VERIFICACIÓN 5: Documentación de producción"
echo "────────────────────────────────────────────────"

test -f PLAN_EJECUCION_PRODUCCION.md && check "✓ PLAN_EJECUCION_PRODUCCION.md existe"
test -f MASTER_BLUEPRINT.md && check "✓ MASTER_BLUEPRINT.md existe"
test -f CHECKLIST_ACCIONABLE.md && check "✓ CHECKLIST_ACCIONABLE.md existe"

# ============================================================================
# RESUMEN
# ============================================================================
echo ""
echo "╔══════════════════════════════════════════════════════════════════════════════╗"
echo "║                         ✅ RESUMEN DE VERIFICACIÓN                          ║"
echo "╚══════════════════════════════════════════════════════════════════════════════╝"

PERCENTAGE=$((PASSED * 100 / TOTAL))
echo ""
echo -e "Verificaciones: ${GREEN}${PASSED}/${TOTAL}${NC} completadas (${PERCENTAGE}%)"

if [ $PASSED -eq $TOTAL ]; then
  echo -e "${GREEN}✅ SISTEMA LISTO PARA PRODUCCIÓN${NC}"
  echo ""
  echo "Próximos pasos:"
  echo "1. Ejecuta SQL en Supabase (FASE 1 de PLAN_EJECUCION_PRODUCCION.md)"
  echo "2. Verifica backend conectividad: curl http://localhost:4000/health"
  echo "3. Ejecuta tests: cd backend && npm test"
  echo ""
  exit 0
else
  echo -e "${RED}❌ ALGUNAS VERIFICACIONES FALLARON${NC}"
  echo "Por favor resuelve los problemas anteriores antes de continuar"
  echo ""
  exit 1
fi

