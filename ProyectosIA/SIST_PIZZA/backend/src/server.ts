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

  app.get('/health/ready', (req: Request, res: Response) => {
    // TODO: Verificar conexión a Supabase, Claude API, etc.
    res.json({ ready: true });
  });

  // ============================================================================
  // RUTAS (PLACEHOLDER)
  // ============================================================================

  // TODO: Agregar rutas de API aquí
  // app.post('/api/webhooks/chatwoot', ...);
  // app.post('/api/webhooks/modo', ...);
  // app.post('/api/pedidos', ...);

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

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    safeLogger.info(`Received ${signal}, shutting down gracefully...`);

    server.close(async () => {
      safeLogger.info('Server closed');

      // TODO: Cerrar conexiones (Supabase, etc.)
      // await supabaseClient?.close();

      process.exit(0);
    });

    // Force exit después de 10s
    setTimeout(() => {
      safeLogger.error('Could not close connections in time, forcefully shutting down');
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
