# 🚀 Script Aplicador de Migraciones Supabase

Automatiza la aplicación de las 5 migraciones SQL a tu proyecto Supabase usando `psql`.

## Requisitos

- PostgreSQL client (`psql`) instalado
- Connection string de Supabase (desde Settings → Database)

## Instalación de psql

**Ubuntu/Debian:**
```bash
sudo apt-get install postgresql-client
```

**macOS:**
```bash
brew install postgresql
```

**Windows:**
Descargá desde: https://www.postgresql.org/download/windows/

## Uso

### Opción 1: Variable de entorno

```bash
export DATABASE_URL="postgresql://postgres:TU_PASSWORD@db.XXXX.supabase.co:5432/postgres"
./scripts/apply_supabase_migrations.sh
```

### Opción 2: Argumento directo

```bash
./scripts/apply_supabase_migrations.sh "postgresql://postgres:TU_PASSWORD@db.XXXX.supabase.co:5432/postgres"
```

## Qué hace

1. Verifica conectividad a Supabase
2. Aplica las 5 migraciones en orden:
   - `20250115000000_initial_schema.sql` — Schema base (5 tablas)
   - `20250115000001_seed_data.sql` — Datos de prueba (18 items, 5 clientes, 3 pedidos)
   - `20250125000002_add_missing_tables.sql` — Tablas complementarias (7 adicionales)
   - `20250126000003_rls_security_audit.sql` — RLS granular + auditoría
   - `20250126000004_performance_indexes.sql` — Índices especializados (~30)
3. Verifica:
   - 12 tablas creadas
   - 18 items en `menu_items`
   - RLS activa

## Errores comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `psql: command not found` | psql no instalado | Instalá PostgreSQL client |
| `connection refused` | Credenciales incorrectas o IP no permitida | Verificá Settings → Database en Supabase; añadí tu IP |
| `relation already exists` | Migración ya aplicada | Es idempotente; seguí adelante (es esperado) |

## Idempotencia

Todas las migraciones usan `IF NOT EXISTS` / `ON CONFLICT DO NOTHING`, por lo que **podés re-ejecutar el script sin romper nada**.

## Verificación manual

Si preferís ejecutar paso a paso:

```bash
export DATABASE_URL="postgresql://..."
psql "$DATABASE_URL" -f supabase/migrations/20250115000000_initial_schema.sql
psql "$DATABASE_URL" -f supabase/migrations/20250115000001_seed_data.sql
psql "$DATABASE_URL" -f supabase/migrations/20250125000002_add_missing_tables.sql
psql "$DATABASE_URL" -f supabase/migrations/20250126000003_rls_security_audit.sql
psql "$DATABASE_URL" -f supabase/migrations/20250126000004_performance_indexes.sql
```

## Alternativa: UI de Supabase

Si no querés usar psql, podés pegar `supabase/SUPABASE_ALL_IN_ONE.sql` completo en:

Supabase Dashboard → SQL Editor → New Query → Run

Ver detalles en: [`GUIA_SUPABASE_END_TO_END.md`](../GUIA_SUPABASE_END_TO_END.md)

---

**Última actualización:** 2025-11-07  
**Responsable:** Equipo SIST_PIZZA

---

## ✅ Verificación rápida de seeds

Ejecutá en el SQL Editor de Supabase o con psql:

```sql
-- Conteos esperados (mínimos) tras seeds
SELECT 'menu_items' AS tabla, COUNT(*) AS filas FROM public.menu_items
UNION ALL
SELECT 'clientes', COUNT(*) FROM public.clientes;
```

Resultados esperados (mínimos):
- `menu_items` ≥ 18
- `clientes` ≥ 5

Si no alcanzan los mínimos, re‑ejecutá de forma segura (idempotente):
- Opción A: `supabase/SUPABASE_ALL_IN_ONE.sql` (incluye seeds con ON CONFLICT/IF NOT EXISTS)
- Opción B: solo `20250115000001_seed_data.sql`

## 📈 Baseline de performance (opcional)

Usá el snapshot listo en `supabase/performance_baseline.sql` para:
- Ver conteos y tamaños por tabla
- Listado de índices en `public`
- Porcentaje de `idx_scan` vs `seq_scan`
- EXPLAIN ANALYZE de una query crítica (últimos 7 días, estado entregado)

Ejecución con psql:

```bash
psql "$DATABASE_URL" -f supabase/performance_baseline.sql | less -S
```

Indicadores rápidos:
- Evitar `Seq Scan` en tablas grandes de uso frecuente
- Confirmar que aparecen índices compuestos/GIN esperados
- Tiempos de ejecución bajos (ms) en la query crítica
