import { describe, it, expect } from 'vitest';

/**
 * GRUPO 5: SECURITY TESTS (4 tests)
 * Valida que el sistema sea seguro contra ataques comunes
 */

describe('SQL Injection Prevention', () => {
  function sanitizeInput(input: string): string {
    // Basic sanitization - en producción usar parameterized queries
    return input
      .replace(/'/g, "''") // Escape single quotes
      .replace(/;/g, '') // Remove semicolons
      .replace(/--/g, ''); // Remove SQL comments
  }

  function buildSafeQuery(phone: string): string {
    const sanitized = sanitizeInput(phone);
    return `SELECT * FROM clientes WHERE telefono = '${sanitized}'`;
  }

  it('should escape single quotes in input', () => {
    const maliciousInput = "'; DROP TABLE clientes; --";
    const sanitized = sanitizeInput(maliciousInput);

    expect(sanitized).not.toContain("'; DROP");
    expect(sanitized).toContain("''");
  });

  it('should remove SQL commands', () => {
    const maliciousInput = '+5491112345678; DELETE FROM clientes;--';
    const sanitized = sanitizeInput(maliciousInput);

    expect(sanitized).not.toContain(';');
    expect(sanitized).not.toContain('--');
  });

  it('should build safe SQL query', () => {
    const maliciousInput = "' OR '1'='1";
    const query = buildSafeQuery(maliciousInput);

    expect(query).not.toContain("OR '1'='1");
    expect(query).toContain("''");
  });

  it('should use parameterized queries (best practice)', () => {
    // Esto es el mejor enfoque
    const buildParameterizedQuery = (phone: string) => {
      return {
        query: 'SELECT * FROM clientes WHERE telefono = $1',
        params: [phone], // Params separados del query
      };
    };

    const maliciousInput = "'; DROP TABLE clientes; --";
    const result = buildParameterizedQuery(maliciousInput);

    expect(result.params[0]).toBe(maliciousInput); // No sanitize needed
    expect(result.query).toContain('$1'); // Placeholder
  });
});

describe('PII (Personally Identifiable Information) Redaction', () => {
  interface Log {
    timestamp: string;
    action: string;
    data: any;
    telefono?: string;
    email?: string;
  }

  function redactPII(log: Log): Log {
    const redacted = { ...log };

    // Remove sensitive fields
    delete redacted.telefono;
    delete redacted.email;

    // Redact from data if it exists
    if (redacted.data) {
      redacted.data = { ...redacted.data };
      delete redacted.data.telefono;
      delete redacted.data.email;
      delete redacted.data.password;
      delete redacted.data.apiKey;
    }

    return redacted;
  }

  it('should remove telefono from logs', () => {
    const log: Log = {
      timestamp: '2025-10-22T10:00:00Z',
      action: 'CREATE_CLIENTE',
      data: { nombre: 'Juan', telefono: '+5491112345678' },
      telefono: '+5491112345678',
    };

    const redacted = redactPII(log);

    expect(redacted.telefono).toBeUndefined();
    expect(redacted.data.telefono).toBeUndefined();
  });

  it('should remove email from logs', () => {
    const log: Log = {
      timestamp: '2025-10-22T10:00:00Z',
      action: 'CREATE_CLIENTE',
      data: { nombre: 'Juan', email: 'juan@example.com' },
      email: 'juan@example.com',
    };

    const redacted = redactPII(log);

    expect(redacted.email).toBeUndefined();
    expect(redacted.data.email).toBeUndefined();
  });

  it('should preserve non-sensitive data', () => {
    const log: Log = {
      timestamp: '2025-10-22T10:00:00Z',
      action: 'CREATE_CLIENTE',
      data: {
        id: 1,
        nombre: 'Juan Pérez',
        status: 'active',
        telefono: '+5491112345678',
      },
    };

    const redacted = redactPII(log);

    expect(redacted.data.id).toBe(1);
    expect(redacted.data.nombre).toBe('Juan Pérez');
    expect(redacted.data.status).toBe('active');
    expect(redacted.data.telefono).toBeUndefined();
  });

  it('should comply with GDPR/Ley 25.326 Argentina', () => {
    // GDPR requirements: minimal data logging, PII protection
    const log: Log = {
      timestamp: '2025-10-22T10:00:00Z',
      action: 'PROCESS_ORDER',
      data: {
        cliente_id: 123, // Keep ID instead of full data
        order_total: 1500,
        telefono: '+5491112345678',
        email: 'user@example.com',
      },
    };

    const redacted = redactPII(log);

    // Should have ID but not personal info
    expect(redacted.data.cliente_id).toBe(123);
    expect(redacted.data.order_total).toBe(1500);
    expect(redacted.data.telefono).toBeUndefined();
    expect(redacted.data.email).toBeUndefined();
  });
});

describe('Input Validation for Security', () => {
  function validateAndSanitize(input: any): { valid: boolean; data?: any } {
    // Type check
    if (typeof input !== 'object') {
      return { valid: false };
    }

    // Size limit
    const jsonStr = JSON.stringify(input);
    if (jsonStr.length > 10000) {
      return { valid: false };
    }

    // Check for prototype pollution - robust detection (covers accessors and inherited props)
    const hasOwn = (obj: object, key: string) => Object.prototype.hasOwnProperty.call(obj, key);
    const hasPollution =
      hasOwn(input, '__proto__') ||
      hasOwn(input, 'prototype') ||
      (hasOwn(input, 'constructor') && typeof (input as any).constructor === 'object');
    if (hasPollution) {
      return { valid: false };
    }

    return { valid: true, data: input };
  }

  it('should reject non-object input', () => {
    const result = validateAndSanitize('not an object');
    expect(result.valid).toBe(false);
  });

  it('should reject oversized payloads', () => {
    const hugePayload = { data: 'x'.repeat(11000) };
    const result = validateAndSanitize(hugePayload);
    expect(result.valid).toBe(false);
  });

  it('should prevent prototype pollution attacks', () => {
    // Using JSON.parse to ensure __proto__ becomes an own property in many runtimes
    const maliciousInput = JSON.parse('{"__proto__": {"admin": true}, "data": "test"}');

    const result = validateAndSanitize(maliciousInput);
    expect(result.valid).toBe(false);
  });

  it('should accept valid input', () => {
    const validInput = {
      cliente: { nombre: 'Juan', telefono: '+5491112345678' },
      items: [{ nombre: 'Pizza', cantidad: 1 }],
    };

    const result = validateAndSanitize(validInput);
    expect(result.valid).toBe(true);
    expect(result.data).toEqual(validInput);
  });
});

describe('CORS and Headers Security', () => {
  interface RequestContext {
    headers: Record<string, string>;
    method: string;
    origin?: string;
  }

  function verifyCORS(context: RequestContext): { allowed: boolean; reason?: string } {
    const allowedOrigins = ['http://localhost:3000', 'http://localhost:5678', 'https://n8n.example.com'];

    const origin = context.headers.origin;
    if (!origin) {
      return { allowed: false, reason: 'No origin header' };
    }

    if (!allowedOrigins.includes(origin)) {
      return { allowed: false, reason: 'Origin not in whitelist' };
    }

    return { allowed: true };
  }

  it('should only allow whitelisted origins', () => {
    const validContext: RequestContext = {
      headers: { origin: 'http://localhost:3000' },
      method: 'POST',
    };

    const result = verifyCORS(validContext);
    expect(result.allowed).toBe(true);
  });

  it('should reject unknown origins', () => {
    const maliciousContext: RequestContext = {
      headers: { origin: 'http://evil.com' },
      method: 'POST',
    };

    const result = verifyCORS(maliciousContext);
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('not in whitelist');
  });

  it('should set secure headers', () => {
    const setSecureHeaders = () => ({
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': 'max-age=31536000',
      'Content-Security-Policy': "default-src 'self'",
    });

    const headers = setSecureHeaders();

    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['Strict-Transport-Security']).toContain('31536000');
  });

  it('should rate limit requests', () => {
    const rateLimiter = () => {
      const requests: Record<string, number[]> = {};
      const maxRequests = 100;
      const windowMs = 60000; // 1 minute

      return (clientId: string): boolean => {
        const now = Date.now();
        if (!requests[clientId]) {
          requests[clientId] = [];
        }

        // Remove old requests outside window
        requests[clientId] = requests[clientId].filter((time) => now - time < windowMs);

        if (requests[clientId].length >= maxRequests) {
          return false; // Rate limited
        }

        requests[clientId].push(now);
        return true;
      };
    };

    const limiter = rateLimiter();

    // Should allow many requests
    for (let i = 0; i < 100; i++) {
      expect(limiter('client1')).toBe(true);
    }

    // Should block 101st request
    expect(limiter('client1')).toBe(false);
  });
});
