/**
 * 🧠 INSTRUCCIONES PARA GITHUB COPILOT:
 * Middleware para validación de webhooks (Prompt 7)
 * - Validar IP contra whitelist oficial
 * - Validar firma criptográfica
 * - Prevenir duplicados
 * - GDPR: nunca exponer detalles en errores
 */

import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../lib/logger';
import crypto from 'crypto';

/**
 * Whitelist de IPs oficiales (hardcoded por seguridad)
 */
const WHITELIST: Record<string, string[]> = {
  chatwoot: ['54.226.73.99', '54.241.27.196', '54.219.37.83'], // IPs oficiales Chatwoot
  modo: ['190.112.0.0/16'], // Rango MODO (ejemplo)
  mercadopago: ['200.0.0.0/8'], // Rango MercadoPago (ejemplo)
};

/**
 * Validar que IP está en whitelist
 */
export function validateIP(
  allowedIPs: string[],
  clientIP: string | undefined
): boolean {
  if (!clientIP) return false;

  // Extraer IP real (bypass proxies)
  const realIP = clientIP.split(',')[0].trim();

  for (const pattern of allowedIPs) {
    // IP exacta
    if (pattern === realIP) return true;

    // CIDR (simple: solo /16 y /24)
    if (pattern.includes('/')) {
      const [subnet, bits] = pattern.split('/');
      const subnetParts = subnet.split('.').map(Number);
      const clientParts = realIP.split('.').map(Number);
      const maskBits = parseInt(bits, 10);

      const bytesToCheck = Math.ceil(maskBits / 8);
      let matches = true;

      for (let i = 0; i < bytesToCheck; i++) {
        if (subnetParts[i] !== clientParts[i]) {
          matches = false;
          break;
        }
      }

      if (matches) return true;
    }
  }

  return false;
}

/**
 * Middleware: Validar webhook de Chatwoot
 */
export function validateChatwootWebhook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const clientIP = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress;

  // Validar IP
  if (!validateIP(WHITELIST.chatwoot, clientIP)) {
    safeLogger.warn('Chatwoot webhook rejected - invalid IP', {
      ip: clientIP?.split(',')[0],
    });

    return res.status(403).json({
      error: 'Forbidden',
      message: 'Acceso rechazado',
    });
  }

  // Validar firma HMAC (X-Chatwoot-Signature)
  const secret = process.env.CHATWOOT_WEBHOOK_SECRET;
  if (secret) {
    const signature = req.headers['x-chatwoot-signature'] as string;
    const rawBody = (req as any).rawBody;

    if (!signature) {
      safeLogger.warn('Chatwoot webhook rejected - missing signature');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Firma faltante',
      });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody || '')
      .digest('hex');

    // Comparación time-safe
    try {
      if (!crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )) {
        safeLogger.warn('Chatwoot webhook rejected - invalid signature', {
          signaturePrefix: signature.slice(0, 8) + '...',
        });
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Firma inválida',
        });
      }
    } catch (err) {
      // Buffer length mismatch
      safeLogger.warn('Chatwoot webhook rejected - signature length mismatch');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Firma inválida',
      });
    }
    
    safeLogger.info('Chatwoot webhook signature validated successfully');
  } else {
    safeLogger.warn('CHATWOOT_WEBHOOK_SECRET not configured - skipping HMAC validation');
  }

  next();
}

/**
 * Middleware: Validar webhook de MODO
 */
export function validateModoWebhook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const clientIP = req.headers['x-forwarded-for']?.toString() || req.socket.remoteAddress;

  // Validar IP
  if (!validateIP(WHITELIST.modo, clientIP)) {
    safeLogger.warn('MODO webhook rejected - invalid IP', {
      ip: clientIP?.split(',')[0],
    });

    return res.status(403).json({
      error: 'Forbidden',
      message: 'Acceso rechazado',
    });
  }

  // Validar firma HMAC (X-Modo-Signature)
  const secret = process.env.MODO_WEBHOOK_SECRET;
  if (secret) {
    const signature = req.headers['x-modo-signature'] as string;
    const rawBody = (req as any).rawBody;

    if (!signature) {
      safeLogger.warn('MODO webhook rejected - missing signature');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Firma faltante',
      });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(rawBody || '')
      .digest('hex');

    // Comparación time-safe
    try {
      if (!crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
      )) {
        safeLogger.warn('MODO webhook rejected - invalid signature', {
          signaturePrefix: signature.slice(0, 8) + '...',
        });
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Firma inválida',
        });
      }
    } catch (err) {
      // Buffer length mismatch
      safeLogger.warn('MODO webhook rejected - signature length mismatch');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Firma inválida',
      });
    }
    
    safeLogger.info('MODO webhook signature validated successfully');
  } else {
    safeLogger.warn('MODO_WEBHOOK_SECRET not configured - skipping HMAC validation');
  }

  next();
}

/**
 * Middleware: Detectar webhooks duplicados
 * Almacena hash del body en memoria (Redis en producción)
 */
const recentWebhooks = new Map<string, number>();
const WEBHOOK_DUPLICATE_WINDOW = 60000; // 60 segundos

export function detectDuplicateWebhook(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const body = JSON.stringify(req.body);
  const hash = crypto.createHash('sha256').update(body).digest('hex');
  const now = Date.now();

  // Limpiar webhooks antiguos
  for (const [key, timestamp] of recentWebhooks.entries()) {
    if (now - timestamp > WEBHOOK_DUPLICATE_WINDOW) {
      recentWebhooks.delete(key);
    }
  }

  // Verificar si es duplicado
  if (recentWebhooks.has(hash)) {
    safeLogger.warn('Duplicate webhook detected', { hash });

    return res.status(200).json({
      success: true,
      message: 'Webhook procesado anteriormente',
    });
  }

  // Registrar nuevo webhook
  recentWebhooks.set(hash, now);

  next();
}

/**
 * Middleware: Validar firma con HMAC (para APIs que lo soportan)
 */
export function validateHmacSignature(secret: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const signature = req.headers['x-webhook-signature'] as string;
    const body = JSON.stringify(req.body);

    if (!signature) {
      safeLogger.warn('Missing webhook signature');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Firma faltante',
      });
    }

    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest('hex');

    // Comparación time-safe
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
      safeLogger.warn('Invalid webhook signature');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Firma inválida',
      });
    }

    next();
  };
}
