import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * GRUPO 2: ZOD VALIDATION TESTS (9 tests)
 * Valida que cada campo del schema funciona correctamente
 */

// Replica de schemas desde webhookN8N
const ClienteSchema = z.object({
  nombre: z.string().min(3).max(255),
  telefono: z.string().min(10).max(20),
  direccion: z.string().optional(),
  email: z.string().email().optional(),
  notas: z.string().optional(),
});

const ItemSchema = z.object({
  nombre: z.string().min(1),
  cantidad: z.number().int().positive(),
});

const WebhookPayloadSchema = z.object({
  cliente: ClienteSchema,
  items: z.array(ItemSchema).min(1),
  notas: z.string().optional(),
});

describe('Cliente Schema Validation', () => {
  it('should accept valid cliente data', () => {
    const validCliente = {
      nombre: 'Juan Pérez',
      telefono: '+5491112345678',
      direccion: 'Centro, Calle 123',
      email: 'juan@example.com',
    };

    const result = ClienteSchema.safeParse(validCliente);
    expect(result.success).toBe(true);
  });

  it('should reject nombre with less than 3 characters', () => {
    const invalidCliente = {
      nombre: 'AB',
      telefono: '+5491112345678',
    };

    const result = ClienteSchema.safeParse(invalidCliente);
    expect(result.success).toBe(false);
  });

  it('should reject telefono with less than 10 characters', () => {
    const invalidCliente = {
      nombre: 'Juan Pérez',
      telefono: '123',
    };

    const result = ClienteSchema.safeParse(invalidCliente);
    expect(result.success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const invalidCliente = {
      nombre: 'Juan Pérez',
      telefono: '+5491112345678',
      email: 'not-an-email',
    };

    const result = ClienteSchema.safeParse(invalidCliente);
    expect(result.success).toBe(false);
  });

  it('should accept optional fields as undefined', () => {
    const minimalCliente = {
      nombre: 'Juan Pérez',
      telefono: '+5491112345678',
    };

    const result = ClienteSchema.safeParse(minimalCliente);
    expect(result.success).toBe(true);
  });
});

describe('Item Schema Validation', () => {
  it('should accept valid item data', () => {
    const validItem = {
      nombre: 'Pizza Clásica Grande',
      cantidad: 2,
    };

    const result = ItemSchema.safeParse(validItem);
    expect(result.success).toBe(true);
  });

  it('should reject non-integer cantidad', () => {
    const invalidItem = {
      nombre: 'Pizza Clásica',
      cantidad: 1.5,
    };

    const result = ItemSchema.safeParse(invalidItem);
    expect(result.success).toBe(false);
  });

  it('should reject negative cantidad', () => {
    const invalidItem = {
      nombre: 'Pizza Clásica',
      cantidad: -1,
    };

    const result = ItemSchema.safeParse(invalidItem);
    expect(result.success).toBe(false);
  });

  it('should reject zero cantidad', () => {
    const invalidItem = {
      nombre: 'Pizza Clásica',
      cantidad: 0,
    };

    const result = ItemSchema.safeParse(invalidItem);
    expect(result.success).toBe(false);
  });
});

describe('Webhook Payload Schema Validation', () => {
  it('should accept complete valid payload', () => {
    const validPayload = {
      cliente: {
        nombre: 'Juan Pérez',
        telefono: '+5491112345678',
        direccion: 'Centro',
      },
      items: [
        {
          nombre: 'Pizza Clásica',
          cantidad: 2,
        },
      ],
      notas: 'Sin cebolla',
    };

    const result = WebhookPayloadSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it('should reject empty items array', () => {
    const invalidPayload = {
      cliente: {
        nombre: 'Juan Pérez',
        telefono: '+5491112345678',
      },
      items: [],
    };

    const result = WebhookPayloadSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('should reject missing cliente', () => {
    const invalidPayload = {
      items: [
        {
          nombre: 'Pizza Clásica',
          cantidad: 2,
        },
      ],
    };

    const result = WebhookPayloadSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
  });

  it('should return specific error messages on validation failure', () => {
    const invalidPayload = {
      cliente: {
        nombre: 'AB',
        telefono: '123',
      },
      items: [],
    };

    const result = WebhookPayloadSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.length).toBeGreaterThan(0);
    }
  });
});
