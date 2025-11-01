import { describe, it, expect } from 'vitest';
import { validateConfig } from '../config/validate';

describe('validateConfig', () => {
  it('usa valores por defecto en entorno de test cuando faltan SUPABASE_*', () => {
    const cfg = validateConfig({
      NODE_ENV: 'test',
      VITEST: '1',
    });

    // Supabase fallbacks en test
    expect(cfg.supabase.url).toBe('http://localhost:54321');
    expect(cfg.supabase.anonKey).toMatch(/^test_anon_key_/);
    expect(cfg.supabase.serviceRoleKey).toMatch(/^test_service_role_key_/);

    // Server defaults
    expect(cfg.server.port).toBe(3000);
    expect(cfg.server.host).toBe('0.0.0.0');
    expect(cfg.server.allowedOrigins.length).toBeGreaterThan(0);

    // Logging default
    expect(cfg.logging.level).toBe('info');
  });

  it('parsea ALLOWED_ORIGINS en array separada por coma', () => {
    const cfg = validateConfig({
      NODE_ENV: 'test',
      VITEST: '1',
      ALLOWED_ORIGINS: 'http://a.com,http://b.com',
    });

    expect(cfg.server.allowedOrigins).toEqual([
      'http://a.com',
      'http://b.com',
    ]);
  });

  it('coacciona números (PORT, MAX_TOKENS_PER_SESSION)', () => {
    const cfg = validateConfig({
      NODE_ENV: 'test',
      VITEST: '1',
      PORT: '8080',
      ANTHROPIC_API_KEY: 'sk-ant-xxx',
      MAX_TOKENS_PER_SESSION: '123',
    });

    expect(cfg.server.port).toBe(8080);
    expect(cfg.claude?.maxTokensPerSession).toBe(123);
  });

  it('lanza error en producción si faltan SUPABASE_*', () => {
    expect(() => validateConfig({ NODE_ENV: 'production' })).toThrow(
      /Configuración inválida/i
    );
  });
});
