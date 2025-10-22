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

  // Headers de seguridad HTTP
  app.use(helmet());

  // CORS restrictivo: solo dominio principal
  const allowedOrigins = config.server.allowedOrigins.filter(Boolean);

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    })
  );

  // ============================================================================
  // PARSING
  // ============================================================================

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ limit: '10mb', extended: true }));

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

  // Webhook N8N para pedidos procesados por Claude
  const webhookN8N = require('./workflows/webhookN8N').default;
  app.use(webhookN8N);

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
    next: NextFunction
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
