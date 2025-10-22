╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              🏗️  ARQUITECTURA COMPLETA - OPCIÓN D - DOCUMENTADA             ║
║                                                                              ║
║                          SIST_PIZZA - Sistema de Pizzería                   ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
📊 VISIÓN GENERAL DE ARQUITECTURA
═══════════════════════════════════════════════════════════════════════════════

FLUJO COMPLETO DE UN PEDIDO:

┌─────────────┐
│   WhatsApp  │
│   Cliente   │
└──────┬──────┘
       │ (Mensaje natural)
       ▼
┌─────────────────────┐
│ WAHA                │ (WhatsApp HTTP API)
│ (Recibe mensajes)   │
└──────┬──────────────┘
       │ (Webhook)
       ▼
┌──────────────────────────────────────┐
│ N8N                                  │
│ • Parse mensaje con Claude AI        │
│ • Extrae: cliente, items, notas      │
│ • Valida datos                       │
└──────┬───────────────────────────────┘
       │ (POST /api/webhooks/n8n/pedido)
       ▼
┌──────────────────────────────────────┐
│ BACKEND (Node.js/Express)            │
│ • Validación Zod                     │
│ • Busca/crea cliente                 │
│ • Lookup productos (fuzzy match)     │
│ • Calcula costo envío dinámico       │
│ • Inserta en BD                      │
└──────┬───────────────────────────────┘
       │ (INSERT)
       ▼
┌──────────────────────────────────────┐
│ PostgreSQL (Supabase)                │
│ • pedidos                            │
│ • comandas (line items)              │
│ • pagos                              │
│ • audit_logs                         │
└──────────────────────────────────────┘

SISTEMAS AUXILIARES:

┌──────────────────────┐
│ Chatwoot             │ ← Integración futura (soporte)
│ (Support tickets)    │
└──────────────────────┘

┌──────────────────────┐
│ Redis                │ ← Cache (future)
│ (Distributed cache)  │
└──────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
🔌 API ENDPOINTS ACTUALES
═══════════════════════════════════════════════════════════════════════════════

DOCUMENTACIÓN COMPLETA DE ENDPOINTS:

┌─ HEALTHCHECKS ────────────────────────────────────────────────────────────┐
│                                                                            │
│ 1️⃣  GET /health                                                          │
│    Propósito: Health check mínimo                                         │
│    Respuesta: { status, timestamp, uptime }                              │
│    Código HTTP: 200 OK                                                    │
│    Descripción: Ping simple, sin verificación de BD                      │
│    Uso: Load balancers, monitoring                                        │
│    Ejemplo:                                                               │
│      curl http://localhost:4000/health | jq .                           │
│      {                                                                    │
│        "status": "ok",                                                    │
│        "timestamp": "2025-10-22T10:30:45.123Z",                         │
│        "uptime": 3600                                                     │
│      }                                                                    │
│                                                                            │
│ 2️⃣  GET /api/health                                                      │
│    Propósito: Health check completo (incluye BD)                         │
│    Respuesta: { status, database, integrations, ... }                    │
│    Código HTTP: 200 OK (BD ok) | 503 Service Unavailable (BD error)    │
│    Descripción: Verifica Supabase, integraciones, etc                   │
│    Uso: Monitoring avanzado, CI/CD                                       │
│    Ejemplo:                                                               │
│      curl http://localhost:4000/api/health | jq .                       │
│      {                                                                    │
│        "status": "ok",                                                    │
│        "database": "ok",                                                  │
│        "integrations": {                                                  │
│          "supabase": true,                                                │
│          "claude": false,                                                 │
│          "modo": false,                                                   │
│          "chatwoot": false                                                │
│        }                                                                  │
│      }                                                                    │
│                                                                            │
│ 3️⃣  GET /api/health/ready                                                │
│    Propósito: Verificar que el sistema está ready para recibir pedidos  │
│    Respuesta: { ready: bool, timestamp }                                │
│    Código HTTP: 200 OK (listo) | 503 Service Unavailable (no listo)    │
│    Descripción: Comprueba que Supabase está disponible                  │
│    Uso: Deployment checks, pre-test validation                           │
│    Ejemplo:                                                               │
│      curl http://localhost:4000/api/health/ready | jq .                │
│      { "ready": true, "timestamp": "2025-10-22T10:30:45.123Z" }        │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌─ WEBHOOK N8N ──────────────────────────────────────────────────────────────┐
│                                                                            │
│ 4️⃣  POST /api/webhooks/n8n/pedido                                        │
│    Propósito: Recibir pedidos procesados por N8N + Claude                │
│    Método: POST                                                           │
│    Content-Type: application/json                                         │
│    Código HTTP: 201 Created | 400 Bad Request | 500 Internal Error      │
│                                                                            │
│    REQUEST BODY:                                                          │
│    {                                                                      │
│      "cliente": {                                                         │
│        "nombre": "string (requerido)",                                    │
│        "telefono": "string (requerido, UNIQUE)",                         │
│        "direccion": "string (requerido)"                                 │
│      },                                                                   │
│      "items": [                                                           │
│        {                                                                  │
│          "nombre": "string (producto, búsqueda fuzzy)",                  │
│          "cantidad": "number (> 0)"                                      │
│        }                                                                  │
│      ],                                                                   │
│      "notas": "string (opcional)",                                       │
│      "origen": "string (opcional, default: 'whatsapp')"                  │
│    }                                                                      │
│                                                                            │
│    RESPUESTA EXITOSA (201 Created):                                      │
│    {                                                                      │
│      "success": true,                                                     │
│      "pedido": {                                                          │
│        "id": 123,                                                         │
│        "cliente_id": 1,                                                   │
│        "estado": "pendiente",                                             │
│        "tipo_entrega": "delivery",                                        │
│        "direccion_entrega": "Calle 123",                                 │
│        "total": 1800,  ← subtotal + envío                               │
│        "created_at": "2025-10-22T10:30:45Z"                             │
│      },                                                                   │
│      "detalle": [                                                         │
│        {                                                                  │
│          "producto": "Pizza Clásica",                                     │
│          "cantidad": 2,                                                   │
│          "precio_unitario": 800,                                          │
│          "subtotal": 1600                                                 │
│        }                                                                  │
│      ],                                                                   │
│      "envio": {                                                           │
│        "zona": "Zona Norte",                                              │
│        "costo": 200                                                       │
│      }                                                                    │
│    }                                                                      │
│                                                                            │
│    ERRORES:                                                               │
│    {                                                                      │
│      "error": "VALIDATION_ERROR",                                         │
│      "message": "Item 'Pizza Especial' no encontrado o no disponible",   │
│      "details": [...] (en development mode)                              │
│    }                                                                      │
│                                                                            │
│    VALIDACIONES:                                                          │
│    • cliente.telefono: string, 10-20 caracteres, UNIQUE en BD           │
│    • items: array no vacío                                                │
│    • items[].nombre: se busca en menu_items con ILIKE fuzzy match       │
│    • items[].cantidad: number > 0                                        │
│    • direccion: usada para calcular costo de envío                       │
│                                                                            │
│    LÓGICA DE NEGOCIO:                                                    │
│    1. Valida payload con Zod schema                                      │
│    2. Busca cliente por telefono (UNIQUE)                                │
│    3. Si no existe → crea nuevo cliente                                  │
│    4. Para cada item → busca en menu_items (fuzzy ILIKE)                │
│    5. Si no encuentra → error específico                                 │
│    6. Calcula subtotal (sum de precios * cantidades)                     │
│    7. Busca zona por dirección (fuzzy en palabras_clave)                │
│    8. Calcula costo_envio según zona (default $500)                      │
│    9. total = subtotal + costo_envio                                     │
│   10. Inserta en pedidos, comandas, audit_logs (transaction)            │
│   11. Retorna 201 con pedido completo                                    │
│                                                                            │
│    EJEMPLO CURL:                                                          │
│    curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \         │
│      -H "Content-Type: application/json" \                               │
│      -d '{                                                                │
│        "cliente": {                                                       │
│          "nombre": "Juan Pérez",                                          │
│          "telefono": "+54901234567",                                      │
│          "direccion": "Zona Norte, Barrio A"                             │
│        },                                                                 │
│        "items": [                                                         │
│          {"nombre": "pizza clásica", "cantidad": 2},                      │
│          {"nombre": "coca cola", "cantidad": 1}                           │
│        ],                                                                 │
│        "notas": "Sin cebolla en la pizza"                                │
│      }' | jq .                                                            │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

┌─ WEBHOOKS FUTUROS (COMENTADOS) ───────────────────────────────────────────┐
│                                                                            │
│ 5️⃣  POST /api/webhooks/chatwoot                                          │
│    STATUS: ⏳ PLANNED                                                     │
│    Propósito: Integración con Chatwoot para soporte                      │
│    Descripción: Recibir eventos de tickets y actualizar en BD            │
│                                                                            │
│ 6️⃣  POST /api/webhooks/mercadopago                                       │
│    STATUS: ⏳ PLANNED                                                     │
│    Propósito: Confirmación de pagos MercadoPago                          │
│    Descripción: Actualizar estado de pago cuando se confirma             │
│                                                                            │
│ 7️⃣  POST /api/webhooks/whatsapp/status                                   │
│    STATUS: ⏳ PLANNED                                                     │
│    Propósito: Actualizar estado de mensajes WhatsApp                     │
│    Descripción: Confirmar entrega, lectura, etc.                         │
│                                                                            │
└────────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
📦 SCHEMAS (ZOD) Y TIPOS
═══════════════════════════════════════════════════════════════════════════════

PedidoN8NSchema (Validación de entrada webhook):
├─ cliente (object)
│  ├─ nombre (string, 1-100 chars)
│  ├─ telefono (string, 10-20 chars, UNIQUE)
│  └─ direccion (string, 10-500 chars)
├─ items (array, min 1)
│  └─ [0+]
│     ├─ nombre (string, 1-100 chars)
│     └─ cantidad (number, > 0, <= 1000)
├─ notas (string, optional, 0-500 chars)
└─ origen (string, optional, default='whatsapp')

Respuestas HTTP:
├─ 201 Created: Pedido creado exitosamente
├─ 400 Bad Request: Validación fallida (Zod error)
├─ 409 Conflict: Cliente bloqueado o item deshabilitado
├─ 500 Internal Error: Error de BD o sistema
└─ 503 Service Unavailable: Supabase no disponible

═══════════════════════════════════════════════════════════════════════════════
🔐 SEGURIDAD Y AUTENTICACIÓN
═══════════════════════════════════════════════════════════════════════════════

Estrategia Actual:
├─ CORS: Restrictivo (lista blanca de dominios)
├─ HEADERS: Helmet.js (HSTS, X-Frame-Options, etc.)
├─ RATE LIMITING: ⏳ Planeado
├─ AUTHENTICATION: Pública (webhooks de N8N confiable)
└─ ENCRYPTION: ✅ HTTPS en producción (requiere SSL cert)

PII REDACTION (Ley 25.326 - GDPR):
├─ Logs: Teléfono mascarado (xxxxx7890)
├─ Respuestas: No se expone detalles internos en 500 errors
└─ Auditoría: Todos los cambios logged sin PII

VALIDACIÓN DE ENTRADA:
├─ Zod schemas en todos los endpoints
├─ Sanitización de strings (trim, max length)
├─ Validación de tipos y formatos
└─ Rechazo de datos inválidos (400 Bad Request)

═══════════════════════════════════════════════════════════════════════════════
🗄️ MODELO DE DATOS
═══════════════════════════════════════════════════════════════════════════════

Tablas en PostgreSQL (Supabase):

┌─ clientes ───────────────────────────────────────────────────────────────┐
│ id (PK)          | BIGINT PRIMARY KEY AUTO_INCREMENT                    │
│ nombre           | VARCHAR(100) NOT NULL                                │
│ telefono         | VARCHAR(20) UNIQUE NOT NULL                          │
│ direccion        | TEXT NOT NULL                                         │
│ email            | VARCHAR(100)                                         │
│ notas            | TEXT                                                  │
│ created_at       | TIMESTAMP DEFAULT NOW()                              │
│ updated_at       | TIMESTAMP DEFAULT NOW()                              │
│ Índices:         | UNIQUE (telefono)                                    │
└──────────────────────────────────────────────────────────────────────────┘

┌─ menu_items ─────────────────────────────────────────────────────────────┐
│ id (PK)          | BIGINT PRIMARY KEY AUTO_INCREMENT                    │
│ nombre           | VARCHAR(100) UNIQUE NOT NULL                         │
│ categoria        | VARCHAR(50) NOT NULL                                 │
│ precio           | DECIMAL(10,2) NOT NULL                               │
│ disponible       | BOOLEAN DEFAULT true                                 │
│ descripcion      | TEXT                                                  │
│ created_at       | TIMESTAMP DEFAULT NOW()                              │
│ Índices:         | UNIQUE (nombre)                                      │
└──────────────────────────────────────────────────────────────────────────┘

┌─ pedidos ────────────────────────────────────────────────────────────────┐
│ id (PK)          | BIGINT PRIMARY KEY AUTO_INCREMENT                    │
│ cliente_id (FK)  | BIGINT NOT NULL → clientes.id                        │
│ estado           | VARCHAR(50) CHECK ('pendiente','preparando',...) │
│ tipo_entrega     | VARCHAR(50) CHECK ('delivery','retiro')              │
│ direccion_entrega| TEXT NOT NULL                                        │
│ total            | DECIMAL(10,2) NOT NULL                               │
│ notas_cliente    | TEXT                                                  │
│ created_at       | TIMESTAMP DEFAULT NOW()                              │
│ updated_at       | TIMESTAMP DEFAULT NOW()                              │
│ Índices:         | FK (cliente_id), (estado)                            │
└──────────────────────────────────────────────────────────────────────────┘

┌─ comandas ───────────────────────────────────────────────────────────────┐
│ id (PK)          | BIGINT PRIMARY KEY AUTO_INCREMENT                    │
│ pedido_id (FK)   | BIGINT NOT NULL → pedidos.id                         │
│ menu_item_id (FK)| BIGINT NOT NULL → menu_items.id                      │
│ cantidad         | INTEGER NOT NULL                                      │
│ precio_unitario  | DECIMAL(10,2) NOT NULL                               │
│ subtotal         | DECIMAL(10,2) NOT NULL                               │
│ created_at       | TIMESTAMP DEFAULT NOW()                              │
│ Índices:         | FK (pedido_id), FK (menu_item_id)                    │
└──────────────────────────────────────────────────────────────────────────┘

┌─ pagos ──────────────────────────────────────────────────────────────────┐
│ id (PK)          | BIGINT PRIMARY KEY AUTO_INCREMENT                    │
│ pedido_id (FK)   | BIGINT NOT NULL → pedidos.id                         │
│ metodo_pago      | VARCHAR(50) CHECK ('efectivo','tarjeta',...)     │
│ monto            | DECIMAL(10,2) NOT NULL                               │
│ estado           | VARCHAR(50) CHECK ('pendiente','confirmado',...)  │
│ referencia_externa| VARCHAR(255)                                        │
│ created_at       | TIMESTAMP DEFAULT NOW()                              │
│ Índices:         | FK (pedido_id), (estado)                             │
└──────────────────────────────────────────────────────────────────────────┘

┌─ audit_logs ─────────────────────────────────────────────────────────────┐
│ id (PK)          | BIGINT PRIMARY KEY AUTO_INCREMENT                    │
│ table_name       | VARCHAR(100) NOT NULL                                │
│ operation        | VARCHAR(20) NOT NULL (INSERT, UPDATE, DELETE)       │
│ new_data         | JSONB NOT NULL                                       │
│ user_id          | VARCHAR(100)                                         │
│ timestamp        | TIMESTAMP DEFAULT NOW()                              │
│ Índices:         | (table_name), (operation), (timestamp)               │
└──────────────────────────────────────────────────────────────────────────┘

┌─ zonas_entrega ──────────────────────────────────────────────────────────┐
│ id (PK)          | BIGINT PRIMARY KEY AUTO_INCREMENT (NEW)              │
│ nombre           | VARCHAR(100) UNIQUE NOT NULL                         │
│ palabras_clave   | VARCHAR(500) NOT NULL                                │
│ costo_base       | DECIMAL(10,2) NOT NULL DEFAULT 500                   │
│ descripcion      | TEXT                                                  │
│ activo           | BOOLEAN DEFAULT true                                 │
│ created_at       | TIMESTAMP DEFAULT NOW()                              │
│ updated_at       | TIMESTAMP DEFAULT NOW()                              │
│ Índices:         | UNIQUE (nombre), (activo)                            │
└──────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
🧪 VALIDACIÓN E2E
═══════════════════════════════════════════════════════════════════════════════

FLUJO COMPLETO TEST:

1️⃣  HEALTH CHECK
   GET /api/health/ready
   ✓ Retorna 200 con { ready: true }
   ✓ Si BD caída: retorna 503

2️⃣  CREAR PEDIDO HAPPY PATH
   POST /api/webhooks/n8n/pedido
   Input: Cliente nuevo, items válidos
   ✓ Crea cliente (si no existe)
   ✓ Busca productos con fuzzy match
   ✓ Calcula costo dinámico por zona
   ✓ Inserta pedido, comandas, audit_logs
   ✓ Retorna 201 con datos completos

3️⃣  REUTILIZAR CLIENTE
   POST /api/webhooks/n8n/pedido
   Input: Cliente existente (mismo teléfono)
   ✓ No crea cliente duplicado
   ✓ Reutiliza cliente existente
   ✓ Crea nuevo pedido

4️⃣  PRODUCTO NO ENCONTRADO
   POST /api/webhooks/n8n/pedido
   Input: Producto inválido
   ✓ Retorna 400 Bad Request
   ✓ Error claro: "Item 'xyz' no encontrado"

5️⃣  VALIDACIÓN FALLIDA
   POST /api/webhooks/n8n/pedido
   Input: Payload inválido
   ✓ Retorna 400 Bad Request
   ✓ Detalles de validación Zod

═══════════════════════════════════════════════════════════════════════════════
📊 MÉTRICAS Y OBSERVABILIDAD
═══════════════════════════════════════════════════════════════════════════════

LOGGING:
├─ Info: Peticiones exitosas, creación de recursos
├─ Warn: Intentos fallidos, datos incompletos
├─ Error: Errores BD, crashes, excepciones
└─ Debug: (development only) Detalles de operaciones

MÉTRICAS A IMPLEMENTAR:
├─ Latencia de requests (percentiles: p50, p95, p99)
├─ Tasa de error (% de 4xx, 5xx)
├─ Tamaño de payload (min, max, promedio)
├─ BD query times
└─ Cache hit/miss rates (cuando se implemente Redis)

═══════════════════════════════════════════════════════════════════════════════
🚀 DEPLOYMENT
═══════════════════════════════════════════════════════════════════════════════

AMBIENTE: Development
├─ Backend: localhost:4000
├─ BD: Supabase (proyecto htvlwhisjpdagqkqnpxg)
├─ Logs: Console
└─ Health: GET http://localhost:4000/api/health

AMBIENTE: Production (Planificado)
├─ Backend: Node.js en Docker (port 3000 interno)
├─ BD: PostgreSQL en RDS o Supabase producción
├─ Logs: ELK Stack o CloudWatch
├─ Monitoreo: Prometheus + Grafana
├─ Load Balancer: Nginx con SSL
└─ CI/CD: GitHub Actions

═══════════════════════════════════════════════════════════════════════════════
📋 RESUMEN
═══════════════════════════════════════════════════════════════════════════════

✅ Endpoints actuales: 3 healthchecks + 1 webhook = 4 rutas
✅ Tablas DB: 7 (6 + nueva zonas_entrega)
✅ Validación: Zod schemas en todos los endpoints
✅ Seguridad: CORS, Helmet, PII redaction, error handling
✅ Logging: Estructurado, sin datos sensibles
✅ E2E Validación: Completa (happy path + error cases)
✅ Documentación: Completa (este archivo)

SIGUIENTE: OpenAPI 3.0 Specification (API_ENDPOINTS.md)

═══════════════════════════════════════════════════════════════════════════════
