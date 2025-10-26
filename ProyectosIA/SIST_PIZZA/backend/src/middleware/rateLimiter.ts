import rateLimit from 'express-rate-limit';
import { safeLogger } from '../lib/logger';

// Opcional: Redis store para entornos multi-réplica
let redisStore: any = undefined;
try {
  // Carga perezosa para no romper tests ni dev si no está instalado
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { RedisStore } = require('rate-limit-redis');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Redis = require('ioredis');
  if (process.env.REDIS_URL) {
    const client = new Redis(process.env.REDIS_URL);
    redisStore = new RedisStore({
      // API v3: puente a ioredis
      sendCommand: (...args: string[]) => (client as any).call(...args),
    });
  }
} catch (e) {
  // Ignorar si paquetes no están disponibles
}

// Rate limiter general para API
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // Máximo 100 requests por ventana
  message: {
    error: 'Too Many Requests',
    message: 'Has excedido el límite de solicitudes. Intenta de nuevo en 15 minutos.',
    retryAfter: 15,
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  store: redisStore,
  handler: (req, res) => {
    safeLogger.warn('Rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    
    res.status(429).json({
      error: 'Too Many Requests',
      message: 'Has excedido el límite de solicitudes. Intenta de nuevo más tarde.',
    });
  },
});

// Rate limiter estricto para endpoints sensibles (login, registro, pagos)
export const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 intentos
  skipSuccessfulRequests: true, // No contar requests exitosos
  message: {
    error: 'Too Many Attempts',
    message: 'Demasiados intentos. Tu cuenta ha sido bloqueada temporalmente.',
  },
  store: redisStore,
  handler: (req, res) => {
    safeLogger.error('Strict rate limit exceeded - Possible attack', {
      ip: req.ip,
      path: req.path,
      method: req.method,
      userAgent: req.get('user-agent'),
    });
    
    res.status(429).json({
      error: 'Too Many Attempts',
      message: 'Demasiados intentos fallidos. Intenta de nuevo en 15 minutos.',
      blockedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
  },
});

// Rate limiter específico para webhook N8N
// SLO: 30 requests/minuto = suficiente para tráfico normal pero previene DoS
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // Máximo 30 requests por minuto
  skipSuccessfulRequests: false,
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore,
  message: {
    error: 'Webhook Rate Limit',
    message: 'El webhook ha excedido el límite de llamadas por minuto.',
  },
  handler: (req, res) => {
    safeLogger.warn('Webhook rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    
    res.status(429).json({
      error: 'Webhook Rate Limit',
      message: 'El webhook ha excedido el límite de llamadas por minuto.',
      retryAfter: 60,
    });
  },
});

// Rate limiter específico para exportaciones (CSV)
// SLO: 5 exports/minuto para prevenir abuso de recursos
export const exportLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 5, // más estricto
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore,
  message: {
    error: 'Export Rate Limit',
    message: 'Demasiadas exportaciones en poco tiempo. Intenta nuevamente más tarde.'
  },
  handler: (req, res) => {
    safeLogger.warn('Export rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    
    res.status(429).json({
      error: 'Export Rate Limit',
      message: 'Demasiadas exportaciones en poco tiempo. Intenta nuevamente más tarde.',
      retryAfter: 60,
    });
  },
});

// Rate limiter para login/auth endpoints
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // Máximo 5 intentos
  skipSuccessfulRequests: true, // No contar requests exitosos
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore,
  handler: (req, res) => {
    safeLogger.error('Auth rate limit exceeded - Possible brute force', {
      ip: req.ip,
      path: req.path,
      userAgent: req.get('user-agent'),
    });
    
    res.status(429).json({
      error: 'Too Many Login Attempts',
      message: 'Demasiados intentos de inicio de sesión. Tu cuenta ha sido bloqueada temporalmente.',
      blockedUntil: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
    });
  },
});

// Rate limiter para operaciones de administración
export const adminLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 20, // Más permisivo para admins pero con control
  standardHeaders: true,
  legacyHeaders: false,
  store: redisStore,
  handler: (req, res) => {
    safeLogger.warn('Admin rate limit exceeded', {
      ip: req.ip,
      path: req.path,
      method: req.method,
    });
    
    res.status(429).json({
      error: 'Admin Rate Limit',
      message: 'Has excedido el límite de operaciones administrativas.',
      retryAfter: 60,
    });
  },
});
