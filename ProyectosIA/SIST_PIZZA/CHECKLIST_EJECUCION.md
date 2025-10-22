# 🚀 CHECKLIST DE EJECUCIÓN - Configurar Supabase + Backend

**Tiempo total estimado:** 20-30 minutos  
**Estado:** Pronto a ejecutar

---

## 📋 FLUJO DE EJECUCIÓN

### PARTE A: Preparar Credenciales (5 min)

**Prerrequisito:** Proyecto SIST_PIZZA ya creado en Supabase

#### ✅ Paso 1: Obtener Credenciales desde Supabase UI

1. **Abre Supabase Dashboard:**
   ```
   https://app.supabase.com
   ```

2. **Selecciona tu proyecto:** `SIST_PIZZA`

3. **Ve a:** Settings → API (menú izquierdo)

4. **Copia estas 3 variables:**
   - 📍 **Project URL** (ej: `https://xxxxx.supabase.co`)
   - 🔑 **anon public key** (primera key larga)
   - 🔑 **service_role key** (segunda key larga, click en 👁️ para revelar)

   ⚠️ **IMPORTANTE:** Las keys son muy largas (~200 caracteres). Cópialas completas sin espacios.

---

#### ✅ Paso 2: Ejecutar Script de Setup

En terminal:

```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA

# Ejecutar script interactivo
./scripts/setup-supabase-interactive.sh
```

**El script te pedirá:**
1. SUPABASE_URL → Pega la URL
2. SUPABASE_ANON_KEY → Pega la key pública
3. SUPABASE_SERVICE_ROLE_KEY → Pega la key de servicio

**Qué hace:**
- ✅ Valida credenciales
- ✅ Crea/actualiza `backend/.env`
- ✅ Genera scripts de test
- ✅ Prepara instrucciones SQL

---

### PARTE B: Ejecutar SQL en Supabase (5 min)

#### ✅ Paso 3: Crear Schema (Tablas)

**En Supabase UI:**

1. Ve a: **SQL Editor** (menú izquierdo)
2. Click en **"New query"**
3. **Abre el archivo:**
   ```
   /home/eevan/ProyectosIA/SIST_PIZZA/supabase/migrations/20250115000000_initial_schema.sql
   ```
4. **Copia TODO el contenido** (231 líneas)
5. **Pega en el editor SQL de Supabase**
6. Click **"Run"** (o `Ctrl+Enter`)
7. Deberías ver: ✅ **"Success. No rows returned"**

---

#### ✅ Paso 4: Insertar Datos de Prueba

**En Supabase UI:**

1. Click en **"New query"**
2. **Abre el archivo:**
   ```
   /home/eevan/ProyectosIA/SIST_PIZZA/supabase/migrations/20250115000001_seed_data.sql
   ```
3. **Copia TODO el contenido** (165 líneas)
4. **Pega en el editor SQL de Supabase**
5. Click **"Run"**
6. Deberías ver: ✅ **"Success. No rows returned"**

---

#### ✅ Paso 5: Verificar Tablas

**En Supabase UI:**

1. Ve a: **Table Editor** (menú izquierdo)
2. **Deberías ver 6 tablas:**
   - ✅ `audit_logs`
   - ✅ `clientes` (5 registros)
   - ✅ `detalle_pedidos`
   - ✅ `menu_items` (18 registros)
   - ✅ `pedidos`
   - ✅ `zonas_entrega` (3 registros)

3. **Si no ves todas las tablas:**
   - Refresca la página (F5)
   - Verifica que los SQL scripts ejecutaron sin errores

---

### PARTE C: Testear Backend Localmente (5 min)

#### ✅ Paso 6: Instalar Dependencias

En terminal:

```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA/backend

npm install
```

---

#### ✅ Paso 7: Testear Conexión a Supabase

En terminal:

```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA/backend

node test-supabase-connection.js
```

**Esperado (✅ ÉXITO):**
```
🔌 Conectando a Supabase...
   URL: https://xxxxx.supabase.co

📌 Test 1: Conexión básica
✅ Conexión exitosa

📌 Test 2: Tablas en la base de datos
   ✅ clientes
   ✅ menu_items
   ✅ pedidos
   ✅ detalle_pedidos
   ✅ zonas_entrega
   ✅ audit_logs

📌 Test 3: Consultar datos de ejemplo
   Encontrados 5 items de menú:
   1. Pizza Muzzarella (pizza) - $3500
   ...

📌 Test 4: Estadísticas de datos
   clientes: 5 registros
   menu_items: 18 registros
   pedidos: 0 registros
   zonas_entrega: 3 registros

✅ ¡Todos los tests pasaron correctamente!
```

**Si hay error (❌):**
- Verifica credenciales en `backend/.env`
- Asegúrate de ejecutar los SQL scripts
- Recarga la página de Supabase

---

#### ✅ Paso 8: Iniciar Backend

En terminal:

```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA/backend

npm run dev
```

**Esperado:**
```
✅ Configuración cargada: {
  environment: 'development',
  port: 4000,
  supabase: '✓',
  claude: '✗ (opcional)',
  ...
}

✅ Database: connected

[4000] 🚀 Servidor iniciado en http://localhost:4000
```

---

#### ✅ Paso 9: Testear Health Check

**En OTRA terminal:**

```bash
curl -s http://localhost:4000/api/health | jq
```

**Esperado (✅ ÉXITO):**
```json
{
  "status": "ok",
  "database": "ok",
  "integrations": {
    "supabase": true,
    "claude": false
  },
  "uptime": 12.345
}
```

---

#### ✅ Paso 10: Testear Webhook N8N

**En otra terminal:**

```bash
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test User",
      "telefono": "2262999999",
      "direccion": "Calle Test 123, Necochea"
    },
    "items": [
      {"nombre": "Muzzarella", "cantidad": 1}
    ],
    "origen": "whatsapp"
  }' | jq
```

**Esperado (✅ ÉXITO):**
```json
{
  "success": true,
  "pedido_id": "a3b5c7d9-1234-...",
  "total": 4000,
  "subtotal": 3500,
  "costo_envio": 500,
  "mensaje": "Pedido #a3b5c7d9 creado. Total: $4000..."
}
```

**Si falla (❌):**
```json
{
  "error": "...",
  "details": "..."
}
```

Revisa los logs del backend para más detalles.

---

### PARTE D: Verificar Datos en Supabase (2 min)

#### ✅ Paso 11: Ver Pedido Creado

**En Supabase UI:**

1. Ve a: **Table Editor**
2. Abre tabla: **pedidos**
3. Deberías ver el pedido que acabas de crear

4. Abre tabla: **detalle_pedidos**
5. Deberías ver los detalles del pedido

---

## 🎉 CHECKLIST FINAL

- [ ] ✅ Proyecto SIST_PIZZA creado en Supabase
- [ ] ✅ Credenciales copiadas (URL + 2 keys)
- [ ] ✅ Script setup ejecutado
- [ ] ✅ .env actualizado
- [ ] ✅ SQL Schema ejecutado (231 líneas)
- [ ] ✅ SQL Seed ejecutado (165 líneas)
- [ ] ✅ 6 tablas creadas en Supabase
- [ ] ✅ Datos de prueba insertados (18 menu_items, 5 clientes, 3 zonas)
- [ ] ✅ Dependencies instaladas (`npm install`)
- [ ] ✅ Test de conexión ejecutado (`node test-supabase-connection.js`)
- [ ] ✅ Backend iniciado (`npm run dev`)
- [ ] ✅ Health check responde OK
- [ ] ✅ Webhook N8N crea pedido exitosamente
- [ ] ✅ Pedido visible en `Table Editor > pedidos`

---

## 📊 RESULTADOS ESPERADOS

### En Supabase (Table Editor)

| Tabla | Registros |
|-------|-----------|
| `clientes` | 5 |
| `menu_items` | 18 |
| `zonas_entrega` | 3 |
| `pedidos` | 1+ (desde tests) |
| `detalle_pedidos` | 1+ |
| `audit_logs` | 1+ |

### En Backend

```
✅ Conexión a Supabase: OK
✅ Port 4000: Listening
✅ Health check: Responding
✅ Webhook endpoint: Operational
✅ Database queries: Working
```

---

## 🚨 TROUBLESHOOTING RÁPIDO

### ❌ "Error en setup-supabase-interactive.sh"
```bash
# Verificar permisos
chmod +x ./scripts/setup-supabase-interactive.sh

# Ejecutar con bash explícito
bash ./scripts/setup-supabase-interactive.sh
```

### ❌ "database: error" en health check
```bash
# Verificar .env tiene credenciales
cat backend/.env | grep SUPABASE_

# Si está mal, corrige:
nano backend/.env
# Reemplaza SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

# Reinicia backend
npm run dev
```

### ❌ "Webhook: 400 - validation error"
```
Posibles causas:
1. Menu item no encontrado → revisa spelling de "Muzzarella"
2. Cliente existente → el webhook crea cliente si no existe
3. Zona no encontrada → verifica tabla zonas_entrega en Supabase

Solución:
- Ejecuta: node test-supabase-connection.js
- Verifica datos en Supabase
- Revisa logs del backend
```

### ❌ "No se pueden ejecutar SQL en Supabase"
```
Soluciones:
1. Copia TODO el contenido del archivo SQL (línea 1 a última)
2. No dejes comentarios fuera del script
3. Pega en "New query", no en query existente
4. Click en "Run", espera respuesta
5. Si falla, copia el error y búscalo en la guía
```

---

## 🎯 SIGUIENTE FASE

Una vez completado este checklist:

1. **Implementar Quick Wins** (4h)
   - Resolver TODOs críticos
   - Mejorar error handling
   - Agregar deduplication

2. **Iniciar Docker Stack Canales**
   ```bash
   ./scripts/start-canales.sh
   ```

3. **Importar N8N Workflow**
   - Acceder a N8N en http://localhost:5678
   - Importar `docker/n8n-workflows/whatsapp-pedido.json`

4. **Escanear QR WhatsApp**
   - En WAHA UI http://localhost:3000
   - Conectar tu celular

5. **Testear flujo completo**
   - Enviar mensaje por WhatsApp
   - Ver pedido creado en Supabase

---

**¡Listo! Sigue el checklist paso a paso y avísame cuando llegues al 🎉**

