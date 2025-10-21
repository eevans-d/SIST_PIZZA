/**
 * Página: Analytics en Tiempo Real (Prompt 30)
 * - Métricas por hora/día
 * - Ingresos acumulados
 * - Items populares
 * - Zonas con más demanda
 */

import { useState, useEffect } from 'react';
import { useComandasStore } from '../store/comandas';

interface AnalyticsData {
  ingresosHoy: number;
  ingresosPromedio: number;
  comandasPorHora: Record<string, number>;
  itemsPopulares: Array<{ nombre: string; cantidad: number }>;
  zonasMasDemanda: Array<{ zona: string; cantidad: number }>;
  tiempoPromedio: number;
}

export function Analytics() {
  const { comandas } = useComandasStore();
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    ingresosHoy: 0,
    ingresosPromedio: 0,
    comandasPorHora: {},
    itemsPopulares: [],
    zonasMasDemanda: [],
    tiempoPromedio: 0,
  });

  const [periodo, setPeriodo] = useState<'hoy' | 'semana' | 'mes'>('hoy');

  // Calcular analytics
  useEffect(() => {
    if (comandas.length === 0) return;

    // 1. Filtrar por período
    const ahora = new Date();
    const fechaInicio = new Date();

    if (periodo === 'hoy') {
      fechaInicio.setHours(0, 0, 0, 0);
    } else if (periodo === 'semana') {
      fechaInicio.setDate(ahora.getDate() - 7);
    } else if (periodo === 'mes') {
      fechaInicio.setMonth(ahora.getMonth() - 1);
    }

    const comandasFiltradas = comandas.filter(
      (c) => new Date(c.created_at) >= fechaInicio
    );

    // 2. Ingresos
    const ingresosHoy = comandasFiltradas.reduce(
      (sum, c) => sum + (c.total || 0),
      0
    );

    const ingresosPromedio = comandasFiltradas.length > 0
      ? ingresosHoy / comandasFiltradas.length
      : 0;

    // 3. Comandas por hora
    const comandasPorHora: Record<string, number> = {};

    comandasFiltradas.forEach((c) => {
      const hora = new Date(c.created_at).getHours();
      const horaLabel = `${hora}:00`;
      comandasPorHora[horaLabel] = (comandasPorHora[horaLabel] || 0) + 1;
    });

    // 4. Items populares (mock - en prod vendría del servidor)
    const itemsPopulares = [
      { nombre: '🍕 Pizza Grande Mozzarella', cantidad: 45 },
      { nombre: '🍕 Pizza Mediana Pepperoni', cantidad: 38 },
      { nombre: '🍟 Papas Fritas', cantidad: 32 },
      { nombre: '🥤 Gaseosa 2L', cantidad: 28 },
      { nombre: '🌭 Hot Dog', cantidad: 22 },
    ];

    // 5. Zonas con más demanda
    const zonasCuenta: Record<string, number> = {};

    comandasFiltradas.forEach((c) => {
      const zona = c.zona || 'Sin especificar';
      zonasCuenta[zona] = (zonasCuenta[zona] || 0) + 1;
    });

    const zonasMasDemanda = Object.entries(zonasCuenta)
      .map(([zona, cantidad]) => ({ zona, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 5);

    // 6. Tiempo promedio
    const tiempos = comandasFiltradas
      .map((c) => {
        return (new Date().getTime() - new Date(c.created_at).getTime()) / 60000;
      })
      .filter((t) => t > 0);

    const tiempoPromedio =
      tiempos.length > 0
        ? Math.round(tiempos.reduce((a, b) => a + b) / tiempos.length)
        : 0;

    setAnalytics({
      ingresosHoy,
      ingresosPromedio,
      comandasPorHora,
      itemsPopulares,
      zonasMasDemanda,
      tiempoPromedio,
    });
  }, [comandas, periodo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">📊 Analytics</h1>
          <p className="text-gray-400 mt-2">
            Métricas en tiempo real • {new Date().toLocaleDateString('es-AR')}
          </p>
        </div>

        {/* Selector de período */}
        <div className="flex gap-2">
          {(['hoy', 'semana', 'mes'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriodo(p)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                periodo === p
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {p === 'hoy' ? 'Hoy' : p === 'semana' ? 'Semana' : 'Mes'}
            </button>
          ))}
        </div>
      </div>

      {/* Metricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <MetricaCard
          titulo="Ingresos"
          valor={`$${analytics.ingresosHoy.toFixed(2)}`}
          icon="💰"
          subtitulo={`Promedio: $${analytics.ingresosPromedio.toFixed(2)}`}
          color="from-green-600 to-green-800"
        />

        <MetricaCard
          titulo="Comandas"
          valor={comandas.length.toString()}
          icon="📋"
          subtitulo={`Tiempo promedio: ${analytics.tiempoPromedio} min`}
          color="from-blue-600 to-blue-800"
        />

        <MetricaCard
          titulo="Eficiencia"
          valor={`${Math.round((comandas.filter((c) => c.estado === 'entregada').length / Math.max(1, comandas.length)) * 100)}%`}
          icon="⚡"
          subtitulo="Completadas"
          color="from-purple-600 to-purple-800"
        />
      </div>

      {/* Grid de análisis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Items Populares */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">🌟 Items Populares</h2>

          <div className="space-y-3">
            {analytics.itemsPopulares.map((item, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-gray-300">{item.nombre}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-red-500 to-red-600 h-2 rounded-full"
                      style={{
                        width: `${(item.cantidad / 50) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-10 text-right">
                    {item.cantidad}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Zonas con más demanda */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-xl font-bold mb-4">🗺️ Zonas con más Demanda</h2>

          <div className="space-y-3">
            {analytics.zonasMasDemanda.map((zona, i) => (
              <div key={i} className="flex items-center justify-between">
                <span className="text-gray-300 capitalize">{zona.zona}</span>
                <div className="flex items-center gap-3">
                  <div className="w-32 bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-yellow-500 to-yellow-600 h-2 rounded-full"
                      style={{
                        width: `${(zona.cantidad / (analytics.zonasMasDemanda[0]?.cantidad || 1)) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="text-sm font-semibold w-10 text-right">
                    {zona.cantidad}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Comandas por hora */}
        <div className="bg-gray-800 rounded-lg p-6 lg:col-span-2">
          <h2 className="text-xl font-bold mb-4">📈 Comandas por Hora</h2>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {Object.entries(analytics.comandasPorHora)
              .sort((a, b) => {
                const horaA = parseInt(a[0]);
                const horaB = parseInt(b[0]);
                return horaA - horaB;
              })
              .map(([hora, cantidad]) => (
                <div
                  key={hora}
                  className="flex flex-col items-center gap-2 min-w-max"
                >
                  <div
                    className="bg-gradient-to-t from-red-600 to-red-400 w-8 rounded"
                    style={{
                      height: `${Math.max(20, (cantidad / 10) * 100)}px`,
                    }}
                  />
                  <span className="text-xs text-gray-400">{hora}</span>
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Componente: Tarjeta de Métrica
 */
interface MetricaCardProps {
  titulo: string;
  valor: string;
  icon: string;
  subtitulo?: string;
  color?: string;
}

function MetricaCard({
  titulo,
  valor,
  icon,
  subtitulo,
  color = 'from-red-600 to-red-800',
}: MetricaCardProps) {
  return (
    <div className={`bg-gradient-to-br ${color} rounded-lg p-6 shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm opacity-90">{titulo}</p>
          <p className="text-4xl font-bold mt-2">{valor}</p>
          {subtitulo && <p className="text-xs opacity-75 mt-2">{subtitulo}</p>}
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}
