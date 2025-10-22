# 🚀 SUB-PLANIFICACIÓN EJECUTABLE - MÓDULOS 2, 3, 1

## 📊 RESUMEN EJECUTIVO

**Tiempo Total:** 12 horas  
**Orden:** Módulo 2 → Módulo 3 → Módulo 1  
**Tareas:** 18 tareas críticas  

---

## 📦 MÓDULO 2: BACKEND CORE (4 horas)

### TAREA 2.1: Simplificar Configuración ⏱️ 30min
**Archivo:** `backend/src/config/validate.ts`

**Acción:**
```typescript
// REEMPLAZAR todo el archivo con:
import { z } from 'zod';

const configSchema = z.object({
  // CRÍTICOS (requeridos)
  supabase: z.object({
    url: z.string().url(),
    anonKey: z.string().min(20),
    serviceRoleKey: z.string().min(20),
  }),
  
  server: z.object({
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    port: z.coerce.number().min(0).max(65535).default(3000),
    host: z.string().default('0.0.0.0'),
  }),
  
  // OPCIONALES (con fallbacks)
  claude: z.object({
    apiKey: z.string().optional(),
    model: z.string().default('claude-3-5-sonnet-20241022'),
    maxTokens: z.coerce.number().default(6600),
  }).optional(),
  
  modo: z.object({
    apiKey: z.string().optional(),
    webhookSecret: z.string().optional(),
  }).optional(),
  
  chatwoot: z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional(),
  }).optional(),
  
  database: z.object({
    encryptionKey: z.string().optional(),
  }).optional(),
  
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),
});

export type Config = z.infer<typeof configSchema>;

export function validateConfig(env: any): Config {
  try {
    return configSchema.parse({
      supabase: {
        url: env.SUPABASE_URL,
        anonKey: env.SUPABASE_ANON_KEY,
        serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
      },
      server: {
        nodeEnv: env.NODE_ENV,
        port: env.PORT,
        host: env.HOST,
      },
      claude: env.ANTHROPIC_API_KEY ? {
        apiKey: env.ANTHROPIC_API_KEY,
        model: env.CLAUDE_MODEL,
        maxTokens: env.MAX_TOKENS_PER_SESSION,
      } : undefined,
      modo: env.MODO_API_KEY ? {
        apiKey: env.MODO_API_KEY,
        webhookSecret: env.MODO_WEBHOOK_SECRET,
      } : undefined,
      chatwoot: env.CHATWOOT_API_KEY ? {
        apiKey: env.CHATWOOT_API_KEY,
        baseUrl: env.CHATWOOT_BASE_URL,
      } : undefined,
      database: {
        encryptionKey: env.DB_ENCRYPTION_KEY,
      },
      logging: {
        level: env.LOG_LEVEL,
      },
    });
  } catch (error) {
    console.error('❌ Error validando configuración:', error);
    throw new Error('Configuración inválida. Revisa tu archivo .env');
  }
}
```

**Comando:**
```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA/backend
# Archivo se reemplazará con código de arriba
```

**Validación:**
```bash
npm run build
# Debe compilar sin errores
```

---

### TAREA 2.2: Actualizar backend/src/config/index.ts ⏱️ 15min

**Acción:**
```typescript
// REEMPLAZAR archivo completo:
import dotenv from 'dotenv';
import { validateConfig } from './validate';

dotenv.config();

export const config = validateConfig(process.env);

// Helpers
export const isDevelopment = config.server.nodeEnv === 'development';
export const isProduction = config.server.nodeEnv === 'production';
export const isTest = config.server.nodeEnv === 'test';

export const isClaudeEnabled = !!config.claude?.apiKey;
export const isModoEnabled = !!config.modo?.apiKey;
export const isChatwootEnabled = !!config.chatwoot?.apiKey;

console.log('✅ Configuración cargada:', {
  environment: config.server.nodeEnv,
  port: config.server.port,
  supabase: '✓',
  claude: isClaudeEnabled ? '✓' : '✗ (mock)',
  modo: isModoEnabled ? '✓' : '✗ (mock)',
  chatwoot: isChatwootEnabled ? '✓' : '✗ (disabled)',
});
```

---

### TAREA 2.3: Mejorar Health Check ⏱️ 15min

**Archivo:** `backend/src/server.ts`

**Agregar ruta:**
```typescript
// Después de las importaciones, antes de las rutas
app.get('/api/health', async (req, res) => {
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: config.server.nodeEnv,
    uptime: process.uptime(),
    database: 'checking...',
    integrations: {
      supabase: false,
      claude: isClaudeEnabled,
      modo: isModoEnabled,
      chatwoot: isChatwootEnabled,
    },
  };
  
  try {
    const { data, error } = await supabase
      .from('menu_items')
      .select('count')
      .limit(1);
    
    if (!error) {
      health.database = 'ok';
      health.integrations.supabase = true;
    }
  } catch (err) {
    health.database = 'error';
  }
  
  res.json(health);
});
```

---

### TAREA 2.4: Crear Webhook N8N ⏱️ 1h

**Archivo nuevo:** `backend/src/workflows/webhookN8N.ts`

**Código completo en archivo adjunto por espacio**

---

### TAREA 2.5: Recompilar Backend ⏱️ 5min

```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA/backend
npm run build
```

**Validación:**
- Sin errores TypeScript
- Carpeta `dist/` actualizada

---

### TAREA 2.6: Levantar Backend Dev ⏱️ 30min

```bash
# Matar procesos previos
pkill -f "node.*backend" || true
pkill -f "ts-node-dev" || true

# Levantar
cd /home/eevan/ProyectosIA/SIST_PIZZA/backend
PORT=3000 npm run dev
```

**Validación:**
```bash
# En otra terminal
curl http://localhost:3000/api/health
# Debe responder JSON
```

---

### TAREA 2.7: Test Webhook N8N ⏱️ 30min

```bash
curl -X POST http://localhost:3000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "telefono": "2262999888",
      "direccion": "Calle 50 #123, Necochea"
    },
    "items": [
      { "nombre": "Muzzarella", "cantidad": 2 }
    ],
    "notas": "Sin aceitunas",
    "origen": "whatsapp"
  }'
```

**Esperado:**
```json
{
  "success": true,
  "pedido_id": "uuid-xxxxx",
  "total": 10500,
  "mensaje": "Pedido creado..."
}
```

---

### TAREA 2.8: Documentar API ⏱️ 30min

**Archivo:** `BACKEND_API.md`

**Contenido mínimo:**
```markdown
# Backend API Endpoints

## Health Check
GET /api/health

## Comandas
POST /api/comandas
GET /api/comandas/:id
PUT /api/comandas/:id

## Webhooks
POST /api/webhooks/n8n/pedido
POST /api/webhooks/modo
POST /api/webhooks/chatwoot
```

---

## ✅ CRITERIOS MÓDULO 2
- [ ] Backend compila sin errores
- [ ] Server levanta en puerto 3000
- [ ] `/api/health` responde 200
- [ ] Webhook N8N crea pedidos
- [ ] Documentación API lista

---

## 📦 MÓDULO 3: SUPABASE (2 horas)

### TAREA 3.1: Crear Proyecto Supabase ⏱️ 15min

**Pasos:**
1. Ir a https://supabase.com
2. Sign Up / Log In
3. Click "New Project"
4. Completar:
   - Name: `sist-pizza-prod`
   - Database Password: (generar y GUARDAR)
   - Region: `South America (São Paulo)`
5. Wait ~2 min

---

### TAREA 3.2: Copiar Credenciales ⏱️ 10min

**En Supabase Dashboard:**
1. Settings → API
2. Copiar:
   - Project URL
   - anon public key
   - service_role key (secret!)

---

### TAREA 3.3: Actualizar .env Files ⏱️ 15min

**backend/.env:**
```bash
SUPABASE_URL=https://xxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

NODE_ENV=development
PORT=3000

# Opcionales (dejar mock por ahora)
# ANTHROPIC_API_KEY=sk-ant-...
# MODO_API_KEY=...
```

**frontend/.env:**
```bash
VITE_SUPABASE_URL=https://xxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:3000
```

---

### TAREA 3.4: Ejecutar Migración Schema ⏱️ 20min

**En Supabase Dashboard:**
1. SQL Editor (panel izquierdo)
2. New Query
3. Copiar contenido de: `supabase/migrations/20250115000000_initial_schema.sql`
4. Run (botón verde)
5. Verificar: "Success. No rows returned"

---

### TAREA 3.5: Ejecutar Seed Data ⏱️ 15min

**En SQL Editor:**
1. New Query
2. Copiar: `supabase/migrations/20250115000001_seed_data.sql`
3. Run
4. Verificar: "Success. 30 rows affected" (aprox)

---

### TAREA 3.6: Verificar Tablas ⏱️ 10min

**Table Editor:**
- clientes
- menu_items (debe tener 10 pizzas)
- pedidos
- detalle_pedidos
- zonas_entrega
- audit_logs
- support_tickets

---

### TAREA 3.7: Test Conexión Backend ⏱️ 15min

```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA/backend

# Reiniciar backend con nuevas credenciales
npm run dev

# Test
curl http://localhost:3000/api/health
# Verificar: "database": "ok"
```

---

### TAREA 3.8: Test Query Básico ⏱️ 10min

```bash
# Desde backend
node -e "
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);
supabase
  .from('menu_items')
  .select('nombre, precio')
  .then(({ data }) => console.log(data));
"
```

---

## ✅ CRITERIOS MÓDULO 3
- [ ] Proyecto Supabase creado
- [ ] Credenciales en .env
- [ ] Schema migrado (7 tablas)
- [ ] Seed data cargado (10+ pizzas)
- [ ] Backend conecta a Supabase
- [ ] Queries funcionan

---

## 📦 MÓDULO 1: CANALES (6 horas) - PRÓXIMA PARTE

**Continúa en PARTE 2...**

---

## 🎯 ESTADO ACTUAL

```
✅ PLANIFICADO: Módulo 2 (8 tareas)
✅ PLANIFICADO: Módulo 3 (8 tareas)
⏳ PENDIENTE: Módulo 1 (6 tareas) - Parte 2
```

**Total tareas Parte 1:** 16 tareas
**Tiempo Parte 1:** ~6-7 horas
