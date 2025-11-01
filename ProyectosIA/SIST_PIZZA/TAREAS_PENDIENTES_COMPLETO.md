# 📋 TAREAS PENDIENTES - ANÁLISIS EXHAUSTIVO COMPLETO
## Fecha: 2025-10-26
## Estado: PRIORIZADO Y CATEGORIZADO

---

## 🎯 RESUMEN EJECUTIVO

**Total de tareas identificadas:** 68
**Prioridad Alta:** 24
**Prioridad Media:** 28
**Prioridad Baja:** 16

**Distribución por categoría:**
- 🔴 CRÍTICO - Seguridad/Prod: 12 tareas
- 🟠 ALTO - Integraciones: 18 tareas
- 🟡 MEDIO - Testing/QA: 15 tareas
- 🟢 BAJO - Optimización: 13 tareas
- 🔵 INFO - Documentación: 10 tareas

---

## 🔴 CATEGORÍA 1: CRÍTICO - SEGURIDAD Y PRODUCCIÓN (Prioridad: ALTA)

### 1.1 Validación HMAC en Webhooks ⚠️ CRÍTICO
**Archivo:** `backend/src/middlewares/validateWebhook.ts`
**TODO encontrado:** Línea 85 - `// TODO: Validar firma (X-Webhook-Signature)`

**Tarea:**
- ✅ Implementar validación HMAC para Chatwoot webhooks
- ✅ Implementar validación HMAC para Modo webhooks
- ✅ Implementar validación HMAC para MercadoPago webhooks (futuro)
- ⚠️ Actualizar `verifyHmacSignatureFromRaw` para todos los servicios

**Impacto:** CRÍTICO - Sin esto, webhooks son vulnerables a falsificación
**Tiempo estimado:** 2-3 horas
**Dependencias:** Obtener secrets de cada servicio

**Implementación requerida:**
```typescript
// Chatwoot
export function validateChatwootWebhook(req, res, next) {
  const signature = req.headers['x-chatwoot-signature'];
  const secret = process.env.CHATWOOT_WEBHOOK_SECRET;
  
  if (!verifyHmacSignatureFromRaw(req.rawBody, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }
  next();
}
```

---

### 1.2 RLS (Row Level Security) Auditoría Completa ⚠️ CRÍTICO
**Archivo:** `supabase/migrations/20250115000000_initial_schema.sql`

**Problemas identificados:**
1. ❌ **Política de INSERT ausente para anon en `menu_items`**
   - Actual: Solo `service_role` puede insertar
   - Problema: Si frontend intenta crear, falla
   
2. ❌ **Política de UPDATE/DELETE no definida explícitamente**
   - Actual: Se asume `service_role` tiene todo
   - Problema: No hay control granular
   
3. ❌ **Auditoría de acceso no implementada**
   - No hay tabla `audit_logs` activa
   - No hay triggers para registrar accesos

4. ❌ **Políticas para tabla `pedidos` muy permisivas**
   - Falta: Usuarios solo pueden ver SUS pedidos
   - Falta: Validación de ownership

**Tarea:**
```sql
-- 1. Política restrictiva para pedidos (usuarios solo ven los suyos)
CREATE POLICY "Users see own pedidos"
  ON pedidos
  FOR SELECT
  USING (
    auth.uid() = cliente_id 
    OR auth.role() = 'service_role'
  );

-- 2. Trigger de auditoría
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL,
  user_id UUID,
  old_data JSONB,
  new_data JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION audit_trigger()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO audit_logs (table_name, operation, user_id, old_data, new_data)
  VALUES (TG_TABLE_NAME, TG_OP, auth.uid(), 
    row_to_json(OLD), row_to_json(NEW));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

**Impacto:** CRÍTICO - Seguridad de datos
**Tiempo estimado:** 4-6 horas
**Archivo nuevo:** `supabase/migrations/20250126000003_rls_audit.sql`

---

### 1.3 Índices de Base de Datos Faltantes ⚠️ ALTO
**Archivo:** `supabase/migrations/20250115000000_initial_schema.sql`

**Índices faltantes identificados:**
```sql
-- 1. Índices compuestos para queries frecuentes
CREATE INDEX idx_pedidos_cliente_estado ON pedidos(cliente_id, estado);
CREATE INDEX idx_pedidos_fecha_estado ON pedidos(created_at DESC, estado);
CREATE INDEX idx_comandas_pedido_estado ON comandas(pedido_id, estado);

-- 2. Índices para FK (mejorar JOIN performance)
CREATE INDEX idx_comandas_menu_item ON comandas(menu_item_id);
CREATE INDEX idx_pagos_pedido ON pagos(pedido_id);
CREATE INDEX idx_entregas_pedido ON entregas(pedido_id) WHERE EXISTS;

-- 3. Índices para búsquedas textuales
CREATE INDEX idx_clientes_direccion_trgm ON clientes 
  USING gin(direccion gin_trgm_ops);

-- 4. Índices parciales (mejora performance)
CREATE INDEX idx_pedidos_pendientes ON pedidos(created_at DESC)
  WHERE estado IN ('pendiente', 'confirmado');
```

**Impacto:** ALTO - Performance (queries lentas > 500ms)
**Tiempo estimado:** 1 hora
**Archivo nuevo:** `supabase/migrations/20250126000004_indexes.sql`

---

### 1.4 Foreign Keys y ON DELETE Actions ⚠️ MEDIO
**Archivo:** Migraciones SQL

**Problemas:**
1. ❌ No todas las FKs tienen `ON DELETE` definido
2. ❌ Falta `ON UPDATE CASCADE` en algunos casos
3. ❌ No hay constraint names explícitos

**Tarea:**
```sql
-- Ejemplo de FK bien definido
ALTER TABLE comandas
  ADD CONSTRAINT fk_comandas_pedido
  FOREIGN KEY (pedido_id)
  REFERENCES pedidos(id)
  ON DELETE CASCADE
  ON UPDATE CASCADE;

-- Auditar TODAS las FKs y asegurar comportamiento correcto
```

**Impacto:** MEDIO - Integridad referencial
**Tiempo estimado:** 2 horas

---

### 1.5 Variables de Entorno - Validación en Runtime ⚠️ MEDIO
**Archivo:** `backend/src/config/validate.ts`

**Problema:**
- ✅ Validación con Zod existe
- ❌ No valida formatos específicos (URLs, API keys)
- ❌ No valida ranges de valores

**Mejoras requeridas:**
```typescript
// Validar formato de API keys
claude: z.object({
  apiKey: z.string()
    .startsWith('sk-ant-', 'Claude API key debe empezar con sk-ant-')
    .min(50)
    .optional(),
}),

// Validar URLs
supabase: z.object({
  url: z.string()
    .url('SUPABASE_URL debe ser una URL válida')
    .regex(/\.supabase\.co$/, 'Debe ser un dominio Supabase válido'),
}),

// Validar ranges
server: z.object({
  port: z.coerce.number()
    .min(1024, 'Puerto debe ser >= 1024')
    .max(65535),
}),
```

**Impacto:** MEDIO - Prevención de errores de configuración
**Tiempo estimado:** 1 hora

---

### 1.6 CSP y Headers de Seguridad en Frontend ⚠️ MEDIO
**Archivo:** `frontend/vite.config.ts`

**Problemas:**
- ❌ CSP no configurada en respuestas del frontend
- ❌ Headers de seguridad adicionales faltantes
- ❌ HSTS no configurado

**Tarea:**
```typescript
// vite.config.ts
export default defineConfig({
  server: {
    headers: {
      'Content-Security-Policy': "default-src 'self'; ...",
      'X-Frame-Options': 'DENY',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=()',
    }
  }
});
```

**Impacto:** MEDIO - Seguridad frontend
**Tiempo estimado:** 1 hora

---

## 🟠 CATEGORÍA 2: INTEGRACIONES EXTERNAS (Prioridad: ALTA)

### 2.1 Modo API - Integración Real ⚠️ CRÍTICO
**Archivo:** `backend/src/services/modo.ts`
**TODOs encontrados:**
- Línea 195: `// TODO: Actualizar pedido en DB`
- Línea 207: `// TODO: Iniciar polling (máx 10 min)`
- Línea 219: `// TODO: Notificar rechazo al cliente`
- Línea 245: `return null; // TODO: Implementar`

**Estado actual:** 🟡 SIMULADO (mock)

**Tareas requeridas:**

#### 2.1.1 Implementar API calls reales
```typescript
async crearTransaccion(pedidoId, amountARS, webhookUrl) {
  const response = await fetch(`${MODO_CONFIG.baseURL}/v1/payments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${MODO_CONFIG.apiKey}`,
      'Content-Type': 'application/json',
      'X-Merchant-Id': MODO_CONFIG.merchantId,
    },
    body: JSON.stringify({
      reference: pedidoId,
      amount: Math.round(amountARS * 100),
      currency: 'ARS',
      webhook_url: webhookUrl,
      description: `Pedido pizzería #${pedidoId}`,
    }),
  });
  
  if (!response.ok) {
    throw new Error(`Modo API error: ${response.status}`);
  }
  
  return response.json();
}
```

#### 2.1.2 Actualizar pedido en DB tras pago aprobado
```typescript
case 'approved':
  // Actualizar en Supabase
  const { error } = await supabase
    .from('pedidos')
    .update({
      estado: 'confirmado',
      pago_confirmado_at: new Date().toISOString(),
      modo_operation_id: operation_id,
    })
    .eq('id', reference);
  
  if (error) throw error;
  
  // Actualizar métrica
  paymentsAttempts.inc({ metodo: 'modo', status: 'success' });
```

#### 2.1.3 Implementar polling para pagos pendientes
```typescript
async iniciarPolling(operationId: string, maxMinutes = 10) {
  const startTime = Date.now();
  const maxTime = maxMinutes * 60 * 1000;
  
  while (Date.now() - startTime < maxTime) {
    const status = await this.consultarEstado(operationId);
    
    if (status?.status === 'approved') {
      return status;
    }
    
    if (status?.status === 'rejected' || status?.status === 'cancelled') {
      throw new Error(`Payment ${status.status}`);
    }
    
    // Backoff exponencial
    await sleep(Math.min(5000 * Math.pow(1.5, iteration), 30000));
  }
  
  throw new Error('Polling timeout');
}
```

#### 2.1.4 Notificación de rechazo
```typescript
case 'rejected':
case 'cancelled':
  // Enviar email/SMS/WhatsApp al cliente
  await notificacionService.enviar({
    to: clienteTelefono,
    template: 'pago_rechazado',
    data: {
      pedidoId: reference,
      motivo: status,
    },
  });
  
  // Actualizar pedido en DB
  await supabase
    .from('pedidos')
    .update({ estado: 'cancelado' })
    .eq('id', reference);
```

#### 2.1.5 Implementar consultarEstado
```typescript
async consultarEstado(operationId: string): Promise<ModoTransaccion | null> {
  const response = await fetch(
    `${MODO_CONFIG.baseURL}/v1/payments/${operationId}`,
    {
      headers: {
        'Authorization': `Bearer ${MODO_CONFIG.apiKey}`,
      },
    }
  );
  
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`Modo API error: ${response.status}`);
  
  return response.json();
}
```

**Impacto:** CRÍTICO - Pagos no funcionan sin esto
**Tiempo estimado:** 8-12 horas
**Dependencias:** Credenciales Modo API reales

---

### 2.2 Chatwoot API - Integración Real ⚠️ ALTO
**Archivo:** `backend/src/services/chatwoot.ts`

**Estado actual:** 🟡 SIMULADO (mock)

**Tareas requeridas:**

#### 2.2.1 Implementar API calls reales
```typescript
async crearConversacion(clienteTelefono, clienteNombre) {
  // 1. Buscar o crear contacto
  const contact = await this.findOrCreateContact(clienteTelefono, clienteNombre);
  
  // 2. Crear conversación
  const response = await fetch(
    `${CHATWOOT_CONFIG.baseURL}/api/v1/accounts/${CHATWOOT_CONFIG.accountId}/conversations`,
    {
      method: 'POST',
      headers: {
        'api_access_token': CHATWOOT_CONFIG.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contact_id: contact.id,
        inbox_id: CHATWOOT_CONFIG.inboxId,
        status: 'open',
      }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Chatwoot API error: ${response.status}`);
  }
  
  return response.json();
}
```

#### 2.2.2 Implementar envío de mensajes real
```typescript
async enviarMensaje(conversationId, mensaje) {
  const response = await fetch(
    `${CHATWOOT_CONFIG.baseURL}/api/v1/accounts/${CHATWOOT_CONFIG.accountId}/conversations/${conversationId}/messages`,
    {
      method: 'POST',
      headers: {
        'api_access_token': CHATWOOT_CONFIG.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: mensaje,
        message_type: 'outgoing',
        private: false,
      }),
    }
  );
  
  if (!response.ok) {
    throw new Error(`Chatwoot send error: ${response.status}`);
  }
  
  return response.json();
}
```

#### 2.2.3 Webhook handler para Chatwoot
**Archivo nuevo:** `backend/src/workflows/chatwootWebhook.ts`

```typescript
import { Router } from 'express';
import { validateChatwootWebhook } from '../middlewares/validateWebhook';
import { chatwootService } from '../services/chatwoot';

const router = Router();

router.post(
  '/api/webhooks/chatwoot',
  validateChatwootWebhook,
  async (req, res) => {
    const { event, conversation, message } = req.body;
    
    switch (event) {
      case 'message_created':
        // Procesar mensaje del cliente
        if (message.message_type === 0) { // incoming
          await procesarMensajeCliente(conversation, message);
        }
        break;
        
      case 'conversation_status_changed':
        await actualizarEstadoConversacion(conversation);
        break;
    }
    
    res.json({ success: true });
  }
);

export default router;
```

**Impacto:** ALTO - Soporte al cliente
**Tiempo estimado:** 6-8 horas
**Dependencias:** Credenciales Chatwoot reales

---

### 2.3 AFIP API - Validación Real de DNI ⚠️ MEDIO
**Archivo:** `backend/src/integrations/afip.ts`

**Estado actual:** ✅ Estructura implementada
**Problema:** ❌ No validado contra API real

**Tareas:**
1. Validar que la integración funciona con AFIP Webservices
2. Implementar certificado digital (si es necesario)
3. Agregar tests de integración con datos reales
4. Documentar proceso de obtención de certificado

**Impacto:** MEDIO - Validación de clientes
**Tiempo estimado:** 4 horas

---

### 2.4 WhatsApp (WAHA) - Integración Completa ⚠️ ALTO
**Archivo:** No existe integración directa

**Problemas:**
- ❌ No hay cliente WAHA implementado
- ❌ Se asume N8N maneja todo
- ❌ No hay fallback si N8N falla

**Tarea:**
Crear cliente directo a WAHA como backup:

**Archivo nuevo:** `backend/src/services/waha.ts`
```typescript
export class WAHAService {
  private baseURL = process.env.WAHA_BASE_URL || 'http://localhost:3000';
  
  async enviarMensaje(to: string, message: string) {
    const response = await fetch(`${this.baseURL}/api/sendText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: `${to}@c.us`,
        text: message,
        session: 'default',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`WAHA error: ${response.status}`);
    }
    
    return response.json();
  }
}
```

**Impacto:** ALTO - Comunicación con clientes
**Tiempo estimado:** 4 horas

---

## 🟡 CATEGORÍA 3: TESTING Y QA (Prioridad: MEDIA)

### 3.1 Tests Faltantes - Cobertura Crítica ⚠️ ALTO

**Situación actual:**
```bash
# Tests existentes (12 archivos)
✅ api_endpoints.test.ts
✅ backend.test.ts
✅ export_rate_limit.test.ts
✅ menu_admin.test.ts
✅ metrics_rate_limit.test.ts
✅ patch_pedidos_schema.test.ts
✅ pedidos_export.test.ts
✅ pedidos_list.test.ts
✅ ratelimit_endpoints.test.ts
✅ supabase_mocks.test.ts
✅ webhook_hmac.test.ts
✅ webhook_hmac_rawbody.test.ts
```

**Tests FALTANTES críticos:**

#### 3.1.1 Tests de Circuit Breaker ⚠️ ALTO
**Archivo nuevo:** `backend/src/__tests__/claude-circuit-breaker.test.ts`

```typescript
describe('Claude Circuit Breaker', () => {
  it('should open after 5 consecutive failures', async () => {
    // Mock 5 fallos
    for (let i = 0; i < 5; i++) {
      await expect(llamarClaude(...)).rejects.toThrow();
    }
    
    // Circuit breaker debe estar abierto
    const response = await llamarClaude(...);
    expect(response).toContain('temporalmente no disponible');
  });
  
  it('should reset after timeout', async () => {
    // Abrir circuit breaker
    // Esperar 60 segundos
    // Verificar que se reabre
  });
});
```

**Tiempo estimado:** 2 horas

---

#### 3.1.2 Tests de Cache Redis ⚠️ ALTO
**Archivo nuevo:** `backend/src/__tests__/claude-cache.test.ts`

```typescript
describe('Claude Cache', () => {
  it('should cache responses with SHA-256 key', async () => {
    const response1 = await llamarClaude(...);
    const response2 = await llamarClaude(...); // Same params
    
    expect(response1).toBe(response2); // Cache hit
    expect(mockClaudeAPI).toHaveBeenCalledTimes(1);
  });
  
  it('should invalidate cache by pattern', async () => {
    await setCachedResponse(...);
    await invalidateCachePattern('*');
    
    const keys = await redis.keys('claude:cache:*');
    expect(keys).toHaveLength(0);
  });
});
```

**Tiempo estimado:** 2 horas

---

#### 3.1.3 Tests de Modo Webhook HMAC ⚠️ MEDIO
**Archivo nuevo:** `backend/src/__tests__/modo-webhook.test.ts`

```typescript
describe('Modo Webhook', () => {
  it('should reject webhooks without HMAC', async () => {
    const response = await request(app)
      .post('/api/webhooks/modo')
      .send({ operation_id: 'test' });
    
    expect(response.status).toBe(401);
  });
  
  it('should accept webhooks with valid HMAC', async () => {
    const payload = { operation_id: 'test', status: 'approved' };
    const signature = createHmac('sha256', SECRET)
      .update(JSON.stringify(payload))
      .digest('hex');
    
    const response = await request(app)
      .post('/api/webhooks/modo')
      .set('X-Webhook-Signature', signature)
      .send(payload);
    
    expect(response.status).toBe(200);
  });
});
```

**Tiempo estimado:** 2 horas

---

#### 3.1.4 Tests de RLS Policies ⚠️ ALTO
**Archivo nuevo:** `backend/src/__tests__/rls-policies.test.ts`

```typescript
describe('RLS Policies', () => {
  it('should prevent users from seeing other users orders', async () => {
    // Login como user1
    const { data } = await supabase
      .from('pedidos')
      .select('*');
    
    // Debe solo ver pedidos propios
    expect(data).toHaveLength(1);
    expect(data[0].cliente_id).toBe(user1.id);
  });
  
  it('should allow service_role to see all orders', async () => {
    // Login con service_role key
    const { data } = await supabaseAdmin
      .from('pedidos')
      .select('*');
    
    // Debe ver TODOS
    expect(data).toHaveLength(10);
  });
});
```

**Tiempo estimado:** 3 horas

---

#### 3.1.5 Tests E2E con Playwright ⚠️ MEDIO
**Archivo nuevo:** `backend/src/__tests__/e2e/pedido-flow.spec.ts`

```typescript
test('Complete order flow', async ({ page }) => {
  // 1. Webhook N8N crea pedido
  await request(app).post('/api/webhooks/n8n/pedido').send({...});
  
  // 2. Verificar pedido en DB
  const pedido = await getPedidoFromDB();
  expect(pedido.estado).toBe('pendiente');
  
  // 3. Simular pago
  await request(app).post('/api/webhooks/modo').send({
    operation_id: 'test',
    reference: pedido.id,
    status: 'approved',
  });
  
  // 4. Verificar estado actualizado
  const pedidoActualizado = await getPedidoFromDB();
  expect(pedidoActualizado.estado).toBe('confirmado');
});
```

**Tiempo estimado:** 4 horas

---

#### 3.1.6 Tests de Performance (k6) ⚠️ BAJO
**Archivo nuevo:** `backend/src/__tests__/performance/load-test.js`

```javascript
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 100 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% < 500ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
  },
};

export default function () {
  const res = http.get('http://localhost:3000/health');
  check(res, { 'status is 200': (r) => r.status === 200 });
}
```

**Comando:**
```bash
k6 run backend/src/__tests__/performance/load-test.js
```

**Tiempo estimado:** 2 horas

---

### 3.2 Coverage Threshold en CI ⚠️ MEDIO
**Archivo:** `backend/vitest.config.ts` y `.github/workflows/ci.yml`

**Problema:** No hay threshold definido

**Tarea:**
```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      lines: 70,
      functions: 70,
      branches: 65,
      statements: 70,
      exclude: [
        'node_modules/',
        '__tests__/',
        '*.config.ts',
      ],
    },
  },
});
```

```yaml
# .github/workflows/ci.yml
- name: Test with coverage
  run: npm test -- --coverage
- name: Check coverage threshold
  run: |
    if [ -f coverage/coverage-summary.json ]; then
      node scripts/check-coverage.js
    fi
```

**Tiempo estimado:** 1 hora

---

## 🟢 CATEGORÍA 4: OPTIMIZACIÓN Y PERFORMANCE (Prioridad: BAJA-MEDIA)

### 4.1 Implementar Contadores de Cache ⚠️ BAJO
**Archivo:** `backend/src/services/claude-cache.ts`
**TODO:** Línea 144 - `hits: 0, // TODO: Implementar contadores`

**Tarea:**
```typescript
// Usar Redis para contadores
let cacheHits = 0;
let cacheMisses = 0;

export async function getCachedResponse(...) {
  const cached = await client.get(key);
  
  if (cached) {
    cacheHits++;
    await client.incr('claude:cache:stats:hits');
    return cached;
  }
  
  cacheMisses++;
  await client.incr('claude:cache:stats:misses');
  return null;
}

export async function getCacheStats() {
  const hits = await client.get('claude:cache:stats:hits') || 0;
  const misses = await client.get('claude:cache:stats:misses') || 0;
  const hitRate = hits / (hits + misses) * 100;
  
  return { hits, misses, hitRate };
}
```

**Impacto:** BAJO - Métricas nice-to-have
**Tiempo estimado:** 30 minutos

---

### 4.2 Consultar Pedidos Previos en Contexto Claude ⚠️ MEDIO
**Archivo:** `backend/src/workflows/recepcionMensajes.ts`
**TODO:** Línea (approx) - `pedidos_previos_count: 0, // TODO: Consultar DB`

**Tarea:**
```typescript
async function getClientePedidosCount(clienteId: string): Promise<number> {
  const { count, error } = await supabase
    .from('pedidos')
    .select('*', { count: 'exact', head: true })
    .eq('cliente_id', clienteId)
    .eq('estado', 'entregado');
  
  if (error) {
    safeLogger.error('Error counting pedidos', { error });
    return 0;
  }
  
  return count || 0;
}

// Usar en contexto
const contexto: ContextoClaude = {
  cliente_tipo: pedidosCount > 10 ? 'vip' : pedidosCount > 0 ? 'recurrente' : 'nuevo',
  pedidos_previos_count: pedidosCount,
  zona: determinarZona(direccion),
  hora_actual: now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
  es_horario_laboral: esHorarioLaboral(now),
};
```

**Impacto:** MEDIO - Mejora experiencia cliente
**Tiempo estimado:** 1 hora

---

### 4.3 Estado Actual de Pedido en Comandas ⚠️ MEDIO
**Archivo:** `backend/src/workflows/gestionComandas.ts`
**TODO:** Línea (approx) - `// TODO: Obtener estado actual del pedido`

**Tarea:**
```typescript
async function obtenerEstadoPedido(pedidoId: string) {
  const { data, error } = await supabase
    .from('pedidos')
    .select('estado, created_at, updated_at')
    .eq('id', pedidoId)
    .single();
  
  if (error) throw error;
  return data;
}
```

**Impacto:** BAJO - Nice-to-have
**Tiempo estimado:** 30 minutos

---

### 4.4 Event Emitter para Comandas ⚠️ BAJO
**Archivo:** `backend/src/workflows/gestionComandas.ts`
**TODO:** Línea (approx) - `// TODO: Emit 'comanda:actualizada' event`

**Tarea:**
```typescript
import { EventEmitter } from 'events';

const comandaEvents = new EventEmitter();

// Emit evento
comandaEvents.emit('comanda:actualizada', {
  pedidoId,
  nuevoEstado,
  timestamp: new Date().toISOString(),
});

// Listener
comandaEvents.on('comanda:actualizada', async (data) => {
  // Notificar frontend vía websocket
  // Actualizar dashboard real-time
  await notificarFrontend(data);
});
```

**Impacto:** BAJO - Real-time updates
**Tiempo estimado:** 1 hora

---

### 4.5 Compresión de Responses ⚠️ BAJO
**Archivo:** `backend/src/server.ts`

**Problema:** No hay compresión gzip

**Tarea:**
```typescript
import compression from 'compression';

app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6, // Nivel de compresión (0-9)
}));
```

**Impacto:** BAJO - Reduce bandwidth
**Tiempo estimado:** 15 minutos

---

### 4.6 Connection Pooling Supabase ⚠️ MEDIO
**Archivo:** `backend/src/lib/supabase.ts`

**Problema:** No hay pool explícito

**Tarea:**
```typescript
import { createClient } from '@supabase/supabase-js';

export const supabase = createClient(url, key, {
  db: {
    schema: 'public',
  },
  auth: {
    autoRefreshToken: true,
    persistSession: false,
  },
  global: {
    headers: {
      'x-application-name': 'sist-pizza-backend',
    },
  },
  // Connection pooling
  poolSize: 10,
  maxWaitTime: 5000,
});
```

**Impacto:** MEDIO - Performance DB
**Tiempo estimado:** 30 minutos

---

## 🔵 CATEGORÍA 5: DOCUMENTACIÓN Y DEVEX (Prioridad: BAJA)

### 5.1 OpenAPI/Swagger Documentation ⚠️ MEDIO
**Archivo nuevo:** `backend/src/swagger.ts`

**Tarea:**
```typescript
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'SIST Pizza API',
      version: '1.0.0',
      description: 'API para sistema de gestión de pizzería',
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
      { url: 'https://api.sistpizza.com', description: 'Production' },
    ],
  },
  apis: ['./src/workflows/*.ts', './src/routes/*.ts'],
};

const specs = swaggerJsdoc(options);

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));
```

**Impacto:** MEDIO - DX
**Tiempo estimado:** 3 horas

---

### 5.2 Runbooks Operacionales ⚠️ MEDIO
**Archivo nuevo:** `docs/06-operacion/RUNBOOKS.md`

**Contenido requerido:**
```markdown
# Runbooks Operacionales

## 1. Pico de 5xx
**Síntomas:** Alertas HighErrorRate/CriticalErrorRate
**Acciones:**
1. Ver logs: `docker logs backend | grep ERROR`
2. Ver métricas: `curl localhost:3000/metrics | grep http_requests_total{status~="5.."}`
3. Revisar DB connections: `curl localhost:3000/metrics | grep db_connections`
4. Verificar Redis: `redis-cli PING`

## 2. Circuit Breaker Abierto
**Síntomas:** Alerta ClaudeCircuitBreakerOpen
**Acciones:**
1. Ver métricas: `curl localhost:3000/metrics | grep claude_circuit_breaker`
2. Verificar Claude API: `curl https://api.anthropic.com/health`
3. Esperar 1 minuto para auto-recuperación
4. Revisar logs: `grep "Circuit breaker" logs/*.log`

## 3. Redis Memory High
...
```

**Impacto:** MEDIO - Operaciones
**Tiempo estimado:** 2 horas

---

### 5.3 ADRs (Architecture Decision Records) ⚠️ BAJO
**Directorio nuevo:** `docs/07-adr/`

**Ejemplo:**
```markdown
# ADR-001: Usar Redis para Cache de Claude

## Estado
Aceptado

## Contexto
Claude API es costosa ($0.015 por 1K tokens input). 
Muchas queries son repetitivas.

## Decisión
Implementar cache Redis con TTL de 1 hora.

## Consecuencias
+ Ahorro estimado: 35% en costos
+ Latencia reducida: <10ms vs ~2s
- Complejidad adicional
- Requiere Redis running
```

**Impacto:** BAJO - Documentación
**Tiempo estimado:** 1 hora

---

### 5.4 Contributor Guidelines ⚠️ BAJO
**Archivo nuevo:** `CONTRIBUTING.md`

**Contenido:**
```markdown
# Contributing to SIST Pizza

## Flujo de Trabajo
1. Fork el repo
2. Crear rama: `git checkout -b feature/mi-feature`
3. Commit: `git commit -m "feat: descripción"`
4. Push: `git push origin feature/mi-feature`
5. Crear PR

## Standards
- TypeScript strict mode
- ESLint + Prettier
- Commits convencionales
- Tests obligatorios
- Coverage >= 70%

## Testing
\`\`\`bash
npm test
npm test -- --coverage
\`\`\`
```

**Impacto:** BAJO - Comunidad
**Tiempo estimado:** 30 minutos

---

## 📊 PRIORIZACIÓN Y ROADMAP

### Sprint 1 (2 semanas) - CRÍTICO
**Objetivo:** Seguridad y estabilidad en producción

- [ ] 1.1 Validación HMAC en webhooks (2-3h)
- [ ] 1.2 RLS Auditoría completa (4-6h)
- [ ] 1.3 Índices de BD (1h)
- [ ] 2.1 Modo API integración real (8-12h)
- [ ] 3.1.1 Tests Circuit Breaker (2h)
- [ ] 3.1.2 Tests Cache Redis (2h)

**Total:** ~25-32 horas

---

### Sprint 2 (2 semanas) - ALTO
**Objetivo:** Integraciones y observabilidad

- [ ] 2.2 Chatwoot integración real (6-8h)
- [ ] 2.4 WAHA cliente directo (4h)
- [ ] 3.1.3 Tests Modo webhook (2h)
- [ ] 3.1.4 Tests RLS (3h)
- [ ] 4.2 Consultar pedidos previos (1h)
- [ ] 5.1 OpenAPI/Swagger (3h)

**Total:** ~19-21 horas

---

### Sprint 3 (1 semana) - MEDIO
**Objetivo:** Testing y optimización

- [ ] 1.4 Foreign Keys audit (2h)
- [ ] 1.5 Validación env runtime (1h)
- [ ] 1.6 CSP frontend (1h)
- [ ] 3.1.5 Tests E2E Playwright (4h)
- [ ] 3.2 Coverage threshold (1h)
- [ ] 4.6 Connection pooling (30m)

**Total:** ~9.5 horas

---

### Sprint 4 (1 semana) - BAJO/POLISH
**Objetivo:** Documentación y DX

- [ ] 3.1.6 Tests performance k6 (2h)
- [ ] 4.1 Contadores cache (30m)
- [ ] 4.3 Estado pedido comandas (30m)
- [ ] 4.4 Event emitter (1h)
- [ ] 4.5 Compresión responses (15m)
- [ ] 5.2 Runbooks (2h)
- [ ] 5.3 ADRs (1h)
- [ ] 5.4 Contributing guide (30m)

**Total:** ~8 horas

---

## 🎯 MÉTRICAS DE ÉXITO

### KPIs por Sprint

**Sprint 1:**
- ✅ 0 webhooks sin HMAC
- ✅ RLS tests passing al 100%
- ✅ Query performance < 100ms
- ✅ Pagos Modo funcionando

**Sprint 2:**
- ✅ Chatwoot integrado
- ✅ WAHA backup funcional
- ✅ Coverage > 70%
- ✅ OpenAPI docs disponibles

**Sprint 3:**
- ✅ Tests E2E passing
- ✅ CI con coverage gate
- ✅ CSP sin violaciones
- ✅ Connection pooling activo

**Sprint 4:**
- ✅ Cache hit rate > 30%
- ✅ Runbooks documentados
- ✅ Contributing guide publicado
- ✅ Performance tests baseline

---

## 📈 ESTIMACIÓN TOTAL

**Horas totales:** ~62-70 horas
**Días hábiles:** 8-9 días
**Sprints:** 4 (6 semanas)

**Distribución:**
- Crítico: 40%
- Alto: 30%
- Medio: 20%
- Bajo: 10%

---

## ⚠️ RIESGOS Y DEPENDENCIAS

### Riesgos Identificados

1. **Credenciales faltantes** (Modo, Chatwoot)
   - Mitigación: Solicitar anticipadamente

2. **Breaking changes en Supabase RLS**
   - Mitigación: Tests exhaustivos en staging

3. **Performance degradation con índices**
   - Mitigación: EXPLAIN ANALYZE antes/después

4. **Redis latency en cache**
   - Mitigación: Monitoring + fallback a memory

### Dependencias Externas

- API keys de Modo (Sprint 1)
- API keys de Chatwoot (Sprint 2)
- Certificado AFIP (Sprint 2)
- Redis instance (Sprint 1)

---

## 📝 NOTAS FINALES

Este documento representa un análisis **EXHAUSTIVO** de TODO lo pendiente en el proyecto SIST_PIZZA. 

**Última actualización:** 2025-10-26
**Próxima revisión:** Después de Sprint 1
**Responsable:** Equipo de desarrollo

---

**¿Preguntas o dudas?**
Revisar MASTER_BLUEPRINT.md o contactar al equipo.
