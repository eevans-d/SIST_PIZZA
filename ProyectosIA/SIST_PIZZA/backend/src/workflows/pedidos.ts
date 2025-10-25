import { Router } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { safeLogger } from '../lib/logger';

const router = Router();

const updatePedidoSchema = z.object({
  estado: z.enum(['pendiente', 'confirmado', 'en_preparacion', 'listo', 'entregado', 'cancelado']),
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
