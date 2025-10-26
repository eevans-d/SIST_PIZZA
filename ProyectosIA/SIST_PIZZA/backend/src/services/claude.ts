/**
 * 🧠 INSTRUCCIONES PARA GITHUB COPILOT:
 * Cliente Anthropic Claude API (Prompt 8)
 * - Redactar TODOS los datos PII antes de enviar
 * - Limitar tokens por sesión ($0.10 USD ≈ 6.6K tokens)
 * - Rate limiting automático
 * - Context para diferentes flujos
 * - Resiliencia: Retry con backoff exponencial + jitter
 * - Circuit breaker: Bloquear llamadas después de múltiples fallos
 * - Timeout: 30 segundos por request
 */

import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config';
import { safeLogger } from '../lib/logger';
import { getCachedResponse, setCachedResponse } from './claude-cache';
import {
  claudeAPIRequests,
  claudeAPIErrors,
  claudeCircuitBreakerState,
  claudeCircuitBreakerFailures,
  claudeTokensUsed,
  claudeRequestDuration,
} from './metrics';

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
 * Circuit breaker state para Claude API
 */
let circuitBreakerState: {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
} = {
  failures: 0,
  lastFailureTime: 0,
  isOpen: false,
};

const CIRCUIT_BREAKER_THRESHOLD = 5; // Abrir después de 5 fallos
const CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minuto
const REQUEST_TIMEOUT = 30000; // 30 segundos
const MAX_RETRIES = 3;
const INITIAL_BACKOFF = 1000; // 1 segundo

/**
 * Función helper: esperar con timeout
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Función helper: calcular backoff exponencial con jitter
 */
function calculateBackoff(attempt: number): number {
  const exponential = INITIAL_BACKOFF * Math.pow(2, attempt);
  const jitter = Math.random() * 1000; // 0-1000ms de jitter
  return Math.min(exponential + jitter, 10000); // Max 10 segundos
}

/**
 * Función helper: reset circuit breaker si ha pasado suficiente tiempo
 */
function checkCircuitBreaker(): void {
  const now = Date.now();
  if (circuitBreakerState.isOpen) {
    if (now - circuitBreakerState.lastFailureTime > CIRCUIT_BREAKER_TIMEOUT) {
      safeLogger.info('Circuit breaker reset');
      circuitBreakerState.failures = 0;
      circuitBreakerState.isOpen = false;
    }
  }
}

/**
 * Función helper: registrar fallo del circuit breaker
 */
function recordFailure(): void {
  circuitBreakerState.failures++;
  circuitBreakerState.lastFailureTime = Date.now();
  
  // Actualizar métricas
  claudeCircuitBreakerFailures.set(circuitBreakerState.failures);
  
  if (circuitBreakerState.failures >= CIRCUIT_BREAKER_THRESHOLD) {
    circuitBreakerState.isOpen = true;
    claudeCircuitBreakerState.set(1);
    safeLogger.error('Circuit breaker opened', {
      failures: circuitBreakerState.failures,
    });
  }
}

/**
 * Función helper: registrar éxito del circuit breaker
 */
function recordSuccess(): void {
  if (circuitBreakerState.failures > 0) {
    circuitBreakerState.failures = Math.max(0, circuitBreakerState.failures - 1);
    claudeCircuitBreakerFailures.set(circuitBreakerState.failures);
  }
  
  // Si el circuit breaker estaba abierto, cerrarlo
  if (circuitBreakerState.isOpen) {
    circuitBreakerState.isOpen = false;
    claudeCircuitBreakerState.set(0);
    safeLogger.info('Circuit breaker closed after successful request');
  }
}

/**
 * Llamar a Claude con contexto seguro, resiliencia y circuit breaker
 */
export async function llamarClaude(
  userMessage: string,
  flujo: FlujoClaude,
  contexto: ContextoClaude,
  options?: {
    maxTokens?: number;
    timeout?: number;
  }
): Promise<string> {
  // 1. Verificar cache primero
  const cachedResponse = await getCachedResponse(userMessage, flujo, contexto);
  if (cachedResponse) {
    return cachedResponse;
  }

  // 2. Verificar circuit breaker
  checkCircuitBreaker();
  if (circuitBreakerState.isOpen) {
    safeLogger.warn('Circuit breaker is open, rejecting request');
    return 'El servicio de IA está temporalmente no disponible. Por favor, intenta nuevamente en unos minutos o habla con un operador.';
  }

  const maxTokens = options?.maxTokens || 500;
  const timeout = options?.timeout || REQUEST_TIMEOUT;

  // Validar límite de tokens por sesión
  const maxTokensPerSession = config.claude?.maxTokensPerSession || 6600;
  if (maxTokens > maxTokensPerSession) {
    safeLogger.warn('Token limit exceeded for session', {
      requested: maxTokens,
      limit: maxTokensPerSession,
    });
    return 'Lo siento, la solicitud excede el límite de tokens permitido. Por favor, simplifica tu consulta.';
  }

  // Retry con backoff exponencial
  let lastError: Error | null = null;
  const startTime = Date.now();
  
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      // Log solo en primer intento
      if (attempt === 0) {
        safeLogger.info('Calling Claude API', {
          flujo,
          cliente_tipo: contexto.cliente_tipo,
          zona: contexto.zona,
          maxTokens,
          timeout,
        });
      } else {
        safeLogger.warn('Retrying Claude API', { attempt: attempt + 1 });
      }

      const client = getClaudeClient();
      const model = config.claude?.model || 'claude-3-5-sonnet-20241022';

      // Crear AbortController para timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), timeout);

      try {
        const message = await (client as any).messages.create(
          {
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
          },
          {
            signal: abortController.signal,
          }
        );

        clearTimeout(timeoutId);

        // Extraer respuesta
        const response = message.content[0];
        if ((response as any).type !== 'text') {
          throw new Error('Unexpected response type from Claude');
        }

        const inputTokens = (message as any).usage.input_tokens;
        const outputTokens = (message as any).usage.output_tokens;
        const duration = (Date.now() - startTime) / 1000;

        safeLogger.info('Claude API response received', {
          flujo,
          inputTokens,
          outputTokens,
          attempt: attempt + 1,
          duration,
        });

        // Actualizar métricas
        claudeAPIRequests.inc({ flujo, status: 'success' });
        claudeTokensUsed.inc({ type: 'input' }, inputTokens);
        claudeTokensUsed.inc({ type: 'output' }, outputTokens);
        claudeRequestDuration.observe({ flujo }, duration);

        // Éxito: registrar, cachear y retornar
        recordSuccess();
        const responseText = (response as any).text;
        
        // Cachear respuesta (1 hora TTL)
        await setCachedResponse(userMessage, flujo, contexto, responseText, 3600);
        
        return responseText;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Verificar si es un error recuperable
      const isRecoverable =
        lastError.message.includes('timeout') ||
        lastError.message.includes('ECONNRESET') ||
        lastError.message.includes('ETIMEDOUT') ||
        lastError.message.includes('rate_limit') ||
        lastError.message.includes('overloaded');

      if (!isRecoverable || attempt === MAX_RETRIES - 1) {
        // Error no recuperable o último intento
        safeLogger.error('Claude API error (not retrying)', {
          error: lastError.message,
          flujo,
          attempt: attempt + 1,
        });
        
        // Actualizar métricas de error
        claudeAPIRequests.inc({ flujo, status: 'error' });
        claudeAPIErrors.inc({
          flujo,
          error_type: isRecoverable ? 'timeout' : 'api_error',
        });
        
        recordFailure();
        break;
      }

      // Esperar con backoff exponencial + jitter
      const backoffMs = calculateBackoff(attempt);
      safeLogger.warn('Claude API error (retrying)', {
        error: lastError.message,
        attempt: attempt + 1,
        backoffMs,
      });
      await sleep(backoffMs);
    }
  }

  // Todos los intentos fallaron
  safeLogger.error('Claude API failed after all retries', {
    error: lastError?.message,
    flujo,
    retries: MAX_RETRIES,
  });

  // Respuesta degradada
  return 'Lo siento, no puedo procesar tu solicitud en este momento debido a problemas técnicos. ¿Deseas hablar con un operador?';
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
