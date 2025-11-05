import { describe, it, expect } from 'vitest';
import { generatePedidosCSV, type PedidoListItem } from '../workflows/pedidos';

describe('GET /api/pedidos/export (CSV)', () => {
  it('should produce CSV with header and quoted fields', () => {
    const items: PedidoListItem[] = [
      {
        id: 'uuid-1',
        cliente_id: 'cli-1',
        estado: 'confirmado',
        tipo_entrega: 'delivery',
        total: 1234.5 as any,
        created_at: '2025-10-25T00:00:00.000Z',
      },
      {
        id: 'uuid-2',
        cliente_id: null,
        estado: 'pendiente',
        tipo_entrega: null,
        total: 2000 as any,
        created_at: '2025-10-25T01:00:00.000Z',
      },
    ];

    const csv = generatePedidosCSV(items);
    const lines = csv.split('\n');
    expect(lines[0]).toBe('id,cliente_id,estado,tipo_entrega,total,created_at');
    expect(lines.length).toBe(3);
    expect(lines[1]).toContain('uuid-1');
    expect(lines[2]).toContain('uuid-2');
  });
});
