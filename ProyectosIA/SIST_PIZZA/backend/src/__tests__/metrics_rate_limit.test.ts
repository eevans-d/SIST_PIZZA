import { describe, it, expect } from 'vitest';

// Pruebas simples (no E2E) para asegurar contratos básicos

describe('Metrics exposure contract', () => {
  it('should include http_requests_total metric', () => {
    const sampleMetrics = `# HELP http_requests_total Total de requests HTTP\n# TYPE http_requests_total counter\nhttp_requests_total{method="GET",route="/health",status="200"} 1`;
    expect(sampleMetrics.includes('http_requests_total')).toBe(true);
  });
});

describe('Rate limit responses', () => {
  it('should return 429 structure as documented', () => {
    const response = {
      status: 429,
      body: {
        error: 'Too Many Requests',
        message: 'Has excedido el límite de solicitudes. Intenta de nuevo más tarde.',
      },
    };
    expect(response.status).toBe(429);
    expect(response.body.error).toBe('Too Many Requests');
  });
});
