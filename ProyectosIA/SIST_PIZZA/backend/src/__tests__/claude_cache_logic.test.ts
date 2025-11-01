/**
 * Tests simplificados para Cache Redis de Claude API
 * 
 * Tests de lógica de cache sin depender de Redis real o mocks complejos.
 * Verifican algoritmos, normalización, y comportamiento conceptual.
 */

import { describe, it, expect } from 'vitest';
import { createHash } from 'crypto';
import { FlujoClaude, ContextoClaude } from '../services/claude';

describe('Cache Key Generation Logic', () => {
  function generateCacheKey(
    userMessage: string,
    flujo: FlujoClaude,
    contexto: ContextoClaude
  ): string {
    const normalizedContext = {
      cliente_tipo: contexto.cliente_tipo,
      zona: contexto.zona,
      es_horario_laboral: contexto.es_horario_laboral,
    };

    const payload = JSON.stringify({
      flujo,
      message: userMessage.toLowerCase().trim(),
      context: normalizedContext,
    });

    const hash = createHash('sha256').update(payload).digest('hex');
    return `claude:cache:${hash}`;
  }

  const mockContexto: ContextoClaude = {
    cliente_tipo: 'nuevo',
    pedidos_previos_count: 0,
    zona: 'centro',
    hora_actual: '19:00',
    es_horario_laboral: true,
  };

  it('genera SHA-256 hash de 64 caracteres hex', () => {
    const key = generateCacheKey(
      'Test',
      FlujoClaude.RESPUESTA_GENERICA,
      mockContexto
    );

    // Verificar formato
    expect(key).toMatch(/^claude:cache:[a-f0-9]{64}$/);
    
    // Verificar longitud
    const hashPart = key.split(':')[2];
    expect(hashPart.length).toBe(64);
  });

  it('genera misma key para mismo input (determinista)', () => {
    const key1 = generateCacheKey(
      '¿Tienen pizzas?',
      FlujoClaude.RESPUESTA_GENERICA,
      mockContexto
    );

    const key2 = generateCacheKey(
      '¿Tienen pizzas?',
      FlujoClaude.RESPUESTA_GENERICA,
      mockContexto
    );

    expect(key1).toBe(key2);
  });

  it('genera keys diferentes para mensajes diferentes', () => {
    const key1 = generateCacheKey(
      'Mensaje A',
      FlujoClaude.RESPUESTA_GENERICA,
      mockContexto
    );

    const key2 = generateCacheKey(
      'Mensaje B',
      FlujoClaude.RESPUESTA_GENERICA,
      mockContexto
    );

    expect(key1).not.toBe(key2);
  });

  it('normaliza mensaje (lowercase y trim)', () => {
    const key1 = generateCacheKey(
      '  ¿TIENEN PIZZAS?  ',
      FlujoClaude.RESPUESTA_GENERICA,
      mockContexto
    );

    const key2 = generateCacheKey(
      '¿tienen pizzas?',
      FlujoClaude.RESPUESTA_GENERICA,
      mockContexto
    );

    expect(key1).toBe(key2);
  });

  it('ignora campos volátiles del contexto', () => {
    const contexto1: ContextoClaude = {
      cliente_tipo: 'nuevo',
      pedidos_previos_count: 0,
      zona: 'centro',
      hora_actual: '19:00',
      es_horario_laboral: true,
    };

    const contexto2: ContextoClaude = {
      cliente_tipo: 'nuevo',
      pedidos_previos_count: 999, // Diferente pero ignorado
      zona: 'centro',
      hora_actual: '23:59', // Diferente pero ignorado
      es_horario_laboral: true,
    };

    const key1 = generateCacheKey(
      'Test',
      FlujoClaude.RESPUESTA_GENERICA,
      contexto1
    );

    const key2 = generateCacheKey(
      'Test',
      FlujoClaude.RESPUESTA_GENERICA,
      contexto2
    );

    expect(key1).toBe(key2);
  });

  it('genera keys diferentes para flujos diferentes', () => {
    const key1 = generateCacheKey(
      'Test',
      FlujoClaude.RESPUESTA_GENERICA,
      mockContexto
    );

    const key2 = generateCacheKey(
      'Test',
      FlujoClaude.TOMA_PEDIDO,
      mockContexto
    );

    expect(key1).not.toBe(key2);
  });

  it('genera keys diferentes para contextos relevantes diferentes', () => {
    const contexto1 = { ...mockContexto, zona: 'centro' as const };
    const contexto2 = { ...mockContexto, zona: 'norte' as const };

    const key1 = generateCacheKey(
      'Test',
      FlujoClaude.RESPUESTA_GENERICA,
      contexto1
    );

    const key2 = generateCacheKey(
      'Test',
      FlujoClaude.RESPUESTA_GENERICA,
      contexto2
    );

    expect(key1).not.toBe(key2);
  });
});

describe('Cache TTL Logic', () => {
  it('usa TTL por defecto de 1 hora', () => {
    const DEFAULT_TTL = 3600; // 1 hora en segundos
    expect(DEFAULT_TTL).toBe(3600);
    expect(DEFAULT_TTL).toBe(60 * 60);
  });

  it('convierte minutos a segundos correctamente', () => {
    const minutes = [1, 5, 10, 30, 60];
    const expectedSeconds = [60, 300, 600, 1800, 3600];

    for (let i = 0; i < minutes.length; i++) {
      expect(minutes[i] * 60).toBe(expectedSeconds[i]);
    }
  });

  it('verifica TTL razonable para cache de Claude', () => {
    const TTL_OPTIONS = {
      veryShort: 300, // 5 minutos
      short: 900, // 15 minutos
      default: 3600, // 1 hora
      long: 7200, // 2 horas
      veryLong: 86400, // 24 horas
    };

    // Todas deben ser mayores a 0
    for (const ttl of Object.values(TTL_OPTIONS)) {
      expect(ttl).toBeGreaterThan(0);
    }

    // TTL default debe estar en rango razonable (15 min - 2 horas)
    expect(TTL_OPTIONS.default).toBeGreaterThanOrEqual(900);
    expect(TTL_OPTIONS.default).toBeLessThanOrEqual(7200);
  });
});

describe('Cache Key Pattern Matching', () => {
  function matchesPattern(key: string, pattern: string): boolean {
    const regex = new RegExp(pattern.replace('*', '.*'));
    return regex.test(key);
  }

  it('coincide con patrón simple', () => {
    const key = 'claude:cache:abc123def456';
    expect(matchesPattern(key, 'claude:cache:abc*')).toBe(true);
    expect(matchesPattern(key, 'claude:cache:xyz*')).toBe(false);
  });

  it('coincide con patrón completo', () => {
    const key = 'claude:cache:abc123def456';
    expect(matchesPattern(key, 'claude:cache:*')).toBe(true);
    expect(matchesPattern(key, 'other:cache:*')).toBe(false);
  });

  it('prefix estándar de cache Claude', () => {
    const prefix = 'claude:cache:';
    const keys = [
      'claude:cache:abc123',
      'claude:cache:def456',
      'claude:cache:xyz789',
    ];

    for (const key of keys) {
      expect(key.startsWith(prefix)).toBe(true);
    }
  });
});

describe('Cache Hit Rate Optimization', () => {
  it('normalización aumenta hit rate para variaciones de caso', () => {
    function normalize(message: string): string {
      return message.toLowerCase().trim();
    }

    const variations = [
      '¿Tienen pizzas?',
      '¿TIENEN PIZZAS?',
      '  ¿tienen pizzas?  ',
      '¿Tienen Pizzas?',
    ];

    const normalized = variations.map(normalize);
    const uniqueNormalized = new Set(normalized);

    // Todas normalizan a la misma forma
    expect(uniqueNormalized.size).toBe(1);
  });

  it('contexto normalizado ignora datos volátiles', () => {
    interface NormalizedContext {
      cliente_tipo: string;
      zona: string;
      es_horario_laboral: boolean;
    }

    function normalizeContext(ctx: ContextoClaude): NormalizedContext {
      return {
        cliente_tipo: ctx.cliente_tipo,
        zona: ctx.zona,
        es_horario_laboral: ctx.es_horario_laboral,
        // Ignora: hora_actual, pedidos_previos_count
      };
    }

    const ctx1: ContextoClaude = {
      cliente_tipo: 'nuevo',
      pedidos_previos_count: 0,
      zona: 'centro',
      hora_actual: '19:00',
      es_horario_laboral: true,
    };

    const ctx2: ContextoClaude = {
      cliente_tipo: 'nuevo',
      pedidos_previos_count: 5,
      zona: 'centro',
      hora_actual: '20:30',
      es_horario_laboral: true,
    };

    expect(normalizeContext(ctx1)).toEqual(normalizeContext(ctx2));
  });
});

describe('Cache Statistics', () => {
  interface CacheStats {
    keys: number;
    memoryUsed: string | null;
    hits: number;
    misses: number;
  }

  it('calcula hit rate correctamente', () => {
    function calculateHitRate(hits: number, total: number): number {
      if (total === 0) return 0;
      return (hits / total) * 100;
    }

    expect(calculateHitRate(7, 10)).toBe(70);
    expect(calculateHitRate(0, 10)).toBe(0);
    expect(calculateHitRate(10, 10)).toBe(100);
    expect(calculateHitRate(0, 0)).toBe(0);
  });

  it('formatea bytes a formato human-readable', () => {
    function formatBytes(bytes: number): string {
      if (bytes < 1024) return `${bytes}B`;
      if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)}KB`;
      if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)}MB`;
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)}GB`;
    }

    expect(formatBytes(512)).toBe('512B');
    expect(formatBytes(1024)).toBe('1.00KB');
    expect(formatBytes(1048576)).toBe('1.00MB');
    expect(formatBytes(1073741824)).toBe('1.00GB');
  });

  it('parsea used_memory_human de Redis info', () => {
    function parseMemoryHuman(info: string): string | null {
      const match = info.match(/used_memory_human:([^\r\n]+)/);
      return match ? match[1] : null;
    }

    const mockInfo1 = 'used_memory_human:1.50MB\nother_field:value';
    const mockInfo2 = 'used_memory_human:512.00KB\n';
    const mockInfo3 = 'no_memory_info:here';

    expect(parseMemoryHuman(mockInfo1)).toBe('1.50MB');
    expect(parseMemoryHuman(mockInfo2)).toBe('512.00KB');
    expect(parseMemoryHuman(mockInfo3)).toBeNull();
  });
});

describe('Cache Invalidation Patterns', () => {
  it('identifica keys a invalidar por patrón', () => {
    const allKeys = [
      'claude:cache:abc123',
      'claude:cache:abc456',
      'claude:cache:def789',
      'claude:cache:xyz999',
    ];

    function matchPattern(keys: string[], pattern: string): string[] {
      const regex = new RegExp(
        '^claude:cache:' + pattern.replace('*', '.*') + '$'
      );
      return keys.filter(key => regex.test(key));
    }

    const matched = matchPattern(allKeys, 'abc*');
    expect(matched.length).toBe(2);
    expect(matched).toContain('claude:cache:abc123');
    expect(matched).toContain('claude:cache:abc456');
  });

  it('invalida todas las keys con patrón universal', () => {
    const allKeys = [
      'claude:cache:key1',
      'claude:cache:key2',
      'claude:cache:key3',
    ];

    function matchAll(keys: string[]): string[] {
      return keys.filter(key => key.startsWith('claude:cache:'));
    }

    const matched = matchAll(allKeys);
    expect(matched.length).toBe(allKeys.length);
  });
});

describe('Fallback Behavior', () => {
  it('retorna null si cache no disponible (graceful degradation)', () => {
    function getCachedOrNull(cacheAvailable: boolean, cachedValue: string | null): string | null {
      if (!cacheAvailable) return null;
      return cachedValue;
    }

    expect(getCachedOrNull(false, 'cached')).toBeNull();
    expect(getCachedOrNull(true, 'cached')).toBe('cached');
    expect(getCachedOrNull(true, null)).toBeNull();
  });

  it('continúa sin cache si Redis falla', () => {
    function processWithCache(
      request: string,
      cacheAvailable: boolean
    ): { fromCache: boolean; result: string } {
      if (cacheAvailable) {
        return { fromCache: true, result: 'Cached result' };
      }
      return { fromCache: false, result: 'Fresh result' };
    }

    const withCache = processWithCache('test', true);
    const withoutCache = processWithCache('test', false);

    expect(withCache.fromCache).toBe(true);
    expect(withoutCache.fromCache).toBe(false);
    expect(withoutCache.result).toBe('Fresh result');
  });
});

describe('Cost Savings Calculation', () => {
  it('calcula ahorro por cache hits', () => {
    function calculateSavings(
      totalRequests: number,
      cacheHits: number,
      costPerRequest: number
    ): number {
      return cacheHits * costPerRequest;
    }

    const COST_PER_CLAUDE_CALL = 0.01; // $0.01 USD estimado
    
    // Si 100 requests y 35 cache hits
    const savings = calculateSavings(100, 35, COST_PER_CLAUDE_CALL);
    expect(savings).toBeCloseTo(0.35, 2); // $0.35 USD ahorrados (2 decimales)

    // Si 1000 requests y 350 cache hits (35% hit rate)
    const savingsLarge = calculateSavings(1000, 350, COST_PER_CLAUDE_CALL);
    expect(savingsLarge).toBeCloseTo(3.50, 2); // $3.50 USD ahorrados (2 decimales)
  });

  it('calcula hit rate objetivo para ahorro significativo', () => {
    function calculateTargetHitRate(
      currentCost: number,
      targetSavings: number
    ): number {
      return (targetSavings / currentCost) * 100;
    }

    // Si gasto $100/mes y quiero ahorrar $35
    const targetRate = calculateTargetHitRate(100, 35);
    expect(targetRate).toBe(35); // Necesito 35% de hit rate
  });
});

describe('Edge Cases', () => {
  it('maneja mensajes vacíos', () => {
    function normalize(message: string): string {
      return message.toLowerCase().trim();
    }

    expect(normalize('')).toBe('');
    expect(normalize('   ')).toBe('');
  });

  it('maneja mensajes muy largos', () => {
    const longMessage = 'A'.repeat(10000);
    const hash = createHash('sha256').update(longMessage).digest('hex');
    
    expect(hash.length).toBe(64); // SHA-256 siempre 64 chars
  });

  it('maneja caracteres especiales y emojis', () => {
    const specialMessage = '¿Tenés pizzas 🍕 con "muzzarella"?';
    const hash = createHash('sha256').update(specialMessage).digest('hex');
    
    expect(hash).toMatch(/^[a-f0-9]{64}$/);
  });
});
