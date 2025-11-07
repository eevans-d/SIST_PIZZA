-- sqlfluff: dialect=postgres
-- sql-language-server: dialect=postgresql
-- ============================================================================
-- SIST_PIZZA - SUPABASE_ALL_IN_ONE.sql
-- De cero a 100%: schema + seed + tablas adicionales + RLS/Auditoría + índices
-- Uso: pegar en Supabase SQL Editor (New query) o ejecutar con psql (ver guía)
-- Idempotente: diseñado para re-ejecutarse sin romper estado (IF NOT EXISTS, etc.)
-- ============================================================================

-- 1) SCHEMA INICIAL -----------------------------------------------------------

-- [BEGIN initial_schema.sql]

-- ============================================================================
-- SIST_PIZZA - Schema Inicial (Prompt 1)
-- Base de datos PostgreSQL con Row Level Security (RLS)
-- Necochea, Buenos Aires, Argentina
-- ============================================================================

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- Para búsquedas fuzzy en clientes

-- ============================================================================
-- TABLA: clientes
-- ============================================================================
CREATE TABLE IF NOT EXISTS clientes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(255) NOT NULL,
  telefono VARCHAR(20) NOT NULL UNIQUE,
  direccion TEXT NOT NULL,
  email VARCHAR(255),
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_clientes_telefono ON clientes(telefono);
CREATE INDEX IF NOT EXISTS idx_clientes_nombre_trgm ON clientes USING gin(nombre gin_trgm_ops);

-- RLS: Solo backend puede acceder (service_role key)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='clientes' AND policyname='Backend full access to clientes'
  ) THEN
    CREATE POLICY "Backend full access to clientes"
      ON clientes
      FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='update_clientes_updated_at'
  ) THEN
    CREATE TRIGGER update_clientes_updated_at
      BEFORE UPDATE ON clientes
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- TABLA: menu_items
-- ============================================================================
CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(255) NOT NULL UNIQUE,
  descripcion TEXT,
  categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('pizza', 'empanada', 'bebida', 'postre', 'extra')),
  precio DECIMAL(10, 2) NOT NULL CHECK (precio >= 0),
  disponible BOOLEAN NOT NULL DEFAULT TRUE,
  imagen_url TEXT,
  ingredientes TEXT[], -- Array de ingredientes
  tiempo_preparacion_min INTEGER, -- Minutos estimados
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_menu_items_categoria ON menu_items(categoria);
CREATE INDEX IF NOT EXISTS idx_menu_items_disponible ON menu_items(disponible);

-- RLS: Lectura pública, escritura solo backend
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='menu_items' AND policyname='Public read access to menu_items'
  ) THEN
    CREATE POLICY "Public read access to menu_items"
      ON menu_items
      FOR SELECT
      USING (TRUE);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='menu_items' AND policyname='Backend full access to menu_items'
  ) THEN
    CREATE POLICY "Backend full access to menu_items"
      ON menu_items
      FOR ALL
      USING (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='update_menu_items_updated_at'
  ) THEN
    CREATE TRIGGER update_menu_items_updated_at
      BEFORE UPDATE ON menu_items
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- TABLA: pedidos
-- ============================================================================
CREATE TABLE IF NOT EXISTS pedidos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cliente_id UUID NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'confirmado', 'en_preparacion', 'listo', 'entregado', 'cancelado')),
  tipo_entrega VARCHAR(20) NOT NULL CHECK (tipo_entrega IN ('delivery', 'retiro')),
  direccion_entrega TEXT, -- Solo si tipo_entrega = 'delivery'
  total DECIMAL(10, 2) NOT NULL CHECK (total >= 0),
  notas_cliente TEXT,
  notas_internas TEXT, -- Notas del personal
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  entregado_at TIMESTAMPTZ
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_id ON pedidos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_estado ON pedidos(estado);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos(created_at DESC);

ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pedidos' AND policyname='Backend full access to pedidos'
  ) THEN
    DROP POLICY "Backend full access to pedidos" ON pedidos;
  END IF;
  -- No recreamos aquí; se definen en la sección RLS avanzada más abajo
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='update_pedidos_updated_at'
  ) THEN
    CREATE TRIGGER update_pedidos_updated_at
      BEFORE UPDATE ON pedidos
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- ============================================================================
-- TABLA: comandas
-- ============================================================================
CREATE TABLE IF NOT EXISTS comandas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(10, 2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_comandas_pedido_id ON comandas(pedido_id);
CREATE INDEX IF NOT EXISTS idx_comandas_menu_item_id ON comandas(menu_item_id);

ALTER TABLE comandas ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='comandas' AND policyname='Backend full access to comandas'
  ) THEN
    DROP POLICY "Backend full access to comandas" ON comandas;
  END IF;
END $$;

-- Trigger para auto-calcular subtotal
CREATE OR REPLACE FUNCTION calculate_comanda_subtotal()
RETURNS TRIGGER AS $$
BEGIN
  NEW.subtotal = NEW.cantidad * NEW.precio_unitario;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='calculate_comandas_subtotal'
  ) THEN
    CREATE TRIGGER calculate_comandas_subtotal
      BEFORE INSERT OR UPDATE ON comandas
      FOR EACH ROW
      EXECUTE FUNCTION calculate_comanda_subtotal();
  END IF;
END $$;

-- ============================================================================
-- TABLA: pagos
-- ============================================================================
CREATE TABLE IF NOT EXISTS pagos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  metodo_pago VARCHAR(50) NOT NULL CHECK (metodo_pago IN ('efectivo', 'tarjeta', 'transferencia', 'mercadopago')),
  monto DECIMAL(10, 2) NOT NULL CHECK (monto >= 0),
  estado VARCHAR(50) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'aprobado', 'rechazado', 'reembolsado')),
  referencia_externa VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_pagos_pedido_id ON pagos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_pagos_estado ON pagos(estado);

ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pagos' AND policyname='Backend full access to pagos'
  ) THEN
    DROP POLICY "Backend full access to pagos" ON pagos;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname='update_pagos_updated_at'
  ) THEN
    CREATE TRIGGER update_pagos_updated_at
      BEFORE UPDATE ON pagos
      FOR EACH ROW
      EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Vista de pedidos con totales y cliente redactado
CREATE OR REPLACE VIEW vista_pedidos_resumen AS
SELECT
  p.id,
  p.estado,
  p.tipo_entrega,
  p.total,
  p.created_at,
  CONCAT(SUBSTRING(c.nombre FROM 1 FOR 1), '****') AS cliente_inicial,
  CONCAT('***', RIGHT(c.telefono, 4)) AS telefono_parcial,
  COUNT(cmd.id) AS cantidad_items
FROM pedidos p
INNER JOIN clientes c ON p.cliente_id = c.id
LEFT JOIN comandas cmd ON p.id = cmd.pedido_id
GROUP BY p.id, p.estado, p.tipo_entrega, p.total, p.created_at, c.nombre, c.telefono;

-- Comentarios
COMMENT ON TABLE clientes IS 'Clientes del sistema (PII: nombre, teléfono, dirección, email)';
COMMENT ON TABLE menu_items IS 'Menú de productos disponibles';
COMMENT ON TABLE pedidos IS 'Pedidos realizados por clientes';
COMMENT ON TABLE comandas IS 'Detalle de items en cada pedido';
COMMENT ON TABLE pagos IS 'Pagos asociados a pedidos';
COMMENT ON COLUMN clientes.telefono IS 'Identificador único del cliente (clave de búsqueda principal)';
COMMENT ON COLUMN pedidos.estado IS 'Estados: pendiente → confirmado → en_preparacion → listo → entregado';
COMMENT ON COLUMN pagos.referencia_externa IS 'ID de transacción de pasarela de pago (MercadoPago, etc.)';

-- [END initial_schema.sql]


-- 2) SEED DATA ---------------------------------------------------------------

-- [BEGIN seed_data.sql]

-- (Contenido íntegro del seed_data.sql)

-- ==========================================================================
-- Clientes + Menú + Pedidos/Comandas/Pagos de prueba
-- ==========================================================================

-- Clientes
INSERT INTO clientes (nombre, telefono, direccion, email) VALUES
  ('Carlos Martínez', '2262401234', 'Calle 83 N° 456, Necochea', 'carlos.m@example.com'),
  ('María González', '2262405678', 'Av. 79 N° 1234, Necochea', 'maria.g@example.com'),
  ('Juan Rodríguez', '2262409012', 'Calle 61 N° 789, Necochea', NULL),
  ('Ana López', '2262403456', 'Av. 10 N° 234, Necochea', 'ana.lopez@example.com'),
  ('Pedro Fernández', '2262407890', 'Calle 89 N° 567, Necochea', NULL)
ON CONFLICT (telefono) DO NOTHING;

-- Menú: pizzas, empanadas, bebidas, postres, extras
INSERT INTO menu_items (nombre, descripcion, categoria, precio, disponible, ingredientes, tiempo_preparacion_min) VALUES
  ('Pizza Muzzarella', 'Salsa de tomate, muzzarella', 'pizza', 3500.00, TRUE, ARRAY['salsa', 'muzzarella'], 20),
  ('Pizza Napolitana', 'Salsa, muzzarella, tomate, ajo, aceitunas', 'pizza', 4200.00, TRUE, ARRAY['salsa', 'muzzarella', 'tomate', 'ajo', 'aceitunas'], 22),
  ('Pizza Calabresa', 'Salsa, muzzarella, longaniza calabresa', 'pizza', 4800.00, TRUE, ARRAY['salsa', 'muzzarella', 'calabresa'], 22),
  ('Pizza Jamón y Morrones', 'Salsa, muzzarella, jamón, morrones', 'pizza', 4500.00, TRUE, ARRAY['salsa', 'muzzarella', 'jamón', 'morrones'], 20),
  ('Pizza Fugazzeta', 'Muzzarella, cebolla', 'pizza', 4000.00, TRUE, ARRAY['muzzarella', 'cebolla'], 18),
  ('Pizza Especial de la Casa', 'Salsa, muzzarella, jamón, morrones, huevo, aceitunas', 'pizza', 5500.00, TRUE, ARRAY['salsa', 'muzzarella', 'jamón', 'morrones', 'huevo', 'aceitunas'], 25),
  ('Pizza Cuatro Quesos', 'Muzzarella, roquefort, provolone, parmesano', 'pizza', 5200.00, TRUE, ARRAY['muzzarella', 'roquefort', 'provolone', 'parmesano'], 23)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO menu_items (nombre, descripcion, categoria, precio, disponible, ingredientes, tiempo_preparacion_min) VALUES
  ('Empanada de Carne', 'Carne cortada a cuchillo, cebolla, huevo', 'empanada', 600.00, TRUE, ARRAY['carne', 'cebolla', 'huevo'], 15),
  ('Empanada de Jamón y Queso', 'Jamón, queso muzzarella', 'empanada', 550.00, TRUE, ARRAY['jamón', 'queso'], 15),
  ('Empanada de Pollo', 'Pollo, cebolla, pimiento', 'empanada', 580.00, TRUE, ARRAY['pollo', 'cebolla', 'pimiento'], 15),
  ('Empanada de Verdura', 'Acelga, cebolla, queso', 'empanada', 520.00, TRUE, ARRAY['acelga', 'cebolla', 'queso'], 15),
  ('Empanada de Roquefort', 'Queso roquefort, cebolla', 'empanada', 620.00, TRUE, ARRAY['roquefort', 'cebolla'], 15)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO menu_items (nombre, descripcion, categoria, precio, disponible, ingredientes, tiempo_preparacion_min) VALUES
  ('Coca-Cola 1.5L', 'Gaseosa Coca-Cola 1.5 litros', 'bebida', 1200.00, TRUE, ARRAY[], 0),
  ('Coca-Cola 2.25L', 'Gaseosa Coca-Cola 2.25 litros', 'bebida', 1800.00, TRUE, ARRAY[], 0),
  ('Sprite 1.5L', 'Gaseosa Sprite 1.5 litros', 'bebida', 1200.00, TRUE, ARRAY[], 0),
  ('Fanta 1.5L', 'Gaseosa Fanta 1.5 litros', 'bebida', 1200.00, TRUE, ARRAY[], 0),
  ('Agua Mineral 1.5L', 'Agua mineral sin gas', 'bebida', 800.00, TRUE, ARRAY[], 0),
  ('Cerveza Quilmes 1L', 'Cerveza Quilmes litro', 'bebida', 1500.00, TRUE, ARRAY[], 0)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO menu_items (nombre, descripcion, categoria, precio, disponible, ingredientes, tiempo_preparacion_min) VALUES
  ('Flan Casero', 'Flan con dulce de leche y crema', 'postre', 1200.00, TRUE, ARRAY['huevo', 'leche', 'dulce de leche'], 5),
  ('Helado 1/4kg', 'Helado artesanal (gusto a elección)', 'postre', 1500.00, TRUE, ARRAY[], 5)
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO menu_items (nombre, descripcion, categoria, precio, disponible, ingredientes, tiempo_preparacion_min) VALUES
  ('Extra Muzzarella', 'Porción extra de muzzarella', 'extra', 800.00, TRUE, ARRAY['muzzarella'], 0),
  ('Extra Jamón', 'Porción extra de jamón', 'extra', 700.00, TRUE, ARRAY['jamón'], 0),
  ('Extra Aceitunas', 'Porción extra de aceitunas', 'extra', 500.00, TRUE, ARRAY['aceitunas'], 0)
ON CONFLICT (nombre) DO NOTHING;

-- Pedidos de ejemplo (Carlos, María, Juan) con sus comandas y pagos
DO $$
DECLARE
  cliente_carlos UUID;
  cliente_maria UUID;
  cliente_juan UUID;
  pedido1_id UUID;
  pedido2_id UUID;
  pedido3_id UUID;
  pizza_muzza UUID;
  pizza_napo UUID;
  empanada_carne UUID;
  coca_15 UUID;
BEGIN
  SELECT id INTO cliente_carlos FROM clientes WHERE telefono = '2262401234';
  SELECT id INTO cliente_maria FROM clientes WHERE telefono = '2262405678';
  SELECT id INTO cliente_juan FROM clientes WHERE telefono = '2262409012';

  SELECT id INTO pizza_muzza FROM menu_items WHERE nombre = 'Pizza Muzzarella';
  SELECT id INTO pizza_napo FROM menu_items WHERE nombre = 'Pizza Napolitana';
  SELECT id INTO empanada_carne FROM menu_items WHERE nombre = 'Empanada de Carne';
  SELECT id INTO coca_15 FROM menu_items WHERE nombre = 'Coca-Cola 1.5L';

  INSERT INTO pedidos (id, cliente_id, estado, tipo_entrega, direccion_entrega, total, notas_cliente, created_at)
  VALUES (
    uuid_generate_v4(), cliente_carlos, 'entregado', 'delivery', 'Calle 83 N° 456, Necochea', 4700.00, 'Timbre roto, golpear puerta', NOW() - INTERVAL '2 days'
  ) RETURNING id INTO pedido1_id;

  INSERT INTO comandas (pedido_id, menu_item_id, cantidad, precio_unitario, notas) VALUES
    (pedido1_id, pizza_muzza, 1, 3500.00, NULL),
    (pedido1_id, coca_15, 1, 1200.00, NULL);

  INSERT INTO pagos (pedido_id, metodo_pago, monto, estado) VALUES
    (pedido1_id, 'efectivo', 4700.00, 'aprobado');

  INSERT INTO pedidos (id, cliente_id, estado, tipo_entrega, direccion_entrega, total, notas_cliente, created_at)
  VALUES (
    uuid_generate_v4(), cliente_maria, 'confirmado', 'retiro', NULL, 12000.00, 'Para las 21:00 hs', NOW() - INTERVAL '3 hours'
  ) RETURNING id INTO pedido2_id;

  INSERT INTO comandas (pedido_id, menu_item_id, cantidad, precio_unitario, notas) VALUES
    (pedido2_id, pizza_napo, 2, 4200.00, 'Una sin aceitunas'),
    (pedido2_id, empanada_carne, 6, 600.00, NULL);

  INSERT INTO pagos (pedido_id, metodo_pago, monto, estado, referencia_externa) VALUES
    (pedido2_id, 'mercadopago', 12000.00, 'aprobado', 'MP-12345678');

  INSERT INTO pedidos (id, cliente_id, estado, tipo_entrega, direccion_entrega, total, notas_cliente, created_at)
  VALUES (
    uuid_generate_v4(), cliente_juan, 'pendiente', 'delivery', 'Calle 61 N° 789, Necochea', 5300.00, NULL, NOW() - INTERVAL '15 minutes'
  ) RETURNING id INTO pedido3_id;

  INSERT INTO comandas (pedido_id, menu_item_id, cantidad, precio_unitario, notas) VALUES
    (pedido3_id, pizza_muzza, 1, 3500.00, NULL),
    (pedido3_id, coca_15, 1, 1200.00, NULL),
    (pedido3_id, empanada_carne, 1, 600.00, NULL);

  INSERT INTO pagos (pedido_id, metodo_pago, monto, estado) VALUES
    (pedido3_id, 'efectivo', 5300.00, 'pendiente');

  RAISE NOTICE 'Seed data insertado exitosamente';
END $$;

-- [END seed_data.sql]


-- 3) TABLAS ADICIONALES ------------------------------------------------------

-- [BEGIN add_missing_tables.sql]

-- Habilitar extensión para UUIDs si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE', 'SELECT')),
  new_data JSONB,
  old_data JSONB,
  user_id UUID,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_ts ON audit_logs(table_name, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_operation ON audit_logs(operation, timestamp DESC);

-- consent_records
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('marketing', 'analytics', 'terms', 'privacy', 'cookies')),
  given BOOLEAN NOT NULL DEFAULT false,
  given_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_consent_records_user_type ON consent_records(user_id, consent_type, given_at DESC);
CREATE INDEX IF NOT EXISTS idx_consent_active ON consent_records(user_id, consent_type) WHERE given = true AND withdrawn_at IS NULL;

-- support_tickets
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  prioridad TEXT CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')) DEFAULT 'media',
  asunto TEXT NOT NULL,
  descripcion TEXT,
  estado TEXT CHECK (estado IN ('abierto', 'en_progreso', 'resuelto', 'cerrado')) DEFAULT 'abierto',
  resolved BOOLEAN DEFAULT false,
  assigned_to UUID,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  CONSTRAINT fk_support_tickets_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE SET NULL,
  CONSTRAINT fk_support_tickets_assignee FOREIGN KEY (assigned_to) REFERENCES profiles(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user ON support_tickets(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_estado ON support_tickets(estado, prioridad, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned ON support_tickets(assigned_to) WHERE resolved = false;

-- payment_methods
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('tarjeta_credito', 'tarjeta_debito', 'transferencia', 'efectivo', 'mercadopago')),
  alias TEXT NOT NULL,
  token TEXT,
  ultimos_digitos TEXT,
  vencimiento TEXT,
  es_predeterminado BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT fk_payment_methods_user FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user ON payment_methods(user_id, activo);
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_methods_default ON payment_methods(user_id)
  WHERE es_predeterminado = true AND activo = true;

-- profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  name TEXT,
  email TEXT UNIQUE,
  phone TEXT,
  address TEXT,
  address_complement TEXT,
  ciudad TEXT,
  provincia TEXT,
  codigo_postal TEXT,
  dni TEXT UNIQUE,
  avatar_url TEXT,
  fecha_nacimiento DATE,
  preferencias JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_dni ON profiles(dni);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON profiles(phone);

-- zonas_entrega
CREATE TABLE IF NOT EXISTS zonas_entrega (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  costo_base DECIMAL(10,2) NOT NULL DEFAULT 500.00,
  costo_adicional_por_km DECIMAL(10,2) DEFAULT 0.00,
  tiempo_estimado_minutos INTEGER DEFAULT 45,
  radio_km DECIMAL(5,2),
  palabras_clave TEXT,
  activa BOOLEAN DEFAULT true,
  prioridad INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_zonas_entrega_nombre ON zonas_entrega(nombre);
CREATE INDEX IF NOT EXISTS idx_zonas_entrega_activa ON zonas_entrega(activa, prioridad DESC);

-- dni_validations
CREATE TABLE IF NOT EXISTS dni_validations (
  dni TEXT PRIMARY KEY,
  valido BOOLEAN NOT NULL,
  nombre_completo TEXT,
  estado TEXT CHECK (estado IN ('valido', 'invalido', 'no_encontrado', 'error_api')),
  detalles JSONB,
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expira_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dni_validations_expira ON dni_validations(expira_at);
CREATE INDEX IF NOT EXISTS idx_dni_validations_estado ON dni_validations(estado, cached_at DESC);

-- Habilitar RLS y políticas mínimas
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE zonas_entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE dni_validations ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs' AND policyname='Users read own audit logs') THEN
    CREATE POLICY "Users read own audit logs" ON audit_logs FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs' AND policyname='Only backend inserts audit logs') THEN
    CREATE POLICY "Only backend inserts audit logs" ON audit_logs FOR INSERT WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs' AND policyname='Immutable audit logs') THEN
    CREATE POLICY "Immutable audit logs" ON audit_logs FOR UPDATE USING (false);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='audit_logs' AND policyname='Immutable audit log deletes') THEN
    CREATE POLICY "Immutable audit log deletes" ON audit_logs FOR DELETE USING (false);
  END IF;
END $$;

-- Triggers updated_at
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_consent_records_updated_at') THEN
    CREATE TRIGGER update_consent_records_updated_at BEFORE UPDATE ON consent_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_support_tickets_updated_at') THEN
    CREATE TRIGGER update_support_tickets_updated_at BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_payment_methods_updated_at') THEN
    CREATE TRIGGER update_payment_methods_updated_at BEFORE UPDATE ON payment_methods FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_profiles_updated_at') THEN
    CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='update_zonas_entrega_updated_at') THEN
    CREATE TRIGGER update_zonas_entrega_updated_at BEFORE UPDATE ON zonas_entrega FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

-- Seed zonas_entrega por defecto (idempotente)
INSERT INTO zonas_entrega (nombre, descripcion, costo_base, tiempo_estimado_minutos, palabras_clave) VALUES
  ('Centro', 'Microcentro y alrededores', 500.00, 30, 'centro,microcentro,downtown,retiro,san nicolas'),
  ('Palermo', 'Zona Palermo completo', 700.00, 40, 'palermo,palermo soho,palermo hollywood'),
  ('Belgrano', 'Belgrano y Núñez', 800.00, 45, 'belgrano,nuñez,colegiales'),
  ('Caballito', 'Zona Caballito', 650.00, 35, 'caballito,villa crespo,almagro'),
  ('Recoleta', 'Recoleta y Barrio Norte', 600.00, 35, 'recoleta,barrio norte')
ON CONFLICT (nombre) DO NOTHING;

-- [END add_missing_tables.sql]


-- 4) RLS AVANZADA + AUDITORÍA ----------------------------------------------

-- [BEGIN rls_security_audit.sql]

-- (Respetamos drops condicionales para idempotencia)

-- Pedidos
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pedidos' AND policyname='Backend full access to pedidos') THEN
    DROP POLICY "Backend full access to pedidos" ON pedidos;
  END IF;
END $$;

CREATE POLICY IF NOT EXISTS "Users read own pedidos" ON pedidos FOR SELECT USING (auth.uid() = cliente_id OR auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "Users create own pedidos" ON pedidos FOR INSERT WITH CHECK (auth.uid() = cliente_id OR auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "Only backend updates pedidos" ON pedidos FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "Only backend deletes pedidos" ON pedidos FOR DELETE USING (auth.role() = 'service_role');

-- Clientes
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='clientes' AND policyname='Backend full access to clientes') THEN
    DROP POLICY "Backend full access to clientes" ON clientes;
  END IF;
END $$;

CREATE POLICY IF NOT EXISTS "Users read own cliente" ON clientes FOR SELECT USING (auth.uid()::text = id::text OR auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "Backend creates clientes" ON clientes FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "Users update own cliente" ON clientes FOR UPDATE USING (auth.uid()::text = id::text OR auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "Backend deletes clientes" ON clientes FOR DELETE USING (auth.role() = 'service_role');

-- Comandas
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='comandas' AND policyname='Backend full access to comandas') THEN
    DROP POLICY "Backend full access to comandas" ON comandas;
  END IF;
END $$;

CREATE POLICY IF NOT EXISTS "Users read own comandas" ON comandas FOR SELECT USING (
  EXISTS (SELECT 1 FROM pedidos p WHERE p.id = comandas.pedido_id AND (p.cliente_id = auth.uid() OR auth.role() = 'service_role'))
);
CREATE POLICY IF NOT EXISTS "Backend creates comandas" ON comandas FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "Backend updates comandas" ON comandas FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "Backend deletes comandas" ON comandas FOR DELETE USING (auth.role() = 'service_role');

-- Pagos
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename='pagos' AND policyname='Backend full access to pagos') THEN
    DROP POLICY "Backend full access to pagos" ON pagos;
  END IF;
END $$;

CREATE POLICY IF NOT EXISTS "Users read own pagos" ON pagos FOR SELECT USING (
  EXISTS (SELECT 1 FROM pedidos p WHERE p.id = pagos.pedido_id AND (p.cliente_id = auth.uid() OR auth.role() = 'service_role'))
);
CREATE POLICY IF NOT EXISTS "Backend creates pagos" ON pagos FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "Backend updates pagos" ON pagos FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "Backend deletes pagos" ON pagos FOR DELETE USING (auth.role() = 'service_role');

-- Menu items: reforzar prohibiciones
CREATE POLICY IF NOT EXISTS "Only backend creates menu_items" ON menu_items FOR INSERT WITH CHECK (auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "Only backend updates menu_items" ON menu_items FOR UPDATE USING (auth.role() = 'service_role');
CREATE POLICY IF NOT EXISTS "Only backend deletes menu_items" ON menu_items FOR DELETE USING (auth.role() = 'service_role');

-- Función y triggers de auditoría
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
  current_ip INET;
  current_user_agent TEXT;
BEGIN
  current_user_id := auth.uid();
  current_ip := COALESCE(NULLIF(current_setting('request.headers', true)::json->>'x-forwarded-for', '')::inet, inet '127.0.0.1');
  current_user_agent := COALESCE(current_setting('request.headers', true)::json->>'user-agent', 'unknown');

  INSERT INTO audit_logs (table_name, operation, old_data, new_data, user_id, ip_address, user_agent)
  VALUES (TG_TABLE_NAME, TG_OP,
    CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN row_to_json(OLD) ELSE NULL END,
    CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN row_to_json(NEW) ELSE NULL END,
    current_user_id, current_ip, current_user_agent
  );

  IF TG_OP = 'DELETE' THEN RETURN OLD; ELSE RETURN NEW; END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Triggers de auditoría (recreación idempotente)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='audit_pedidos_trigger') THEN
    DROP TRIGGER audit_pedidos_trigger ON pedidos;
  END IF;
  CREATE TRIGGER audit_pedidos_trigger AFTER INSERT OR UPDATE OR DELETE ON pedidos FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='audit_pagos_trigger') THEN
    DROP TRIGGER audit_pagos_trigger ON pagos;
  END IF;
  CREATE TRIGGER audit_pagos_trigger AFTER INSERT OR UPDATE OR DELETE ON pagos FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='audit_clientes_trigger') THEN
    DROP TRIGGER audit_clientes_trigger ON clientes;
  END IF;
  CREATE TRIGGER audit_clientes_trigger AFTER INSERT OR UPDATE OR DELETE ON clientes FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='audit_menu_items_trigger') THEN
    DROP TRIGGER audit_menu_items_trigger ON menu_items;
  END IF;
  CREATE TRIGGER audit_menu_items_trigger AFTER UPDATE OR DELETE ON menu_items FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
END $$;

-- Vistas/funciones auxiliares
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

CREATE OR REPLACE FUNCTION is_pedido_owner(pedido_id UUID, user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM pedidos WHERE id = pedido_id AND cliente_id = user_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Reporte de estado
DO $$
DECLARE total_policies INTEGER; total_triggers INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_policies FROM pg_policies WHERE schemaname='public';
  SELECT COUNT(*) INTO total_triggers FROM pg_trigger WHERE tgname LIKE 'audit_%_trigger';
  RAISE NOTICE '✅ RLS Security Audit Migration Complete';
  RAISE NOTICE 'Total RLS policies: %', total_policies;
  RAISE NOTICE 'Audit triggers: %', total_triggers;
END $$;

-- [END rls_security_audit.sql]


-- 5) ÍNDICES DE PERFORMANCE --------------------------------------------------

-- [BEGIN performance_indexes.sql]

-- Índices compuestos, parciales, GIN y utilitarios
CREATE INDEX IF NOT EXISTS idx_pedidos_cliente_estado_created ON pedidos(cliente_id, estado, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_created_estado ON pedidos(created_at DESC, estado) INCLUDE (cliente_id, total, tipo_entrega);
CREATE INDEX IF NOT EXISTS idx_comandas_pedido_menu_cantidad ON comandas(pedido_id, menu_item_id) INCLUDE (cantidad, precio_unitario, subtotal);
CREATE INDEX IF NOT EXISTS idx_pagos_pedido_estado_metodo ON pagos(pedido_id, estado) INCLUDE (monto, metodo_pago, created_at);
CREATE INDEX IF NOT EXISTS idx_pedidos_active_states ON pedidos(created_at DESC, estado) WHERE estado IN ('pendiente','confirmado','en_preparacion');
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON menu_items(categoria, nombre) WHERE disponible = true;
CREATE INDEX IF NOT EXISTS idx_pagos_pending ON pagos(pedido_id, created_at DESC) WHERE estado = 'pendiente';
CREATE INDEX IF NOT EXISTS idx_audit_logs_recent ON audit_logs(table_name, operation, timestamp DESC) WHERE timestamp > NOW() - INTERVAL '30 days';
CREATE INDEX IF NOT EXISTS idx_clientes_direccion_gin ON clientes USING gin(direccion gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_clientes_notas_gin ON clientes USING gin(to_tsvector('spanish', COALESCE(notas, '')));
CREATE INDEX IF NOT EXISTS idx_menu_items_nombre_gin ON menu_items USING gin(nombre gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_comandas_menu_item_fk ON comandas(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_pagos_pedido_fk ON pagos(pedido_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_fk ON support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assignee_fk ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_payment_methods_user_fk ON payment_methods(user_id);
CREATE INDEX IF NOT EXISTS idx_pedidos_updated_desc ON pedidos(updated_at DESC) WHERE estado NOT IN ('entregado','cancelado');
CREATE INDEX IF NOT EXISTS idx_comandas_created_in_pedido ON comandas(pedido_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp_desc ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_pedidos_date_total ON pedidos(DATE(created_at), total) WHERE estado = 'entregado';
CREATE INDEX IF NOT EXISTS idx_comandas_menu_item_cantidad_sum ON comandas(menu_item_id, cantidad);
CREATE INDEX IF NOT EXISTS idx_pagos_metodo_monto ON pagos(metodo_pago, monto) WHERE estado = 'aprobado';
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_operation ON audit_logs(table_name, operation, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_consent_records_active ON consent_records(user_id, consent_type) WHERE given = true AND withdrawn_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_dni_validations_estado_cached ON dni_validations(estado, cached_at DESC);

ANALYZE clientes; ANALYZE menu_items; ANALYZE pedidos; ANALYZE comandas; ANALYZE pagos; ANALYZE audit_logs; ANALYZE zonas_entrega; ANALYZE support_tickets;

-- Funciones de monitoreo (opcionales)
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

CREATE OR REPLACE FUNCTION check_index_usage()
RETURNS TABLE(schemaname TEXT, tablename TEXT, indexname TEXT, index_size TEXT, index_scans BIGINT, rows_read BIGINT, unused BOOLEAN) AS $$
BEGIN
  RETURN QUERY
  SELECT schemaname::TEXT, tablename::TEXT, indexname::TEXT, pg_size_pretty(pg_relation_size(indexrelid)) AS index_size, idx_scan, idx_tup_read, (idx_scan = 0) AS unused
  FROM pg_stat_user_indexes
  WHERE schemaname = 'public'
  ORDER BY idx_scan ASC, pg_relation_size(indexrelid) DESC;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION slow_queries_report(min_duration_ms INTEGER DEFAULT 1000)
RETURNS TABLE(query TEXT, calls BIGINT, total_time_ms NUMERIC, mean_time_ms NUMERIC, max_time_ms NUMERIC) AS $$
BEGIN
  RETURN QUERY
  SELECT LEFT(query, 200), calls, ROUND((total_exec_time)::NUMERIC, 2), ROUND((mean_exec_time)::NUMERIC, 2), ROUND((max_exec_time)::NUMERIC, 2)
  FROM pg_stat_statements
  WHERE mean_exec_time > min_duration_ms
  ORDER BY mean_exec_time DESC
  LIMIT 20;
END;
$$ LANGUAGE plpgsql;

-- Reporte final
DO $$
DECLARE total_indexes INTEGER; gin_indexes INTEGER; partial_indexes INTEGER; total_size TEXT;
BEGIN
  SELECT COUNT(*) INTO total_indexes FROM pg_indexes WHERE schemaname='public';
  SELECT COUNT(*) INTO gin_indexes FROM pg_indexes WHERE schemaname='public' AND indexdef LIKE '%USING gin%';
  SELECT COUNT(*) INTO partial_indexes FROM pg_indexes WHERE schemaname='public' AND indexdef LIKE '%WHERE%';
  SELECT pg_size_pretty(SUM(pg_relation_size(indexrelid))) INTO total_size FROM pg_stat_user_indexes WHERE schemaname='public';
  RAISE NOTICE '✅ Performance Indexes Migration Complete';
  RAISE NOTICE 'Total indexes: % | GIN: % | Partial: % | Size: %', total_indexes, gin_indexes, partial_indexes, total_size;
END $$;

-- [END performance_indexes.sql]

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
