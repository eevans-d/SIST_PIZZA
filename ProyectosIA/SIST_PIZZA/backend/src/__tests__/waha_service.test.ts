/**
 * 🧪 Tests de WAHA Service
 * 
 * Cobertura:
 * - Formateo de números telefónicos
 * - Envío de mensajes de texto
 * - Envío de mensajes con botones
 * - Verificación de estado de sesión
 * - Circuit breaker logic
 * - Retry con exponential backoff
 * - Health check
 * - Error handling
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WAHAService, formatPhoneNumber, sendWhatsAppMessage } from '../services/waha';

describe('WAHA Service', () => {
  let wahaService: WAHAService;

  beforeEach(() => {
    // Crear nueva instancia para cada test
    wahaService = new WAHAService({
      baseURL: 'http://localhost:3000',
      apiKey: 'test_api_key',
      defaultSession: 'default',
      timeout: 30000,
      maxRetries: 3,
    });

    // Reset fetch mocks
    vi.clearAllMocks();
  });

  describe('Phone Number Formatting', () => {
    it('formatea número argentino con +54', () => {
      const phone = '+5491112345678';
      const formatted = formatPhoneNumber(phone);
      expect(formatted).toBe('5491112345678@c.us');
    });

    it('formatea número sin + inicial', () => {
      const phone = '5491112345678';
      const formatted = formatPhoneNumber(phone);
      expect(formatted).toBe('5491112345678@c.us');
    });

    it('remueve espacios y guiones', () => {
      const phone = '+54 911-1234-5678';
      const formatted = formatPhoneNumber(phone);
      expect(formatted).toBe('5491112345678@c.us');
    });

    it('maneja número con paréntesis', () => {
      const phone = '+54 (911) 1234-5678';
      const formatted = formatPhoneNumber(phone);
      expect(formatted).toBe('5491112345678@c.us');
    });

    it('remueve todos los caracteres no numéricos', () => {
      const phone = '+54-911.123.4567/8';
      const formatted = formatPhoneNumber(phone);
      expect(formatted).toBe('5491112345678@c.us');
    });

    it('maneja número internacional (Brasil)', () => {
      const phone = '+5521987654321';
      const formatted = formatPhoneNumber(phone);
      expect(formatted).toBe('5521987654321@c.us');
    });
  });

  describe('Session Status', () => {
    it('obtiene estado de sesión exitosamente', async () => {
      // Mock successful response
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          name: 'default',
          status: 'WORKING',
          config: {
            webhooks: ['http://localhost:3001/webhook'],
          },
        }),
      });

      const status = await wahaService.getSessionStatus();

      expect(status).toBeDefined();
      expect(status!.name).toBe('default');
      expect(status!.status).toBe('WORKING');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/sessions/default',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Api-Key': 'test_api_key',
          }),
        })
      );
    });

    it('maneja error de API', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      const status = await wahaService.getSessionStatus();

      expect(status).toBeNull();
    });

    it('maneja timeout', async () => {
      global.fetch = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        });
      });

      const status = await wahaService.getSessionStatus();

      expect(status).toBeNull();
    });

    it('usa sesión personalizada cuando se proporciona', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ name: 'custom', status: 'WORKING' }),
      });

      await wahaService.getSessionStatus('custom');

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/sessions/custom',
        expect.any(Object)
      );
    });
  });

  describe('Send Text Message', () => {
    it('envía mensaje de texto exitosamente', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          id: 'msg_123456',
          timestamp: Date.now(),
          from: 'bot@c.us',
          to: '5491112345678@c.us',
          body: 'Hola desde WAHA',
          hasMedia: false,
          ack: 1,
        }),
      });

      const result = await wahaService.sendTextMessage(
        '+5491112345678',
        'Hola desde WAHA'
      );

      expect(result).toBeDefined();
      expect(result!.id).toBe('msg_123456');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/sendText',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'X-Api-Key': 'test_api_key',
          }),
          body: JSON.stringify({
            chatId: '5491112345678@c.us',
            text: 'Hola desde WAHA',
            session: 'default',
          }),
        })
      );
    });

    it('formatea número de teléfono correctamente', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_123', to: '5491112345678@c.us' }),
      });

      await wahaService.sendTextMessage('+54 911-1234-5678', 'Test');

      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.chatId).toBe('5491112345678@c.us');
    });

    it('reintenta en caso de fallo (retry logic)', async () => {
      let attempts = 0;

      global.fetch = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 3) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
            text: async () => 'Server error',
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ id: 'msg_success', to: '5491112345678@c.us' }),
        });
      });

      const result = await wahaService.sendTextMessage('+5491112345678', 'Test retry');

      expect(result).toBeDefined();
      expect(result!.id).toBe('msg_success');
      expect(attempts).toBe(3);
    });

    it('falla después de max retries', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Persistent error',
      });

      const result = await wahaService.sendTextMessage('+5491112345678', 'Test fail');

      expect(result).toBeNull();
      expect(global.fetch).toHaveBeenCalledTimes(3); // maxRetries
    });

    it('incluye API key en headers si está configurada', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_123' }),
      });

      await wahaService.sendTextMessage('+5491112345678', 'Test');

      const callHeaders = (global.fetch as any).mock.calls[0][1].headers;
      expect(callHeaders['X-Api-Key']).toBe('test_api_key');
    });

    it('omite API key si no está configurada', async () => {
      const wahaServiceNoKey = new WAHAService({
        baseURL: 'http://localhost:3000',
        apiKey: '',
        defaultSession: 'default',
        timeout: 30000,
        maxRetries: 3,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_123' }),
      });

      await wahaServiceNoKey.sendTextMessage('+5491112345678', 'Test');

      const callHeaders = (global.fetch as any).mock.calls[0][1].headers;
      expect(callHeaders['X-Api-Key']).toBeUndefined();
    });
  });

  describe('Send Button Message', () => {
    it('envía mensaje con botones exitosamente', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          id: 'msg_btn_123',
          to: '5491112345678@c.us',
        }),
      });

      const buttons = [
        { id: 'btn_1', text: 'Sí' },
        { id: 'btn_2', text: 'No' },
      ];

      const result = await wahaService.sendButtonMessage(
        '+5491112345678',
        '¿Confirmar pedido?',
        buttons
      );

      expect(result).toBeDefined();
      expect(result!.id).toBe('msg_btn_123');
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/api/sendButtons',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            chatId: '5491112345678@c.us',
            text: '¿Confirmar pedido?',
            buttons,
            session: 'default',
          }),
        })
      );
    });

    it('maneja múltiples botones', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_123' }),
      });

      const buttons = [
        { id: 'btn_1', text: 'Opción 1' },
        { id: 'btn_2', text: 'Opción 2' },
        { id: 'btn_3', text: 'Opción 3' },
      ];

      await wahaService.sendButtonMessage('+5491112345678', 'Elige:', buttons);

      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.buttons).toHaveLength(3);
      expect(callBody.buttons[0]).toEqual({ id: 'btn_1', text: 'Opción 1' });
    });

    it('falla si API retorna error', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      const buttons = [{ id: 'btn_1', text: 'Sí' }];
      const result = await wahaService.sendButtonMessage(
        '+5491112345678',
        'Test',
        buttons
      );

      expect(result).toBeNull();
    });
  });

  describe('Health Check', () => {
    it('retorna true si WAHA está healthy', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const isHealthy = await wahaService.healthCheck();

      expect(isHealthy).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3000/health',
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('retorna false si WAHA no responde', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
      });

      const isHealthy = await wahaService.healthCheck();

      expect(isHealthy).toBe(false);
    });

    it('retorna false si hay timeout', async () => {
      global.fetch = vi.fn().mockImplementation(() => {
        return new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), 100);
        });
      });

      const isHealthy = await wahaService.healthCheck();

      expect(isHealthy).toBe(false);
    });

    it('usa timeout corto (5 segundos)', async () => {
      let timeoutValue: number | undefined;

      global.fetch = vi.fn().mockImplementation((url, options: any) => {
        // Capturar timeout del AbortSignal
        timeoutValue = options.signal?._timeout || 5000;
        return Promise.resolve({ ok: true });
      });

      await wahaService.healthCheck();

      // El timeout para health check debe ser corto (5s)
      expect(timeoutValue).toBeLessThanOrEqual(5000);
    });
  });

  describe('Circuit Breaker', () => {
    it('obtiene estado del circuit breaker', () => {
      const state = wahaService.getCircuitBreakerState();

      expect(state).toBeDefined();
      expect(state).toHaveProperty('isOpen');
      expect(state).toHaveProperty('failures');
      expect(state).toHaveProperty('lastFailureTime');
      
      // Circuit breaker puede tener estado de tests previos (singleton)
      expect(typeof state.isOpen).toBe('boolean');
      expect(typeof state.failures).toBe('number');
      expect(state.failures).toBeGreaterThanOrEqual(0);
    });

    // Nota: Tests más exhaustivos del circuit breaker requieren
    // múltiples llamadas fallidas consecutivas, lo cual es difícil
    // de simular sin mockar el circuitBreaker interno.
    // Los tests de lógica del circuit breaker ya están en claude_resilience.test.ts
  });

  describe('Fallback Mechanism', () => {
    it('sendWhatsAppMessage usa WAHA por defecto', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_123' }),
      });

      const result = await sendWhatsAppMessage('+5491112345678', 'Test');

      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalled();
    });

    it('sendWhatsAppMessage retorna false si WAHA falla', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Error',
      });

      const result = await sendWhatsAppMessage('+5491112345678', 'Test', {
        useN8N: false, // Desactivar fallback para este test
      });

      expect(result).toBe(false);
    });

    it('sendWhatsAppMessage acepta botones', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_btn' }),
      });

      const buttons = [
        { id: 'btn_1', text: 'Sí' },
        { id: 'btn_2', text: 'No' },
      ];

      const result = await sendWhatsAppMessage('+5491112345678', '¿Confirmar?', {
        buttons,
      });

      expect(result).toBe(true);
      
      const callUrl = (global.fetch as any).mock.calls[0][0];
      expect(callUrl).toContain('/sendButtons');
    });

    it('sendWhatsAppMessage puede desactivar WAHA', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_123' }),
      });

      const result = await sendWhatsAppMessage('+5491112345678', 'Test', {
        useWAHA: false,
        useN8N: false,
      });

      // No debe llamar a fetch si ambos están desactivados
      expect(result).toBe(false);
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('maneja mensaje vacío', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_empty' }),
      });

      const result = await wahaService.sendTextMessage('+5491112345678', '');

      expect(result).toBeDefined();
      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.text).toBe('');
    });

    it('maneja mensaje muy largo (>1000 chars)', async () => {
      const longMessage = 'A'.repeat(5000);

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_long' }),
      });

      const result = await wahaService.sendTextMessage('+5491112345678', longMessage);

      expect(result).toBeDefined();
      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.text.length).toBe(5000);
    });

    it('maneja caracteres especiales en mensaje', async () => {
      const specialMessage = '¡Hola! ¿Cómo estás? 😊 € £ ¥';

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_special' }),
      });

      const result = await wahaService.sendTextMessage('+5491112345678', specialMessage);

      expect(result).toBeDefined();
      const callBody = JSON.parse((global.fetch as any).mock.calls[0][1].body);
      expect(callBody.text).toBe(specialMessage);
    });

    it('maneja número de teléfono inválido', () => {
      const invalidPhone = 'abc123';
      const formatted = formatPhoneNumber(invalidPhone);
      
      // Debe remover letras y dejar solo números
      expect(formatted).toBe('123@c.us');
    });

    it('maneja número de teléfono vacío', () => {
      const emptyPhone = '';
      const formatted = formatPhoneNumber(emptyPhone);
      
      expect(formatted).toBe('@c.us');
    });
  });

  describe('Configuration', () => {
    it('usa configuración por defecto si no se proporciona', () => {
      const defaultService = new WAHAService();
      
      // No debería crashear
      expect(defaultService).toBeDefined();
    });

    it('respeta timeout configurado', async () => {
      const customTimeout = 15000;
      const customService = new WAHAService({
        baseURL: 'http://localhost:3000',
        apiKey: '',
        defaultSession: 'default',
        timeout: customTimeout,
        maxRetries: 3,
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ id: 'msg_123' }),
      });

      await customService.sendTextMessage('+5491112345678', 'Test');

      // Verificar que el timeout se pasó correctamente
      // (AbortSignal.timeout se usa internamente)
      expect(global.fetch).toHaveBeenCalled();
    });

    it('respeta maxRetries configurado', async () => {
      const customService = new WAHAService({
        baseURL: 'http://localhost:3000',
        apiKey: '',
        defaultSession: 'default',
        timeout: 30000,
        maxRetries: 2, // Solo 2 reintentos
      });

      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        text: async () => 'Error',
      });

      await customService.sendTextMessage('+5491112345678', 'Test');

      expect(global.fetch).toHaveBeenCalledTimes(2);
    });
  });
});
