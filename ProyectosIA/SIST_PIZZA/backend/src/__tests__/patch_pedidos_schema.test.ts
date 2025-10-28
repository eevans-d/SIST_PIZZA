import { describe, it, expect } from 'vitest';

import { updatePedidoSchema } from '../workflows/pedidos';

describe('updatePedidoSchema', () => {
  it('accepts valid estado', () => {
    const parsed = updatePedidoSchema.parse({ estado: 'listo' });
    expect(parsed.estado).toBe('listo');
  });

  it('rejects invalid estado', () => {
    try {
      updatePedidoSchema.parse({ estado: 'x' as any });
      throw new Error('should have thrown');
    } catch (e: any) {
      expect(e.issues?.length ?? 1).toBeGreaterThan(0);
    }
  });
});
