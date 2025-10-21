/**
 * Utilidades de Tiempo y Formato (Prompt 24)
 * - Validaciones de horario laboral
 * - Conversiones de tiempo
 */

/**
 * Validar si es horario laboral (18:00 - 01:00)
 */
export function esHorarioLaboral(now = new Date()): boolean {
  const horas = now.getHours();
  const minutos = now.getMinutes();
  const hora = horas + minutos / 60;

  // Horario: 18:00 - 01:00 (1 AM)
  return hora >= 18 || hora < 1;
}

/**
 * Obtener minutos desde creation
 */
export function calcularMinutosDesde(createdAt: string): number {
  const ahora = new Date();
  const creacion = new Date(createdAt);
  const diferencia = ahora.getTime() - creacion.getTime();
  return Math.floor(diferencia / (1000 * 60));
}

/**
 * Obtener color basado en tiempo transcurrido y estado
 */
export function getColorPorTiempo(
  minutos: number,
  estado: 'nueva' | 'preparando' | 'lista' | 'entregada' | 'cancelada'
): string {
  // Tiempos máximos por estado (en minutos)
  const maxTiempo: Record<string, number> = {
    nueva: 5,
    preparando: 45,
    lista: 10,
    entregada: 60,
    cancelada: 60,
  };

  const max = maxTiempo[estado] || 60;
  const porcentaje = (minutos / max) * 100;

  if (porcentaje < 33) return 'bg-blue-100 border-blue-300'; // Fresco
  if (porcentaje < 66) return 'bg-yellow-100 border-yellow-300'; // Medio
  if (porcentaje < 85) return 'bg-orange-100 border-orange-300'; // Urgente
  return 'bg-red-100 border-red-300'; // Crítico
}

/**
 * Obtener urgencia (para UI alerts y sonidos)
 * - prioridad: 'express' reduce tiempos a la mitad
 */
export function getUrgencia(
  minutos: number,
  prioridad: 'normal' | 'express' = 'normal'
): 'baja' | 'media' | 'alta' | 'crítica' {
  // Express reduce tiempos límite a la mitad
  const factor = prioridad === 'express' ? 0.5 : 1;

  if (minutos < 15 * factor) return 'baja';
  if (minutos < 30 * factor) return 'media';
  if (minutos < 45 * factor) return 'alta';
  return 'crítica';
}

/**
 * Formatear tiempo para mostrar
 */
export function formatearTiempo(minutos: number): string {
  if (minutos < 1) return 'Hace poco';
  if (minutos < 60) return `${minutos} min`;

  const horas = Math.floor(minutos / 60);
  const mins = minutos % 60;

  return `${horas}h ${mins}m`;
}

/**
 * Próxima transición (estimada)
 */
export function proximaTransicion(minutosDesde: number, estimado: number): string {
  const minutosFaltantes = estimado - minutosDesde;

  if (minutosFaltantes <= 0) return 'Ya está listo';
  if (minutosFaltantes <= 2) return 'Casi listo';

  return `${minutosFaltantes} min aprox`;
}
