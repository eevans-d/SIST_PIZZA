# 📚 BACKEND API - Documentación

**SIST_PIZZA Backend API v1.0**  
Servidor Node.js + Express + TypeScript + Supabase

---

## 🔧 Configuración

### Variables de Entorno

```bash
# REQUERIDO (Core)
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
NODE_ENV=development|production
PORT=4000

# OPCIONAL (Integraciones)
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-3-5-sonnet-20241022
MAX_TOKENS_PER_SESSION=6600

MODO_API_KEY=xxx
MODO_WEBHOOK_SECRET=xxx

CHATWOOT_API_KEY=xxx
CHATWOOT_BASE_URL=https://app.chatwoot.com

# OPCIONAL (Otros)
DB_ENCRYPTION_KEY=0123456789abcdef... (32 chars hex)
LOG_LEVEL=info|debug|warn|error
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4000
```

### Instalación

```bash
cd backend
npm install
npm run build
npm run dev  # Puerto 4000 por defecto
```

---

## 📡 Endpoints

### 1. Health Check

**Verificar estado del servidor y conexiones**

```bash
GET /api/health
```

**Response 200 (OK):**
```json
{
  "status": "ok",
  "timestamp": "2025-10-22T04:17:30.204Z",
  "environment": "development",
  "uptime": 123,
  "database": "ok",
  "integrations": {
    "supabase": true,
    "claude": true,
    "modo": false,
    "chatwoot": false
  }
}
```

**Response 503 (Service Unavailable):**
```json
{
  "status": "ok",
  "database": "error",
  "integrations": { ... }
}
```

**Uso:**
- Monitoreo de salud (health checks de Docker/K8s)
- Verificar conectividad a Supabase antes de operar
- Identificar integraciones disponibles

---

### 2. Webhook N8N - Crear Pedido

**Recibir pedido procesado por N8N (Claude AI + WhatsApp)**

```bash
POST /api/webhooks/n8n/pedido
Content-Type: application/json
```

**Request Body:**
```json
{
  "cliente": {
    "nombre": "Juan Pérez",         // Opcional (se genera automático si no existe)
    "telefono": "1134567890",       // REQUERIDO (min 10 dígitos)
    "direccion": "Av. Corrientes 1234, CABA"  // REQUERIDO (min 5 chars)
  },
  "items": [                        // REQUERIDO (min 1 item)
    {
      "nombre": "Muzzarella",       // Nombre del producto (fuzzy match)
      "cantidad": 2                 // Cantidad (int positivo)
    },
    {
      "nombre": "Coca Cola 1.5L",
      "cantidad": 1
    }
  ],
  "notas": "Sin aceitunas, extra queso",  // OPCIONAL
  "origen": "whatsapp"              // whatsapp|telegram|web|phone (default: whatsapp)
}
```

**Response 200 (Success):**
```json
{
  "success": true,
  "pedido_id": "a3b5c7d9-1234-5678-90ab-cdef12345678",
  "total": 4500,
  "subtotal": 4000,
  "costo_envio": 500,
  "mensaje": "Pedido #a3b5c7d9 creado. Total: $4500. Tiempo estimado: 30-40 min."
}
```

**Response 400 (Validation Error):**
```json
{
  "success": false,
  "error": "Teléfono inválido"
}
```

**Response 400 (Item Not Found):**
```json
{
  "success": false,
  "error": "Item \"Pizza Suprema\" no encontrado o no disponible"
}
```

**Response 400 (Database Error):**
```json
{
  "success": false,
  "error": "Error creando cliente: Connection timeout"
}
```

**Ejemplos de curl:**

```bash
# Pedido básico (cliente nuevo)
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "María González",
      "telefono": "1156789012",
      "direccion": "Calle Falsa 123, Palermo"
    },
    "items": [
      {"nombre": "Napolitana", "cantidad": 1},
      {"nombre": "Fanta", "cantidad": 2}
    ],
    "notas": "Timbre roto, tocar bocina",
    "origen": "whatsapp"
  }'

# Pedido sin nombre (se genera automático)
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "telefono": "1198765432",
      "direccion": "Av. Santa Fe 5555"
    },
    "items": [
      {"nombre": "Fugazzeta", "cantidad": 1}
    ]
  }'

# Pedido por teléfono (origen diferente)
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Pedro Rodríguez",
      "telefono": "1145678901",
      "direccion": "Belgrano 999"
    },
    "items": [
      {"nombre": "Calabresa", "cantidad": 2}
    ],
    "origen": "phone"
  }'
```

**Lógica Interna:**

1. **Validación:** Zod schema valida estructura y tipos
2. **Cliente:** Busca por teléfono, crea si no existe
3. **Items:** Fuzzy match con `menu_items` (case-insensitive, `ILIKE`)
4. **Cálculos:**
   - `subtotal = Σ(precio_unitario × cantidad)`
   - `costo_envio = 500` (TODO: usar tabla `zonas_entrega`)
   - `total = subtotal + costo_envio`
5. **Persistencia:**
   - INSERT en `pedidos` (estado: pendiente, metodo_pago: pendiente)
   - INSERT en `detalle_pedidos` (múltiples items)
   - INSERT en `audit_logs` (auditoría)
6. **Logs:** PII redactado (`*****6***`), GDPR-compliant

---

## 🔐 Seguridad

### Headers Aplicados (Helmet)

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=15552000`

### CORS

- **Allowed Origins:** `ALLOWED_ORIGINS` del `.env`
- **Methods:** `GET, POST, PUT, DELETE, PATCH`
- **Credentials:** `true`
- **Headers:** `Content-Type, Authorization`

### Rate Limiting

Implementado con `express-rate-limit`.

- General API (`/api/*`): 100 requests por 15 min por IP
- Webhook N8N (`/api/webhooks/*`): 30 requests por minuto por IP
- Endpoints sensibles (ej. login/registro/pagos): strict (5 intentos/15 min, solo cuenta fallidos)

Respuestas de ejemplo:
- 429 Too Many Requests
```json
{
  "error": "Too Many Requests",
  "message": "Has excedido el límite de solicitudes. Intenta de nuevo más tarde."
}
```

Headers estándar:
- `RateLimit-Limit`, `RateLimit-Remaining`, `RateLimit-Reset`

### PII Redaction

Los logs automáticamente censuran:
- Teléfonos: `1134567890` → `*****6***`
- Emails: `juan@example.com` → `j***@e***.com`
- Direcciones: Solo primeras 3 palabras

---

## 📊 Schemas (Zod)

### pedidoN8NSchema

```typescript
{
  cliente: {
    nombre?: string,
    telefono: string (min 10),
    direccion: string (min 5)
  },
  items: Array<{
    nombre: string,
    cantidad: number (int, positive)
  }> (min 1 item),
  notas?: string,
  origen: 'whatsapp' | 'telegram' | 'web' | 'phone'
}
```

---

## 🧪 Testing

### Health Check

```bash
# Verificar que el servidor está vivo
curl http://localhost:4000/api/health

# Verificar Supabase específicamente
curl -s http://localhost:4000/api/health | jq '.database'
```

### Webhook N8N

```bash
# Test básico
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d @test/fixtures/pedido-valido.json

# Test error (teléfono inválido)
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{"cliente":{"telefono":"123"},"items":[]}'
```

---

## 📝 Logs

### Formato Morgan

```
POST /api/webhooks/n8n/pedido 200 32 ms
GET /api/health 200 5 ms
```

### Logs de Aplicación (Winston)

```json
{
  "level": "info",
  "message": "📥 Pedido recibido desde N8N",
  "items": 2,
  "origen": "whatsapp",
  "telefono": "*****6***",
  "timestamp": "2025-10-22T04:17:57.829Z"
}
```

**Niveles:**
- `info`: Eventos normales (pedidos creados, cliente creado)
- `warn`: Límites excedidos, validaciones fallidas
- `error`: Errores de DB, APIs externas, excepciones

**Ver logs en desarrollo:**
```bash
npm run dev  # Logs en consola + archivo logs/app.log
tail -f logs/app.log | jq  # Formateo con jq
```

---

## 🚀 Deployment

### Compilación Producción

```bash
npm run build  # Genera dist/
node dist/server.js  # Ejecuta compilado
```

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY dist ./dist
EXPOSE 4000
CMD ["node", "dist/server.js"]
```

```bash
docker build -t sist-pizza-backend .
docker run -p 4000:4000 --env-file .env sist-pizza-backend
```

### Variables de Producción

```bash
NODE_ENV=production
PORT=4000
LOG_LEVEL=warn
ALLOWED_ORIGINS=https://pizza.com
DB_ENCRYPTION_KEY=<secure-32-char-hex>
SUPABASE_URL=<produccion>
SUPABASE_SERVICE_ROLE_KEY=<produccion>
```

---

## 🔄 Próximos Endpoints (Roadmap)

- `POST /api/webhooks/chatwoot` - Recibir mensajes de Chatwoot
- `POST /api/webhooks/modo` - Callback de pagos de MODO
- `GET /api/pedidos/:id` - Consultar estado de pedido (IMPLEMENTADO)
- `PATCH /api/pedidos/:id` - Actualizar estado (IMPLEMENTADO)
- `GET /api/menu` - Listar items del menú disponibles (IMPLEMENTADO)
- `GET /api/menu/:id` - Detalle de item del menú (IMPLEMENTADO)
- `POST /api/menu` - Crear item del menú (admin, service role) (IMPLEMENTADO)
- `PATCH /api/menu/:id` - Actualizar item del menú (admin, service role) (IMPLEMENTADO)

---

## 📞 Soporte

**Logs de Error:**
```bash
tail -f logs/app.log | grep error
```

**Recargar Config:**
```bash
pkill -HUP node  # Graceful reload (TODO: implementar)
```

**Debugging:**
```bash
NODE_ENV=development DEBUG=* npm run dev
```

---

**Última actualización:** 2025-10-22  
**Versión:** 1.0.0  
**Autor:** SIST_PIZZA Team
