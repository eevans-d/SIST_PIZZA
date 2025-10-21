import 'dotenv/config';
import { configSchema, Config } from './validate';

const rawConfig = {
  supabase: {
    url: process.env.SUPABASE_URL,
    anonKey: process.env.SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY,
    model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
    maxTokensPerSession: parseInt(process.env.MAX_TOKENS_PER_SESSION || '6600', 10),
  },
  server: {
    nodeEnv: process.env.NODE_ENV || 'development',
    port: parseInt(process.env.PORT || '3000', 10),
    allowedOrigins: (process.env.ALLOWED_ORIGINS || '').split(','),
  },
  database: {
    encryptionKey: process.env.DB_ENCRYPTION_KEY || '',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};

// Validar configuración
const result = configSchema.safeParse(rawConfig);

if (!result.success) {
  console.error('❌ Error de configuración:', result.error.format());
  process.exit(1);
}

export const config: Config = result.data;
