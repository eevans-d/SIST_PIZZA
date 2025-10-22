╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                   🎯 PLAN DE IMPLEMENTACIÓN RÁPIDA DE TESTS                  ║
║                                                                              ║
║                        (Quick Wins - 4 horas totales)                         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
⚡ QUICK WINS - TESTS A IMPLEMENTAR PRIMERO
═══════════════════════════════════════════════════════════════════════════════

Total Effort: 4 horas
Expected Coverage Improvement: 19.8% → 55-60%
Priority: CRÍTICA

═══════════════════════════════════════════════════════════════════════════════
QUICK WIN 1: API ENDPOINT TESTS (60 minutos)
═══════════════════════════════════════════════════════════════════════════════

Crear: backend/src/__tests__/api/webhook.api.test.ts

Objetivo: Test completo del webhook POST /api/webhooks/n8n/pedido

Tests a implementar:

1. ✅ Happy Path Tests (4 tests)
   • Pedido válido básico
   • Múltiples items
   • Con notas
   • Cliente existente (reutilizar)

2. ✅ Validation Tests (4 tests)
   • Teléfono inválido
   • Dirección muy corta
   • Items vacío
   • Item no existe

3. ✅ Response Tests (3 tests)
   • Status 200 + response schema
   • Status 400 + error message
   • Response headers correctos

Total: 11 tests
Time: 60 minutes
Impact: CRITICAL - Frontend + N8N dependency

═══════════════════════════════════════════════════════════════════════════════
QUICK WIN 2: ZOD VALIDATION TESTS (50 minutos)
═══════════════════════════════════════════════════════════════════════════════

Crear: backend/src/__tests__/unit/validation.test.ts

Objetivo: Test Zod schemas de todos los DTOs

Tests a implementar:

1. ✅ pedidoN8NSchema (5 tests)
   • Valid schema
   • Teléfono minLength
   • Dirección minLength
   • Items minLength
   • Origen enum validation

2. ✅ Edge Cases (4 tests)
   • Empty strings
   • Very long strings
   • Special characters
   • Unicode characters

Total: 9 tests
Time: 50 minutes
Impact: HIGH - Data integrity

═══════════════════════════════════════════════════════════════════════════════
QUICK WIN 3: BUSINESS LOGIC TESTS (45 minutos)
═══════════════════════════════════════════════════════════════════════════════

Crear: backend/src/__tests__/unit/business-logic.test.ts

Objetivo: Test lógica de negocios crítica

Tests a implementar:

1. ✅ Cálculos (3 tests)
   • Order total calculation
   • Delivery fee application
   • Subtotal + fee validation

2. ✅ Client Operations (2 tests)
   • Client lookup by phone
   • Auto-name generation

3. ✅ Product Matching (2 tests)
   • Fuzzy matching (ILIKE)
   • Case-insensitive matching

Total: 7 tests
Time: 45 minutes
Impact: HIGH - Core workflows

═══════════════════════════════════════════════════════════════════════════════
QUICK WIN 4: ERROR HANDLING TESTS (35 minutos)
═══════════════════════════════════════════════════════════════════════════════

Crear: backend/src/__tests__/unit/error-handling.test.ts

Objetivo: Test manejo de errores en casos críticos

Tests a implementar:

1. ✅ Database Errors (3 tests)
   • Connection error handling
   • Query timeout
   • Constraint violation

2. ✅ Data Errors (2 tests)
   • Invalid foreign key
   • Null reference handling

Total: 5 tests
Time: 35 minutes
Impact: MEDIUM - Reliability

═══════════════════════════════════════════════════════════════════════════════
QUICK WIN 5: SECURITY TESTS (30 minutos)
═══════════════════════════════════════════════════════════════════════════════

Crear: backend/src/__tests__/unit/security.test.ts

Objetivo: Test seguridad de inputs y PII

Tests a implementar:

1. ✅ Input Sanitization (2 tests)
   • XSS prevention
   • SQL injection prevention

2. ✅ PII Redaction (2 tests)
   • Phone number masking in logs
   • Sensitive data redaction

Total: 4 tests
Time: 30 minutes
Impact: CRITICAL - Security & compliance

═══════════════════════════════════════════════════════════════════════════════
📊 RESUMEN QUICK WINS
═══════════════════════════════════════════════════════════════════════════════

Test Files: 5 new files
Total New Tests: 36 tests

Coverage Improvement:
  Before: 23 tests (19.8%)
  After: 59 tests (50.9%)
  Improvement: +31.1%

Time Investment: 4 hours
ROI: 36 new tests / 4 hours = 9 tests/hour

═══════════════════════════════════════════════════════════════════════════════
🚀 CÓMO IMPLEMENTAR (Paso a Paso)
═══════════════════════════════════════════════════════════════════════════════

PASO 1: Crear estructura de directorios (2 min)
```bash
mkdir -p backend/src/__tests__/{api,unit,integration,fixtures}
```

PASO 2: Instalar herramientas de testing (2 min)
```bash
cd backend
npm install -D supertest @vitest/coverage-v8 jest-mock-extended nock faker
```

PASO 3: Crear test fixtures (10 min)
Archivo: backend/src/__tests__/fixtures/test-data.ts
└─ Contiene mock data reutilizable para todos los tests

PASO 4: Implementar API endpoint tests (60 min)
Archivo: backend/src/__tests__/api/webhook.api.test.ts
└─ Tests de webhook con supertest

PASO 5: Implementar validation tests (50 min)
Archivo: backend/src/__tests__/unit/validation.test.ts
└─ Tests de Zod schemas

PASO 6: Implementar business logic tests (45 min)
Archivo: backend/src/__tests__/unit/business-logic.test.ts
└─ Tests de cálculos y lógica

PASO 7: Implementar error handling tests (35 min)
Archivo: backend/src/__tests__/unit/error-handling.test.ts
└─ Tests de errores

PASO 8: Implementar security tests (30 min)
Archivo: backend/src/__tests__/unit/security.test.ts
└─ Tests de seguridad

PASO 9: Ejecutar todos los tests (5 min)
```bash
npm run test
```

PASO 10: Generar coverage report (3 min)
```bash
npm run test:coverage
```

═══════════════════════════════════════════════════════════════════════════════
💡 EJEMPLO: Estructura de un test file
═══════════════════════════════════════════════════════════════════════════════

```typescript
// backend/src/__tests__/api/webhook.api.test.ts

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server';

describe('POST /api/webhooks/n8n/pedido', () => {
  let app: any;

  beforeAll(() => {
    app = createApp();
  });

  describe('Happy Path', () => {
    it('should create order with valid data', async () => {
      const response = await request(app)
        .post('/api/webhooks/n8n/pedido')
        .send({
          cliente: {
            nombre: 'Test User',
            telefono: '2262401001',
            direccion: 'Calle Test 123'
          },
          items: [
            { nombre: 'Muzzarella', cantidad: 1 }
          ],
          origen: 'whatsapp'
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('pedido_id');
      expect(response.body).toHaveProperty('total');
    });
  });

  describe('Validation', () => {
    it('should reject invalid phone', async () => {
      const response = await request(app)
        .post('/api/webhooks/n8n/pedido')
        .send({
          cliente: {
            nombre: 'Test',
            telefono: '123',  // Too short
            direccion: 'Calle Test 123'
          },
          items: [
            { nombre: 'Muzzarella', cantidad: 1 }
          ],
          origen: 'whatsapp'
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body.error).toContain('Teléfono');
    });
  });
});
```

═══════════════════════════════════════════════════════════════════════════════
⏱️ TIMELINE
═══════════════════════════════════════════════════════════════════════════════

Setup & Config:         5 min
API Tests:             60 min
Validation Tests:      50 min
Business Logic:        45 min
Error Handling:        35 min
Security:              30 min
Coverage Report:        5 min
─────────────────────────────
TOTAL:                 230 min (≈ 4 horas)

═══════════════════════════════════════════════════════════════════════════════
✅ CRITERIA DE ÉXITO
═══════════════════════════════════════════════════════════════════════════════

Después de Quick Wins:
  ✅ 36 nuevos tests implementados
  ✅ Todos los tests PASSING
  ✅ Coverage: 50.9%
  ✅ Webhook endpoint 100% testeado
  ✅ Validación Zod 100% testeada
  ✅ Lógica de negocio crítica testeada
  ✅ Errores críticos manejados
  ✅ Seguridad & PII validados

═══════════════════════════════════════════════════════════════════════════════
📈 PRÓXIMO PASO
═══════════════════════════════════════════════════════════════════════════════

Después de completar Quick Wins, continuar con:

SPRINT COMPLETO (8 horas adicionales):
  1. Integration tests (Supabase, N8N)
  2. Performance tests
  3. Compliance tests
  4. E2E workflows
  5. Coverage → 80%+

═══════════════════════════════════════════════════════════════════════════════
