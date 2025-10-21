/**
 * Store Zustand: Gestión de Comandas
 * - Estado global de comandas activas
 * - Acciones para agregar, actualizar, eliminar
 * - Getters para filtrar y ordenar
 */

import { create } from 'zustand';
import type { Comanda } from '../lib/supabase';

export interface ComandasStore {
  // Estado
  comandas: Comanda[];
  filtroEstado: string | null;
  
  // Acciones
  setComandas: (comandas: Comanda[]) => void;
  addComanda: (comanda: Comanda) => void;
  updateComanda: (comanda: Comanda) => void;
  removeComanda: (id: string) => void;
  setFiltroEstado: (estado: string | null) => void;
  clear: () => void;
  
  // Getters
  getComandasPorEstado: (estado: string) => Comanda[];
  getTotalPorEstado: () => Record<string, number>;
  getComandasOrdenadas: () => Comanda[];
  getTiempoPromedio: () => number;
}

export const useComandasStore = create<ComandasStore>((set, get) => ({
  // Estado inicial
  comandas: [],
  filtroEstado: null,

  // Acciones
  setComandas: (comandas: Comanda[]) => set({ comandas }),

  addComanda: (comanda: Comanda) =>
    set((state) => ({
      comandas: [...state.comandas, comanda],
    })),

  updateComanda: (comanda: Comanda) =>
    set((state) => ({
      comandas: state.comandas.map((c) =>
        c.id === comanda.id ? comanda : c
      ),
    })),

  removeComanda: (id: string) =>
    set((state) => ({
      comandas: state.comandas.filter((c) => c.id !== id),
    })),

  setFiltroEstado: (estado: string | null) => set({ filtroEstado: estado }),

  clear: () => set({ comandas: [], filtroEstado: null }),

  // Getters
  getComandasPorEstado: (estado: string) => {
    const state = get();
    return state.comandas.filter((c) => c.estado === estado);
  },

  getTotalPorEstado: () => {
    const state = get();
    const totales: Record<string, number> = {};

    state.comandas.forEach((c) => {
      totales[c.estado] = (totales[c.estado] || 0) + 1;
    });

    return totales;
  },

  getComandasOrdenadas: () => {
    const state = get();

    // Ordenar por: estado (nueva → preparando → lista) + tiempo
    const orden = { nueva: 0, preparando: 1, lista: 2, entregada: 3, cancelada: 4 };

    return [...state.comandas]
      .filter((c) => !state.filtroEstado || c.estado === state.filtroEstado)
      .sort((a, b) => {
        const ordenA = orden[a.estado as keyof typeof orden] || 5;
        const ordenB = orden[b.estado as keyof typeof orden] || 5;

        if (ordenA !== ordenB) return ordenA - ordenB;

        // Dentro del mismo estado, ordenar por tiempo (antiguas primero)
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      });
  },

  getTiempoPromedio: () => {
    const state = get();

    if (state.comandas.length === 0) return 0;

    const now = new Date().getTime();
    const tiemposMs = state.comandas.map(
      (c) => now - new Date(c.created_at).getTime()
    );
    const promediaMs = tiemposMs.reduce((a, b) => a + b, 0) / tiemposMs.length;

    return Math.round(promediaMs / 60000); // Convertir a minutos
  },
}));
