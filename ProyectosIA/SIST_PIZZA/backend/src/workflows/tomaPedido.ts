/**
 * Workflow - Toma de Pedido (Prompt 12)
 * - Validar items del menú
 * - Validar cobertura delivery
 * - Crear pedido en DB
 * - Calcular total
 */

import { safeLogger } from '../lib/logger';
import { getSupabaseClient } from '../lib/supabase';
import { determinarZona } from '../services/claude';

export interface ItemPedido {
  nombreProducto: string;
  cantidad: number;
  notas?: string;
}

export interface ResultadoTomaPedido {
  pedidoId: string;
  items: ItemPedido[];
  total: number;
  tipoEntrega: 'delivery' | 'retiro';
  direccionEntrega?: string;
  exito: boolean;
  mensaje?: string;
}

/**
 * Tomar pedido del cliente
 */
export async function tomarPedido(
  clienteId: string,
  items: ItemPedido[],
  tipoEntrega: 'delivery' | 'retiro',
  direccionEntrega?: string,
  notasCliente?: string
): Promise<ResultadoTomaPedido> {
  try {
    const supabase = getSupabaseClient();

    // ========================================================================
    // 1. VALIDAR ITEMS DEL MENÚ
    // ========================================================================

    const menuItems = await Promise.all(
      items.map(async (item) => {
        const { data, error } = await supabase
          .from('menu_items')
          .select('id, nombre, precio, disponible')
          .eq('nombre', item.nombreProducto)
          .eq('disponible', true)
          .maybeSingle();

        if (error || !data) {
          safeLogger.warn('Menu item not found or unavailable', {
            item: item.nombreProducto,
          });

          return null;
        }

        return { ...data, cantidad: item.cantidad };
      })
    );

    const itemsValidos = menuItems.filter(Boolean);

    if (itemsValidos.length !== items.length) {
      safeLogger.warn('Some items not available', {
        requested: items.length,
        valid: itemsValidos.length,
      });

      return {
        pedidoId: '',
        items,
        total: 0,
        tipoEntrega,
        exito: false,
        mensaje: 'Algunos items no están disponibles',
      };
    }

    // ========================================================================
    // 2. VALIDAR COBERTURA DELIVERY
    // ========================================================================

    if (tipoEntrega === 'delivery') {
      if (!direccionEntrega) {
        return {
          pedidoId: '',
          items,
          total: 0,
          tipoEntrega,
          exito: false,
          mensaje: 'Dirección de entrega requerida',
        };
      }

      const zona = determinarZona(direccionEntrega);

      if (zona === 'fuera_cobertura') {
        safeLogger.info('Delivery out of coverage', { zona });

        return {
          pedidoId: '',
          items,
          total: 0,
          tipoEntrega,
          direccionEntrega,
          exito: false,
          mensaje: 'Dirección fuera de zona de cobertura',
        };
      }
    }

    // ========================================================================
    // 3. CALCULAR TOTAL
    // ========================================================================

    const total = itemsValidos.reduce((sum, item) => {
      return sum + (item?.precio ?? 0) * (item?.cantidad ?? 0);
    }, 0);

    // ========================================================================
    // 4. CREAR PEDIDO EN DB
    // ========================================================================

    const { data: pedidoCreado, error: errorPedido } = await supabase
      .from('pedidos')
      .insert({
        cliente_id: clienteId,
        estado: 'pendiente',
        tipo_entrega: tipoEntrega,
        direccion_entrega: direccionEntrega || null,
        total,
        notas_cliente: notasCliente,
      })
      .select()
      .single();

    if (errorPedido || !pedidoCreado) {
      safeLogger.error('Error creating order', {
        error: errorPedido?.message,
      });

      return {
        pedidoId: '',
        items,
        total,
        tipoEntrega,
        exito: false,
        mensaje: 'Error al crear pedido',
      };
    }

    // ========================================================================
    // 5. CREAR COMANDAS (items del pedido)
    // ========================================================================

    const comandas = itemsValidos
      .filter((item) => item !== null)
      .map((item) => ({
        pedido_id: pedidoCreado.id,
        menu_item_id: item!.id,
        cantidad: item!.cantidad,
        precio_unitario: item!.precio,
        notas: items.find((i) => i.nombreProducto === item!.nombre)?.notas,
      }));

    const { error: errorComandas } = await supabase
      .from('comandas')
      .insert(comandas);

    if (errorComandas) {
      safeLogger.error('Error creating command details', {
        error: errorComandas.message,
      });

      return {
        pedidoId: '',
        items,
        total,
        tipoEntrega,
        exito: false,
        mensaje: 'Error al crear detalles del pedido',
      };
    }

    safeLogger.info('Order created successfully', {
      pedido_id: pedidoCreado.id,
      items_count: itemsValidos.length,
      total,
    });

    return {
      pedidoId: pedidoCreado.id,
      items,
      total,
      tipoEntrega,
      direccionEntrega,
      exito: true,
      mensaje: 'Pedido creado exitosamente',
    };
  } catch (error) {
    safeLogger.error('Error in tomarPedido', {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      pedidoId: '',
      items,
      total: 0,
      tipoEntrega,
      exito: false,
      mensaje: 'Error interno al procesar pedido',
    };
  }
}
