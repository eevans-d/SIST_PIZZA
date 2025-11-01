/**
 * 🧠 Cache de respuestas Claude con Redis
 * - Reduce costos de API evitando llamadas repetidas
 * - TTL de 1 hora para respuestas comunes
 * - Hash SHA-256 de (flujo + mensaje + contexto) como key
 */

import { createHash } from 'crypto';
import { safeLogger } from '../lib/logger';
import type { FlujoClaude, ContextoClaude } from './claude';

/**
 * Cliente Redis lazy-loaded
 */
let redisClient: any = null;

function getRedisClient() {
  if (redisClient) {
    return redisClient;
  }

  if (!process.env.REDIS_URL) {
    safeLogger.warn('Redis URL not configured, cache disabled');
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Redis = require('ioredis');
    redisClient = new Redis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
    });

    redisClient.on('error', (error: Error) => {
      safeLogger.error('Redis cache error', { error: error.message });
    });

    redisClient.on('connect', () => {
      safeLogger.info('Redis cache connected');
    });

    // Conectar de forma asíncrona
    redisClient.connect().catch((error: Error) => {
      safeLogger.error('Redis cache connection failed', { error: error.message });
      redisClient = null;
    });

    return redisClient;
  } catch (error) {
    safeLogger.error('Redis cache initialization failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Generar key de cache a partir de parámetros
 */
export function generateCacheKey(
  userMessage: string,
  flujo: FlujoClaude,
  contexto: ContextoClaude
): string {
  // Normalizar contexto para cache (sin datos volátiles como hora exacta)
  const normalizedContext = {
    cliente_tipo: contexto.cliente_tipo,
    zona: contexto.zona,
    es_horario_laboral: contexto.es_horario_laboral,
    // Ignorar hora_actual y pedidos_previos_count para aumentar hit rate
  };

  const payload = JSON.stringify({
    flujo,
    message: userMessage.toLowerCase().trim(),
    context: normalizedContext,
  });

  const hash = createHash('sha256').update(payload).digest('hex');
  return `claude:cache:${hash}`;
}

/**
 * Obtener respuesta de cache
 */
export async function getCachedResponse(
  userMessage: string,
  flujo: FlujoClaude,
  contexto: ContextoClaude
): Promise<string | null> {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const key = generateCacheKey(userMessage, flujo, contexto);
    const cached = await client.get(key);

    if (cached) {
      safeLogger.info('Claude cache hit', { flujo, key: key.slice(0, 32) });
      return cached;
    }

    return null;
  } catch (error) {
    safeLogger.error('Error reading Claude cache', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Guardar respuesta en cache
 */
export async function setCachedResponse(
  userMessage: string,
  flujo: FlujoClaude,
  contexto: ContextoClaude,
  response: string,
  ttlSeconds: number = 3600 // 1 hora por defecto
): Promise<void> {
  const client = getRedisClient();
  if (!client) {
    return;
  }

  try {
    const key = generateCacheKey(userMessage, flujo, contexto);
    await client.setex(key, ttlSeconds, response);

    safeLogger.info('Claude response cached', {
      flujo,
      key: key.slice(0, 32),
      ttl: ttlSeconds,
    });
  } catch (error) {
    safeLogger.error('Error writing Claude cache', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Invalidar cache por patrón
 */
export async function invalidateCachePattern(pattern: string): Promise<number> {
  const client = getRedisClient();
  if (!client) {
    return 0;
  }

  try {
    const keys = await client.keys(`claude:cache:${pattern}*`);
    if (keys.length === 0) {
      return 0;
    }

    const deleted = await client.del(...keys);
    safeLogger.info('Claude cache invalidated', { pattern, deleted });
    return deleted;
  } catch (error) {
    safeLogger.error('Error invalidating Claude cache', {
      error: error instanceof Error ? error.message : String(error),
    });
    return 0;
  }
}

/**
 * Obtener estadísticas de cache
 */
export async function getCacheStats(): Promise<{
  keys: number;
  memoryUsed: string | null;
  hits: number;
  misses: number;
} | null> {
  const client = getRedisClient();
  if (!client) {
    return null;
  }

  try {
    const keys = await client.keys('claude:cache:*');
    const info = await client.info('memory');
    
    // Parsear used_memory de info
    const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
    const memoryUsed = memoryMatch ? memoryMatch[1] : null;

    return {
      keys: keys.length,
      memoryUsed,
      hits: 0, // TODO: Implementar contadores
      misses: 0,
    };
  } catch (error) {
    safeLogger.error('Error getting Claude cache stats', {
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}
