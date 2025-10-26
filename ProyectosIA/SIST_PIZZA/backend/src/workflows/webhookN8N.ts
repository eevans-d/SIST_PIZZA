/**
 * Webhook para recibir pedidos desde N8N
 * N8N procesa mensajes de WhatsApp con Claude y envía aquí el pedido parseado
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { webhookLimiter } from '../middleware/rateLimiter';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { safeLogger } from '../lib/logger';

export function verifyHmacSignatureFromRaw(rawBody: string | undefined, secret?: string, signature?: string): boolean {
  if (!secret || !signature) return true;
  try {
    const hmac = crypto.createHmac('sha256', secret);
    const bodyString = rawBody ?? '';
    const expected = hmac.update(bodyString).digest('hex');
    return expected === signature;
  } catch {
    return false;
  }
}

// Backward-compatible helper used by earlier tests (stringifies body)
export function verifyHmacSignature(body: any, secret?: string, signature?: string): boolean {
  const raw = JSON.stringify(body || {});
  return verifyHmacSignatureFromRaw(raw, secret, signature);
}

const router = Router();

// Schema de validación del pedido desde N8N
const pedidoN8NSchema = z.object({
  cliente: z.object({
    nombre: z.string().optional(),
    telefono: z.string().min(10, 'Teléfono inválido'),
    direccion: z.string().min(5, 'Dirección inválida'),
  }),
  items: z.array(
    z.object({
      nombre: z.string(),
      cantidad: z.number().int().positive(),
    })
  ).min(1, 'Debe incluir al menos un item'),
  notas: z.string().optional(),
  origen: z.enum(['whatsapp', 'telegram', 'web', 'phone']).default('whatsapp'),
});

/**
 * POST /api/webhooks/n8n/pedido
 * Crear pedido desde N8N (procesado por Claude)
 */
router.post('/api/webhooks/n8n/pedido', webhookLimiter, async (req: Request, res: Response) => {
  try {
    // 0. Verificar firma HMAC (si está configurado N8N_WEBHOOK_SECRET)
    const secret = config.n8n?.webhookSecret;
    const signature = req.get('X-Signature') || req.get('x-signature');
    
    if (secret) {
      if (!signature) {
        safeLogger.warn('N8N webhook rejected - missing signature');
        return res.status(401).json({ success: false, error: 'Missing signature' });
      }
      
      if (!verifyHmacSignatureFromRaw((req as any).rawBody, secret, signature)) {
        safeLogger.warn('N8N webhook rejected - invalid signature', { 
          signaturePrefix: signature?.slice(0, 8) + '...' 
        });
        return res.status(401).json({ success: false, error: 'Invalid signature' });
      }
      
      safeLogger.info('N8N webhook signature validated successfully');
    } else {
      safeLogger.warn('N8N_WEBHOOK_SECRET not configured - skipping HMAC validation');
    }

    // 1. Validar datos
    const data = pedidoN8NSchema.parse(req.body);
    
    safeLogger.info('📥 Pedido recibido desde N8N', {
      origen: data.origen,
      items: data.items.length,
      telefono: data.cliente.telefono.slice(0, 6) + '***', // PII redaction
    });

    // 2. Conectar a Supabase
    const supabase = createClient(
      config.supabase.url,
      config.supabase.serviceRoleKey
    );

    // 3. Buscar o crear cliente
    let { data: cliente } = await supabase
      .from('clientes')
      .select()
      .eq('telefono', data.cliente.telefono)
      .single();

    if (!cliente) {
      const { data: nuevoCliente, error } = await supabase
        .from('clientes')
        .insert({
          nombre: data.cliente.nombre || `Cliente ${data.cliente.telefono.slice(-4)}`,
          telefono: data.cliente.telefono,
          direccion: data.cliente.direccion,
        })
        .select()
        .single();

      if (error) throw new Error(`Error creando cliente: ${error.message}`);
      cliente = nuevoCliente;
    }

    // 4. Buscar items del menú
    const itemsConPrecios = await Promise.all(
      data.items.map(async (item) => {
        // Buscar por nombre (case-insensitive, fuzzy)
        const { data: menuItem } = await supabase
          .from('menu_items')
          .select()
          .ilike('nombre', `%${item.nombre}%`)
          .eq('disponible', true)
          .limit(1)
          .single();

        if (!menuItem) {
          throw new Error(`Item "${item.nombre}" no encontrado o no disponible`);
        }

        return {
          menu_item_id: menuItem.id,
          cantidad: item.cantidad,
          precio_unitario: menuItem.precio,
          subtotal: parseFloat(menuItem.precio) * item.cantidad,
        };
      })
    );

    // 5. Buscar zona de entrega y calcular costo
    const { data: zonas } = await supabase
      .from('zonas_entrega')
      .select('id, nombre, costo_base, palabras_clave');

    // Buscar zona coincidente por palabras clave
    const direccion = data.cliente.direccion.toLowerCase();
    const zona = (zonas as any)?.find((z: any) =>
      z.palabras_clave
        ?.toLowerCase()
        .split(',')
        .some((palabra: string) => direccion.includes(palabra.trim()))
    ) || (zonas as any)?.[0]; // Fallback a primera zona si no hay coincidencia

    const costoEnvio = zona?.costo_base || 500; // Default $500 si no hay zonas

    // Log para debugging
    safeLogger.info('Shipping cost calculated', {
      direccion,
      zona: zona?.nombre,
      costo: costoEnvio,
    });

    // 6. Calcular total
    const subtotal = itemsConPrecios.reduce((sum, item) => sum + item.subtotal, 0);
    const total = subtotal + costoEnvio;

    // 7. Crear pedido
    const { data: pedido, error: errorPedido } = await supabase
      .from('pedidos')
      .insert({
        cliente_id: cliente.id,
        estado: 'pendiente',
        tipo_entrega: 'delivery',
        direccion_entrega: data.cliente.direccion,
        total,
        notas_cliente: data.notas,
      })
      .select()
      .single();

    if (errorPedido) throw new Error(`Error creando pedido: ${errorPedido.message}`);

    // 7. Crear detalles del pedido (en tabla "comandas")
    const { error: errorDetalles } = await supabase
      .from('comandas')
      .insert(
        itemsConPrecios.map((item) => ({
          pedido_id: pedido.id,
          menu_item_id: item.menu_item_id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.subtotal,
        }))
      );

    if (errorDetalles) throw new Error(`Error guardando detalles: ${errorDetalles.message}`);

    // 8. Log de auditoría
    await supabase.from('audit_logs').insert({
      table_name: 'pedidos',
      operation: 'INSERT',
      new_data: { pedido_id: pedido.id, total },
      user_id: cliente.id,
    });

    // 9. Responder a N8N
    safeLogger.info('✅ Pedido creado exitosamente', {
      pedido_id: pedido.id,
      total,
    });

    res.status(200).json({
      success: true,
      pedido_id: pedido.id,
      total,
      subtotal,
      costo_envio: costoEnvio,
      mensaje: `Pedido #${pedido.id.slice(0, 8)} creado. Total: $${total}. Tiempo estimado: 30-40 min.`,
    });
  } catch (error: any) {
    safeLogger.error('❌ Error en webhook N8N', {
      error: error.message,
      stack: error.stack,
    });

    res.status(400).json({
      success: false,
      error: error.message || 'Error procesando pedido',
    });
  }
});

export default router;
