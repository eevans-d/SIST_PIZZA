# 🚀 GUÍA DE INICIO RÁPIDO - SIST_PIZZA

## 1️⃣ Entender el Proyecto en 5 Minutos

### ¿Qué es SIST_PIZZA?
Un **sistema de gestión de pedidos para pizzería** que:
- Recibe pedidos por WhatsApp/Chatwoot
- Usa IA (Claude) para procesar lenguaje natural
- Gestiona pagos con MODO
- Muestra comandas en tiempo real en tablet de cocina
- Maneja entregas con validación de zona de cobertura

### Stack Tecnológico
```
Frontend: React + TypeScript + Zustand (PWA)
Backend:  Express + TypeScript
Database: Supabase (PostgreSQL)
IA:       Claude API (parsing pedidos)
Pagos:    MODO + integración webhook
Comms:    Chatwoot + Twilio (SMS opcional)
```

### Objetivo Principal
**Automatizar 80%+ del flujo de pedidos** manteniendo seguridad de nivel empresarial.

---

## 2️⃣ Estructura de Carpetas (A Crear)

```
SIST_PIZZA/
├── backend/
│   ├── src/
│   │   ├── server.ts                 (Prompt 6)
│   │   ├── config/
│   │   │   ├── index.ts
│   │   │   └── validate.ts
│   │   ├── lib/
│   │   │   ├── supabase.ts           (Prompt 3)
│   │   │   ├── logger.ts             (Prompt 5)
│   │   │   ├── sentry.ts             (Prompt 28)
│   │   │   └── posthog.ts            (Prompt 29)
│   │   ├── middlewares/
│   │   │   └── validateWebhook.ts    (Prompt 7)
│   │   ├── services/
│   │   │   ├── claude.ts             (Prompt 8)
│   │   │   ├── modo.ts               (Prompt 9)
│   │   │   ├── chatwoot.ts           (Prompt 10)
│   │   │   ├── pedidosya.ts          (Prompt 26)
│   │   │   ├── twilio.ts             (Prompt 27)
│   │   │   ├── pdfGenerator.ts       (Prompt 30)
│   │   │   └── healthCheck.ts        (Prompt 37)
│   │   └── workflows/
│   │       ├── recepcionMensajes.ts  (Prompt 11)
│   │       ├── tomaPedido.ts         (Prompt 12)
│   │       ├── generarPago.ts        (Prompt 13)
│   │       └── gestionComandas.ts    (Prompt 14)
│   ├── supabase/
│   │   └── migrations/
│   │       ├── 20250115000000_initial_schema.sql   (Prompt 1)
│   │       └── 20250115000001_seed_data.sql        (Prompt 2)
│   ├── tests/
│   │   └── e2e/
│   │       └── pedido-completo.spec.ts (Prompt 32)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── ComandaCard.tsx        (Prompt 17)
│   │   │   ├── ColumnaComandas.tsx    (Prompt 18)
│   │   │   ├── Header.tsx             (Prompt 21)
│   │   │   └── ConfigModal.tsx        (Prompt 22)
│   │   ├── pages/
│   │   │   └── Comandas.tsx           (Prompt 19)
│   │   ├── hooks/
│   │   │   └── useRealtimeComandas.ts (Prompt 20)
│   │   ├── lib/
│   │   │   ├── soundSystem.ts         (Prompt 23)
│   │   │   └── sentry.ts
│   │   ├── utils/
│   │   │   └── timeUtils.ts           (Prompt 24)
│   │   ├── App.tsx
│   │   └── main.tsx
│   ├── public/
│   │   └── manifest.json
│   ├── vite.config.ts                 (Prompt 16)
│   ├── package.json
│   ├── tsconfig.json
│   └── index.html
│
├── monitoring/
│   └── grafana-dashboard.json          (Prompt 35)
│
├── scripts/
│   ├── backup.sh                       (Prompt 36)
│   ├── migrate-data.ts                 (Prompt 38)
│   └── deploy.sh
│
├── docs/
│   ├── api/
│   │   └── openapi.yaml                (Prompt 33)
│   └── launch-checklist.md             (Prompt 40)
│
├── .github/
│   └── workflows/
│       └── deploy.yml                  (Prompt 31)
│
├── .eslintrc.js                        (Prompt 39)
├── .prettierrc.js                      (Prompt 39)
├── .env.example
├── README.md                           (Prompt 34)
├── package.json (root - monorepo)
└── docker-compose.yml
```

---

## 3️⃣ Flujo de Un Pedido (End-to-End)

```
1. CLIENTE ENVIA MENSAJE (WhatsApp/Chatwoot)
   "Quiero 2 pizzas grandes hawaianas"
   ↓
2. WEBHOOK CHATWOOT → BACKEND
   - IP validada
   - HMAC-SHA256 verificado
   ↓
3. CLAUDE IA PROCESA (sin PII real)
   Input:  "2 pizzas grandes hawaianas"
   Output: {
     items: [
       { menu_item_id: "pizza_hawaiana", quantity: 2, size: "grande" }
     ],
     confianza: 0.98
   }
   Costo: ~$0.0015 (dentro de $0.10 límite)
   ↓
4. VALIDACIONES
   ✅ ¿Existen items? SÍ
   ✅ ¿Están disponibles? SÍ
   ✅ ¿Zona de cobertura? SÍ (si delivery)
   ✅ ¿Precio válido? SÍ
   ↓
5. CREAR PEDIDO EN SUPABASE
   - INSERT en tabla pedidos
   - Generar link de pago MODO
   - RLS: Cliente A solo ve su pedido
   ↓
6. WEBHOOK MODO (Pago procesado)
   - Verificar moneda (ARS)
   - Validar monto (±$1 margen)
   - Marcar pedido como confirmado
   ↓
7. GENERAR COMANDA
   - INSERT en tabla comandas
   - Estado: "nueva"
   - Trigger: update_updated_at()
   ↓
8. REALTIME → FRONTEND
   WebSocket Supabase:
   Broadcast "nueva_comanda" a todos los clientes conectados
   ↓
9. TABLET DE COCINA SE ACTUALIZA
   ✨ Nueva tarjeta aparece en la columna "Nuevas"
   🔊 Sonido "ding" (si es 18:00-01:00)
   💡 Color según tiempo: Verde (< 10min) → Rojo (> 20min)
   ↓
10. COCINERO MARCA ESTADOS
    - "Preparando" → Trigger → Realtime
    - "Lista" → Cliente notificado
    ↓
11. DELIVERY O RETIRO
    - Si delivery: QR con pedido_id para confirmar entrega
    - Si retiro: Cliente pasa a buscar
    ↓
12. FIN
    - Pedido archivado
    - Métricas registradas (tiempo, costo IA, etc)
```

---

## 4️⃣ Los 40 Prompts en Orden de Ejecución

### 🔴 CRÍTICOS (Hacer primero):
| # | Nombre | Por qué |
|---|--------|---------|
| **1** | Setup Supabase | Sin BD, nada funciona |
| **2** | Seed data | Necesita datos para testear |
| **4** | Config y env | Requieren antes de levantar servidor |
| **5** | Logger | Necesario para debuggear |
| **6** | Express server | Base del backend |

### 🟡 IMPORTANTES (Hacer después):
| # | Nombre | Por qué |
|---|--------|---------|
| **3** | Cliente Supabase | Conecta BD con backend |
| **7** | Validación webhooks | Seguridad de entradas |
| **8** | Cliente Claude | IA para procesar pedidos |
| **11** | Workflow recepción | Maneja mensajes entrantes |

### 🟢 COMENCEMOS:
1. **Prompt 1**: Crea el esquema SQL
2. **Prompt 2**: Inserta datos de prueba
3. **Prompt 4**: Variables de entorno
4. **Prompt 5**: Logger estructurado
5. **Prompt 6**: Servidor Express

---

## 5️⃣ Variables de Entorno Necesarias

Crear `.env.example` y `.env.local`:

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=eyJhbG...
SUPABASE_SERVICE_ROLE_KEY=eyJhbG...

# Claude API
ANTHROPIC_API_KEY=sk-ant-...
CLAUDE_MODEL=claude-3-5-sonnet-20241022
MAX_TOKENS_PER_SESSION=6600  # ~$0.10

# MODO (Procesador de pagos)
MODO_API_KEY=...
MODO_WEBHOOK_SECRET=...

# Chatwoot
CHATWOOT_API_URL=https://app.chatwoot.com
CHATWOOT_API_TOKEN=...
CHATWOOT_WEBHOOK_SECRET=...

# Sentry (Error tracking)
SENTRY_DSN=https://...@sentry.io/...
SENTRY_ENVIRONMENT=production

# PostHog (Analytics)
POSTHOG_API_KEY=...
POSTHOG_API_URL=https://app.posthog.com

# Server
NODE_ENV=production
PORT=3000
ALLOWED_ORIGINS=https://pizza.example.com,https://app.pizza.example.com

# Database encryption
DB_ENCRYPTION_KEY=...  # 32 caracteres hex

# Twilio (opcional)
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
TWILIO_PHONE_NUMBER=+54...
```

---

## 6️⃣ Primeros Comandos para Ejecutar

```bash
# 1. Clonar repositorio
git clone https://github.com/eevans-d/SIST_PIZZA.git
cd SIST_PIZZA

# 2. Instalar dependencias
npm install

# 3. Crear archivo .env
cp .env.example .env.local
# EDITAR .env.local con tus keys

# 4. Ejecutar migrations en Supabase
npm run db:migrate

# 5. Seed data
npm run db:seed

# 6. Levantar backend
npm run dev:backend

# 7. En otra terminal: levantar frontend
npm run dev:frontend

# 8. Visitar
# Backend: http://localhost:3000
# Frontend: http://localhost:5173
```

---

## 7️⃣ Testing Rápido de cada Prompt

### Prompt 1 (SQL Schema)
```bash
# Conectar a Supabase y verificar:
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

# Debe mostrar: clientes, pedidos, comandas, menu_items, pagos, etc.
```

### Prompt 5 (Logger)
```bash
# Verificar que PII está redactado:
npm run test src/lib/logger.test.ts

# Output esperado:
# ✅ Teléfono redactado: +5492234567890 → ***7890
# ✅ Email redactado: usuario@example.com → ***@***.***
```

### Prompt 8 (Claude)
```bash
# Testear parsing de pedidos:
curl -X POST http://localhost:3000/api/test-claude \
  -H "Content-Type: application/json" \
  -d '{"mensaje": "2 pizzas medianas de jamón y queso"}'

# Output esperado:
# {
#   "items": [
#     {"menu_item_id": "pizza_mediana", "quantity": 2, "sabor": "jamon_queso"}
#   ],
#   "confianza": 0.92,
#   "costo_usd": 0.0018
# }
```

### Prompt 11 (Workflow recepción)
```bash
# Simular webhook de Chatwoot:
curl -X POST http://localhost:3000/api/webhooks/chatwoot \
  -H "Content-Type: application/json" \
  -H "X-Chatwoot-Signature: ..." \
  -d '{
    "conversation_id": 123,
    "message": "Quiero una pizza"
  }'
```

---

## 8️⃣ Checklist de Desarrollo

### Semana 1: Base
- [ ] Repositorio clonado y sincronizado
- [ ] `.env` configurado con keys reales
- [ ] Migrations SQL ejecutadas
- [ ] Seed data insertado
- [ ] Backend levantado sin errores
- [ ] Logger funcionando (tests pasando)

### Semana 2: Backend Base
- [ ] Express server respondiendo
- [ ] Middleware de validación de webhooks
- [ ] Cliente Claude configurado
- [ ] Tests de Claude pasando

### Semana 3: Workflows
- [ ] Recepción de mensajes
- [ ] Validaciones de pedido
- [ ] Generación de pagos
- [ ] E2E tests pasando

### Semana 4: Frontend
- [ ] PWA instalable
- [ ] Dashboard de comandas
- [ ] Realtime working
- [ ] Sonidos en horario correcto

### Semana 5+: Polish
- [ ] Monitoreo activo
- [ ] Backup funcionando
- [ ] Health checks verdes
- [ ] Deploy en producción

---

## 9️⃣ Documentos Complementarios

En el repositorio encontrarás:

| Archivo | Descripción |
|---------|-------------|
| `PROMPTS_COPILOT.txt` | Especificación técnica de los 40 prompts |
| `SIST_PIZZA_FINAL.docx` | Documento completo con requisitos y compliance |
| `ANALISIS_PROYECTO.md` | Este análisis detallado |
| `README.md` (a crear) | Guía de usuario final |
| `docs/api/openapi.yaml` | Especificación de API (Swagger) |
| `docs/launch-checklist.md` | Checklist antes de producción |

---

## 🔟 Troubleshooting Común

### ❌ "Error de conexión a Supabase"
```bash
# Verificar:
1. SUPABASE_URL válida (sin barra al final)
2. SUPABASE_ANON_KEY correcta
3. Red permite conexión a supabase.co (firewall)
```

### ❌ "Claude API returns 401"
```bash
# Verificar:
1. ANTHROPIC_API_KEY correcta
2. No tiene espacios extra
3. Cuenta tiene saldo/créditos
```

### ❌ "WebSocket no conecta"
```bash
# Verificar:
1. Frontend y Backend en mismo origen (CORS)
2. Realtime enabled en Supabase
3. Schema tiene políticas RLS
```

### ❌ "Logs tienen PII visible"
```bash
# Verificar:
1. redactPII() se llama antes de logger.error()
2. Expresiones regex son correctas
3. No hay bypass en cliente_id
```

---

## 📚 Recursos Útiles

- **Supabase Docs**: https://supabase.com/docs
- **Claude API**: https://docs.anthropic.com
- **Express.js**: https://expressjs.com
- **React**: https://react.dev
- **TypeScript**: https://www.typescriptlang.org

---

## 🎯 Tu Roadmap Personal

1. **Hoy**: Lee este documento y `ANALISIS_PROYECTO.md`
2. **Mañana**: Setup del ambiente (Prompts 1-4)
3. **Esta semana**: Backend base (Prompts 5-10)
4. **Próximas 2 semanas**: Workflows + Frontend (Prompts 11-25)
5. **Semana 4**: Testing + Deploy (Prompts 26-40)

**Total: ~4 semanas para versión 1.0 en producción** 🚀

---

## 💬 Necesitas ayuda?

Cada Prompt tiene:
- ✅ Requisitos específicos
- ✅ Archivo destino
- ✅ Cambios actualizados
- ✅ Referencias a otros Prompts

**¡Vamos a construir algo increíble!** 🍕🔥
