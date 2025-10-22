# 🗄️ SIST_PIZZA - Configuración de Base de Datos Supabase

## 📋 Guía de Instalación

### Opción 1: Supabase Cloud (Recomendado para producción)

#### Paso 1: Crear Proyecto en Supabase
1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Click en "New Project"
4. Completa:
   - **Name:** `sist-pizza-prod`
   - **Database Password:** (genera uno seguro y guárdalo)
   - **Region:** South America (São Paulo) - más cercano a Argentina
5. Espera ~2 minutos a que se cree el proyecto

#### Paso 2: Obtener Credenciales
1. En tu proyecto, ve a **Settings > API**
2. Copia:
   - **Project URL** → `SUPABASE_URL`
   - **anon public** → `SUPABASE_ANON_KEY`
   - **service_role** (⚠️ secret) → `SUPABASE_SERVICE_ROLE_KEY`

#### Paso 3: Ejecutar Migraciones
1. Ve a **SQL Editor** en el panel izquierdo
2. Click en "New Query"
3. Copia y pega el contenido de:
   ```bash
   supabase/migrations/20250115000000_initial_schema.sql
   ```
4. Click en **Run** (botón verde abajo a la derecha)
5. ✅ Verifica que dice "Success. No rows returned"

#### Paso 4: Cargar Datos Iniciales
1. Nueva query en SQL Editor
2. Copia y pega el contenido de:
   ```bash
   supabase/migrations/20250115000001_seed_data.sql
   ```
3. Click en **Run**
4. ✅ Verifica: "Success. Rows affected: X"

#### Paso 5: Verificar Tablas
1. Ve a **Table Editor** en el panel izquierdo
2. Deberías ver las tablas:
   - `clientes`
   - `menu_items` (con pizzas pre-cargadas)
   - `pedidos`
   - `detalle_pedidos`
   - `zonas_entrega`
   - `audit_logs`
   - `support_tickets`

#### Paso 6: Configurar Variables de Entorno
Actualiza tus archivos `.env`:

**Backend** (`backend/.env`):
```bash
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Frontend** (`frontend/.env`):
```bash
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

### Opción 2: Supabase Local (Desarrollo)

#### Requisitos
- Docker Desktop instalado
- Supabase CLI instalado

#### Paso 1: Instalar Supabase CLI
```bash
npm install -g supabase
```

#### Paso 2: Iniciar Supabase Local
```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA
supabase start
```

Esto levantará:
- PostgreSQL en `localhost:54322`
- API REST en `http://localhost:54321`
- Studio UI en `http://localhost:54323`

#### Paso 3: Aplicar Migraciones
```bash
supabase db reset
```

Las migraciones en `supabase/migrations/` se aplicarán automáticamente.

#### Paso 4: Verificar
```bash
# Ver estado
supabase status

# Acceder a Studio
open http://localhost:54323
```

#### Paso 5: Variables de Entorno Local
```bash
# Backend
SUPABASE_URL=http://localhost:54321
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0

# Frontend
VITE_SUPABASE_URL=http://localhost:54321
VITE_SUPABASE_ANON_KEY=(mismo que arriba)
```

---

## 🗂️ Schema de Base de Datos

### Tablas Principales

#### 📋 `clientes`
- `id` (UUID, PK)
- `nombre` (string)
- `telefono` (string, único)
- `direccion` (text)
- `email` (string, opcional)
- `notas` (text, opcional)

#### 🍕 `menu_items`
- `id` (UUID, PK)
- `nombre` (string, único)
- `categoria` (enum: pizza, empanada, bebida, postre, extra)
- `precio` (decimal)
- `disponible` (boolean)
- `ingredientes` (array)
- `tiempo_preparacion_min` (integer)

#### 📦 `pedidos`
- `id` (UUID, PK)
- `cliente_id` (UUID, FK → clientes)
- `estado` (enum: pendiente, confirmado, en_preparacion, listo, entregado, cancelado)
- `tipo_entrega` (enum: delivery, retiro)
- `total` (decimal)
- `metodo_pago` (string)
- `notas` (text)

#### 📄 `detalle_pedidos`
- `id` (UUID, PK)
- `pedido_id` (UUID, FK → pedidos)
- `menu_item_id` (UUID, FK → menu_items)
- `cantidad` (integer)
- `precio_unitario` (decimal)
- `subtotal` (decimal)

#### 📍 `zonas_entrega`
- `id` (UUID, PK)
- `nombre` (string) - Ej: "Centro Necochea"
- `poligono` (geometry) - Coordenadas GeoJSON
- `costo_envio` (decimal)
- `tiempo_estimado_min` (integer)

#### 📊 `audit_logs`
- `id` (UUID, PK)
- `table_name` (string)
- `operation` (enum: INSERT, UPDATE, DELETE)
- `old_data` (jsonb)
- `new_data` (jsonb)
- `user_id` (UUID, opcional)

#### 🎫 `support_tickets`
- `id` (UUID, PK)
- `cliente_id` (UUID, FK → clientes)
- `pedido_id` (UUID, FK → pedidos, opcional)
- `asunto` (string)
- `descripcion` (text)
- `estado` (enum: abierto, en_progreso, resuelto, cerrado)
- `prioridad` (enum: baja, media, alta)

---

## 🔒 Row Level Security (RLS)

### Políticas Configuradas

#### `clientes`
- ❌ Sin acceso público
- ✅ Backend (service_role) full access

#### `menu_items`
- ✅ Lectura pública (anon, authenticated)
- ✅ Escritura solo backend (service_role)

#### `pedidos` & `detalle_pedidos`
- ✅ Usuarios autenticados: ver sus propios pedidos
- ✅ Backend: full access

#### `zonas_entrega`
- ✅ Lectura pública
- ✅ Escritura solo backend

#### `audit_logs`
- ❌ Sin acceso público
- ✅ Backend: solo INSERT y SELECT

#### `support_tickets`
- ✅ Usuarios: ver sus propios tickets
- ✅ Backend: full access

---

## 🧪 Validación

### Queries de Prueba

Ejecuta en SQL Editor para verificar:

```sql
-- 1. Ver pizzas del menú
SELECT nombre, categoria, precio, disponible 
FROM menu_items 
WHERE categoria = 'pizza' 
ORDER BY precio;

-- 2. Ver zonas de entrega
SELECT nombre, costo_envio, tiempo_estimado_min 
FROM zonas_entrega 
ORDER BY nombre;

-- 3. Contar registros
SELECT 
  (SELECT COUNT(*) FROM clientes) AS clientes,
  (SELECT COUNT(*) FROM menu_items) AS items_menu,
  (SELECT COUNT(*) FROM pedidos) AS pedidos,
  (SELECT COUNT(*) FROM zonas_entrega) AS zonas;

-- 4. Ver último pedido
SELECT p.id, c.nombre AS cliente, p.estado, p.total, p.created_at
FROM pedidos p
JOIN clientes c ON p.cliente_id = c.id
ORDER BY p.created_at DESC
LIMIT 1;
```

---

## 🚨 Troubleshooting

### Error: "relation already exists"
**Solución:** Las tablas ya existen. Si quieres resetear:
```sql
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
-- Luego ejecuta las migraciones nuevamente
```

### Error: "permission denied"
**Causa:** Intentas ejecutar con anon key en lugar de service_role.  
**Solución:** Usa service_role key en backend.

### Error: "connection refused"
**Causa:** Supabase local no está corriendo.  
**Solución:** `supabase start`

---

## 📊 Datos de Prueba (Seed)

El archivo `seed_data.sql` incluye:
- ✅ 10 pizzas (Muzzarella, Napolitana, Fugazzeta, etc.)
- ✅ 5 empanadas
- ✅ 8 bebidas
- ✅ 6 zonas de entrega en Necochea
- ✅ 3 clientes de prueba
- ✅ 2 pedidos de ejemplo

---

## ✅ Checklist de Validación

- [ ] Proyecto Supabase creado
- [ ] Credenciales copiadas a `.env`
- [ ] Migración `initial_schema.sql` ejecutada
- [ ] Migración `seed_data.sql` ejecutada
- [ ] Tablas visibles en Table Editor
- [ ] Query de validación ejecutada exitosamente
- [ ] Backend puede conectarse (test con `npm run dev`)
- [ ] Frontend puede leer datos del menú

---

**¿Listo? Continúa con STEP 2: Ejecución Local** 🚀
