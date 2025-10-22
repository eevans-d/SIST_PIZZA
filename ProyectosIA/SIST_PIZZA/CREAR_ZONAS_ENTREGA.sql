═══════════════════════════════════════════════════════════════════════════════
TABLA ZONAS_ENTREGA - SQL PARA INSERTAR 5 ZONAS CON COSTOS DINÁMICOS
═══════════════════════════════════════════════════════════════════════════════

📋 INSTRUCCIONES:
1. Ejecuta PASO_2_SCHEMA_SQL.txt PRIMERO (crear tablas)
2. Ejecuta PASO_3_SEED_DATA_SQL.txt SEGUNDO (datos generales)
3. ENTONCES ejecuta esto (insert zonas_entrega)

Si los pasos 1-2 ya están hechos, copia esto y pégalo en Supabase SQL Editor

═══════════════════════════════════════════════════════════════════════════════

-- ============================================================================
-- INSERT ZONAS_ENTREGA - 5 zonas con costo dinámico
-- ============================================================================

INSERT INTO public.zonas_entrega (nombre, palabras_clave, costo_base, descripcion, activo)
VALUES
  (
    'Centro',
    'centro,downtown,microcentro,city center,caba,capital,santo domingo,diagonal norte,avenida de mayo,corrientes',
    300,
    'Centro de CABA - radio 2km',
    TRUE
  ),
  (
    'Zona Norte',
    'zona norte,north zone,san isidro,san martin,virreyes,martinez,pilar,victoria,acassuso,beccar',
    500,
    'Zona Norte - San Isidro, San Martín, Pilar',
    TRUE
  ),
  (
    'Zona Sur',
    'zona sur,south zone,avellaneda,riachuelo,quilmes,berazategui,lanus,banfield,millon,moron',
    600,
    'Zona Sur - Avellaneda, Quilmes, Berazategui',
    TRUE
  ),
  (
    'Zona Oeste',
    'zona oeste,west zone,moreno,ciudadela,merlo,ituzaingo,ciudadela,fiorini,rodriguez pena,el bosque',
    700,
    'Zona Oeste - Moreno, Ciudadela, Merlo',
    TRUE
  ),
  (
    'Zona Este',
    'zona este,east zone,acoyte,flores,parque centenario,parque rivadavia,caballito,almagro,boedo',
    550,
    'Zona Este - Flores, Caballito, Almagro',
    TRUE
  )
ON CONFLICT (nombre) DO UPDATE SET
  palabras_clave = EXCLUDED.palabras_clave,
  costo_base = EXCLUDED.costo_base,
  descripcion = EXCLUDED.descripcion,
  updated_at = NOW();

-- ============================================================================
-- VERIFICA QUE INSERTÓ CORRECTAMENTE
-- ============================================================================

SELECT id, nombre, costo_base, activo FROM public.zonas_entrega;

-- Deberías ver:
-- id | nombre      | costo_base | activo
-- 1  | Centro      | 300.00     | true
-- 2  | Zona Norte  | 500.00     | true
-- 3  | Zona Sur    | 600.00     | true
-- 4  | Zona Oeste  | 700.00     | true
-- 5  | Zona Este   | 550.00     | true

-- ============================================================================
