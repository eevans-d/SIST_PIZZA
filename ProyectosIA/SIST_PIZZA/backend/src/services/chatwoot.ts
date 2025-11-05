/**
 * 🧠 INSTRUCCIONES PARA GITHUB COPILOT:
 * Cliente Chatwoot API (Prompt 10)
 * - Rate limiting (10 req/min)
 * - Retry automático
 * - Queue interna
 * - Nunca exponer PII en mensajes públicos
 */

import { safeLogger } from '../lib/logger';

/**
 * Configuración Chatwoot
 */
const CHATWOOT_CONFIG = {
  baseURL: process.env.CHATWOOT_BASE_URL || 'https://chat.example.com',
  accountId: process.env.CHATWOOT_ACCOUNT_ID || '',
  apiKey: process.env.CHATWOOT_API_KEY || '',
};

/**
 * Rate limiter simple
 */
class SimpleRateLimiter {
  private tokens = 0;
  private readonly maxTokens = 10;
  private readonly refillRate = 10 / 60; // 10 req/min
  private lastRefill = Date.now();

  canConsume(): boolean {
    const now = Date.now();
    const timePassed = (now - this.lastRefill) / 1000; // segundos
    const newTokens = timePassed * this.refillRate;

    this.tokens = Math.min(this.maxTokens, this.tokens + newTokens);
    this.lastRefill = now;

    if (this.tokens >= 1) {
      this.tokens -= 1;
      return true;
    }

    return false;
  }

  getWaitTime(): number {
    return Math.ceil((1 - this.tokens) / this.refillRate);
  }
}

/**
 * Cola de mensajes con retry
 */
interface QueuedMessage {
  id: string;
  conversationId: string;
  message: string;
  retries: number;
  maxRetries: number;
  createdAt: number;
}

/**
 * Tipos Chatwoot
 */
export interface ChatwootConversation {
  id: number;
  external_id?: string;
  contact_id: number;
  account_id: number;
  status: 'open' | 'resolved' | 'pending' | 'snoozed';
  created_at: string;
  updated_at: string;
}

export interface ChatwootMessage {
  id: number;
  conversation_id: number;
  account_id: number;
  content: string;
  message_type: 0 | 1; // 0 = incoming, 1 = outgoing
  created_at: string;
}

/**
 * Servicio Chatwoot
 */
export class ChatwootService {
  private rateLimiter = new SimpleRateLimiter();
  private messageQueue: QueuedMessage[] = [];
  private isProcessing = false;

  async crearConversacion(
    clienteTelefono: string,
    clienteNombre: string
  ): Promise<ChatwootConversation | null> {
    if (!this.rateLimiter.canConsume()) {
      const waitTime = this.rateLimiter.getWaitTime();
      safeLogger.warn('Chatwoot rate limit - queuing', { waitTime });

      // Queue para después
      this.enqueueConversation(clienteTelefono, clienteNombre);
      return null;
    }

    try {
      safeLogger.info('Creating Chatwoot conversation', {
        telefonoUltimos4: `***${clienteTelefono.slice(-4)}`,
      });

      // Simular llamada a API
      // En producción: fetch() con Authorization header
      const conversacion: ChatwootConversation = {
        id: Math.floor(Math.random() * 1000000),
        external_id: clienteTelefono,
        contact_id: Math.floor(Math.random() * 1000000),
        account_id: parseInt(CHATWOOT_CONFIG.accountId, 10),
        status: 'open',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return conversacion;
    } catch (error) {
      safeLogger.error('Chatwoot API error', {
        error: error instanceof Error ? error.message : String(error),
      });

      // Queue para retry
      this.enqueueConversation(clienteTelefono, clienteNombre);
      return null;
    }
  }

  async enviarMensaje(
    conversationId: number,
    mensaje: string
  ): Promise<ChatwootMessage | null> {
    if (!this.rateLimiter.canConsume()) {
      safeLogger.info('Chatwoot rate limit - queuing message', {
        conversationId,
      });

      this.enqueueMessage(conversationId, mensaje);
      return null;
    }

    try {
      safeLogger.info('Sending Chatwoot message', {
        conversationId,
        messageLength: mensaje.length,
      });

      // Simular llamada a API
      const msg: ChatwootMessage = {
        id: Math.floor(Math.random() * 1000000),
        conversation_id: conversationId,
        account_id: parseInt(CHATWOOT_CONFIG.accountId, 10),
        content: mensaje,
        message_type: 1, // outgoing
        created_at: new Date().toISOString(),
      };

      return msg;
    } catch (error) {
      safeLogger.error('Chatwoot send error', {
        error: error instanceof Error ? error.message : String(error),
        conversationId,
      });

      this.enqueueMessage(conversationId, mensaje);
      return null;
    }
  }

  /**
   * Encolar mensaje para procesar con retry
   */
  private enqueueMessage(conversationId: number, mensaje: string): void {
    const queued: QueuedMessage = {
      id: `msg-${Date.now()}-${Math.random()}`,
      conversationId: conversationId.toString(),
      message: mensaje,
      retries: 0,
      maxRetries: 3,
      createdAt: Date.now(),
    };

    this.messageQueue.push(queued);
    safeLogger.info('Message queued', {
      queueSize: this.messageQueue.length,
      messageId: queued.id,
    });

    // Procesar queue
    this.processQueue();
  }

  /**
   * Encolar conversación (fallback)
   */
  private enqueueConversation(
    clienteTelefono: string,
    _clienteNombre: string
  ): void {
    safeLogger.info('Conversation queued for retry', {
      telefonoUltimos4: `***${clienteTelefono.slice(-4)}`,
    });

    // En producción, guardar en DB para retry automático
  }

  /**
   * Procesar cola de mensajes
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.messageQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.messageQueue.length > 0) {
      const queued = this.messageQueue[0];

      // Skip si es muy antiguo (>1 hora)
      if (Date.now() - queued.createdAt > 3600000) {
        this.messageQueue.shift();
        safeLogger.warn('Queued message expired', { messageId: queued.id });
        continue;
      }

      // Intentar enviar
      const result = await this.enviarMensaje(
        parseInt(queued.conversationId, 10),
        queued.message
      );

      if (result) {
        // Éxito: remover de queue
        this.messageQueue.shift();
        safeLogger.info('Queued message sent', { messageId: queued.id });
      } else {
        // Falló: incrementar retries
        queued.retries++;

        if (queued.retries >= queued.maxRetries) {
          this.messageQueue.shift();
          safeLogger.error('Message retry limit exceeded', {
            messageId: queued.id,
            retries: queued.retries,
          });
        } else {
          // Esperar antes de reintentar
          await new Promise((resolve) => setTimeout(resolve, 5000));
        }
      }
    }

    this.isProcessing = false;
  }
}

/**
 * Instancia singleton
 */
export const chatwootService = new ChatwootService();
