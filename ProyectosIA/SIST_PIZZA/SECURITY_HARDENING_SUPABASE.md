# 🛡️ Endurecimiento y Operaciones Seguras Supabase / SIST_PIZZA

## Objetivos
Asegurar la plataforma elevando controles sobre acceso, datos, integridad, monitoreo y recuperación.

## 1. Protección de ramas y flujo Git
- Activar branch protection en `main` y `develop`:
  - Requerir PRs (sin commits directos)
  - Requerir CI verde (lint + tests RLS + coverage mínimo)
  - Requerir 1–2 revisores para cambios en `supabase/*.sql` y workflows.
- Habilitar reglas de ficheros protegidos para migraciones críticas.

## 2. Gestión de migraciones
- Política: 1 migración por feature → luego consolidación trimestral.
- Validación previa (pre-commit hook) que chequea sintaxis SQL y presencia de `IF NOT EXISTS` o equivalentes en objetos susceptibles.
- Script de diff: comparar `information_schema` vs archivos `migrations/` (automatizar).

## 3. RLS y seguridad de datos
- Auditoría mensual: ejecutar `supabase/inspeccion_rls.sql` y archivar resultado.
- Pruebas RLS extendidas: crear suite que
  - Verifique acceso permitido/denegado (usuario normal vs service_role)
  - Test de inserción maliciosa (campos fuera de scope)
  - Test de filtrado por tenant cuando aplique multi‑organización futura.
- Policy naming: `<context>_<operation>_<scope>` (ej: `pedidos_select_cliente`).

## 4. Rotación y secreto de claves
- Rotación `service_role`: cada 90 días + inmediata ante incidente.
- Rotación DB password: cada 180 días.
- Registrar fecha rotación en `SECRETS_ROTATION_LOG.md`.
- Activar secret scanning (GitHub Advanced Security o trufflehog Action semanal).

## 5. Backups y recuperación
- Plan Free: script pg_dump diario (Action programada) + cifrado opcional GPG.
- Política de retención: 7 diarios + 4 semanales + 3 mensuales.
- Checklist DR:
  1. Verificar último backup íntegro (hash)
  2. Restaurar en entorno aislado (staging) y correr smoke tests
  3. Validar conteos críticos (clientes, pedidos, índices) antes de aprobar vuelta a producción.

## 6. Monitoreo y observabilidad
- Activar snapshot diario de performance (`performance-baseline.yml`).
- Métricas de API (Prometheus) ya en backend → agregar panel de latencia y error rate.
- Tabla lenta: si avg latency > 500ms y rows > 5k → investigar índice/new partition.
- Guardar histórico de `pg_stat_statements` semanal (crear script export).

## 7. Integridad y auditoría
- Expandir `audit_logs`: incluir usuario (auth.uid()), IP (si disponible), payload resumido.
- Crear tarea de depuración: purgar registros > 180 días (mantener tamaño controlado).
- Firmado opcional de eventos críticos (HMAC con clave interna) para pedidos y pagos.

## 8. Performance proactiva
- Lista de queries críticas mantener en `QUERIES_CRITICAS.md` con versión y plan ideal.
- Al agregar nuevo índice: anotar racional (columna cardinalidad, selectividad).
- Revisión trimestral de índices huérfanos (`idx_scan = 0` durante 30 días).

## 9. Cumplimiento y privacidad
- Tabla `consent_records` (ya creada): agregar verificación de expiración y script de limpieza.
- Anonimización potencial: crear vista anon para exportaciones (remover teléfono/dirección).

## 10. Automatizaciones futuras
| Acción | Frecuencia | Herramienta | Estado |
|--------|-----------|------------|--------|
| Snapshot performance | Diario | GH Action | Implementado (baseline) |
| Backup pg_dump | Diario | GH Action + S3 | Pendiente |
| Rotación service_role | 90d | Manual + checklist | Pendiente |
| Auditoría RLS | Mensual | Script SQL | Parcial |
| Export pg_stat_statements | Semanal | psql | Pendiente |
| Secret scanning | Semanal | Trufflehog / GH | Pendiente |

## 11. Roadmap endurecimiento (prioridad descendente)
1. Backups automatizados y cifrados
2. Secret scanning semanal
3. Suite avanzada RLS y negative tests
4. Export histórico performance + grafo tendencias
5. Rotación automatizada de claves (script + Action manual gated)
6. Particionamiento si `audit_logs` > 5M filas

## 12. Checklist rápida (operacional)
- [ ] Branch protection activo
- [ ] Todos los secrets presentes (`check-supabase-secrets.yml` OK)
- [ ] Último backup < 24h y verificado
- [ ] Rotación de service_role dentro del SLA (<=90d)
- [ ] Auditoría RLS última fecha < 30d
- [ ] Performance baseline última ejecución < 24h
- [ ] Sin Seq Scan inesperados en pedidos/clientes

## 13. Próximos pasos inmediatos
- Crear workflow de backup (pg_dump + upload artifact + push a almacenamiento externo).
- Añadir script `export_pg_stat_statements.sql`.
- Añadir tests RLS extendidos negativos (inserciones indebidas).

---
**Última actualización:** 2025-11-09  
**Responsable:** Equipo SIST_PIZZA
