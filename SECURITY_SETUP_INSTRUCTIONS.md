# 🚨 INSTRUCCIONES URGENTES: CONFIGURACIÓN SEGURA DE VARIABLES DE ENTORNO

## ⚠️ AVISO CRÍTICO DE SEGURIDAD

**Se han detectado y corregido secrets hardcodeados en el código fuente.**

**ACCIÓN REQUERIDA INMEDIATA:** Todos los desarrolladores deben reconfigurar sus entornos locales usando las nuevas variables de entorno.

## 🔧 ACCIONES INMEDIATAS

### 1. Para Desarrolladores Frontend
```bash
cd frontend
cp .env.example .env.local
# Editar .env.local con tus credenciales reales
```

### 2. Para Desarrolladores Backend
```bash
cd backend
cp .env.example .env
# Editar .env con tus credenciales reales
```

### 3. Para Equipo de Testing
```bash
cd sist_pizza_fase4_testing_kit
cp .env.example .env
# Editar .env con credenciales de testing
```

### 4. Configuración Automática (Recomendada)
```bash
# Desde la raíz del proyecto
./setup-env.sh all

# O configurar componente por componente
./setup-env.sh frontend
./setup-env.sh backend
./setup-env.sh testing
```

## 🔐 VARIABLES REQUERIDAS

### Frontend (.env.local)
```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anonima
```

### Backend (.env)
```env
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_ANON_KEY=tu-clave-anonima
SUPABASE_SERVICE_ROLE_KEY=tu-clave-service-role
```

### Testing (.env)
```env
BASE_URL=https://tu-dominio-app.com
TEST_ADMIN_EMAIL=admin@test.com
TEST_ADMIN_PASSWORD=tu-password-seguro
TEST_USER_EMAIL=user@test.com
TEST_USER_PASSWORD=tu-password-seguro
```

## 🛡️ MEDIDAS DE SEGURURA IMPLEMENTADAS

✅ **Archivos .env.example** creados con templates seguros  
✅ **Variables de entorno** configuradas para todos los componentes  
✅ **Passwords hardcodeadas** removidas y externalizadas  
✅ **URLs reales** reemplazadas con placeholders  
✅ **Archivos .gitignore** verificando protección de .env  
✅ **Script de configuración** automatizado creado  

## 🚨 ROTACIÓN DE CREDENCIALES REQUERIDA

**IMPORTANTE:** Dado que las credenciales estaban expuestas, se recomienda:

1. **Rotar SUPABASE_ANON_KEY** desde el dashboard de Supabase
2. **Regenerar passwords de testing** con valores únicos
3. **Actualizar variables en CI/CD** con nuevos secrets

### Cómo rotar credenciales en Supabase:
1. Ir a: https://app.supabase.com → Tu proyecto → Settings → API
2. Hacer clic en "Regenerate" para la anon key
3. Actualizar variables de entorno con la nueva clave

## 📋 CHECKLIST DE VALIDACIÓN

- [ ] Archivos .env configurados con valores reales
- [ ] Aplicación inicia sin errores
- [ ] Tests pasan correctamente
- [ ] Credenciales rotadas en Supabase
- [ ] Variables de CI/CD actualizadas

## 🆘 SOPORTE

Si encuentras problemas:
1. Revisar el reporte completo: `/workspace/docs/SECURITY_EXTERNALIZE_SECRETS_REPORT.md`
2. Ejecutar verificación: `./setup-env.sh verify`
3. Consultar logs de la aplicación para errores de configuración

## 📞 CONTACTOS DE EMERGENCIA

- **Seguridad:** Inmediatamente si detectas credenciales expuestas
- **Desarrollo:** Para problemas de configuración
- **DevOps:** Para issues de CI/CD

---

**⚠️ RECUERDA:** Nunca commitear archivos .env al repositorio. Siempre usar variables de entorno en producción.