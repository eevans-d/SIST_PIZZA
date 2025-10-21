/**
 * Hook: Suscripción Realtime a Comandas (Prompt 20)
 * - Conectar a Supabase RealtimeClient
 * - Sincronizar store Zustand
 * - Auto-reconectar en caso de desconexión
 */

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useComandasStore } from '../store/comandas';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeComandas {
  loading: boolean;
  error: Error | null;
  isConnected: boolean;
}

const RECONNECT_DELAY = 5000; // 5 segundos

export function useRealtimeComandas(): UseRealtimeComandas {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { setComandas, addComanda, updateComanda, removeComanda } = useComandasStore();
  const [channel, setChannel] = useState<RealtimeChannel | null>(null);

  useEffect(() => {
  let isMounted = true;
  let reconnectTimeout: ReturnType<typeof setTimeout>;    async function setupRealtime() {
      try {
        console.log('[REALTIME] Iniciando conexión...');

        // 1. Cargar comandas iniciales
        const { data: comandasInitiales, error: fetchError } = await supabase
          .from('comandas')
          .select('*')
          .order('created_at', { ascending: false });

        if (fetchError) throw fetchError;

        if (isMounted) {
          setComandas(comandasInitiales || []);
          setLoading(false);
        }

        // 2. Crear canal realtime
        const newChannel = supabase
          .channel('comandas-realtime')
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'comandas',
            },
            (payload: any) => {
              console.log('[REALTIME] Cambio detectado:', payload.eventType, payload.new);

              if (!isMounted) return;

              switch (payload.eventType) {
                case 'INSERT':
                  addComanda(payload.new as any);
                  break;
                case 'UPDATE':
                  updateComanda(payload.new as any);
                  break;
                case 'DELETE':
                  removeComanda(payload.old?.id);
                  break;
              }
            }
          )
          .on('system', { event: 'join' }, () => {
            if (isMounted) {
              console.log('[REALTIME] ✅ Conectado');
              setIsConnected(true);
              setError(null);
            }
          })
          .on('system', { event: 'leave' }, () => {
            if (isMounted) {
              console.log('[REALTIME] ❌ Desconectado');
              setIsConnected(false);
            }
          });

        await newChannel.subscribe((status: any) => {
          if (isMounted) {
            console.log('[REALTIME] Status:', status);
            if (status === 'CHANNEL_ERROR') {
              setError(new Error('Canal error'));
              // Reconectar
              reconnectTimeout = setTimeout(setupRealtime, RECONNECT_DELAY);
            }
          }
        });

        setChannel(newChannel);
      } catch (err) {
        console.error('[REALTIME] Error:', err);
        if (isMounted) {
          setError(err instanceof Error ? err : new Error('Unknown error'));
          setLoading(false);

          // Reconectar automáticamente
          reconnectTimeout = setTimeout(setupRealtime, RECONNECT_DELAY);
        }
      }
    }

    setupRealtime();

    return () => {
      isMounted = false;
      clearTimeout(reconnectTimeout);

      // Cleanup canal
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [setComandas, addComanda, updateComanda, removeComanda]);

  return { loading, error, isConnected };
}

/**
 * Hook para escuchar cambios en una comanda específica
 */
export function useComandaRealtime(comandaId: string | null) {
  useEffect(() => {
    if (!comandaId) return;

    let isMounted = true;
    const channel = supabase
      .channel(`comanda-${comandaId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comandas',
          filter: `id=eq.${comandaId}`,
        },
        (payload: any) => {
          if (isMounted) {
            console.log(`[REALTIME] Comanda ${comandaId} actualizada:`, payload.new);
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [comandaId]);
}
