╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                   🔧 WEBHOOK TESTING - SIST_PIZZA BACKEND                     ║
║                                                                              ║
║                        Guía Completa de Testing                              ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
📋 RESUMEN GENERAL
═══════════════════════════════════════════════════════════════════════════════

El webhook `POST /api/webhooks/n8n/pedido` es el punto de entrada principal para:
- Recibir pedidos desde N8N (procesados con Claude)
- Crear nuevo cliente si no existe (por teléfono)
- Buscar items del menú con fuzzy matching
- Calcular totales e insertar en Supabase
- Retornar confirmación a N8N

Endpoint: http://localhost:4000/api/webhooks/n8n/pedido
Método: POST
Content-Type: application/json

═══════════════════════════════════════════════════════════════════════════════
🎯 CASOS DE TEST
═══════════════════════════════════════════════════════════════════════════════

Tenemos 10 casos de test separados en diferentes niveles:

NIVEL 1 - HAPPY PATH (Lo que debería funcionar)
  ✓ Test 1: Pedido básico válido
  ✓ Test 2: Cliente nuevo + múltiples items
  ✓ Test 3: Con notas especiales
  ✓ Test 4: Producto fuzzy match (mayúscula vs minúscula)

NIVEL 2 - EDGE CASES (Situaciones límite)
  ✓ Test 5: Cliente existente (reutilizar)
  ✓ Test 6: Cantidad grande
  ✓ Test 7: Sin nombre del cliente (se genera automático)
  ✓ Test 8: Origen diferente (telegram, web, phone)

NIVEL 3 - ERROR CASES (Que deberían fallar gracefully)
  ✗ Test 9: Teléfono inválido
  ✗ Test 10: Item no existe
  ✗ Test 11: Dirección muy corta
  ✗ Test 12: Array de items vacío

═══════════════════════════════════════════════════════════════════════════════
✅ TEST 1: PEDIDO BÁSICO VÁLIDO
═══════════════════════════════════════════════════════════════════════════════

**Descripción:** Crear un pedido simple con cliente nuevo, 1 item válido

```bash
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test User 1",
      "telefono": "2262401001",
      "direccion": "Calle Test 123, Necochea"
    },
    "items": [
      {"nombre": "Muzzarella", "cantidad": 1}
    ],
    "origen": "whatsapp"
  }' | jq .
```

**Esperado (200 OK):**
```json
{
  "success": true,
  "pedido_id": "a3b5c7d9-1234-...",
  "total": 4000,
  "subtotal": 3500,
  "costo_envio": 500,
  "mensaje": "Pedido #a3b5c7d9 creado. Total: $4000. Tiempo estimado: 30-40 min."
}
```

**Validación:**
- [ ] success = true
- [ ] pedido_id es UUID válido (36 chars)
- [ ] total = subtotal + 500
- [ ] mensaje contiene ID corto (8 chars)
- [ ] Status: 200 OK

**Verificación en Supabase:**
```bash
# Ver pedido creado
SELECT * FROM pedidos WHERE id = '{pedido_id}' LIMIT 1;

# Ver detalles
SELECT * FROM detalle_pedidos WHERE pedido_id = '{pedido_id}';

# Ver cliente
SELECT * FROM clientes WHERE telefono = '2262401001' LIMIT 1;
```

═══════════════════════════════════════════════════════════════════════════════
✅ TEST 2: CLIENTE NUEVO + MÚLTIPLES ITEMS
═══════════════════════════════════════════════════════════════════════════════

**Descripción:** Pedido con 3 items diferentes, cliente nuevo

```bash
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "María García",
      "telefono": "2262401002",
      "direccion": "Av. 79 #500, Necochea"
    },
    "items": [
      {"nombre": "Muzzarella", "cantidad": 2},
      {"nombre": "Calabresa", "cantidad": 1},
      {"nombre": "Coca Cola", "cantidad": 2}
    ],
    "origen": "whatsapp"
  }' | jq .
```

**Esperado (200 OK):**
```json
{
  "success": true,
  "pedido_id": "b4c6d8e0-2345-...",
  "total": 10500,
  "subtotal": 10000,
  "costo_envio": 500,
  "mensaje": "Pedido #b4c6d8e0 creado. Total: $10500. Tiempo estimado: 30-40 min."
}
```

**Validación:**
- [ ] 3 items en detalle_pedidos
- [ ] Precios correctos: Muzzarella(3500*2) + Calabresa(4200) + Coca(2200*2)
- [ ] total = 7000 + 4200 + 4400 + 500 = 16100 (NOTA: revisar precios reales)
- [ ] Status: 200 OK

═══════════════════════════════════════════════════════════════════════════════
✅ TEST 3: CON NOTAS ESPECIALES
═══════════════════════════════════════════════════════════════════════════════

**Descripción:** Pedido con notas especiales (sin aceitunas, extra queso, etc)

```bash
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Juan Pérez",
      "telefono": "2262401003",
      "direccion": "Calle 50 #200, Necochea"
    },
    "items": [
      {"nombre": "Fugazzeta", "cantidad": 1}
    ],
    "notas": "Sin aceitunas, extra queso, timbre roto tocar bocina",
    "origen": "whatsapp"
  }' | jq .
```

**Esperado (200 OK):**
```json
{
  "success": true,
  "pedido_id": "c5d7e9f1-3456-...",
  "total": 4200,
  "subtotal": 3700,
  "costo_envio": 500,
  "mensaje": "Pedido #c5d7e9f1 creado. Total: $4200. Tiempo estimado: 30-40 min."
}
```

**Validación en Supabase:**
```bash
SELECT notas FROM pedidos WHERE id = '{pedido_id}';
# Debería retornar: "Sin aceitunas, extra queso, timbre roto tocar bocina"
```

═══════════════════════════════════════════════════════════════════════════════
✅ TEST 4: FUZZY MATCH - PRODUCTO (MAYÚSCULA vs MINÚSCULA)
═══════════════════════════════════════════════════════════════════════════════

**Descripción:** Sistema debe encontrar "MUZZARELLA" aunque esté en BD como "Muzzarella"

```bash
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test Fuzzy",
      "telefono": "2262401004",
      "direccion": "Calle Test 456, Necochea"
    },
    "items": [
      {"nombre": "MUZZARELLA", "cantidad": 1},
      {"nombre": "calabresa", "cantidad": 1},
      {"nombre": "Coca COLA", "cantidad": 1}
    ],
    "origen": "whatsapp"
  }' | jq .
```

**Esperado (200 OK):**
```json
{
  "success": true,
  "pedido_id": "d6e8f0g2-4567-...",
  ...
}
```

**Validación:**
- [ ] Fuzzy matching funciona (ILIKE en Supabase)
- [ ] Todos los 3 items se encuentran a pesar de mayúsculas
- [ ] Status: 200 OK

═══════════════════════════════════════════════════════════════════════════════
✅ TEST 5: CLIENTE EXISTENTE (REUTILIZAR)
═══════════════════════════════════════════════════════════════════════════════

**Descripción:** Crear pedido para cliente que ya existe (por teléfono)

```bash
# PASO 1: Crear primer pedido
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Carlos Reutilizar",
      "telefono": "2262401005",
      "direccion": "Calle Reutilizar 123"
    },
    "items": [{"nombre": "Muzzarella", "cantidad": 1}],
    "origen": "whatsapp"
  }' | jq .

# PASO 2: Crear segundo pedido (mismo teléfono)
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Otro Nombre",  # Será ignorado (cliente ya existe)
      "telefono": "2262401005",
      "direccion": "Otra dirección"  # Será ignorada también
    },
    "items": [{"nombre": "Calabresa", "cantidad": 2}],
    "origen": "whatsapp"
  }' | jq .
```

**Esperado (200 OK en ambos):**
```json
{
  "success": true,
  "pedido_id": "e7f9g1h3-5678-..."
}
```

**Validación en Supabase:**
```bash
# Debe haber solo 1 cliente con teléfono 2262401005
SELECT COUNT(*) FROM clientes WHERE telefono = '2262401005';
# Resultado esperado: 1

# Debe haber 2 pedidos para ese cliente
SELECT COUNT(*) FROM pedidos WHERE cliente_id = (
  SELECT id FROM clientes WHERE telefono = '2262401005'
);
# Resultado esperado: 2
```

═══════════════════════════════════════════════════════════════════════════════
✅ TEST 6: CANTIDAD GRANDE
═══════════════════════════════════════════════════════════════════════════════

**Descripción:** Pedido con cantidades grandes (test de cálculos)

```bash
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Empresa Pedido Grande",
      "telefono": "2262401006",
      "direccion": "Av. Empresarial 999"
    },
    "items": [
      {"nombre": "Muzzarella", "cantidad": 50},
      {"nombre": "Empanada", "cantidad": 100}
    ],
    "origen": "web"
  }' | jq .
```

**Esperado (200 OK):**
```json
{
  "success": true,
  "pedido_id": "f8g0h2i4-6789-...",
  "total": 187500,  # (3500*50) + (550*100) + 500 = 175000 + 55000 + 500
  ...
}
```

**Validación:**
- [ ] Cálculos son correctos
- [ ] Total = (3500 * 50) + (550 * 100) + 500
- [ ] Sin desbordamiento de números
- [ ] Status: 200 OK

═══════════════════════════════════════════════════════════════════════════════
✅ TEST 7: SIN NOMBRE DEL CLIENTE (SE GENERA AUTOMÁTICO)
═══════════════════════════════════════════════════════════════════════════════

**Descripción:** Sistema genera nombre automático si no se proporciona

```bash
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "telefono": "2262401007",
      "direccion": "Calle Sin Nombre 555"
    },
    "items": [
      {"nombre": "Muzzarella", "cantidad": 1}
    ],
    "origen": "whatsapp"
  }' | jq .
```

**Esperado (200 OK):**
```json
{
  "success": true,
  "pedido_id": "g9h1i3j5-7890-..."
}
```

**Validación en Supabase:**
```bash
SELECT nombre FROM clientes WHERE telefono = '2262401007';
# Debería retornar algo como: "Cliente 1007" (últimos 4 dígitos del teléfono)
```

═══════════════════════════════════════════════════════════════════════════════
✅ TEST 8: ORIGEN DIFERENTE (TELEGRAM, WEB, PHONE)
═══════════════════════════════════════════════════════════════════════════════

**Descripción:** Sistema acepta diferentes orígenes

```bash
# Test con origen: telegram
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test Telegram",
      "telefono": "2262401008",
      "direccion": "Calle Telegram 666"
    },
    "items": [{"nombre": "Muzzarella", "cantidad": 1}],
    "origen": "telegram"
  }' | jq .

# Test con origen: web
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test Web",
      "telefono": "2262401009",
      "direccion": "Calle Web 777"
    },
    "items": [{"nombre": "Muzzarella", "cantidad": 1}],
    "origen": "web"
  }' | jq .

# Test con origen: phone
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test Phone",
      "telefono": "2262401010",
      "direccion": "Calle Phone 888"
    },
    "items": [{"nombre": "Muzzarella", "cantidad": 1}],
    "origen": "phone"
  }' | jq .
```

**Esperado (200 OK en todos):**
```json
{
  "success": true,
  "pedido_id": "..."
}
```

**Validación en Supabase:**
```bash
SELECT origen FROM pedidos WHERE cliente_id IN (
  SELECT id FROM clientes WHERE telefono IN ('2262401008', '2262401009', '2262401010')
);
```

═══════════════════════════════════════════════════════════════════════════════
❌ TEST 9: TELÉFONO INVÁLIDO (DEBE FALLAR)
═══════════════════════════════════════════════════════════════════════════════

**Descripción:** Sistema rechaza teléfono con menos de 10 dígitos

```bash
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test Teléfono Corto",
      "telefono": "12345",
      "direccion": "Calle Test 123"
    },
    "items": [{"nombre": "Muzzarella", "cantidad": 1}],
    "origen": "whatsapp"
  }' | jq .
```

**Esperado (400 BAD REQUEST):**
```json
{
  "success": false,
  "error": "Teléfono inválido"  # O mensaje de validación de Zod
}
```

**Validación:**
- [ ] Status: 400 Bad Request
- [ ] error contiene "Teléfono"
- [ ] NO se creó pedido en BD

═══════════════════════════════════════════════════════════════════════════════
❌ TEST 10: ITEM NO EXISTE (DEBE FALLAR)
═══════════════════════════════════════════════════════════════════════════════

**Descripción:** Sistema rechaza item que no está en menú

```bash
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test Item Inexistente",
      "telefono": "2262401011",
      "direccion": "Calle Test 123"
    },
    "items": [
      {"nombre": "Pizza Inexistente Rarísima", "cantidad": 1}
    ],
    "origen": "whatsapp"
  }' | jq .
```

**Esperado (400 BAD REQUEST):**
```json
{
  "success": false,
  "error": "Item \"Pizza Inexistente Rarísima\" no encontrado o no disponible"
}
```

**Validación:**
- [ ] Status: 400 Bad Request
- [ ] error menciona item específico
- [ ] NO se creó pedido ni cliente en BD

═══════════════════════════════════════════════════════════════════════════════
❌ TEST 11: DIRECCIÓN MUY CORTA (DEBE FALLAR)
═══════════════════════════════════════════════════════════════════════════════

**Descripción:** Sistema rechaza dirección < 5 caracteres

```bash
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test Dirección Corta",
      "telefono": "2262401012",
      "direccion": "ABC"
    },
    "items": [{"nombre": "Muzzarella", "cantidad": 1}],
    "origen": "whatsapp"
  }' | jq .
```

**Esperado (400 BAD REQUEST):**
```json
{
  "success": false,
  "error": "Dirección inválida"
}
```

**Validación:**
- [ ] Status: 400 Bad Request
- [ ] error contiene "Dirección"

═══════════════════════════════════════════════════════════════════════════════
❌ TEST 12: ARRAY DE ITEMS VACÍO (DEBE FALLAR)
═══════════════════════════════════════════════════════════════════════════════

**Descripción:** Sistema rechaza pedido sin items

```bash
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test Items Vacío",
      "telefono": "2262401013",
      "direccion": "Calle Test 123"
    },
    "items": [],
    "origen": "whatsapp"
  }' | jq .
```

**Esperado (400 BAD REQUEST):**
```json
{
  "success": false,
  "error": "Debe incluir al menos un item"
}
```

**Validación:**
- [ ] Status: 400 Bad Request
- [ ] error menciona "item" o similar

═══════════════════════════════════════════════════════════════════════════════
📊 SCRIPT DE TESTING AUTOMÁTICO (BASH)
═══════════════════════════════════════════════════════════════════════════════

Crear fichero: test-webhook.sh

```bash
#!/bin/bash

set -e

BASE_URL="http://localhost:4000"
PASSED=0
FAILED=0

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🔧 INICIANDO WEBHOOK TESTS..."
echo "================================"

# TEST 1: Pedido básico
echo -e "\n${YELLOW}TEST 1: Pedido básico válido${NC}"
RESULT=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test User 1",
      "telefono": "2262401001",
      "direccion": "Calle Test 123"
    },
    "items": [{"nombre": "Muzzarella", "cantidad": 1}],
    "origen": "whatsapp"
  }')

if echo $RESULT | jq -e '.success == true' > /dev/null; then
  echo -e "${GREEN}✅ PASADO${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ FALLÓ${NC}"
  echo "Response: $RESULT"
  ((FAILED++))
fi

# TEST 2: Cliente existente
echo -e "\n${YELLOW}TEST 2: Cliente existente (reutilizar)${NC}"
RESULT=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Otro Nombre",
      "telefono": "2262401001",
      "direccion": "Otra dirección"
    },
    "items": [{"nombre": "Calabresa", "cantidad": 1}],
    "origen": "whatsapp"
  }')

if echo $RESULT | jq -e '.success == true' > /dev/null; then
  echo -e "${GREEN}✅ PASADO${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ FALLÓ${NC}"
  echo "Response: $RESULT"
  ((FAILED++))
fi

# TEST 3: Teléfono inválido (debería fallar)
echo -e "\n${YELLOW}TEST 3: Teléfono inválido (debería fallar)${NC}"
RESULT=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test",
      "telefono": "123",
      "direccion": "Calle Test"
    },
    "items": [{"nombre": "Muzzarella", "cantidad": 1}],
    "origen": "whatsapp"
  }')

if echo $RESULT | jq -e '.success == false' > /dev/null; then
  echo -e "${GREEN}✅ PASADO (rechazó correctamente)${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ FALLÓ (debería haber rechazado)${NC}"
  echo "Response: $RESULT"
  ((FAILED++))
fi

# TEST 4: Item no existe (debería fallar)
echo -e "\n${YELLOW}TEST 4: Item no existe (debería fallar)${NC}"
RESULT=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test",
      "telefono": "2262402000",
      "direccion": "Calle Test"
    },
    "items": [{"nombre": "ITEM_INEXISTENTE_RARO", "cantidad": 1}],
    "origen": "whatsapp"
  }')

if echo $RESULT | jq -e '.success == false' > /dev/null; then
  echo -e "${GREEN}✅ PASADO (rechazó correctamente)${NC}"
  ((PASSED++))
else
  echo -e "${RED}❌ FALLÓ (debería haber rechazado)${NC}"
  echo "Response: $RESULT"
  ((FAILED++))
fi

echo ""
echo "================================"
echo -e "📊 RESUMEN: ${GREEN}${PASSED} pasados${NC} / ${RED}${FAILED} fallos${NC}"
echo "================================"
```

**Ejecutar:**
```bash
chmod +x test-webhook.sh
./test-webhook.sh
```

═══════════════════════════════════════════════════════════════════════════════
🔍 DEBUGGING & TROUBLESHOOTING
═══════════════════════════════════════════════════════════════════════════════

Si un test falla:

1. **Ver logs del backend:**
   ```bash
   tail -100 /tmp/backend.log | grep -E "(webhook|Error|❌|✅)"
   ```

2. **Verificar si backend está corriendo:**
   ```bash
   curl -s http://localhost:4000/api/health | jq .
   # Debe mostrar: status: "ok", database: "error" (si SQL no está ejecutado)
   ```

3. **Ver datos en Supabase directamente:**
   ```bash
   # Listar clientes
   SELECT * FROM clientes ORDER BY created_at DESC LIMIT 5;
   
   # Listar pedidos
   SELECT * FROM pedidos ORDER BY created_at DESC LIMIT 5;
   
   # Ver detalles
   SELECT * FROM detalle_pedidos ORDER BY created_at DESC LIMIT 10;
   ```

4. **Verificar que menu_items tiene datos:**
   ```bash
   SELECT nombre, precio, disponible FROM menu_items LIMIT 10;
   # Debe mostrar: Muzzarella, Calabresa, Coca Cola, etc.
   ```

═══════════════════════════════════════════════════════════════════════════════
📈 MÉTRICAS A VALIDAR
═══════════════════════════════════════════════════════════════════════════════

Después de todos los tests, validar en Supabase:

```bash
-- Total de clientes creados
SELECT COUNT(*) FROM clientes;
-- Esperado: ~13 (Tests 1-13)

-- Total de pedidos
SELECT COUNT(*) FROM pedidos;
-- Esperado: ~12 (Tests 1, 2, 4-8, solo válidos)

-- Total de detalles
SELECT COUNT(*) FROM detalle_pedidos;
-- Esperado: ~20+ (múltiples items en algunos pedidos)

-- Promedio total de pedido
SELECT AVG(total) FROM pedidos;
-- Debería estar en rango 4000-8000 ARS

-- Clientes con múltiples pedidos
SELECT cliente_id, COUNT(*) FROM pedidos GROUP BY cliente_id HAVING COUNT(*) > 1;
-- Debería mostrar cliente 2262401001 y 2262401005 con 2 pedidos cada uno
```

═══════════════════════════════════════════════════════════════════════════════
✨ RESUMEN DE EJECUCIÓN
═══════════════════════════════════════════════════════════════════════════════

Una vez ejecutados todos los tests:

✅ Webhook está operacional
✅ Validación Zod funciona correctamente
✅ Cliente lookup/creation funciona
✅ Fuzzy matching funciona
✅ Cálculos de total son correctos
✅ BD se actualiza correctamente
✅ Logs registran transacciones
✅ Error handling es correcto

Próximo paso: E2E TESTING (Test 🔵 B - Análisis de Cobertura de Tests)

═══════════════════════════════════════════════════════════════════════════════
