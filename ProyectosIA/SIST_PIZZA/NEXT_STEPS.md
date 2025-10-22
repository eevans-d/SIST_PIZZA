# 🚀 PRÓXIMOS PASOS INMEDIATOS

## ✅ COMPLETADO
- Módulo 2 (Backend Core): 100%
- Módulo 3 (Supabase): 100% documentado
- Módulo 1 (Canales): 87%
- Git commits: 2 nuevos commits guardados

## 🎯 TU TURNO (30 minutos totales)

### PASO 1: Configurar Supabase (15 min)

1. **Abrir guía:**
   ```bash
   cat GUIA_SUPABASE_SETUP.md
   ```

2. **Ir a Supabase:**
   - https://supabase.com
   - Crear cuenta / Iniciar sesión
   - Crear nuevo proyecto "sist-pizza"

3. **Copiar credenciales a `backend/.env`:**
   ```bash
   SUPABASE_URL=https://[tu-proyecto].supabase.co
   SUPABASE_ANON_KEY=eyJhbGc...
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
   ```

4. **Ejecutar SQL:**
   - Ir a SQL Editor en Supabase
   - Copiar contenido de `supabase/schema.sql`
   - Ejecutar
   - Copiar contenido de `supabase/seed.sql`
   - Ejecutar

5. **Verificar:**
   ```bash
   node backend/scripts/test-supabase.js
   # Debe mostrar: ✅ Datos recibidos (18 menu items)
   ```

### PASO 2: Iniciar Backend (2 min)

```bash
cd backend
npm run dev
```

**En otra terminal, verificar:**
```bash
curl http://localhost:4000/api/health
# Debe retornar: "database": "ok"
```

### PASO 3: Configurar Canales (10 min)

1. **Preparar variables de entorno:**
   ```bash
   cd /home/eevan/ProyectosIA/SIST_PIZZA
   cp .env.canales.example .env
   ```

2. **Generar secret key:**
   ```bash
   openssl rand -hex 64
   ```
   Copiar resultado a `.env` como `CHATWOOT_SECRET_KEY_BASE`

3. **Agregar Claude API key:**
   Editar `.env` y pegar tu `ANTHROPIC_API_KEY`

4. **Iniciar stack:**
   ```bash
   ./scripts/start-canales.sh
   ```

   Esperar a ver:
   ```
   🎉 ¡Stack de Canales Iniciado!
   ```

### PASO 4: Configurar Servicios (5 min)

Seguir `GUIA_MODULO1_CANALES.md` secciones:
- 6.1: Configurar WAHA (escanear QR WhatsApp)
- 6.2: Configurar Chatwoot
- 6.3: Importar workflow N8N

### PASO 5: Test E2E (3 min)

Enviar WhatsApp:
```
"Hola! Quiero pedir una pizza napolitana grande y una coca cola"
```

Verificar:
1. Respuesta de confirmación en WhatsApp
2. Pedido creado en Supabase (tabla `pedidos`)
3. Detalles en tabla `detalle_pedidos`

---

## 📚 DOCUMENTACIÓN CLAVE

| Archivo | Para qué |
|---------|----------|
| `STATUS_FINAL.md` | Resumen completo del progreso |
| `INDICE.md` | Navegación de toda la documentación |
| `GUIA_SUPABASE_SETUP.md` | Setup paso a paso de Supabase |
| `GUIA_MODULO1_CANALES.md` | Setup completo WhatsApp/N8N/Chatwoot |
| `BACKEND_API.md` | Referencia de API del backend |

---

## 🔥 COMANDOS RÁPIDOS

```bash
# Ver documentación principal
cat STATUS_FINAL.md

# Ver índice
cat INDICE.md

# Iniciar backend
cd backend && npm run dev

# Iniciar canales
./scripts/start-canales.sh

# Ver logs de canales
docker-compose -f docker-compose.canales.yml logs -f

# Parar canales
docker-compose -f docker-compose.canales.yml down

# Reset completo canales
./scripts/start-canales.sh --clean

# Test Supabase
node backend/scripts/test-supabase.js

# Health checks
curl http://localhost:4000/api/health  # Backend
curl http://localhost:3000/health      # WAHA
curl http://localhost:5678/healthz     # N8N
```

---

## 🎯 OBJETIVO

**Al completar estos pasos:**
- ✅ Sistema 100% funcional
- ✅ Pedidos por WhatsApp procesados automáticamente
- ✅ Base de datos poblada con productos
- ✅ Infraestructura lista para producción

**Tiempo estimado total: 30 minutos**

---

## 📞 SI ALGO FALLA

1. **Backend no inicia:**
   - Verificar que Supabase esté configurado en `.env`
   - Ejecutar `node backend/scripts/test-supabase.js`

2. **Canales no inician:**
   - Verificar Docker está corriendo: `docker ps`
   - Ver logs: `docker-compose -f docker-compose.canales.yml logs`

3. **Webhook no funciona:**
   - Verificar backend corriendo en puerto 4000
   - Verificar URL en workflow N8N
   - Ver logs backend: `cd backend && npm run dev`

4. **WhatsApp no responde:**
   - Verificar QR escaneado en WAHA
   - Verificar workflow N8N activado
   - Ver logs N8N: `docker-compose -f docker-compose.canales.yml logs n8n`

---

¡TODO LISTO! Ahora puedes empezar con el PASO 1 cuando estés listo. 🚀
