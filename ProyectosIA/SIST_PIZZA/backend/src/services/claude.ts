/**
 * 🧠 INSTRUCCIONES PARA GITHUB COPILOT:
 * Cliente Anthropic Claude API (Prompt 8)
 * - Redactar TODOS los datos PII antes de enviar
 * - Limitar tokens por sesión ($0.10 USD ≈ 6.6K tokens)
 * - Rate limiting automático
 * - Context para diferentes flujos
 */

import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { safeLogger } from '../lib/logger';

/**
 * Tipos de flujo soportados
 */
export enum FlujoClaude {
  RECEPCION_INICIAL = 'recepcion_inicial',
  TOMA_PEDIDO = 'toma_pedido',
  CONFIRMACION = 'confirmacion',
  RESPUESTA_GENERICA = 'respuesta_generica',
}

/**
 * Contexto seguro para Claude (sin PII)
 */
export interface ContextoClaude {
  cliente_tipo: 'nuevo' | 'vip' | 'recurrente'; // No enviar nombre
  pedidos_previos_count: number;
  zona: 'centro' | 'norte' | 'sur' | 'fuera_cobertura'; // Zona, no dirección completa
  hora_actual: string; // HH:MM
  es_horario_laboral: boolean;
}

/**
 * Prompts del sistema por flujo
 */
const SYSTEM_PROMPTS: Record<FlujoClaude, string> = {
  [FlujoClaude.RECEPCION_INICIAL]: `Eres un asistente de atención al cliente de una pizzería en Necochea, Argentina.
- Bienvenida breve y amable
- Pregunta qué necesita (pedido nuevo, consulta de pedido, etc.)
- Si es fuera de horario, informa que mañana atendemos a partir de las 18:00 hs
- Sé conciso (máx 2 líneas)`,

  [FlujoClaude.TOMA_PEDIDO]: `Eres un asistente tomador de pedidos.
- Confirma items disponibles del menú
- Valida zona de entrega si es delivery
- Calcula total
- Propone métodos de pago (efectivo, tarjeta, MercadoPago)
- Sé profesional y eficiente`,

  [FlujoClaude.CONFIRMACION]: `Eres un asistente de confirmación de pedidos.
- Resume el pedido (items, total, forma de entrega)
- Confirma horario estimado
- Pide confirmación final
- Sé breve y claro`,

  [FlujoClaude.RESPUESTA_GENERICA]: `Eres un asistente de pizzería amable.
- Responde preguntas sobre menú, horarios, zonas de entrega
- Si la pregunta es fuera de alcance, ofrece hablar con un operador
- Sé conciso`,
};

/**
 * Cliente Anthropic singleton
 */
let claudeClient: Anthropic | null = null;

export function getClaudeClient(): Anthropic {
  if (!claudeClient) {
    // Verificar si Claude está habilitado y configurado
    if (!config.claude?.apiKey || !config.claude.apiKey.startsWith('sk-ant-')) {
      throw new Error('ANTHROPIC_API_KEY configuration missing or invalid');
    }

    claudeClient = new Anthropic({
      apiKey: config.claude.apiKey,
    });

    safeLogger.info('Claude client initialized', { model: config.claude.model });
  }

  return claudeClient;
}

/**
 * Llamar a Claude con contexto seguro
 */
export async function llamarClaude(
  userMessage: string,
  flujo: FlujoClaude,
  contexto: ContextoClaude,
  options?: {
    maxTokens?: number;
  }
): Promise<string> {
  try {
    const client = getClaudeClient();
    const maxTokens = options?.maxTokens || 500;

    // Validar límite de tokens por sesión (usar valor por defecto si no está configurado)
    const maxTokensPerSession = config.claude?.maxTokensPerSession || 6600;
    if (maxTokens > maxTokensPerSession) {
      safeLogger.warn('Token limit exceeded for session', {
        requested: maxTokens,
        limit: maxTokensPerSession,
      });

      return 'Lo siento, hubo un error en el procesamiento. Por favor, reintentar.';
    }

    // Log seguro (sin PII)
    safeLogger.info('Calling Claude API', {
      flujo,
      cliente_tipo: contexto.cliente_tipo,
      zona: contexto.zona,
      maxTokens,
    });

    const model = config.claude?.model || 'claude-3-5-sonnet-20241022';
    const message = await (client as any).messages.create({
      model,
      max_tokens: maxTokens,
      system: SYSTEM_PROMPTS[flujo],
      messages: [
        {
          role: 'user' as const,
          content: `[CONTEXTO]
Cliente: ${contexto.cliente_tipo} (${contexto.pedidos_previos_count} pedidos anteriores)
Zona: ${contexto.zona}
Hora: ${contexto.hora_actual}
Horario laboral: ${contexto.es_horario_laboral ? 'Sí' : 'No'}

[MENSAJE]
${userMessage}`,
        },
      ],
    });

    // Extraer respuesta
    const response = message.content[0];
    if ((response as any).type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    safeLogger.info('Claude API response received', {
      flujo,
      inputTokens: (message as any).usage.input_tokens,
      outputTokens: (message as any).usage.output_tokens,
    });

    return (response as any).text;
  } catch (error) {
    safeLogger.error('Claude API error', {
      error: error instanceof Error ? error.message : String(error),
      flujo,
    });

    // Respuesta degradada
    return 'Lo siento, no puedo procesar tu solicitud en este momento. ¿Deseas hablar con un operador?';
  }
}

/**
 * Detectar intención del usuario (simple)
 */
export function detectarIntencion(mensaje: string): FlujoClaude {
  const lower = mensaje.toLowerCase();

  if (
    lower.includes('mi pedido') ||
    lower.includes('estado') ||
    lower.includes('cuándo')
  ) {
    return FlujoClaude.CONFIRMACION;
  }

  if (
    lower.includes('quiero') ||
    lower.includes('pizza') ||
    lower.includes('empanada') ||
    lower.includes('pedir')
  ) {
    return FlujoClaude.TOMA_PEDIDO;
  }

  if (
    lower.includes('horario') ||
    lower.includes('menu') ||
    lower.includes('zona') ||
    lower.includes('precio')
  ) {
    return FlujoClaude.RESPUESTA_GENERICA;
  }

  return FlujoClaude.RESPUESTA_GENERICA;
}

/**
 * Función helper: determinar zona desde dirección (simple)
 */
export function determinarZona(direccion: string): ContextoClaude['zona'] {
  // En producción, usar geolocalización o tabla de zonas
  const lower = direccion.toLowerCase();

  if (
    lower.includes('centro') ||
    lower.includes('av. 79') ||
    lower.includes('calle 61')
  ) {
    return 'centro';
  }

  if (lower.includes('norte') || lower.includes('av. 80')) {
    return 'norte';
  }

  if (lower.includes('sur') || lower.includes('calle 58')) {
    return 'sur';
  }

  return 'fuera_cobertura';
}

/**
 * Función helper: validar horario laboral
 */
export function esHorarioLaboral(now = new Date()): boolean {
  const horas = now.getHours();
  const minutos = now.getMinutes();
  const hora = horas + minutos / 60;

  // Horario: 18:00 - 01:00 (1 AM)
  return hora >= 18 || hora < 1;
}
