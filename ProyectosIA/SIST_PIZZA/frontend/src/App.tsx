/**
 * Componente Principal: App.tsx
 * - Orquesta realtime, header, dashboard, modal
 * - Maneja estado global
 */

import { useEffect, useState } from 'react';
import { useRealtimeComandas } from './hooks/useRealtimeComandas';
import { useComandasStore } from './store/comandas';
import { HeaderDashboard } from './components/HeaderDashboard';
import { Comandas } from './pages/Comandas';
import { ConfigModal } from './components/ConfigModal';
import { soundSystem } from './lib/soundSystem';

function App() {
  const { loading, error, isConnected } = useRealtimeComandas();
  const { comandas } = useComandasStore();
  const [showConfig, setShowConfig] = useState(false);

  // Escuchar nuevas comandas para reproducir sonido
  useEffect(() => {
    if (comandas.length === 0) return;

    const ultimaComanda = comandas[0];
    const now = new Date().getTime();
    const createdAt = new Date(ultimaComanda.created_at).getTime();

    // Si fue creada hace menos de 2 segundos, es nueva
    if (now - createdAt < 2000) {
      console.log('[APP] Nueva comanda detectada:', ultimaComanda.id);
      soundSystem.play('alta');
    }
  }, [comandas]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="text-center">
          <div className="text-6xl mb-4">🍕</div>
          <p className="text-2xl font-bold text-gray-700">SIST_PIZZA</p>
          <p className="text-gray-600 mt-2">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <HeaderDashboard
        isConnected={isConnected}
        comandasTotal={comandas.length}
        onSettingsClick={() => setShowConfig(true)}
      />

      {/* Error banner si hay desconexión */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3">
          ⚠️ Error: {error.message}
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        <Comandas comandas={comandas} />
      </main>

      {/* Config modal */}
      <ConfigModal isOpen={showConfig} onClose={() => setShowConfig(false)} />
    </div>
  );
}

export default App;
