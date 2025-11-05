/**
 * 🧠 INSTRUCCIONES PARA GITHUB COPILOT:
 * Este archivo forma parte de SIST_PIZZA - Sistema de gestión de pizzería.
 * - Prioriza seguridad (CORS restrictivo, helmet, validación)
 * - Manejo de errores global y graceful shutdown
 * - GDPR + Ley 25.326 compliance (PII redaction en logs)
 * - Si hay ambigüedad, documenta decisiones en comentarios
 */

import express, {
  Express,
  Request,
  Response,
  NextFunction,
  ErrorRequestHandler,
} from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import metricsRouter, { metricsMiddleware } from './services/metrics';
import { apiLimiter } from './middleware/rateLimiter';
import { safeLogger } from './lib/logger';
import { config } from './config';

/**
 * Crear app Express con configuración de seguridad
 */
export function createApp(): Express {
  const app = express();

  // ============================================================================
  // SEGURIDAD
  // ============================================================================

  // Headers de seguridad HTTP con CSP
  const isProduction = config.server.nodeEnv === 'production';
  app.use(
    helmet({
      contentSecurityPolicy: isProduction
        ? {
            directives: {
              defaultSrc: ["'self'"],
              scriptSrc: ["'self'"],
              styleSrc: ["'self'", "'unsafe-inline'"],
              imgSrc: ["'self'", 'data:', 'https:'],
              connectSrc: [
                "'self'",
                config.supabase.url,
                'https://api.anthropic.com',
                ...(config.chatwoot?.baseUrl ? [config.chatwoot.baseUrl] : []),
              ].filter(Boolean),
              fontSrc: ["'self'"],
              objectSrc: ["'none'"],
              mediaSrc: ["'self'"],
              frameSrc: ["'none'"],
              upgradeInsecureRequests: [],
            },
          }
        : false, // Desactivar CSP en desarrollo para facilitar debugging
    })
  );
  // Si se despliega detrás de proxy (Nginx/Ingress), confiar en cabeceras X-Forwarded-For para IP real
  app.set('trust proxy', 1);

  // CORS restrictivo: solo dominios permitidos exactos
  const allowedOrigins = config.server.allowedOrigins.filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        // Permitir requests sin origin (Postman, curl, mobile apps)
        if (!origin) {
          return callback(null, true);
        }

        // En producción, validar origin exacto
        if (isProduction && !allowedOrigins.includes(origin)) {
          safeLogger.warn('CORS blocked unauthorized origin', { origin });
          return callback(new Error('Not allowed by CORS'));
        }

        // En desarrollo, permitir todos los allowedOrigins
        if (allowedOrigins.includes(origin)) {
          return callback(null, true);
        }

        // Rechazar cualquier otro origin
        return callback(new Error('Not allowed by CORS'));
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['RateLimit-Limit', 'RateLimit-Remaining', 'RateLimit-Reset'],
      maxAge: 86400, // 24 horas de cache de preflight
    })
  );

  // ============================================================================
  // PARSING
  // ============================================================================

  // Limitar body por defecto a 1mb y ampliar por ruta si es necesario
  // Capturamos rawBody para verificación HMAC en webhooks
  app.use(express.json({
    limit: '1mb',
    verify: (req: any, _res, buf) => {
      req.rawBody = buf?.toString('utf8');
    }
  }));
  app.use(express.urlencoded({
    limit: '1mb',
    extended: true,
    verify: (req: any, _res, buf) => {
      req.rawBody = buf?.toString('utf8');
    }
  }));

  // ============================================================================
  // LOGGING
  // ============================================================================

  // Morgan con formato personalizado
  app.use(
    morgan((tokens, req, res) => {
      return [
        tokens.method(req, res),
        tokens.url(req, res),
        tokens.status(req, res),
        tokens['response-time'](req, res),
        'ms',
      ].join(' ');
    })
  );

  // ============================================================================
  // MÉTRICAS (PROMETHEUS)
  // Middleware para tracking automático de requests
  app.use(metricsMiddleware);
  // Endpoint de métricas para Prometheus
  app.use(metricsRouter);

  // Rate limiting general para API
  app.use('/api/', apiLimiter);

  // HEALTHCHECK
  // ============================================================================

  app.get('/health', (req: Request, res: Response) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    });
  });

  // Backwards-compatible alias usado por scripts y tests externos
  app.get('/api/health', async (req: Request, res: Response) => {
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: config.server.nodeEnv,
      uptime: Math.floor(process.uptime()),
      database: 'checking...',
      integrations: {
        supabase: false,
        claude: false,
        modo: false,
        chatwoot: false,
      },
    };

    try {
      // Verificar conexión a Supabase
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        config.supabase.url,
        config.supabase.anonKey
      );

      const { error } = await supabase
        .from('menu_items')
        .select('count')
        .limit(1);

      if (!error) {
        health.database = 'ok';
        health.integrations.supabase = true;
      } else {
        health.database = 'error';
      }
    } catch (err) {
      health.database = 'error';
    }

    // Verificar integraciones opcionales
    const { isClaudeEnabled, isModoEnabled, isChatwootEnabled } = await import('./config');
    health.integrations.claude = isClaudeEnabled;
    health.integrations.modo = isModoEnabled;
    health.integrations.chatwoot = isChatwootEnabled;

    const statusCode = health.database === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
  });

  app.get('/health/ready', async (req: Request, res: Response) => {
    try {
      // Verificar que Supabase está disponible y conectado
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        config.supabase.url,
        config.supabase.anonKey
      );

      // Simple read test
      const { error } = await supabase
        .from('menu_items')
        .select('count')
        .limit(1);

      if (error) {
        safeLogger.warn('Health check: Supabase not ready', { error: error.message });
        return res.status(503).json({
          ready: false,
          reason: 'Database not accessible',
        });
      }

      res.json({
        ready: true,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      safeLogger.error('Health check error', { error });
      res.status(503).json({ ready: false, error: 'Internal error' });
    }
  });

  // ============================================================================
  // RUTAS DE API
  // ============================================================================

  // Webhook N8N para pedidos procesados por Claude (carga perezosa para evitar fallos en test)
  import('./workflows/webhookN8N')
    .then((m) => app.use(m.default))
    .catch((err) => {
      safeLogger.warn('Optional route not loaded', { route: 'webhookN8N', error: (err as any)?.message });
    });

  // Tickets de soporte (strict rate limit)
  import('./workflows/tickets')
    .then((m) => app.use(m.default))
    .catch((err) => safeLogger.warn('Optional route not loaded', { route: 'tickets', error: (err as any)?.message }));

  // Pedidos (estado)
  import('./workflows/pedidos')
    .then((m) => app.use(m.default))
    .catch((err) => safeLogger.warn('Optional route not loaded', { route: 'pedidos', error: (err as any)?.message }));

  // Menú (admin)
  import('./workflows/menu')
    .then((m) => app.use(m.default))
    .catch((err) => safeLogger.warn('Optional route not loaded', { route: 'menu', error: (err as any)?.message }));

  // Endpoints REST mínimos
  import('./routes')
    .then((m) => app.use(m.default))
    .catch((err) => safeLogger.warn('Optional route not loaded', { route: 'routes', error: (err as any)?.message }));

  // ============================================================================
  // RUTAS FUTURAS A IMPLEMENTAR
  // ============================================================================
  // Próximas integraciones (ver Opción D - Arquitectura):
  // - app.post('/api/webhooks/chatwoot', ...) - Integración con soporte
  // - app.post('/api/webhooks/mercadopago', ...) - Pagos en línea
  // - app.post('/api/webhooks/whatsapp/status', ...) - Estado de mensajes

  // ============================================================================
  // 404 HANDLER
  // ============================================================================

  app.use((req: Request, res: Response) => {
    safeLogger.warn('Route not found', {
      method: req.method,
      path: req.path,
    });

    res.status(404).json({
      error: 'Not Found',
      message: 'La ruta solicitada no existe',
      path: req.path,
    });
  });

  // ============================================================================
  // ERROR HANDLER (debe ser el último)
  // ============================================================================

  const errorHandler: ErrorRequestHandler = (
    error: any,
    req: Request,
    res: Response,
    _next: NextFunction
  ) => {
    // Log del error
    const statusCode = error.statusCode || error.status || 500;
    const message = error.message || 'Error interno del servidor';

    safeLogger.error('Request error', {
      statusCode,
      message,
      method: req.method,
      path: req.path,
      stack: error.stack,
    });

    // Respuesta al cliente (nunca exponer detalles internos)
    res.status(statusCode).json({
      error: statusCode === 500 ? 'Internal Server Error' : error.name,
      message:
        statusCode === 500
          ? 'Error interno del servidor'
          : message,
      ...(config.server.nodeEnv === 'development' && { stack: error.stack }),
    });
  };

  app.use(errorHandler);

  return app;
}

/**
 * Iniciar servidor con graceful shutdown
 */
export async function startServer(): Promise<void> {
  const app = createApp();
  const { port, host } = config.server;

  const server = app.listen(port, host, () => {
    safeLogger.info('Server started', {
      host,
      port,
      env: config.server.nodeEnv,
      url: `http://${host}:${port}`,
    });
  });

  // Graceful shutdown con timeout
  const shutdown = async (signal: string) => {
    safeLogger.info(`Received ${signal}, shutting down gracefully...`);

    server.close(async () => {
      try {
        safeLogger.info('Server closed successfully');
        // Nota: Supabase client no necesita .close() (es HTTP-based)
        // Las conexiones se cierran automáticamente
      } catch (error) {
        safeLogger.error('Error during graceful shutdown', { error });
      }

      process.exit(0);
    });

    // Force exit después de 10s si no cierra
    setTimeout(() => {
      safeLogger.warn('Forcing shutdown after 10 seconds timeout');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // Uncaught exceptions
  process.on('uncaughtException', (error) => {
    safeLogger.error('Uncaught exception', {
      error: error.message,
      stack: error.stack,
    });
    process.exit(1);
  });

  // Unhandled promise rejections
  process.on('unhandledRejection', (reason, promise) => {
    safeLogger.error('Unhandled rejection', {
      reason: String(reason),
      promise: String(promise),
    });
    process.exit(1);
  });
}

// Iniciar si se ejecuta como módulo principal
if (require.main === module) {
  startServer().catch((error) => {
    safeLogger.error('Failed to start server', { error: error.message });
    process.exit(1);
  });
}
