-- ============================================================================
-- SIST_PIZZA - Tablas Adicionales Referenciadas por el Backend
-- ============================================================================
-- Autor: eevans-d
-- Fecha: 2025-01-25
-- Propósito: Agregar tablas para auditoría, consentimientos, soporte, 
--            pagos, perfiles, zonas de entrega y validación de DNI
-- ============================================================================

-- Habilitar extensión para UUIDs si no está habilitada
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLA: audit_logs
-- Descripción: Registro de auditoría para trazabilidad de operaciones
-- ============================================================================
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

CREATE INDEX idx_audit_logs_table_ts ON audit_logs(table_name, timestamp DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id, timestamp DESC);
CREATE INDEX idx_audit_logs_operation ON audit_logs(operation, timestamp DESC);

COMMENT ON TABLE audit_logs IS 'Registro de auditoría para todas las operaciones críticas';
COMMENT ON COLUMN audit_logs.new_data IS 'Datos después de la operación (JSON)';
COMMENT ON COLUMN audit_logs.old_data IS 'Datos antes de la operación (JSON)';

-- ============================================================================
-- TABLA: consent_records
-- Descripción: Consentimientos GDPR/Ley 25.326 por usuario
-- ============================================================================
CREATE TABLE IF NOT EXISTS consent_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  consent_type TEXT NOT NULL CHECK (consent_type IN ('marketing', 'analytics', 'terms', 'privacy', 'cookies')),
  given BOOLEAN NOT NULL DEFAULT false,
  given_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  withdrawn_at TIMESTAMPTZ,
  ip_address INET,
  user_agent TEXT,
  version TEXT NOT NULL, -- Versión del documento de consentimiento
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_consent_records_user_type ON consent_records(user_id, consent_type, given_at DESC);
CREATE INDEX idx_consent_active ON consent_records(user_id, consent_type) WHERE given = true AND withdrawn_at IS NULL;

COMMENT ON TABLE consent_records IS 'Registro de consentimientos para compliance GDPR/Ley 25.326';
COMMENT ON COLUMN consent_records.version IS 'Versión del documento (ej: v1.0, v2.1)';

-- ============================================================================
-- TABLA: support_tickets
-- Descripción: Tickets de soporte al cliente
-- ============================================================================
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID,
  prioridad TEXT CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')) DEFAULT 'media',
  asunto TEXT NOT NULL,
  descripcion TEXT,
  estado TEXT CHECK (estado IN ('abierto', 'en_progreso', 'resuelto', 'cerrado')) DEFAULT 'abierto',
  resolved BOOLEAN DEFAULT false,
  assigned_to UUID, -- ID del agente asignado
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_support_tickets_user ON support_tickets(user_id, created_at DESC);
CREATE INDEX idx_support_tickets_estado ON support_tickets(estado, prioridad, created_at DESC);
CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_to) WHERE resolved = false;

COMMENT ON TABLE support_tickets IS 'Sistema de tickets de soporte integrado con Chatwoot';

-- ============================================================================
-- TABLA: payment_methods
-- Descripción: Métodos de pago guardados por usuario
-- ============================================================================
CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('tarjeta_credito', 'tarjeta_debito', 'transferencia', 'efectivo', 'mercadopago')),
  alias TEXT NOT NULL, -- Nombre amigable (ej: "Visa **** 4242")
  token TEXT, -- Token del gateway de pago (nunca guardar datos sensibles)
  ultimos_digitos TEXT, -- Últimos 4 dígitos (solo para display)
  vencimiento TEXT, -- MM/YY formato
  es_predeterminado BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_methods_user ON payment_methods(user_id, activo);
CREATE UNIQUE INDEX idx_payment_methods_default ON payment_methods(user_id) 
  WHERE es_predeterminado = true AND activo = true;

COMMENT ON TABLE payment_methods IS 'Métodos de pago tokenizados por usuario';
COMMENT ON COLUMN payment_methods.token IS 'Token del gateway (MercadoPago/Modo) - NUNCA datos reales';

-- ============================================================================
-- TABLA: profiles
-- Descripción: Perfiles extendidos de usuarios (complementa auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY, -- Mismo ID que auth.users
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
  preferencias JSONB DEFAULT '{}'::jsonb, -- Preferencias del usuario
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_email ON profiles(email);
CREATE INDEX idx_profiles_dni ON profiles(dni);
CREATE INDEX idx_profiles_phone ON profiles(phone);

COMMENT ON TABLE profiles IS 'Perfiles extendidos de usuarios vinculados a auth.users';
COMMENT ON COLUMN profiles.preferencias IS 'Configuraciones personalizadas (JSON)';

-- ============================================================================
-- TABLA: zonas_entrega
-- Descripción: Zonas de entrega y costos para cálculo de envío
-- ============================================================================
CREATE TABLE IF NOT EXISTS zonas_entrega (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  costo_base DECIMAL(10,2) NOT NULL DEFAULT 500.00,
  costo_adicional_por_km DECIMAL(10,2) DEFAULT 0.00,
  tiempo_estimado_minutos INTEGER DEFAULT 45,
  radio_km DECIMAL(5,2), -- Radio desde el local
  palabras_clave TEXT, -- Coma-separado para matching (ej: "centro,downtown,microcentro")
  activa BOOLEAN DEFAULT true,
  prioridad INTEGER DEFAULT 0, -- Para ordenar en caso de zonas superpuestas
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_zonas_entrega_nombre ON zonas_entrega(nombre);
CREATE INDEX idx_zonas_entrega_activa ON zonas_entrega(activa, prioridad DESC);

COMMENT ON TABLE zonas_entrega IS 'Definición de zonas y costos para deliveries';
COMMENT ON COLUMN zonas_entrega.palabras_clave IS 'Usadas por webhookN8N para matching automático';

-- ============================================================================
-- TABLA: dni_validations
-- Descripción: Cache de validaciones de DNI contra AFIP
-- ============================================================================
CREATE TABLE IF NOT EXISTS dni_validations (
  dni TEXT PRIMARY KEY,
  valido BOOLEAN NOT NULL,
  nombre_completo TEXT,
  estado TEXT CHECK (estado IN ('valido', 'invalido', 'no_encontrado', 'error_api')),
  detalles JSONB, -- Respuesta completa de la API
  cached_at TIMESTAMPTZ DEFAULT NOW(),
  expira_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'), -- Cache por 30 días
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dni_validations_expira ON dni_validations(expira_at);
CREATE INDEX idx_dni_validations_estado ON dni_validations(estado, cached_at DESC);

COMMENT ON TABLE dni_validations IS 'Cache de validaciones AFIP para reducir llamadas a la API';
COMMENT ON COLUMN dni_validations.expira_at IS 'Los registros se pueden purgar después de esta fecha';

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================
-- Habilitar RLS en todas las tablas (políticas específicas a definir)

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE zonas_entrega ENABLE ROW LEVEL SECURITY;
ALTER TABLE dni_validations ENABLE ROW LEVEL SECURITY;

-- Políticas básicas de RLS (ajustar según necesidades)

-- audit_logs: Solo service_role puede leer/escribir
CREATE POLICY "Service role full access" ON audit_logs
  FOR ALL USING (auth.role() = 'service_role');

-- consent_records: Usuarios leen sus propios registros
CREATE POLICY "Users read own consents" ON consent_records
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role manages consents" ON consent_records
  FOR ALL USING (auth.role() = 'service_role');

-- support_tickets: Usuarios ven sus propios tickets
CREATE POLICY "Users read own tickets" ON support_tickets
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users create own tickets" ON support_tickets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role manages tickets" ON support_tickets
  FOR ALL USING (auth.role() = 'service_role');

-- payment_methods: Usuarios manejan sus propios métodos
CREATE POLICY "Users manage own payment methods" ON payment_methods
  FOR ALL USING (auth.uid() = user_id);

-- profiles: Usuarios leen y actualizan su propio perfil
CREATE POLICY "Users read own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role manages profiles" ON profiles
  FOR ALL USING (auth.role() = 'service_role');

-- zonas_entrega: Lectura pública, escritura service_role
CREATE POLICY "Public read zonas" ON zonas_entrega
  FOR SELECT USING (activa = true);

CREATE POLICY "Service role manages zonas" ON zonas_entrega
  FOR ALL USING (auth.role() = 'service_role');

-- dni_validations: Solo service_role
CREATE POLICY "Service role manages dni validations" ON dni_validations
  FOR ALL USING (auth.role() = 'service_role');

-- ============================================================================
-- FUNCIONES AUXILIARES
-- ============================================================================

-- Función para actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_consent_records_updated_at
  BEFORE UPDATE ON consent_records
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON payment_methods
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_zonas_entrega_updated_at
  BEFORE UPDATE ON zonas_entrega
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- DATOS INICIALES (SEED DATA)
-- ============================================================================

-- Zonas de entrega por defecto para Buenos Aires
INSERT INTO zonas_entrega (nombre, descripcion, costo_base, tiempo_estimado_minutos, palabras_clave) VALUES
  ('Centro', 'Microcentro y alrededores', 500.00, 30, 'centro,microcentro,downtown,retiro,san nicolas'),
  ('Palermo', 'Zona Palermo completo', 700.00, 40, 'palermo,palermo soho,palermo hollywood'),
  ('Belgrano', 'Belgrano y Núñez', 800.00, 45, 'belgrano,nuñez,colegiales'),
  ('Caballito', 'Zona Caballito', 650.00, 35, 'caballito,villa crespo,almagro'),
  ('Recoleta', 'Recoleta y Barrio Norte', 600.00, 35, 'recoleta,barrio norte')
ON CONFLICT (nombre) DO NOTHING;

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '✅ Migración completada exitosamente';
  RAISE NOTICE 'Tablas creadas: 7';
  RAISE NOTICE 'Índices creados: ~20';
  RAISE NOTICE 'Políticas RLS: Habilitadas';
  RAISE NOTICE 'Zonas de entrega seed: 5';
END $$;
