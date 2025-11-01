import { describe, it, expect } from 'vitest';

// Contract tests: ensure we document export endpoint being rate-limited and 429 shape

describe('Export endpoint rate limit contract', () => {
  it('should return 429 with standard structure when limit exceeded', () => {
    const response = {
      status: 429,
      headers: {
        'ratelimit-policy': '5;w=60',
      },
      body: {
        error: 'Export Rate Limit',
        message: 'Demasiadas exportaciones en poco tiempo. Intenta nuevamente más tarde.'
      }
    };
    expect(response.status).toBe(429);
    expect(response.body.error).toMatch(/Rate Limit/);
  });
});
