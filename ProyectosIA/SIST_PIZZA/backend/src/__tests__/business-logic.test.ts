import { describe, it, expect } from 'vitest';

/**
 * GRUPO 3: BUSINESS LOGIC TESTS (7 tests)
 * Valida cálculos, búsquedas, y lógica de negocio
 */

describe('Fuzzy Product Matching', () => {
  const menuItems = [
    { id: 1, nombre: 'Pizza Clásica', precio: 800, disponible: true },
    { id: 2, nombre: 'Pizza Especial', precio: 950, disponible: true },
    { id: 3, nombre: 'Pizza Hawaiana', precio: 950, disponible: false },
    { id: 4, nombre: 'Coca Cola', precio: 150, disponible: true },
    { id: 5, nombre: 'Sprite', precio: 150, disponible: true },
  ];

  function findProductFuzzy(name: string): any {
    const searchTerm = name.toLowerCase();
    return menuItems.find(
      (item) =>
        item.disponible &&
        item.nombre.toLowerCase().includes(searchTerm)
    );
  }

  it('should find "pizza clásica" in menu', () => {
    const result = findProductFuzzy('pizza clásica');
    expect(result).toBeDefined();
    expect(result?.nombre).toBe('Pizza Clásica');
    expect(result?.precio).toBe(800);
  });

  it('should find "pizza especial" even with extra words', () => {
    const result = findProductFuzzy('especial');
    expect(result).toBeDefined();
    expect(result?.nombre).toBe('Pizza Especial');
  });

  it('should find "coca" from full name Coca Cola', () => {
    const result = findProductFuzzy('coca');
    expect(result).toBeDefined();
    expect(result?.nombre).toBe('Coca Cola');
    expect(result?.precio).toBe(150);
  });

  it('should return undefined for non-existent product', () => {
    const result = findProductFuzzy('pizza de dragón');
    expect(result).toBeUndefined();
  });

  it('should not find unavailable products', () => {
    const result = findProductFuzzy('hawaiana');
    expect(result).toBeUndefined();
  });

  it('should be case insensitive', () => {
    const result1 = findProductFuzzy('PIZZA CLÁSICA');
    const result2 = findProductFuzzy('pizza clásica');
    expect(result1?.id).toBe(result2?.id);
  });
});

describe('Dynamic Shipping Cost by Zone', () => {
  const zonas = [
    { nombre: 'Centro', palabras_clave: 'centro,downtown,city', costo_base: 300 },
    { nombre: 'Zona Norte', palabras_clave: 'norte,san isidro,pilar', costo_base: 500 },
    { nombre: 'Zona Sur', palabras_clave: 'sur,avellaneda,quilmes', costo_base: 600 },
    { nombre: 'Zona Oeste', palabras_clave: 'oeste,moreno,merlo', costo_base: 700 },
    { nombre: 'Zona Este', palabras_clave: 'este,flores,caballito', costo_base: 550 },
  ];

  function findZoneCost(address: string): number {
    const addressLower = address.toLowerCase();
    const zona = zonas.find((z) =>
      z.palabras_clave
        .split(',')
        .some((palabra) => addressLower.includes(palabra.trim()))
    );
    return zona?.costo_base || 500; // default $500
  }

  it('should return $300 for Centro', () => {
    const cost = findZoneCost('Centro, Calle 123');
    expect(cost).toBe(300);
  });

  it('should return $500 for Zona Norte', () => {
    const cost = findZoneCost('San Isidro, Avenida Bartolomé Mitre');
    expect(cost).toBe(500);
  });

  it('should return $600 for Zona Sur', () => {
    const cost = findZoneCost('Avellaneda, Ruta 9');
    expect(cost).toBe(600);
  });

  it('should return $700 for Zona Oeste', () => {
    const cost = findZoneCost('Moreno, Camino de Cintura');
    expect(cost).toBe(700);
  });

  it('should return default $500 if no zone matches', () => {
    const cost = findZoneCost('Ubicación desconocida');
    expect(cost).toBe(500);
  });

  it('should be case insensitive for zone matching', () => {
    const cost1 = findZoneCost('CENTRO');
    const cost2 = findZoneCost('Centro');
    expect(cost1).toBe(cost2);
    expect(cost1).toBe(300);
  });
});

describe('Client Deduplication', () => {
  const clients: Record<string, any> = {};

  function findOrCreateClient(phone: string, name: string) {
    if (clients[phone]) {
      return { ...clients[phone], isNew: false };
    }

    const newClient = { id: Object.keys(clients).length + 1, phone, name };
    clients[phone] = newClient;
    return { ...newClient, isNew: true };
  }

  it('should create new client for new phone', () => {
    const result = findOrCreateClient('+5491112345678', 'Juan Pérez');
    expect(result.isNew).toBe(true);
    expect(result.id).toBe(1);
  });

  it('should reuse existing client with same phone', () => {
    findOrCreateClient('+5491112345678', 'Juan Pérez'); // Create first
    const result = findOrCreateClient('+5491112345678', 'Juan Pérez'); // Try again
    expect(result.isNew).toBe(false);
    expect(result.id).toBe(1); // Same ID
  });

  it('should create different clients for different phones', () => {
    const result1 = findOrCreateClient('+5491198765432', 'María García');
    const result2 = findOrCreateClient('+5491165432109', 'Carlos López');
    expect(result1.id).not.toBe(result2.id);
  });

  it('should enforce UNIQUE phone constraint', () => {
    const result1 = findOrCreateClient('+5491111111111', 'Cliente A');
    const result2 = findOrCreateClient('+5491111111111', 'Cliente B');
    // Mismo teléfono = misma entrada, no duplicada
    expect(result1.id).toBe(result2.id);
    expect(result2.isNew).toBe(false);
  });
});

describe('Order Total Calculation', () => {
  function calculateOrderTotal(items: any[], shippingCost: number): number {
    const subtotal = items.reduce((sum, item) => sum + item.precio * item.cantidad, 0);
    return subtotal + shippingCost;
  }

  it('should calculate single item order', () => {
    const items = [{ precio: 800, cantidad: 1 }];
    const total = calculateOrderTotal(items, 300);
    expect(total).toBe(1100);
  });

  it('should calculate multiple items', () => {
    const items = [
      { precio: 800, cantidad: 2 },
      { precio: 150, cantidad: 3 },
    ];
    const total = calculateOrderTotal(items, 500);
    // (800*2) + (150*3) + 500 = 1600 + 450 + 500 = 2550
    expect(total).toBe(2550);
  });

  it('should include shipping cost in total', () => {
    const items = [{ precio: 1000, cantidad: 1 }];
    const shippingCosts = [300, 500, 600, 700, 550];

    for (const shipping of shippingCosts) {
      const total = calculateOrderTotal(items, shipping);
      expect(total).toBe(1000 + shipping);
    }
  });

  it('should handle zero items and only shipping', () => {
    const items: any[] = [];
    const total = calculateOrderTotal(items, 300);
    expect(total).toBe(300);
  });
});
