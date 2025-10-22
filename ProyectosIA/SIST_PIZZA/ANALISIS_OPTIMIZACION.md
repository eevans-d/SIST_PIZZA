# 🔬 ANÁLISIS AVANZADO Y PLAN DE OPTIMIZACIÓN - SIST_PIZZA

**Fecha:** 2025-01-11  
**Estado del Proyecto:** 95% Completo (Módulos 2, 3, 1)  
**Análisis realizado:** Código backend, tests, Docker, documentación

---

## 📊 RESUMEN EJECUTIVO

### Estado Actual
- **Líneas de código:** ~4,346 (backend TypeScript) + 247 (tests)
- **Archivos fuente:** 22 archivos .ts en backend
- **Coverage de tests:** ~40% (básico)
- **TODOs identificados:** 25+ pendientes
- **Bugs críticos:** 0
- **Deuda técnica:** Moderada

### Hallazgos Principales

#### ✅ FORTALEZAS
1. **Arquitectura modular clara:** Separación limpia entre services, workflows, integrations
2. **Seguridad por diseño:** Helmet, CORS restrictivo, PII redaction
3. **Validación robusta:** Zod schemas en config y webhooks
4. **Config flexible:** Solo Supabase obligatorio, resto opcional
5. **Docker Compose completo:** Stack de 5 servicios orquestado
6. **Documentación abundante:** 24 archivos .md (800+ líneas)
7. **Error handling:** Try-catch en puntos críticos

#### ⚠️ ÁREAS DE MEJORA CRÍTICAS
1. **Testing insuficiente:** Solo 247 líneas de tests vs 4,346 de código (5.7% coverage real)
2. **TODOs sin resolver:** 25+ TODOs críticos (cálculo de costos, validaciones, conexiones)
3. **Sin tests de integración:** No hay tests E2E automatizados
4. **Falta monitoreo:** Métricas Prometheus definidas pero no implementadas
5. **Sin manejo de transacciones:** DB operations no son atómicas
6. **Rate limiting ausente:** APIs expuestas sin throttling
7. **Sin retry logic:** Fallos en integraciones externas son fatales
8. **Cache inexistente:** No hay caching de queries frecuentes
9. **Logs no estructurados:** Logger básico sin niveles granulares
10. **Sin CI/CD:** Commits directos a main sin validación automática

---

## 🎯 PLAN DE ACCIÓN - FASE DE OPTIMIZACIÓN

Dividido en 4 bloques prioritarios:

---

## 🔴 BLOQUE 1: TESTING & CALIDAD (Prioridad ALTA)
**Tiempo estimado:** 6-8 horas  
**Impacto:** Crítico para confiabilidad

### 1.1 Unit Tests Completos

**Archivos a crear:**

```typescript
// backend/src/__tests__/unit/config.test.ts
describe('Config Validation', () => {
  it('should accept valid Supabase config');
  it('should reject invalid URLs');
  it('should make Claude optional');
  it('should provide defaults for optional services');
});

// backend/src/__tests__/unit/webhookN8N.test.ts
describe('Webhook N8N', () => {
  it('should validate incoming pedido data');
  it('should create cliente if not exists');
  it('should find menu items case-insensitively');
  it('should calculate totals correctly');
  it('should handle missing items gracefully');
  it('should respect zona delivery costs');
});

// backend/src/__tests__/unit/claude.test.ts
describe('Claude Service', () => {
  it('should redact PII before sending');
  it('should handle API timeouts');
  it('should retry on transient errors');
  it('should parse responses safely');
});

// backend/src/__tests__/unit/supabase.test.ts
describe('Supabase Client', () => {
  it('should connect with valid credentials');
  it('should handle connection errors');
  it('should retry failed queries');
  it('should log slow queries');
});
```

**Métricas objetivo:**
- ✅ Coverage > 80% en archivos críticos
- ✅ Todos los happy paths cubiertos
- ✅ Edge cases validados
- ✅ Error handling testeado

### 1.2 Integration Tests

**Archivos a crear:**

```typescript
// backend/src/__tests__/integration/api.test.ts
describe('API Integration', () => {
  it('POST /api/webhooks/n8n/pedido creates order in DB');
  it('GET /api/health validates all integrations');
  it('Invalid pedido returns 400 with details');
  it('DB connection failure returns 503');
});

// backend/src/__tests__/integration/supabase.test.ts
describe('Supabase Integration', () => {
  it('should create pedido with detalles atomically');
  it('should rollback on detalle_pedidos error');
  it('should audit log all operations');
  it('should handle concurrent cliente creation');
});
```

**Setup requerido:**
- Test database en Supabase (separado de prod)
- Fixtures con datos de prueba
- Teardown automático entre tests

### 1.3 E2E Tests Automatizados

**Archivos a crear:**

```typescript
// backend/src/__tests__/e2e/whatsapp-flow.test.ts
describe('WhatsApp Order Flow', () => {
  it('should process full order from WhatsApp to DB');
  it('should handle duplicate messages');
  it('should validate payment before confirming');
});

// scripts/test-e2e.sh
#!/bin/bash
# 1. Levantar stack Docker de test
# 2. Poblar DB con fixtures
# 3. Ejecutar tests
# 4. Teardown
```

**Tools:**
- Supertest para API testing
- Playwright para simulación de flujos
- Docker Compose override para ambiente de test

### 1.4 Linting & Formatting

**Configuración mejorada:**

```json
// .eslintrc.json
{
  "extends": [
    "airbnb-typescript/base",
    "plugin:@typescript-eslint/recommended",
    "plugin:security/recommended",
    "prettier"
  ],
  "rules": {
    "no-console": "error",  // Forzar uso de logger
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/explicit-function-return-type": "warn",
    "security/detect-object-injection": "warn"
  }
}
```

**GitHub Actions:**

```yaml
# .github/workflows/quality.yml
name: Code Quality
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
      - run: npm audit --production

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v3
      - run: npm ci
      - run: npm test
      - uses: codecov/codecov-action@v3
```

---

## 🟡 BLOQUE 2: ROBUSTEZ & CONFIABILIDAD (Prioridad ALTA)
**Tiempo estimado:** 8-10 horas  
**Impacto:** Crítico para producción

### 2.1 Transacciones Atómicas

**Problema actual:**
```typescript
// ❌ ACTUAL: Sin transacciones
await supabase.from('pedidos').insert(pedido);
await supabase.from('detalle_pedidos').insert(detalles);
await supabase.from('audit_logs').insert(log);
// Si falla el 2do insert, pedido queda corrupto
```

**Solución:**

```typescript
// ✅ MEJORADO: Con transacciones
export async function crearPedidoAtomico(data: PedidoData) {
  const { data: result, error } = await supabase.rpc('crear_pedido_transaccion', {
    p_cliente_id: data.clienteId,
    p_items: JSON.stringify(data.items),
    p_direccion: data.direccion,
  });
  
  if (error) throw new TransactionError('Failed to create pedido', error);
  return result;
}
```

**Migración SQL requerida:**

```sql
-- supabase/migrations/20250112_transacciones.sql
CREATE OR REPLACE FUNCTION crear_pedido_transaccion(
  p_cliente_id UUID,
  p_items JSONB,
  p_direccion TEXT
) RETURNS JSONB
LANGUAGE plpgsql
AS $$
DECLARE
  v_pedido_id UUID;
  v_total DECIMAL(10,2);
BEGIN
  -- Start transaction (implicit)
  
  -- Insert pedido
  INSERT INTO pedidos (cliente_id, direccion_entrega, estado)
  VALUES (p_cliente_id, p_direccion, 'pendiente')
  RETURNING id INTO v_pedido_id;
  
  -- Insert detalles from JSON
  INSERT INTO detalle_pedidos (pedido_id, menu_item_id, cantidad, precio_unitario)
  SELECT 
    v_pedido_id,
    (item->>'menu_item_id')::UUID,
    (item->>'cantidad')::INTEGER,
    (item->>'precio_unitario')::DECIMAL
  FROM jsonb_array_elements(p_items) AS item;
  
  -- Calculate total
  SELECT SUM(cantidad * precio_unitario) INTO v_total
  FROM detalle_pedidos
  WHERE pedido_id = v_pedido_id;
  
  -- Update pedido total
  UPDATE pedidos SET total = v_total WHERE id = v_pedido_id;
  
  -- Audit log
  INSERT INTO audit_logs (table_name, operation, new_data)
  VALUES ('pedidos', 'INSERT', jsonb_build_object('pedido_id', v_pedido_id));
  
  -- Return result
  RETURN jsonb_build_object(
    'pedido_id', v_pedido_id,
    'total', v_total
  );
  
  EXCEPTION WHEN OTHERS THEN
    -- Rollback automatic in PL/pgSQL
    RAISE EXCEPTION 'Transaction failed: %', SQLERRM;
END;
$$;
```

### 2.2 Retry Logic & Circuit Breaker

**Archivo a crear:**

```typescript
// backend/src/lib/retry.ts
import { CircuitBreaker } from 'opossum';

interface RetryOptions {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  timeout: number;
}

export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {
    maxAttempts: 3,
    delayMs: 1000,
    backoffMultiplier: 2,
    timeout: 5000,
  }
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Timeout')), options.timeout)
        ),
      ]);
    } catch (error) {
      lastError = error as Error;
      
      if (attempt < options.maxAttempts) {
        const delay = options.delayMs * Math.pow(options.backoffMultiplier, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
}

// Circuit breaker para servicios externos
export const claudeBreaker = new CircuitBreaker(async (prompt: string) => {
  // ... llamada a Claude
}, {
  timeout: 10000,      // 10s timeout
  errorThresholdPercentage: 50,  // Open si 50% fallan
  resetTimeout: 30000, // Try again after 30s
});

claudeBreaker.on('open', () => {
  safeLogger.error('🔴 Circuit breaker OPEN para Claude API');
});
```

**Aplicar a servicios:**

```typescript
// backend/src/services/claude.ts
import { retryWithBackoff, claudeBreaker } from '../lib/retry';

export async function askClaude(prompt: string) {
  return claudeBreaker.fire(async () => {
    return retryWithBackoff(async () => {
      const response = await anthropic.messages.create({...});
      return response;
    });
  });
}
```

### 2.3 Rate Limiting

**Middleware a crear:**

```typescript
// backend/src/middlewares/rateLimiter.ts
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { createClient } from 'redis';

const redisClient = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

export const apiLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:api:',
  }),
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por ventana
  message: 'Too many requests, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
});

export const webhookLimiter = rateLimit({
  store: new RedisStore({
    client: redisClient,
    prefix: 'rl:webhook:',
  }),
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 10, // 10 webhooks por minuto
  keyGenerator: (req) => req.ip + ':' + req.body.cliente?.telefono,
});

export const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 5, // 5 requests por minuto
  message: 'Rate limit exceeded for this sensitive endpoint',
});
```

**Aplicar en server.ts:**

```typescript
import { apiLimiter, webhookLimiter, strictLimiter } from './middlewares/rateLimiter';

app.use('/api/', apiLimiter);
app.use('/api/webhooks/', webhookLimiter);
app.use('/api/admin/', strictLimiter);
```

### 2.4 Graceful Degradation

**Pattern a implementar:**

```typescript
// backend/src/lib/fallback.ts
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => T,
  serviceName: string
): Promise<T> {
  try {
    return await primary();
  } catch (error) {
    safeLogger.warn(`⚠️ ${serviceName} failed, using fallback`, { error });
    metrics.serviceFailures.inc({ service: serviceName });
    return fallback();
  }
}

// Uso:
const zona = await withFallback(
  () => calcularZonaConMapa(direccion),
  () => ({ zona: 'centro', costo: 500 }), // Fallback básico
  'Maps API'
);
```

### 2.5 Database Connection Pool

**Configuración mejorada:**

```typescript
// backend/src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseConfig = {
  auth: {
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'sist-pizza-backend',
    },
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
};

export const supabase = createClient(
  config.supabase.url,
  config.supabase.serviceRoleKey,
  supabaseConfig
);

// Connection pool monitoring
setInterval(() => {
  // Log pool stats
  safeLogger.debug('DB pool stats', {
    // Add metrics here
  });
}, 60000); // Every minute
```

---

## 🟢 BLOQUE 3: PERFORMANCE & OPTIMIZACIÓN (Prioridad MEDIA)
**Tiempo estimado:** 6-8 horas  
**Impacto:** Mejora experiencia de usuario

### 3.1 Caching Estratégico

**Implementación:**

```typescript
// backend/src/lib/cache.ts
import { createClient } from 'redis';

const redis = createClient({
  url: process.env.REDIS_URL || 'redis://localhost:6379',
});

redis.connect().catch(console.error);

export async function cacheGet<T>(key: string): Promise<T | null> {
  const cached = await redis.get(key);
  return cached ? JSON.parse(cached) : null;
}

export async function cacheSet(
  key: string,
  value: any,
  ttlSeconds: number = 300
): Promise<void> {
  await redis.setEx(key, ttlSeconds, JSON.stringify(value));
}

export async function cacheInvalidate(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(keys);
  }
}

// Decorator para funciones cacheables
export function Cacheable(ttl: number = 300) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const cacheKey = `${target.constructor.name}:${propertyKey}:${JSON.stringify(args)}`;
      
      const cached = await cacheGet(cacheKey);
      if (cached) {
        safeLogger.debug('Cache HIT', { key: cacheKey });
        return cached;
      }

      const result = await originalMethod.apply(this, args);
      await cacheSet(cacheKey, result, ttl);
      safeLogger.debug('Cache MISS', { key: cacheKey });
      
      return result;
    };

    return descriptor;
  };
}
```

**Aplicar a queries frecuentes:**

```typescript
// backend/src/services/menu.ts
export class MenuService {
  @Cacheable(600) // 10 minutos
  async getMenuItems() {
    const { data } = await supabase
      .from('menu_items')
      .select()
      .eq('disponible', true);
    return data;
  }

  @Cacheable(1800) // 30 minutos
  async getZonasEntrega() {
    const { data } = await supabase
      .from('zonas_entrega')
      .select();
    return data;
  }

  async updateMenuItem(id: string, updates: any) {
    const result = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', id);
    
    // Invalidar cache
    await cacheInvalidate('MenuService:getMenuItems:*');
    
    return result;
  }
}
```

### 3.2 Query Optimization

**Análisis de queries lentos:**

```typescript
// backend/src/lib/slowQueryLogger.ts
import { supabase } from './supabase';

export function logSlowQuery(query: string, duration: number) {
  if (duration > 1000) { // > 1s
    safeLogger.warn('🐌 Slow query detected', {
      query,
      duration,
      threshold: 1000,
    });
    
    metrics.slowQueries.inc({
      query: query.slice(0, 50),
    });
  }
}

// Wrapper para queries
export async function timedQuery<T>(
  queryFn: () => Promise<T>,
  queryName: string
): Promise<T> {
  const start = performance.now();
  const result = await queryFn();
  const duration = performance.now() - start;
  
  logSlowQuery(queryName, duration);
  
  return result;
}
```

**Índices a agregar:**

```sql
-- supabase/migrations/20250112_indexes.sql

-- Pedidos por cliente (para histórico)
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id 
ON pedidos(cliente_id);

-- Pedidos por estado y fecha (para dashboard)
CREATE INDEX IF NOT EXISTS idx_pedidos_estado_fecha 
ON pedidos(estado, created_at DESC);

-- Menu items por categoría y disponibilidad (para búsqueda)
CREATE INDEX IF NOT EXISTS idx_menu_items_categoria 
ON menu_items(categoria, disponible);

-- Búsqueda fuzzy por nombre
CREATE INDEX IF NOT EXISTS idx_menu_items_nombre_gin 
ON menu_items USING gin(to_tsvector('spanish', nombre));

-- Clientes por teléfono (para lookup)
CREATE INDEX IF NOT EXISTS idx_clientes_telefono 
ON clientes(telefono);

-- Audit logs por tabla y fecha (para compliance)
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_date 
ON audit_logs(table_name, created_at DESC);
```

### 3.3 Compresión de Respuestas

**Middleware a agregar:**

```typescript
// backend/src/server.ts
import compression from 'compression';

app.use(compression({
  level: 6, // Balance entre CPU y ratio
  threshold: 1024, // Solo comprimir respuestas > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
}));
```

### 3.4 Batch Operations

**Optimización de inserts:**

```typescript
// backend/src/workflows/webhookN8N.ts

// ❌ ACTUAL: N+1 queries
for (const item of data.items) {
  await supabase.from('menu_items').select()...
}

// ✅ MEJORADO: Single query con IN
const itemNames = data.items.map(i => i.nombre);
const { data: menuItems } = await supabase
  .from('menu_items')
  .select()
  .in('nombre', itemNames)
  .eq('disponible', true);

// Map to items
const itemsConPrecios = data.items.map(item => {
  const menuItem = menuItems.find(m => 
    m.nombre.toLowerCase().includes(item.nombre.toLowerCase())
  );
  // ...
});
```

---

## 🔵 BLOQUE 4: MONITOREO & OBSERVABILIDAD (Prioridad MEDIA)
**Tiempo estimado:** 4-6 horas  
**Impacto:** Facilita debugging y mantenimiento

### 4.1 Structured Logging

**Logger mejorado:**

```typescript
// backend/src/lib/logger.ts
import winston from 'winston';
import { ElasticsearchTransport } from 'winston-elasticsearch';

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.timestamp(),
      winston.format.errors({ stack: true }),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, ...meta }) => {
        return `${timestamp} [${level}] ${message} ${
          Object.keys(meta).length ? JSON.stringify(meta, null, 2) : ''
        }`;
      })
    ),
  }),
  
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
    format: winston.format.json(),
  }),
  
  new winston.transports.File({
    filename: 'logs/combined.log',
    format: winston.format.json(),
  }),
];

// En producción, agregar Elasticsearch
if (process.env.NODE_ENV === 'production' && process.env.ELASTICSEARCH_URL) {
  transports.push(
    new ElasticsearchTransport({
      level: 'info',
      clientOpts: {
        node: process.env.ELASTICSEARCH_URL,
        auth: {
          username: process.env.ELASTICSEARCH_USER,
          password: process.env.ELASTICSEARCH_PASSWORD,
        },
      },
    })
  );
}

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'sist-pizza-backend',
    environment: process.env.NODE_ENV,
  },
  transports,
});

// Context-aware logging
export function createContextLogger(context: Record<string, any>) {
  return {
    info: (message: string, meta?: any) => 
      logger.info(message, { ...context, ...meta }),
    warn: (message: string, meta?: any) => 
      logger.warn(message, { ...context, ...meta }),
    error: (message: string, meta?: any) => 
      logger.error(message, { ...context, ...meta }),
    debug: (message: string, meta?: any) => 
      logger.debug(message, { ...context, ...meta }),
  };
}
```

### 4.2 Métricas Prometheus

**Implementación completa:**

```typescript
// backend/src/lib/metrics.ts
import client from 'prom-client';

// Register
const register = new client.Registry();

client.collectDefaultMetrics({ register });

// Custom metrics
export const httpRequestDuration = new client.Histogram({
  name: 'http_request_duration_ms',
  help: 'Duration of HTTP requests in ms',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [10, 50, 100, 300, 500, 1000, 3000, 5000],
  registers: [register],
});

export const pedidosCreados = new client.Counter({
  name: 'pedidos_created_total',
  help: 'Total number of pedidos created',
  labelNames: ['origen', 'estado'],
  registers: [register],
});

export const pedidoTotal = new client.Histogram({
  name: 'pedido_total_amount',
  help: 'Distribution of pedido totals',
  labelNames: ['zona'],
  buckets: [1000, 2000, 3000, 5000, 8000, 10000, 15000],
  registers: [register],
});

export const dbQueryDuration = new client.Histogram({
  name: 'db_query_duration_ms',
  help: 'Database query duration',
  labelNames: ['table', 'operation'],
  buckets: [10, 50, 100, 300, 500, 1000],
  registers: [register],
});

export const cacheHitRate = new client.Counter({
  name: 'cache_requests_total',
  help: 'Cache requests',
  labelNames: ['result'], // 'hit' or 'miss'
  registers: [register],
});

export const externalServiceCalls = new client.Counter({
  name: 'external_service_calls_total',
  help: 'Calls to external services',
  labelNames: ['service', 'status'],
  registers: [register],
});

// Middleware para tracking
export function metricsMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    httpRequestDuration.observe(
      {
        method: req.method,
        route: req.route?.path || req.path,
        status_code: res.statusCode,
      },
      duration
    );
  });

  next();
}

// Endpoint de métricas
export function setupMetricsEndpoint(app: Express) {
  app.get('/metrics', async (req: Request, res: Response) => {
    res.setHeader('Content-Type', register.contentType);
    res.send(await register.metrics());
  });
}

export { register };
```

**Aplicar en código:**

```typescript
// backend/src/workflows/webhookN8N.ts
import { pedidosCreados, pedidoTotal, dbQueryDuration } from '../lib/metrics';

router.post('/api/webhooks/n8n/pedido', async (req, res) => {
  const queryStart = Date.now();
  
  try {
    // ... lógica de creación ...
    
    // Track métricas
    pedidosCreados.inc({ origen: data.origen, estado: 'pendiente' });
    pedidoTotal.observe({ zona: 'centro' }, total);
    
    dbQueryDuration.observe(
      { table: 'pedidos', operation: 'insert' },
      Date.now() - queryStart
    );
    
    // ...
  } catch (error) {
    // ...
  }
});
```

### 4.3 Health Checks Avanzados

**Mejora del endpoint:**

```typescript
// backend/src/server.ts
app.get('/api/health', async (req, res) => {
  const checks = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      database: { status: 'unknown', latency: 0 },
      redis: { status: 'unknown', latency: 0 },
      claude: { status: 'unknown' },
      disk: { status: 'unknown', usage: 0 },
      memory: { status: 'unknown', usage: 0 },
    },
  };

  // Database check
  try {
    const dbStart = Date.now();
    await supabase.from('menu_items').select('id').limit(1);
    checks.checks.database = {
      status: 'healthy',
      latency: Date.now() - dbStart,
    };
  } catch (err) {
    checks.status = 'unhealthy';
    checks.checks.database = { status: 'unhealthy', latency: 0 };
  }

  // Redis check
  try {
    const redisStart = Date.now();
    await redis.ping();
    checks.checks.redis = {
      status: 'healthy',
      latency: Date.now() - redisStart,
    };
  } catch (err) {
    checks.checks.redis = { status: 'degraded', latency: 0 };
  }

  // Claude API check (solo si configurado)
  if (config.claude?.apiKey) {
    checks.checks.claude = {
      status: claudeBreaker.opened ? 'circuit_open' : 'healthy',
    };
  }

  // Memory usage
  const memUsage = process.memoryUsage();
  const memPercentage = (memUsage.heapUsed / memUsage.heapTotal) * 100;
  checks.checks.memory = {
    status: memPercentage > 90 ? 'critical' : 'healthy',
    usage: Math.round(memPercentage),
  };

  const statusCode = checks.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(checks);
});
```

### 4.4 Tracing Distribuido

**Implementación con OpenTelemetry:**

```typescript
// backend/src/lib/tracing.ts
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { JaegerExporter } from '@opentelemetry/exporter-jaeger';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';

export function initTracing() {
  const provider = new NodeTracerProvider();

  const exporter = new JaegerExporter({
    endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
  });

  provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
  provider.register();

  registerInstrumentations({
    instrumentations: [
      new HttpInstrumentation(),
      new ExpressInstrumentation(),
    ],
  });

  return provider;
}
```

---

## 🟣 BLOQUE 5: SEGURIDAD & COMPLIANCE (Prioridad ALTA)
**Tiempo estimado:** 4-6 horas  
**Impacto:** Crítico para GDPR/Ley 25.326

### 5.1 OWASP Top 10 Compliance

**Checklist de seguridad:**

```typescript
// backend/src/middlewares/security.ts
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';

export function setupSecurityMiddleware(app: Express) {
  // 1. Helmet (headers de seguridad)
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // 2. XSS Protection
  app.use(xss());

  // 3. NoSQL Injection Protection
  app.use(mongoSanitize());

  // 4. HTTP Parameter Pollution
  app.use((req, res, next) => {
    // Sanitize query params
    Object.keys(req.query).forEach(key => {
      if (Array.isArray(req.query[key])) {
        req.query[key] = (req.query[key] as string[])[0];
      }
    });
    next();
  });

  // 5. CSRF Protection (para formularios web)
  // app.use(csrf()); // Si se agrega frontend tradicional

  // 6. Content Type Validation
  app.use((req, res, next) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      if (!req.is('application/json')) {
        return res.status(415).json({ 
          error: 'Content-Type must be application/json' 
        });
      }
    }
    next();
  });
}
```

### 5.2 PII Redaction Mejorado

**Sistema robusto:**

```typescript
// backend/src/lib/piiRedactor.ts
const PII_PATTERNS = {
  telefono: /\b\d{10}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  dni: /\b\d{7,8}\b/g,
  cuit: /\b\d{2}-\d{8}-\d{1}\b/g,
  tarjeta: /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  direccion: /\b(calle|av\.|avenida)\s+[a-zA-Z0-9\s,]+\b/gi,
};

export function redactPII(text: string): string {
  let redacted = text;

  redacted = redacted.replace(PII_PATTERNS.tarjeta, '[TARJETA_REDACTED]');
  redacted = redacted.replace(PII_PATTERNS.email, '[EMAIL_REDACTED]');
  redacted = redacted.replace(PII_PATTERNS.cuit, '[CUIT_REDACTED]');
  redacted = redacted.replace(PII_PATTERNS.dni, '[DNI_REDACTED]');
  redacted = redacted.replace(PII_PATTERNS.telefono, (match) => {
    return match.slice(0, 6) + '****';
  });

  return redacted;
}

export function redactObject(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return obj;
  }

  const redacted: any = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'string') {
      redacted[key] = redactPII(value);
    } else if (typeof value === 'object') {
      redacted[key] = redactObject(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}
```

### 5.3 Audit Logging Completo

**Sistema de auditoría:**

```typescript
// backend/src/lib/audit.ts
export interface AuditEvent {
  user_id?: string;
  action: string;
  resource: string;
  resource_id?: string;
  old_value?: any;
  new_value?: any;
  ip_address?: string;
  user_agent?: string;
  metadata?: Record<string, any>;
}

export async function logAudit(event: AuditEvent) {
  await supabase.from('audit_logs').insert({
    table_name: event.resource,
    operation: event.action,
    old_data: event.old_value ? redactObject(event.old_value) : null,
    new_data: event.new_value ? redactObject(event.new_value) : null,
    user_id: event.user_id,
    metadata: {
      ip: event.ip_address,
      user_agent: event.user_agent,
      ...event.metadata,
    },
  });
}

// Middleware para auditoría automática
export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;

  res.json = function (data: any) {
    // Log después de respuesta exitosa
    if (res.statusCode >= 200 && res.statusCode < 300) {
      logAudit({
        action: req.method,
        resource: req.path,
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        metadata: {
          status: res.statusCode,
          duration: Date.now() - (req as any).startTime,
        },
      }).catch(err => logger.error('Audit log failed', err));
    }

    return originalJson.call(this, data);
  };

  (req as any).startTime = Date.now();
  next();
}
```

---

## 📋 RESUMEN DE MEJORAS PROPUESTAS

### Estadísticas

| Categoría | Tareas | Archivos a crear | Líneas estimadas | Tiempo |
|-----------|--------|------------------|------------------|--------|
| Testing | 12 | 15 archivos test | ~1,500 | 6-8h |
| Robustez | 8 | 5 archivos | ~800 | 8-10h |
| Performance | 6 | 4 archivos | ~600 | 6-8h |
| Monitoreo | 7 | 6 archivos | ~900 | 4-6h |
| Seguridad | 5 | 4 archivos | ~500 | 4-6h |
| **TOTAL** | **38** | **34 archivos** | **~4,300** | **28-38h** |

### Priorización

#### ✅ Fase 1 (Crítico - 2 semanas)
1. Unit tests completos (Bloque 1.1)
2. Transacciones atómicas (Bloque 2.1)
3. Rate limiting (Bloque 2.3)
4. PII redaction mejorado (Bloque 5.2)
5. Health checks avanzados (Bloque 4.3)

#### 🟡 Fase 2 (Importante - 2 semanas)
6. Integration tests (Bloque 1.2)
7. Retry logic (Bloque 2.2)
8. Caching (Bloque 3.1)
9. Structured logging (Bloque 4.1)
10. OWASP compliance (Bloque 5.1)

#### 🔵 Fase 3 (Deseable - 2 semanas)
11. E2E tests (Bloque 1.3)
12. Query optimization (Bloque 3.2)
13. Métricas Prometheus (Bloque 4.2)
14. Tracing distribuido (Bloque 4.4)
15. CI/CD pipeline (Bloque 1.4)

---

## 🎯 QUICK WINS (Mejoras Rápidas - 4 horas)

Mientras tanto, estas mejoras se pueden implementar YA:

### 1. Resolver TODOs Críticos (1h)

```typescript
// backend/src/workflows/webhookN8N.ts

// ❌ ACTUAL:
const costoEnvio = 500; // TODO: calcular por zona

// ✅ MEJORADO:
async function calcularCostoEnvio(direccion: string): Promise<number> {
  const { data: zona } = await supabase
    .from('zonas_entrega')
    .select('costo_envio')
    .ilike('nombre', `%${direccion}%`)
    .single();
    
  return zona?.costo_envio || 500; // Default si no se encuentra
}

const costoEnvio = await calcularCostoEnvio(data.cliente.direccion);
```

### 2. Agregar Validación de Duplicados (30min)

```typescript
// backend/src/middlewares/deduplication.ts
const recentRequests = new Map<string, number>();

export function deduplicationMiddleware(req: Request, res: Response, next: NextFunction) {
  const signature = `${req.ip}:${req.path}:${JSON.stringify(req.body)}`;
  const lastSeen = recentRequests.get(signature);
  
  if (lastSeen && Date.now() - lastSeen < 5000) {
    return res.status(409).json({
      error: 'Duplicate request detected. Please wait before retrying.',
    });
  }
  
  recentRequests.set(signature, Date.now());
  
  // Cleanup old entries
  setTimeout(() => recentRequests.delete(signature), 10000);
  
  next();
}
```

### 3. Mejorar Mensajes de Error (30min)

```typescript
// backend/src/lib/errors.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public isOperational: boolean = true,
    public code?: string
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, public field?: string) {
    super(message, 400, true, 'VALIDATION_ERROR');
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(
      `${resource}${id ? ` with id ${id}` : ''} not found`,
      404,
      true,
      'NOT_FOUND'
    );
  }
}

// Error handler middleware
export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      code: err.code,
      message: err.message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
  }

  // Unexpected errors
  logger.error('Unexpected error', { error: err });
  res.status(500).json({
    status: 'error',
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
  });
}
```

### 4. Agregar Request ID (15min)

```typescript
// backend/src/middlewares/requestId.ts
import { v4 as uuidv4 } from 'uuid';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  req.id = req.get('X-Request-ID') || uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
}

// Usar en logger
logger.info('Request received', { requestId: req.id });
```

---

## 📊 MÉTRICAS DE ÉXITO

Objetivos a alcanzar después de implementar mejoras:

### Testing
- ✅ **Coverage > 80%** en backend
- ✅ **0 errores** en tests unitarios
- ✅ **Suite E2E** ejecutándose en CI/CD
- ✅ **< 30s** tiempo de ejecución de tests

### Robustez
- ✅ **99.9% uptime** en producción
- ✅ **0 transacciones corruptas** en DB
- ✅ **< 1% error rate** en APIs externas (con retry)
- ✅ **Circuit breakers** activos en servicios críticos

### Performance
- ✅ **< 500ms p95** latency en endpoints
- ✅ **> 60% cache hit rate**
- ✅ **< 100ms** queries a DB (p95)
- ✅ **10x reducción** en queries N+1

### Monitoreo
- ✅ **100% endpoints** con métricas
- ✅ **Dashboards Grafana** para todos los servicios
- ✅ **Alertas configuradas** para anomalías
- ✅ **Logs estructurados** en todos los niveles

### Seguridad
- ✅ **0 vulnerabilidades críticas** en npm audit
- ✅ **100% compliance** OWASP Top 10
- ✅ **PII redaction** en todos los logs
- ✅ **Audit trail completo** de operaciones sensibles

---

## 🚀 NEXT STEPS INMEDIATOS

**Mientras configuras Supabase, puedo:**

1. **Implementar Quick Wins** (4h de ahorro)
   - Resolver TODOs críticos
   - Agregar deduplication
   - Mejorar error handling
   - Agregar request IDs

2. **Crear estructura de tests** (2h)
   - Setup de Vitest avanzado
   - Fixtures y mocks
   - Helpers de testing

3. **Preparar CI/CD básico** (1h)
   - GitHub Actions para tests
   - Linting automático
   - Build verification

**¿Quieres que proceda con alguno de estos mientras trabajas en Supabase?**

---

*Análisis completado: 2025-01-11*  
*Próxima revisión: Post-implementación de Fase 1*
