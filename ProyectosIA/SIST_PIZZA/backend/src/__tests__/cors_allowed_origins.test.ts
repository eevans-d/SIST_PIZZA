import { describe, it, expect, beforeAll, vi } from 'vitest';
import request from 'supertest';

// Helper para cargar la app con env controlado
async function loadAppWithEnv(env: Record<string, string | undefined>) {
  // Setear env necesarios para config
  process.env = {
    ...process.env,
    NODE_ENV: 'test',
    VITEST: '1',
    SUPABASE_URL: env.SUPABASE_URL, // permitir override opcional
    SUPABASE_ANON_KEY: env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY,
    ALLOWED_ORIGINS: env.ALLOWED_ORIGINS,
  };

  const serverMod = await import('../server');
  const app = serverMod.createApp();
  return app;
}

describe('CORS allowedOrigins', () => {
  let app: any;
  const ORIGIN_OK = 'http://a.com';
  const ORIGIN_BAD = 'http://b.com';

  beforeAll(async () => {
    vi.restoreAllMocks();
    app = await loadAppWithEnv({
      ALLOWED_ORIGINS: `${ORIGIN_OK}`,
      SUPABASE_URL: undefined,
      SUPABASE_ANON_KEY: undefined,
      SUPABASE_SERVICE_ROLE_KEY: undefined,
    });
  });

  it('permite origen incluido en ALLOWED_ORIGINS', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', ORIGIN_OK)
      .expect(200);

    expect(res.headers['access-control-allow-origin']).toBe(ORIGIN_OK);
  });

  it('bloquea origen no listado en ALLOWED_ORIGINS', async () => {
    const res = await request(app)
      .get('/health')
      .set('Origin', ORIGIN_BAD)
      .expect(500); // middleware CORS lanza error y nuestro errorHandler responde 500

    expect(res.body).toHaveProperty('error', 'Internal Server Error');
  });
});
