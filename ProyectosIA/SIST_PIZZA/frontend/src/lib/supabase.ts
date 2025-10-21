/**
 * Cliente Supabase para Frontend
 * - Conexión a base de datos
 * - Tipos TypeScript
 * - Realtime listeners
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGFiYXNlLXJlZiIsInJvbGUiOiJhbm9uIiwiaWF0IjoxNjc4OTAwMDAwLCJleHAiOjE2Nzk1MDAwMDB9';

// Tipos
export interface Comanda {
  id: string;
  numero: number;
  pedido_id: string;
  estado: 'nueva' | 'preparando' | 'lista' | 'entregada' | 'cancelada';
  prioridad: 'normal' | 'express';
  items_count: number;
  total: number;
  zona?: string;
  tiempo_estimado?: number;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  nombre: string;
  descripcion: string;
  categoria: string;
  precio: number;
  disponible: boolean;
  created_at: string;
}

export interface Cliente {
  id: string;
  phone: string;
  nombre?: string;
  email?: string;
  zona?: string;
  created_at: string;
}

export interface Pedido {
  id: string;
  cliente_id: string;
  estado: 'pendiente' | 'confirmado' | 'entregado' | 'cancelado';
  total: number;
  items_count: number;
  created_at: string;
}

export interface Pago {
  id: string;
  pedido_id: string;
  monto: number;
  estado: 'pending' | 'approved' | 'rejected';
  metodo: string;
  referencia?: string;
  created_at: string;
}

// Cliente Supabase
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Helpers
export async function fetchComandasActivas() {
  const { data, error } = await supabase
    .from('comandas')
    .select('*')
    .neq('estado', 'entregada')
    .neq('estado', 'cancelada')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Comanda[];
}

export async function fetchMenuItems() {
  const { data, error } = await supabase
    .from('menu_items')
    .select('*')
    .eq('disponible', true)
    .order('categoria');

  if (error) throw error;
  return data as MenuItem[];
}

export async function transicionarComanda(comandaId: string, nuevoEstado: string) {
  const { error } = await supabase
    .from('comandas')
    .update({
      estado: nuevoEstado,
      updated_at: new Date().toISOString(),
    })
    .eq('id', comandaId);

  if (error) throw error;
}
