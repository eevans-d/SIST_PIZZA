import { Router } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { safeLogger } from '../lib/logger';

const router = Router();

const menuItemSchema = z.object({
  nombre: z.string().min(2),
  descripcion: z.string().optional(),
  categoria: z.enum(['pizza', 'empanada', 'bebida', 'postre', 'extra']),
  precio: z.number().nonnegative(),
  disponible: z.boolean().default(true),
  imagen_url: z.string().url().optional(),
  ingredientes: z.array(z.string()).optional(),
  tiempo_preparacion_min: z.number().int().nonnegative().optional(),
});

// POST /api/menu - crear item del menú (requiere service role)
router.post('/api/menu', async (req, res) => {
  try {
    const payload = menuItemSchema.parse(req.body);
    const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

    const { data, error } = await supabase
      .from('menu_items')
      .insert(payload)
      .select('id,nombre,descripcion,categoria,precio,disponible,imagen_url,ingredientes,tiempo_preparacion_min')
      .single();

    if (error) return res.status(400).json({ error: 'Database error', message: error.message });

    await supabase.from('audit_logs').insert({
      table_name: 'menu_items',
      operation: 'INSERT',
      new_data: { id: data.id, nombre: data.nombre },
    });

    return res.status(201).json({ success: true, item: data });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'ValidationError', details: err.errors });
    }
    safeLogger.error('Error creando item de menú', { error: err.message });
    return res.status(500).json({ error: 'Internal error' });
  }
});

const updateMenuItemSchema = menuItemSchema.partial();

// PATCH /api/menu/:id - actualizar item del menú (service role)
router.patch('/api/menu/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = updateMenuItemSchema.parse(req.body);

    const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
    const { data, error } = await supabase
      .from('menu_items')
      .update(updates)
      .eq('id', id)
      .select('id,nombre,descripcion,categoria,precio,disponible,imagen_url,ingredientes,tiempo_preparacion_min')
      .single();

    if (error) return res.status(404).json({ error: 'Not Found', message: 'Item no encontrado' });

    await supabase.from('audit_logs').insert({
      table_name: 'menu_items',
      operation: 'UPDATE',
      new_data: { id: data.id, ...updates },
    });

    return res.json({ success: true, item: data });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'ValidationError', details: err.errors });
    }
    safeLogger.error('Error actualizando item de menú', { error: err.message });
    return res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
