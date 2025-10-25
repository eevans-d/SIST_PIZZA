import { z } from 'zod';

// Schema simplificado: solo Supabase es REQUERIDO, todo lo demás opcional
const configSchema = z.object({
  // CRÍTICOS (requeridos)
  supabase: z.object({
    url: z.string().min(1, 'SUPABASE_URL es requerido'),
    anonKey: z.string().min(20, 'SUPABASE_ANON_KEY es requerido'),
    serviceRoleKey: z.string().min(20, 'SUPABASE_SERVICE_ROLE_KEY es requerido'),
  }),
  
  server: z.object({
    nodeEnv: z.enum(['development', 'production', 'test']).default('development'),
    port: z.coerce.number().min(0).max(65535).default(3000),
    host: z.string().default('0.0.0.0'),
    allowedOrigins: z.array(z.string()).default(['http://localhost:5173', 'http://localhost:3000']),
  }),
  
  // OPCIONALES (con fallbacks para desarrollo)
  claude: z.object({
    apiKey: z.string().optional(),
    model: z.string().default('claude-3-5-sonnet-20241022'),
    maxTokensPerSession: z.coerce.number().default(6600),
  }).optional(),
  
  modo: z.object({
    apiKey: z.string().optional(),
    webhookSecret: z.string().optional(),
  }).optional(),
  
  chatwoot: z.object({
    apiKey: z.string().optional(),
    baseUrl: z.string().url().optional(),
  }).optional(),
  
  database: z.object({
    encryptionKey: z.string().optional(),
  }),
  
  logging: z.object({
    level: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
  }),
});

export type Config = z.infer<typeof configSchema>;

export function validateConfig(env: any): Config {
  try {
    const isTestEnv = env.NODE_ENV === 'test' || !!env.VITEST;

    const fallbackSupabase = isTestEnv
      ? {
          url: env.SUPABASE_URL || 'http://localhost:54321',
          anonKey: env.SUPABASE_ANON_KEY || 'test_anon_key_12345678901234567890',
          serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY || 'test_service_role_key_12345678901234567890',
        }
      : {
          url: env.SUPABASE_URL,
          anonKey: env.SUPABASE_ANON_KEY,
          serviceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
        };

    return configSchema.parse({
      supabase: fallbackSupabase,
      server: {
        nodeEnv: env.NODE_ENV,
        port: env.PORT,
        host: env.HOST,
        allowedOrigins: env.ALLOWED_ORIGINS?.split(','),
      },
      claude: env.ANTHROPIC_API_KEY
        ? {
            apiKey: env.ANTHROPIC_API_KEY,
            model: env.CLAUDE_MODEL,
            maxTokensPerSession: env.MAX_TOKENS_PER_SESSION,
          }
        : undefined,
      modo: env.MODO_API_KEY
        ? {
            apiKey: env.MODO_API_KEY,
            webhookSecret: env.MODO_WEBHOOK_SECRET,
          }
        : undefined,
      chatwoot: env.CHATWOOT_API_KEY
        ? {
            apiKey: env.CHATWOOT_API_KEY,
            baseUrl: env.CHATWOOT_BASE_URL,
          }
        : undefined,
      database: {
        encryptionKey: env.DB_ENCRYPTION_KEY,
      },
      logging: {
        level: env.LOG_LEVEL,
      },
    });
  } catch (error) {
    console.error('❌ Error validando configuración:', error);
    if (error instanceof z.ZodError) {
      console.error('Errores específicos:', error.errors);
    }
    throw new Error('Configuración inválida. Revisa tu archivo .env');
  }
}
