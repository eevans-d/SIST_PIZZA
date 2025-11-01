# SIST_PIZZA - Mega Análisis, Diagnóstico Auditor y Hoja de Ruta (2025-10-25)

Objetivo: entregar un blueprint/roadmap exhaustivo, accionable y priorizado para completar y endurecer el sistema en seguridad, observabilidad, datos, CI/CD, pruebas y operación.

---

1) Resumen Ejecutivo
- Estado: backend con Express/TS endurecido (helmet, CORS restrictivo, rate limit, HMAC, body limits); /metrics Prometheus; migraciones SQL clave con RLS/seed; exporters y dashboards base; pruebas de contrato sólidas; compose listo para dev/observabilidad. CI definido (bloqueado por policy) y LICENSE MIT.
- Enfoque inmediato: producción segura, observabilidad con SLO/alertas, CI funcionando, RLS auditivo, performance y DX.

2) Hallazgos y Riesgos Clave
- CI: workflows bloqueados por permisos. Acción manual requerida en main.
- Supabase: decisiones de URL (Cloud vs local) y aplicación de migraciones al proyecto target.
- RLS: políticas mínimas, falta auditoría de corner cases (INSERT/UPDATE/DELETE por roles no service_role donde aplica).
- CSP/CORS: ajustar para entornos productivos.
- Alertas: no hay reglas de alertas ni SLOs definidos.
- Redis: limiter soporta Redis pero falta validación E2E y sizing.
- Backups/DR: sin política documentada.
- Seguridad webhooks externos (pagos/chatwoot): solo N8N con HMAC; faltan otros.

3) Metas (Definition of Done por dominio)
- Seguridad prod: CSP estricta y CORS por dominio; rate limits por segmento; HMAC en todos los webhooks; logs sin PII; dependencias auditadas.
- Observabilidad: /metrics con default labels, exporters funcionando; dashboards (Node/Postgres/Redis/backend/business); alertas en Prometheus; SLOs definidos y medidos.
- Datos: migraciones consistentes con FKs/indexes/políticas; RLS auditado; triggers consistentes; plan de migración prod/test.
- CI/CD: lint+type-check+tests+docker+audit; branch protection; versión/tagging; changelog auto.
- Pruebas: unitarias, contratos, integración (Redis rate limit, HMAC), smoke. Cobertura meta: >85% crítica.
- Operación: runbooks, panel de guardia, procedimiento de rollback, backups.

4) Roadmap por Fases (con checklist y criterios de aceptación)

Fase A — Endurecimiento Seguridad (alta prioridad)
- CORS por ambiente
  - backend/src/server.ts: leer ALLOWED_ORIGINS exactos para prod; fallback solo dev.
  - DoD: requests desde orígenes no listados devuelven 403.
- CSP con helmet
  - backend/src/server.ts: helmet.contentSecurityPolicy en producción; default-src 'self'; conectar dominios Supabase/Chatwoot relevantes; bloquear eval.
  - DoD: página de frontend carga sin violaciones; reportOnly fase inicial posible.
- HMAC en todos los webhooks
  - Nuevos: pagos (MercadoPago/Modo), Chatwoot, otros. Reutilizar verifyHmacSignatureFromRaw.
  - DoD: 401 si firma ausente/incorrecta; tests unit/integration.
- Rate limits específicos
  - Diferenciar admin, login, pagos; budgets (ej. login strictLimiter, exportLimiter ya ok, webhookLimiter ok).
  - DoD: 429 consistente y encabezados estándar.
- Sanitización/validación
  - Reforzar zod en rutas mutadoras; limitar tamaño de listas/paginación; validar fechas ISO.
  - DoD: tests de validación para inputs comunes.
- Dependencias
  - npm audit y upgrades de minor/patch en backend/frontend; lockfile actualizado.
  - DoD: sin high/critical (o justificadas).

Fase B — Observabilidad con SLO/Alertas (alta)
- Dashboards Grafana
  - Node: event loop, memoria, CPU, fds (node_process.json ya creado; pulir).
  - Backend: p95/99 por ruta; tasa de error 5xx; RPS por status; top rutas.
  - DB: conexiones, locks, hit ratio, latencias; Redis: ops/sec, memoria, keys.
  - DoD: paneles responden en 1h y 24h; links entre dashboards.
- Prometheus
  - Rules/alerts: rate 5xx >1% 5m; p95>1s 5m; memoria >80%; Redis memory >85%; Postgres conexiones >80%; exporter down; backoff en jobs.
  - Archivo: monitoring/alerts.yml (extender); anotar severidad.
  - DoD: alertas visibles en /alerts; firing según simulaciones.
- SLOs
  - Definir: disponibilidad API 99.9%, p95 < 500ms, error rate < 1%.
  - Error budget y panel SLO.
  - DoD: panel que calcule SLO con recording rules.

Fase C — Datos/RLS/Migraciones (alta)
- Auditoría RLS
  - Revisar todas las tablas; garantizar que anon no pueda mutar excepto casos deseados; service_role con ALL; usuarios solo propios.
  - Añadir políticas faltantes y pruebas.
- Índices/FKs
  - Revisión de consultas frecuentes (id/estado/fechas) y añadir índices compuestos; validar ON DELETE.
- Migraciones prod
  - Plan/Check: scripts idempotentes; supabase db push al proyecto; rollback.

Fase D — CI/CD & Release (media-alta)
- CI en main
  - Crear .github/workflows/ci.yml en raíz vía UI (contenido ya en repo); revisar permisos.
- Branch protection
  - Requerir CI passing; review mínimo; squashed merges.
- Versionado/Release
  - Convencional commits; CHANGELOG.md; tags semver; auto-changelog action.

Fase E — Pruebas (media-alta)
- Integración
  - Redis rate limit con compose; headers RateLimit-*; 429 tras ráfaga.
  - HMAC end-to-end con rawBody.
- E2E smoke
  - Supertest o Playwright mínima contra server local (health, /metrics, /api/pedidos/export).
- Cobertura
  - Umbrales y reporte de cobertura; gate en CI (warning inicialmente).

Fase F — Frontend (media)
- Seguridad
  - CSP compatible; uso de VITE_* vars; sanitización de entrada.
- Performance
  - Code splitting; cache headers; PWA ajustes; minimizar imágenes.
- Tests
  - Vitest/React Testing Library para componentes clave y llamadas a API.

Fase G — Operación/DR/Costos (media)
- Backups
  - Política para DB y Grafana; programas; verificación de restauración.
- Runbooks
  - Incidentes comunes: 5xx súbito, DB saturada, Redis sin memoria, webhook inválido.
- Costos
  - Dimensionamiento de Redis/Postgres; establecer límites de recursos en contenedores (compose/k8s futuro).

5) Tareas detalladas por archivo/acción (extracto accionable)
- backend/src/server.ts
  - Añadir helmet.contentSecurityPolicy con config por entorno.
  - Endurecer CORS en prod: ALLOWED_ORIGINS exactos (env de despliegue).
- backend/src/workflows/*
  - Añadir HMAC en futuros webhooks (pagos/chatwoot); tests.
- backend/src/middleware/rateLimiter.ts
  - Ajustar budgets; añadir comentarios de SLO.
- monitoring/alerts.yml
  - Añadir expresiones: 5xx rate, p95, memory, exporter down, postgres connections, redis memory, scrape failures.
- monitoring/grafana-provisioning/dashboards/definitions
  - Añadir dashboards exporters Postgres/Redis y SLO.
- supabase/migrations
  - Añadir migraciones incrementales (índices/FKs extra/políticas nuevas).
- .github/workflows/ci.yml (raíz, crear en main)
  - Activar job backend/frontend; coverage (opcional warning al inicio).

6) Aceptación, Métricas y Validación
- Seguridad: OWASP top 10 checklist; npm audit high/critical=0 (o documentar excepciones).
- Observabilidad: dashboards entregados, alertas firing bajo simulación; /metrics responde <100ms.
- Datos: migraciones aplicadas en staging; RLS tests demuestran aislamientos correctos.
- CI/CD: pipeline verde para PR y main; branch protection activa.
- Pruebas: cobertura >85% módulos críticos; smoke E2E pasando.

7) Plan de 48h (Quick Wins y Prioridades)
- Hoy
  - Crear dashboards para Postgres/Redis exporters.
  - Añadir alertas mínimas (backend 5xx, p95) en monitoring/alerts.yml.
  - Documentar HMAC (BACKEND_API.md) y rate limit policies.
- Mañana
  - Activar CI en main vía UI (copiar YAML al root).
  - Pruebas integración Redis limiter con compose.
  - CSP en producción (reportOnly -> enforce) y CORS dominios productivos.
  - Migraciones: aplicar en staging Supabase.

8) Riesgos y Mitigaciones
- Bloqueo CI: coordinar permisos (owner) para permitir workflows.
- RLS: acceso inadvertido; mitigación con pruebas y revisión manual.
- Observabilidad ruido: tuning de buckets/labels y cardinalidad.
- Redis límite: memory pressure; setear maxmemory-policy y monitorear.

9) Runbooks (resumen)
- Pico de 5xx
  - Ver alertas, revisar logs y /metrics; bajar tasa con limiters temporales; revisar DB/Redis exporters.
- Webhook firmas inválidas
  - Confirmar secreto; usar herramienta de firma para reproducir.
- Export CSV abuso
  - Revisar 429; subir window o whitelist temporal según IP.

10) Checklist final (marcar al completar)
- [ ] CSP prod (helmet) + CORS prod listo
- [ ] HMAC en todos webhooks (tests)
- [ ] Alertas Prometheus mínimas + panel SLO
- [ ] Dashboards exporters Postgres/Redis + Node/Backend OK
- [ ] Aplicar migraciones en staging + RLS tests
- [ ] CI en main habilitado + branch protection
- [ ] Redis limiter validado E2E
- [ ] Documentación (HMAC, rate limit, body limits, runbooks)

11) Enlaces útiles
- PR: https://github.com/eevans-d/SIST_PIZZA/pull/2
- Rama trabajo: genspark_ai_developer
- Repo: https://github.com/eevans-d/SIST_PIZZA

---
Documento generado por GenSpark AI (2025-10-25).
