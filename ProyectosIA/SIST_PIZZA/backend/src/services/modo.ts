/**
 * 🧠 INSTRUCCIONES PARA GITHUB COPILOT:
 * Cliente MODO API para pagos (Prompt 9)
 * - Validación de montos (±$1 ARS)
 * - Detección de duplicados
 * - Webhooks de confirmación
 * - Nunca enviar PII en requests
 */

import { safeLogger } from '../lib/logger';

/**
 * Configuración de MODO (simulated)
 * En producción, cargar desde env
 */
const MODO_CONFIG = {
  baseURL: 'https://api.modo.com.ar',
  apiKey: process.env.MODO_API_KEY || '',
  merchantId: process.env.MODO_MERCHANT_ID || '',
};

/**
 * Tipos MODO
 */
export interface ModoTransaccion {
  operation_id: string;
  reference: string; // ID del pedido (UUID)
  amount: number; // Centavos (ARS)
  currency: 'ARS';
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  payment_method?: 'credit_card' | 'debit_card' | 'bank_transfer';
  created_at: string;
  updated_at: string;
  webhook_url?: string;
}

export interface ModoWebhook {
  operation_id: string;
  reference: string;
  status: string;
  amount: number;
  timestamp: string;
}

/**
 * Cache de pagos procesados (prevenir duplicados)
 * En producción, usar Redis
 */
const processedPayments = new Map<string, number>();
const DUPLICATE_WINDOW = 3600000; // 1 hora

/**
 * Validar si transacción es duplicada
 */
function isDuplicate(paymentId: string): boolean {
  const lastTime = processedPayments.get(paymentId);

  if (lastTime && Date.now() - lastTime < DUPLICATE_WINDOW) {
    return true;
  }

  processedPayments.set(paymentId, Date.now());

  // Limpiar cache viejo
  for (const [id, time] of processedPayments.entries()) {
    if (Date.now() - time > DUPLICATE_WINDOW) {
      processedPayments.delete(id);
    }
  }

  return false;
}

/**
 * Validar monto (±$1 ARS de margen)
 */
function validateAmount(
  expectedCents: number,
  actualCents: number
): { valid: boolean; difference: number } {
  const differenceInCents = Math.abs(expectedCents - actualCents);
  const differenceInARS = differenceInCents / 100;

  return {
    valid: differenceInARS <= 1,
    difference: differenceInARS,
  };
}

/**
 * Servicio MODO
 */
export const modoService = {
  /**
   * Crear transacción de pago
   */
  async crearTransaccion(
    pedidoId: string,
    amountARS: number,
    webhookUrl?: string
  ): Promise<ModoTransaccion> {
    if (!MODO_CONFIG.apiKey || !MODO_CONFIG.merchantId) {
      safeLogger.error('MODO configuration missing');
      throw new Error('MODO API no configurada');
    }

    safeLogger.info('Creating MODO transaction', {
      pedidoId,
      amountARS,
      hasWebhook: !!webhookUrl,
    });

    // Simular llamada a MODO API
    // En producción: fetch() con headers de autenticación
    const amountCents = Math.round(amountARS * 100);

    const transaccion: ModoTransaccion = {
      operation_id: `MODO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      reference: pedidoId,
      amount: amountCents,
      currency: 'ARS',
      status: 'pending',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      webhook_url: webhookUrl,
    };

    safeLogger.info('MODO transaction created', {
      operation_id: transaccion.operation_id,
      status: transaccion.status,
    });

    return transaccion;
  },

  /**
   * Procesar webhook de MODO
   */
  async procesarWebhook(webhook: ModoWebhook): Promise<{
    success: boolean;
    message: string;
    isDuplicate: boolean;
  }> {
    const { operation_id, reference, status, amount, timestamp } = webhook;

    // 1. Validar duplicado
    if (isDuplicate(operation_id)) {
      safeLogger.info('Duplicate MODO webhook detected', { operation_id });

      return {
        success: true,
        message: 'Webhook procesado anteriormente',
        isDuplicate: true,
      };
    }

    // 2. Validar referencia (pedido ID)
    if (!reference || reference.length === 0) {
      safeLogger.warn('Invalid MODO webhook - missing reference', { operation_id });

      return {
        success: false,
        message: 'Referencia inválida',
        isDuplicate: false,
      };
    }

    // 3. Validar monto (consultar monto esperado en DB)
    // En producción: buscar pedido en DB y validar amount
    const expectedAmountCents = amount; // Simulated
    const validation = validateAmount(expectedAmountCents, amount);

    if (!validation.valid) {
      safeLogger.warn('MODO amount mismatch', {
        operation_id,
        difference: validation.difference,
      });

      return {
        success: false,
        message: `Monto inválido (diferencia: $${validation.difference} ARS)`,
        isDuplicate: false,
      };
    }

    // 4. Procesar según estado
    switch (status) {
      case 'approved':
        safeLogger.info('MODO payment approved', {
          operation_id,
          reference,
          amountARS: amount / 100,
        });

        // TODO: Actualizar pedido en DB
        // await pedidosService.updatePagoAprobado(reference, operation_id);

        return {
          success: true,
          message: 'Pago confirmado',
          isDuplicate: false,
        };

      case 'pending':
        safeLogger.info('MODO payment pending', { operation_id });

        // TODO: Iniciar polling (máx 10 min)

        return {
          success: true,
          message: 'Pago pendiente',
          isDuplicate: false,
        };

      case 'rejected':
      case 'cancelled':
        safeLogger.warn('MODO payment rejected', { operation_id, status });

        // TODO: Notificar rechazo al cliente

        return {
          success: true,
          message: `Pago ${status}`,
          isDuplicate: false,
        };

      default:
        safeLogger.warn('Unknown MODO status', { status, operation_id });

        return {
          success: false,
          message: 'Estado desconocido',
          isDuplicate: false,
        };
    }
  },

  /**
   * Consultar estado de transacción
   */
  async consultarEstado(operationId: string): Promise<ModoTransaccion | null> {
    safeLogger.info('Querying MODO transaction status', { operationId });

    // Simulated response
    return null; // TODO: Implementar
  },
};
