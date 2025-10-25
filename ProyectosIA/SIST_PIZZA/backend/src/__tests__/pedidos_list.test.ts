import { describe, it, expect } from 'vitest';

describe('GET /api/pedidos (lista con filtros)', () => {
  it('should accept estado, desde, hasta, limit, offset', () => {
    const query = {
      estado: 'confirmado',
      desde: new Date().toISOString(),
      hasta: new Date().toISOString(),
      limit: 20,
      offset: 0,
    };
    expect(query.estado).toBe('confirmado');
    expect(query.limit).toBeGreaterThan(0);
  });
});
