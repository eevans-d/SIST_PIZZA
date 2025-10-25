import { describe, it, expect, vi } from 'vitest';

vi.mock('@supabase/supabase-js', () => {
  return {
    createClient: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: { id: 'uuid' } }),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ data: [{ id: 'uuid' }], error: null }),
      update: vi.fn().mockResolvedValue({ data: [{ id: 'uuid', estado: 'confirmado' }], error: null }),
    }),
  };
});

describe('Supabase mock sanity', () => {
  it('should create client and return data', async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const client: any = createClient('url', 'key');
    const result = await client.single();
    expect(result.data.id).toBe('uuid');
  });
});
