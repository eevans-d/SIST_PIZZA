/**
 * 🧠 INSTRUCCIONES PARA GITHUB COPILOT:
 * Sistema de logging estructurado con redacción automática de PII.
 * - Nunca loggear PII sin redactar (teléfono, dirección, email)
 * - Logs en formato JSON para observabilidad
 * - Niveles: error, warn, info, debug
 */

import winston from 'winston';
import { config } from '../config';

// Función para redactar PII
export function redactPII(data: any): any {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  const redacted = { ...data };

  // Redactar teléfonos argentinos: +5492234567890 → ***7890
  if (redacted.telefono && typeof redacted.telefono === 'string') {
    redacted.telefono = redacted.telefono.slice(-4).padStart(redacted.telefono.length, '*');
  }

  // Redactar emails: usuario@example.com → ***@***.***
  if (redacted.email && typeof redacted.email === 'string') {
    redacted.email = '***@***.***';
  }

  // Redactar direcciones
  if (redacted.direccion && typeof redacted.direccion === 'string') {
    redacted.direccion = '[REDACTED]';
  }

  return redacted;
}

// Crear logger de Winston
export const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Wrapper para loggear con redacción automática
export const safeLogger = {
  error: (message: string, meta?: any) => {
    logger.error(message, redactPII(meta));
  },
  warn: (message: string, meta?: any) => {
    logger.warn(message, redactPII(meta));
  },
  info: (message: string, meta?: any) => {
    logger.info(message, redactPII(meta));
  },
  debug: (message: string, meta?: any) => {
    logger.debug(message, redactPII(meta));
  },
};
