# Hoja de Ruta — Blueprint Ejecutable (SIST_PIZZA)

Fecha: 2025-10-30  
Estado actual: Fase 0 (baseline) y Fase 1 (CI gates) completadas

---

## Objetivo
Entregar un POS gastronómico operativo (estilo Fudo) con foco en: velocidad de operación (P95 < 200 ms en acciones POS), caja confiable, KDS fluido, y calidad continua (CI/CD con gates). Esta hoja de ruta define fases, tareas, criterios de aceptación, KPIs, dependencias, riesgos y Definition of Done (DoD).

---

## Métricas globales (KPIs/SLAs)
- UX/Velocidad: P95 de acciones POS < 200 ms; render inicial POS < 1 s (cold) / < 400 ms (warm)
- Estabilidad: errores UI < 0.5%; 5xx backend < 0.1%
- Disponibilidad: 99.5% (mínimo) en staging/prod
- Calidad: lint/typecheck 100% verdes; cobertura backend ≥ 60% (Fase 2), ≥ 75% (Fase 5), ≥ 80% (Fase 7)
- Seguridad: 0 vulnerabilidades “high” en deps prod; SAST/CodeQL sin findings críticos

---

## Fase 0 — Baseline y visibilidad (COMPLETADO)
- Scripts y reporte baseline: latencias `/health`, `/api/health`, webhook
- Diagrama de arquitectura
- DoD: CSV y reporte en `docs/pre-deploy/baseline/`, ejecución documentada

## Fase 1 — CI Gates mínimos (COMPLETADO)
- Backend: typecheck bloqueante, `npm audit` (prod/high) bloqueante, lint advisory
- Frontend: type-check bloqueante, lint bloqueante, `npm audit` (prod/high) bloqueante
- DoD: CI verde en `main` con gates activos

---

## Fase 2 — Pruebas y cobertura como gates (1–2 semanas)
Tareas
- Backend: activar tests bloqueantes (vitest) y cobertura mínima 60%
- Añadir suites mínimas (happy path + 2 edge): validación payload, errores DB, rutas críticas
- Reporte de cobertura en CI; umbrales en `vitest.config.ts`
- Frontend: smoke tests (componentes POS y KDS); preparar cobertura sin gate aún
Criterios de aceptación
- CI falla si `npm test` falla o cobertura < 60% en backend
- Reporte de cobertura artefactado en Actions
Dependencias
- Fase 1
Riesgos/mitigación
- Tests frágiles: aislar I/O con mocks; idempotencia en pruebas
DoD
- `ci.yml` actualizado; cobertura ≥ 60%; PRs con checks verdes

## Fase 3 — POS mínimo (venta/cobro) + KDS básico (2–3 semanas)
Tareas
- Frontend POSPage: buscador, lista productos, carrito, descuentos simples, cobro simulado
- Atajos de teclado (N, F, +, Enter)
- Backend: `POST /api/ventas`, `GET /api/ventas/:id`, `POST /api/comandas`
- KDSPage: cola por sector (pizzería/cocina), estados (pendiente/en preparación/listo)
Criterios de aceptación
- Venta completa ≤ 3 acciones; comanda aparece en KDS < 1 s
- P95 interacción POS < 200 ms (baseline renovado)
Dependencias
- Fase 2 (para testear con gates)
Riesgos/mitigación
- UX sobrecargada: progressive disclosure; atajos y validaciones in-line
DoD
- Demo operable fin a fin (POS→KDS) con tests básicos y docs de uso

## Fase 4 — Caja y arqueos (1–2 semanas)
Tareas
- Endpoints: `POST /api/caja/apertura`, `POST /api/caja/cierre`, `POST /api/caja/movimientos`
- UI: apertura/cierre, movimientos, conciliación y reporte diario (PDF/CSV)
Criterios de aceptación
- No se puede vender con caja cerrada; arqueo final cuadra ± tolerancia configurable
Dependencias
- Fase 3
Riesgos/mitigación
- Desbordes/errores de caja: restricciones en backend; logs de auditoría
DoD
- Flujos de apertura/cierre y conciliación probados; reporte generado

## Fase 5 — Pagos y tickets (2–3 semanas)
Tareas
- Integración Modo/Mercado Pago (sandbox): estados aprobado/pendiente/rechazado
- Tickets (no fiscal) y comanda local: spooler simple y plantillas
- Conciliación básica de cobros
Criterios de aceptación
- Estado de pago consistente en POS; ticket y comanda emitidos al confirmar
Dependencias
- Fase 3/4
Riesgos/mitigación
- Callbacks intermitentes: reintentos idempotentes; colas de eventos
DoD
- Pagos reflejados en POS; tickets/commandas impresos localmente

## Fase 6 — Catálogo avanzado y promociones (2 semanas)
Tareas
- Variantes, combos, precios por tamaño
- Motor simple de promociones (2x1, % off) + UI de reglas
Criterios de aceptación
- Cálculos correctos; UI simple sin confundir al cajero
Dependencias
- Fase 3
Riesgos/mitigación
- Reglas complejas: empezar con MVP acotado
DoD
- Reglas aplicadas y testeadas; endpoints/documentación

## Fase 7 — Inventario, recetas y COGS (3 semanas)
Tareas
- Modelo de insumos/recetas; rebaja automática por venta; mermas
- Reportes COGS básico
Criterios de aceptación
- Stock no negativo salvo override con permiso; COGS visible
Dependencias
- Fase 6
Riesgos/mitigación
- Consistencia stock: transacciones y locks a nivel línea
DoD
- Rebajas automáticas; reportes básicos disponibles

## Fase 8 — Multisucursal y RBAC (3 semanas)
Tareas
- Scoping por sede; roles/permisos (cajero, mozo, cocina, gerente, admin)
Criterios de aceptación
- Datos aislados por sede; permisos respetados en UI/API
Dependencias
- Fases 3–7
Riesgos/mitigación
- Fugas de datos: pruebas específicas y revisión de autorización
DoD
- Roles y sedes configurables; pruebas y docs

## Fase 9 — Offline-first y sincronización (3–4 semanas)
Tareas
- Cache de sesión de venta (Service Worker) y cola de sincronización
- Resolución de conflictos con políticas por rol
Criterios de aceptación
- Continuidad de venta sin Internet; reintentos y reconciliación correctos
Dependencias
- Fases 3–5
Riesgos/mitigación
- Complejidad de conflictos: empezar unidireccional; telemetría específica
DoD
- Ventas registradas offline y sincronizadas correctamente

## Fase 10 — Reporting y analítica (2–3 semanas)
Tareas
- Dashboards operativos/gerenciales: ventas por hora/canal, productividad, mix, top N
- Export CSV/PDF
Criterios de aceptación
- KPIs acordados visibles en dashboards y exportables
Dependencias
- Fases 3–7
DoD
- Dashboards en Grafana o UI propia; consultas eficientes

---

## Seguridad y calidad transversales
- Snyk como gate (cuando haya `SNYK_TOKEN`); CodeQL con políticas endurecidas
- SBOM y auditoría de dependencias en releases
- Política de secrets/rotación; revisión de logs con redacción de PII

## Entrega/Despliegue
- Staging en Kubernetes (Helm charts), Blue/Green o RollingUpdate
- Healthchecks, readiness/liveness probes; alertas básicas
- Runbooks y plan de backout por fase

---

## Checklist operativo por PR
- [ ] Lint y typecheck verde
- [ ] Tests verdes y cobertura ≥ umbral
- [ ] `CHANGELOG` y `README`/docs actualizados
- [ ] Observabilidad: métricas/alertas si aplica
- [ ] Seguridad: secretos seguros y auditoría sin “high”

## Definition of Done (global)
- Funcionalidad probada (unit/integration) y documentada
- CI verde con todos los gates de la fase
- Métricas actualizadas y baseline re-ejecutado cuando aplique

---

## Plan de iteraciones (sugerencia)
- Sprints de 2 semanas
- Sprint 1: Fase 2 (gates de tests + cobertura 60%)
- Sprint 2–3: Fase 3 (POS + KDS MVP)
- Sprint 4: Fase 4 (Caja)
- Sprint 5: Fase 5 (Pagos + Tickets)
- Ajustar siguientes sprints según aprendizaje/feedback

---

## Backlog de riesgos y mitigaciones
- Impresión fiscal/homologación: separar módulo, empezar no fiscal
- Rendimiento UI en catálogos grandes: paginación virtualizada y cache
- Integraciones pago: sandbox, idempotencia, telemetría de callbacks

---

Referencias
- `docs/product/COMPARATIVA_FUDO.md`
- `.github/workflows/ci.yml`
- `docs/architecture/diagram.md`
- `scripts/baseline-run.sh` y `docs/pre-deploy/baseline/baseline.csv`
