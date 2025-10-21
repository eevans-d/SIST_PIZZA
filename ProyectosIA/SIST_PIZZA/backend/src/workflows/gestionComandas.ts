/**
 * Workflow - Gestión de Comandas (Prompt 14)
 * - Transiciones de estado
 * - Validación de flujo
 * - Notificaciones
 */

import { safeLogger } from '../lib/logger';
import { getSupabaseClient } from '../lib/supabase';

/**
 * Estados válidos de una comanda
 */
export type EstadoComanda = 'nueva' | 'preparando' | 'lista' | 'entregada' | 'cancelada';

/**
 * Transiciones permitidas
 */
const TRANSICIONES_VALIDAS: Record<EstadoComanda, EstadoComanda[]> = {
  nueva: ['preparando', 'cancelada'],
  preparando: ['lista', 'cancelada'],
  lista: ['entregada', 'cancelada'],
  entregada: [],
  cancelada: [],
};

export interface ResultadoTransicionComanda {
  exito: boolean;
  mensaje: string;
  estadoAnterior?: EstadoComanda;
  estadoNuevo?: EstadoComanda;
}

/**
 * Validar transición de estado
 */
function esTransicionValida(
  estadoActual: EstadoComanda,
  estadoNuevo: EstadoComanda
): boolean {
  return TRANSICIONES_VALIDAS[estadoActual].includes(estadoNuevo);
}

/**
 * Transicionar comanda a nuevo estado
 */
export async function transicionarComanda(
  comandaId: string,
  estadoNuevo: EstadoComanda
): Promise<ResultadoTransicionComanda> {
  try {
    const supabase = getSupabaseClient();

    // ========================================================================
    // 1. OBTENER ESTADO ACTUAL
    // ========================================================================

    const { data: comanda, error: errorObtener } = await supabase
      .from('comandas')
      .select('id, pedido_id')
      .eq('id', comandaId)
      .maybeSingle();

    if (errorObtener || !comanda) {
      safeLogger.warn('Comanda not found', {
        comanda_id: comandaId,
      });

      return {
        exito: false,
        mensaje: 'Comanda no encontrada',
      };
    }

    // TODO: Obtener estado actual del pedido
    // const estadoActual = ...

    const estadoActual: EstadoComanda = 'nueva'; // Simulated

    // ========================================================================
    // 2. VALIDAR TRANSICIÓN
    // ========================================================================

    if (!esTransicionValida(estadoActual, estadoNuevo)) {
      safeLogger.warn('Invalid state transition', {
        comanda_id: comandaId,
        current: estadoActual,
        requested: estadoNuevo,
      });

      return {
        exito: false,
        mensaje: `Transición inválida: ${estadoActual} → ${estadoNuevo}`,
        estadoAnterior: estadoActual,
        estadoNuevo,
      };
    }

    // ========================================================================
    // 3. ACTUALIZAR ESTADO EN DB
    // ========================================================================

    const { error: errorUpdate } = await supabase
      .from('pedidos')
      .update({
        estado: estadoNuevo,
        updated_at: new Date().toISOString(),
      })
      .eq('id', comanda.pedido_id);

    if (errorUpdate) {
      safeLogger.error('Error updating order state', {
        error: errorUpdate.message,
        comanda_id: comandaId,
      });

      return {
        exito: false,
        mensaje: 'Error al actualizar estado',
      };
    }

    // ========================================================================
    // 4. EMIT EVENTO PARA NOTIFICACIONES
    // ========================================================================

    safeLogger.info('Order state transitioned', {
      comanda_id: comandaId,
      pedido_id: comanda.pedido_id,
      from: estadoActual,
      to: estadoNuevo,
    });

    // TODO: Emit 'comanda:actualizada' event para listeners
    // eventEmitter.emit('comanda:actualizada', { comandaId, estadoNuevo });

    return {
      exito: true,
      mensaje: `Comanda actualizada: ${estadoActual} → ${estadoNuevo}`,
      estadoAnterior: estadoActual,
      estadoNuevo,
    };
  } catch (error) {
    safeLogger.error('Error in transicionarComanda', {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      exito: false,
      mensaje: 'Error interno',
    };
  }
}

/**
 * Obtener comandas de un pedido
 */
export async function obtenerComandasPedido(pedidoId: string) {
  try {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('comandas')
      .select(`
        id,
        cantidad,
        notas,
        menu_items(nombre, categoria),
        created_at
      `)
      .eq('pedido_id', pedidoId)
      .order('created_at', { ascending: true });

    if (error) {
      safeLogger.error('Error fetching orders', { error: error.message });
      return [];
    }

    return data;
  } catch (error) {
    safeLogger.error('Error in obtenerComandasPedido', {
      error: error instanceof Error ? error.message : String(error),
    });

    return [];
  }
}
