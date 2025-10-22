# 🚀 SUB-PLANIFICACIÓN EJECUTABLE - PARTE 2

## 📦 MÓDULO 1: CANALES DE ENTRADA (6 horas)

### TAREA 1.1: Instalar WAHA (WhatsApp API) ⏱️ 30min

**Archivo:** `docker-compose.yml`

**Agregar servicio:**
```yaml
services:
  waha:
    image: devlikeapro/waha:latest
    container_name: waha
    restart: unless-stopped
    ports:
      - "3002:3000"
    environment:
      - WHATSAPP_HOOK_URL=http://chatwoot:3000/api/v1/webhooks/whatsapp
      - WHATSAPP_HOOK_EVENTS=message
    volumes:
      - waha_data:/app/.wwebjs_auth
    networks:
      - sist_pizza_network

volumes:
  waha_data:

networks:
  sist_pizza_network:
    driver: bridge
```

**Levantar:**
```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA
docker-compose up waha -d
docker logs -f waha
```

**Escanear QR:**
```bash
# Acceder a http://localhost:3002
# Escanear QR con WhatsApp Business
```

---

### TAREA 1.2: Instalar Chatwoot ⏱️ 1h

**Opción A: Cloud (Recomendado - más rápido)**

1. Ir a https://www.chatwoot.com
2. Sign Up (gratis hasta 2 agentes)
3. Create Account
4. Settings → Inboxes → Add Inbox
5. Tipo: WhatsApp
6. Webhook URL: `http://tu-ip:3002/webhook` (WAHA)

**Opción B: Self-hosted (Docker)**

```yaml
# Agregar a docker-compose.yml
  chatwoot:
    image: chatwoot/chatwoot:latest
    ports:
      - "3003:3000"
    environment:
      - SECRET_KEY_BASE=replace-with-random-string
      - FRONTEND_URL=http://localhost:3003
      - POSTGRES_HOST=postgres
      - POSTGRES_DB=chatwoot
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis
    networks:
      - sist_pizza_network
  
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=chatwoot
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - sist_pizza_network
  
  redis:
    image: redis:7-alpine
    networks:
      - sist_pizza_network

volumes:
  postgres_data:
```

---

### TAREA 1.3: Instalar N8N ⏱️ 30min

**docker-compose.yml:**
```yaml
  n8n:
    image: n8nio/n8n:latest
    container_name: n8n
    restart: unless-stopped
    ports:
      - "5678:5678"
    environment:
      - N8N_BASIC_AUTH_ACTIVE=true
      - N8N_BASIC_AUTH_USER=admin
      - N8N_BASIC_AUTH_PASSWORD=admin123
      - N8N_HOST=localhost
      - N8N_PORT=5678
      - N8N_PROTOCOL=http
      - WEBHOOK_URL=http://localhost:5678/
    volumes:
      - n8n_data:/home/node/.n8n
    networks:
      - sist_pizza_network

volumes:
  n8n_data:
```

**Levantar:**
```bash
docker-compose up n8n -d
# Acceder: http://localhost:5678
# User: admin / Pass: admin123
```

---

### TAREA 1.4: Configurar Credenciales N8N ⏱️ 30min

**En N8N Dashboard:**

1. **Settings → Credentials → Add**

**Chatwoot API:**
- Type: HTTP Request
- Name: Chatwoot
- Auth Type: Header Auth
- Header Name: `api_access_token`
- Header Value: `<tu-token-chatwoot>`

**Claude API:**
- Type: HTTP Request
- Name: Claude
- Auth Type: Header Auth
- Header Name: `x-api-key`
- Header Value: `${ANTHROPIC_API_KEY}`
- Additional Header: `anthropic-version: 2023-06-01`

**Backend Webhook:**
- Type: HTTP Request
- Name: Backend
- URL: `http://backend:3000/api/webhooks/n8n/pedido`

---

### TAREA 1.5: Importar Workflow N8N ⏱️ 1h

**Crear nuevo workflow:**

**Nodes:**
1. **Webhook** (Trigger)
   - Path: `webhook-whatsapp`
   - Method: POST

2. **Extract Message** (Code)
```javascript
const message = $input.item.json.body.message.text;
const from = $input.item.json.body.from;

return [{
  json: {
    mensaje: message,
    telefono: from,
    timestamp: new Date().toISOString()
  }
}];
```

3. **Claude AI** (HTTP Request)
```javascript
// URL: https://api.anthropic.com/v1/messages
// Method: POST
// Body:
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 1024,
  "messages": [{
    "role": "user",
    "content": `Extrae el pedido de pizza del siguiente mensaje. Responde solo JSON.
Formato: {"items":[{"nombre":"Muzzarella","cantidad":2}],"direccion":"Calle X","telefono":"2262XXX","valido":true}
Menú: Muzzarella $5000, Napolitana $6000, Fugazzeta $6500, Calabresa $7000

Mensaje del cliente: {{ $json.mensaje }}`
  }]
}
```

4. **Parse JSON** (Code)
```javascript
const response = JSON.parse($input.item.json.content[0].text);
return [{ json: response }];
```

5. **Validate** (IF)
- Condition: `{{ $json.valido }} === true`

6. **Create Order** (HTTP Request)
```javascript
// URL: http://backend:3000/api/webhooks/n8n/pedido
// Method: POST
// Body:
{
  "cliente": {
    "telefono": "{{ $('Extract Message').item.json.telefono }}",
    "direccion": "{{ $json.direccion }}"
  },
  "items": "{{ $json.items }}",
  "notas": "{{ $json.notas }}",
  "origen": "whatsapp"
}
```

7. **Send Confirmation** (HTTP Request - Chatwoot)
```javascript
// URL: https://app.chatwoot.com/api/v1/accounts/{account_id}/conversations/{conversation_id}/messages
// Method: POST
// Body:
{
  "content": "✅ Pedido confirmado! Total: ${{ $('Create Order').item.json.total }}. Llegará en 30-40 min."
}
```

**Activar workflow:**
- Toggle: ON
- Save

---

### TAREA 1.6: Conectar WAHA → Chatwoot → N8N ⏱️ 1h

**Configurar webhooks:**

1. **WAHA → Chatwoot:**
   - En WAHA settings: `WHATSAPP_HOOK_URL=<chatwoot-webhook>`

2. **Chatwoot → N8N:**
   - Settings → Webhooks
   - Add webhook
   - URL: `http://localhost:5678/webhook/webhook-whatsapp`
   - Events: `message_created`

---

### TAREA 1.7: Crear Prompt Claude Optimizado ⏱️ 30min

**Archivo:** `n8n-prompts/extraer-pedido.txt`

```
Eres un asistente de pizzería en Necochea, Argentina.
Tu tarea: extraer información de pedidos de mensajes de WhatsApp.

MENÚ ACTUAL (precios en ARS):
1. Muzzarella - $5,000 (salsa, muzzarella)
2. Napolitana - $6,000 (salsa, muzzarella, tomate, ajo)
3. Fugazzeta - $6,500 (muzzarella, cebolla, orégano)
4. Calabresa - $7,000 (salsa, muzzarella, longaniza, morrones)
5. Especial - $8,000 (salsa, muzzarella, jamón, morrones, huevo)

ZONAS DE ENTREGA:
- Centro: Calles 40-60, entre Av 2 y 10
- Playa: Calles 2-20
- Norte: Calles 70-90

FORMATO SALIDA (JSON estricto):
{
  "valido": true|false,
  "razon": "explicación si no es válido",
  "items": [
    {"nombre": "Muzzarella", "cantidad": 2}
  ],
  "direccion": "Calle 50 #123",
  "telefono": "2262123456",
  "notas": "Sin aceitunas"
}

REGLAS:
1. Si falta dirección o items, valido=false
2. Aceptar variaciones: "muzza", "napo", "calaba"
3. Si cantidad no especificada, asumir 1
4. Normalizar direcciones (quitar "mi dirección es", etc)

MENSAJE DEL CLIENTE:
{mensaje_whatsapp}

RESPONDE SOLO JSON, SIN MARKDOWN.
```

---

### TAREA 1.8: Test E2E Canal WhatsApp ⏱️ 1h

**Flujo completo:**

1. **Enviar mensaje WhatsApp:**
   ```
   Hola! Quiero 2 muzza y 1 napo
   Mi dirección es Calle 50 #123
   Tel 2262999888
   ```

2. **Verificar en Chatwoot:**
   - Inbox muestra mensaje
   - Conversación creada

3. **Verificar en N8N:**
   - Execution log muestra workflow ejecutado
   - Claude respondió JSON válido

4. **Verificar en Backend:**
   ```bash
   curl http://localhost:3000/api/comandas | jq .
   # Debe mostrar pedido creado
   ```

5. **Verificar en Supabase:**
   - Table Editor → pedidos
   - Nuevo registro visible

6. **Recibir confirmación WhatsApp:**
   - Cliente recibe: "✅ Pedido confirmado! Total: $16000..."

---

## ✅ CRITERIOS MÓDULO 1
- [ ] WAHA conectado a WhatsApp Business
- [ ] Chatwoot inbox recibe mensajes
- [ ] N8N workflow activo
- [ ] Claude procesa pedidos correctamente
- [ ] Backend crea órdenes en Supabase
- [ ] Cliente recibe confirmación automática
- [ ] Flujo E2E completo funciona

---

## 📊 RESUMEN COMPLETO (PARTE 1 + 2)

### MÓDULO 2: Backend Core
✅ 8 tareas | ⏱️ 4 horas

### MÓDULO 3: Supabase
✅ 8 tareas | ⏱️ 2 horas

### MÓDULO 1: Canales
✅ 8 tareas | ⏱️ 6 horas

---

## 🎯 TOTAL EJECUTABLE

**24 tareas críticas**  
**12 horas de implementación**  
**3 módulos independientes**

---

## 🚀 PRÓXIMOS PASOS

**Responde con número de tarea para ejecutar:**

- **"2.1"** → Simplificar config backend
- **"3.1"** → Crear proyecto Supabase
- **"1.1"** → Instalar WAHA
- **"AUTO-M2"** → Ejecutar todo Módulo 2
- **"AUTO-M3"** → Ejecutar todo Módulo 3
- **"AUTO-M1"** → Ejecutar todo Módulo 1
- **"AUTO-ALL"** → Ejecutar los 3 módulos completos

**¿Comenzamos? 🚀**
