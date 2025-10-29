# PLAN PRE-DESPLIEGUE ALINEADO — SIST_PIZZA (Oct 29, 2025)

Este documento alinea el plan maestro (Partes 1-4, Fases 0-8) con el estado real del proyecto. Incluye diagnóstico por fase, brechas, y checklist accionable. Se usará como blueprint para avanzar fase por fase.

Contexto actual verificado
- Rama main consolidada con integración reciente.
- Despliegue local operativo (Docker Compose): backend (4000), Prometheus (9090), Grafana (3001).
- Health checks: /health, /api/health OK; /metrics expuesto.
- Webhook E2E: OK (pedido creado en Supabase local, costo de envío calculado).
- Monitoring: Prometheus con 5 targets activos; Grafana healthy.
- Scripts: deploy-local.sh, check-health.sh, post-deploy-check.sh.
- Cloud: Migraciones Supabase en repo (pendiente confirmar aplicadas en cloud). CI/Gates: no configurados aún.

Asunciones
- LLM/Claude se usa de forma limitada o aún no es core del MVP; se marcan secciones LLM como “Opcional/N/A” si no impacta el release.
- Staging será lo más cercano a prod con Supabase cloud y la misma versión de Postgres.

---

## Mapa de Fases (0-8) — Estado y Próximos pasos

### Fase 0 — Baseline & Arquitectura
Estado actual
- Arquitectura implícita (Express + Supabase + Redis + Prometheus + Grafana). Métricas y health presentes.
- No hay documento de arquitectura ni baseline cuantitativo formal.
Brechas
- Falta diagrama actualizado, baseline-report y metrics/baseline.csv.
- Matriz de complejidad y criterios de éxito aún no formalizados.
Acciones
- Crear docs/arquitectura/diagrama.mmd (Mermaid) y Arquitectura.md.
- Ejecutar baseline smoke (200 requests /health y 50 /api/webhooks) y exportar metrics/baseline.csv.
- Redactar baseline-report.md con riesgos y límites operativos.
Criterios de éxito
- Baseline y diagrama versionados; health/métricas confirmadas; límites y riesgos listados.

### Fase 1 — Análisis de Código & Prompts
Estado actual
- Compila en TS; no hay ESLint/semgrep/CI gates activos en main.
- Scripts shell con set -euo en algunos; sin shellcheck integrado.
Brechas
- Falta pipeline CI con lint/types/security.
- No hay policy de licencias ni semgrep configurado.
- Prompts/LLM: opcional/N/A si no es parte del MVP inicial.
Acciones
- Añadir ESLint + tsconfig strict + husky/lint-staged + commitlint.
- Integrar semgrep y npm audit/Snyk; establecer umbrales bloqueantes.
- Si LLM es core: crear prompts/catalogo.md y evaluación básica.
Criterios de éxito
- Quality gates en CI fallan si hay errores; 0 vulns críticas/altas; ESLint sin warnings.

### Fase 2 — Testing exhaustivo
Estado actual
- Hay tests TS en backend; suite ampliada en merges recientes. Aún no ejecutada en esta sesión.
Brechas
- No hay cobertura reportada ni estructura unificada (unit/integration/e2e). Sin pgTAP.
Acciones
- Ejecutar tests actuales; generar cobertura.
- Plan de tests por niveles; agregar Testcontainers (Postgres) y pgTAP (si aplica).
- Configurar job de CI para unit+integration, y E2E contra staging.
Criterios de éxito
- Cobertura ≥ objetivo (p.ej., 70-80%); E2E flujos críticos verdes; 0 P0/P1 pendientes.

### Fase 3 — Validación Conductual & UX
Estado actual
- No hay personas ni datasets de UX en repo; openapi.yaml presente.
Brechas
- Falta definición de personas, escenarios y métricas de UX.
Acciones
- Documentar personas y 10 flujos críticos; crear datasets/escenarios-e2e.json.
- Recolectar métricas UX básicas (tiempo_total_ms, errores, handoff si aplica).
Criterios de éxito
- ≥100 simulaciones o escenarios; sin loops en flujos críticos; satisfacción/claridad ≥ objetivos.

### Fase 4 — Optimización (costos/latencia)
Estado actual
- /metrics activo; sin benchmarks formales vs baseline.
Brechas
- Sin reportes de costo/latencia ni A/B.
Acciones
- Identificar quick wins (índices, parallel I/O, keep-alive, caché por hash de input).
- Ejecutar k6 para P95 antes/después; documentar ROI en docs/optimizacion/.
Criterios de éxito
- Reducción P95 20-40% vs baseline o evidencia de límites de plataforma.

### Fase 5 — Hardening & Observability
Estado actual
- Rate limit y métricas; CSP y headers presentes; health listo.
Brechas
- Sin catálogo de errores ni breakers/retries uniformes; sin OpenTelemetry.
Acciones
- Implementar catálogo de errores y cockatiel/opossum; normalizar validaciones Zod.
- Añadir OTel básico y dashboards adicionales (negocio/operación).
Criterios de éxito
- Breakers/retries/rate en rutas clave; alertas y dashboards operativos.

### Fase 6 — Documentación
Estado actual
- README_DEPLOY_LOCAL, CHECKLIST_ACCIONABLE, openapi.yaml básicos.
Brechas
- Falta API.md detallado, ADRs, runbooks, guía de usuario por rol.
Acciones
- Completar docs/API.md (o enriquecer openapi.yaml), docs/operacion/deploy.md, runbooks top5, ADRs.
Criterios de éxito
- Quick Start <5min, rollback <5min, runbooks versionados, OpenAPI usable.

### Fase 7 — Pre-Deployment Validation (staging)
Estado actual
- Staging cloud pendiente; migraciones en repo.
Brechas
- Falta staging deploy y game days.
Acciones
- Desplegar a staging con Supabase cloud; correr regresión y DAST light.
- Game days: pico 10x, caída proveedor, latencia DB simulada.
Criterios de éxito
- Checklist pre-launch firmado; regresión verde; integraciones validadas y alertas activas.

### Fase 8 — Audit Final & Sign-Off (FALTANTE → completada aquí)
Estado actual
- No existe documento de cierre ni SLAs firmados.
Acciones
- Security final review (OWASP Top 10, PII, RLS, logs de acceso).
- Definir SLAs (Disponibilidad, P95/P99, Error rate) y alert thresholds.
- Go/No-Go con bloqueantes e importantes; firmas requeridas.
- Plan 72h post-lanzamiento con canary y vigilancia.
Entregables
- docs/auditoria/security-signoff.md
- docs/SLAs.md
- docs/release/GO_NO_GO.md
- docs/release/plan-72h.md
Criterios de éxito
- Sign-off de Seguridad/Tech/Product/Compliance; plan 72h publicado.

---

## Checklist global resumido (accionable)
- [ ] F0: Diagrama + baseline-report + metrics/baseline.csv
- [ ] F1: ESLint/tsc/semgrep/npm audit en CI + umbrales
- [ ] F2: Tests + cobertura + Testcontainers/pgTAP + CI
- [ ] F3: Personas + datasets UX + métricas + hallazgos
- [ ] F4: k6 perf + optimizaciones + ROI report
- [ ] F5: Error catalog + breakers/retries + OTel + dashboards/alertas
- [ ] F6: API docs + ADRs + runbooks + usuario
- [ ] F7: Staging deploy + game days + pre-launch checklist
- [ ] F8: Security signoff + SLAs + Go/No-Go + plan 72h

## Sugerencia de cronograma ajustado
- Semana 1: F0-F1-F2 (arrancar CI y baseline ya)
- Semana 2: F3-F4 (UX + primeras optimizaciones)
- Semana 3: F5-F6 (hardening + docs)
- Semana 4: F7-F8 (staging, game days, auditoría y firma)

## Notas finales
- Secciones LLM marcadas como Opcional/N/A si no forman parte del MVP; activar solo cuando el alcance lo requiera.
- Este plan convivirá con CHECKLIST_ACCIONABLE.md para ejecución diaria.
