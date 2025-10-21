/**
 * Componente: Tarjeta Individual de Comanda (Prompt 17)
 * - Mostra detalles básicos
 * - Tiempo transcurrido con color dinámico
 * - Botón para cambiar estado
 * - Accesibilidad ARIA
 */

import { Comanda } from '../lib/supabase';
import {
  calcularMinutosDesde,
  getColorPorTiempo,
  formatearTiempo,
  getUrgencia,
} from '../lib/timeUtils';
import { useComandasStore } from '../store/comandas';
import { supabase } from '../lib/supabase';
import { soundSystem } from '../lib/soundSystem';

interface ComandaCardProps {
  comanda: Comanda;
}

const TRANSICIONES_VALIDAS = {
  nueva: 'preparando',
  preparando: 'lista',
  lista: 'entregada',
  entregada: null,
};

export function ComandaCard({ comanda }: ComandaCardProps) {
  const { updateComanda } = useComandasStore();
  const minutosTranscurridos = calcularMinutosDesde(comanda.created_at);
  const color = getColorPorTiempo(minutosTranscurridos, comanda.estado);
  const urgencia = getUrgencia(minutosTranscurridos, comanda.prioridad);
  const tiempoFormatado = formatearTiempo(minutosTranscurridos);

  /**
   * Avanzar estado
   */
  const handleAvanzarEstado = async () => {
    const nuevoEstado =
      TRANSICIONES_VALIDAS[comanda.estado as keyof typeof TRANSICIONES_VALIDAS];

    if (!nuevoEstado) {
      console.log('[COMANDA] No hay siguiente estado para:', comanda.estado);
      return;
    }

    console.log(`[COMANDA] Transitando ${comanda.id} de ${comanda.estado} a ${nuevoEstado}`);

    try {
      // Actualizar en BD
      const { error } = await supabase
        .from('comandas')
        .update({ estado: nuevoEstado, updated_at: new Date().toISOString() })
        .eq('id', comanda.id);

      if (error) throw error;

      // Actualizar store local
      updateComanda({
        ...comanda,
        estado: nuevoEstado as any,
        updated_at: new Date().toISOString(),
      });

      // Reproducir sonido
      soundSystem.play('baja');
    } catch (error) {
      console.error('[COMANDA] Error al actualizar estado:', error);
    }
  };

  return (
    <article
      className={`${color} border-2 border-gray-300 rounded-lg p-3 cursor-pointer hover:shadow-lg transition-shadow duration-200`}
      role="region"
      aria-label={`Comanda ${comanda.numero}, estado ${comanda.estado}`}
    >
      {/* Header: Número y urgencia */}
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-bold text-lg text-gray-900">#{comanda.numero}</h4>
        <span
          className={`text-xs font-bold px-2 py-1 rounded-full ${
            urgencia === 'crítica'
              ? 'bg-red-600 text-white animate-pulse'
              : urgencia === 'alta'
                ? 'bg-orange-500 text-white'
                : urgencia === 'media'
                  ? 'bg-yellow-400 text-gray-900'
                  : 'bg-green-400 text-gray-900'
          }`}
        >
          {urgencia.toUpperCase()}
        </span>
      </div>

      {/* Tiempo transcurrido */}
      <div className="text-2xl font-bold text-gray-900 mb-2">⏱️ {tiempoFormatado}</div>

      {/* Items (si disponible) */}
      {comanda.items_count && (
        <div className="text-sm text-gray-700 mb-2">
          📦 {comanda.items_count} item{comanda.items_count > 1 ? 's' : ''}
        </div>
      )}

      {/* Total */}
      {comanda.total && (
        <div className="text-sm font-semibold text-gray-800 mb-3">
          💰 ${comanda.total.toFixed(2)}
        </div>
      )}

      {/* Botón de transición */}
      <button
        onClick={handleAvanzarEstado}
        disabled={comanda.estado === 'entregada'}
        className={`w-full py-2 px-3 rounded-lg font-bold text-sm transition-colors duration-200 ${
          comanda.estado === 'entregada'
            ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
            : 'bg-blue-600 hover:bg-blue-700 text-white active:scale-95'
        }`}
        aria-label={`Avanzar comanda ${comanda.numero} a siguiente estado`}
      >
        {comanda.estado === 'nueva'
          ? '👨‍🍳 Preparar'
          : comanda.estado === 'preparando'
            ? '✅ Lista'
            : comanda.estado === 'lista'
              ? '🚚 Entregada'
              : 'Finalizada'}
      </button>

      {/* Detalles adicionales (expandible) */}
      <details className="mt-2 pt-2 border-t border-gray-300">
        <summary className="text-xs text-gray-600 cursor-pointer hover:text-gray-900">
          Detalles
        </summary>
        <div className="text-xs text-gray-600 mt-1 space-y-1">
          <p>ID: {comanda.id.substring(0, 8)}...</p>
          <p>Estado: {comanda.estado}</p>
          <p>Zona: {comanda.zona || 'N/A'}</p>
        </div>
      </details>
    </article>
  );
}
