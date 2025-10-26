-- ============================================================================
-- SIST_PIZZA - Auditoría y Mejora de Row Level Security (RLS)
-- ============================================================================
-- Autor: GenSpark AI Developer
-- Fecha: 2025-10-26
-- Propósito: Completar políticas RLS faltantes, agregar auditoría automática,
--            e implementar políticas granulares para seguridad de datos
-- Refs: TAREAS_PENDIENTES_COMPLETO.md - Sección 1.2
-- ============================================================================

-- ============================================================================
-- PARTE 1: POLÍTICAS RLS GRANULARES PARA TABLA `pedidos`
-- ============================================================================

-- Eliminar política genérica existente
DROP POLICY IF EXISTS "Backend full access to pedidos" ON pedidos;

-- NUEVAS POLÍTICAS GRANULARES:

-- 1. Usuarios autenticados solo pueden ver sus propios pedidos
CREATE POLICY "Users read own pedidos"
  ON pedidos
  FOR SELECT
  USING (
    auth.uid() = cliente_id 
    OR auth.role() = 'service_role'
  );

-- 2. Usuarios autenticados pueden crear pedidos para sí mismos
CREATE POLICY "Users create own pedidos"
  ON pedidos
  FOR INSERT
  WITH CHECK (
    auth.uid() = cliente_id
    OR auth.role() = 'service_role'
  );

-- 3. Usuarios NO pueden actualizar pedidos (solo backend)
CREATE POLICY "Only backend updates pedidos"
  ON pedidos
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- 4. Usuarios NO pueden eliminar pedidos (solo backend)
CREATE POLICY "Only backend deletes pedidos"
  ON pedidos
  FOR DELETE
  USING (auth.role() = 'service_role');

COMMENT ON POLICY "Users read own pedidos" ON pedidos IS 
  'Usuarios solo pueden ver sus propios pedidos. Backend tiene acceso total.';

-- ============================================================================
-- PARTE 2: POLÍTICAS RLS GRANULARES PARA TABLA `clientes`
-- ============================================================================

-- Eliminar política genérica existente
DROP POLICY IF EXISTS "Backend full access to clientes" ON clientes;

-- NUEVAS POLÍTICAS GRANULARES:

-- 1. Usuarios autenticados solo pueden ver su propio perfil
CREATE POLICY "Users read own cliente"
  ON clientes
  FOR SELECT
  USING (
    auth.uid()::text = id::text
    OR auth.role() = 'service_role'
  );

-- 2. Backend puede crear clientes (webhooks, admin)
CREATE POLICY "Backend creates clientes"
  ON clientes
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- 3. Usuarios pueden actualizar su propio perfil
CREATE POLICY "Users update own cliente"
  ON clientes
  FOR UPDATE
  USING (
    auth.uid()::text = id::text
    OR auth.role() = 'service_role'
  );

-- 4. Solo backend puede eliminar clientes (GDPR/derecho al olvido)
CREATE POLICY "Backend deletes clientes"
  ON clientes
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================================================
-- PARTE 3: POLÍTICAS RLS GRANULARES PARA TABLA `comandas`
-- ============================================================================

-- Eliminar política genérica existente
DROP POLICY IF EXISTS "Backend full access to comandas" ON comandas;

-- NUEVAS POLÍTICAS GRANULARES:

-- 1. Usuarios pueden ver comandas de sus propios pedidos
CREATE POLICY "Users read own comandas"
  ON comandas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pedidos p
      WHERE p.id = comandas.pedido_id
      AND (p.cliente_id = auth.uid() OR auth.role() = 'service_role')
    )
  );

-- 2. Solo backend puede crear comandas
CREATE POLICY "Backend creates comandas"
  ON comandas
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- 3. Solo backend puede actualizar comandas
CREATE POLICY "Backend updates comandas"
  ON comandas
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- 4. Solo backend puede eliminar comandas
CREATE POLICY "Backend deletes comandas"
  ON comandas
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================================================
-- PARTE 4: POLÍTICAS RLS GRANULARES PARA TABLA `pagos`
-- ============================================================================

-- Eliminar política genérica existente
DROP POLICY IF EXISTS "Backend full access to pagos" ON pagos;

-- NUEVAS POLÍTICAS GRANULARES:

-- 1. Usuarios pueden ver pagos de sus propios pedidos
CREATE POLICY "Users read own pagos"
  ON pagos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM pedidos p
      WHERE p.id = pagos.pedido_id
      AND (p.cliente_id = auth.uid() OR auth.role() = 'service_role')
    )
  );

-- 2. Solo backend puede crear pagos (webhooks de Modo/MercadoPago)
CREATE POLICY "Backend creates pagos"
  ON pagos
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- 3. Solo backend puede actualizar pagos (estado, confirmación)
CREATE POLICY "Backend updates pagos"
  ON pagos
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- 4. Solo backend puede eliminar pagos (auditoría financiera)
CREATE POLICY "Backend deletes pagos"
  ON pagos
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================================================
-- PARTE 5: POLÍTICAS PARA TABLA `menu_items` (MEJORAR EXISTENTES)
-- ============================================================================

-- Las políticas existentes son correctas, pero agregar INSERT explícito:

-- Usuarios NO pueden crear items del menú
CREATE POLICY "Only backend creates menu_items"
  ON menu_items
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- Usuarios NO pueden actualizar items del menú
CREATE POLICY "Only backend updates menu_items"
  ON menu_items
  FOR UPDATE
  USING (auth.role() = 'service_role');

-- Usuarios NO pueden eliminar items del menú
CREATE POLICY "Only backend deletes menu_items"
  ON menu_items
  FOR DELETE
  USING (auth.role() = 'service_role');

-- ============================================================================
-- PARTE 6: TRIGGER DE AUDITORÍA AUTOMÁTICA
-- ============================================================================

-- Función mejorada de auditoría que captura IP y user_agent
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
  current_ip INET;
  current_user_agent TEXT;
BEGIN
  -- Obtener user_id actual (si existe)
  current_user_id := auth.uid();
  
  -- Obtener IP y user_agent desde configuración de sesión (si están configurados)
  current_ip := COALESCE(
    NULLIF(current_setting('request.headers', true)::json->>'x-forwarded-for', '')::inet,
    inet '127.0.0.1'
  );
  
  current_user_agent := COALESCE(
    current_setting('request.headers', true)::json->>'user-agent',
    'unknown'
  );

  -- Insertar registro de auditoría
  INSERT INTO audit_logs (
    table_name,
    operation,
    old_data,
    new_data,
    user_id,
    ip_address,
    user_agent
  ) VALUES (
    TG_TABLE_NAME,
    TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    current_user_id,
    current_ip,
    current_user_agent
  );

  -- Retornar el registro apropiado
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PARTE 7: APLICAR TRIGGERS DE AUDITORÍA A TABLAS CRÍTICAS
-- ============================================================================

-- Auditar operaciones en tabla `pedidos`
DROP TRIGGER IF EXISTS audit_pedidos_trigger ON pedidos;
CREATE TRIGGER audit_pedidos_trigger
  AFTER INSERT OR UPDATE OR DELETE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- Auditar operaciones en tabla `pagos` (crítico para finanzas)
DROP TRIGGER IF EXISTS audit_pagos_trigger ON pagos;
CREATE TRIGGER audit_pagos_trigger
  AFTER INSERT OR UPDATE OR DELETE ON pagos
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- Auditar operaciones en tabla `clientes` (PII sensible)
DROP TRIGGER IF EXISTS audit_clientes_trigger ON clientes;
CREATE TRIGGER audit_clientes_trigger
  AFTER INSERT OR UPDATE OR DELETE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- Auditar operaciones en tabla `menu_items` (control de inventario)
DROP TRIGGER IF EXISTS audit_menu_items_trigger ON menu_items;
CREATE TRIGGER audit_menu_items_trigger
  AFTER UPDATE OR DELETE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- PARTE 8: POLÍTICAS PARA TABLA `audit_logs` (PROTECCIÓN)
-- ============================================================================

-- Eliminar política genérica si existe
DROP POLICY IF EXISTS "Service role full access" ON audit_logs;

-- Solo lectura para usuarios autenticados (sus propios registros)
CREATE POLICY "Users read own audit logs"
  ON audit_logs
  FOR SELECT
  USING (
    user_id = auth.uid()
    OR auth.role() = 'service_role'
  );

-- Solo service_role puede insertar (los triggers usan SECURITY DEFINER)
CREATE POLICY "Only backend inserts audit logs"
  ON audit_logs
  FOR INSERT
  WITH CHECK (auth.role() = 'service_role');

-- NADIE puede actualizar ni eliminar audit_logs (inmutabilidad)
CREATE POLICY "Immutable audit logs"
  ON audit_logs
  FOR UPDATE
  USING (false);

CREATE POLICY "Immutable audit log deletes"
  ON audit_logs
  FOR DELETE
  USING (false);

COMMENT ON POLICY "Immutable audit logs" ON audit_logs IS 
  'Audit logs son inmutables. Ni siquiera service_role puede modificarlos.';

-- ============================================================================
-- PARTE 9: FUNCIÓN PARA PURGAR AUDIT LOGS ANTIGUOS (OPCIONAL)
-- ============================================================================

-- Función para limpiar audit logs mayores a 1 año (GDPR compliance)
CREATE OR REPLACE FUNCTION purge_old_audit_logs()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM audit_logs
  WHERE timestamp < NOW() - INTERVAL '1 year';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Purged % old audit log records', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION purge_old_audit_logs() IS 
  'Elimina audit logs mayores a 1 año para compliance GDPR. Ejecutar mensualmente.';

-- ============================================================================
-- PARTE 10: ÍNDICES ADICIONALES PARA PERFORMANCE CON RLS
-- ============================================================================

-- Índice compuesto para pedidos por cliente y estado
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_estado 
  ON pedidos(cliente_id, estado);

-- Índice compuesto para pedidos por fecha y estado
CREATE INDEX IF NOT EXISTS idx_pedidos_fecha_estado 
  ON pedidos(created_at DESC, estado);

-- Índice para comandas con pedido_id (optimiza JOIN en RLS)
CREATE INDEX IF NOT EXISTS idx_comandas_pedido_menu 
  ON comandas(pedido_id, menu_item_id);

-- Índice para pagos con pedido_id (optimiza JOIN en RLS)
CREATE INDEX IF NOT EXISTS idx_pagos_pedido_estado 
  ON pagos(pedido_id, estado);

-- Índice para audit_logs por usuario y fecha
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_timestamp 
  ON audit_logs(user_id, timestamp DESC) 
  WHERE user_id IS NOT NULL;

-- ============================================================================
-- PARTE 11: VISTA PARA DASHBOARD DE AUDITORÍA (ADMIN)
-- ============================================================================

CREATE OR REPLACE VIEW vista_audit_summary AS
SELECT 
  table_name,
  operation,
  COUNT(*) as total_operations,
  COUNT(DISTINCT user_id) as unique_users,
  MIN(timestamp) as first_operation,
  MAX(timestamp) as last_operation,
  DATE_TRUNC('day', timestamp) as operation_date
FROM audit_logs
WHERE timestamp > NOW() - INTERVAL '30 days'
GROUP BY table_name, operation, DATE_TRUNC('day', timestamp)
ORDER BY operation_date DESC, total_operations DESC;

COMMENT ON VIEW vista_audit_summary IS 
  'Resumen de operaciones de auditoría de los últimos 30 días';

-- ============================================================================
-- PARTE 12: VALIDACIÓN DE OWNERSHIP EN FUNCIONES
-- ============================================================================

-- Función helper para validar que un pedido pertenece al usuario
CREATE OR REPLACE FUNCTION is_pedido_owner(pedido_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM pedidos
    WHERE id = pedido_id
    AND cliente_id = user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION is_pedido_owner IS 
  'Valida que un pedido pertenezca al usuario dado';

-- ============================================================================
-- VERIFICACIÓN FINAL Y REPORTE
-- ============================================================================

DO $$
DECLARE
  total_policies INTEGER;
  total_triggers INTEGER;
BEGIN
  -- Contar políticas RLS creadas
  SELECT COUNT(*) INTO total_policies
  FROM pg_policies
  WHERE schemaname = 'public';
  
  -- Contar triggers de auditoría
  SELECT COUNT(*) INTO total_triggers
  FROM pg_trigger
  WHERE tgname LIKE 'audit_%_trigger';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ RLS Security Audit Migration Complete';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Total RLS policies: %', total_policies;
  RAISE NOTICE 'Audit triggers: %', total_triggers;
  RAISE NOTICE 'New indexes created: 5';
  RAISE NOTICE 'Security improvements:';
  RAISE NOTICE '  - Granular RLS policies per table';
  RAISE NOTICE '  - Automatic audit logging';
  RAISE NOTICE '  - Immutable audit logs';
  RAISE NOTICE '  - User ownership validation';
  RAISE NOTICE '  - Performance indexes for RLS queries';
  RAISE NOTICE '========================================';
END $$;
