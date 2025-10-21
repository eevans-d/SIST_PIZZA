/**
 * Página: Dashboard de Comandas (Prompt 19)
 * - 4 columnas por estado (nueva, preparando, lista, entregada)
 * - Tarjetas con tiempo transcurrido + colores
 * - Transiciones entre estados
 */

import { Comanda } from '../lib/supabase';
import { useComandasStore } from '../store/comandas';
import { ColumnaComandas } from '../components/ColumnaComandas';

interface ComandasProps {
  comandas: Comanda[];
}

type EstadoComanda = 'nueva' | 'preparando' | 'lista' | 'entregada' | 'cancelada';

const ESTADOS: EstadoComanda[] = ['nueva', 'preparando', 'lista', 'entregada'];

export function Comandas({ comandas }: ComandasProps) {
  const { getComandasPorEstado } = useComandasStore();

  return (
    <div>
      {/* Título */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900">📋 Dashboard de Comandas</h1>
        <p className="text-gray-600 mt-2">
          {comandas.length} comanda{comandas.length !== 1 ? 's' : ''} en seguimiento
        </p>
      </div>

      {/* Grid de columnas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {ESTADOS.map((estado) => {
          const comandasPorEstado = getComandasPorEstado(estado);

          return (
            <ColumnaComandas key={estado} estado={estado} comandas={comandasPorEstado} />
          );
        })}
      </div>

      {/* Mensaje si no hay comandas */}
      {comandas.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">😴</div>
          <p className="text-2xl text-gray-600 font-medium">Sin comandas</p>
          <p className="text-gray-500 mt-2">Esperando nuevas órdenes...</p>
        </div>
      )}
    </div>
  );
}
