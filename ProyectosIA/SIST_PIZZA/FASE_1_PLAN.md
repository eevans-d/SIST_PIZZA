# 🚀 FASE 1 - INFRAESTRUCTURA BASE

## 📋 OBJETIVO
Establecer la base del proyecto: estructura de carpetas, configuración inicial, base de datos y sistema de logging.

## ⏱️ DURACIÓN ESTIMADA
**2-3 días de trabajo**

## 📦 PROMPTS A IMPLEMENTAR
- ✅ **Prompt 1**: Setup Supabase - Migraciones SQL
- ✅ **Prompt 2**: Datos de Prueba - Seed SQL
- ✅ **Prompt 3**: Cliente TypeScript para Supabase
- ✅ **Prompt 4**: Variables de Entorno y Configuración
- ✅ **Prompt 5**: Sistema de Logging Estructurado

---

## 🎯 PLAN DE EJECUCIÓN

### PASO 1: Estructura de Carpetas Base (15 min)
```bash
# Crear estructura backend
mkdir -p backend/src/{config,lib,middlewares,services,workflows}
mkdir -p backend/supabase/migrations
mkdir -p backend/tests

# Crear archivos de configuración
touch backend/.env.example
touch backend/.env.local
touch backend/package.json
touch backend/tsconfig.json
```

### PASO 2: Configuración de Package.json (10 min)
Crear `backend/package.json` con dependencias básicas.

### PASO 3: TypeScript Config (5 min)
Crear `backend/tsconfig.json` con configuración TypeScript.

### PASO 4: Variables de Entorno (Prompt 4) (10 min)
- Crear `.env.example` con todas las variables necesarias
- Crear `src/config/index.ts` para cargar variables
- Crear `src/config/validate.ts` con Zod para validación

### PASO 5: Logger (Prompt 5) (15 min)
- Crear `src/lib/logger.ts` con sistema de logging estructurado
- Incluir función `redactPII()` para proteger datos sensibles

### PASO 6: Cliente Supabase (Prompt 3) (10 min)
- Crear `src/lib/supabase.ts` con cliente TypeScript
- Incluir tipos `Cliente` y `ClienteRedactado`

### PASO 7: Migraciones SQL (Prompt 1) (30 min)
- Crear `supabase/migrations/20250115000000_initial_schema.sql`
- Definir tablas: clientes, pedidos, comandas, menu_items, pagos, etc.
- Configurar RLS, índices, triggers

### PASO 8: Seed Data (Prompt 2) (10 min)
- Crear `supabase/migrations/20250115000001_seed_data.sql`
- Insertar datos de prueba de Necochea

### PASO 9: Instalación de Dependencias (5 min)
```bash
cd backend
npm install
```

### PASO 10: Validación (10 min)
- Compilar TypeScript: `npm run build`
- Ejecutar tests básicos
- Verificar que logger funciona

---

## 📝 CHECKLIST DE VALIDACIÓN

- [ ] Estructura de carpetas creada
- [ ] package.json configurado
- [ ] tsconfig.json configurado
- [ ] Variables de entorno documentadas
- [ ] Logger funcionando y redactando PII
- [ ] Cliente Supabase creado
- [ ] Migrations SQL creadas
- [ ] Seed data insertado
- [ ] Proyecto compila sin errores
- [ ] Commit realizado y pusheado

---

## 🎯 ENTREGABLE FINAL

**Al finalizar esta fase tendrás:**
✅ Proyecto TypeScript configurado  
✅ Base de datos con esquema completo  
✅ Sistema de logging profesional  
✅ Configuración validada con Zod  
✅ Datos de prueba listos  

**Duración total**: ~2 horas de trabajo efectivo

---

## 🚀 COMENZAMOS AHORA

¿Listo para ejecutar? Confirma y empezamos con el PASO 1.
