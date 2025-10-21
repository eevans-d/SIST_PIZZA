/**
 * Sistema de Alertas Sonoras (Prompt 23)
 * - Reproducir sonidos por urgencia
 * - Respetar horario laboral (18:00 - 01:00)
 * - Configuración por usuario
 */

import { esHorarioLaboral } from './timeUtils';

/**
 * Niveles de urgencia con sonidos asociados
 */
export type NivelUrgencia = 'baja' | 'media' | 'alta' | 'crítica';

interface SoundConfig {
  enabled: boolean;
  volume: number; // 0-1
  mute?: boolean;
}

/**
 * Sonidos disponibles
 */
const SOUNDS = {
  baja: '🔕', // Silencio
  media: '🔔', // Ding
  alta: '📢', // Alarma
  crítica: '🚨', // Urgente
};

export class SoundSystem {
  private enabled: boolean = true;
  private volume: number = 0.7;

  constructor(config: Partial<SoundConfig> = {}) {
    this.enabled = config.enabled ?? true;
    this.volume = config.volume ?? 0.7;
  }

  /**
   * Reproducir sonido por urgencia
   */
  play(urgencia: NivelUrgencia): void {
    // No reproducir fuera de horario
    if (!esHorarioLaboral()) {
      console.log('[SOUND] Fuera de horario laboral, sonido silenciado');
      return;
    }

    if (!this.enabled) {
      console.log('[SOUND] Sonidos deshabilitados');
      return;
    }

    console.log(`[SOUND] Reproduciendo: ${SOUNDS[urgencia]} (${urgencia})`);

    switch (urgencia) {
      case 'baja':
        this.playLowBeep();
        break;
      case 'media':
        this.playMediumBeep();
        break;
      case 'alta':
        this.playHighBeep();
        break;
      case 'crítica':
        this.playCriticalAlert();
        break;
    }
  }

  /**
   * Beep bajo (media baja)
   */
  private playLowBeep(): void {
    this.playTone(440, 100); // La - 100ms
  }

  /**
   * Beep medio
   */
  private playMediumBeep(): void {
    this.playTone(660, 150); // Mi - 150ms
  }

  /**
   * Beep alto (dos tonos)
   */
  private playHighBeep(): void {
    this.playTone(880, 100); // La2 - 100ms
    setTimeout(() => this.playTone(880, 100), 150);
  }

  /**
   * Alerta crítica (ding-dong repetido)
   */
  private playCriticalAlert(): void {
    this.playTone(880, 200);
    setTimeout(() => this.playTone(660, 200), 250);
    setTimeout(() => this.playTone(880, 200), 500);
  }

  /**
   * Reproducir tono con Web Audio API
   */
  private playTone(frequency: number, duration: number): void {
    try {
      // Usar Web Audio API si está disponible
      if ('AudioContext' in window || 'webkitAudioContext' in window) {
        const AudioContextClass = (window as any).AudioContext || (window as any).webkitAudioContext;

        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.frequency.value = frequency;
        gain.gain.setValueAtTime(this.volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + duration / 1000);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration / 1000);
      } else {
        // Fallback: usar Notification API
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('SIST_PIZZA', {
            body: 'Nueva comanda',
            icon: '/icon-192.png',
          });
        }
      }
    } catch (error) {
      console.warn('Error reproduciendo sonido:', error);
    }
  }

  /**
   * Cambiar estado habilitación
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Cambiar volumen
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  /**
   * Reproducir sonido de prueba
   */
  playTest(): void {
    console.log('[SOUND] Test: Reproduciendo tonos...');
    this.playLowBeep();
    setTimeout(() => this.playMediumBeep(), 300);
    setTimeout(() => this.playHighBeep(), 600);
    setTimeout(() => this.playCriticalAlert(), 900);
  }
}

/**
 * Instancia singleton
 */
export const soundSystem = new SoundSystem({
  enabled: true,
  volume: 0.7,
});

/**
 * Solicitar permisos para notificaciones
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    console.warn('Navegador no soporta Notifications API');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  return false;
}
