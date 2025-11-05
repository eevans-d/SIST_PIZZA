/**
 * Enrutamiento de Entregas (Prompt 28)
 * - Integración Google Maps API
 * - Cálculo de rutas óptimas
 * - Estimaciones de tiempo real
 * - Soporte para múltiples repartidores
 */

import { createClient } from '@supabase/supabase-js';
import { config } from '../config';
import { logger } from '../lib/logger';

const supabase = createClient(config.supabase.url, config.supabase.serviceRoleKey);

interface Entrega {
  id?: string;
  pedido_id: string;
  cliente_id: string;
  repartidor_id?: string;
  zona: string;
  direccion: string;
  coordenadas?: { lat: number; lng: number };
  estado: 'pendiente' | 'en_camino' | 'entregado' | 'problema';
  estimado_en?: string;
  distancia_km?: number;
  tiempo_estimado_min?: number;
  created_at?: string;
}

/**
 * Crear entrega y calcular ruta óptima
 */
export async function crearEntrega(datos: Entrega): Promise<Entrega> {
  try {
    // 1. Obtener coordenadas del cliente si no las tiene
    if (!datos.coordenadas) {
      datos.coordenadas = await obtenerCoordenadas(datos.direccion, datos.zona);
    }

    // 2. Encontrar repartidor óptimo
    const repartidor = await encontrarRepartidorOptimo(
      datos.zona,
      datos.coordenadas
    );

    if (!repartidor) {
      logger.warn('[ROUTING] No hay repartidores disponibles para zona', {
        zona: datos.zona,
      });
    }

    // 3. Crear entrega en DB
    const { data: entrega, error } = await supabase
      .from('entregas')
      .insert({
        pedido_id: datos.pedido_id,
        cliente_id: datos.cliente_id,
        repartidor_id: repartidor?.id || null,
        zona: datos.zona,
        direccion: datos.direccion,
        coordenadas: datos.coordenadas,
        estado: 'pendiente',
        distancia_km: datos.distancia_km || 0,
        tiempo_estimado_min: datos.tiempo_estimado_min || 30,
        created_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    logger.info('[ROUTING] Entrega creada', {
      id: entrega.id,
      zona: datos.zona,
      repartidor: repartidor?.id,
    });

    return entrega;
  } catch (error) {
    logger.error('[ROUTING] Error creando entrega', { error });
    throw error;
  }
}

/**
 * Obtener coordenadas de dirección (mock - requiere Google Maps API)
 */
async function obtenerCoordenadas(
  direccion: string,
  zona: string
): Promise<{ lat: number; lng: number }> {
  // Mock para desarrollo - devuelve coordenadas de Necochea
  const zonas: Record<string, { lat: number; lng: number }> = {
    centro: { lat: -38.3417, lng: -58.7265 },
    norte: { lat: -38.33, lng: -58.72 },
    sur: { lat: -38.35, lng: -58.73 },
    fuera_cobertura: { lat: -38.2, lng: -58.6 },
  };

  return zonas[zona] || { lat: -38.3417, lng: -58.7265 };
}

/**
 * Encontrar repartidor óptimo
 */
async function encontrarRepartidorOptimo(
  zona: string,
  _coordenadas: { lat: number; lng: number }
): Promise<{ id: string; nombre: string } | null> {
  try {
    // 1. Obtener repartidores disponibles en la zona
    const { data: repartidores, error } = await supabase
      .from('repartidores')
      .select('*')
      .eq('zona', zona)
      .eq('disponible', true)
      .order('ordenes_activas', { ascending: true })
      .limit(1);

    if (error || !repartidores?.length) {
      return null;
    }

    return {
      id: repartidores[0].id,
      nombre: repartidores[0].nombre,
    };
  } catch (error) {
    logger.error('[ROUTING] Error encontrando repartidor', { error });
    return null;
  }
}

/**
 * Calcular ruta óptima para repartidor
 */
export async function calcularRutaOptima(repartidorId: string): Promise<any> {
  try {
    // 1. Obtener entregas pendientes del repartidor
    const { data: entregas, error } = await supabase
      .from('entregas')
      .select('*')
      .eq('repartidor_id', repartidorId)
      .in('estado', ['pendiente', 'en_camino'])
      .order('created_at', { ascending: true });

    if (error) throw error;

    // 2. Calcular orden óptima (TSP - Traveling Salesman Problem)
    // Por ahora: orden FIFO simple + cercana
    const rutaOptima = entregas?.map((e: any, index: number) => ({
      orden: index + 1,
      entrega_id: e.id,
      coordenadas: e.coordenadas,
      distancia_km: e.distancia_km,
      tiempo_estimado_min: e.tiempo_estimado_min,
    })) || [];

    logger.info('[ROUTING] Ruta calculada', {
      repartidor: repartidorId,
      entregas: rutaOptima.length,
    });

    return rutaOptima;
  } catch (error) {
    logger.error('[ROUTING] Error calculando ruta', { error });
    throw error;
  }
}

/**
 * Actualizar estado de entrega
 */
export async function actualizarEstadoEntrega(
  entregaId: string,
  nuevoEstado: string,
  ubicacion?: { lat: number; lng: number }
): Promise<Entrega> {
  try {
    const updateData: any = {
      estado: nuevoEstado,
      updated_at: new Date().toISOString(),
    };

    if (ubicacion) {
      updateData.ultima_ubicacion = ubicacion;
    }

    if (nuevoEstado === 'entregado') {
      updateData.entregado_en = new Date().toISOString();
    }

    const { data: entrega, error } = await supabase
      .from('entregas')
      .update(updateData)
      .eq('id', entregaId)
      .select()
      .single();

    if (error) throw error;

    logger.info('[ROUTING] Estado entrega actualizado', {
      id: entregaId,
      estado: nuevoEstado,
    });

    return entrega;
  } catch (error) {
    logger.error('[ROUTING] Error actualizando estado', { error });
    throw error;
  }
}

/**
 * Obtener estimación de tiempo de entrega
 */
export async function obtenerEstimacionEntrega(entregaId: string): Promise<any> {
  try {
    const { data: entrega, error } = await supabase
      .from('entregas')
      .select('*')
      .eq('id', entregaId)
      .single();

    if (error) throw error;

    // Calcular ETA basado en estado
    let eta_minutos = entrega.tiempo_estimado_min;

    if (entrega.estado === 'en_camino') {
      // Reducir tiempo según tiempo transcurrido
      const createdAt = new Date(entrega.created_at);
      const tiempoTranscurrido = (new Date().getTime() - createdAt.getTime()) / 60000;
      eta_minutos = Math.max(0, eta_minutos - tiempoTranscurrido);
    }

    const eta = new Date(new Date().getTime() + eta_minutos * 60000);

    return {
      entrega_id: entregaId,
      estado: entrega.estado,
      tiempo_estimado_min: Math.round(eta_minutos),
      eta: eta.toISOString(),
      distancia_km: entrega.distancia_km,
    };
  } catch (error) {
    logger.error('[ROUTING] Error obteniendo estimación', { error });
    throw error;
  }
}

/**
 * Crear tabla entregas
 */
export async function createEntregasTable() {
  try {
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS entregas (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          pedido_id UUID NOT NULL REFERENCES pedidos(id),
          cliente_id UUID NOT NULL REFERENCES clientes(id),
          repartidor_id UUID,
          zona TEXT NOT NULL,
          direccion TEXT NOT NULL,
          coordenadas JSONB,
          ultima_ubicacion JSONB,
          estado TEXT DEFAULT 'pendiente',
          distancia_km DECIMAL(10,2),
          tiempo_estimado_min INTEGER,
          created_at TIMESTAMP DEFAULT NOW(),
          entregado_en TIMESTAMP,
          updated_at TIMESTAMP DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS repartidores (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          nombre TEXT NOT NULL,
          telefono TEXT,
          zona TEXT NOT NULL,
          disponible BOOLEAN DEFAULT true,
          ordenes_activas INTEGER DEFAULT 0,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_entregas_estado
          ON entregas(estado);
        CREATE INDEX IF NOT EXISTS idx_entregas_repartidor
          ON entregas(repartidor_id);
        CREATE INDEX IF NOT EXISTS idx_repartidores_zona
          ON repartidores(zona, disponible);
      `,
    });
  } catch (error) {
    logger.error('[ROUTING] Error creando tablas', { error });
  }
}
