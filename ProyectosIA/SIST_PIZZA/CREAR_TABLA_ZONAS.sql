-- ============================================================================
-- AGREGAR TABLA: zonas_entrega
-- ============================================================================
-- Esta tabla permite calcular dinámicamente el costo de envío basado en
-- la dirección del cliente.
--
-- EJECUTAR EN: Supabase SQL Editor
-- ============================================================================

-- 1. Crear tabla zonas_entrega
CREATE TABLE IF NOT EXISTS zonas_entrega (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  nombre VARCHAR(100) NOT NULL UNIQUE,
  palabras_clave VARCHAR(500) NOT NULL, -- Ejemplos: "centro,céntro,zona1"
  costo_base DECIMAL(10,2) NOT NULL DEFAULT 500,
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Crear índice para búsquedas rápidas
CREATE INDEX idx_zonas_entrega_activo ON zonas_entrega(activo);

-- 3. Insertar zonas de ejemplo
INSERT INTO zonas_entrega (nombre, palabras_clave, costo_base, descripcion)
VALUES
  ('Centro', 'centro,céntro,downtown', 300, 'Centro de la ciudad'),
  ('Zona Norte', 'norte,san,barrio,villa,flores', 500, 'Área norte'),
  ('Zona Sur', 'sur,villa,lugano,flores', 600, 'Área sur'),
  ('Zona Oeste', 'oeste,moreno,mataderos,liniers', 700, 'Área oeste'),
  ('Zona Este', 'este,san cristóbal,san,la boca,caballito', 550, 'Área este')
ON CONFLICT DO NOTHING;

-- 4. Verificación
SELECT COUNT(*) as total_zonas FROM zonas_entrega WHERE activo = true;

-- ============================================================================
-- ESPERADO: Success. No rows returned (o 5 rows inserted)
-- ============================================================================
