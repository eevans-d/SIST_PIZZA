#!/bin/bash
# ==============================================================================
# SIST_PIZZA - Script de Inicio de Canales
# Levanta WAHA + Chatwoot + N8N con Docker Compose
# ==============================================================================

set -e

echo "🚀 SIST_PIZZA - Iniciando Stack de Canales"
echo "=========================================="
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Verificar que estamos en la raíz del proyecto
if [ ! -f "docker-compose.canales.yml" ]; then
    echo -e "${RED}❌ Error: docker-compose.canales.yml no encontrado${NC}"
    echo "   Ejecuta este script desde la raíz del proyecto SIST_PIZZA"
    exit 1
fi

# Verificar que existe .env o .env.canales
if [ ! -f ".env" ] && [ ! -f ".env.canales" ]; then
    echo -e "${YELLOW}⚠️  Archivo .env no encontrado${NC}"
    echo "   Copiando .env.canales.example a .env..."
    cp .env.canales.example .env
    echo -e "${YELLOW}   ⚠️  IMPORTANTE: Edita .env y configura:${NC}"
    echo "   - CHATWOOT_SECRET_KEY_BASE (ejecuta: openssl rand -hex 64)"
    echo "   - N8N_PASSWORD (cambia la contraseña por defecto)"
    echo "   - ANTHROPIC_API_KEY (si tienes Claude API)"
    echo ""
    read -p "¿Deseas continuar? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo -e "${GREEN}✅ Configuración encontrada${NC}"
echo ""

# Detener contenedores existentes si los hay
echo "🛑 Deteniendo contenedores existentes..."
docker-compose -f docker-compose.canales.yml down 2>/dev/null || true
echo ""

# Limpiar volúmenes si se pasa --clean
if [ "$1" == "--clean" ]; then
    echo -e "${YELLOW}🧹 Limpiando volúmenes (--clean activado)...${NC}"
    docker-compose -f docker-compose.canales.yml down -v
    echo ""
fi

# Crear directorios necesarios
echo "📁 Creando directorios..."
mkdir -p docker/n8n-workflows
echo -e "${GREEN}✅ Directorios creados${NC}"
echo ""

# Iniciar servicios
echo "🐳 Iniciando servicios Docker..."
docker-compose -f docker-compose.canales.yml up -d

echo ""
echo "⏳ Esperando a que los servicios inicien..."
sleep 10

# Verificar estado de servicios
echo ""
echo "📊 Estado de servicios:"
echo "======================"
docker-compose -f docker-compose.canales.yml ps

echo ""
echo "🔍 Verificando health checks..."
echo ""

# Función para verificar servicio
check_service() {
    local name=$1
    local url=$2
    local max_attempts=30
    local attempt=1

    echo -n "  Verificando $name... "
    
    while [ $attempt -le $max_attempts ]; do
        if curl -sf "$url" > /dev/null 2>&1; then
            echo -e "${GREEN}✅ OK${NC}"
            return 0
        fi
        sleep 2
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}❌ TIMEOUT${NC}"
    return 1
}

# Verificar cada servicio
check_service "WAHA" "http://localhost:3000/health" || echo -e "${YELLOW}  ⚠️  WAHA puede tardar más en iniciar${NC}"
check_service "Chatwoot" "http://localhost:3001/api" || echo -e "${YELLOW}  ⚠️  Chatwoot puede tardar 1-2 min${NC}"
check_service "N8N" "http://localhost:5678/healthz" || echo -e "${YELLOW}  ⚠️  N8N puede tardar más en iniciar${NC}"

echo ""
echo "========================================"
echo -e "${GREEN}🎉 ¡Stack de Canales Iniciado!${NC}"
echo "========================================"
echo ""
echo "📍 URLs de acceso:"
echo "  • WAHA (WhatsApp API):    http://localhost:3000"
echo "  • Chatwoot (Support):     http://localhost:3001"
echo "  • N8N (Workflows):        http://localhost:5678"
echo ""
echo "🔐 Credenciales por defecto:"
echo "  • N8N: admin / SistPizza2025!"
echo "  • Chatwoot: (crear cuenta en primer acceso)"
echo ""
echo "📝 Próximos pasos:"
echo "  1. Conectar WhatsApp en WAHA:"
echo "     docker logs sist_pizza_waha"
echo "     (Escanea el QR con WhatsApp)"
echo ""
echo "  2. Configurar Chatwoot:"
echo "     http://localhost:3001"
echo "     (Crear cuenta de admin)"
echo ""
echo "  3. Importar workflow N8N:"
echo "     http://localhost:5678"
echo "     (Importar: docker/n8n-workflows/whatsapp-pedido.json)"
echo ""
echo "🔧 Comandos útiles:"
echo "  • Ver logs: docker-compose -f docker-compose.canales.yml logs -f [servicio]"
echo "  • Detener: docker-compose -f docker-compose.canales.yml down"
echo "  • Reiniciar: docker-compose -f docker-compose.canales.yml restart [servicio]"
echo ""
