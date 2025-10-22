#!/bin/bash

#╔══════════════════════════════════════════════════════════════════════════════╗
#║                                                                              ║
#║             🔧 WEBHOOK TESTING SIMPLE - SIST_PIZZA BACKEND                  ║
#║                                                                              ║
#║                        Tests Simplificados                                   ║
#║                                                                              ║
#╚══════════════════════════════════════════════════════════════════════════════╝

BASE_URL="http://localhost:4000"
PASSED=0
FAILED=0

echo "════════════════════════════════════════════════════════════════"
echo "🔧 WEBHOOK TESTING - SIST_PIZZA"
echo "════════════════════════════════════════════════════════════════"
echo ""

# TEST 1: Pedido básico
echo "TEST 1: Pedido básico válido"
RESULT=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test 1",
      "telefono": "2262401101",
      "direccion": "Calle Test 123"
    },
    "items": [{"nombre": "Muzzarella", "cantidad": 1}],
    "origen": "whatsapp"
  }')

if echo "$RESULT" | grep -q '"success":true'; then
  echo "✅ PASADO"
  ((PASSED++))
else
  echo "❌ FALLÓ: $RESULT"
  ((FAILED++))
fi
echo ""

# TEST 2: Múltiples items
echo "TEST 2: Múltiples items"
RESULT=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test 2",
      "telefono": "2262401102",
      "direccion": "Av. Test 456"
    },
    "items": [
      {"nombre": "Muzzarella", "cantidad": 2},
      {"nombre": "Calabresa", "cantidad": 1}
    ],
    "origen": "whatsapp"
  }')

if echo "$RESULT" | grep -q '"success":true'; then
  echo "✅ PASADO"
  ((PASSED++))
else
  echo "❌ FALLÓ: $RESULT"
  ((FAILED++))
fi
echo ""

# TEST 3: Con notas
echo "TEST 3: Pedido con notas especiales"
RESULT=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test 3",
      "telefono": "2262401103",
      "direccion": "Calle 50 #200"
    },
    "items": [{"nombre": "Fugazzeta", "cantidad": 1}],
    "notas": "Sin aceitunas, extra queso",
    "origen": "whatsapp"
  }')

if echo "$RESULT" | grep -q '"success":true'; then
  echo "✅ PASADO"
  ((PASSED++))
else
  echo "❌ FALLÓ: $RESULT"
  ((FAILED++))
fi
echo ""

# TEST 4: Fuzzy match
echo "TEST 4: Fuzzy match (mayúscula)"
RESULT=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test 4",
      "telefono": "2262401104",
      "direccion": "Calle Test 789"
    },
    "items": [
      {"nombre": "MUZZARELLA", "cantidad": 1},
      {"nombre": "calabresa", "cantidad": 1}
    ],
    "origen": "whatsapp"
  }')

if echo "$RESULT" | grep -q '"success":true'; then
  echo "✅ PASADO"
  ((PASSED++))
else
  echo "❌ FALLÓ: $RESULT"
  ((FAILED++))
fi
echo ""

# TEST 5: Cliente existente
echo "TEST 5: Cliente existente (reutilizar)"
# Primero
curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test 5",
      "telefono": "2262401105",
      "direccion": "Calle Reutilizar"
    },
    "items": [{"nombre": "Muzzarella", "cantidad": 1}],
    "origen": "whatsapp"
  }' > /dev/null

# Segundo (mismo teléfono)
RESULT=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Otro Nombre",
      "telefono": "2262401105",
      "direccion": "Otra dirección"
    },
    "items": [{"nombre": "Calabresa", "cantidad": 2}],
    "origen": "whatsapp"
  }')

if echo "$RESULT" | grep -q '"success":true'; then
  echo "✅ PASADO (cliente reutilizado)"
  ((PASSED++))
else
  echo "❌ FALLÓ: $RESULT"
  ((FAILED++))
fi
echo ""

# TEST 6: Cantidad grande
echo "TEST 6: Cantidad grande"
RESULT=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test 6",
      "telefono": "2262401106",
      "direccion": "Av. Empresarial"
    },
    "items": [
      {"nombre": "Muzzarella", "cantidad": 50},
      {"nombre": "Empanada", "cantidad": 100}
    ],
    "origen": "web"
  }')

if echo "$RESULT" | grep -q '"success":true'; then
  echo "✅ PASADO"
  ((PASSED++))
else
  echo "❌ FALLÓ: $RESULT"
  ((FAILED++))
fi
echo ""

# TEST 7: Sin nombre
echo "TEST 7: Sin nombre (se genera automático)"
RESULT=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "telefono": "2262401107",
      "direccion": "Calle Sin Nombre"
    },
    "items": [{"nombre": "Muzzarella", "cantidad": 1}],
    "origen": "whatsapp"
  }')

if echo "$RESULT" | grep -q '"success":true'; then
  echo "✅ PASADO"
  ((PASSED++))
else
  echo "❌ FALLÓ: $RESULT"
  ((FAILED++))
fi
echo ""

# TEST 8: Origen diferente
echo "TEST 8: Origen: telegram"
RESULT=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test 8",
      "telefono": "2262401108",
      "direccion": "Calle Telegram"
    },
    "items": [{"nombre": "Muzzarella", "cantidad": 1}],
    "origen": "telegram"
  }')

if echo "$RESULT" | grep -q '"success":true'; then
  echo "✅ PASADO"
  ((PASSED++))
else
  echo "❌ FALLÓ: $RESULT"
  ((FAILED++))
fi
echo ""

# TEST 9: Teléfono inválido (debería fallar)
echo "TEST 9: Teléfono inválido (debe rechazar)"
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

if echo "$RESULT" | grep -q '"success":false'; then
  echo "✅ PASADO (rechazado correctamente)"
  ((PASSED++))
else
  echo "❌ FALLÓ: debería haber sido rechazado"
  ((FAILED++))
fi
echo ""

# TEST 10: Item no existe (debería fallar)
echo "TEST 10: Item no existe (debe rechazar)"
RESULT=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test",
      "telefono": "2262401109",
      "direccion": "Calle Test"
    },
    "items": [{"nombre": "PIZZA_INEXISTENTE_XYZZY", "cantidad": 1}],
    "origen": "whatsapp"
  }')

if echo "$RESULT" | grep -q '"success":false'; then
  echo "✅ PASADO (rechazado correctamente)"
  ((PASSED++))
else
  echo "❌ FALLÓ: debería haber sido rechazado"
  ((FAILED++))
fi
echo ""

# TEST 11: Dirección corta (debería fallar)
echo "TEST 11: Dirección corta (debe rechazar)"
RESULT=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test",
      "telefono": "2262401110",
      "direccion": "AB"
    },
    "items": [{"nombre": "Muzzarella", "cantidad": 1}],
    "origen": "whatsapp"
  }')

if echo "$RESULT" | grep -q '"success":false'; then
  echo "✅ PASADO (rechazado correctamente)"
  ((PASSED++))
else
  echo "❌ FALLÓ: debería haber sido rechazado"
  ((FAILED++))
fi
echo ""

# TEST 12: Items vacío (debería fallar)
echo "TEST 12: Items vacío (debe rechazar)"
RESULT=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test",
      "telefono": "2262401111",
      "direccion": "Calle Test"
    },
    "items": [],
    "origen": "whatsapp"
  }')

if echo "$RESULT" | grep -q '"success":false'; then
  echo "✅ PASADO (rechazado correctamente)"
  ((PASSED++))
else
  echo "❌ FALLÓ: debería haber sido rechazado"
  ((FAILED++))
fi
echo ""

# RESUMEN
echo "════════════════════════════════════════════════════════════════"
echo "📊 RESUMEN FINAL"
echo "════════════════════════════════════════════════════════════════"
TOTAL=$((PASSED + FAILED))
PERCENT=$((PASSED * 100 / TOTAL))

echo "Total de tests: $TOTAL"
echo "✅ Pasados: $PASSED"
echo "❌ Fallos: $FAILED"
echo "Tasa de éxito: ${PERCENT}%"
echo ""

if [ $FAILED -eq 0 ]; then
  echo "🎉 TODOS LOS TESTS PASARON"
  exit 0
else
  echo "⚠️  Algunos tests fallaron"
  exit 1
fi
