#!/bin/bash

##############################################################################
#  SCRIPT PARA COPIAR SQL A SUPABASE
#  
#  Este script prepara los archivos SQL para copiar-pegar en Supabase
#  UI (SQL Editor)
#
#  Uso: ./scripts/prepare-sql-for-supabase.sh
##############################################################################

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$PROJECT_ROOT/supabase/migrations"

echo "📋 Preparando archivos SQL para Supabase..."
echo ""

# SCHEMA
SCHEMA_FILE="$MIGRATIONS_DIR/20250115000000_initial_schema.sql"
if [ -f "$SCHEMA_FILE" ]; then
    echo "✅ Schema SQL:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    wc -l "$SCHEMA_FILE"
    echo ""
    echo "📌 Archivo: $SCHEMA_FILE"
    echo ""
else
    echo "❌ Schema SQL no encontrado: $SCHEMA_FILE"
fi

# SEED
SEED_FILE="$MIGRATIONS_DIR/20250115000001_seed_data.sql"
if [ -f "$SEED_FILE" ]; then
    echo "✅ Seed Data SQL:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    wc -l "$SEED_FILE"
    echo ""
    echo "📌 Archivo: $SEED_FILE"
    echo ""
else
    echo "❌ Seed Data SQL no encontrado: $SEED_FILE"
fi

echo ""
echo "📋 INSTRUCCIONES:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "1. Ve a https://app.supabase.com → Tu proyecto → SQL Editor"
echo ""
echo "2. Click en 'New query' y copia TODO el contenido de:"
echo "   $SCHEMA_FILE"
echo ""
echo "3. Click en 'Run' → Deberías ver: ✅ Success"
echo ""
echo "4. Click en 'New query' y copia TODO el contenido de:"
echo "   $SEED_FILE"
echo ""
echo "5. Click en 'Run' → Deberías ver: ✅ Success"
echo ""
echo "6. Verifica en 'Table Editor' que las 6 tablas existen"
echo ""
