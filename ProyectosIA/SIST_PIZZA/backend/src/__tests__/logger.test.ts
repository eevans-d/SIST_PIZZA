import { describe, it, expect, vi } from 'vitest';
import { redactPII, logger, safeLogger } from '../lib/logger';

describe('logger.redactPII', () => {
  it('redacta telefono, email y direccion', () => {
    const input = {
      telefono: '+5492234567890',
      email: 'user@example.com',
      direccion: 'Calle Falsa 123',
      otra: 'ok',
    };
    const out = redactPII(input);

    // No muta el original
    expect(input.telefono).toBe('+5492234567890');

    // Telefono: conserva longitud, enmascara excepto ultimos 4
    expect(out.telefono).toHaveLength(input.telefono.length);
    expect(out.telefono.endsWith('7890')).toBe(true);
    expect(out.telefono).toMatch(/^\*+\d{4}$/);

    // Email y direccion totalmente redactados
    expect(out.email).toBe('***@***.***');
    expect(out.direccion).toBe('[REDACTED]');

    // Otros campos intactos
    expect(out.otra).toBe('ok');
  });

  it('devuelve el valor tal cual si no es objeto', () => {
    expect(redactPII(null)).toBeNull();
    expect(redactPII('texto')).toBe('texto');
    expect(redactPII(123)).toBe(123);
  });
});

describe('safeLogger', () => {
  it('usa redactPII antes de loggear (info)', () => {
    const spy = vi.spyOn(logger as any, 'info').mockImplementation(() => logger as any);

    const meta = {
      telefono: '+5492230000999',
      email: 'john@doe.com',
      direccion: 'Av. Siempre Viva 742',
      extra: 'x',
    };

    safeLogger.info('mensaje', meta);

  expect(spy).toHaveBeenCalledTimes(1);
  const call = spy.mock.calls[0] as unknown as any[];
  const _msg = call[0];
  const calledMeta = call[1];

    // Asegurar redaccion
    expect(calledMeta.telefono.endsWith('0999')).toBe(true);
    expect(calledMeta.telefono).toMatch(/^\*+\d{4}$/);
    expect(calledMeta.email).toBe('***@***.***');
    expect(calledMeta.direccion).toBe('[REDACTED]');
    expect(calledMeta.extra).toBe('x');

    spy.mockRestore();
  });

  it('funciona con meta opcional (undefined)', () => {
  const spy = vi.spyOn(logger as any, 'warn').mockImplementation(() => logger as any);
    // No debe lanzar
    safeLogger.warn('solo mensaje');
    expect(spy).toHaveBeenCalledTimes(1);
    const call = spy.mock.calls[0] as unknown as any[];
    const calledMeta = call[1];
    expect(calledMeta).toBeUndefined();
    spy.mockRestore();
  });
});
