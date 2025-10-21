import { z } from 'zod';

export const configSchema = z.object({
  supabase: z.object({
    url: z.string().url(),
    anonKey: z.string().min(1),
    serviceRoleKey: z.string().min(1),
  }),
  claude: z.object({
    apiKey: z.string().startsWith('sk-ant-'),
    model: z.string(),
    maxTokensPerSession: z.number().int().positive(),
  }),
  server: z.object({
    nodeEnv: z.enum(['development', 'production', 'test']),
    port: z.number().int().positive(),
    allowedOrigins: z.array(z.string()),
  }),
  database: z.object({
    encryptionKey: z.string().length(32),
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']),
  }),
});

export type Config = z.infer<typeof configSchema>;
