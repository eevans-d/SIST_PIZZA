import rateLimit from 'express-rate-limit';
import { safeLogger } from '../lib/logger';

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
export const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // Máximo 30 requests por minuto
  skipSuccessfulRequests: false,
  message: {
    error: 'Webhook Rate Limit',
    message: 'El webhook ha excedido el límite de llamadas por minuto.',
  },
});
