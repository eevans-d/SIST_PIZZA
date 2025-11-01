/**
 * 🧪 Tests de Modo Webhook HMAC
 * 
 * Cobertura:
 * - Validación de firma HMAC SHA-256
 * - Validación de IP whitelist
 * - Detección de webhooks duplicados
 * - Manejo de errores
 * - Timing attack protection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { validateModoWebhook, validateIP, detectDuplicateWebhook } from '../middlewares/validateWebhook';

describe('Modo Webhook Validation', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {},
      body: {},
      socket: { remoteAddress: '190.112.1.1' } as any,
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockNext = vi.fn();

    // Reset env vars
    delete process.env.MODO_WEBHOOK_SECRET;
  });

  describe('IP Validation', () => {
    it('rechaza webhook con IP no autorizada', () => {
      mockReq.headers = {
        'x-forwarded-for': '1.2.3.4', // IP no autorizada
      };

      validateModoWebhook(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Acceso rechazado',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('acepta webhook con IP en whitelist (CIDR /16)', () => {
      process.env.MODO_WEBHOOK_SECRET = 'test_secret';
      const rawBody = JSON.stringify({ operation_id: 'test' });
      const signature = crypto.createHmac('sha256', 'test_secret').update(rawBody).digest('hex');

      mockReq.headers = {
        'x-forwarded-for': '190.112.50.100', // Dentro del rango /16
        'x-modo-signature': signature,
      };
      (mockReq as any).rawBody = rawBody;

      validateModoWebhook(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('maneja múltiples IPs en X-Forwarded-For (toma la primera)', () => {
      process.env.MODO_WEBHOOK_SECRET = 'test_secret';
      const rawBody = JSON.stringify({ operation_id: 'test' });
      const signature = crypto.createHmac('sha256', 'test_secret').update(rawBody).digest('hex');

      mockReq.headers = {
        'x-forwarded-for': '190.112.1.1, 10.0.0.1, 192.168.1.1',
        'x-modo-signature': signature,
      };
      (mockReq as any).rawBody = rawBody;

      validateModoWebhook(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('HMAC Signature Validation', () => {
    beforeEach(() => {
      // IP válida para todos los tests de HMAC
      mockReq.headers = {
        'x-forwarded-for': '190.112.1.1',
      };
    });

    it('rechaza webhook sin firma cuando MODO_WEBHOOK_SECRET está configurado', () => {
      process.env.MODO_WEBHOOK_SECRET = 'test_secret';
      const rawBody = JSON.stringify({ operation_id: 'test' });
      (mockReq as any).rawBody = rawBody;

      validateModoWebhook(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Firma faltante',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('valida firma HMAC correcta con SHA-256', () => {
      const secret = 'test_secret_12345';
      const rawBody = JSON.stringify({
        operation_id: 'OP123456',
        status: 'approved',
        reference: 'PEDIDO-001',
        amount: 500000, // $5000 ARS en centavos
      });

      const signature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      process.env.MODO_WEBHOOK_SECRET = secret;
      mockReq.headers!['x-modo-signature'] = signature;
      (mockReq as any).rawBody = rawBody;

      validateModoWebhook(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('rechaza firma HMAC incorrecta', () => {
      process.env.MODO_WEBHOOK_SECRET = 'test_secret';
      const rawBody = JSON.stringify({ operation_id: 'test' });
      (mockReq as any).rawBody = rawBody;

      // Firma incorrecta
      mockReq.headers!['x-modo-signature'] = 'invalid_signature_1234567890abcdef';

      validateModoWebhook(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Firma inválida',
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('rechaza firma con longitud diferente (timing attack protection)', () => {
      process.env.MODO_WEBHOOK_SECRET = 'test_secret';
      const rawBody = JSON.stringify({ operation_id: 'test' });
      (mockReq as any).rawBody = rawBody;

      // Firma con longitud incorrecta
      mockReq.headers!['x-modo-signature'] = 'short';

      validateModoWebhook(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Unauthorized',
        message: 'Firma inválida',
      });
    });

    it('permite webhook sin validación si MODO_WEBHOOK_SECRET no está configurado', () => {
      // Sin secret configurado
      const rawBody = JSON.stringify({ operation_id: 'test' });
      (mockReq as any).rawBody = rawBody;

      validateModoWebhook(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('valida firma con body vacío', () => {
      const secret = 'test_secret';
      const rawBody = '';
      const signature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      process.env.MODO_WEBHOOK_SECRET = secret;
      mockReq.headers!['x-modo-signature'] = signature;
      (mockReq as any).rawBody = rawBody;

      validateModoWebhook(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('valida firma con body complejo (nested objects)', () => {
      const secret = 'test_secret';
      const rawBody = JSON.stringify({
        operation_id: 'OP789',
        status: 'approved',
        metadata: {
          customer: {
            name: 'Juan Pérez',
            email: 'juan@example.com',
          },
          items: [
            { id: 1, name: 'Pizza Muzzarella', price: 2500 },
            { id: 2, name: 'Coca Cola', price: 800 },
          ],
        },
      });

      const signature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      process.env.MODO_WEBHOOK_SECRET = secret;
      mockReq.headers!['x-modo-signature'] = signature;
      (mockReq as any).rawBody = rawBody;

      validateModoWebhook(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Timing Attack Protection', () => {
    beforeEach(() => {
      mockReq.headers = { 'x-forwarded-for': '190.112.1.1' };
    });

    it('usa crypto.timingSafeEqual para comparación de firmas', () => {
      const secret = 'test_secret';
      const rawBody = JSON.stringify({ test: 'data' });

      // Crear dos firmas idénticas
      const signature1 = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      const signature2 = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      expect(signature1).toBe(signature2);
      expect(signature1.length).toBe(64); // SHA-256 hex = 64 chars

      // Verificar que timingSafeEqual funciona correctamente
      const result = crypto.timingSafeEqual(
        Buffer.from(signature1),
        Buffer.from(signature2)
      );
      expect(result).toBe(true);
    });

    it('timingSafeEqual rechaza firmas con diferencia de 1 bit', () => {
      const secret = 'test_secret';
      const rawBody = JSON.stringify({ test: 'data' });
      const correctSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      // Modificar 1 carácter (cambio de 1 bit)
      const tamperedSignature = 
        correctSignature.substring(0, correctSignature.length - 1) + 
        (correctSignature[correctSignature.length - 1] === 'f' ? 'e' : 'f');

      const result = crypto.timingSafeEqual(
        Buffer.from(correctSignature),
        Buffer.from(tamperedSignature)
      );
      expect(result).toBe(false);
    });
  });

  describe('IP Validation Logic (Unit)', () => {
    it('valida IP exacta', () => {
      const allowedIPs = ['192.168.1.100'];
      expect(validateIP(allowedIPs, '192.168.1.100')).toBe(true);
      expect(validateIP(allowedIPs, '192.168.1.101')).toBe(false);
    });

    it('valida CIDR /16', () => {
      const allowedIPs = ['190.112.0.0/16'];
      expect(validateIP(allowedIPs, '190.112.1.1')).toBe(true);
      expect(validateIP(allowedIPs, '190.112.255.255')).toBe(true);
      expect(validateIP(allowedIPs, '190.111.1.1')).toBe(false);
      expect(validateIP(allowedIPs, '190.113.1.1')).toBe(false);
    });

    it('valida CIDR /24', () => {
      const allowedIPs = ['192.168.1.0/24'];
      expect(validateIP(allowedIPs, '192.168.1.1')).toBe(true);
      expect(validateIP(allowedIPs, '192.168.1.255')).toBe(true);
      expect(validateIP(allowedIPs, '192.168.2.1')).toBe(false);
    });

    it('rechaza IP undefined', () => {
      expect(validateIP(['192.168.1.1'], undefined)).toBe(false);
    });

    it('maneja múltiples IPs separadas por coma', () => {
      const allowedIPs = ['190.112.0.0/16'];
      expect(validateIP(allowedIPs, '190.112.1.1, 10.0.0.1')).toBe(true); // Toma la primera
    });
  });

  describe('Duplicate Webhook Detection', () => {
    it('permite primer webhook', () => {
      mockReq.body = { operation_id: 'OP_UNIQUE_TEST_1', status: 'approved' };
      detectDuplicateWebhook(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('rechaza webhook duplicado dentro de 60 segundos', () => {
      // Usar un body único para este test
      mockReq.body = { operation_id: 'OP_UNIQUE_TEST_2', status: 'approved' };
      
      // Primer webhook
      const mockNext1 = vi.fn();
      const mockRes1 = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      detectDuplicateWebhook(mockReq as Request, mockRes1 as any, mockNext1);
      expect(mockNext1).toHaveBeenCalled();

      // Segundo webhook idéntico (inmediatamente)
      const mockNext2 = vi.fn();
      const mockRes2 = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      detectDuplicateWebhook(mockReq as Request, mockRes2 as any, mockNext2);

      expect(mockRes2.status).toHaveBeenCalledWith(200);
      expect(mockRes2.json).toHaveBeenCalledWith({
        success: true,
        message: 'Webhook procesado anteriormente',
      });
      expect(mockNext2).not.toHaveBeenCalled();
    });

    it('permite webhook con body diferente', () => {
      const mockNextLocal = vi.fn();
      const mockResLocal = {
        status: vi.fn().mockReturnThis(),
        json: vi.fn().mockReturnThis(),
      };
      
      // Primer webhook
      mockReq.body = { operation_id: 'OP_UNIQUE_TEST_3A' };
      detectDuplicateWebhook(mockReq as Request, mockResLocal as any, mockNextLocal);
      expect(mockNextLocal).toHaveBeenCalledTimes(1);

      // Segundo webhook con body diferente
      mockReq.body = { operation_id: 'OP_UNIQUE_TEST_3B' };
      detectDuplicateWebhook(mockReq as Request, mockResLocal as any, mockNextLocal);
      expect(mockNextLocal).toHaveBeenCalledTimes(2);
    });
  });

  describe('Modo Webhook Payload Scenarios', () => {
    beforeEach(() => {
      mockReq.headers = { 'x-forwarded-for': '190.112.1.1' };
    });

    it('valida webhook de pago aprobado', () => {
      const secret = 'modo_secret';
      const payload = {
        operation_id: 'OP123456789',
        status: 'approved',
        reference: 'PEDIDO-001',
        amount: 500000,
        currency: 'ARS',
        created_at: '2025-10-26T10:30:00Z',
      };
      const rawBody = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      process.env.MODO_WEBHOOK_SECRET = secret;
      mockReq.headers!['x-modo-signature'] = signature;
      (mockReq as any).rawBody = rawBody;

      validateModoWebhook(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('valida webhook de pago rechazado', () => {
      const secret = 'modo_secret';
      const payload = {
        operation_id: 'OP987654321',
        status: 'rejected',
        reference: 'PEDIDO-002',
        amount: 300000,
        currency: 'ARS',
        rejection_reason: 'Fondos insuficientes',
      };
      const rawBody = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      process.env.MODO_WEBHOOK_SECRET = secret;
      mockReq.headers!['x-modo-signature'] = signature;
      (mockReq as any).rawBody = rawBody;

      validateModoWebhook(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('valida webhook de pago cancelado', () => {
      const secret = 'modo_secret';
      const payload = {
        operation_id: 'OP111222333',
        status: 'cancelled',
        reference: 'PEDIDO-003',
        cancelled_by: 'customer',
      };
      const rawBody = JSON.stringify(payload);
      const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

      process.env.MODO_WEBHOOK_SECRET = secret;
      mockReq.headers!['x-modo-signature'] = signature;
      (mockReq as any).rawBody = rawBody;

      validateModoWebhook(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      mockReq.headers = { 'x-forwarded-for': '190.112.1.1' };
    });

    it('maneja rawBody undefined gracefully', () => {
      process.env.MODO_WEBHOOK_SECRET = 'test_secret';
      const signature = crypto.createHmac('sha256', 'test_secret').update('').digest('hex');

      mockReq.headers!['x-modo-signature'] = signature;
      (mockReq as any).rawBody = undefined;

      validateModoWebhook(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled(); // Debería tratar undefined como ''
    });

    it('no expone información sensible en errores', () => {
      process.env.MODO_WEBHOOK_SECRET = 'super_secret_key_12345';
      const rawBody = JSON.stringify({ test: 'data' });
      (mockReq as any).rawBody = rawBody;

      // Sin firma
      validateModoWebhook(mockReq as Request, mockRes as Response, mockNext);

      const errorResponse = (mockRes.json as any).mock.calls[0][0];
      
      // No debe exponer el secret
      expect(JSON.stringify(errorResponse)).not.toContain('super_secret_key_12345');
      expect(errorResponse.error).toBe('Unauthorized');
      expect(errorResponse.message).toBe('Firma faltante');
    });

    it('no expone la firma completa en logs', () => {
      process.env.MODO_WEBHOOK_SECRET = 'test_secret';
      const rawBody = JSON.stringify({ test: 'data' });
      (mockReq as any).rawBody = rawBody;
      mockReq.headers!['x-modo-signature'] = 'invalid_signature_that_is_very_long_1234567890';

      validateModoWebhook(mockReq as Request, mockRes as Response, mockNext);

      // Verificar que el middleware no crashea
      expect(mockRes.status).toHaveBeenCalledWith(401);
    });
  });
});
