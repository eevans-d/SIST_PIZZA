import { Router, Request, Response } from 'express';
import { register, Counter, Histogram, Gauge, collectDefaultMetrics } from 'prom-client';

// HTTP Metrics
export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total de requests HTTP',
  labelNames: ['method', 'route', 'status'],
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duración de requests HTTP en segundos',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.05, 0.1, 0.25, 0.5, 1, 2, 5],
});

// Business Metrics
export const comandasCreated = new Counter({
  name: 'comandas_created_total',
  help: 'Total de comandas creadas',
  labelNames: ['zona', 'tipo'],
});

export const comandasCompleted = new Counter({
  name: 'comandas_completed_total',
  help: 'Total de comandas completadas',
  labelNames: ['zona', 'tiempo_entrega_range'],
});

export const comandasSLABreach = new Counter({
  name: 'comandas_sla_breach_total',
  help: 'Total de comandas que excedieron SLA',
  labelNames: ['zona', 'problema'],
});

export const paymentsAttempts = new Counter({
  name: 'payment_attempts_total',
  help: 'Total de intentos de pago',
  labelNames: ['metodo', 'status'],
});

export const supportTickets = new Gauge({
  name: 'support_tickets_pending',
  help: 'Tickets de soporte pendientes',
  labelNames: ['prioridad'],
});

// Database Metrics
export const dbQueryDuration = new Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duración de queries a DB',
  labelNames: ['tabla', 'operacion'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1],
});

export const dbConnections = new Gauge({
  name: 'db_connections_active',
  help: 'Conexiones activas a PostgreSQL',
  labelNames: ['estado'],
});

// Cache Metrics
export const cacheHits = new Counter({
  name: 'cache_hits_total',
  help: 'Total de cache hits',
  labelNames: ['cache_name'],
});

export const cacheMisses = new Counter({
  name: 'cache_misses_total',
  help: 'Total de cache misses',
  labelNames: ['cache_name'],
});

// Claude/LLM Metrics
export const claudeAPIRequests = new Counter({
  name: 'claude_api_requests_total',
  help: 'Total de requests a Claude API',
  labelNames: ['flujo', 'status'],
});

export const claudeAPIErrors = new Counter({
  name: 'claude_api_errors_total',
  help: 'Total de errores en Claude API',
  labelNames: ['flujo', 'error_type'],
});

export const claudeCircuitBreakerState = new Gauge({
  name: 'claude_circuit_breaker_state',
  help: 'Estado del circuit breaker de Claude (0=closed, 1=open)',
});

export const claudeCircuitBreakerFailures = new Gauge({
  name: 'claude_circuit_breaker_failures',
  help: 'Número de fallos consecutivos en Claude API',
});

export const claudeTokensUsed = new Counter({
  name: 'claude_tokens_used_total',
  help: 'Total de tokens consumidos en Claude API',
  labelNames: ['type'], // 'input' o 'output'
});

export const claudeRequestDuration = new Histogram({
  name: 'claude_request_duration_seconds',
  help: 'Duración de requests a Claude API',
  labelNames: ['flujo'],
  buckets: [0.5, 1, 2, 5, 10, 30],
});

// Supabase/DB Metrics
export const supabaseAPIErrors = new Counter({
  name: 'supabase_api_errors_total',
  help: 'Total de errores en Supabase API',
  labelNames: ['tabla', 'operation'],
});

// Rate Limiting Metrics
export const rateLimitExceeded = new Counter({
  name: 'rate_limit_exceeded_total',
  help: 'Total de requests bloqueados por rate limiting',
  labelNames: ['limiter_type', 'endpoint'],
});

// Default labels & default metrics
register.setDefaultLabels({
  app: 'sist-pizza-backend',
  version: process.env.APP_VERSION || 'dev',
  commit: process.env.GIT_SHA || 'local',
});
collectDefaultMetrics({ register, timeout: 10000 });

// Export metrics endpoint
const metricsRouter = Router();

metricsRouter.get('/metrics', async (req: Request, res: Response) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (error) {
    res.status(500).end(error);
  }
});

// Middleware para tracking de requests HTTP
export const metricsMiddleware = (req: Request, res: Response, next: any) => {
  const start = process.hrtime.bigint();

  res.on('finish', () => {
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1e9; // seconds
    const method = req.method;
    const status = String(res.statusCode);
    // Intentar usar patrón de ruta de Express; evitar IDs dinámicos como parte de la etiqueta
    const routePath = (req.baseUrl || '') + (req.route?.path || 'unmatched');

    httpRequestsTotal.inc({ method, route: routePath, status });
    httpRequestDuration.observe({ method, route: routePath, status }, duration);
  });

  next();
};

export default metricsRouter;
