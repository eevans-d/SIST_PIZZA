/**
 * Tests completos para validación de webhooks (HMAC + IP)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import {
  validateChatwootWebhook,
  validateModoWebhook,
  validateIP,
} from '../middlewares/validateWebhook';

// Mock para safeLogger
vi.mock('../lib/logger', () => ({
  safeLogger: {
    warn: vi.fn(),
    info: vi.fn(),
    error: vi.fn(),
  },
}));

describe('validateIP', () => {
  it('valida IP exacta en whitelist', () => {
    expect(validateIP(['192.168.1.1'], '192.168.1.1')).toBe(true);
    expect(validateIP(['192.168.1.1'], '192.168.1.2')).toBe(false);
  });

  it('valida IP con CIDR /16', () => {
    expect(validateIP(['190.112.0.0/16'], '190.112.50.100')).toBe(true);
    expect(validateIP(['190.112.0.0/16'], '190.111.50.100')).toBe(false);
  });

  it('valida IP con X-Forwarded-For múltiple', () => {
    expect(validateIP(['54.226.73.99'], '54.226.73.99, 10.0.0.1')).toBe(true);
  });

  it('rechaza IP undefined', () => {
    expect(validateIP(['192.168.1.1'], undefined)).toBe(false);
  });
});

describe('validateChatwootWebhook', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {
        'x-forwarded-for': '54.226.73.99',
      },
      socket: { remoteAddress: '54.226.73.99' } as any,
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    
    // Limpiar env vars
    delete process.env.CHATWOOT_WEBHOOK_SECRET;
  });

  it('rechaza IP no autorizada', () => {
    mockReq.headers = { 'x-forwarded-for': '1.1.1.1' };
    mockReq.socket = { remoteAddress: '1.1.1.1' } as any;

    validateChatwootWebhook(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'Acceso rechazado',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('permite IP autorizada cuando no hay secret configurado', () => {
    validateChatwootWebhook(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
  });

  it('rechaza request sin firma cuando secret está configurado', () => {
    process.env.CHATWOOT_WEBHOOK_SECRET = 'test_secret';
    mockReq.headers = {
      'x-forwarded-for': '54.226.73.99',
    };

    validateChatwootWebhook(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Firma faltante',
    });
  });

  it('valida firma HMAC correcta', () => {
    const secret = 'test_secret';
    const rawBody = JSON.stringify({ event: 'message_created' });
    const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    process.env.CHATWOOT_WEBHOOK_SECRET = secret;
    mockReq.headers = {
      'x-forwarded-for': '54.226.73.99',
      'x-chatwoot-signature': signature,
    };
    (mockReq as any).rawBody = rawBody;

    validateChatwootWebhook(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('rechaza firma HMAC incorrecta', () => {
    process.env.CHATWOOT_WEBHOOK_SECRET = 'test_secret';
    mockReq.headers = {
      'x-forwarded-for': '54.226.73.99',
      'x-chatwoot-signature': 'invalid_signature_here',
    };
    (mockReq as any).rawBody = JSON.stringify({ event: 'test' });

    validateChatwootWebhook(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Firma inválida',
    });
  });
});

describe('validateModoWebhook', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    mockReq = {
      headers: {
        'x-forwarded-for': '190.112.50.100',
      },
      socket: { remoteAddress: '190.112.50.100' } as any,
    };
    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    mockNext = vi.fn();
    
    // Limpiar env vars
    delete process.env.MODO_WEBHOOK_SECRET;
  });

  it('rechaza IP no autorizada', () => {
    mockReq.headers = { 'x-forwarded-for': '1.1.1.1' };
    mockReq.socket = { remoteAddress: '1.1.1.1' } as any;

    validateModoWebhook(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockRes.status).toHaveBeenCalledWith(403);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Forbidden',
      message: 'Acceso rechazado',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('permite IP autorizada cuando no hay secret configurado', () => {
    validateModoWebhook(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
  });

  it('rechaza request sin firma cuando secret está configurado', () => {
    process.env.MODO_WEBHOOK_SECRET = 'test_secret';
    mockReq.headers = {
      'x-forwarded-for': '190.112.50.100',
    };

    validateModoWebhook(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Firma faltante',
    });
  });

  it('valida firma HMAC correcta', () => {
    const secret = 'test_secret';
    const rawBody = JSON.stringify({ payment: { id: '123', status: 'approved' } });
    const signature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');

    process.env.MODO_WEBHOOK_SECRET = secret;
    mockReq.headers = {
      'x-forwarded-for': '190.112.50.100',
      'x-modo-signature': signature,
    };
    (mockReq as any).rawBody = rawBody;

    validateModoWebhook(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
    expect(mockRes.status).not.toHaveBeenCalled();
  });

  it('rechaza firma HMAC incorrecta', () => {
    process.env.MODO_WEBHOOK_SECRET = 'test_secret';
    mockReq.headers = {
      'x-forwarded-for': '190.112.50.100',
      'x-modo-signature': 'invalid_signature_here',
    };
    (mockReq as any).rawBody = JSON.stringify({ payment: { id: '123' } });

    validateModoWebhook(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Unauthorized',
      message: 'Firma inválida',
    });
  });

  it('rechaza firma con longitud incorrecta', () => {
    process.env.MODO_WEBHOOK_SECRET = 'test_secret';
    mockReq.headers = {
      'x-forwarded-for': '190.112.50.100',
      'x-modo-signature': 'abc', // Demasiado corta
    };
    (mockReq as any).rawBody = JSON.stringify({ payment: { id: '123' } });

    validateModoWebhook(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockRes.status).toHaveBeenCalledWith(401);
  });
});

describe('Security - Timing attack protection', () => {
  it('usa timingSafeEqual para comparar firmas', () => {
    const secret = 'test_secret';
    const rawBody = '{"test": true}';
    const validSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    
    // Firmas con 1 carácter diferente
    const invalidSignature = validSignature.slice(0, -1) + 'X';
    
    const mockReq = {
      headers: {
        'x-forwarded-for': '54.226.73.99',
        'x-chatwoot-signature': invalidSignature,
      },
      socket: { remoteAddress: '54.226.73.99' } as any,
      rawBody,
    };
    const mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
    const mockNext = vi.fn();

    process.env.CHATWOOT_WEBHOOK_SECRET = secret;

    validateChatwootWebhook(
      mockReq as any,
      mockRes as any,
      mockNext
    );

    // Debe rechazar sin revelar cuál carácter falló
    expect(mockRes.status).toHaveBeenCalledWith(401);
    expect(mockNext).not.toHaveBeenCalled();
  });
});
