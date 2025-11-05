/**
 * Workflow - Generación de Pagos (Prompt 13)
 * - Crear transacción MODO
 * - Polling de estado
 * - Webhooks de confirmación
 */

import { safeLogger } from '../lib/logger';
import { getSupabaseClient } from '../lib/supabase';
import { modoService } from '../services/modo';

export interface ResultadoGenerarPago {
  pagoId: string;
  pedidoId: string;
  monto: number;
  estado: 'pendiente' | 'aprobado' | 'rechazado' | 'error';
  enlace?: string;
  mensaje: string;
}

/**
 * Generar pago para pedido
 */
export async function generarPago(
  pedidoId: string,
  amountARS: number,
  canal: 'whatsapp' | 'web' | 'app' = 'whatsapp'
): Promise<ResultadoGenerarPago> {
  try {
    const supabase = getSupabaseClient();

    safeLogger.info('Generating payment', {
      pedido_id: pedidoId,
      monto: amountARS,
      canal,
    });

    // ========================================================================
    // 1. CREAR TRANSACCIÓN EN MODO
    // ========================================================================

    const transaccionModo = await modoService.crearTransaccion(
      pedidoId,
      amountARS,
      `${process.env.WEBHOOK_URL || 'http://localhost:3000'}/webhooks/modo`
    );

    // ========================================================================
    // 2. REGISTRAR PAGO EN DB
    // ========================================================================

    const { data: pagoCreado, error: errorPago } = await supabase
      .from('pagos')
      .insert({
        pedido_id: pedidoId,
        metodo_pago: 'mercadopago',
        monto: amountARS,
        estado: 'pendiente',
        referencia_externa: transaccionModo.operation_id,
      })
      .select()
      .single();

    if (errorPago || !pagoCreado) {
      safeLogger.error('Error creating payment record', {
        error: errorPago?.message,
      });

      return {
        pagoId: '',
        pedidoId,
        monto: amountARS,
        estado: 'error',
        mensaje: 'Error al crear registro de pago',
      };
    }

    // ========================================================================
    // 3. GENERAR ENLACE DE PAGO
    // ========================================================================

    // Simulated payment link (en producción: del response de MODO)
    const enlacePago = `https://pay.modo.com.ar/${transaccionModo.operation_id}`;

    safeLogger.info('Payment created successfully', {
      pago_id: pagoCreado.id,
      modo_operation_id: transaccionModo.operation_id,
    });

    return {
      pagoId: pagoCreado.id,
      pedidoId,
      monto: amountARS,
      estado: transaccionModo.status as any,
      enlace: enlacePago,
      mensaje: `Enlace de pago generado. Total: $${amountARS} ARS`,
    };
  } catch (error) {
    safeLogger.error('Error in generarPago', {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      pagoId: '',
      pedidoId,
      monto: amountARS,
      estado: 'error',
      mensaje: 'Error interno al generar pago',
    };
  }
}

/**
 * Confirmar pago (llamado desde webhook)
 */
export async function confirmarPago(
  pagoId: string,
  _operationId: string
): Promise<{ exito: boolean; mensaje: string }> {
  try {
    const supabase = getSupabaseClient();

    safeLogger.info('Confirming payment', { pago_id: pagoId });

    // Actualizar estado del pago
    const { error } = await supabase
      .from('pagos')
      .update({
        estado: 'aprobado',
        updated_at: new Date().toISOString(),
      })
      .eq('id', pagoId);

    if (error) {
      safeLogger.error('Error confirming payment', {
        error: error.message,
      });

      return {
        exito: false,
        mensaje: 'Error al confirmar pago',
      };
    }

    // Obtener pedido asociado
    const { data: pago } = await supabase
      .from('pagos')
      .select('pedido_id')
      .eq('id', pagoId)
      .single();

    if (pago) {
      // Actualizar estado del pedido a 'confirmado'
      await supabase
        .from('pedidos')
        .update({
          estado: 'confirmado',
          updated_at: new Date().toISOString(),
        })
        .eq('id', pago.pedido_id);
    }

    safeLogger.info('Payment confirmed successfully', { pago_id: pagoId });

    return {
      exito: true,
      mensaje: 'Pago confirmado',
    };
  } catch (error) {
    safeLogger.error('Error in confirmarPago', {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      exito: false,
      mensaje: 'Error interno',
    };
  }
}
