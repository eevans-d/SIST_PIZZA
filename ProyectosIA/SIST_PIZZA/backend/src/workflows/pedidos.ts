import { Router } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { safeLogger } from '../lib/logger';

const router = Router();

export const updatePedidoSchema = z.object({
  estado: z.enum(['pendiente', 'confirmado', 'en_preparacion', 'listo', 'entregado', 'cancelado']),
});

const listPedidosQuerySchema = z.object({
  estado: z.enum(['pendiente', 'confirmado', 'en_preparacion', 'listo', 'entregado', 'cancelado']).optional(),
  desde: z.string().datetime().optional(),
  hasta: z.string().datetime().optional(),
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// GET /api/pedidos - listado con filtros y paginación
router.get('/api/pedidos', async (req, res) => {
  try {
    const { estado, desde, hasta, limit, offset } = listPedidosQuerySchema.parse(req.query);

    const supabase = createClient(config.supabase.url, config.supabase.anonKey);
    let query: any = supabase
      .from('pedidos')
      .select('id, cliente_id, estado, tipo_entrega, total, created_at', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (estado) query = query.eq('estado', estado);
    if (desde) query = query.gte('created_at', desde);
    if (hasta) query = query.lte('created_at', hasta);

    const { data, error, count } = await query;

    if (error) return res.status(500).json({ error: 'Database error', message: error.message });

    res.json({ items: data ?? [], pagination: { limit, offset, count: count ?? 0 } });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'ValidationError', details: err.errors });
    }
    safeLogger.error('Error listando pedidos', { error: err.message });
    res.status(500).json({ error: 'Internal error' });
  }
});

// PATCH /api/pedidos/:id - actualizar estado del pedido
router.patch('/api/pedidos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { estado } = updatePedidoSchema.parse(req.body);

    const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

    const { data: pedido, error } = await supabase
      .from('pedidos')
      .update({ estado })
      .eq('id', id)
      .select()
      .single();

    if (error) return res.status(404).json({ error: 'Not Found', message: 'Pedido no encontrado' });

    await supabase.from('audit_logs').insert({
      table_name: 'pedidos',
      operation: 'UPDATE',
      new_data: { id, estado },
    });

    safeLogger.info('Pedido actualizado', { id, estado });
    res.json({ success: true, pedido });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'ValidationError', details: err.errors });
    }
    safeLogger.error('Error actualizando pedido', { error: err.message });
    res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
