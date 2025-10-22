# 🔧 Guía de Configuración Supabase - SIST_PIZZA

**Tiempo estimado:** 15-20 minutos  
**Objetivo:** Base de datos PostgreSQL en la nube + credenciales configuradas

---

## 📝 PASO 1: Crear Proyecto Supabase (5 min)

### 1.1 Registro/Login

1. Ve a **https://supabase.com**
2. Click en **"Start your project"** o **"Sign in"**
3. Autentícate con GitHub o email

### 1.2 Crear Nuevo Proyecto

1. Click en **"New Project"**
2. Configuración:
   - **Name:** `sist-pizza` (o el nombre que prefieras)
   - **Database Password:** **¡GUARDA ESTA CONTRASEÑA!** La necesitarás
   - **Region:** Selecciona `South America (São Paulo)` (más cercano a Argentina)
   - **Pricing Plan:** Free (suficiente para desarrollo)
3. Click **"Create new project"**
4. **Espera 2-3 minutos** mientras Supabase provisiona la base de datos

---

## 🔑 PASO 2: Copiar Credenciales (2 min)

### 2.1 Ir a Settings > API

1. En el menú izquierdo, click en **⚙️ Settings**
2. Click en **API**

### 2.2 Copiar las 3 claves

Verás esta información (ejemplo):

```
Project URL
https://abcdefghijk.supabase.co
```

```
Project API keys
anon/public    eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
service_role   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  ⚠️ (oculta, click en "Reveal")
```

**COPIA ESTOS 3 VALORES:**
- ✅ `Project URL`
- ✅ `anon public` key
- ✅ `service_role` key (click en el ícono 👁️ para revelar)

---

## 📄 PASO 3: Actualizar .env (3 min)

### 3.1 Backend (.env)

Edita: `/home/eevan/ProyectosIA/SIST_PIZZA/backend/.env`

```bash
# REEMPLAZA ESTOS VALORES con los que copiaste:
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cC...TU_ANON_KEY_COMPLETA
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cC...TU_SERVICE_ROLE_KEY_COMPLETA

# El resto de las variables déjalas como están
ANTHROPIC_API_KEY=sk-ant-v1-test-key-for-development-only
CLAUDE_MODEL=claude-3-5-sonnet-20241022
NODE_ENV=development
PORT=4000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4000
DB_ENCRYPTION_KEY=0123456789abcdef0123456789abcdef
LOG_LEVEL=info
```

### 3.2 Frontend (.env) - Si existe

Si tienes `/home/eevan/ProyectosIA/SIST_PIZZA/frontend/.env`:

```bash
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cC...TU_ANON_KEY_COMPLETA
```

---

## 🗄️ PASO 4: Ejecutar Migraciones SQL (5 min)

### 4.1 Abrir SQL Editor en Supabase

1. En el panel de Supabase, click en **🔧 SQL Editor** (menú izquierdo)
2. Click en **"New query"**

### 4.2 Ejecutar Schema (Crear Tablas)

1. Abre el archivo local: `/home/eevan/ProyectosIA/SIST_PIZZA/supabase/migrations/20250115000000_initial_schema.sql`
2. **Copia TODO el contenido** (231 líneas)
3. Pégalo en el SQL Editor de Supabase
4. Click en **"Run"** (o `Ctrl+Enter`)
5. Deberías ver: ✅ **"Success. No rows returned"**

**Esto crea:**
- ✅ 6 tablas: `clientes`, `menu_items`, `pedidos`, `detalle_pedidos`, `zonas_entrega`, `audit_logs`
- ✅ Índices para búsquedas rápidas
- ✅ Row Level Security (RLS) policies
- ✅ Triggers para `updated_at`

### 4.3 Ejecutar Seed Data (Datos de Ejemplo)

1. Haz click en **"New query"** nuevamente
2. Abre el archivo local: `/home/eevan/ProyectosIA/SIST_PIZZA/supabase/migrations/20250115000001_seed_data.sql`
3. **Copia TODO el contenido** (165 líneas)
4. Pégalo en el SQL Editor
5. Click en **"Run"**
6. Deberías ver: ✅ **"Success. No rows returned"**

**Esto inserta:**
- ✅ 5 clientes de ejemplo (Necochea)
- ✅ 7 pizzas (Muzzarella, Napolitana, Calabresa, etc.)
- ✅ 5 empanadas
- ✅ 6 bebidas (Coca-Cola, Sprite, Fanta, etc.)
- ✅ 3 zonas de entrega (Centro, Barrios, Costa)

---

## ✅ PASO 5: Verificar Tablas (2 min)

### 5.1 Ir a Table Editor

1. En el menú izquierdo, click en **📊 Table Editor**
2. Deberías ver las 6 tablas:
   - `audit_logs`
   - `clientes`
   - `detalle_pedidos`
   - `menu_items`
   - `pedidos`
   - `zonas_entrega`

### 5.2 Verificar Datos

1. Click en **`menu_items`**
2. Deberías ver **18 filas** (7 pizzas + 5 empanadas + 6 bebidas)
3. Click en **`clientes`**
4. Deberías ver **5 filas** (Carlos, María, Juan, Ana, Pedro)

**Si ves los datos → ✅ ¡ÉXITO!**

---

## 🧪 PASO 6: Test Conexión Backend (3 min)

### 6.1 Verificar .env cargado

```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA/backend
cat .env | grep SUPABASE_URL
```

Deberías ver tu URL real (no `https://example.supabase.co`).

### 6.2 Levantar Backend

```bash
npm run dev
```

**Busca en los logs:**
```
✅ Configuración cargada: {
  environment: 'development',
  port: 4000,
  supabase: '✓',    <-- DEBE ESTAR EN ✓
  ...
}
```

### 6.3 Test Health Check

En otra terminal:

```bash
curl -s http://localhost:4000/api/health | jq
```

**Esperado:**
```json
{
  "status": "ok",
  "database": "ok",   <-- ¡DEBE SER "ok" AHORA!
  "integrations": {
    "supabase": true  <-- true
  }
}
```

**Si `database: "ok"` → ✅ Conexión exitosa!**

---

## 🎯 PASO 7: Test Query Básico (2 min)

### 7.1 Test Directo con curl

Crea un archivo de prueba `test-query.js`:

```javascript
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

async function test() {
  const { data, error } = await supabase
    .from('menu_items')
    .select('nombre, categoria, precio')
    .limit(5);

  if (error) {
    console.error('❌ Error:', error);
  } else {
    console.log('✅ Datos recibidos:', data);
  }
}

test();
```

Ejecuta:
```bash
node test-query.js
```

**Esperado:**
```
✅ Datos recibidos: [
  { nombre: 'Pizza Muzzarella', categoria: 'pizza', precio: '3500.00' },
  { nombre: 'Pizza Napolitana', categoria: 'pizza', precio: '4200.00' },
  ...
]
```

### 7.2 Test Webhook N8N con DB Real

```bash
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test Webhook",
      "telefono": "2262999999",
      "direccion": "Calle Test 123, Necochea"
    },
    "items": [
      {"nombre": "Muzzarella", "cantidad": 1}
    ],
    "origen": "whatsapp"
  }' | jq
```

**Esperado (ahora SÍ debe funcionar):**
```json
{
  "success": true,
  "pedido_id": "a3b5c7d9-1234-...",
  "total": 4000,
  "subtotal": 3500,
  "costo_envio": 500,
  "mensaje": "Pedido #a3b5c7d9 creado. Total: $4000. Tiempo estimado: 30-40 min."
}
```

---

## 🎉 ¡ÉXITO!

Si llegaste aquí y todos los tests pasaron:

✅ Proyecto Supabase creado  
✅ Credenciales configuradas  
✅ Tablas creadas (schema)  
✅ Datos de prueba insertados (seed)  
✅ Backend conectado a Supabase  
✅ Queries funcionando  
✅ Webhook N8N puede crear pedidos reales

---

## 🚨 Troubleshooting

### Error: "database: error" en health check

**Causa:** Credenciales incorrectas en `.env`

**Solución:**
1. Verifica que copiaste las 3 claves completas (son muy largas, ~200 caracteres)
2. No debe haber espacios ni saltos de línea
3. Reinicia el servidor: `pkill -f "npm run dev" && npm run dev`

### Error: "relation does not exist"

**Causa:** Migraciones SQL no se ejecutaron

**Solución:**
1. Ve a SQL Editor en Supabase
2. Ejecuta nuevamente `20250115000000_initial_schema.sql`
3. Verifica en Table Editor que las tablas existen

### Error: "Item 'Muzzarella' no encontrado"

**Causa:** Seed data no se insertó

**Solución:**
1. Ve a SQL Editor
2. Ejecuta `20250115000001_seed_data.sql`
3. Verifica en Table Editor > menu_items que hay 18 filas

---

**Última actualización:** 2025-10-22  
**Autor:** SIST_PIZZA Team
