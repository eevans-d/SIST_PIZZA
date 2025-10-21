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
CREATE INDEX idx_clientes_telefono ON clientes(telefono);
CREATE INDEX idx_clientes_nombre_trgm ON clientes USING gin(nombre gin_trgm_ops);

-- RLS: Solo backend puede acceder (service_role key)
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backend full access to clientes"
  ON clientes
  FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_clientes_updated_at
  BEFORE UPDATE ON clientes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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
CREATE INDEX idx_menu_items_categoria ON menu_items(categoria);
CREATE INDEX idx_menu_items_disponible ON menu_items(disponible);

-- RLS: Lectura pública, escritura solo backend
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access to menu_items"
  ON menu_items
  FOR SELECT
  USING (TRUE);

CREATE POLICY "Backend full access to menu_items"
  ON menu_items
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

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
CREATE INDEX idx_pedidos_cliente_id ON pedidos(cliente_id);
CREATE INDEX idx_pedidos_estado ON pedidos(estado);
CREATE INDEX idx_pedidos_created_at ON pedidos(created_at DESC);

-- RLS: Solo backend
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backend full access to pedidos"
  ON pedidos
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE TRIGGER update_pedidos_updated_at
  BEFORE UPDATE ON pedidos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- TABLA: comandas (detalle de pedidos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS comandas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario DECIMAL(10, 2) NOT NULL CHECK (precio_unitario >= 0),
  subtotal DECIMAL(10, 2) NOT NULL CHECK (subtotal >= 0),
  notas TEXT, -- Ej: "Sin cebolla", "Extra queso"
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_comandas_pedido_id ON comandas(pedido_id);
CREATE INDEX idx_comandas_menu_item_id ON comandas(menu_item_id);

-- RLS: Solo backend
ALTER TABLE comandas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backend full access to comandas"
  ON comandas
  FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger para auto-calcular subtotal
CREATE OR REPLACE FUNCTION calculate_comanda_subtotal()
RETURNS TRIGGER AS $$
BEGIN
  NEW.subtotal = NEW.cantidad * NEW.precio_unitario;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_comandas_subtotal
  BEFORE INSERT OR UPDATE ON comandas
  FOR EACH ROW
  EXECUTE FUNCTION calculate_comanda_subtotal();

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
  referencia_externa VARCHAR(255), -- ID de transacción externa (MercadoPago, etc.)
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_pagos_pedido_id ON pagos(pedido_id);
CREATE INDEX idx_pagos_estado ON pagos(estado);

-- RLS: Solo backend
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Backend full access to pagos"
  ON pagos
  FOR ALL
  USING (auth.role() = 'service_role');

CREATE TRIGGER update_pagos_updated_at
  BEFORE UPDATE ON pagos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VISTAS (para reportes y dashboard)
-- ============================================================================

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

-- ============================================================================
-- COMENTARIOS (documentación inline)
-- ============================================================================

COMMENT ON TABLE clientes IS 'Clientes del sistema (PII: nombre, teléfono, dirección, email)';
COMMENT ON TABLE menu_items IS 'Menú de productos disponibles';
COMMENT ON TABLE pedidos IS 'Pedidos realizados por clientes';
COMMENT ON TABLE comandas IS 'Detalle de items en cada pedido';
COMMENT ON TABLE pagos IS 'Pagos asociados a pedidos';

COMMENT ON COLUMN clientes.telefono IS 'Identificador único del cliente (clave de búsqueda principal)';
COMMENT ON COLUMN pedidos.estado IS 'Estados: pendiente → confirmado → en_preparacion → listo → entregado';
COMMENT ON COLUMN pagos.referencia_externa IS 'ID de transacción de pasarela de pago (MercadoPago, etc.)';
