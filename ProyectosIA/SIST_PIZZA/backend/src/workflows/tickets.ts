import { Router } from 'express';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { strictLimiter } from '../middleware/rateLimiter';
import { safeLogger } from '../lib/logger';

const router = Router();

const ticketSchema = z.object({
  user_id: z.string().uuid().optional(),
  prioridad: z.enum(['baja', 'media', 'alta', 'critica']).default('media'),
  asunto: z.string().min(3),
  descripcion: z.string().min(3),
});

// POST /api/tickets - crear ticket de soporte
router.post('/api/tickets', strictLimiter, async (req, res) => {
  try {
    const payload = ticketSchema.parse(req.body);

    const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);
    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        user_id: payload.user_id ?? null,
        prioridad: payload.prioridad,
        asunto: payload.asunto,
        descripcion: payload.descripcion,
      })
      .select()
      .single();

    if (error) {
      safeLogger.error('Error creando ticket', { error: error.message });
      return res.status(500).json({ error: 'Database error', message: error.message });
    }

    // Auditoría simple
    await supabase.from('audit_logs').insert({
      table_name: 'support_tickets',
      operation: 'INSERT',
      new_data: { id: data.id, prioridad: data.prioridad },
      user_id: data.user_id,
    });

    return res.status(201).json({ success: true, ticket: data });
  } catch (err: any) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: 'ValidationError', details: err.errors });
    }
    safeLogger.error('Error en /api/tickets', { error: err.message });
    return res.status(500).json({ error: 'Internal error' });
  }
});

export default router;
