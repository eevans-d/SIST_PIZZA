# 📱 MÓDULO 1: Canales - Guía Completa

**Stack:** WAHA (WhatsApp) + Chatwoot (Support) + N8N (Workflows)  
**Tiempo estimado:** 6 horas (automatizado a ~30 minutos con Docker)

---

## 🎯 Arquitectura del Módulo

```
┌─────────────┐
│  WhatsApp   │ Cliente envía mensaje
│   Cliente   │ "Hola, quiero 2 muzzarella"
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  WAHA (Puerto 3000)                             │
│  - WhatsApp Business API via HTTP               │
│  - Recibe mensajes entrantes                    │
│  - Envía respuestas automáticas                 │
└──────┬──────────────────────────────────────────┘
       │ Webhook
       ▼
┌─────────────────────────────────────────────────┐
│  Chatwoot (Puerto 3001) [OPCIONAL]              │
│  - Centraliza conversaciones multi-canal        │
│  - UI para operadores humanos                   │
│  - Historial de chats                           │
└──────┬──────────────────────────────────────────┘
       │ Webhook
       ▼
┌─────────────────────────────────────────────────┐
│  N8N (Puerto 5678)                              │
│  WORKFLOW:                                      │
│  1. Recibe mensaje de WhatsApp                  │
│  2. Extrae: teléfono, mensaje, nombre          │
│  3. Envía a Claude API para parsear             │
│  4. Claude identifica si es pedido              │
│  5. Si es pedido → POST a Backend webhook       │
│  6. Backend crea pedido en Supabase             │
│  7. N8N responde al cliente por WhatsApp        │
└──────┬──────────────────────────────────────────┘
       │ HTTP POST
       ▼
┌─────────────────────────────────────────────────┐
│  Backend (Puerto 4000)                          │
│  POST /api/webhooks/n8n/pedido                  │
│  - Valida datos                                 │
│  - Crea cliente si no existe                    │
│  - Busca items en menu_items                    │
│  - Calcula total                                │
│  - Inserta en Supabase                          │
└──────┬──────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────┐
│  Supabase (Cloud)                               │
│  - pedidos                                      │
│  - detalle_pedidos                              │
│  - clientes                                     │
│  - audit_logs                                   │
└─────────────────────────────────────────────────┘
```

---

## 🚀 Inicio Rápido (Automatizado)

### Opción A: Script Automatizado

```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA

# 1. Copiar variables de entorno
cp .env.canales.example .env

# 2. Generar secret key para Chatwoot
openssl rand -hex 64
# Copiar output y pegarlo en .env como CHATWOOT_SECRET_KEY_BASE

# 3. Editar .env (opcional: configurar Claude API key real)
nano .env

# 4. Iniciar todos los servicios
./scripts/start-canales.sh

# 5. Ver QR de WhatsApp
docker logs sist_pizza_waha
```

### Opción B: Manual con Docker Compose

```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA

# Iniciar stack
docker-compose -f docker-compose.canales.yml up -d

# Verificar servicios
docker-compose -f docker-compose.canales.yml ps

# Ver logs
docker-compose -f docker-compose.canales.yml logs -f
```

---

## 📋 Configuración Detallada

### PASO 1: Conectar WhatsApp (WAHA)

**1.1. Ver QR Code:**

```bash
docker logs sist_pizza_waha
```

Busca en los logs el QR ASCII. Ejemplo:
```
████ ▄▄▄▄▄ █▀█ █▄▀▀▀█▄ ████
████ █   █ █▀▀▀█ ▀ ▀ ▀ ████
...
```

**1.2. Escanear QR:**

1. Abre WhatsApp en tu teléfono
2. Menú (⋮) → **Dispositivos vinculados**
3. **Vincular un dispositivo**
4. Escanea el QR que aparece en los logs

**1.3. Verificar conexión:**

```bash
curl http://localhost:3000/api/sessions

# Respuesta esperada:
[
  {
    "name": "default",
    "status": "WORKING"
  }
]
```

**1.4. Configurar webhook en WAHA:**

```bash
curl -X POST http://localhost:3000/api/sessions/default/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://n8n:5678/webhook/whatsapp-pedido",
    "events": ["message"]
  }'
```

---

### PASO 2: Configurar Chatwoot (Opcional)

**2.1. Acceder a Chatwoot:**

```
http://localhost:3001
```

**2.2. Crear cuenta de administrador:**

- Nombre: Admin
- Email: admin@pizzeria.local
- Password: (tu contraseña segura)

**2.3. Crear Inbox (WhatsApp):**

1. Settings → Inboxes → **Add Inbox**
2. Channel Type: **API**
3. Name: **WhatsApp (WAHA)**
4. Webhook URL: (copiar para WAHA)

**2.4. Conectar WAHA → Chatwoot:**

Editar webhook de WAHA para enviar a Chatwoot:

```bash
curl -X POST http://localhost:3000/api/sessions/default/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://chatwoot_web:3000/api/v1/accounts/1/inboxes/INBOX_ID/messages",
    "events": ["message"],
    "headers": {
      "api_access_token": "TU_CHATWOOT_API_TOKEN"
    }
  }'
```

---

### PASO 3: Configurar N8N

**3.1. Acceder a N8N:**

```
http://localhost:5678
```

**Credenciales:**
- Usuario: `admin`
- Password: `SistPizza2025!` (o la que configuraste en .env)

**3.2. Configurar credencial de Claude:**

1. Settings → **Credentials**
2. **New Credential** → Buscar **Anthropic**
3. API Key: `sk-ant-...` (tu Claude API key real)
4. Save como: **Claude API**

**3.3. Importar workflow:**

1. Workflows → **Import from File**
2. Seleccionar: `/home/eevan/ProyectosIA/SIST_PIZZA/docker/n8n-workflows/whatsapp-pedido.json`
3. Click **Import**

**3.4. Configurar nodos:**

En el workflow importado, verificar:

- **Nodo "Claude - Parsear Pedido":**
  - Credential: Seleccionar **Claude API**
  
- **Nodo "Enviar a Backend":**
  - URL: `http://host.docker.internal:4000/api/webhooks/n8n/pedido`
  - (Cambia si tu backend está en otro puerto)

**3.5. Activar workflow:**

1. Click en el toggle **Inactive/Active** (arriba derecha)
2. Debe aparecer en verde: **Active**

**3.6. Copiar URL del webhook:**

1. Click en nodo **"Webhook WhatsApp"**
2. Copiar: **Webhook URL** (ej: `http://localhost:5678/webhook/whatsapp-pedido`)

---

### PASO 4: Conectar WAHA → N8N

```bash
# Actualizar webhook de WAHA para enviar a N8N
curl -X POST http://localhost:3000/api/sessions/default/webhooks \
  -H "Content-Type: application/json" \
  -d '{
    "url": "http://n8n:5678/webhook/whatsapp-pedido",
    "events": ["message"]
  }'
```

---

## 🧪 Testing End-to-End

### Test 1: Enviar mensaje de prueba

**Desde tu teléfono WhatsApp:**

Envía a tu número vinculado:
```
Hola, quiero 2 pizzas muzzarella y 1 coca cola 1.5L.
Mi dirección es Calle 83 N° 456, Necochea.
```

**Esperado:**
1. WAHA recibe el mensaje
2. N8N lo procesa con Claude
3. Claude identifica el pedido
4. N8N envía a Backend
5. Backend crea el pedido en Supabase
6. N8N responde confirmación por WhatsApp

**Verificar en logs:**

```bash
# Logs de WAHA (mensajes entrantes)
docker logs sist_pizza_waha -f

# Logs de N8N (ejecuciones)
docker logs sist_pizza_n8n -f

# Logs del backend (webhook recibido)
# (en otra terminal, si backend está corriendo)
```

### Test 2: Verificar pedido en Supabase

1. Ir a Supabase → Table Editor → `pedidos`
2. Debe haber 1 fila nueva con:
   - `estado`: "pendiente"
   - `total`: 8200 (2 × 3500 + 1200 + 500 envío)
   - `direccion_entrega`: "Calle 83 N° 456, Necochea"

3. Ir a `detalle_pedidos`
   - 2 filas: Muzzarella (×2), Coca-Cola 1.5L (×1)

### Test 3: Consulta (no pedido)

**Enviar:**
```
Hola, ¿tienen empanadas?
```

**Esperado:**
- N8N procesa con Claude
- Claude identifica que NO es un pedido (es_pedido: false)
- N8N responde con info del menú (sin crear pedido)

---

## 🔧 Comandos Útiles

### Ver logs en tiempo real

```bash
# Todos los servicios
docker-compose -f docker-compose.canales.yml logs -f

# Solo WAHA
docker logs sist_pizza_waha -f

# Solo N8N
docker logs sist_pizza_n8n -f

# Solo Chatwoot
docker logs sist_pizza_chatwoot -f
```

### Reiniciar servicios

```bash
# Todos
docker-compose -f docker-compose.canales.yml restart

# Solo un servicio
docker-compose -f docker-compose.canales.yml restart waha
docker-compose -f docker-compose.canales.yml restart n8n
```

### Detener stack

```bash
# Detener (mantiene volúmenes)
docker-compose -f docker-compose.canales.yml down

# Detener + eliminar volúmenes (CUIDADO: borra datos)
docker-compose -f docker-compose.canales.yml down -v
```

### Entrar a contenedor

```bash
# PostgreSQL
docker exec -it sist_pizza_postgres_canales psql -U postgres

# Ver DBs
\l

# Ver tablas de Chatwoot
\c chatwoot
\dt

# Ver tablas de N8N
\c n8n
\dt
```

---

## 🚨 Troubleshooting

### WAHA: QR no aparece

```bash
# Reiniciar WAHA
docker-compose -f docker-compose.canales.yml restart waha

# Ver logs
docker logs sist_pizza_waha -f

# Esperar 30-60 segundos, el QR debe aparecer
```

### N8N: Workflow no se ejecuta

```bash
# Verificar que está activo
# http://localhost:5678 → Workflows → Debe estar en verde

# Ver ejecuciones fallidas
# N8N UI → Executions → Ver errores

# Logs
docker logs sist_pizza_n8n -f
```

### Backend: "Error creando cliente"

```bash
# Verificar que Supabase está configurado
cat backend/.env | grep SUPABASE_URL

# Verificar que el backend está corriendo
curl http://localhost:4000/api/health

# Debe retornar: {"database": "ok"}
```

### Chatwoot: No carga la UI

```bash
# Esperar 2-3 minutos (primera carga es lenta)

# Verificar logs
docker logs sist_pizza_chatwoot -f

# Verificar que PostgreSQL y Redis están OK
docker-compose -f docker-compose.canales.yml ps
```

---

## 📊 Puertos Utilizados

| Servicio | Puerto | URL | Descripción |
|----------|--------|-----|-------------|
| WAHA | 3000 | http://localhost:3000 | WhatsApp API |
| Chatwoot | 3001 | http://localhost:3001 | Support UI |
| N8N | 5678 | http://localhost:5678 | Workflows |
| PostgreSQL | 5433 | localhost:5433 | Base de datos |
| Redis | 6380 | localhost:6380 | Cache |

---

## 🎉 Checklist de Éxito

- [ ] WAHA corriendo y QR escaneado
- [ ] WhatsApp vinculado (status: WORKING)
- [ ] Chatwoot accesible y cuenta creada
- [ ] N8N accesible y workflow importado
- [ ] Credencial Claude configurada en N8N
- [ ] Workflow activado (verde)
- [ ] Webhook WAHA → N8N configurado
- [ ] Backend corriendo en puerto 4000
- [ ] Supabase configurado y conectado
- [ ] Test E2E exitoso (mensaje → pedido creado)

---

**Última actualización:** 2025-10-22  
**Tiempo real de setup:** ~30 minutos con script automatizado  
**Autor:** SIST_PIZZA Team
