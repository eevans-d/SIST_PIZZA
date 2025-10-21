/**
 * Componente: Modal de Configuración (Prompt 22)
 * - Volumen de sonidos
 * - Habilitar/deshabilitar alertas
 * - Test de sonido
 * - Preferencias personales
 */

import { useState } from 'react';
import { soundSystem, requestNotificationPermission } from '../lib/soundSystem';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ConfigModal({ isOpen, onClose }: ConfigModalProps) {
  const [volume, setVolume] = useState(70);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    soundSystem.setVolume(newVolume / 100);
  };

  const handleSoundToggle = () => {
    const newEnabled = !soundEnabled;
    setSoundEnabled(newEnabled);
    soundSystem.setEnabled(newEnabled);
  };

  const handleNotificationsToggle = async () => {
    if (!notificationsEnabled) {
      const granted = await requestNotificationPermission();
      setNotificationsEnabled(granted);
    } else {
      setNotificationsEnabled(false);
    }
  };

  const handlePlayTest = () => {
    console.log('[CONFIG] Reproduciendo test de sonidos...');
    soundSystem.playTest();
  };

  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    // Aplicar cambio global
    document.documentElement.classList.toggle('dark', newTheme === 'dark');
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl z-50 w-96 max-h-96 overflow-y-auto">
        {/* Header */}
        <div className="bg-red-600 text-white px-6 py-4 flex items-center justify-between sticky top-0">
          <h2 className="text-xl font-bold">⚙️ Configuración</h2>
          <button
            onClick={onClose}
            className="text-2xl hover:text-red-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-6 space-y-6">
          {/* Sección: Sonidos */}
          <div className="border-b pb-6">
            <h3 className="font-bold text-lg mb-4 text-gray-900">🔊 Sonidos y Alertas</h3>

            {/* Toggle de habilitación */}
            <div className="flex items-center justify-between mb-4">
              <label className="text-gray-700 font-medium">Habilitar sonidos</label>
              <button
                onClick={handleSoundToggle}
                className={`relative inline-flex h-8 w-14 rounded-full transition-colors ${
                  soundEnabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform mt-1 ${
                    soundEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Slider de volumen */}
            {soundEnabled && (
              <div className="space-y-2">
                <label className="text-gray-700 font-medium block">
                  Volumen: {volume}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            )}

            {/* Botón de test */}
            {soundEnabled && (
              <button
                onClick={handlePlayTest}
                className="mt-4 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg font-medium transition-colors"
              >
                🎵 Reproducir Test
              </button>
            )}
          </div>

          {/* Sección: Notificaciones */}
          <div className="border-b pb-6">
            <h3 className="font-bold text-lg mb-4 text-gray-900">🔔 Notificaciones</h3>

            <div className="flex items-center justify-between">
              <label className="text-gray-700 font-medium">Notificaciones del sistema</label>
              <button
                onClick={handleNotificationsToggle}
                className={`relative inline-flex h-8 w-14 rounded-full transition-colors ${
                  notificationsEnabled ? 'bg-green-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform mt-1 ${
                    notificationsEnabled ? 'translate-x-7' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Recibe alertas incluso cuando el navegador está en segundo plano
            </p>
          </div>

          {/* Sección: Tema */}
          <div>
            <h3 className="font-bold text-lg mb-4 text-gray-900">🎨 Tema</h3>

            <div className="flex gap-3">
              <button
                onClick={() => handleThemeChange('light')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  theme === 'light'
                    ? 'bg-yellow-400 text-gray-900'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                ☀️ Claro
              </button>
              <button
                onClick={() => handleThemeChange('dark')}
                className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-800 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                🌙 Oscuro
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex gap-3 border-t sticky bottom-0">
          <button
            onClick={onClose}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-900 py-2 rounded-lg font-medium transition-colors"
          >
            Cerrar
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg font-medium transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </>
  );
}
