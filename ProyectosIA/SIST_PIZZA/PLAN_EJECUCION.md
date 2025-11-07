# PLAN DE EJECUCIÓN — SIST_PIZZA (Supabase + Backend + CI)

Este plan orquesta de punta a punta la puesta en marcha de la base de datos (Supabase), backend y CI, con pasos verificables, criterios de éxito y evidencias.

## Objetivo
- Tener la base de datos en Supabase inicializada (schema + seeds + RLS + auditoría + índices)
- Backend listo y validado contra esa DB (smoke y RLS-aware)
- CI verde con llaves/secretos ya configurados
- Quedar con runbook y puntos de control para operación

## Fases y checklist

### Fase 0 — Preparativos
- Inputs: Acceso a GitHub, proyecto Supabase, llaves (URL, ANON, SERVICE_ROLE)
- Acciones:
  - [x] Confirmar repo estable en `main` y CI activo
  - [x] Verificar secretos en GitHub Actions (SUPABASE_URL/ANON/SERVICE_ROLE)
  - [x] Publicar SQL one‑shot consolidado
- Entregables: commit en `main`, guía y script de migraciones
- Criterio de éxito: push dispara CI y termina en PASS

Artefactos:
- `supabase/SUPABASE_ALL_IN_ONE.sql`
- `scripts/apply_supabase_migrations.sh`
- `GUIA_SUPABASE_END_TO_END.md`

---

### Fase 1 — Base de datos (Supabase)
- Prerrequisitos: `DATABASE_URL` de Supabase (connection string)
- Acciones (elige A o B):
  - Opción A (rápida, en UI): pegar el contenido de `supabase/SUPABASE_ALL_IN_ONE.sql` en Supabase → SQL Editor → Run
  - Opción B (psql automatizado):
    - Exporta `DATABASE_URL`
    - Ejecuta `./scripts/apply_supabase_migrations.sh`
- Validaciones:
  - [ ] ≥12 tablas en schema `public`
  - [ ] `menu_items` ≥ 18 filas seed
  - [ ] RLS activo en tablas sensibles
  - [ ] Triggers de auditoría presentes (`audit_*_trigger`)
- Evidencias: screenshots de Table Editor + salida final del script
- Criterio de éxito: script termina OK, seeds presentes, RLS y triggers válidos

Notas:
- Script e instrucciones son idempotentes; re‑ejecución segura

---

### Fase 2 — Backend
- Acciones:
  - [ ] `cd backend && npm ci`
  - [ ] Ejecutar `npm test` (Vitest) y `npm run dev` local
  - [ ] Smoke test contra Supabase: `backend/scripts/test-supabase.js` (usa `SERVICE_ROLE` si está, si no `ANON`)
- Validaciones:
  - [ ] Endpoint `/api/health` responde 200
  - [ ] RLS: con `ANON` lecturas restringidas; con `SERVICE_ROLE` full access
- Criterio de éxito: tests pasan, health OK, RLS observado

---

### Fase 3 — CI/CD
- Acciones:
  - [x] CI configurado para inyectar secretos Supabase
  - [ ] Habilitar protección de rama (opcional recomendado): requerir CI verde en PRs a `main`
- Validaciones: badge en `README`, run verde tras cada push

---

### Fase 4 — Seguridad, observabilidad y performance
- Acciones:
  - [ ] Revisar políticas RLS avanzadas y vistas de auditoría
  - [ ] Ejecutar funciones de monitoreo (`check_index_usage`, `slow_queries_report`)
  - [ ] Programar backups (cron/pg_dump o plan Supabase Pro)
- Criterio de éxito: reporte de indices y plan de backups definido

---

### Fase 5 — Post Go‑Live
- Acciones:
  - [ ] Revisar costos e índices parciales
  - [ ] Rutina de mantenimiento: `ANALYZE`, `VACUUM (auto)`
  - [ ] Playbook de incidentes (RTO/RPO)

## Secuencia de ejecución (paso a paso)
1) Commit y push de artefactos (hecho en esta sesión)
2) Aplicar DB (A: UI SQL Editor; B: script psql)
3) Validar tablas, seeds, RLS y triggers
4) Instalar y levantar backend, ejecutar tests y smoke
5) Confirmar CI verde, agregar protección de rama (opcional)
6) Ejecutar chequeos de índices y crear tarea de backups

## Comandos de referencia (opcionales)
```bash
# Opción B (psql):
export DATABASE_URL="postgresql://postgres:PASSWORD@db.XXXX.supabase.co:5432/postgres"
./scripts/apply_supabase_migrations.sh

# Backend (si aplica):
cd backend
npm ci
npm test -- --run
npm run dev
```

## Registro de evidencias
- Capturas de Table Editor y salida del script en `logs/` (crear si no existe)
- URL de runs de CI exitosos

## KPIs y criterios de aceptación
- CI = PASS en main
- Seeds insertados y visibles en consultas
- RLS restringe lectura/escritura correctamente con `ANON`
- Auditoría registra eventos INSERT/UPDATE/DELETE

## Próximos pasos sugeridos
- Protección de rama (CI requerido)
- Backups diarios (pg_dump o Supabase Pro)
- Tests RLS adicionales por tabla crítica
