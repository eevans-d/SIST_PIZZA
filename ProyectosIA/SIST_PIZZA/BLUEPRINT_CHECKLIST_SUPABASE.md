# 🧭 Blueprint Checklist — Supabase / SIST_PIZZA

Objetivo: dejar operativo y seguro el entorno Supabase (DB + RLS + CI) con tareas accionables, responsables y criterios de aceptación.

## Leyenda
- [ ] Pendiente · [⏳] En curso · [✅] Completado · [🚩] Bloqueado

## 0) Prerrequisitos y contexto
- [✅] Guía operativa actualizada: `GUIA_SUPABASE_END_TO_END.md`
- [✅] SQL one‑shot completo: `supabase/SUPABASE_ALL_IN_ONE.sql`
- [✅] Workflows base: `check-supabase-secrets.yml`, `db-migrate.yml`, `performance-baseline.yml`

## 1) Secretos y accesos
- [ ] Verificar secretos Supabase en GitHub
  - Acción: Ejecutar "CI - Verificar secretos Supabase"
  - Esperado: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DATABASE_URL → [SET]
  - Evidencia: Log del job adjunto al run

## 2) Estado de base de datos
- [ ] Aplicar migraciones (si hiciera falta)
  - Acción: Ejecutar "DB - Aplicar migraciones Supabase" (dry_run=false)
  - Esperado: Tablas ≥ 12, seeds cargadas
  - Evidencia: artifact migration_output.txt
- [ ] Verificar seeds críticas
  - Acción: Ejecutar queries de `scripts/README_MIGRATIONS.md`
  - Esperado: menu_items ≥ 18 · clientes ≥ 5
- [ ] Auditoría RLS
  - Acción: Ejecutar `supabase/inspeccion_rls.sql`
  - Esperado: Tablas sensibles con RLS=ON; policies definidas; listar pendientes

## 3) Performance y monitoreo
- [ ] Baseline de performance
  - Acción: Ejecutar `performance-baseline.yml` o `supabase/performance_baseline.sql`
  - Esperado: EXPLAIN con Index Scan en query crítica; sin Seq Scan inesperado
  - Evidencia: artefactos `performance-baseline`

## 4) Backups y DR
- [ ] Workflow de backup diario
  - Acción: Crear Action con `pg_dump` (+ cifrado opcional), retención 7/4/3
  - Evidencia: artefacto y/o almacenamiento externo
- [ ] Plan de restauración probado
  - Acción: DR drill en staging
  - Esperado: restauración < 15 min; datos verificados (seeds, pedidos)

## 5) Seguridad y cumplimiento
- [ ] Secret scanning semanal
  - Acción: Agregar workflow (trufflehog o GH Advanced Security)
- [ ] Rotación de claves
  - Acción: Documentar y calendarizar service_role (90d) y DB password (180d)
  - Evidencia: `SECRETS_ROTATION_LOG.md`

## 6) Calidad y CI/CD
- [ ] Lint/Tests RLS verdes en CI
  - Acción: Confirmar `.github/workflows/ci.yml` ejecuta gates estrictos
- [ ] Protección de ramas
  - Acción: Activar branch protection en GitHub (PRs + CI requerido + revisores)

## 7) Roadmap técnico
- [ ] Export `pg_stat_statements` semanal (script + Action)
- [ ] Suite RLS extendida con casos negativos
- [ ] Particionamiento si `audit_logs` crece > 5M filas

---

## Ejecución — Registro de runs
- Fecha: ______ · Tarea: ______ · Resultado: ______ · Evidencia: ______
- Fecha: ______ · Tarea: ______ · Resultado: ______ · Evidencia: ______
