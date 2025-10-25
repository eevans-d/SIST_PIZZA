import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';
import { config } from './config';

const router = Router();

// GET /api/menu - lista de items disponibles
router.get('/api/menu', async (_req, res) => {
  try {
    const supabase = createClient(config.supabase.url, config.supabase.anonKey);
    const { data, error } = await supabase
      .from('menu_items')
      .select('id,nombre,descripcion,precio,disponible,categoria')
      .eq('disponible', true)
      .order('nombre', { ascending: true });

    if (error) return res.status(500).json({ error: 'Database error', details: error.message });
    res.json({ items: data ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal error', message: err.message });
  }
});

// GET /api/menu/:id - detalle de item
router.get('/api/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = createClient(config.supabase.url, config.supabase.anonKey);
    const { data, error } = await supabase
      .from('menu_items')
      .select('id,nombre,descripcion,precio,disponible,categoria,ingredientes,tiempo_preparacion_min')
      .eq('id', id)
      .single();

    if (error) return res.status(404).json({ error: 'Not Found', message: 'Item no encontrado' });
    res.json({ item: data });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal error', message: err.message });
  }
});

// GET /api/pedidos/:id - detalle de pedido
router.get('/api/pedidos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const supabase = createClient(config.supabase.url, config.supabase.anonKey);
    const { data: pedido, error } = await supabase
      .from('pedidos')
      .select('id, cliente_id, estado, tipo_entrega, direccion_entrega, total, notas_cliente, created_at')
      .eq('id', id)
      .single();

    if (error) return res.status(404).json({ error: 'Not Found', message: 'Pedido no encontrado' });

    const { data: items } = await supabase
      .from('comandas')
      .select('menu_item_id, cantidad, precio_unitario, subtotal')
      .eq('pedido_id', id);

    res.json({ pedido, items: items ?? [] });
  } catch (err: any) {
    res.status(500).json({ error: 'Internal error', message: err.message });
  }
});

export default router;
