import { describe, it, expect } from 'vitest';

// Unit-level test for HMAC verification helper (no Express server spin-up)

describe('verifyHmacSignature helper', async () => {
  it('validates matching signature', async () => {
    const mod = await import('../workflows/webhookN8N');
    const { verifyHmacSignature } = mod as any;
    const body = { a: 1, b: 'x' };
    const secret = 'topsecret';
    const crypto = await import('crypto');
    const expected = crypto.createHmac('sha256', secret).update(JSON.stringify(body)).digest('hex');
    expect(verifyHmacSignature(body, secret, expected)).toBe(true);
  });

  it('rejects mismatched signature', async () => {
    const mod = await import('../workflows/webhookN8N');
    const { verifyHmacSignature } = mod as any;
    const body = { a: 1 };
    const secret = 'topsecret';
    expect(verifyHmacSignature(body, secret, 'invalidsig')).toBe(false);
  });

  it('passes through when no secret provided', async () => {
    const mod = await import('../workflows/webhookN8N');
    const { verifyHmacSignature } = mod as any;
    const body = { hello: 'world' };
    expect(verifyHmacSignature(body)).toBe(true);
  });
});
