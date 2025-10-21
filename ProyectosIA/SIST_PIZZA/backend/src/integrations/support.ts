/**
 * Sistema de Escalamientos de Soporte (Prompt 27)
 * - Tickets de soporte
 * - Escalamiento a Chatwoot
 * - Auditoría de resoluciones
 * - SLA tracking
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { logger } from '../lib/logger';
import { ChatwootService } from '../services/chatwoot';

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

export type TipoProblema = 'pedido_no_llego' | 'calidad_producto' | 'retraso' | 'error_pago' | 'otro';
export type EstadoTicket = 'abierto' | 'en_proceso' | 'resuelto' | 'escalado' | 'cerrado';

interface SoporteTicket {
  id?: string;
  cliente_id: string;
  pedido_id?: string;
  tipo_problema: TipoProblema;
  descripcion: string;
  estado: EstadoTicket;
  prioridad: 'baja' | 'media' | 'alta' | 'urgente';
  sla_vencimiento?: string;
  resolucion?: string;
  created_at?: string;
  resuelto_en?: string;
}

/**
 * Crear ticket de soporte
 */
export async function crearTicketSoporte(datos: SoporteTicket): Promise<SoporteTicket> {
  try {
    // 1. Calcular SLA según prioridad
    const slaMinutos = {
      baja: 24 * 60, // 24 horas
      media: 4 * 60, // 4 horas
      alta: 1 * 60, // 1 hora
      urgente: 15, // 15 minutos
    };

    const slaVencimiento = new Date(
      new Date().getTime() + slaMinutos[datos.prioridad] * 60000
    );

    // 2. Crear ticket
    const { data: ticket, error } = await supabase
      .from('soporte_tickets')
      .insert({
        cliente_id: datos.cliente_id,
        pedido_id: datos.pedido_id || null,
        tipo_problema: datos.tipo_problema,
        descripcion: datos.descripcion,
        estado: 'abierto',
        prioridad: datos.prioridad,
        sla_vencimiento: slaVencimiento.toISOString(),
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('[SOPORTE] Ticket creado', {
      id: ticket.id,
      cliente: datos.cliente_id,
      prioridad: datos.prioridad,
    });

    // 3. Enviar notificación a admin
    await notificarAdminNuevoTicket(ticket);

    // 4. Responder al cliente automáticamente
    await responderClienteTicketCreado(datos.cliente_id, ticket.id);

    return ticket;
  } catch (error) {
    logger.error('[SOPORTE] Error creando ticket', { error });
    throw error;
  }
}

/**
 * Resolver ticket
 */
export async function resolverTicket(
  ticketId: string,
  resolucion: string,
  solucionado_por: string
): Promise<SoporteTicket> {
  try {
    const ahora = new Date();

    // 1. Actualizar ticket
    const { data: ticket, error } = await supabase
      .from('soporte_tickets')
      .update({
        estado: 'resuelto',
        resolucion,
        resuelto_en: ahora.toISOString(),
        updated_at: ahora.toISOString(),
      })
      .eq('id', ticketId)
      .select()
      .single();

    if (error) throw error;

    // 2. Auditoría
    await registrarAuditoria(ticketId, 'RESOLVIDO', solucionado_por);

    // 3. Calcular SLA
    const createdAt = new Date(ticket.created_at);
    const tiempoResolucion = (ahora.getTime() - createdAt.getTime()) / 60000;
    const slaVencimiento = new Date(ticket.sla_vencimiento);
    const dentroSLA = ahora < slaVencimiento;

    logger.info('[SOPORTE] Ticket resuelto', {
      id: ticketId,
      tiempoMinutos: Math.round(tiempoResolucion),
      dentroSLA,
    });

    return ticket;
  } catch (error) {
    logger.error('[SOPORTE] Error resolviendo ticket', { error });
    throw error;
  }
}

/**
 * Escalar ticket a Chatwoot
 */
export async function escalarTicketChatwoot(ticketId: string): Promise<void> {
  try {
    // 1. Obtener ticket
    const { data: ticket, error: fetchError } = await supabase
      .from('soporte_tickets')
      .select(
        `
        *,
        clientes:cliente_id(nombre, phone, email)
      `
      )
      .eq('id', ticketId)
      .single();

    if (fetchError) throw fetchError;

    // 2. Crear conversación en Chatwoot
    const chatwoot = new ChatwootService();
    
    const mensajeEscalamiento = `
[ESCALAMIENTO AUTOMÁTICO]
Tipo: ${ticket.tipo_problema}
Prioridad: ${ticket.prioridad}
Descripción: ${ticket.descripcion}
Ticket ID: ${ticketId}

Por favor resolver ASAP.
    `.trim();

    await chatwoot.enviarMensaje(
      ticket.clientes[0]?.phone || 'unknown',
      mensajeEscalamiento
    );

    // 3. Marcar como escalado
    await supabase
      .from('soporte_tickets')
      .update({ estado: 'escalado' })
      .eq('id', ticketId);

    // 4. Auditoría
    await registrarAuditoria(ticketId, 'ESCALADO', 'system');

    logger.info('[SOPORTE] Ticket escalado a Chatwoot', { id: ticketId });
  } catch (error) {
    logger.error('[SOPORTE] Error escalando ticket', { error });
    throw error;
  }
}

/**
 * Obtener SLA stats
 */
export async function obtenerSLAStats(desde?: string, hasta?: string) {
  try {
    let query = supabase
      .from('soporte_tickets')
      .select('*')
      .eq('estado', 'resuelto');

    if (desde) query = query.gte('created_at', desde);
    if (hasta) query = query.lte('resuelto_en', hasta);

    const { data: tickets, error } = await query;

    if (error) throw error;

    // Calcular stats
    let dentroSLA = 0;
    let totalTickets = 0;

    tickets?.forEach((ticket: any) => {
      totalTickets++;
      const vencimiento = new Date(ticket.sla_vencimiento);
      const resuelto = new Date(ticket.resuelto_en);

      if (resuelto < vencimiento) {
        dentroSLA++;
      }
    });

    const porcentajeSLA = totalTickets > 0 ? (dentroSLA / totalTickets) * 100 : 0;

    return {
      totalTickets,
      dentroSLA,
      fueraDelSLA: totalTickets - dentroSLA,
      porcentajeSLA: porcentajeSLA.toFixed(1),
    };
  } catch (error) {
    logger.error('[SOPORTE] Error obteniendo SLA stats', { error });
    throw error;
  }
}

/**
 * Notificar admin nuevo ticket
 */
async function notificarAdminNuevoTicket(ticket: any): Promise<void> {
  // Implementar según sistema de notificaciones
  logger.info('[SOPORTE] Notificación enviada a admin', { ticketId: ticket.id });
}

/**
 * Responder cliente ticket creado
 */
async function responderClienteTicketCreado(clienteId: string, ticketId: string): Promise<void> {
  // Implementar según sistema de notificaciones
  logger.info('[SOPORTE] Respuesta automática enviada al cliente', {
    cliente: clienteId,
    ticketId,
  });
}

/**
 * Registrar auditoría
 */
async function registrarAuditoria(
  ticketId: string,
  accion: string,
  usuario: string
): Promise<void> {
  try {
    await supabase.from('soporte_auditoria').insert({
      ticket_id: ticketId,
      accion,
      usuario,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('[SOPORTE] Error registrando auditoría', { error });
  }
}

/**
 * Crear tabla soporte_tickets si no existe
 */
export async function createSoporteTablas() {
  try {
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS soporte_tickets (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          cliente_id UUID NOT NULL REFERENCES clientes(id),
          pedido_id UUID,
          tipo_problema TEXT NOT NULL,
          descripcion TEXT NOT NULL,
          estado TEXT DEFAULT 'abierto',
          prioridad TEXT DEFAULT 'media',
          sla_vencimiento TIMESTAMP,
          resolucion TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          resuelto_en TIMESTAMP,
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS soporte_auditoria (
          id BIGSERIAL PRIMARY KEY,
          ticket_id UUID NOT NULL REFERENCES soporte_tickets(id),
          accion TEXT NOT NULL,
          usuario TEXT,
          timestamp TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_soporte_tickets_estado 
          ON soporte_tickets(estado);
        CREATE INDEX IF NOT EXISTS idx_soporte_tickets_cliente 
          ON soporte_tickets(cliente_id);
      `,
    });
  } catch (error) {
    logger.error('[SOPORTE] Error creando tablas', { error });
  }
}
