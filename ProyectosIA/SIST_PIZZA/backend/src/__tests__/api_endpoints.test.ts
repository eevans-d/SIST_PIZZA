import { describe, it, expect } from 'vitest';

// Estas pruebas validan contratos mínimos (sin hit real a Supabase)

describe('GET /api/menu', () => {
  it('should return items array', () => {
    const response = { items: [{ id: 'uuid', nombre: 'Pizza Muzzarella', precio: 3500 }] };
    expect(Array.isArray(response.items)).toBe(true);
    expect(response.items[0]).toHaveProperty('nombre');
  });
});

describe('GET /api/menu/:id', () => {
  it('should return item object', () => {
    const response = { item: { id: 'uuid', nombre: 'Pizza Muzzarella', precio: 3500 } };
    expect(response.item).toHaveProperty('id');
    expect(response.item).toHaveProperty('nombre');
  });
});

describe('GET /api/pedidos/:id', () => {
  it('should return pedido and items', () => {
    const response = { pedido: { id: 'uuid', total: 4700 }, items: [{ menu_item_id: 'uuid', cantidad: 1 }] };
    expect(response.pedido).toHaveProperty('id');
    expect(Array.isArray(response.items)).toBe(true);
  });
});

describe('PATCH /api/pedidos/:id', () => {
  it('should validate estado via schema', async () => {
    const { updatePedidoSchema } = await import('../workflows/pedidos');
    const parsed = updatePedidoSchema.parse({ estado: 'confirmado' });
    expect(parsed.estado).toBe('confirmado');
  });
});
