/**
 * 🧠 WAHA Service - Cliente directo para WhatsApp
 *
 * Cliente de respaldo para WAHA (WhatsApp HTTP API) en caso de que N8N falle.
 * WAHA permite enviar y recibir mensajes de WhatsApp sin necesidad de intermediarios.
 *
 * Referencias:
 * - WAHA Docs: https://waha.devlike.pro/
 * - GitHub: https://github.com/devlikeapro/whatsapp-http-api
 *
 * Características:
 * - Envío de mensajes de texto
 * - Envío de mensajes con botones
 * - Verificación de estado de sesión
 * - Retry con exponential backoff
 * - Circuit breaker integration
 * - Logging seguro (GDPR compliant)
 */

import { safeLogger } from '../lib/logger';

/**
 * Configuración de WAHA
 */
const WAHA_CONFIG = {
  baseURL: process.env.WAHA_BASE_URL || 'http://localhost:3000',
  apiKey: process.env.WAHA_API_KEY || '',
  defaultSession: process.env.WAHA_DEFAULT_SESSION || 'default',
  timeout: parseInt(process.env.WAHA_TIMEOUT || '30000', 10),
  maxRetries: parseInt(process.env.WAHA_MAX_RETRIES || '3', 10),
};

/**
 * Tipos para WAHA API
 */
export interface WAHAMessage {
  chatId: string;
  text: string;
  session?: string;
}

export interface WAHAMessageWithButtons extends WAHAMessage {
  buttons?: Array<{
    id: string;
    text: string;
  }>;
}

export interface WAHAResponse {
  id: string;
  timestamp: number;
  from: string;
  to: string;
  body: string;
  hasMedia: boolean;
  ack?: number;
}

export interface WAHASessionStatus {
  name: string;
  status: 'WORKING' | 'FAILED' | 'STOPPED' | 'STARTING';
  config: {
    webhooks: string[];
  };
}

/**
 * Circuit Breaker para WAHA
 */
class WAHACircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private isOpen = false;
  private readonly threshold = 5;
  private readonly timeout = 60000; // 60 segundos

  recordSuccess() {
    this.failures = 0;
    this.isOpen = false;
  }

  recordFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.threshold) {
      this.isOpen = true;
      safeLogger.warn('WAHA circuit breaker opened', {
        failures: this.failures,
        threshold: this.threshold,
      });
    }
  }

  canAttempt(): boolean {
    if (!this.isOpen) return true;

    const now = Date.now();
    if (now - this.lastFailureTime > this.timeout) {
      safeLogger.info('WAHA circuit breaker reset after timeout');
      this.isOpen = false;
      this.failures = 0;
      return true;
    }

    return false;
  }

  getState() {
    return {
      isOpen: this.isOpen,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime,
    };
  }
}

const circuitBreaker = new WAHACircuitBreaker();

/**
 * Formatear número de teléfono para WhatsApp
 * Formato: {countryCode}{number}@c.us
 * Ejemplo: +5491112345678 -> 5491112345678@c.us
 */
export function formatPhoneNumber(phone: string): string {
  // Remover caracteres no numéricos
  const cleanPhone = phone.replace(/\D/g, '');

  // Agregar formato WhatsApp
  return `${cleanPhone}@c.us`;
}

/**
 * Exponential backoff con jitter
 */
function calculateBackoff(attempt: number): number {
  const baseDelay = 1000; // 1 segundo
  const maxDelay = 10000; // 10 segundos
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitter = Math.random() * 0.3 * exponentialDelay; // ±30% jitter
  return exponentialDelay + jitter;
}

/**
 * Sleep helper
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * WAHAService - Cliente para WAHA API
 */
export class WAHAService {
  private baseURL: string;
  private apiKey: string;
  private defaultSession: string;
  private timeout: number;
  private maxRetries: number;

  constructor(config = WAHA_CONFIG) {
    this.baseURL = config.baseURL;
    this.apiKey = config.apiKey;
    this.defaultSession = config.defaultSession;
    this.timeout = config.timeout;
    this.maxRetries = config.maxRetries;
  }

  /**
   * Verificar estado de sesión de WhatsApp
   */
  async getSessionStatus(session?: string): Promise<WAHASessionStatus | null> {
    const sessionName = session || this.defaultSession;

    if (!circuitBreaker.canAttempt()) {
      safeLogger.warn('WAHA circuit breaker open - skipping session status check');
      return null;
    }

    try {
      const response = await fetch(
        `${this.baseURL}/api/sessions/${sessionName}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey && { 'X-Api-Key': this.apiKey }),
          },
          signal: AbortSignal.timeout(this.timeout),
        }
      );

      if (!response.ok) {
        throw new Error(`WAHA API error: ${response.status} ${response.statusText}`);
      }

  const data = (await response.json()) as WAHASessionStatus;
      circuitBreaker.recordSuccess();

      safeLogger.info('WAHA session status retrieved', {
        session: sessionName,
        status: data.status,
      });

  return data;
    } catch (error) {
      circuitBreaker.recordFailure();
      safeLogger.error('Failed to get WAHA session status', {
        session: sessionName,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Enviar mensaje de texto simple
   */
  async sendTextMessage(
    to: string,
    text: string,
    session?: string
  ): Promise<WAHAResponse | null> {
    const sessionName = session || this.defaultSession;
    const chatId = formatPhoneNumber(to);

    if (!circuitBreaker.canAttempt()) {
      safeLogger.warn('WAHA circuit breaker open - message not sent', {
        to: chatId,
      });
      return null;
    }

    // Retry con exponential backoff
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const payload: WAHAMessage = {
          chatId,
          text,
          session: sessionName,
        };

        safeLogger.info('Sending WAHA message', {
          chatId,
          textLength: text.length,
          session: sessionName,
          attempt: attempt + 1,
        });

        const response = await fetch(`${this.baseURL}/api/sendText`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.apiKey && { 'X-Api-Key': this.apiKey }),
          },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(this.timeout),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(
            `WAHA API error: ${response.status} ${response.statusText} - ${errorText}`
          );
        }

  const data = (await response.json()) as WAHAResponse;
        circuitBreaker.recordSuccess();

        safeLogger.info('WAHA message sent successfully', {
          messageId: data.id,
          chatId,
        });

        return data;
      } catch (error) {
        const isLastAttempt = attempt === this.maxRetries - 1;
        const errorMessage = error instanceof Error ? error.message : String(error);

        safeLogger.warn('WAHA send message attempt failed', {
          attempt: attempt + 1,
          maxRetries: this.maxRetries,
          error: errorMessage,
          willRetry: !isLastAttempt,
        });

        if (isLastAttempt) {
          circuitBreaker.recordFailure();
          safeLogger.error('WAHA send message failed after all retries', {
            chatId,
            error: errorMessage,
          });
          return null;
        }

        // Esperar antes del siguiente intento
        const backoffDelay = calculateBackoff(attempt);
        await sleep(backoffDelay);
      }
    }

    return null;
  }

  /**
   * Enviar mensaje con botones
   */
  async sendButtonMessage(
    to: string,
    text: string,
    buttons: Array<{ id: string; text: string }>,
    session?: string
  ): Promise<WAHAResponse | null> {
    const sessionName = session || this.defaultSession;
    const chatId = formatPhoneNumber(to);

    if (!circuitBreaker.canAttempt()) {
      safeLogger.warn('WAHA circuit breaker open - button message not sent', {
        to: chatId,
      });
      return null;
    }

    try {
      const payload: WAHAMessageWithButtons = {
        chatId,
        text,
        buttons,
        session: sessionName,
      };

      safeLogger.info('Sending WAHA button message', {
        chatId,
        buttonCount: buttons.length,
        session: sessionName,
      });

      const response = await fetch(`${this.baseURL}/api/sendButtons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey && { 'X-Api-Key': this.apiKey }),
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(this.timeout),
      });

      if (!response.ok) {
        throw new Error(`WAHA API error: ${response.status} ${response.statusText}`);
      }

  const data = (await response.json()) as WAHAResponse;
      circuitBreaker.recordSuccess();

      safeLogger.info('WAHA button message sent successfully', {
        messageId: data.id,
        chatId,
      });

      return data;
    } catch (error) {
      circuitBreaker.recordFailure();
      safeLogger.error('Failed to send WAHA button message', {
        chatId,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Verificar disponibilidad de WAHA
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5 segundos para health check
      });

      const isHealthy = response.ok;

      if (isHealthy) {
        safeLogger.info('WAHA health check passed');
      } else {
        safeLogger.warn('WAHA health check failed', {
          status: response.status,
        });
      }

      return isHealthy;
    } catch (error) {
      safeLogger.error('WAHA health check error', {
        error: error instanceof Error ? error.message : String(error),
      });
      return false;
    }
  }

  /**
   * Obtener estado del circuit breaker
   */
  getCircuitBreakerState() {
    return circuitBreaker.getState();
  }
}

/**
 * Instancia singleton del servicio WAHA
 */
export const wahaService = new WAHAService();

/**
 * Helper function: Enviar mensaje con fallback a N8N
 *
 * Intenta enviar vía WAHA primero. Si falla, puede usar N8N como fallback.
 */
export async function sendWhatsAppMessage(
  to: string,
  text: string,
  options?: {
    useWAHA?: boolean;
    useN8N?: boolean;
    buttons?: Array<{ id: string; text: string }>;
  }
): Promise<boolean> {
  const { useWAHA = true, useN8N = true, buttons } = options || {};

  // Intento 1: WAHA
  if (useWAHA) {
    safeLogger.info('Attempting to send WhatsApp message via WAHA', {
      to,
      hasButtons: !!buttons,
    });

    const result = buttons
      ? await wahaService.sendButtonMessage(to, text, buttons)
      : await wahaService.sendTextMessage(to, text);

    if (result) {
      safeLogger.info('WhatsApp message sent successfully via WAHA');
      return true;
    }

    safeLogger.warn('WAHA send failed, will try fallback methods');
  }

  // Intento 2: N8N (fallback)
  if (useN8N) {
    safeLogger.info('Attempting to send WhatsApp message via N8N fallback');

    // TODO: Implementar llamada a N8N webhook como fallback
    // const n8nResult = await sendViaN8N(to, text);
    // return n8nResult;

    safeLogger.warn('N8N fallback not yet implemented');
  }

  safeLogger.error('All WhatsApp send methods failed', { to });
  return false;
}
