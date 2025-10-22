╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║         🧪 RUTA TESTS - IMPLEMENTAR 36 TESTS (4 HORAS MÁXIMO)              ║
║                                                                              ║
║                  Mejorar cobertura de 19.8% a 50.9%                         ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
📊 PLAN EJECUTIVO
═══════════════════════════════════════════════════════════════════════════════

ESTADO ACTUAL:
├─ Tests: 12/12 pasando ✅
├─ Cobertura: 19.8% (150/755 LOC cubierto)
├─ Archivos no testeados: 7
└─ Tiempo estimado: 4 horas

META:
├─ Tests adicionales: 36
├─ Cobertura: 50.9% (384/755 LOC)
├─ Archivos testeados: 10+
└─ Resultado: Alta confianza en código

═══════════════════════════════════════════════════════════════════════════════
🎯 PLAN DE 36 TESTS - DESGLOSADO
═══════════════════════════════════════════════════════════════════════════════

GRUPO 1: API INTEGRATION TESTS (11 tests) - 1 hora
────────────────────────────────────────

[COMPLETADOS] Ya existen 12 tests de webhook en webhookN8N.test.ts

[NUEVOS - 11 tests]:

1. Health check endpoints
   ├─ GET /health → 200 + status ok
   ├─ GET /api/health → 200 + database ok
   └─ GET /api/health/ready → 200/503 según BD

2. Webhook responses
   ├─ POST /api/webhooks/n8n/pedido con cliente nuevo → 201
   ├─ POST con cliente existente → 201 (no duplica)
   ├─ POST con múltiples items → 201 + comandas correctas
   ├─ POST con envío a Zona Norte → 201 + costo $500
   ├─ POST con envío a Zona Oeste → 201 + costo $700
   ├─ POST con datos inválidos → 400
   └─ POST a BD caída → 500

Archivos a crear:
├─ tests/health.test.ts (3 tests)
├─ tests/integration.test.ts (8 tests)
└─ TOTAL: 11 nuevos

GRUPO 2: ZOD VALIDATION TESTS (9 tests) - 1 hora
────────────────────────────────

Validar cada campo del schema:

3. Cliente schema validation
   ├─ nombre: válido si 3-255 caracteres
   ├─ telefono: válido si 10-20 caracteres
   ├─ telefono: inválido si < 10 o > 20
   ├─ direccion: opcional pero validable
   └─ email: opcional pero si existe debe ser válido

4. Item schema validation
   ├─ nombre: requerido, string
   ├─ cantidad: requerido, entero positivo
   ├─ cantidad: inválido si <= 0
   ├─ cantidad: inválido si no es entero
   └─ items: debe ser array

Archivos a crear:
├─ tests/schemas.test.ts (9 tests)
└─ TOTAL: 9 nuevos

GRUPO 3: BUSINESS LOGIC TESTS (7 tests) - 1 hora
────────────────────────────────

5. Búsqueda de productos (fuzzy matching)
   ├─ "pizza clásica" → Pizza Clásica ✓
   ├─ "pizza especial grande" → Pizza Especial ✓
   ├─ "coca" → Coca Cola ✓
   ├─ "inexistente" → Error ✗
   ├─ Case insensitive test
   └─ Disponibilidad check

6. Cálculo de costos por zona
   ├─ Centro: $300
   ├─ Zona Norte: $500
   ├─ Zona Sur: $600
   ├─ Zona Oeste: $700
   ├─ Zona Este: $550
   ├─ Fallback: $500 si zona no match
   └─ Múltiples items + zona

7. Deduplicación de clientes
   ├─ Teléfono único
   ├─ Cliente nuevo → insert
   ├─ Cliente existente → select (no insert)
   └─ Transacciones atómicas

Archivos a crear:
├─ tests/business-logic.test.ts (7 tests)
└─ TOTAL: 7 nuevos

GRUPO 4: ERROR HANDLING TESTS (5 tests) - 45 min
────────────────────────────

8. Database connection errors
   ├─ Supabase caída → 500
   ├─ Timeout → 500
   ├─ Invalid query → 500
   └─ Connection pool exhausted → 500

9. Input validation errors
   ├─ Empty JSON → 400
   ├─ Invalid JSON → 400
   ├─ Missing required field → 400
   └─ Invalid data type → 400

Archivos a crear:
├─ tests/error-handling.test.ts (5 tests)
└─ TOTAL: 5 nuevos

GRUPO 5: SECURITY TESTS (4 tests) - 30 min
────────────────────────────

10. SQL Injection prevention
    ├─ Input con quotes → sanitizado
    ├─ Input con SQL keywords → sanitizado
    └─ Parameterized queries verificadas

11. PII Redaction en logs
    ├─ Teléfono no en logs
    ├─ Email no en logs
    ├─ Dirección no en logs
    └─ Solo ID en logs

Archivos a crear:
├─ tests/security.test.ts (4 tests)
└─ TOTAL: 4 nuevos

═══════════════════════════════════════════════════════════════════════════════
⏱️ TIMELINE ESTIMADO
═══════════════════════════════════════════════════════════════════════════════

GRUPO 1: API Integration       1 hora
GRUPO 2: Zod Validation        1 hora
GRUPO 3: Business Logic        1 hora
GRUPO 4: Error Handling       45 minutos
GRUPO 5: Security Tests       30 minutos
─────────────────────────────────────
TOTAL:                        ~4 horas (con breaks)

═══════════════════════════════════════════════════════════════════════════════
🚀 CÓMO EMPEZAR
═══════════════════════════════════════════════════════════════════════════════

1. Asegúrate que SQL está ejecutado en Supabase
2. Backend corriendo: npm run dev

3. Corre tests actuales:
   $ npm test

4. Ver cobertura actual:
   $ npm test -- --coverage

5. Vamos a crear los nuevos tests:
   ✓ Yo crearé los archivos .test.ts
   ✓ Tú ejecutas: npm test
   ✓ Verificamos que 36 nuevos pasen

═══════════════════════════════════════════════════════════════════════════════
📁 ESTRUCTURA DE TESTS QUE CREAREMOS
═══════════════════════════════════════════════════════════════════════════════

tests/
├── webhookN8N.test.ts           ✅ EXISTENTE (12 tests)
├── health.test.ts               📝 NUEVO (3 tests)
├── integration.test.ts          📝 NUEVO (8 tests)
├── schemas.test.ts              📝 NUEVO (9 tests)
├── business-logic.test.ts       📝 NUEVO (7 tests)
├── error-handling.test.ts       📝 NUEVO (5 tests)
└── security.test.ts             📝 NUEVO (4 tests)

TOTAL: 12 existentes + 36 nuevos = 48 tests
COBERTURA: 19.8% → 50.9%

═══════════════════════════════════════════════════════════════════════════════
💡 TECNOLOGÍA
═══════════════════════════════════════════════════════════════════════════════

Test Framework: Vitest
Assertion Library: Vitest assertions + Expect
Mocking: Vitest mock
Coverage Reporter: c8 (already configured in vitest.config.ts)

═══════════════════════════════════════════════════════════════════════════════
✨ BENEFICIOS DESPUÉS DE COMPLETAR
═══════════════════════════════════════════════════════════════════════════════

✅ Cobertura 50.9% (muy por encima del 19.8% actual)
✅ Confianza en código - todos los casos cubiertos
✅ Refactoring seguro - si cambias código, tests te avisan
✅ Documentación viva - tests son ejemplos de cómo usar
✅ CI/CD listo - puedes agregar pre-commit hooks
✅ Debugging fácil - encuentra bugs antes de producción

═══════════════════════════════════════════════════════════════════════════════
🎯 SIGUIENTE PASO
═══════════════════════════════════════════════════════════════════════════════

¿Quieres que comience a crear los 36 tests?

Yo crearé:
1. health.test.ts (3 tests)
2. integration.test.ts (8 tests)
3. schemas.test.ts (9 tests)
4. business-logic.test.ts (7 tests)
5. error-handling.test.ts (5 tests)
6. security.test.ts (4 tests)

Tú:
1. Ejecutas: npm test
2. Verificas que 36 nuevos pasen
3. Ejecutas: npm test -- --coverage
4. Ves cobertura subir a ~50.9%

¿VAMOS? 🚀

═══════════════════════════════════════════════════════════════════════════════
