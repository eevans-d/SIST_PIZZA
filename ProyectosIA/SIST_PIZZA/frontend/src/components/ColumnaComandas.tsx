/**
 * Componente: Columna de Comandas por Estado (Prompt 18)
 * - Agrupa comandas por estado
 * - Muestra contador
 * - Tarjetas anidadas
 */

import { Comanda } from '../lib/supabase';
import { ComandaCard } from './ComandaCard';

interface ColumnaComandaProps {
  estado: 'nueva' | 'preparando' | 'lista' | 'entregada' | 'cancelada';
  comandas: Comanda[];
}

const ESTADO_CONFIG = {
  nueva: {
    titulo: '📥 Nueva',
    color: 'bg-blue-50',
    badge: 'bg-blue-600',
    borderColor: 'border-blue-200',
  },
  preparando: {
    titulo: '👨‍🍳 Preparando',
    color: 'bg-yellow-50',
    badge: 'bg-yellow-600',
    borderColor: 'border-yellow-200',
  },
  lista: {
    titulo: '✅ Lista',
    color: 'bg-green-50',
    badge: 'bg-green-600',
    borderColor: 'border-green-200',
  },
  entregada: {
    titulo: '🎉 Entregada',
    color: 'bg-gray-50',
    badge: 'bg-gray-600',
    borderColor: 'border-gray-200',
  },
  cancelada: {
    titulo: '❌ Cancelada',
    color: 'bg-red-50',
    badge: 'bg-red-600',
    borderColor: 'border-red-200',
  },
};

export function ColumnaComandas({ estado, comandas }: ColumnaComandaProps) {
  const config = ESTADO_CONFIG[estado];

  return (
    <div
      className={`${config.color} border-2 ${config.borderColor} rounded-xl p-4 min-h-96`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">{config.titulo}</h3>
        <span className={`${config.badge} text-white px-3 py-1 rounded-full font-bold text-lg`}>
          {comandas.length}
        </span>
      </div>

      {/* Divider */}
      <div className={`h-1 ${config.badge} rounded mb-4`} />

      {/* Tarjetas */}
      <div className="space-y-3 max-h-80 overflow-y-auto">
        {comandas.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 text-sm">Sin comandas</p>
          </div>
        ) : (
          comandas.map((comanda) => <ComandaCard key={comanda.id} comanda={comanda} />)
        )}
      </div>

      {/* Stats footer */}
      {comandas.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200 text-xs text-gray-600">
          <p>
            {comandas.length} {comandas.length === 1 ? 'comanda' : 'comandas'} en {estado}
          </p>
        </div>
      )}
    </div>
  );
}
