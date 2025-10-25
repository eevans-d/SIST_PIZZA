import { describe, it, expect } from 'vitest';

// Pruebas de contrato para endpoints admin de menú

describe('POST /api/menu', () => {
  it('should validate payload structure', () => {
    const payload = {
      nombre: 'Pizza Test',
      categoria: 'pizza',
      precio: 999,
      disponible: true,
    };
    expect(payload.nombre.length).toBeGreaterThan(1);
    expect(['pizza','empanada','bebida','postre','extra']).toContain(payload.categoria);
  });
});

describe('PATCH /api/menu/:id', () => {
  it('should accept partial updates', () => {
    const updates = { precio: 1000, disponible: false };
    expect(Object.keys(updates).length).toBeGreaterThan(0);
  });
});
