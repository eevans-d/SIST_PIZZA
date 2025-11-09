-- sqlfluff: dialect=postgres
-- sql-language-server: dialect=postgresql
-- SIST_PIZZA - Performance Baseline Snapshot
-- Objetivo: obtener una foto rápida de índices, tamaños y plan/tiempos de una query crítica.
-- Uso: pegar en Supabase SQL Editor o ejecutar con psql -f supabase/performance_baseline.sql

-- 1) Conteos rápidos de tablas clave
SELECT 'clientes' AS tabla, COUNT(*) AS filas FROM public.clientes
UNION ALL
SELECT 'menu_items', COUNT(*) FROM public.menu_items
UNION ALL
SELECT 'pedidos', COUNT(*) FROM public.pedidos
UNION ALL
SELECT 'comandas', COUNT(*) FROM public.comandas
UNION ALL
SELECT 'pagos', COUNT(*) FROM public.pagos;

-- 2) Índices por tabla (solo esquema public)
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- 3) Tamaño aproximado por tabla
SELECT
  relname AS tabla,
  pg_size_pretty(pg_total_relation_size(relid)) AS tamano_total,
  pg_size_pretty(pg_relation_size(relid)) AS tamano_tabla,
  pg_size_pretty(pg_indexes_size(relid)) AS tamano_indices
FROM pg_catalog.pg_statio_user_tables
ORDER BY pg_total_relation_size(relid) DESC;

-- 4) Uso de índices reciente (si hay estadísticas)
SELECT
  relname AS tabla,
  idx_scan,
  seq_scan,
  CASE WHEN (idx_scan + seq_scan) > 0
       THEN ROUND(100.0 * idx_scan / NULLIF((idx_scan + seq_scan),0), 2)
       ELSE NULL END AS pct_idx_scan
FROM pg_stat_user_tables
ORDER BY pct_idx_scan DESC NULLS LAST;

-- 5) Plan de una query crítica (ajustar filtros según tu negocio)
EXPLAIN ANALYZE
SELECT p.id, p.created_at, p.estado, p.total, c.nombre, c.telefono
FROM public.pedidos p
JOIN public.clientes c ON c.id = p.cliente_id
WHERE p.created_at > NOW() - INTERVAL '7 days'
  AND p.estado = 'entregado'
ORDER BY p.created_at DESC
LIMIT 50;

-- Qué buscar:
-- - Uso de "Index Scan" en pedidos (evitar "Seq Scan" en tablas grandes)
-- - Costos y tiempos bajos (ms). Si es alto, evaluar índices compuestos o filtros parciales.
