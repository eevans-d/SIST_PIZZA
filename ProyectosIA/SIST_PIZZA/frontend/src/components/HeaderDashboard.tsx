/**
 * Componente: Header Dashboard (Prompt 21)
 * - Indicador de conexión Realtime
 * - Información de la sesión
 * - Botón para abrir configuración
 */

import { useState } from 'react';
import { esHorarioLaboral } from '../lib/timeUtils';

interface HeaderDashboardProps {
  isConnected: boolean;
  comandasTotal: number;
  onSettingsClick: () => void;
}

export function HeaderDashboard({
  isConnected,
  comandasTotal,
  onSettingsClick,
}: HeaderDashboardProps) {
  const [hora] = useState<string>(new Date().toLocaleTimeString('es-AR'));
  const horarioOk = esHorarioLaboral();

  return (
    <header className="bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4">
        {/* Primera línea: Logo + Estado */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold">🍕 SIST_PIZZA</div>
            <div className="text-sm opacity-90">Necochea, Buenos Aires</div>
          </div>

          {/* Indicador de conexión */}
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full animate-pulse ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`}
            />
            <span className="text-sm font-medium">
              {isConnected ? 'Conectado' : 'Desconectado'}
            </span>
          </div>
        </div>

        {/* Segunda línea: Info + Botones */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Hora y estado laboral */}
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold">⏰ {hora}</span>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  horarioOk
                    ? 'bg-green-500 text-white'
                    : 'bg-yellow-500 text-gray-900'
                }`}
              >
                {horarioOk ? '🔴 EN SERVICIO' : '⚪ CERRADO'}
              </span>
            </div>

            {/* Total de comandas */}
            <div className="flex items-center gap-2">
              <span className="text-sm opacity-90">Comandas activas:</span>
              <span className="text-2xl font-bold bg-white text-red-600 px-3 py-1 rounded">
                {comandasTotal}
              </span>
            </div>
          </div>

          {/* Botón de configuración */}
          <button
            onClick={onSettingsClick}
            className="bg-white text-red-600 hover:bg-gray-100 px-4 py-2 rounded-lg font-semibold transition-colors duration-200 flex items-center gap-2"
          >
            <span>⚙️</span>
            Configuración
          </button>
        </div>

        {/* Alerta si fuera de horario */}
        {!horarioOk && (
          <div className="mt-3 bg-yellow-500 text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold">
            ⚠️ Establecimiento cerrado. Sonidos y alertas deshabilitadas.
          </div>
        )}
      </div>
    </header>
  );
}
