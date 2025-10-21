/**
 * Página: Admin Dashboard (Prompt 29)
 * - Vista de todas las comandas
 * - KPIs en tiempo real
 * - Gráficos de estado
 * - Filtros avanzados
 */

import { useState, useEffect } from 'react';
import { useComandasStore } from '../store/comandas';

interface AdminDashboardProps {}

interface KPIs {
  totalComandas: number;
  ingresos: number;
  velocidadPromedio: number;
  satisfaccionEstimada: number;
}

export function AdminDashboard({}: AdminDashboardProps) {
  const { comandas } = useComandasStore();
  const [kpis, setKpis] = useState<KPIs>({
    totalComandas: 0,
    ingresos: 0,
    velocidadPromedio: 0,
    satisfaccionEstimada: 0,
  });

  const [filtroZona, setFiltroZona] = useState<string>('todas');
  const [filtroEstado, setFiltroEstado] = useState<string>('todas');

  // Calcular KPIs
  useEffect(() => {
    if (comandas.length === 0) return;

    const totalComandas = comandas.length;
    const ingresos = comandas.reduce((sum, c) => sum + (c.total || 0), 0);

    // Velocidad promedio (minutos para preparar)
    const velocidades = comandas
      .filter((c) => c.estado === 'lista' || c.estado === 'entregada')
      .map((c) => {
        const created = new Date(c.created_at).getTime();
        const updated = new Date(c.updated_at).getTime();
        return (updated - created) / 60000;
      });

    const velocidadPromedio =
      velocidades.length > 0 ? Math.round(velocidades.reduce((a, b) => a + b) / velocidades.length) : 0;

    // Satisfacción estimada (basada en SLA)
    const comandasPronta = comandas.filter((c) => {
      const minutos = (new Date().getTime() - new Date(c.created_at).getTime()) / 60000;
      return minutos < 45; // SLA 45 minutos
    }).length;

    const satisfaccionEstimada = Math.round((comandasPronta / totalComandas) * 100) || 0;

    setKpis({
      totalComandas,
      ingresos,
      velocidadPromedio,
      satisfaccionEstimada,
    });
  }, [comandas]);

  // Filtrar comandas
  const comandasFiltradas = comandas.filter((c) => {
    if (filtroZona !== 'todas' && c.zona !== filtroZona) return false;
    if (filtroEstado !== 'todas' && c.estado !== filtroEstado) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold">👨‍💼 Dashboard Admin</h1>
        <p className="text-gray-400 mt-2">
          Última actualización: {new Date().toLocaleTimeString('es-AR')}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <KPICard title="Comandas Activas" value={kpis.totalComandas.toString()} icon="📋" />
        <KPICard
          title="Ingresos"
          value={`$${kpis.ingresos.toFixed(2)}`}
          icon="💰"
        />
        <KPICard
          title="Velocidad Promedio"
          value={`${kpis.velocidadPromedio} min`}
          icon="⚡"
        />
        <KPICard
          title="Satisfacción Est."
          value={`${kpis.satisfaccionEstimada}%`}
          icon="⭐"
          color="bg-green-600"
        />
      </div>

      {/* Filtros */}
      <div className="bg-gray-800 rounded-lg p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">🔍 Filtros</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Zona */}
          <div>
            <label className="block text-sm font-medium mb-2">Zona</label>
            <select
              value={filtroZona}
              onChange={(e) => setFiltroZona(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="todas">Todas</option>
              <option value="centro">Centro</option>
              <option value="norte">Norte</option>
              <option value="sur">Sur</option>
            </select>
          </div>

          {/* Estado */}
          <div>
            <label className="block text-sm font-medium mb-2">Estado</label>
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              <option value="todas">Todos</option>
              <option value="nueva">Nueva</option>
              <option value="preparando">Preparando</option>
              <option value="lista">Lista</option>
              <option value="entregada">Entregada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de comandas */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="px-6 py-4 bg-gray-700 border-b border-gray-600">
          <h2 className="text-xl font-bold">📦 Comandas ({comandasFiltradas.length})</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">ID</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Número</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Estado</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Zona</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Items</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Total</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Minutos</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {comandasFiltradas.slice(0, 20).map((cmd) => {
                const minutos = Math.round(
                  (new Date().getTime() - new Date(cmd.created_at).getTime()) / 60000
                );

                return (
                  <tr key={cmd.id} className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 text-sm">{cmd.id.substring(0, 8)}</td>
                    <td className="px-6 py-4 text-sm font-bold">#{cmd.numero}</td>
                    <td className="px-6 py-4 text-sm">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          cmd.estado === 'nueva'
                            ? 'bg-blue-600'
                            : cmd.estado === 'preparando'
                              ? 'bg-yellow-600'
                              : cmd.estado === 'lista'
                                ? 'bg-green-600'
                                : 'bg-gray-600'
                        }`}
                      >
                        {cmd.estado}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">{cmd.zona || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm">{cmd.items_count}</td>
                    <td className="px-6 py-4 text-sm font-semibold">${cmd.total.toFixed(2)}</td>
                    <td className="px-6 py-4 text-sm">{minutos} min</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {comandasFiltradas.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            Sin comandas para mostrar
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Componente: Tarjeta KPI
 */
interface KPICardProps {
  title: string;
  value: string;
  icon: string;
  color?: string;
}

function KPICard({ title, value, icon, color = 'bg-blue-600' }: KPICardProps) {
  return (
    <div className={`${color} rounded-lg p-6 text-white shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90">{title}</p>
          <p className="text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className="text-4xl">{icon}</div>
      </div>
    </div>
  );
}
