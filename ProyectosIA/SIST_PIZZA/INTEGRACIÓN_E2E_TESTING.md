╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🔗 INTEGRACIÓN E2E - TESTING WEBHOOK LOCALMENTE                ║
║                                                                              ║
║                 Simula lo que hace N8N sin necesidad de N8N                 ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
🎯 OBJETIVO
═══════════════════════════════════════════════════════════════════════════════

Después de ejecutar SQL en Supabase, podrás hacer:

1. POST un pedido a http://localhost:4000/api/webhooks/n8n/pedido
2. Ver cómo se crea el cliente
3. Ver cómo se busca el producto
4. Ver cómo se calcula el costo por zona
5. Ver cómo se guarda en BD
6. Ver respuesta con el pedido creado

═══════════════════════════════════════════════════════════════════════════════
📋 INTEGRACIÓN E2E COMPLETA - PASO A PASO
═══════════════════════════════════════════════════════════════════════════════

PREREQUISITO:
✅ Backend corriendo en localhost:4000
✅ SQL ejecutado en Supabase (PASO_2 + PASO_3 + ZONAS)
✅ curl instalado en tu terminal

PASOS:

1️⃣ PRUEBA 1 - Crear nuevo cliente + pedido simple
────────────────────────────────────────────────

Abre Terminal y ejecuta:

curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Juan Pérez",
      "telefono": "+5491112345678",
      "direccion": "Centro, Calle 123",
      "email": "juan@example.com"
    },
    "items": [
      {
        "nombre": "pizza clásica grande",
        "cantidad": 1
      }
    ],
    "notas": "Sin cebolla por favor"
  }' | jq .

RESPUESTA ESPERADA (200 OK):

{
  "success": true,
  "pedido": {
    "id": 1,
    "cliente_id": 1,
    "estado": "pendiente",
    "total": 1100,
    "created_at": "2025-10-22T10:30:45Z"
  },
  "detalle": [
    {
      "producto": "Pizza Clásica",
      "cantidad": 1,
      "precio_unitario": 800,
      "subtotal": 800
    }
  ],
  "envio": {
    "zona": "Centro",
    "costo": 300
  }
}

VALIDACIONES:
✓ Cliente creado (cliente_id = 1)
✓ Producto encontrado (Pizza Clásica = $800)
✓ Zona encontrada (Centro = $300)
✓ Total calculado (800 + 300 = 1100)
✓ Pedido guardado en BD

═══════════════════════════════════════════════════════════════════════════════

2️⃣ PRUEBA 2 - Cliente existente + múltiples items
────────────────────────────────────────────────

curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Juan Pérez",
      "telefono": "+5491112345678",
      "direccion": "Zona Norte, San Isidro"
    },
    "items": [
      {
        "nombre": "pizza hawaiana",
        "cantidad": 2
      },
      {
        "nombre": "coca cola",
        "cantidad": 3
      }
    ]
  }' | jq .

VALIDACIONES:
✓ Cliente REUTILIZADO (no duplicado)
✓ 2 productos encontrados
✓ Zona identificada (Zona Norte = $500)
✓ Total: (950*2) + (150*3) + 500 = 3350
✓ 2 líneas en comandas

═══════════════════════════════════════════════════════════════════════════════

3️⃣ PRUEBA 3 - Error: Producto no existe
────────────────────────────────────

curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "María García",
      "telefono": "+5491198765432",
      "direccion": "Centro"
    },
    "items": [
      {
        "nombre": "pizza de dragón",
        "cantidad": 1
      }
    ]
  }' | jq .

RESPUESTA ESPERADA (400 Bad Request):

{
  "error": "VALIDATION_ERROR",
  "message": "Item no encontrado"
}

VALIDACIÓN:
✓ Error 400 retornado
✓ Pedido NO creado
✓ BD no modificada

═══════════════════════════════════════════════════════════════════════════════

4️⃣ PRUEBA 4 - Error: Teléfono inválido
──────────────────────────────────

curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Carlos",
      "telefono": "123",
      "direccion": "Centro"
    },
    "items": [
      {
        "nombre": "pizza clásica",
        "cantidad": 1
      }
    ]
  }' | jq .

RESPUESTA ESPERADA (400 Bad Request):

{
  "error": "VALIDATION_ERROR",
  "message": "Teléfono debe tener entre 10 y 20 caracteres"
}

═══════════════════════════════════════════════════════════════════════════════

5️⃣ PRUEBA 5 - Health check endpoints
────────────────────────────────

curl http://localhost:4000/health | jq .

{
  "status": "ok"
}

curl http://localhost:4000/api/health | jq .

{
  "status": "ok",
  "database": "ok",
  "integrations": {
    "supabase": true
  }
}

curl http://localhost:4000/api/health/ready | jq .

{
  "ready": true,
  "timestamp": "2025-10-22T10:30:45Z"
}

═══════════════════════════════════════════════════════════════════════════════
✅ FLUJO COMPLETO VALIDADO
═══════════════════════════════════════════════════════════════════════════════

Si todos los pasos anteriores funcionan:

✅ Webhook funciona
✅ Validación funciona
✅ Búsqueda de productos funciona
✅ Búsqueda de zonas funciona
✅ Cálculo de costos funciona
✅ Guardado en BD funciona
✅ Transacciones son atómicas

= SISTEMA LISTO PARA INTEGRACIÓN CON N8N 🚀

═══════════════════════════════════════════════════════════════════════════════
📊 INFORMACIÓN DE DEBUGGING
═══════════════════════════════════════════════════════════════════════════════

Ver logs del backend:

cd /home/eevan/ProyectosIA/SIST_PIZZA/backend
npm run dev

Verás líneas como:

[10:30:45] POST /api/webhooks/n8n/pedido
[10:30:45] Validación OK: 1 items
[10:30:45] Cliente encontrado/creado: ID=1
[10:30:45] Producto encontrado: Pizza Clásica ($800)
[10:30:45] Zona encontrada: Centro ($300)
[10:30:45] Pedido creado: ID=1, Total=$1100
[10:30:45] Response: 201 Created

═══════════════════════════════════════════════════════════════════════════════
🔐 VERIFICAR EN SUPABASE
═══════════════════════════════════════════════════════════════════════════════

Después de hacer las pruebas, ve a:

https://supabase.com/dashboard/project/htvlwhisjpdagqkqnpxg/editor

Tablas que deberías ver actualizadas:

1. clientes - Nuevos clientes creados
2. pedidos - Nuevos pedidos
3. comandas - Líneas de cada pedido
4. pagos - Información de pagos
5. audit_logs - Log de cambios

Ejemplo:

SELECT * FROM clientes ORDER BY created_at DESC;
SELECT * FROM pedidos ORDER BY created_at DESC;
SELECT * FROM comandas WHERE pedido_id IN (SELECT id FROM pedidos ORDER BY id DESC LIMIT 5);

═══════════════════════════════════════════════════════════════════════════════
🎯 PRÓXIMO PASO
═══════════════════════════════════════════════════════════════════════════════

Una vez validado todo, tienes 2 opciones:

1️⃣ RUTA TESTS (4 horas)
   → Implementar 36 tests adicionales
   → Mejorar cobertura a 50.9%
   → Comando: npm test -- --coverage

2️⃣ RUTA DOCKER (4-5 horas)
   → Crear docker-compose.yml
   → Setup 6 servicios
   → Deployable en cualquier servidor

3️⃣ RUTA TESTS + DOCKER (8-9 horas)
   → TODO

═══════════════════════════════════════════════════════════════════════════════
