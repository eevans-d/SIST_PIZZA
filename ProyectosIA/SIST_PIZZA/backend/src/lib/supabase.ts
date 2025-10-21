/**
 * Cliente Supabase con tipos para SIST_PIZZA (Prompt 3)
 * Gestión de clientes con redacción de PII según GDPR/Ley 25.326
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config';
import { safeLogger } from './logger';

/**
 * Cliente completo (solo backend, nunca expuesto a frontend)
 */
export interface Cliente {
  id?: string;
  nombre: string;
  telefono: string;
  direccion: string;
  email?: string;
  notas?: string;
  created_at?: string;
  updated_at?: string;
}

/**
 * Cliente redactado (seguro para frontend y logs)
 * 0% PII exposure
 */
export interface ClienteRedactado {
  id: string;
  nombre_parcial: string; // Ej: "Carlos M****z"
  telefono_parcial: string; // Ej: "***7890"
  direccion_parcial: string; // Ej: "[REDACTED]"
  created_at: string;
}

/**
 * Función para redactar PII de cliente
 */
export function redactarCliente(cliente: Cliente): ClienteRedactado {
  // Nombre: solo primera palabra + inicial + ****
  const nombreParts = cliente.nombre.trim().split(' ');
  const nombreParcial = nombreParts.length > 1
    ? `${nombreParts[0]} ${nombreParts[nombreParts.length - 1].charAt(0)}****`
    : `${nombreParts[0].charAt(0)}****`;

  // Teléfono: solo últimos 4 dígitos
  const telefonoParcial = `***${cliente.telefono.slice(-4)}`;

  return {
    id: cliente.id || '',
    nombre_parcial: nombreParcial,
    telefono_parcial: telefonoParcial,
    direccion_parcial: '[REDACTED]',
    created_at: cliente.created_at || new Date().toISOString(),
  };
}

/**
 * Cliente Supabase singleton
 */
let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
  if (!supabaseClient) {
    const { url, anonKey } = config.supabase;

    if (!url || !anonKey) {
      safeLogger.error('Supabase configuration missing', { url: !!url, anonKey: !!anonKey });
      throw new Error('Supabase URL and Anon Key are required');
    }

    supabaseClient = createClient(url, anonKey, {
      auth: {
        persistSession: false, // Backend no necesita persistir sesiones
      },
    });

    safeLogger.info('Supabase client initialized', { url });
  }

  return supabaseClient;
}

/**
 * Operaciones seguras con clientes
 */
export const clienteService = {
  /**
   * Crear cliente (PII completo en DB, redactado en logs)
   */
  async create(data: Omit<Cliente, 'id' | 'created_at' | 'updated_at'>): Promise<Cliente> {
    const supabase = getSupabaseClient();
    const redactado = redactarCliente(data as Cliente);

    safeLogger.info('Creating cliente', { cliente: redactado });

    const { data: cliente, error } = await supabase
      .from('clientes')
      .insert(data)
      .select()
      .single();

    if (error) {
      safeLogger.error('Error creating cliente', { error: error.message });
      throw error;
    }

    safeLogger.info('Cliente created successfully', { id: cliente.id });
    return cliente;
  },

  /**
   * Buscar cliente por teléfono (PII completo solo en backend)
   */
  async findByTelefono(telefono: string): Promise<Cliente | null> {
    const supabase = getSupabaseClient();

    safeLogger.info('Searching cliente by telefono', { telefono: `***${telefono.slice(-4)}` });

    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('telefono', telefono)
      .maybeSingle();

    if (error) {
      safeLogger.error('Error finding cliente', { error: error.message });
      throw error;
    }

    return data;
  },

  /**
   * Obtener cliente redactado (seguro para frontend)
   */
  async getRedacted(id: string): Promise<ClienteRedactado | null> {
    const supabase = getSupabaseClient();

    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      safeLogger.error('Error getting cliente', { error: error.message, id });
      throw error;
    }

    return data ? redactarCliente(data) : null;
  },
};
