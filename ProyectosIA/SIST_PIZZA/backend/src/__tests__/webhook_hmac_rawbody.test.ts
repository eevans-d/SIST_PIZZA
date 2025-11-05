import { describe, it, expect } from 'vitest';

// Unit test to ensure raw-body based verification works consistently

describe('verifyHmacSignatureFromRaw helper', async () => {
  it('validates matching signature with exact raw JSON string', async () => {
    const mod = await import('../workflows/webhookN8N');
    const { verifyHmacSignatureFromRaw } = mod as any;
    const bodyRaw = '{"a":1,"b":"x"}';
    const secret = 'topsecret';
    const crypto = await import('crypto');
    const expected = crypto.createHmac('sha256', secret).update(bodyRaw).digest('hex');
    expect(verifyHmacSignatureFromRaw(bodyRaw, secret, expected)).toBe(true);
  });
});
