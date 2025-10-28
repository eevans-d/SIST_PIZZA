# Pruebas de Contrato (API Backend)

Estas pruebas verifican contratos mínimos de la API sin depender de Supabase real.

## Suites incluidas
- metrics_rate_limit.test.ts
- api_endpoints.test.ts
- menu_admin.test.ts
- patch_pedidos_schema.test.ts
- supabase_mocks.test.ts

## Cómo ejecutar

```bash
cd ProyectosIA/SIST_PIZZA/backend
npm test -- --run
```

## Notas
- Para E2E reales, levantar stack Docker y usar datos del seed SQL.
- Para CI, se recomienda ejecutar estas pruebas rápidas y luego pruebas con mocks.
