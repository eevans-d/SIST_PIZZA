# 🚀 EMPEZAR AQUÍ - INICIO RÁPIDO

**¿Recién tienes tu proyecto Supabase creado?**  
**¿Quieres que todo funcione AHORA?**

👇 SIGUE ESTOS 5 PASOS 👇

---

## 📍 Paso 1: Obtén Credenciales (1 minuto)

1. Ve a: **https://app.supabase.com**
2. Selecciona tu proyecto: **SIST_PIZZA**
3. Click en: **Settings → API** (menú izquierdo)

Copia estas 3 cosas:
- 🔗 **Project URL** (ej: `https://xxxxx.supabase.co`)
- 🔑 **anon public key** (la primera key larga)
- 🔑 **service_role key** (la segunda key - click en 👁️ para revelar)

⚠️ Las keys son muy largas (~200 caracteres). Cópialas completas sin espacios.

---

## 💻 Paso 2: Ejecuta Script (2 minutos)

En tu terminal:

```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA
./scripts/setup-supabase-interactive.sh
```

**El script te pedirá 3 cosas:**

```
📍 Ingresa SUPABASE_URL (ej: https://xxxxx.supabase.co):
[Pega aquí la URL]

🔑 Ingresa SUPABASE_ANON_KEY:
[Pega aquí la key pública]

🔑 Ingresa SUPABASE_SERVICE_ROLE_KEY:
[Pega aquí la key de servicio]
```

✅ Cuando termines, el script dirá: "✅ CONFIGURACIÓN COMPLETADA"

---

## 📄 Paso 3: Ejecuta SQL en Supabase (5 minutos)

**En Supabase UI:**

1. Ve a: **SQL Editor** (menú izquierdo)
2. Click en: **"New query"**
3. Abre archivo local:
   ```
   supabase/migrations/20250115000000_initial_schema.sql
   ```
4. Copia TODO el contenido (231 líneas)
5. Pega en el editor SQL de Supabase
6. Click **"Run"**
7. Deberías ver: ✅ **"Success. No rows returned"**

**Luego, repite con el segundo archivo:**

1. Click en: **"New query"**
2. Abre archivo:
   ```
   supabase/migrations/20250115000001_seed_data.sql
   ```
3. Copia TODO (165 líneas)
4. Pega en editor
5. Click **"Run"**
6. ✅ **"Success"**

---

## 🔧 Paso 4: Inicia Backend (3 minutos)

En terminal:

```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA/backend

# Instalar dependencias
npm install

# Iniciar servidor
npm run dev
```

**Deberías ver:**
```
✅ Configuración cargada: {
  environment: 'development',
  port: 4000,
  supabase: '✓',
  ...
}

🚀 Servidor iniciado en http://localhost:4000
```

---

## ✅ Paso 5: Verificar que Funciona (2 minutos)

**En otra terminal:**

```bash
# Health check
curl -s http://localhost:4000/api/health | jq
```

**Esperado:**
```json
{
  "status": "ok",
  "database": "ok"
}
```

**Listo!** ✅ Tu sistema está funcionando

---

## 🎯 ¿AHORA QUÉ?

### Opción A: Aprender Más
Lee: [`SETUP_RESUMEN.md`](./SETUP_RESUMEN.md)

### Opción B: Entender Todo Paso a Paso
Lee: [`CHECKLIST_EJECUCION.md`](./CHECKLIST_EJECUCION.md)

### Opción C: Usar Documentación de Referencia
Lee: [`REFERENCIA_HERRAMIENTAS.md`](./REFERENCIA_HERRAMIENTAS.md)

### Opción D: Mejorar el Código
Lee: [`ANALISIS_OPTIMIZACION.md`](./ANALISIS_OPTIMIZACION.md)

### Opción E: Ver Todas las Rutas
Lee: [`MAPA_RUTAS.md`](./MAPA_RUTAS.md)

---

## 🆘 ¿TENGO UN ERROR?

### ❌ "database: error" en health check

```bash
# 1. Verifica .env tiene credenciales
cat backend/.env | grep SUPABASE_

# 2. Si falta algo, edita
nano backend/.env

# 3. Reinicia backend
npm run dev
```

### ❌ "SQL error en Supabase"

```
1. Verifica que copiaste TODO el archivo SQL (línea 1 a última)
2. No dejes comentarios fuera del script
3. Pega en "New query", no en query existente
4. Click en "Run", espera respuesta
```

### ❌ "npm install falla"

```bash
# Limpiar y reintentar
rm -rf node_modules package-lock.json
npm install
```

### ❌ "Port 4000 ya está en uso"

```bash
# Matar proceso en puerto 4000
lsof -ti:4000 | xargs kill -9

# Luego reinicia
npm run dev
```

---

## 📊 RESUMEN VISUAL

```
┌─ Credenciales (1 min) ──────────────────┐
│ Obtener de Supabase Settings → API      │
└──────────────────────────────────────────┘
         ↓
┌─ Script Setup (2 min) ──────────────────┐
│ ./scripts/setup-supabase-interactive.sh  │
│ ✅ .env actualizado                      │
└──────────────────────────────────────────┘
         ↓
┌─ SQL en Supabase (5 min) ───────────────┐
│ Copiar 2 archivos SQL → Ejecutar en UI  │
│ ✅ 6 tablas creadas + datos             │
└──────────────────────────────────────────┘
         ↓
┌─ Backend Local (3 min) ─────────────────┐
│ npm install && npm run dev              │
│ ✅ Server en localhost:4000             │
└──────────────────────────────────────────┘
         ↓
┌─ Verificación (2 min) ──────────────────┐
│ curl http://localhost:4000/api/health   │
│ ✅ status: ok, database: ok             │
└──────────────────────────────────────────┘

TOTAL: 13 MINUTOS ⏱️ 
```

---

## 🎊 FELICIDADES!

Acabas de configurar:
- ✅ Supabase (Base de datos PostgreSQL)
- ✅ Backend Node.js (TypeScript + Express)
- ✅ Webhooks funcionando
- ✅ Validaciones automáticas
- ✅ Logging y monitoring

**Tu sistema SIST_PIZZA está operativo** 🎉

---

## 📞 PRÓXIMOS PASOS (Opcionales)

### 1. Agregar WhatsApp + N8N (10 min adicionales)
```bash
./scripts/start-canales.sh
# Luego: http://localhost:3000 para QR WhatsApp
```

### 2. Ver Análisis de Mejoras (30 min de lectura)
```bash
cat ANALISIS_OPTIMIZACION.md
# Plan de 38 mejoras para producción
```

### 3. Implementar Quick Wins (4 horas)
```
Mejoras rápidas que agreguen valor
- Resolución de TODOs
- Error handling mejorado
- Deduplication
- Request tracking
```

---

## 📈 SIGUIENTES 7 DÍAS

**Hoy:**
- ✅ Setup Supabase + Backend (13 min)

**Mañana:**
- Explorar endpoints
- Crear primeros pedidos manualmente
- Ver datos en Supabase

**Esta semana:**
- Agregar WhatsApp (opcional)
- Implementar Quick Wins
- Preparar para producción

---

## 🎯 TL;DR - EN 1 MINUTO

1. Copiar 3 credenciales de Supabase
2. Ejecutar `./scripts/setup-supabase-interactive.sh`
3. Copiar 2 archivos SQL en Supabase UI
4. `npm install && npm run dev`
5. `curl http://localhost:4000/api/health`

✅ LISTO

---

## 💡 RECUERDA

- 📚 Documentación completa en carpeta raíz
- 🛠️ Scripts automatizan el 95%
- ✅ Validaciones en cada paso
- 🔐 Credenciales guardadas localmente en .env
- 🚀 Sistema está pensado para escalar

---

## 🆘 ¿NECESITAS AYUDA?

1. Revisa Troubleshooting arriba ☝️
2. Lee documentación relevante
3. Busca en INDICE.md
4. Revisa logs del backend

---

**¡A EMPEZAR! 🚀**

Siguiente comando a ejecutar:
```bash
./scripts/setup-supabase-interactive.sh
```

¡Te espera tu sistema funcionando en 30 minutos! ⏱️
