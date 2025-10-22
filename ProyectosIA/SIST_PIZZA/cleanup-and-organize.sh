#!/bin/bash

################################################################################
#                                                                              #
#        📦 SIST_PIZZA - SCRIPT DE LIMPIEZA Y REORGANIZACIÓN AUTOMATIZADA    #
#                                                                              #
#                  Mueve archivos deprecated a .docs-deprecated/             #
#                                                                              #
################################################################################

set -e  # Salir si hay error

echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║         🧹 LIMPIEZA Y REORGANIZACIÓN AUTOMÁTICA DEL PROYECTO           ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""

PROJECT_ROOT="/home/eevan/ProyectosIA/SIST_PIZZA"
DEPRECATED_DIR="$PROJECT_ROOT/.docs-deprecated"
ARCHIVE_DIR="$PROJECT_ROOT/.docs-archive"

# Crear directorios si no existen
mkdir -p "$DEPRECATED_DIR"
mkdir -p "$ARCHIVE_DIR"

echo "📂 Directorio de deprecated: $DEPRECATED_DIR"
echo "📂 Directorio de archivo: $ARCHIVE_DIR"
echo ""

# Archivos a mover a .docs-deprecated (por ser obsoletos)
echo "📋 ARCHIVOS A DEPRECAR (obsoletos, duplicados):"
echo "─────────────────────────────────────────────"

deprecated_files=(
    "EMPEZAR_AQUI.md"
    "START_HERE.md"
    "RESUMEN_VISUAL.md"
    "GUIA_INICIO_RAPIDO.md"
    "STATUS_FINAL.md"
    "NEXT_STEPS.md"
    "INDICE.md"
    "RESUMEN_EJECUTIVO_OLD.md"
    "FASE_1_PLAN.md"
    "FASE_2_PLAN.md"
    "FASE_3_PLAN.md"
    "FASE_4_PLAN.md"
    "FASE_5_PLAN.md"
    "SUBPLAN_PARTE1.md"
    "SUBPLAN_PARTE2.md"
    "RESUMEN_FASE_1.md"
    "RESUMEN_PROGRESO.md"
    "RESUMEN_AUTOMATIZACION.md"
    "DASHBOARD_FINAL.md"
    "MAPA_RUTAS.md"
    "PROXIMO_PASO.md"
    "SETUP_RESUMEN.md"
    "DATABASE_SETUP.md"
    "GUIA_SUPABASE_SETUP.md"
    "GUIA_MODULO1_CANALES.md"
    "GUIA_COMPLETA_SQL.md"
    "REFERENCIA_HERRAMIENTAS.md"
    "ANALISIS_OPTIMIZACION.md"
    "ANALISIS_PROYECTO.md"
    "QUICK_WINS_TESTS.md"
    "SQL_LISTA_PARA_COPIAR.md"
    "RESUMEN_ARCHIVOS_SQL.txt"
    "BLUEPRINT_EJECUTABLE.md"
    "COMPLETION_SUMMARY.md"
    "PROJECT_SUMMARY.md"
    "ARQUITECTURA_MODULAR_V2.md"
    "COMMIT_SUMMARY.txt"
    "PROMPTS_COPILOT.txt"
    "WEBHOOK_TESTING_GUIDE.md"
    "BACKEND_API.md"
    "COMANDOS_MODULO3.md"
)

count=0
for file in "${deprecated_files[@]}"; do
    filepath="$PROJECT_ROOT/$file"
    if [ -f "$filepath" ]; then
        echo "  ✓ Moviendo: $file"
        mv "$filepath" "$DEPRECATED_DIR/" 2>/dev/null || echo "    ⚠️  No se pudo mover (posiblemente no existe)"
        ((count++))
    fi
done

echo ""
echo "✅ Movidos $count archivos a .docs-deprecated/"
echo ""

# Archivos a archivar en .docs-archive (para referencia histórica)
echo "📋 ARCHIVOS HISTÓRICOS A ARCHIVAR:"
echo "─────────────────────────────────"

archive_files=(
    "RESUMEN_EJECUTIVO.md"
    "INDICE_DOCUMENTACION.md"
    "README_DOCUMENTACION.md"
    "CIERRE_SESION_2.md"
)

count=0
for file in "${archive_files[@]}"; do
    filepath="$PROJECT_ROOT/$file"
    if [ -f "$filepath" ]; then
        echo "  ✓ Archivando: $file"
        mv "$filepath" "$ARCHIVE_DIR/" 2>/dev/null || echo "    ⚠️  No se pudo archivar"
        ((count++))
    fi
done

echo ""
echo "✅ Archivados $count archivos en .docs-archive/"
echo ""

# Organizando archivos SQL en docs/03-setup-sql/
echo "📋 ORGANIZANDO ARCHIVOS SQL:"
echo "─────────────────────────────"

sql_files=(
    "PASO_2_SCHEMA_SQL.txt"
    "PASO_3_SEED_DATA_SQL.txt"
    "CREAR_ZONAS_ENTREGA.sql"
    "CREAR_TABLA_ZONAS.sql"
)

for file in "${sql_files[@]}"; do
    filepath="$PROJECT_ROOT/$file"
    if [ -f "$filepath" ]; then
        echo "  ✓ Copiando: $file → docs/03-setup-sql/"
        cp "$filepath" "$PROJECT_ROOT/docs/03-setup-sql/" 2>/dev/null && echo "    ✅ Copiado" || echo "    ⚠️  Fallo"
    fi
done

echo ""

# Copia archivos críticos a docs/02-arquitectura/
echo "📋 ORGANIZANDO ARQUITECTURA:"
echo "─────────────────────────────"

arch_files=(
    "ARQUITECTURA_COMPLETA.md"
    "E2E_FLOWS.md"
    "openapi.yaml"
)

for file in "${arch_files[@]}"; do
    filepath="$PROJECT_ROOT/$file"
    if [ -f "$filepath" ]; then
        echo "  ✓ Copiando: $file → docs/02-arquitectura/"
        cp "$filepath" "$PROJECT_ROOT/docs/02-arquitectura/" 2>/dev/null && echo "    ✅ Copiado" || echo "    ⚠️  Fallo"
    fi
done

echo ""

# Copia archivos de testing a docs/04-testing/
echo "📋 ORGANIZANDO TESTING:"
echo "──────────────────────"

test_files=(
    "RUTA_TESTS_PLAN.md"
    "INTEGRACIÓN_E2E_TESTING.md"
)

for file in "${test_files[@]}"; do
    filepath="$PROJECT_ROOT/$file"
    if [ -f "$filepath" ]; then
        echo "  ✓ Copiando: $file → docs/04-testing/"
        cp "$filepath" "$PROJECT_ROOT/docs/04-testing/" 2>/dev/null && echo "    ✅ Copiado" || echo "    ⚠️  Fallo"
    fi
done

echo ""

# Copia archivos de deployment a docs/05-deployment/
echo "📋 ORGANIZANDO DEPLOYMENT:"
echo "─────────────────────────"

deploy_files=(
    "RUTA_DOCKER_PLAN.md"
)

for file in "${deploy_files[@]}"; do
    filepath="$PROJECT_ROOT/$file"
    if [ -f "$filepath" ]; then
        echo "  ✓ Copiando: $file → docs/05-deployment/"
        cp "$filepath" "$PROJECT_ROOT/docs/05-deployment/" 2>/dev/null && echo "    ✅ Copiado" || echo "    ⚠️  Fallo"
    fi
done

echo ""

# Ahora copia archivos de ejecución SQL en docs/03-setup-sql/
echo "📋 COPIANDO GUÍA SQL:"
echo "───────────────────"

if [ -f "$PROJECT_ROOT/EJECUTAR_SQL_AHORA.md" ]; then
    echo "  ✓ Copiando EJECUTAR_SQL_AHORA.md"
    cp "$PROJECT_ROOT/EJECUTAR_SQL_AHORA.md" "$PROJECT_ROOT/docs/03-setup-sql/" 2>/dev/null && echo "    ✅ Copiado" || echo "    ⚠️  Fallo"
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════════════════╗"
echo "║                     ✅ LIMPIEZA COMPLETADA                              ║"
echo "╚══════════════════════════════════════════════════════════════════════════╝"
echo ""

echo "📊 RESUMEN FINAL:"
echo "─────────────────"
echo "  • Archivos deprecated: $(ls -1 "$DEPRECATED_DIR" | wc -l) archivos"
echo "  • Archivos históricos: $(ls -1 "$ARCHIVE_DIR" | wc -l) archivos"
echo "  • Documentación activa: docs/ reorganizada"
echo ""

echo "📝 PRÓXIMOS PASOS:"
echo "──────────────────"
echo "  1. Revisa: docs/01-inicio/INDEX.md"
echo "  2. Lee: MASTER_BLUEPRINT.md"
echo "  3. Ejecuta: docs/03-setup-sql/EJECUTAR_SQL_AHORA.md"
echo ""

echo "🚀 ¡TODO LISTO PARA CONTINUAR!"
echo ""
