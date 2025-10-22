#!/bin/bash

##############################################################################
#  SCRIPT DE CONFIGURACIÓN SUPABASE - SIST_PIZZA
#  
#  Este script automatiza la configuración completa de Supabase:
#  1. Solicita credenciales del usuario
#  2. Valida las credenciales
#  3. Actualiza .env
#  4. Prueba la conexión
#  5. Genera comandos SQL para ejecutar manualmente
#
#  Uso: ./scripts/setup-supabase-interactive.sh
##############################################################################

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$PROJECT_ROOT/backend"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  🔧 CONFIGURACIÓN SUPABASE - SIST_PIZZA                   ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

##############################################################################
# PASO 1: Solicitar Credenciales
##############################################################################

echo -e "${YELLOW}📋 PASO 1: Ingresa las credenciales de Supabase${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "Obtén estos valores en: https://app.supabase.com → tu proyecto → Settings → API"
echo ""

# SUPABASE_URL
read -p "📍 Ingresa SUPABASE_URL (ej: https://xxxxx.supabase.co): " SUPABASE_URL

if [[ ! "$SUPABASE_URL" =~ ^https://.*\.supabase\.co$ ]]; then
    echo -e "${RED}❌ Error: URL no válida${NC}"
    exit 1
fi

# ANON_KEY
echo ""
read -sp "🔑 Ingresa SUPABASE_ANON_KEY (públic key, invisible al escribir): " SUPABASE_ANON_KEY
echo ""

if [ -z "$SUPABASE_ANON_KEY" ]; then
    echo -e "${RED}❌ Error: Anon key no puede estar vacía${NC}"
    exit 1
fi

# SERVICE_ROLE_KEY
echo ""
read -sp "🔑 Ingresa SUPABASE_SERVICE_ROLE_KEY (secret key, invisible al escribir): " SUPABASE_SERVICE_ROLE_KEY
echo ""

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
    echo -e "${RED}❌ Error: Service role key no puede estar vacía${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Credenciales ingresadas${NC}"
echo ""

##############################################################################
# PASO 2: Validar Credenciales
##############################################################################

echo -e "${YELLOW}🧪 PASO 2: Validando credenciales...${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Crear archivo temporal con Node.js para validar
cat > /tmp/validate-supabase.mjs << 'VALIDATE_SCRIPT'
import { createClient } from '@supabase/supabase-js';

const url = process.argv[1];
const anonKey = process.argv[2];
const serviceRoleKey = process.argv[3];

try {
  const supabase = createClient(url, serviceRoleKey);
  
  const { data, error } = await supabase
    .from('information_schema.tables')
    .select('*')
    .limit(1);
  
  if (error && error.code !== 'PGRST116') {
    console.error('ERROR:', error.message);
    process.exit(1);
  }
  
  console.log('SUCCESS');
  process.exit(0);
} catch (err) {
  console.error('ERROR:', err.message);
  process.exit(1);
}
VALIDATE_SCRIPT

# Intentar validar
if command -v node &> /dev/null; then
    VALIDATION=$(node /tmp/validate-supabase.mjs "$SUPABASE_URL" "$SUPABASE_ANON_KEY" "$SUPABASE_SERVICE_ROLE_KEY" 2>&1 || echo "ERROR")
    
    if [[ "$VALIDATION" == "SUCCESS" ]]; then
        echo -e "${GREEN}✅ Credenciales validadas correctamente${NC}"
    else
        echo -e "${YELLOW}⚠️  No se pudo validar en línea, pero continuaremos${NC}"
        echo "   (Las credenciales se validarán después de actualizar .env)"
    fi
else
    echo -e "${YELLOW}⚠️  Node.js no disponible para validación, continuaremos${NC}"
fi

echo ""

##############################################################################
# PASO 3: Actualizar .env
##############################################################################

echo -e "${YELLOW}📝 PASO 3: Actualizando .env${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Backup del .env actual
if [ -f "$BACKEND_DIR/.env" ]; then
    BACKUP_FILE="$BACKEND_DIR/.env.backup.$(date +%s)"
    cp "$BACKEND_DIR/.env" "$BACKUP_FILE"
    echo -e "${GREEN}✅ Backup creado: $BACKUP_FILE${NC}"
fi

# Crear/actualizar .env
ENV_FILE="$BACKEND_DIR/.env"

# Si no existe, crear con defaults
if [ ! -f "$ENV_FILE" ]; then
    cat > "$ENV_FILE" << EOF
# Supabase Configuration
SUPABASE_URL=${SUPABASE_URL}
SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}

# Claude Configuration (Opcional)
ANTHROPIC_API_KEY=sk-ant-v1-test-key-for-development-only
CLAUDE_MODEL=claude-3-5-sonnet-20241022

# Server Configuration
NODE_ENV=development
PORT=4000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4000

# Database Configuration
DB_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef

# Logging
LOG_LEVEL=info

# Redis (Optional)
REDIS_URL=redis://localhost:6379

# MODO Payments (Optional)
MODO_API_KEY=test-key
MODO_SECRET_KEY=test-secret

# Chatwoot (Optional)
CHATWOOT_API_KEY=
CHATWOOT_BASE_URL=

# N8N (Optional)
N8N_API_URL=http://localhost:5678

# WAHA WhatsApp (Optional)
WAHA_API_KEY=test-key
EOF
else
    # Actualizar variables existentes
    sed -i.bak "s|^SUPABASE_URL=.*|SUPABASE_URL=${SUPABASE_URL}|" "$ENV_FILE"
    sed -i.bak "s|^SUPABASE_ANON_KEY=.*|SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}|" "$ENV_FILE"
    sed -i.bak "s|^SUPABASE_SERVICE_ROLE_KEY=.*|SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}|" "$ENV_FILE"
    
    # Limpiar archivos .bak
    rm -f "$ENV_FILE.bak"*
fi

echo -e "${GREEN}✅ Archivo .env actualizado: $ENV_FILE${NC}"
echo ""
echo "Variables guardadas:"
echo "  - SUPABASE_URL: ${SUPABASE_URL:0:30}..."
echo "  - SUPABASE_ANON_KEY: ${SUPABASE_ANON_KEY:0:20}..."
echo "  - SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_SERVICE_ROLE_KEY:0:20}..."
echo ""

##############################################################################
# PASO 4: Generar Comandos SQL para Copiar-Pegar
##############################################################################

echo -e "${YELLOW}📋 PASO 4: Preparando migraciones SQL${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

MIGRATIONS_DIR="$PROJECT_ROOT/supabase/migrations"

if [ ! -d "$MIGRATIONS_DIR" ]; then
    echo -e "${RED}❌ Directorio de migraciones no encontrado: $MIGRATIONS_DIR${NC}"
    exit 1
fi

# Archivos de migración esperados
SCHEMA_FILE="$MIGRATIONS_DIR/20250115000000_initial_schema.sql"
SEED_FILE="$MIGRATIONS_DIR/20250115000001_seed_data.sql"

echo -e "${BLUE}Migraciones encontradas:${NC}"

if [ -f "$SCHEMA_FILE" ]; then
    echo "  ✅ Schema: $(wc -l < "$SCHEMA_FILE") líneas"
else
    echo "  ❌ Schema no encontrado"
fi

if [ -f "$SEED_FILE" ]; then
    echo "  ✅ Seed Data: $(wc -l < "$SEED_FILE") líneas"
else
    echo "  ❌ Seed Data no encontrado"
fi

echo ""

##############################################################################
# PASO 5: Crear Script de Ejecución Manual en Supabase
##############################################################################

echo -e "${YELLOW}🔐 PASO 5: Instrucciones para ejecutar SQL en Supabase${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

cat > /tmp/SUPABASE_SQL_INSTRUCTIONS.txt << EOF
╔════════════════════════════════════════════════════════════╗
║  📋 INSTRUCCIONES PARA EJECUTAR SQL EN SUPABASE             ║
╚════════════════════════════════════════════════════════════╝

📍 UBICACIÓN EN SUPABASE:
   https://app.supabase.com → Tu proyecto → SQL Editor

🔧 PASO A PASO:

1️⃣  CREAR SCHEMA (Tablas)
   ─────────────────────────────────────────────────────────
   → Click en "New query"
   → Copia y pega el contenido de:
      $SCHEMA_FILE
   → Click en "Run" (o Ctrl+Enter)
   → Deberías ver: ✅ "Success. No rows returned"

2️⃣  INSERTAR DATOS DE PRUEBA (Seed)
   ─────────────────────────────────────────────────────────
   → Click en "New query"
   → Copia y pega el contenido de:
      $SEED_FILE
   → Click en "Run"
   → Deberías ver: ✅ "Success. No rows returned"

3️⃣  VERIFICAR TABLAS
   ─────────────────────────────────────────────────────────
   → Ve a "Table Editor" (menú izquierdo)
   → Deberías ver 6 tablas:
      ✓ audit_logs
      ✓ clientes
      ✓ detalle_pedidos
      ✓ menu_items
      ✓ pedidos
      ✓ zonas_entrega

4️⃣  VERIFICAR DATOS
   ─────────────────────────────────────────────────────────
   → Abre tabla "menu_items" → 18 filas
   → Abre tabla "clientes" → 5 filas
   → Abre tabla "zonas_entrega" → 3 filas

✅ Si todo está bien, continúa con el siguiente paso.
EOF

cat /tmp/SUPABASE_SQL_INSTRUCTIONS.txt
echo ""

##############################################################################
# PASO 6: Crear Script de Test Local
##############################################################################

echo -e "${YELLOW}🧪 PASO 6: Preparando script de test${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

TEST_SCRIPT="$BACKEND_DIR/test-supabase-connection.js"

cat > "$TEST_SCRIPT" << 'TEST_SCRIPT_CONTENT'
#!/usr/bin/env node

/**
 * Script para validar conexión a Supabase
 * Uso: node test-supabase-connection.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Error: Variables de entorno no configuradas');
  console.error('   Verifica que .env tenga SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  console.log('🔌 Conectando a Supabase...');
  console.log(`   URL: ${SUPABASE_URL}`);
  console.log('');

  try {
    // Test 1: Conexión básica
    console.log('📌 Test 1: Conexión básica');
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .limit(10);

    if (tablesError && tablesError.code !== 'PGRST116') {
      throw new Error(`Error de conexión: ${tablesError.message}`);
    }
    console.log('✅ Conexión exitosa');
    console.log('');

    // Test 2: Verificar tablas
    console.log('📌 Test 2: Tablas en la base de datos');
    const { data: allTables } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');

    const expectedTables = ['clientes', 'menu_items', 'pedidos', 'detalle_pedidos', 'zonas_entrega', 'audit_logs'];
    const actualTables = (allTables || []).map(t => t.table_name);

    let allFound = true;
    for (const table of expectedTables) {
      if (actualTables.includes(table)) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} (NO ENCONTRADA)`);
        allFound = false;
      }
    }

    if (!allFound) {
      console.log('');
      console.log('⚠️  Algunas tablas no existen.');
      console.log('    Ejecuta las migraciones SQL en Supabase primero.');
      process.exit(1);
    }
    console.log('');

    // Test 3: Consultar datos
    console.log('📌 Test 3: Consultar datos de ejemplo');
    const { data: menuItems, error: menuError } = await supabase
      .from('menu_items')
      .select('id, nombre, categoria, precio')
      .limit(5);

    if (menuError) {
      throw new Error(`Error al consultar menu_items: ${menuError.message}`);
    }

    console.log(`   Encontrados ${menuItems?.length || 0} items de menú:`);
    (menuItems || []).forEach((item, i) => {
      console.log(`   ${i + 1}. ${item.nombre} (${item.categoria}) - $${item.precio}`);
    });
    console.log('');

    // Test 4: Contar registros
    console.log('📌 Test 4: Estadísticas de datos');
    const tables = {
      clientes: 0,
      menu_items: 0,
      pedidos: 0,
      zonas_entrega: 0,
    };

    for (const [table] of Object.entries(tables)) {
      const { count } = await supabase
        .from(table)
        .select('*', { count: 'exact' });
      tables[table] = count || 0;
      console.log(`   ${table}: ${tables[table]} registros`);
    }
    console.log('');

    console.log('✅ ¡Todos los tests pasaron correctamente!');
    console.log('');
    console.log('🚀 Próximos pasos:');
    console.log('   1. Inicia el backend: npm run dev');
    console.log('   2. Verifica health check: curl http://localhost:4000/api/health');
    console.log('   3. Prueba el webhook N8N: ./scripts/test-webhook.sh');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('');
    console.error('Troubleshooting:');
    console.error('  • Verifica que el proyecto Supabase está creado');
    console.error('  • Revisa que las credenciales en .env son correctas');
    console.error('  • Asegúrate de ejecutar las migraciones SQL primero');
    process.exit(1);
  }
}

test();
TEST_SCRIPT_CONTENT

chmod +x "$TEST_SCRIPT"
echo -e "${GREEN}✅ Script de test creado: $TEST_SCRIPT${NC}"
echo ""

##############################################################################
# PASO 7: Crear Script para Iniciar Backend
##############################################################################

echo -e "${YELLOW}🚀 PASO 7: Preparando inicio del backend${NC}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

START_SCRIPT="$BACKEND_DIR/start-dev.sh"

cat > "$START_SCRIPT" << 'START_SCRIPT_CONTENT'
#!/bin/bash

# Script para iniciar el backend en modo desarrollo

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$BACKEND_DIR"

# Verificar que .env existe
if [ ! -f ".env" ]; then
    echo "❌ Error: Archivo .env no encontrado"
    echo "   Ejecuta primero: ./scripts/setup-supabase-interactive.sh"
    exit 1
fi

# Verificar que node_modules existe
if [ ! -d "node_modules" ]; then
    echo "📦 Instalando dependencias..."
    npm install
fi

echo "🚀 Iniciando backend en modo desarrollo..."
echo ""
echo "   URL: http://localhost:4000"
echo "   Health: http://localhost:4000/api/health"
echo ""
echo "Presiona Ctrl+C para detener"
echo ""

npm run dev
START_SCRIPT_CONTENT

chmod +x "$START_SCRIPT"
echo -e "${GREEN}✅ Script de inicio creado: $START_SCRIPT${NC}"
echo ""

##############################################################################
# PASO 8: Resumen Final
##############################################################################

echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  ✅ CONFIGURACIÓN COMPLETADA                              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

cat > /tmp/SETUP_SUMMARY.txt << EOF
📋 RESUMEN DE LA CONFIGURACIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✅ Archivos Actualizados:
   • $ENV_FILE
   • $TEST_SCRIPT
   • $START_SCRIPT

📝 PRÓXIMOS PASOS (IMPORTANTES):

1️⃣  EJECUTAR SQL EN SUPABASE
   ─────────────────────────────────────────────────────────
   INSTRUCCIONES en: /tmp/SUPABASE_SQL_INSTRUCTIONS.txt
   
   O copiar desde:
   • Schema: $SCHEMA_FILE
   • Seed:   $SEED_FILE

2️⃣  TESTEAR CONEXIÓN LOCAL
   ─────────────────────────────────────────────────────────
   $ cd $BACKEND_DIR
   $ node test-supabase-connection.js

3️⃣  INICIAR BACKEND
   ─────────────────────────────────────────────────────────
   $ cd $BACKEND_DIR
   $ npm run dev
   
   O usar script:
   $ ./start-dev.sh

4️⃣  VERIFICAR HEALTH CHECK
   ─────────────────────────────────────────────────────────
   En otra terminal:
   $ curl -s http://localhost:4000/api/health | jq

5️⃣  TESTEAR WEBHOOK N8N
   ─────────────────────────────────────────────────────────
   $ curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
     -H "Content-Type: application/json" \
     -d '{"cliente":{"nombre":"Test","telefono":"2262999999","direccion":"Test"},"items":[{"nombre":"Muzzarella","cantidad":1}],"origen":"whatsapp"}'

🎯 VERIFICACIÓN:
   ✅ .env actualizado con credenciales Supabase
   ✅ Scripts de test y inicio preparados
   ✅ Instrucciones SQL generadas

📌 IMPORTANTE:
   • Aún debes ejecutar las migraciones SQL manualmente en Supabase
   • Las credenciales están guardadas en $ENV_FILE
   • Mantén el .env seguro (no lo commits a Git)

╔════════════════════════════════════════════════════════════╗
║  🔐 CREDENCIALES GUARDADAS LOCALMENTE                     ║
║     NUNCA compartas tu .env o archivos de backup            ║
╚════════════════════════════════════════════════════════════╝
EOF

cat /tmp/SETUP_SUMMARY.txt

echo ""
echo -e "${GREEN}✨ ¡Setup completado! Continúa con los pasos anteriores.${NC}"
echo ""
