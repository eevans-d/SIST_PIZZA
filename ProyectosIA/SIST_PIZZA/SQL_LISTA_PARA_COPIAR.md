╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              📋 TODOS LOS SQL LISTOS PARA COPIAR EN SUPABASE                ║
║                                                                              ║
║                  SOLO COPIA Y PEGA EN SUPABASE SQL EDITOR                   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
🚀 EJECUCIÓN RÁPIDA (RECOMENDADO)
═══════════════════════════════════════════════════════════════════════════════

Si YA EJECUTASTE PASO_2 + PASO_3 (crear tablas + seed data), SOLO ejecuta:

👉 QUERY #1 en Supabase SQL Editor:
   Copiar → todo el código SQL bajo "NUEVA TABLA: zonas_entrega" → Pegar → Run

Si NO ejecutaste PASO_2 + PASO_3 aún:
   1. Primero ejecuta PASO_2_SCHEMA_SQL.txt
   2. Luego ejecuta PASO_3_SEED_DATA_SQL.txt
   3. Luego ejecuta el SQL de zonas_entrega (abajo)

═══════════════════════════════════════════════════════════════════════════════
SQL QUERY #1: NUEVA TABLA - zonas_entrega (TABLA PARA COSTO DINÁMICO)
═══════════════════════════════════════════════════════════════════════════════

COPIA DESDE LA SIGUIENTE LÍNEA HASTA "END SQL QUERY #1":

-- ============================================================================
-- AGREGAR TABLA: zonas_entrega
-- ============================================================================
-- Esta tabla permite calcular dinámicamente el costo de envío basado en
-- la dirección del cliente (NUEVA - AGREGADA EN SESIÓN 2)
-- ============================================================================

-- 1. Crear tabla zonas_entrega
CREATE TABLE IF NOT EXISTS zonas_entrega (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  palabras_clave VARCHAR(500) NOT NULL,
  costo_base DECIMAL(10,2) NOT NULL DEFAULT 500,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_zonas_entrega_activo ON zonas_entrega(activo);

-- 3. Insertar zonas de ejemplo
INSERT INTO zonas_entrega (nombre, palabras_clave, costo_base, descripcion)
VALUES
  ('Centro', 'centro,céntro,downtown', 300, 'Centro de la ciudad'),
  ('Zona Norte', 'norte,san,barrio,villa,flores', 500, 'Área norte'),
  ('Zona Sur', 'sur,villa,lugano,flores', 600, 'Área sur'),
  ('Zona Oeste', 'oeste,moreno,mataderos,liniers', 700, 'Área oeste'),
  ('Zona Este', 'este,san cristóbal,san,la boca,caballito', 550, 'Área este')
ON CONFLICT DO NOTHING;

-- 4. Verificación
SELECT COUNT(*) as total_zonas FROM zonas_entrega WHERE activo = true;

-- END SQL QUERY #1

═══════════════════════════════════════════════════════════════════════════════
⏱️ PROCESO PASO A PASO
═══════════════════════════════════════════════════════════════════════════════

PASO 1: Seleccionar el SQL
├─ Comienza desde: -- ============================================================================
└─ Termina antes de: -- END SQL QUERY #1

PASO 2: Copiar (Ctrl+C o Cmd+C)

PASO 3: Ir a Supabase
├─ URL: https://supabase.com/dashboard/project/htvlwhisjpdagqkqnpxg/sql
└─ Click en "New query" (botón azul arriba)

PASO 4: Pegar (Ctrl+V o Cmd+V)

PASO 5: Ejecutar
├─ Click en "Run" (botón de play azul)
├─ O presiona: Ctrl+Enter
└─ Espera 5-10 segundos

PASO 6: Verificar resultado
├─ Deberías ver: ✅ "Success. No rows returned"
├─ O si tiene datos: ✅ "5 rows inserted"
└─ En ambos casos es CORRECTO

═══════════════════════════════════════════════════════════════════════════════
🔍 VALIDACIÓN - CONFIRMAR QUE FUNCIONÓ
═══════════════════════════════════════════════════════════════════════════════

EN SUPABASE:
1. Ve a "Table Editor" (menú izquierdo)
2. Deberías ver tabla "zonas_entrega" en la lista
3. Click en ella
4. Deberías ver 5 filas:
   - Centro (300)
   - Zona Norte (500)
   - Zona Sur (600)
   - Zona Oeste (700)
   - Zona Este (550)

EN TERMINAL (para confirmar backend conecta):
  curl http://localhost:4000/api/health/ready | jq .

Resultado esperado:
  {
    "ready": true,
    "timestamp": "2025-10-22T..."
  }

═══════════════════════════════════════════════════════════════════════════════
📝 NOTAS IMPORTANTES
═══════════════════════════════════════════════════════════════════════════════

✅ IMPORTANTE: Si ves error "duplicate key" es NORMAL
   • Significa que los datos ya existen
   • La tabla se crea correctamente
   • Continúa sin problema

✅ La tabla zonas_entrega es:
   • Pequeña (solo 5 filas)
   • Rápida (tiene índice en "activo")
   • Fácil de actualizar (agregar más zonas)

✅ Cómo funciona el sistema ahora:
   1. Usuario envía pedido con dirección "Zona Norte"
   2. Backend busca en zonas_entrega
   3. Encuentra coincidencia → Costo = $500
   4. Calcula total: subtotal + 500
   5. Guarda en BD

═══════════════════════════════════════════════════════════════════════════════
🎯 DESPUÉS DE EJECUTAR EL SQL
═══════════════════════════════════════════════════════════════════════════════

Una vez confirmado que funcionó:

1. Vuelve a la terminal
2. Ejecuta: npm run dev (si no está corriendo backend)
3. Prueba un webhook:

   curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
     -H "Content-Type: application/json" \
     -d '{
       "cliente": {"nombre": "Test", "telefono": "1234567890", "direccion": "Centro"},
       "items": [{"nombre": "Pizza Clásica", "cantidad": 1}],
       "notas": "Sin cebolla"
     }' | jq .total

   Resultado esperado: total incluye costo $300 (no $500)

4. Prueba con otra dirección:

   curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
     -H "Content-Type: application/json" \
     -d '{
       "cliente": {"nombre": "Test2", "telefono": "9876543210", "direccion": "Moreno 1234"},
       "items": [{"nombre": "Pizza Clásica", "cantidad": 1}],
       "notas": "Sin cebolla"
     }' | jq .total

   Resultado esperado: total incluye costo $700 (Zona Oeste)

═══════════════════════════════════════════════════════════════════════════════
❓ ¿LISTO PARA EJECUTAR?
═══════════════════════════════════════════════════════════════════════════════

1. Copia el SQL de arriba
2. Ejecuta en Supabase
3. Verifica en Table Editor
4. Vuelve y escribe: "LISTO" o "CONTINUAR"

Espero tu confirmación...

═══════════════════════════════════════════════════════════════════════════════
