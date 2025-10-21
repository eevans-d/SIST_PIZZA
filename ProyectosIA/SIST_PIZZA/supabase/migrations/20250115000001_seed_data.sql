-- ============================================================================
-- SIST_PIZZA - Datos de Prueba (Prompt 2)
-- Contexto: Pizzería en Necochea, Buenos Aires, Argentina
-- ============================================================================

-- ============================================================================
-- SEED: Clientes de Necochea
-- ============================================================================
INSERT INTO clientes (nombre, telefono, direccion, email) VALUES
  ('Carlos Martínez', '2262401234', 'Calle 83 N° 456, Necochea', 'carlos.m@example.com'),
  ('María González', '2262405678', 'Av. 79 N° 1234, Necochea', 'maria.g@example.com'),
  ('Juan Rodríguez', '2262409012', 'Calle 61 N° 789, Necochea', NULL),
  ('Ana López', '2262403456', 'Av. 10 N° 234, Necochea', 'ana.lopez@example.com'),
  ('Pedro Fernández', '2262407890', 'Calle 89 N° 567, Necochea', NULL)
ON CONFLICT (telefono) DO NOTHING;

-- ============================================================================
-- SEED: Menú de la Pizzería
-- ============================================================================

-- Pizzas (precios en ARS - Pesos Argentinos)
INSERT INTO menu_items (nombre, descripcion, categoria, precio, disponible, ingredientes, tiempo_preparacion_min) VALUES
  ('Pizza Muzzarella', 'Salsa de tomate, muzzarella', 'pizza', 3500.00, TRUE, ARRAY['salsa', 'muzzarella'], 20),
  ('Pizza Napolitana', 'Salsa, muzzarella, tomate, ajo, aceitunas', 'pizza', 4200.00, TRUE, ARRAY['salsa', 'muzzarella', 'tomate', 'ajo', 'aceitunas'], 22),
  ('Pizza Calabresa', 'Salsa, muzzarella, longaniza calabresa', 'pizza', 4800.00, TRUE, ARRAY['salsa', 'muzzarella', 'calabresa'], 22),
  ('Pizza Jamón y Morrones', 'Salsa, muzzarella, jamón, morrones', 'pizza', 4500.00, TRUE, ARRAY['salsa', 'muzzarella', 'jamón', 'morrones'], 20),
  ('Pizza Fugazzeta', 'Muzzarella, cebolla', 'pizza', 4000.00, TRUE, ARRAY['muzzarella', 'cebolla'], 18),
  ('Pizza Especial de la Casa', 'Salsa, muzzarella, jamón, morrones, huevo, aceitunas', 'pizza', 5500.00, TRUE, ARRAY['salsa', 'muzzarella', 'jamón', 'morrones', 'huevo', 'aceitunas'], 25),
  ('Pizza Cuatro Quesos', 'Muzzarella, roquefort, provolone, parmesano', 'pizza', 5200.00, TRUE, ARRAY['muzzarella', 'roquefort', 'provolone', 'parmesano'], 23)
ON CONFLICT (nombre) DO NOTHING;

-- Empanadas
INSERT INTO menu_items (nombre, descripcion, categoria, precio, disponible, ingredientes, tiempo_preparacion_min) VALUES
  ('Empanada de Carne', 'Carne cortada a cuchillo, cebolla, huevo', 'empanada', 600.00, TRUE, ARRAY['carne', 'cebolla', 'huevo'], 15),
  ('Empanada de Jamón y Queso', 'Jamón, queso muzzarella', 'empanada', 550.00, TRUE, ARRAY['jamón', 'queso'], 15),
  ('Empanada de Pollo', 'Pollo, cebolla, pimiento', 'empanada', 580.00, TRUE, ARRAY['pollo', 'cebolla', 'pimiento'], 15),
  ('Empanada de Verdura', 'Acelga, cebolla, queso', 'empanada', 520.00, TRUE, ARRAY['acelga', 'cebolla', 'queso'], 15),
  ('Empanada de Roquefort', 'Queso roquefort, cebolla', 'empanada', 620.00, TRUE, ARRAY['roquefort', 'cebolla'], 15)
ON CONFLICT (nombre) DO NOTHING;

-- Bebidas
INSERT INTO menu_items (nombre, descripcion, categoria, precio, disponible, ingredientes, tiempo_preparacion_min) VALUES
  ('Coca-Cola 1.5L', 'Gaseosa Coca-Cola 1.5 litros', 'bebida', 1200.00, TRUE, ARRAY[], 0),
  ('Coca-Cola 2.25L', 'Gaseosa Coca-Cola 2.25 litros', 'bebida', 1800.00, TRUE, ARRAY[], 0),
  ('Sprite 1.5L', 'Gaseosa Sprite 1.5 litros', 'bebida', 1200.00, TRUE, ARRAY[], 0),
  ('Fanta 1.5L', 'Gaseosa Fanta 1.5 litros', 'bebida', 1200.00, TRUE, ARRAY[], 0),
  ('Agua Mineral 1.5L', 'Agua mineral sin gas', 'bebida', 800.00, TRUE, ARRAY[], 0),
  ('Cerveza Quilmes 1L', 'Cerveza Quilmes litro', 'bebida', 1500.00, TRUE, ARRAY[], 0)
ON CONFLICT (nombre) DO NOTHING;

-- Postres
INSERT INTO menu_items (nombre, descripcion, categoria, precio, disponible, ingredientes, tiempo_preparacion_min) VALUES
  ('Flan Casero', 'Flan con dulce de leche y crema', 'postre', 1200.00, TRUE, ARRAY['huevo', 'leche', 'dulce de leche'], 5),
  ('Helado 1/4kg', 'Helado artesanal (gusto a elección)', 'postre', 1500.00, TRUE, ARRAY[], 5)
ON CONFLICT (nombre) DO NOTHING;

-- Extras
INSERT INTO menu_items (nombre, descripcion, categoria, precio, disponible, ingredientes, tiempo_preparacion_min) VALUES
  ('Extra Muzzarella', 'Porción extra de muzzarella', 'extra', 800.00, TRUE, ARRAY['muzzarella'], 0),
  ('Extra Jamón', 'Porción extra de jamón', 'extra', 700.00, TRUE, ARRAY['jamón'], 0),
  ('Extra Aceitunas', 'Porción extra de aceitunas', 'extra', 500.00, TRUE, ARRAY['aceitunas'], 0)
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================================
-- SEED: Pedidos de prueba
-- ============================================================================

-- Obtener IDs de clientes y productos
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
  -- Obtener IDs de clientes
  SELECT id INTO cliente_carlos FROM clientes WHERE telefono = '2262401234';
  SELECT id INTO cliente_maria FROM clientes WHERE telefono = '2262405678';
  SELECT id INTO cliente_juan FROM clientes WHERE telefono = '2262409012';

  -- Obtener IDs de productos
  SELECT id INTO pizza_muzza FROM menu_items WHERE nombre = 'Pizza Muzzarella';
  SELECT id INTO pizza_napo FROM menu_items WHERE nombre = 'Pizza Napolitana';
  SELECT id INTO empanada_carne FROM menu_items WHERE nombre = 'Empanada de Carne';
  SELECT id INTO coca_15 FROM menu_items WHERE nombre = 'Coca-Cola 1.5L';

  -- Pedido 1: Carlos - Pizza Muzzarella + Coca-Cola (Delivery)
  INSERT INTO pedidos (id, cliente_id, estado, tipo_entrega, direccion_entrega, total, notas_cliente, created_at)
  VALUES (
    uuid_generate_v4(),
    cliente_carlos,
    'entregado',
    'delivery',
    'Calle 83 N° 456, Necochea',
    4700.00,
    'Timbre roto, golpear puerta',
    NOW() - INTERVAL '2 days'
  )
  RETURNING id INTO pedido1_id;

  -- Comandas del pedido 1
  INSERT INTO comandas (pedido_id, menu_item_id, cantidad, precio_unitario, notas) VALUES
    (pedido1_id, pizza_muzza, 1, 3500.00, NULL),
    (pedido1_id, coca_15, 1, 1200.00, NULL);

  -- Pago del pedido 1
  INSERT INTO pagos (pedido_id, metodo_pago, monto, estado) VALUES
    (pedido1_id, 'efectivo', 4700.00, 'aprobado');

  -- Pedido 2: María - 2 Pizzas Napolitana + 6 Empanadas (Retiro)
  INSERT INTO pedidos (id, cliente_id, estado, tipo_entrega, direccion_entrega, total, notas_cliente, created_at)
  VALUES (
    uuid_generate_v4(),
    cliente_maria,
    'confirmado',
    'retiro',
    NULL,
    12000.00,
    'Para las 21:00 hs',
    NOW() - INTERVAL '3 hours'
  )
  RETURNING id INTO pedido2_id;

  -- Comandas del pedido 2
  INSERT INTO comandas (pedido_id, menu_item_id, cantidad, precio_unitario, notas) VALUES
    (pedido2_id, pizza_napo, 2, 4200.00, 'Una sin aceitunas'),
    (pedido2_id, empanada_carne, 6, 600.00, NULL);

  -- Pago del pedido 2
  INSERT INTO pagos (pedido_id, metodo_pago, monto, estado, referencia_externa) VALUES
    (pedido2_id, 'mercadopago', 12000.00, 'aprobado', 'MP-12345678');

  -- Pedido 3: Juan - Pendiente de confirmación
  INSERT INTO pedidos (id, cliente_id, estado, tipo_entrega, direccion_entrega, total, notas_cliente, created_at)
  VALUES (
    uuid_generate_v4(),
    cliente_juan,
    'pendiente',
    'delivery',
    'Calle 61 N° 789, Necochea',
    5300.00,
    NULL,
    NOW() - INTERVAL '15 minutes'
  )
  RETURNING id INTO pedido3_id;

  -- Comandas del pedido 3
  INSERT INTO comandas (pedido_id, menu_item_id, cantidad, precio_unitario, notas) VALUES
    (pedido3_id, pizza_muzza, 1, 3500.00, NULL),
    (pedido3_id, coca_15, 1, 1200.00, NULL),
    (pedido3_id, empanada_carne, 1, 600.00, NULL);

  -- Pago del pedido 3 (pendiente)
  INSERT INTO pagos (pedido_id, metodo_pago, monto, estado) VALUES
    (pedido3_id, 'efectivo', 5300.00, 'pendiente');

  RAISE NOTICE 'Seed data insertado exitosamente';
END $$;
