# 🛠️ REFERENCIA RÁPIDA - HERRAMIENTAS DE SETUP

**Ubicación:** `/home/eevan/ProyectosIA/SIST_PIZZA/scripts/`

---

## 📋 SCRIPTS DISPONIBLES

### 1. 🔧 `setup-supabase-interactive.sh`

**Propósito:** Automatizar configuración completa de Supabase

**Uso:**
```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA
./scripts/setup-supabase-interactive.sh
```

**Qué hace:**
- ✅ Solicita credenciales Supabase interactivamente
- ✅ Valida las credenciales
- ✅ Actualiza `backend/.env`
- ✅ Crea script de test local
- ✅ Genera instrucciones SQL
- ✅ Crea script de inicio del backend

**Salida:**
```
Archivo .env actualizado
Script de test: backend/test-supabase-connection.js
Script de inicio: backend/start-dev.sh
Instrucciones: /tmp/SUPABASE_SQL_INSTRUCTIONS.txt
```

---

### 2. 📋 `prepare-sql-for-supabase.sh`

**Propósito:** Mostrar archivos SQL listos para copiar-pegar

**Uso:**
```bash
./scripts/prepare-sql-for-supabase.sh
```

**Qué hace:**
- ✅ Muestra rutas de archivos SQL
- ✅ Cuenta líneas de cada archivo
- ✅ Proporciona instrucciones paso a paso

**Archivos que referencia:**
```
supabase/migrations/20250115000000_initial_schema.sql    (231 líneas)
supabase/migrations/20250115000001_seed_data.sql         (165 líneas)
```

---

### 3. 🧪 `backend/test-supabase-connection.js`

**Propósito:** Validar conexión a Supabase desde backend

**Uso:**
```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA/backend
node test-supabase-connection.js
```

**Qué valida:**
- ✅ Conexión básica a Supabase
- ✅ Existencia de todas las tablas
- ✅ Datos en menu_items, clientes, zonas
- ✅ Cantidad de registros por tabla

**Salida esperada:**
```
📌 Test 1: Conexión básica
✅ Conexión exitosa

📌 Test 2: Tablas en la base de datos
   ✅ clientes
   ✅ menu_items
   ✅ pedidos
   ✅ detalle_pedidos
   ✅ zonas_entrega
   ✅ audit_logs

📌 Test 3: Consultar datos de ejemplo
   Encontrados 5 items de menú...

📌 Test 4: Estadísticas de datos
   clientes: 5 registros
   menu_items: 18 registros
   ...

✅ ¡Todos los tests pasaron correctamente!
```

---

### 4. 🚀 `backend/start-dev.sh`

**Propósito:** Iniciar backend en modo desarrollo

**Uso:**
```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA/backend
./start-dev.sh
```

**Qué hace:**
- ✅ Verifica que `.env` existe
- ✅ Instala dependencias si es necesario
- ✅ Inicia servidor con `npm run dev`

**Puerto:** `http://localhost:4000`

---

### 5. 🔗 `start-canales.sh`

**Propósito:** Iniciar stack Docker completo (WAHA, N8N, Chatwoot, etc)

**Uso:**
```bash
./scripts/start-canales.sh
```

**Requiere:** 
- Docker y Docker Compose instalados
- `.env` en `backend/` configurado
- Backend ejecutándose en puerto 4000

**Servicios que levanta:**
- WAHA (WhatsApp) en `http://localhost:3000`
- N8N en `http://localhost:5678`
- Chatwoot en `http://localhost:3001`
- PostgreSQL en puerto 5433
- Redis en puerto 6380

---

## 📝 ARCHIVOS DE CONFIGURACIÓN

### `.env` (Backend)

**Ubicación:** `backend/.env`

**Variables críticas:**
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

**Variables opcionales:**
```bash
ANTHROPIC_API_KEY=sk-ant-...
MODO_API_KEY=...
REDIS_URL=redis://localhost:6379
N8N_API_URL=http://localhost:5678
```

---

### `.env.canales` (Docker Stack)

**Ubicación:** `backend/.env.canales` (generado desde `.env`)

**Variables requeridas:**
```bash
N8N_WEBHOOK_URL=http://backend:4000/api/webhooks/n8n
WAHA_API_KEY=tu-clave-aqui
```

---

### `docker-compose.canales.yml`

**Ubicación:** `docker-compose.canales.yml`

**Servicios:**
```yaml
services:
  waha:           # WhatsApp HTTP API (puerto 3000)
  n8n:            # Workflow automation (puerto 5678)
  chatwoot:       # Customer support (puerto 3001)
  postgres:       # Database (puerto 5433)
  redis:          # Cache (puerto 6380)
```

---

## 📄 ARCHIVOS SQL

### 1. Schema (Crear Tablas)

**Archivo:** `supabase/migrations/20250115000000_initial_schema.sql`

**Crea:**
- `clientes` (con teléfono única)
- `menu_items` (pizzas, empanadas, bebidas)
- `pedidos` (con estado, total, dirección)
- `detalle_pedidos` (items del pedido)
- `zonas_entrega` (zonas de delivery con costo)
- `audit_logs` (auditoría y trazabilidad)

**Incluye:**
- ✅ Índices de búsqueda
- ✅ Row Level Security (RLS)
- ✅ Triggers de `updated_at`
- ✅ Constraints de integridad

---

### 2. Seed Data (Insertar Datos)

**Archivo:** `supabase/migrations/20250115000001_seed_data.sql`

**Inserta:**
- ✅ 5 clientes de prueba
- ✅ 7 pizzas (Muzzarella, Napolitana, Calabresa, etc)
- ✅ 5 empanadas
- ✅ 6 bebidas (Coca-Cola, Sprite, Fanta, etc)
- ✅ 3 zonas de entrega (Centro, Barrios, Costa)

---

## 🧪 TESTING

### Test 1: Conexión Supabase

```bash
cd backend
node test-supabase-connection.js
```

✅ Valida: Conexión, tablas, datos, counts

### Test 2: Health Check Backend

```bash
curl -s http://localhost:4000/api/health | jq
```

✅ Valida: Server running, database connected

### Test 3: Webhook N8N

```bash
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {"nombre":"Test","telefono":"2262999999","direccion":"Calle Test"},
    "items": [{"nombre":"Muzzarella","cantidad":1}],
    "origen":"whatsapp"
  }' | jq
```

✅ Valida: Webhook creates order in DB

---

## 🔄 FLUJO COMPLETO (Step by Step)

### Fase 1: Setup Supabase (5 min)

```bash
# 1. Obtener credenciales desde Supabase UI
#    Settings → API → Copia URL + 2 keys

# 2. Ejecutar setup interactivo
./scripts/setup-supabase-interactive.sh

# 3. Cuando pida, pega las 3 credenciales
# SUPABASE_URL: [pega aquí]
# SUPABASE_ANON_KEY: [pega aquí]
# SUPABASE_SERVICE_ROLE_KEY: [pega aquí]

# ✅ Resultado: backend/.env actualizado
```

---

### Fase 2: Ejecutar SQL en Supabase (5 min)

```bash
# 1. Ir a: https://app.supabase.com → Tu proyecto → SQL Editor

# 2. New query → Copiar archivo:
#    supabase/migrations/20250115000000_initial_schema.sql
#    Click Run → ✅ Success

# 3. New query → Copiar archivo:
#    supabase/migrations/20250115000001_seed_data.sql
#    Click Run → ✅ Success

# ✅ Resultado: 6 tablas + 25+ registros en Supabase
```

---

### Fase 3: Testear Backend (5 min)

```bash
# 1. Instalar dependencias
cd backend && npm install

# 2. Test conexión
node test-supabase-connection.js
# ✅ Todos los tests pasan

# 3. Iniciar backend
npm run dev
# ✅ Server en http://localhost:4000

# 4. En otra terminal, test health check
curl -s http://localhost:4000/api/health | jq
# ✅ database: ok

# 5. Test webhook
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{...}' | jq
# ✅ success: true, pedido_id: ...
```

---

### Fase 4: Iniciar Stack Canales (10 min)

```bash
# 1. Preparar .env.canales
cp .env .env.canales

# 2. Iniciar stack Docker
./scripts/start-canales.sh
# ✅ Todos los servicios up

# 3. Acceder a:
#    - WAHA: http://localhost:3000
#    - N8N: http://localhost:5678
#    - Chatwoot: http://localhost:3001

# 4. Importar workflow N8N
#    File → Import → docker/n8n-workflows/whatsapp-pedido.json

# 5. Conectar WhatsApp en WAHA
#    Escanear QR con tu celular
```

---

## 📚 DOCUMENTACIÓN AUXILIAR

### CHECKLIST_EJECUCION.md
- Paso a paso completo
- Troubleshooting
- Verificaciones
- Checklist final

### GUIA_SUPABASE_SETUP.md
- Configuración manual de Supabase
- Instalación de schemas
- Verificación de datos

### GUIA_MODULO1_CANALES.md
- Setup Docker Canales
- Workflow N8N
- Integración WhatsApp

### ANALISIS_OPTIMIZACION.md
- Quick Wins (4h de mejoras)
- Plan de testing (38 tareas)
- Roadmap de robustez

---

## 🆘 TROUBLESHOOTING

### Error: "database: error" en health check

**Solución:**
```bash
# 1. Verificar .env tiene credenciales
cat backend/.env | grep SUPABASE_

# 2. Si falta algo, editar
nano backend/.env
# Reemplazar SUPABASE_* con valores correctos

# 3. Reiniciar backend
npm run dev
```

### Error: "No route matches POST /api/webhooks/n8n/pedido"

**Solución:**
```bash
# 1. Verificar que backend está ejecutando
curl http://localhost:4000/api/health

# 2. Revisar logs del backend (debe mostrar ruta registrada)
# Busca: "POST /api/webhooks/n8n/pedido"

# 3. Si no aparece, reiniciar backend
```

### Error: "Item 'Muzzarella' no encontrado"

**Solución:**
```bash
# 1. Verificar seed data fue insertada
# En Supabase: Table Editor → menu_items
# Deberían haber 18 items

# 2. Si están vacíos, ejecutar SQL seed nuevamente
#    SQL Editor → New query → pegar seed_data.sql → Run

# 3. Intentar webhook con spelling correcto
# {"nombre": "Pizza Muzzarella"} o {"nombre": "Muzzarella"}
```

---

## 📞 CONTACTO / SOPORTE

Para ayuda:
1. Revisa CHECKLIST_EJECUCION.md
2. Busca en el troubleshooting de cada .md
3. Revisa logs del backend: `npm run dev` (output en terminal)
4. Copia error exacto y búscalo en documentación

---

**Última actualización:** 2025-01-11  
**Versión:** 1.0  
**Autor:** SIST_PIZZA Team
