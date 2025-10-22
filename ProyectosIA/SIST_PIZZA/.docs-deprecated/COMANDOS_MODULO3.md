# ⚡ Comandos Rápidos - Módulo 3 (Supabase)

## 🎯 Checklist de Verificación

### ✅ 1. Proyecto Supabase creado
- [ ] Ir a https://supabase.com
- [ ] Crear cuenta/login
- [ ] New Project → Name: `sist-pizza` → Region: São Paulo → Create
- [ ] Esperar 2-3 minutos (provisioning)

### ✅ 2. Credenciales copiadas
- [ ] Settings > API
- [ ] Copiar: Project URL
- [ ] Copiar: anon/public key
- [ ] Copiar: service_role key (click 👁️ para revelar)

### ✅ 3. Actualizar .env

```bash
# Editar backend/.env
nano /home/eevan/ProyectosIA/SIST_PIZZA/backend/.env

# REEMPLAZAR:
SUPABASE_URL=https://TU-PROYECTO.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
```

### ✅ 4. Ejecutar migraciones SQL

**En Supabase Web (SQL Editor):**

1. **Schema (crear tablas):**
   - Copy: `/home/eevan/ProyectosIA/SIST_PIZZA/supabase/migrations/20250115000000_initial_schema.sql`
   - Paste en SQL Editor
   - Run → Esperar "Success"

2. **Seed (datos de prueba):**
   - Copy: `/home/eevan/ProyectosIA/SIST_PIZZA/supabase/migrations/20250115000001_seed_data.sql`
   - Paste en SQL Editor
   - Run → Esperar "Success"

### ✅ 5. Verificar tablas creadas

**En Supabase Web (Table Editor):**

- [ ] Ver 6 tablas: `clientes`, `menu_items`, `pedidos`, `detalle_pedidos`, `zonas_entrega`, `audit_logs`
- [ ] `menu_items`: 18 filas (pizzas, empanadas, bebidas)
- [ ] `clientes`: 5 filas (Carlos, María, Juan, Ana, Pedro)
- [ ] `zonas_entrega`: 3 filas (Centro, Barrios, Costa)

### ✅ 6. Test conexión backend

```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA/backend

# Verificar .env cargado
cat .env | grep SUPABASE_URL

# Levantar servidor
npm run dev

# En otra terminal:
curl -s http://localhost:4000/api/health | jq '.database'
# Debe retornar: "ok"
```

### ✅ 7. Test query básico

```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA/backend

# Opción 1: Script de prueba
node scripts/test-supabase.js

# Opción 2: Test webhook con pedido real
curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test Final",
      "telefono": "2262888888",
      "direccion": "Calle Test 999, Necochea"
    },
    "items": [
      {"nombre": "Muzzarella", "cantidad": 1},
      {"nombre": "Coca-Cola 1.5L", "cantidad": 1}
    ],
    "origen": "whatsapp"
  }' | jq

# Debe retornar: {"success": true, "pedido_id": "...", "total": 4700}
```

### ✅ 8. Verificar pedido creado

**En Supabase Web (Table Editor):**

- [ ] Table Editor > `pedidos` → Debe haber 1 fila nueva
- [ ] Ver: cliente_id, estado: "pendiente", total: 4700
- [ ] Table Editor > `detalle_pedidos` → Debe haber 2 filas (Muzzarella + Coca-Cola)

---

## 🚨 Si algo falla:

### Database: "error" en health check

```bash
# 1. Verificar .env tiene credenciales reales
cat backend/.env | grep SUPABASE

# 2. Reiniciar servidor
pkill -f "npm run dev"
cd backend && npm run dev

# 3. Re-test
curl -s http://localhost:4000/api/health | jq
```

### Error: "relation does not exist"

```bash
# Migraciones no ejecutadas
# → Ve a Supabase SQL Editor
# → Ejecuta 20250115000000_initial_schema.sql
```

### Error: "Item 'Muzzarella' no encontrado"

```bash
# Seed data no insertado
# → Ve a Supabase SQL Editor  
# → Ejecuta 20250115000001_seed_data.sql
```

---

## 🎉 Éxito Total

Si todos los tests pasaron:
- ✅ Módulo 3 completo (8/8 tareas)
- ✅ Backend conectado a base de datos real
- ✅ Webhook N8N funcional end-to-end
- ✅ Listo para Módulo 1 (WhatsApp + N8N + Chatwoot)
