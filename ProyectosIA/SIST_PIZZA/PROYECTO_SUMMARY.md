# 🍕 SIST_PIZZA - Resumen del Proyecto

## Visión General
Sistema integral de gestión de comandas y pedidos para pizzería en Necochea, Argentina con:
- **Frontend PWA**: Dashboard real-time de comandas
- **Backend API**: Orquestación de workflows con IA (Claude)
- **Pagos**: Integración MODO
- **CRM**: Chatwoot integrado
- **Base de datos**: Supabase PostgreSQL + RLS
- **Compliance**: PII redaction, GDPR/Ley 25.326

## Stack Tecnológico

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js
- **Lenguaje**: TypeScript (strict mode)
- **Bases de datos**: 
  - Supabase PostgreSQL (transaccional)
  - Redis (caché, sessions)
- **APIs externas**:
  - Anthropic Claude 3.5 Sonnet ($0.10 USD/sesión)
  - MODO (pagos locales)
  - Chatwoot (CRM)
  - Google Maps (opcional, Fase 4)

### Frontend
- **Framework**: React 18 + TypeScript
- **Estado**: Zustand (store global)
- **Build**: Vite
- **UI**: TailwindCSS
- **PWA**: vite-plugin-pwa + Workbox
- **Realtime**: Supabase realtime subscriptions

### DevOps (Fase 5)
- **CI/CD**: GitHub Actions
- **Containerización**: Docker + Docker Compose
- **Orquestación**: Kubernetes (opcional)
- **Monitoreo**: Prometheus + Grafana
- **Seguridad**: Snyk + GitHub Advanced Security

## Arquitectura de Base de Datos

```sql
clientes(id, phone, nombre, email, zona, created_at)
  ↓
pedidos(id, cliente_id, estado, total, created_at)
  ↓
comandas(id, pedido_id, numero, estado, prioridad, items_count, total, created_at)
  ↓
menu_items(id, nombre, categoría, precio, disponible)

pagos(id, pedido_id, monto, estado, metodo, referencia)
```

**Row Level Security (RLS)**: 
- Público: menu_items, validación de clientes
- Autenticado: pedidos, comandas, pagos
- Admin: auditoría completa

## Workflows Implementados

### 1. Recepción de Mensajes (Prompt 11)
```
Cliente envía SMS/WhatsApp
  ↓
Validar horario laboral (18:00-01:00)
  ↓
Buscar/crear cliente en DB
  ↓
Determinar zona (centro/norte/sur/fuera)
  ↓
Escalera si fuera de cobertura
```

### 2. Toma de Pedido (Prompt 12)
```
Cliente selecciona items
  ↓
Validar disponibilidad en menu
  ↓
Verificar zona de cobertura
  ↓
Crear pedido + comandas
  ↓
Calcular total
```

### 3. Generación de Pago (Prompt 13)
```
Cliente solicita pago
  ↓
Generar transacción MODO
  ↓
Enviar QR/link de pago
  ↓
Esperar webhook de confirmación
  ↓
Actualizar estado pedido
```

### 4. Gestión de Comandas (Prompt 14)
```
nueva → preparando → lista → entregada
  ↓
Máquina de estados validada
  ↓
Auditoría en cada transición
  ↓
Notificaciones en tiempo real
```

## Seguridad & Compliance

### PII Redaction
- Teléfono: `+54 9 11 ***7890`
- Email: `use***@gm***.***`
- Nombre: No se almacena en logs
- Nivel: Application layer

### Rate Limiting
- Claude API: $0.10 USD/sesión (~6.6K tokens)
- Chatwoot: 10 req/min (token bucket)
- MODO: 2 req/s
- Duplicates: 60s window

### Compliance
- ✅ GDPR: Right to be forgotten implementado
- ✅ Ley 25.326 (PDPA Argentina): PII redaction
- ✅ Cifrado: TLS 1.3 en tránsito
- ✅ Auditoría: Logs firmados para no-repudio

## Fases de Desarrollo

### ✅ FASE 1: Infrastructure (5 prompts)
- Supabase schema con RLS
- Seed data Necochea
- TypeScript client
- Config con Zod
- Logger con PII redaction
- **Estado**: ✅ Completada (612 líneas)

### ✅ FASE 2: Backend APIs (9 prompts)
- Express server + middleware
- Webhook validation (IP whitelist)
- Claude API con flujos
- MODO payment integration
- Chatwoot CRM
- 4 workflows (recepción, toma, pago, gestión)
- **Estado**: ✅ Completada (1650 líneas)

### ✅ FASE 3: Frontend PWA (9 prompts)
- Zustand store global
- Componentes React (Header, Cards, Columnas)
- useRealtimeComandas hook
- ConfigModal con sonidos
- soundSystem.ts con Web Audio API
- timeUtils.ts con lógica de urgencia
- PWA manifest + Workbox caching
- **Estado**: ✅ Completada (800 líneas, dist/ generado)

### ⏳ FASE 4: Integraciones (6 prompts)
- Validación DNI (AFIP)
- Generación de reportes (PDF/Excel)
- Escalamientos de soporte
- Enrutamiento de entregas (Google Maps)
- Dashboard administrativo
- Analytics en tiempo real
- **Estado**: No iniciada

### ⏳ FASE 5: DevOps (10 prompts)
- GitHub Actions CI/CD
- Docker + Kubernetes
- Prometheus + Grafana
- AlertManager
- Seguridad (SAST/DAST)
- Compliance automatizado
- Escalamiento automático (HPA)
- Disaster recovery
- **Estado**: No iniciada

## Estructura del Repositorio

```
SIST_PIZZA/
├── .github/
│   └── workflows/ (Fase 5)
├── backend/
│   ├── src/
│   │   ├── server.ts (Prompt 6)
│   │   ├── config/ (Prompt 4)
│   │   ├── lib/ (Logger, Supabase)
│   │   ├── middlewares/ (Prompt 7)
│   │   ├── services/ (Claude, MODO, Chatwoot)
│   │   ├── workflows/ (4 workflows)
│   │   └── integrations/ (Fase 4)
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── components/ (Header, Cards, Modal)
│   │   ├── pages/ (Comandas dashboard)
│   │   ├── hooks/ (useRealtimeComandas)
│   │   ├── store/ (Zustand)
│   │   └── lib/ (timeUtils, soundSystem, supabase)
│   ├── vite.config.ts (PWA)
│   ├── tsconfig.json
│   ├── package.json
│   ├── index.html
│   └── dist/ (Compilado + PWA manifest)
├── supabase/
│   └── migrations/
│       ├── 20250115000000_initial_schema.sql
│       └── 20250115000001_seed_data.sql
├── docker/ (Fase 5)
├── k8s/ (Fase 5)
├── monitoring/ (Fase 5)
├── .env.example (variables de configuración)
├── START_HERE.md (Guía de inicio)
├── PROYECTO_SUMMARY.md (Este archivo)
├── FASE_1_PLAN.md ✅
├── FASE_2_PLAN.md ✅
├── FASE_3_PLAN.md ✅
├── FASE_4_PLAN.md (Próximo)
└── FASE_5_PLAN.md (Final)
```

## Métricas de Código

| Fase | Componente | Líneas | Estado |
|------|-----------|--------|--------|
| 1 | Schema + Seed + Client + Config | 612 | ✅ |
| 2 | Express, Webhooks, APIs, Workflows | 1650 | ✅ |
| 3 | React components, hooks, store | 800 | ✅ |
| 4 | Integraciones (estimado) | 1120 | ⏳ |
| 5 | DevOps (estimado) | 1150 | ⏳ |
| **TOTAL** | | **5332** | 50% |

## Cómo Ejecutar

### Desarrollo Local

```bash
# Setup backend
cd backend
npm install
npm run build
npm start

# Setup frontend (en otra terminal)
cd frontend
npm install
npm run dev

# Supabase local (si usas supabase-cli)
supabase start
```

### Con Docker Compose (Fase 5)
```bash
docker-compose up -d
# Backend: http://localhost:3000
# Frontend: http://localhost:5173
# Postgres: localhost:5432
```

## Roadmap Completud

- **Semana 1**: ✅ Fases 1-3 (60% del código)
- **Semana 2**: ⏳ Fases 4-5 (40% del código)
- **Semana 3**: Testing, performance, security audit
- **Semana 4**: Deploy a producción

## Contributors
- Desarrollador: GitHub Copilot
- Diseño: TailwindCSS + componentes React
- Architecture: Domain-driven design

## Licencia
MIT - Código abierto para pizzerías

---

**Última actualización**: 2025-01-15
**Versión**: 0.3.0 (Fase 3 completada)
**Próximo paso**: Implementar Prompts 25-30 (Fase 4)
