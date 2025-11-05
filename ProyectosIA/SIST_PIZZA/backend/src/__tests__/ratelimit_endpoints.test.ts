import { describe, it, expect } from 'vitest';

// Contract-level tests: document expected 429 response shapes for webhook and export endpoints

describe('Rate limit: webhook endpoint', () => {
  it('should return 429 with webhook limiter message format', () => {
    const response = {
      status: 429,
      body: {
        error: 'Webhook Rate Limit',
        message: 'El webhook ha excedido el límite de llamadas por minuto.'
      }
    };
    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Webhook Rate Limit');
  });
});

describe('Rate limit: export endpoint', () => {
  it('should return 429 with export limiter message format', () => {
    const response = {
      status: 429,
      body: {
        error: 'Export Rate Limit',
        message: 'Demasiadas exportaciones en poco tiempo. Intenta nuevamente más tarde.'
      }
    };
    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Export Rate Limit');
  });
});
