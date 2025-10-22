#!/bin/bash

#╔══════════════════════════════════════════════════════════════════════════════╗
#║                                                                              ║
#║             🔧 WEBHOOK TESTING SCRIPT - SIST_PIZZA BACKEND                  ║
#║                                                                              ║
#║                        Automatización de Tests                               ║
#║                                                                              ║
#╚══════════════════════════════════════════════════════════════════════════════╝

set -e

BASE_URL="http://localhost:4000"
PASSED=0
FAILED=0
TESTS_RUN=0

# Colores para output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Timestamps
START_TIME=$(date +%s)

# ============================================================================
# FUNCIONES HELPER
# ============================================================================

log_test() {
  local test_name=$1
  echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}TEST $((TESTS_RUN + 1)): ${test_name}${NC}"
  echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

test_pass() {
  echo -e "${GREEN}✅ PASADO${NC}"
  ((PASSED++))
  ((TESTS_RUN++))
}

test_fail() {
  local reason=$1
  echo -e "${RED}❌ FALLÓ${NC}"
  echo -e "${RED}Razón: ${reason}${NC}"
  ((FAILED++))
  ((TESTS_RUN++))
}

check_success() {
  local response=$1
  if echo "$response" | jq -e '.success == true' > /dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

check_error() {
  local response=$1
  if echo "$response" | jq -e '.success == false' > /dev/null 2>&1; then
    return 0
  else
    return 1
  fi
}

check_backend_alive() {
  if ! curl -s $BASE_URL/api/health > /dev/null 2>&1; then
    echo -e "${RED}❌ ERROR: Backend no está corriendo en $BASE_URL${NC}"
    exit 1
  fi
}

# ============================================================================
# INICIO
# ============================================================================

echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          🔧 WEBHOOK TESTING - SIST_PIZZA BACKEND              ║"
echo "║                   Iniciando Suite de Tests                    ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${YELLOW}⏱️  Hora de inicio: $(date '+%H:%M:%S')${NC}"
echo -e "${YELLOW}🌐 Backend URL: ${BASE_URL}${NC}"

# Verificar que backend está vivo
echo -e "\n${YELLOW}Verificando conexión con backend...${NC}"
check_backend_alive
echo -e "${GREEN}✅ Backend está disponible${NC}"

# ============================================================================
# NIVEL 1: HAPPY PATH (LO QUE DEBERÍA FUNCIONAR)
# ============================================================================

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}NIVEL 1: HAPPY PATH (Lo que debería funcionar)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

# TEST 1: Pedido básico válido
log_test "Pedido básico válido"
RESPONSE=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test User 1",
      "telefono": "2262401001",
      "direccion": "Calle Test 123, Necochea"
    },
    "items": [{"nombre": "Muzzarella", "cantidad": 1}],
    "origen": "whatsapp"
  }')

if check_success "$RESPONSE"; then
  PEDIDO_ID=$(echo "$RESPONSE" | jq -r '.pedido_id')
  TOTAL=$(echo "$RESPONSE" | jq -r '.total')
  echo -e "Response: ${GREEN}SUCCESS${NC}"
  echo "  Pedido ID: $PEDIDO_ID"
  echo "  Total: $TOTAL"
  test_pass
else
  echo "Response: $RESPONSE"
  test_fail "success == false"
fi

# TEST 2: Múltiples items
log_test "Pedido con múltiples items"
RESPONSE=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
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
  }')

if check_success "$RESPONSE"; then
  PEDIDO_ID=$(echo "$RESPONSE" | jq -r '.pedido_id')
  SUBTOTAL=$(echo "$RESPONSE" | jq -r '.subtotal')
  TOTAL=$(echo "$RESPONSE" | jq -r '.total')
  echo -e "Response: ${GREEN}SUCCESS${NC}"
  echo "  Pedido ID: $PEDIDO_ID"
  echo "  Subtotal: $SUBTOTAL"
  echo "  Total: $TOTAL"
  test_pass
else
  echo "Response: $RESPONSE"
  test_fail "success == false"
fi

# TEST 3: Con notas especiales
log_test "Pedido con notas especiales"
RESPONSE=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Juan Pérez",
      "telefono": "2262401003",
      "direccion": "Calle 50 #200, Necochea"
    },
    "items": [{"nombre": "Fugazzeta", "cantidad": 1}],
    "notas": "Sin aceitunas, extra queso, timbre roto tocar bocina",
    "origen": "whatsapp"
  }')

if check_success "$RESPONSE"; then
  echo -e "Response: ${GREEN}SUCCESS${NC}"
  test_pass
else
  echo "Response: $RESPONSE"
  test_fail "success == false"
fi

# TEST 4: Fuzzy match (mayúscula vs minúscula)
log_test "Fuzzy match - Producto (MAYÚSCULA vs minúscula)"
RESPONSE=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
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
  }')

if check_success "$RESPONSE"; then
  echo -e "Response: ${GREEN}SUCCESS${NC}"
  echo "  Fuzzy matching: ✓ MUZZARELLA, calabresa, Coca COLA"
  test_pass
else
  echo "Response: $RESPONSE"
  test_fail "success == false"
fi

# ============================================================================
# NIVEL 2: EDGE CASES (SITUACIONES LÍMITE)
# ============================================================================

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}NIVEL 2: EDGE CASES (Situaciones límite)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

# TEST 5: Cliente existente (reutilizar)
log_test "Cliente existente (reutilizar)"

# Crear primer pedido
RESPONSE1=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Carlos Reutilizar",
      "telefono": "2262401005",
      "direccion": "Calle Reutilizar 123"
    },
    "items": [{"nombre": "Muzzarella", "cantidad": 1}],
    "origen": "whatsapp"
  }')

# Crear segundo pedido (mismo cliente)
RESPONSE2=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Otro Nombre Ignorado",
      "telefono": "2262401005",
      "direccion": "Otra dirección ignorada"
    },
    "items": [{"nombre": "Calabresa", "cantidad": 2}],
    "origen": "whatsapp"
  }')

if check_success "$RESPONSE1" && check_success "$RESPONSE2"; then
  echo -e "Response: ${GREEN}SUCCESS (2 pedidos, 1 cliente)${NC}"
  test_pass
else
  echo "Response 1: $RESPONSE1"
  echo "Response 2: $RESPONSE2"
  test_fail "Uno de los pedidos falló"
fi

# TEST 6: Cantidad grande
log_test "Pedido con cantidades grandes"
RESPONSE=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
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
  }')

if check_success "$RESPONSE"; then
  TOTAL=$(echo "$RESPONSE" | jq -r '.total')
  echo -e "Response: ${GREEN}SUCCESS${NC}"
  echo "  Total (50 Muzzarella + 100 Empanadas): $TOTAL"
  test_pass
else
  echo "Response: $RESPONSE"
  test_fail "success == false"
fi

# TEST 7: Sin nombre del cliente
log_test "Sin nombre del cliente (se genera automático)"
RESPONSE=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "telefono": "2262401007",
      "direccion": "Calle Sin Nombre 555"
    },
    "items": [{"nombre": "Muzzarella", "cantidad": 1}],
    "origen": "whatsapp"
  }')

if check_success "$RESPONSE"; then
  echo -e "Response: ${GREEN}SUCCESS${NC}"
  echo "  Nombre generado automáticamente"
  test_pass
else
  echo "Response: $RESPONSE"
  test_fail "success == false"
fi

# TEST 8: Origen diferente
log_test "Origen diferente (telegram, web, phone)"
ORIGINS=("telegram" "web" "phone")
SUCCESS_COUNT=0

for ORIGIN in "${ORIGINS[@]}"; do
  RESPONSE=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
    -H "Content-Type: application/json" \
    -d "{
      \"cliente\": {
        \"nombre\": \"Test $ORIGIN\",
        \"telefono\": \"226240100$((RANDOM % 10))\",
        \"direccion\": \"Calle $ORIGIN 999\"
      },
      \"items\": [{\"nombre\": \"Muzzarella\", \"cantidad\": 1}],
      \"origen\": \"$ORIGIN\"
    }")
  
  if check_success "$RESPONSE"; then
    ((SUCCESS_COUNT++))
  fi
done

if [ $SUCCESS_COUNT -eq ${#ORIGINS[@]} ]; then
  echo -e "Response: ${GREEN}SUCCESS (3/3 orígenes)${NC}"
  test_pass
else
  test_fail "$SUCCESS_COUNT/${#ORIGINS[@]} orígenes fallaron"
fi

# ============================================================================
# NIVEL 3: ERROR CASES (QUE DEBERÍAN FALLAR GRACEFULLY)
# ============================================================================

echo -e "\n${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}NIVEL 3: ERROR CASES (Que deberían fallar gracefully)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

# TEST 9: Teléfono inválido
log_test "Teléfono inválido (debe rechazar)"
RESPONSE=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test Teléfono Corto",
      "telefono": "12345",
      "direccion": "Calle Test 123"
    },
    "items": [{"nombre": "Muzzarella", "cantidad": 1}],
    "origen": "whatsapp"
  }')

if check_error "$RESPONSE"; then
  ERROR=$(echo "$RESPONSE" | jq -r '.error')
  echo -e "Response: ${GREEN}RECHAZADO CORRECTAMENTE${NC}"
  echo "  Error: $ERROR"
  test_pass
else
  echo "Response: $RESPONSE"
  test_fail "Debería haber sido rechazado"
fi

# TEST 10: Item no existe
log_test "Item no existe (debe rechazar)"
RESPONSE=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test Item Inexistente",
      "telefono": "2262401020",
      "direccion": "Calle Test 123"
    },
    "items": [{"nombre": "PIZZA_INEXISTENTE_RARA_XYZZY", "cantidad": 1}],
    "origen": "whatsapp"
  }')

if check_error "$RESPONSE"; then
  ERROR=$(echo "$RESPONSE" | jq -r '.error')
  echo -e "Response: ${GREEN}RECHAZADO CORRECTAMENTE${NC}"
  echo "  Error: $ERROR"
  test_pass
else
  echo "Response: $RESPONSE"
  test_fail "Debería haber sido rechazado"
fi

# TEST 11: Dirección muy corta
log_test "Dirección muy corta (debe rechazar)"
RESPONSE=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test Dirección Corta",
      "telefono": "2262401021",
      "direccion": "ABC"
    },
    "items": [{"nombre": "Muzzarella", "cantidad": 1}],
    "origen": "whatsapp"
  }')

if check_error "$RESPONSE"; then
  ERROR=$(echo "$RESPONSE" | jq -r '.error')
  echo -e "Response: ${GREEN}RECHAZADO CORRECTAMENTE${NC}"
  echo "  Error: $ERROR"
  test_pass
else
  echo "Response: $RESPONSE"
  test_fail "Debería haber sido rechazado"
fi

# TEST 12: Array de items vacío
log_test "Array de items vacío (debe rechazar)"
RESPONSE=$(curl -s -X POST $BASE_URL/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test Items Vacío",
      "telefono": "2262401022",
      "direccion": "Calle Test 123"
    },
    "items": [],
    "origen": "whatsapp"
  }')

if check_error "$RESPONSE"; then
  ERROR=$(echo "$RESPONSE" | jq -r '.error')
  echo -e "Response: ${GREEN}RECHAZADO CORRECTAMENTE${NC}"
  echo "  Error: $ERROR"
  test_pass
else
  echo "Response: $RESPONSE"
  test_fail "Debería haber sido rechazado"
fi

# ============================================================================
# RESUMEN FINAL
# ============================================================================

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo -e "\n${BLUE}════════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}📊 RESUMEN DE EJECUCIÓN${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════════════${NC}"

echo ""
echo -e "Total de tests: ${YELLOW}${TESTS_RUN}${NC}"
echo -e "Tests pasados: ${GREEN}${PASSED}${NC}"
echo -e "Tests fallidos: ${RED}${FAILED}${NC}"
echo -e "Tiempo total: ${YELLOW}${ELAPSED}s${NC}"

PASS_RATE=$((PASSED * 100 / TESTS_RUN))
echo -e "Tasa de éxito: ${YELLOW}${PASS_RATE}%${NC}"

echo ""
if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✅ TODOS LOS TESTS PASARON${NC}"
  echo -e "${GREEN}🎉 El webhook está operacional${NC}"
  exit 0
else
  echo -e "${RED}❌ ALGUNOS TESTS FALLARON${NC}"
  exit 1
fi
