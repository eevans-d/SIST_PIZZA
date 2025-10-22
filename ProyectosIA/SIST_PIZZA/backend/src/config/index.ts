import 'dotenv/config';
import { validateConfig } from './validate';

export const config = validateConfig(process.env);

// Helpers para verificar integraciones
export const isDevelopment = config.server.nodeEnv === 'development';
export const isProduction = config.server.nodeEnv === 'production';
export const isTest = config.server.nodeEnv === 'test';

export const isClaudeEnabled = !!config.claude?.apiKey;
export const isModoEnabled = !!config.modo?.apiKey;
export const isChatwootEnabled = !!config.chatwoot?.apiKey;

// Log inicial
console.log('✅ Configuración cargada:', {
  environment: config.server.nodeEnv,
  port: config.server.port,
  supabase: '✓',
  claude: isClaudeEnabled ? '✓' : '✗ (mock)',
  modo: isModoEnabled ? '✓' : '✗ (mock)',
  chatwoot: isChatwootEnabled ? '✓' : '✗ (disabled)',
});

