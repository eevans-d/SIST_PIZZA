# 🧭 Blueprint Checklist V2 (Mejorado & Auditado)

**Versión:** 2.0 — Exhaustivo, reordenado, con criterios SMART y comandos ejecutables  
**Fecha:** 9 de noviembre de 2025  
**Objetivo:** Llevar Supabase SIST_PIZZA de estado actual → operación segura, auditable, recoverable

---

## 📍 Leyenda de estados
- `[ ]` Pendiente · `[⏳]` En curso · `[✅]` Completado · `[🚩]` Bloqueado

---

## 🔴 **FASE 0: Validación Previa (Requisito)**

Estas tareas DEBEN completarse antes de cualquier otra operación.

### Tarea 0.1: Verificar CI habilitado en GitHub
- **Descripción:** Asegurar que GitHub Actions está activo y ejecutando en main/develop
- **Acción:**
  - Ir a: GitHub repo → pestaña "Actions"
  - Si ves "Enable" botón → haz click
  - Si ves workflows listados → confirmar que al menos 1 ha ejecutado exitosamente
- **Esperado:**
  - `ci.yml` ha corrido en último push a main/develop
  - Status: ✅ pass (no red ❌)
  - Workflows visibles: CI, DB-migrate, Performance-baseline, check-secrets
- **Evidencia:** Screenshot o link a último run exitoso
- **Responsable:** DevOps / Maintainer
- **Tiempo estimado:** 5 minutos
- **Bloqueador si falla:** Sí (no continuar sin CI)
- **Rollback:** N/A

---

### Tarea 0.2: Validar acceso a Supabase Dashboard
- **Descripción:** Confirmar credenciales y permisos en proyecto Supabase
- **Acción:**
  - Ir a https://supabase.com → Dashboard
  - Seleccionar proyecto `sist-pizza`
  - Ir a Settings → API
  - Copiar y verificar que existan: Project URL, anon key, service_role key
- **Esperado:**
  - Proyecto visible
  - 3 keys presentes y copiables
  - No hay errores de permisos
- **Evidencia:** Screenshot del Settings → API
- **Responsable:** Admin / Lead Dev
- **Tiempo estimado:** 3 minutos
- **Bloqueador:** Sí
- **Rollback:** N/A

---

### Tarea 0.3: Confirmar archivo SUPABASE_ALL_IN_ONE.sql existe y es válido
- **Descripción:** Verificar que el archivo consolidado de migraciones es accesible y íntegro
- **Acción:**
  ```bash
  cd /home/eevan/ProyectosIA/SIST_PIZZA
  ls -lh supabase/SUPABASE_ALL_IN_ONE.sql
  head -50 supabase/SUPABASE_ALL_IN_ONE.sql  # Verificar está en SQL válido
  ```
- **Esperado:**
  - Archivo > 1MB (contiene todas 5 migraciones consolidadas)
  - Comienza con comentario y `CREATE EXTENSION IF NOT EXISTS`
  - No hay errores de sintaxis en primeras 50 líneas
- **Evidencia:** Output de `head` y `wc -l`
- **Responsable:** DevOps
- **Tiempo estimado:** 2 minutos
- **Bloqueador:** Sí
- **Rollback:** N/A

---

## 🟢 **FASE 1: Secretos y Acceso (Prerequisito)**

### Tarea 1.1: Verificar 4 secretos requeridos en GitHub
- **Descripción:** Confirmar que todos los secretos necesarios están presentes (sin exponerlos)
- **Acción:**
  - Ir a GitHub → Settings → Secrets and variables → Actions
  - Verificar presencia de cada uno:
    - `SUPABASE_URL`
    - `SUPABASE_ANON_KEY`
    - `SUPABASE_SERVICE_ROLE_KEY`
    - `SUPABASE_DATABASE_URL`
  - O ejecutar workflow: GitHub → Actions → "CI - Verificar secretos Supabase" → Run workflow
- **Esperado:**
  - Todos 4 secretos muestran status `[SET]` en workflow log
  - No aparecen `[MISSING]` en ninguno
- **Evidencia:**
  - Screenshot de Settings → Secrets (ocultando valores)
  - O artifact de workflow `check-supabase-secrets.yml`
- **Si falta alguno:**
  - Ir a Supabase Dashboard → Settings → API
  - Copiar valor correspondiente
  - Ir a GitHub → Settings → Secrets → New repository secret
  - Pegar con nombre exacto (case-sensitive)
- **Responsable:** DevOps / Admin GitHub
- **Tiempo estimado:** 10 minutos
- **Bloqueador:** Sí (sin secretos, nada funciona)
- **Rollback:** Simplemente eliminar secret de GitHub si se agregó de más

---

## 🔵 **FASE 2: Base de Datos (Setup Inicial)**

### Tarea 2.1: Verificar estado actual de tablas en Supabase
- **Descripción:** Capturar baseline de qué existe en la DB antes de aplicar migraciones
- **Acción:**
  - Ir a Supabase Dashboard → SQL Editor → New Query
  - Ejecutar:
    ```sql
    SELECT COUNT(*) as total_tablas
    FROM information_schema.tables
    WHERE table_schema='public' AND table_type='BASE TABLE';
    
    SELECT COUNT(*) as total_secuencias
    FROM information_schema.sequences
    WHERE sequence_schema='public';
    ```
- **Esperado:**
  - Si es ambiente nuevo: total_tablas = 0 o muy bajo
  - Si es ambiente existente: total_tablas ≥ 12 (ya aplicadas las 5 migraciones)
- **Documentar:**
  - Número actual de tablas
  - Fecha de verificación
  - Usuario que verifica
- **Evidencia:** Screenshot de resultados query
- **Responsable:** DBA / DevOps
- **Tiempo estimado:** 3 minutos
- **Bloqueador:** No (informativo)
- **Rollback:** N/A

---

### Tarea 2.2: Aplicar migraciones con dry_run (simulación)
- **Descripción:** Validar que las migraciones pueden ejecutarse sin errores, SIN aplicar cambios
- **Acción:**
  - GitHub → Actions → "DB - Aplicar migraciones Supabase"
  - Click "Run workflow"
  - En el formulario, dejar `dry_run` en `true` (default)
  - Esperar a que complete (~2 minutos)
  - Revisar logs en la pestaña "Validar conexión" — debe pasar
- **Esperado:**
  - Job completa SIN error en paso "Validar conexión"
  - Mensaje: "Connection successful"
  - Paso "Migrar (SUPABASE_ALL_IN_ONE.sql)" se skippea (porque dry_run=true)
- **Si hay error:**
  - Verificar que `SUPABASE_DATABASE_URL` es correcto
  - Verificar que es URI de tipo `postgresql://...` (no HTTPS)
  - Revisar permisos en DB (usuario `postgres` debe tener acceso)
- **Evidencia:** Screenshot del job exitoso
- **Responsable:** DBA / DevOps
- **Tiempo estimado:** 5 minutos
- **Bloqueador:** Sí (si falla, no continuar a 2.3)
- **Rollback:** Simplemente no apliquemos (dry_run no modifica nada)

---

### Tarea 2.3: Aplicar migraciones definitivas
- **Descripción:** Ejecutar todas las 5 migraciones consolidadas en la DB real
- **Acción:**
  - GitHub → Actions → "DB - Aplicar migraciones Supabase"
  - Click "Run workflow"
  - Cambiar `dry_run` a `false`
  - Esperar a que complete (~3 minutos)
  - Revisar artifact `migration_output.txt` al finalizar
- **Esperado:**
  - Todos los scripts ejecutan sin `ERROR`
  - Mensajes de:
    - Extensiones creadas: uuid-ossp, pg_trgm, pg_stat_statements
    - Tablas creadas: clientes, menu_items, pedidos, comandas, pagos, audit_logs, + 6 más
    - RLS policies creadas en cada tabla sensible
    - Índices creados (20+ en total)
  - Artifact muestra:
    - `Tablas: 12` (o más si agregan nuevas)
    - `menu_items: 18` filas (datos seed)
    - `clientes: 5` filas
- **Si hay error:**
  - Leer mensaje específico en artifact
  - Errores comunes:
    - "relation already exists" → idempotencia funcionó, reintenta
    - "permission denied" → usuario DB sin permisos suficientes
    - "SSL connection required" → falta `?sslmode=require` en URI
- **Evidencia:** Screenshot del artifact `migration_output.txt` + su contenido
- **Responsable:** DBA / DevOps
- **Tiempo estimado:** 5 minutos + 3 min ejecución
- **Bloqueador:** Sí (si falla, no continuar)
- **Rollback Plan:**
  - En Supabase Dashboard → SQL Editor
  - Ejecutar script de rollback (ver nota abajo)
  - O restaurar desde backup más reciente (tarea 5.1)
  
  **Script rollback (si querés volver):**
  ```sql
  -- CUIDADO: Esto BORRA todo. Solo en emergencia.
  DROP SCHEMA IF EXISTS public CASCADE;
  CREATE SCHEMA public;
  GRANT ALL ON SCHEMA public TO postgres, public;
  ```

---

### Tarea 2.4: Verificar seeds críticas
- **Descripción:** Confirmar que los datos de prueba se cargaron correctamente
- **Acción:**
  - En Supabase Dashboard → SQL Editor → New Query:
    ```sql
    -- Verificar menu_items
    SELECT COUNT(*) as menu_items_count FROM menu_items;
    
    -- Verificar clientes
    SELECT COUNT(*) as clientes_count FROM clientes;
    
    -- Verificar pedidos de ejemplo
    SELECT COUNT(*) as pedidos_count FROM pedidos;
    
    -- Desglose de menú por categoría
    SELECT categoria, COUNT(*) 
    FROM menu_items 
    GROUP BY categoria 
    ORDER BY categoria;
    ```
- **Esperado:**
  - menu_items_count = 18
  - clientes_count = 5
  - pedidos_count ≥ 3
  - Desglose: Pizzas=7, Empanadas=5, Bebidas=6
- **Si números son bajos:**
  - Probablemente tarea 2.3 no completó
  - Revisar logs de migración
  - Reintenta tarea 2.3
- **Evidencia:** Screenshot de resultados queries
- **Responsable:** DBA / QA
- **Tiempo estimado:** 3 minutos
- **Bloqueador:** Sí (sin seeds, tests fallarán)
- **Rollback:** Re-ejecutar tarea 2.3 (idempotente)

---

### Tarea 2.5: Auditoría de RLS en tablas sensibles
- **Descripción:** Verificar que Row Level Security está habilitado en todas las tablas que contienen datos sensibles
- **Acción:**
  - En Supabase Dashboard → SQL Editor → New Query:
    ```sql
    -- Ejecutar script de auditoría RLS
    \i supabase/inspeccion_rls.sql
    ```
  - O manualmente en dashboard copiar + pegar el contenido de `supabase/inspeccion_rls.sql`
- **Esperado:**
  - Reporte mostrando:
    - Tabla `clientes` → RLS=ON, policies=2 (select, update)
    - Tabla `pedidos` → RLS=ON, policies=3 (select, insert, update)
    - Tabla `comandas` → RLS=ON, policies=2
    - Tabla `pagos` → RLS=ON, policies=2
    - Tabla `audit_logs` → RLS=ON, policies=1 (insert-only)
    - Total: ≥ 12 policies en al menos 6 tablas
- **Si RLS está OFF:**
  - ⚠️ Crítico — no continuar a producción
  - Ejecutar tarea 2.3 nuevamente (RLS se crea en migración 4)
- **Evidencia:** Screenshot del reporte RLS + conteo de policies
- **Responsable:** Security Officer / DBA
- **Tiempo estimado:** 5 minutos
- **Bloqueador:** Sí (RLS OFF = security critical)
- **Rollback:** N/A (solo lectura)

---

## 🟠 **FASE 3: Validación de Performance**

### Tarea 3.1: Ejecutar baseline de performance
- **Descripción:** Capturar snapshot de performance de índices y queries críticas
- **Acción:**
  - GitHub → Actions → "CI - Baseline de Performance" → Run workflow
  - Esperar a que complete (~2 minutos)
  - Descargar artifact `performance-baseline`
- **Esperado:**
  - Artifact contiene 3 archivos:
    - `00_version.txt` — PostgreSQL version (12.x, 13.x, etc.)
    - `01_performance_baseline.txt` — tabla counts, índices, sizes
    - `02_indices_list.txt` — listado de todos los índices con scans
  - Contenido clave:
    - Total índices: 30+ (mínimo)
    - Query en `01_*`: EXPLAIN ANALYZE mostrando INDEX SCAN (no SEQ SCAN)
    - Tiempo ejecución crítica < 50ms (ideal)
- **Si SEQ SCAN aparece:**
  - ⚠️ Posible que índices aún no están siendo usados
  - Ejecutar `ANALYZE` en DB (PostgreSQL lo hace automático, pero puede forzarse)
  - Reintenta baseline en 5 minutos
- **Evidencia:** Artifacts descargados + screenshot de queries principales
- **Responsable:** DBA / Performance
- **Tiempo estimado:** 5 minutos
- **Bloqueador:** No (baseline informativo, pero recomendado antes de prod)
- **Rollback:** N/A

---

### Tarea 3.2: Validar que índices GIN están en uso
- **Descripción:** Confirmar que índices de búsqueda textual se están usando efectivamente
- **Acción:**
  - En Supabase SQL Editor:
    ```sql
    SELECT 
      schemaname,
      tablename,
      indexname,
      idx_scan as scans,
      idx_tup_read,
      idx_tup_fetch
    FROM pg_stat_user_indexes
    WHERE idx_scan > 0
    ORDER BY idx_scan DESC
    LIMIT 20;
    ```
- **Esperado:**
  - Mínimo 5 índices con idx_scan > 0
  - Índices de búsqueda (GIN) en menu_items, pedidos, clientes mostrando actividad
- **Si idx_scan = 0 para GIN indexes:**
  - Normal si DB es nueva (poco tráfico)
  - Simula queries de búsqueda para probar
  - Vuelve a ejecutar después de simular tráfico
- **Evidencia:** Screenshot de resultados
- **Responsable:** DBA / Performance
- **Tiempo estimado:** 3 minutos
- **Bloqueador:** No (warning solamente)
- **Rollback:** N/A

---

## 🟡 **FASE 4: Backups y Recuperación**

### Tarea 4.1: Crear workflow de backup automático diario
- **Descripción:** Implementar GitHub Action que ejecuta pg_dump cada noche
- **Acción:**
  1. En repo local, crear archivo:
     ```bash
     touch .github/workflows/db-backup.yml
     ```
  2. Copiar contenido (ver APÉNDICE A)
  3. Commit + push:
     ```bash
     git add .github/workflows/db-backup.yml
     git commit -m "feat: workflow de backup automático diario"
     git push origin main
     ```
- **Esperado:**
  - Archivo aparece en GitHub → Actions → "DB - Backup Diario"
  - Próximo backup se ejecutará mañana a las 02:00 UTC (cron: `0 2 * * *`)
  - Artifacts guardados con naming: `backup_YYYYMMDD_HHMMSS.sql.gz`
- **Verificación manual:**
  - GitHub → Actions → "DB - Backup Diario" → Run workflow (manual trigger)
  - Esperar 2 minutos
  - Revisar artifact: tamaño > 100KB, formato .sql.gz
  - Descargar y verificar: `gunzip backup_*.sql.gz && head backup_*.sql`
    - Debe contener SQL válido con comentario de timestamp
- **Criterios de aceptación:**
  - Archivo comprimido > 100KB (sanity check de contenido)
  - Checksum SHA256 registrado en log
  - Artifact retenido 7 días (default GitHub)
- **Evidencia:** Screenshot del artifact + log de ejecución
- **Responsable:** DevOps / SysAdmin
- **Tiempo estimado:** 10 minutos (creación + verificación)
- **Bloqueador:** No (mejora, pero altamente recomendada)
- **Rollback:** Simplemente eliminar `.github/workflows/db-backup.yml` + push

---

### Tarea 4.2: Verificar integridad del último backup
- **Descripción:** Validar que backup puede ser restaurado (prueba destructiva en staging)
- **Acción:**
  1. Descargar último artifact de backup (GitHub Actions)
  2. Descomprimir: `gunzip backup_*.sql.gz`
  3. Verificar con pg_restore (solo schema):
     ```bash
     pg_restore --schema-only -f /dev/null backup_*.sql
     echo "Exit code: $?"  # Debe ser 0
     ```
  4. Si planeas S3: crear script upload:
     ```bash
     #!/bin/bash
     aws s3 cp backup_*.sql.gz s3://tu-bucket/supabase-backups/
     ```
- **Esperado:**
  - pg_restore exit code = 0 (sin errores)
  - Archivo puede leerse, es SQL válido
  - Tamaño de backup es predecible (no variación >50%)
- **Si falsa integridad:**
  - Re-ejecutar backup (puede haber sido incompleto)
  - Verificar que `SUPABASE_DATABASE_URL` es correcto
  - Revisar permisos del usuario DB
- **Evidencia:** Screenshot de `pg_restore` exitoso
- **Responsable:** DevOps / DBA
- **Tiempo estimado:** 5 minutos
- **Bloqueador:** Sí para producción (backup inútil si no se puede restaurar)
- **Rollback:** N/A

---

### Tarea 4.3: Documentar plan de Disaster Recovery
- **Descripción:** Crear procedimiento claro para restauración en emergencia
- **Acción:**
  1. Crear archivo: `docs/DISASTER_RECOVERY_PLAN.md`
  2. Documenter:
     - RTO (Recovery Time Objective): 15 minutos
     - RPO (Recovery Point Objective): 24 horas (backup diario)
     - Pasos de restauración en staging + producción
     - Verificación post-restauración
     - Contacto de escalación
  3. Commit + push
- **Contenido mínimo:**
  ```markdown
  # Plan DR - SIST_PIZZA
  
  ## Escenarios
  ### 1. Recuperación parcial (tabla corrupta)
  - Restaurar backup más reciente en staging
  - Exportar tabla específica
  - Importar en producción
  - Tiempo: ~10 min
  
  ### 2. Recuperación total (DB completa down)
  - Obtener último backup desde GitHub Artifacts
  - Restaurar en Supabase staging
  - Verificar seeds
  - Copiar a producción (via pg_dump)
  - Tiempo: ~15 min
  
  ## Verificación post-restauración
  - [ ] Tablas: 12+
  - [ ] Seeds: menu_items 18, clientes 5
  - [ ] RLS: habilitado
  - [ ] Indices: 30+
  - [ ] Backend health: OK
  ```
- **Evidencia:** Archivo creado + committed
- **Responsable:** DevOps / Architect
- **Tiempo estimado:** 15 minutos
- **Bloqueador:** No (pero importante para SLA)
- **Rollback:** Simplemente delete archivo si no needed

---

## 🔴 **FASE 5: Seguridad y Scanning**

### Tarea 5.1: Crear workflow de secret scanning
- **Descripción:** Implementar GitHub Action que detecta credenciales expuestas en código
- **Acción:**
  1. Crear archivo: `.github/workflows/secret-scan.yml` (ver APÉNDICE B)
  2. Workflow usará trufflehog para detectar patterns: AWS keys, DB passwords, API keys
  3. Commit + push
- **Configuración:**
  - Trigger: Semanal (cron: `0 2 * ? * 0` — lunes 02:00 UTC)
  - Scope: todas las ramas
  - Output: reporta `HIGH` findings en job
- **Verificación manual:**
  - GitHub → Actions → "Security - Secret Scan" → Run workflow
  - Esperar 2-3 minutos
  - Job debe pasar (sin secrets encontrados)
- **Si encuentra secrets:**
  - ⚠️ CRÍTICO: no continuar
  - Rotar inmediatamente credencial encontrada
  - Revertir commits que contienen secret
  - Ejecutar tarea 5.2
- **Evidencia:** Screenshot del workflow resultado
- **Responsable:** Security / DevOps
- **Tiempo estimado:** 10 minutos (creación)
- **Bloqueador:** No hoy (será requerido pre-prod)
- **Rollback:** Delete workflow

---

### Tarea 5.2: Crear log de rotación de secretos
- **Descripción:** Documentar política y calendario de rotación de credenciales
- **Acción:**
  1. Crear archivo: `docs/SECRETS_ROTATION_LOG.md`
  2. Inicializar con:
     ```markdown
     # Rotation Log - Supabase Credentials
     
     ## Política
     - SUPABASE_SERVICE_ROLE_KEY: rotar cada 90 días
     - SUPABASE_DATABASE_URL (password): rotar cada 180 días
     - SUPABASE_ANON_KEY: rotar cada 6 meses (menos crítica)
     
     ## Registro
     | Secreto | Última rotación | Próxima rotación | Responsable |
     |---------|-----------------|------------------|-------------|
     | SUPABASE_SERVICE_ROLE_KEY | 2025-11-09 | 2026-02-07 | @DevOps |
     | SUPABASE_DATABASE_URL | 2025-11-09 | 2026-05-08 | @DBA |
     ```
  3. Commit + push
  4. Crear reminder calendar (Google Calendar, etc.)
- **Criterios de aceptación:**
  - Archivo committeado
  - Próximas fechas de rotación = hoy + 90d / 180d
  - Equipo notificado de calendario
- **Evidencia:** Archivo creado + screenshot del calendar reminder
- **Responsable:** Security Officer
- **Tiempo estimado:** 10 minutos
- **Bloqueador:** No (pero importante para compliance)
- **Rollback:** N/A

---

### Tarea 5.3: Crear procedimiento de rotación de keys
- **Descripción:** Documentar paso-a-paso para rotar credenciales sin downtime
- **Acción:**
  1. Crear archivo: `scripts/rotate_supabase_secrets.md`
  2. Incluir procedimiento:
     ```markdown
     # Rotación de SUPABASE_SERVICE_ROLE_KEY
     
     ## Paso 1: Crear nueva key en Supabase
     - Ir a Dashboard → Settings → API
     - Botón "Regenerate service_role key"
     - Copiar nueva key temporalmente
     
     ## Paso 2: Actualizar secret en GitHub
     - GitHub → Settings → Secrets → SUPABASE_SERVICE_ROLE_KEY
     - Hacer click en "Update"
     - Pegar nueva key
     - Save
     
     ## Paso 3: Validar en CI
     - GitHub → Actions → "CI - Verificar secretos Supabase"
     - Run workflow
     - Esperar a que pase
     
     ## Paso 4: Verificar RLS tests
     - Esperar a que `ci.yml` corra automáticamente en PR/push
     - Confirmar que tests RLS pasan
     
     ## Paso 5: Documentar
     - Actualizar docs/SECRETS_ROTATION_LOG.md
     - Anotar timestamp y quién roló
     ```
  3. Commit + push
- **Evidencia:** Archivo creado
- **Responsable:** DevOps
- **Tiempo estimado:** 15 minutos
- **Bloqueador:** No
- **Rollback:** N/A

---

## 🟢 **FASE 6: Validación End-to-End**

### Tarea 6.1: Verificar conectividad backend ↔ Supabase
- **Descripción:** Validar que el backend Node puede conectar y operar con la DB
- **Acción:**
  1. Ir a workspace backend:
     ```bash
     cd /home/eevan/ProyectosIA/SIST_PIZZA/backend
     ```
  2. Verificar `.env` tiene las 3 keys:
     ```bash
     grep -E "SUPABASE_URL|SUPABASE_ANON_KEY|SUPABASE_SERVICE_ROLE_KEY" .env
     ```
  3. Levantar backend:
     ```bash
     npm run dev
     ```
  4. En otra terminal, hacer health check:
     ```bash
     curl -s http://localhost:3000/api/health | jq
     ```
- **Esperado:**
  ```json
  {
    "status": "ok",
    "database": "ok",
    "integrations": {
      "supabase": true
    }
  }
  ```
- **Si database=error o supabase=false:**
  - Revisar .env (keys completas, sin espacios)
  - Revisar logs del backend (buscar "Supabase connection error")
  - Verificar Supabase está disponible (Health check en dashboard)
  - Reintenta
- **Evidencia:** Screenshot del output del curl
- **Responsable:** Backend Dev / QA
- **Tiempo estimado:** 5 minutos
- **Bloqueador:** Sí (backend no funciona sin DB)
- **Rollback:** N/A

---

### Tarea 6.2: Probar flujo completo: crear pedido vía webhook
- **Descripción:** Validar que un pedido completo se crea, audita, y persiste correctamente
- **Acción:**
  1. Backend corriendo (de tarea 6.1)
  2. Ejecutar curl:
     ```bash
     curl -X POST http://localhost:3000/api/webhooks/n8n/pedido \
       -H "Content-Type: application/json" \
       -d '{
         "cliente": {
           "nombre": "Test Integration",
           "telefono": "2262999999",
           "direccion": "Calle Test 123, Necochea"
         },
         "items": [
           {"nombre": "Muzzarella", "cantidad": 2},
           {"nombre": "Coca Cola 2L", "cantidad": 1}
         ],
         "origen": "webhook_test"
       }'
     ```
  3. Verificar respuesta (debe tener pedido_id):
     ```json
     {
       "success": true,
       "pedido_id": "uuid-here",
       "total": 9500
     }
     ```
- **Esperado:**
  - Respuesta status 200 OK
  - Pedido creado exitosamente
  - Total calculado correctamente
- **Verificación en Supabase:**
  - Ir a Table Editor → `pedidos` → debe ver nuevo row con ese pedido_id
  - Ir a Table Editor → `comandas` → debe ver 2 comandas (Muzzarella x2, Coca Cola x1)
  - Ir a Table Editor → `audit_logs` → debe ver entrada: operation=insert, table=pedidos
- **Si falla:**
  - Revisar logs del backend
  - Verificar que seeds están cargados (Muzzarella debe existir en menu_items)
  - Reintenta 6.1 primero
- **Evidencia:** Screenshot del curl response + tabla pedidos + audit_logs
- **Responsable:** QA / Backend Dev
- **Tiempo estimado:** 5 minutos
- **Bloqueador:** Sí (si esto falla, algo roto)
- **Rollback:** Simplemente DELETE el pedido creado (es test)
  ```sql
  DELETE FROM pedidos WHERE cliente_id IN (
    SELECT id FROM clientes WHERE nombre = 'Test Integration'
  );
  ```

---

### Tarea 6.3: Validar que audit_logs registra operaciones
- **Descripción:** Confirmar que los triggers de auditoría están funcionando
- **Acción:**
  1. En Supabase SQL Editor:
     ```sql
     SELECT 
       operation, 
       table_name, 
       user_id,
       timestamp,
       old_data,
       new_data
     FROM audit_logs
     ORDER BY timestamp DESC
     LIMIT 10;
     ```
  2. Buscar registros recientes (últimos 5 minutos)
- **Esperado:**
  - Últimas operaciones muestren:
    - INSERT en `pedidos` (de tarea 6.2)
    - INSERT en `comandas` (de tarea 6.2)
    - Posiblemente UPDATE en `clientes` si se creó nuevo cliente
  - Cada registro contiene: operation, table_name, timestamp
  - new_data contiene JSON con valores insertados
- **Si audit_logs vacío:**
  - ⚠️ Los triggers no están activos
  - Verificar que migración 4 se ejecutó (crea triggers)
  - Reintenta tarea 2.3
- **Evidencia:** Screenshot del query result
- **Responsable:** DBA / Security
- **Tiempo estimado:** 3 minutos
- **Bloqueador:** Sí para compliance (auditoría REQUIRED)
- **Rollback:** N/A (solo lectura)

---

### Tarea 6.4: Ejecutar suite de tests RLS
- **Descripción:** Validar que políticas RLS funcionan correctamente
- **Acción:**
  1. Backend corriendo con variables SUPABASE_*
  2. Ejecutar tests:
     ```bash
     cd backend
     npm run test -- rls_policies
     ```
  3. Esperar resultados
- **Esperado:**
  - Todos los tests pasan (✓)
  - Cero failures
  - Tests cubren:
     - Pedidos: usuario solo ve sus propios pedidos
     - Clientes: usuario solo ve su propio cliente
     - Comandas: acceso restringido por pedido_id
     - Menu_items: público (sin RLS, o select-only)
- **Si algún test falla:**
  - Leer mensaje de error específico
  - Buscar en `backend/src/__tests__/rls_policies.test.ts`
  - Revisar que RLS policies existen en DB (tarea 2.5)
  - Reintenta
- **Evidencia:** Screenshot del output npm test RLS
- **Responsable:** Backend Dev / QA
- **Tiempo estimado:** 3 minutos (ejecución)
- **Bloqueador:** Sí (RLS es crítica para seguridad)
- **Rollback:** N/A (tests no modifican estado)

---

## 🟣 **FASE 7: Calidad y Protecciones**

### Tarea 7.1: Verificar que CI está verde en main
- **Descripción:** Confirmar que último commit en main pasó todos los gates de CI
- **Acción:**
  - GitHub → repo → pestaña "Actions"
  - Buscar último run de `ci.yml` en `main` branch
  - Verificar status: ✅ (verde)
- **Esperado:**
  - Latest workflow run: ✅ PASS
  - Jobs completados:
    - Lint ✅
    - TypeScript check ✅
    - Tests ✅
    - RLS Policies ✅
- **Si rojo:**
  - Hacer click en workflow para detalles
  - Revisar qué job falló (lint, test, etc.)
  - Arreglar problema local
  - Commit + push
  - Esperar a que CI corra nuevamente
- **Evidencia:** Screenshot del GitHub Actions status
- **Responsable:** Tech Lead / DevOps
- **Tiempo estimado:** 5 minutos
- **Bloqueador:** Sí (no continuar con branch protection si CI no pasa)
- **Rollback:** N/A

---

### Tarea 7.2: Activar branch protection en main
- **Descripción:** Configurar GitHub para requerir que todo código esté revisado antes de merge
- **Acción:**
  1. GitHub repo → Settings → Branches
  2. Click "Add rule" bajo "Branch protection rules"
  3. Configurar:
     - Branch name pattern: `main`
     - Require a pull request before merging: ✅
     - Require approvals: ✅ (set to 1)
     - Require status checks to pass: ✅
       - Seleccionar: `ci.yml` (Lint, TypeScript, Tests)
       - Seleccionar: `db-migrate.yml` (si es aplicable)
     - Dismiss stale pull request approvals when new commits are pushed: ✅
     - Include administrators: ✅
  4. Save rules
- **Esperado:**
  - `main` branch está protegido
  - Botón "Merge" deshabilitado hasta que CI pase + reviewers aprueben
  - Nadie puede hacer force push a main
- **Verificación:**
  - Intentar crear PR dummy
  - Verificar que "Merge" está deshabilitado hasta CI pase
  - Esperar CI verde + review
  - Luego poder mergear
- **Evidencia:** Screenshot de Settings → Branches → rule activa
- **Responsable:** Repo Admin
- **Tiempo estimado:** 5 minutos
- **Bloqueador:** No (pero muy recomendado pre-prod)
- **Rollback:** Simplemente delete la rule en Settings → Branches

---

## 🔷 **FASE 8: Documentación y Cierre**

### Tarea 8.1: Crear QUERIES_CRITICAS.md
- **Descripción:** Documentar queries que deben estar optimizadas y sus planes ideales
- **Acción:**
  1. Crear archivo: `docs/QUERIES_CRITICAS.md`
  2. Incluir:
     ```markdown
     # Queries Críticas - SIST_PIZZA
     
     ## Query 1: Obtener pedidos recientes (últimas 7 días)
     ```sql
     SELECT p.*, c.nombre, c.telefono
     FROM pedidos p
     INNER JOIN clientes c ON p.cliente_id = c.id
     WHERE p.created_at > NOW() - INTERVAL '7 days'
       AND p.estado = 'entregado'
     ORDER BY p.created_at DESC;
     ```
     - Expected plan: Index Scan usando idx_pedidos_created_estado
     - Target time: < 50ms
     - Last validated: 2025-11-09
     
     ## Query 2: Búsqueda de ítems por descripción
     ```sql
     SELECT * FROM menu_items 
     WHERE descripcion @@ plainto_tsquery('spanish', $1)
     LIMIT 20;
     ```
     - Expected plan: Index Scan usando idx_menu_items_descripcion_gin
     - Target time: < 30ms
     ```
  3. Commit + push
- **Evidencia:** Archivo creado + committed
- **Responsable:** DBA / Backend Lead
- **Tiempo estimado:** 20 minutos
- **Bloqueador:** No
- **Rollback:** N/A

---

### Tarea 8.2: Registrar todas las evidencias en BLUEPRINT_EXECUTION_LOG.md
- **Descripción:** Crear registro final de qué se completó, cuándo, quién, y evidencia
- **Acción:**
  1. Crear archivo: `docs/BLUEPRINT_EXECUTION_LOG.md`
  2. Llenar tabla:
     ```markdown
     # Ejecución del Blueprint V2
     
     | # | Tarea | Inicio | Fin | Responsable | Estado | Evidencia |
     |----|-------|--------|-----|-------------|--------|-----------|
     | 0.1 | CI habilitado | 2025-11-09 10:00 | 10:05 | DevOps | ✅ | Screenshot Actions |
     | 0.2 | Acceso Supabase | 2025-11-09 10:05 | 10:10 | Admin | ✅ | Screenshot Dashboard |
     | 1.1 | Secretos verificados | 2025-11-09 10:10 | 10:20 | DevOps | ✅ | Workflow log |
     | 2.1 | Estado baseline | 2025-11-09 10:20 | 10:23 | DBA | ✅ | Query results |
     | ... | ... | ... | ... | ... | ... | ... |
     ```
  3. Commit + push
- **Responsable:** Project Manager / Tech Lead
- **Tiempo estimado:** 15 minutos
- **Bloqueador:** No
- **Rollback:** N/A

---

### Tarea 8.3: Enviar resumen ejecutivo
- **Descripción:** Comunicar a stakeholders el resultado del blueprint
- **Acción:**
  1. Crear email o documento con:
     - ✅ Qué se completó
     - ⚠️ Qué quedó pendiente (si algún gap)
     - 📊 Métricas clave (tablas, indices, seeds, RLS policies)
     - 🔐 Seguridad: RLS activo, auditoría funciona, backup automatizado
     - 📅 Próximos pasos (roadmap técnico)
  2. Ejemplo:
     ```
     SUPABASE SIST_PIZZA — Blueprint V2 Completado
     
     ✅ Completado:
     • 12 tablas creadas + seeds cargados
     • RLS activo en 6+ tablas sensibles
     • 30+ índices optimizados
     • Performance baseline: <50ms en queries críticas
     • Backups automáticos cada 24h
     • CI/CD gates funcionando
     • Audit logs operacionales
     
     Status: READY FOR PRODUCTION
     Signed off: Team Lead
     Date: 2025-11-09
     ```
- **Responsable:** Tech Lead / Product Manager
- **Tiempo estimado:** 10 minutos
- **Bloqueador:** No

---

## 📊 MATRIZ FINAL DE TAREAS

| Fase | # Tareas | Estado | Responsable | Est. Tiempo |
|------|----------|--------|-------------|-------------|
| 0 - Validación | 3 | 🟢 | DevOps | 10 min |
| 1 - Secretos | 1 | 🟢 | DevOps | 10 min |
| 2 - DB | 5 | 🟢 | DBA | 25 min |
| 3 - Performance | 2 | 🟡 | DBA | 10 min |
| 4 - Backups | 3 | 🟡 | DevOps | 30 min |
| 5 - Seguridad | 3 | 🟡 | Security | 35 min |
| 6 - Validación E2E | 4 | 🟢 | QA/Dev | 18 min |
| 7 - Protecciones | 2 | 🟡 | Tech Lead | 10 min |
| 8 - Documentación | 3 | 🟡 | PM/Lead | 45 min |

**TOTAL ESTIMADO:** 3–4 horas (incluyendo verificaciones manuales y documentación)

---

## 🎯 DEPENDENCIAS Y CAMINO CRÍTICO

```
0.1 (CI) ─┐
0.2 (Access) ─┼─→ 1.1 (Secrets) → 2.1 (Baseline) → 2.2 (Dry run)
0.3 (File check) ─┘                                    ↓
                                                   2.3 (Apply)
                                                        ↓
                                                   2.4 (Seeds)
                                                   2.5 (RLS audit)
                                                        ↓
                                    3.1 (Performance baseline)
                                         ↓
                                    4.1 (Backup workflow)
                                    4.2 (Verify backup)
                                         ↓
                                    5.1 (Secret scanning)
                                    5.2 (Rotation log)
                                    5.3 (Rotation procedure)
                                         ↓
                                    6.1 (Backend health)
                                    6.2 (E2E test)
                                    6.3 (Audit logs)
                                    6.4 (RLS tests)
                                         ↓
                                    7.1 (CI check)
                                    7.2 (Branch protection)
                                         ↓
                                    8.x (Documentation)
```

---

## 🚨 ROLLBACK RÁPIDO (si algo falla)

| Escenario | Acción | Comando |
|-----------|--------|---------|
| Migraciones falladas | Revertir a estado anterior | `psql "$DB" < backup_*.sql` |
| Secretos faltantes | Agregar manualmente | Settings → Secrets → Add |
| RLS problemas | Re-ejecutar migración 4 | Tarea 2.3 |
| Backup no funciona | Limpieza + reintento | Delete artifact, re-run |
| CI fallando | Revisar logs | GitHub Actions → job detail |

---

## 📞 CONTACTO Y ESCALACIÓN

**Problemas técnicos:** @DevOps / #sist-pizza-tech  
**Seguridad/RLS:** @Security / #security-team  
**Performance:** @DBA / #database-team  
**Urgencias:** PagerDuty (escalate después de 30 min sin resolución)

---

**VERSIÓN:** 2.0 — Completo, mejorado, auditado  
**ÚLTIMA ACTUALIZACIÓN:** 9 de noviembre de 2025  
**APROBADO POR:** Auditoría técnica exhaustiva  
**STATUS:** Listo para ejecución
