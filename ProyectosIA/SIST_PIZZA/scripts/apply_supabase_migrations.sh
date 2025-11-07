#!/usr/bin/env bash
# ============================================================================
# SIST_PIZZA - Aplicador Automático de Migraciones Supabase
# Ejecuta las 5 migraciones SQL en orden usando psql
# Uso: ./scripts/apply_supabase_migrations.sh [DATABASE_URL]
# ============================================================================

set -euo pipefail

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_step() {
  echo -e "${BLUE}==>${NC} $1"
}

print_success() {
  echo -e "${GREEN}✅${NC} $1"
}

print_warn() {
  echo -e "${YELLOW}⚠️${NC} $1"
}

print_error() {
  echo -e "${RED}❌${NC} $1"
}

# Verificar si psql está instalado
if ! command -v psql &> /dev/null; then
  print_error "psql no está instalado. Instalá PostgreSQL client primero."
  echo ""
  echo "Ubuntu/Debian: sudo apt-get install postgresql-client"
  echo "macOS: brew install postgresql"
  echo "O seguí las instrucciones en: https://www.postgresql.org/download/"
  exit 1
fi

# Obtener DATABASE_URL
if [ $# -eq 1 ]; then
  DATABASE_URL="$1"
elif [ -n "${DATABASE_URL:-}" ]; then
  print_step "Usando DATABASE_URL de variable de entorno"
else
  print_error "DATABASE_URL no proporcionada"
  echo ""
  echo "Uso: $0 <DATABASE_URL>"
  echo "O exportá DATABASE_URL como variable de entorno"
  echo ""
  echo "Ejemplo:"
  echo '  export DATABASE_URL="postgresql://postgres:PASSWORD@db.XXXX.supabase.co:5432/postgres"'
  echo "  $0"
  echo ""
  echo "O directamente:"
  echo '  $0 "postgresql://postgres:PASSWORD@db.XXXX.supabase.co:5432/postgres"'
  exit 1
fi

# Verificar conectividad
print_step "Verificando conexión a Supabase..."
if ! psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
  print_error "No se pudo conectar a la base de datos"
  echo ""
  echo "Verificá:"
  echo "  1. DATABASE_URL correcta"
  echo "  2. Contraseña correcta"
  echo "  3. Proyecto Supabase activo"
  echo "  4. IP permitida en Supabase (Settings → Database → Connection pooling)"
  exit 1
fi
print_success "Conexión exitosa"

# Directorio de migraciones
MIGRATIONS_DIR="$(cd "$(dirname "$0")/../supabase/migrations" && pwd)"

if [ ! -d "$MIGRATIONS_DIR" ]; then
  print_error "Directorio de migraciones no encontrado: $MIGRATIONS_DIR"
  exit 1
fi

# Lista de migraciones en orden
MIGRATIONS=(
  "20250115000000_initial_schema.sql"
  "20250115000001_seed_data.sql"
  "20250125000002_add_missing_tables.sql"
  "20250126000003_rls_security_audit.sql"
  "20250126000004_performance_indexes.sql"
)

echo ""
print_step "Aplicando migraciones de Supabase..."
echo ""

APPLIED=0
FAILED=0

for migration in "${MIGRATIONS[@]}"; do
  migration_path="$MIGRATIONS_DIR/$migration"

  if [ ! -f "$migration_path" ]; then
    print_warn "Migración no encontrada: $migration (saltando)"
    continue
  fi

  print_step "Aplicando: $migration"

  if psql "$DATABASE_URL" -f "$migration_path" > /dev/null 2>&1; then
    print_success "Migración aplicada: $migration"
    ((APPLIED++))
  else
    print_error "Error al aplicar: $migration"
    echo ""
    echo "Para ver el error detallado, ejecutá:"
    echo "  psql \"$DATABASE_URL\" -f \"$migration_path\""
    ((FAILED++))

    # Preguntar si continuar
    read -p "¿Continuar con las siguientes migraciones? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
      print_warn "Abortando aplicación de migraciones"
      exit 1
    fi
  fi
done

echo ""
echo "=========================================="
print_success "Proceso completado"
echo "  Aplicadas: $APPLIED"
if [ $FAILED -gt 0 ]; then
  print_warn "  Fallidas: $FAILED"
else
  echo "  Fallidas: 0"
fi
echo "=========================================="

# Verificación final
echo ""
print_step "Verificando estado de la base de datos..."

# Contar tablas
TABLE_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE';" | xargs)

if [ "$TABLE_COUNT" -ge 12 ]; then
  print_success "Base de datos configurada correctamente ($TABLE_COUNT tablas)"
else
  print_warn "Esperábamos al menos 12 tablas, encontradas: $TABLE_COUNT"
fi

# Verificar datos de prueba
MENU_COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM menu_items;" 2>/dev/null | xargs || echo "0")

if [ "$MENU_COUNT" -ge 18 ]; then
  print_success "Datos de prueba cargados ($MENU_COUNT items en menú)"
elif [ "$MENU_COUNT" -gt 0 ]; then
  print_warn "Datos parciales: $MENU_COUNT items en menú (esperábamos 18)"
else
  print_warn "No se detectaron datos de prueba"
fi

echo ""
print_success "✨ ¡Listo! Supabase configurado end-to-end"
echo ""
echo "Próximos pasos:"
echo "  1. Verificá en Supabase → Table Editor las 12 tablas"
echo "  2. Ejecutá: cd backend && npm run dev"
echo "  3. Probá: curl http://localhost:3000/api/health | jq"
echo ""
