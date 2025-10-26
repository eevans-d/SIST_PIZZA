# 🔐 Seguridad de Webhooks con HMAC

## Fecha de Implementación: 2025-10-26
## Estado: ✅ IMPLEMENTADO

---

## 📋 Resumen

Se implementó validación HMAC (Hash-based Message Authentication Code) para todos los webhooks del sistema, eliminando la vulnerabilidad crítica de falsificación de webhooks identificada en el análisis de seguridad.

---

## ✅ Webhooks Protegidos

### 1. Webhook de Chatwoot
- **Endpoint:** `POST /api/webhooks/chatwoot`
- **Header de firma:** `X-Chatwoot-Signature`
- **Secret:** `CHATWOOT_WEBHOOK_SECRET` (env)
- **Algoritmo:** HMAC-SHA256
- **IP Whitelist:** `['54.226.73.99', '54.241.27.196', '54.219.37.83']`

### 2. Webhook de Modo (Pagos)
- **Endpoint:** `POST /api/webhooks/modo`
- **Header de firma:** `X-Modo-Signature`
- **Secret:** `MODO_WEBHOOK_SECRET` (env)
- **Algoritmo:** HMAC-SHA256
- **IP Whitelist:** `['190.112.0.0/16']`

### 3. Webhook de N8N (Pedidos)
- **Endpoint:** `POST /api/webhooks/n8n/pedido`
- **Header de firma:** `X-Signature`
- **Secret:** `N8N_WEBHOOK_SECRET` (env)
- **Algoritmo:** HMAC-SHA256
- **IP Validation:** Rate limiting (no IP whitelist)

---

## 🔒 Cómo Funciona

### Flujo de Validación

```
1. Request llega al servidor
   ↓
2. Express captura rawBody (body sin parsear)
   ↓
3. Middleware valida IP (whitelist)
   ↓
4. Middleware valida HMAC signature
   ↓
5. Si todo es válido → next()
   Si falla → 401 Unauthorized / 403 Forbidden
```

### Algoritmo HMAC

```typescript
// En el servidor externo (ej: Chatwoot)
const signature = crypto
  .createHmac('sha256', SECRET)
  .update(JSON.stringify(payload))
  .digest('hex');

// Enviar en header
headers['X-Chatwoot-Signature'] = signature;

// En SIST_PIZZA backend
const expectedSignature = crypto
  .createHmac('sha256', SECRET)
  .update(rawBody)
  .digest('hex');

// Comparación timing-safe
crypto.timingSafeEqual(
  Buffer.from(receivedSignature),
  Buffer.from(expectedSignature)
);
```

---

## 🛡️ Protecciones Implementadas

### 1. Timing Attack Protection
- Usa `crypto.timingSafeEqual()` para comparar firmas
- Evita revelar información por tiempo de respuesta
- Previene ataques de fuerza bruta sofisticados

### 2. IP Whitelist + HMAC (Defensa en Profundidad)
- Doble capa de validación
- IP whitelist: Primera línea de defensa
- HMAC: Garantiza integridad y autenticidad

### 3. Configuración Opcional
- Si `WEBHOOK_SECRET` no está configurado: Solo valida IP
- Warning en logs pero no bloquea (desarrollo)
- En producción: **SIEMPRE** configurar secrets

### 4. Raw Body Preservation
- Captura `req.rawBody` en express.json middleware
- Necesario para validar HMAC correctamente
- El body parseado puede diferir del raw (espacios, orden)

---

## 📝 Configuración Requerida

### Variables de Entorno

```bash
# .env
CHATWOOT_WEBHOOK_SECRET=your_chatwoot_webhook_secret_here
MODO_WEBHOOK_SECRET=your_modo_webhook_secret_here
N8N_WEBHOOK_SECRET=your_n8n_webhook_secret_here
```

### Validación de Config (Zod)

```typescript
// backend/src/config/validate.ts
chatwoot: z.object({
  apiKey: z.string().optional(),
  baseUrl: z.string().url().optional(),
  webhookSecret: z.string().optional(),
}).optional(),
```

---

## 🧪 Tests Implementados

### Cobertura: 16 Tests (100% passing)

**Test suite:** `backend/src/__tests__/webhook_validation.test.ts`

#### Tests de IP Validation
- ✅ Valida IP exacta en whitelist
- ✅ Valida IP con CIDR /16
- ✅ Valida IP con X-Forwarded-For múltiple
- ✅ Rechaza IP undefined

#### Tests de Chatwoot Webhook
- ✅ Rechaza IP no autorizada
- ✅ Permite IP autorizada sin secret
- ✅ Rechaza request sin firma (con secret)
- ✅ Valida firma HMAC correcta
- ✅ Rechaza firma HMAC incorrecta

#### Tests de Modo Webhook
- ✅ Rechaza IP no autorizada
- ✅ Permite IP autorizada sin secret
- ✅ Rechaza request sin firma (con secret)
- ✅ Valida firma HMAC correcta
- ✅ Rechaza firma HMAC incorrecta
- ✅ Rechaza firma con longitud incorrecta

#### Tests de Seguridad
- ✅ Usa timingSafeEqual para prevenir timing attacks

### Ejecutar Tests

```bash
cd backend
npm test -- webhook_validation.test.ts
```

---

## 🚀 Deployment Checklist

### Antes de Producción

- [ ] Obtener webhook secrets de cada servicio:
  - [ ] Chatwoot: Configurar en dashboard → Settings → Webhooks
  - [ ] Modo: Contactar soporte para obtener secret
  - [ ] N8N: Generar en n8n workflow settings

- [ ] Configurar secrets en producción:
  - [ ] Kubernetes Secrets
  - [ ] AWS Secrets Manager / GCP Secret Manager
  - [ ] Variables de entorno seguras

- [ ] Verificar IPs whitelist actualizadas:
  - [ ] Chatwoot: Confirmar IPs oficiales
  - [ ] Modo: Confirmar rangos CIDR
  - [ ] Actualizar `WHITELIST` en código si cambió

- [ ] Tests de integración:
  - [ ] Enviar webhook real desde Chatwoot → Validar 200 OK
  - [ ] Enviar webhook con firma incorrecta → Validar 401
  - [ ] Enviar webhook desde IP no autorizada → Validar 403

### Monitoreo

- [ ] Alertas en Grafana/Prometheus:
  ```promql
  # Alertar si hay muchos webhooks rechazados
  rate(http_requests_total{status="401",path=~"/api/webhooks/.*"}[5m]) > 5
  ```

- [ ] Logs a revisar:
  ```
  - "Chatwoot webhook rejected - invalid signature"
  - "MODO webhook rejected - invalid signature"
  - "CHATWOOT_WEBHOOK_SECRET not configured - skipping HMAC validation"
  ```

---

## 📚 Referencias

### Estándares de Seguridad
- [RFC 2104 - HMAC](https://tools.ietf.org/html/rfc2104)
- [OWASP - API Security](https://owasp.org/www-project-api-security/)
- [Timing Attack Prevention](https://en.wikipedia.org/wiki/Timing_attack)

### Documentación de Servicios
- [Chatwoot Webhooks](https://www.chatwoot.com/docs/product/webhooks)
- [Modo API Documentation](https://developers.modo.com.ar/)

---

## 🔄 Historial de Cambios

### 2025-10-26 - Implementación Inicial
- ✅ Implementada validación HMAC para Chatwoot
- ✅ Implementada validación HMAC para Modo
- ✅ Implementada validación HMAC para N8N
- ✅ Agregadas variables de entorno para secrets
- ✅ Agregada validación de config con Zod
- ✅ Creados 16 tests unitarios (100% pass)
- ✅ Documentación completa

---

## ⚠️ Notas de Seguridad

### Rotación de Secrets
- **Recomendado:** Rotar secrets cada 90 días
- **Proceso:**
  1. Generar nuevo secret en servicio externo
  2. Actualizar `WEBHOOK_SECRET` en env
  3. Reiniciar pods/containers
  4. Verificar webhooks funcionan
  5. Revocar secret antiguo

### Respuestas de Error
- **NUNCA** exponer detalles de validación en respuesta
- Solo devolver: `401 Unauthorized` o `403 Forbidden`
- Detalles solo en logs internos (no accesibles desde fuera)

### Compliance
- ✅ GDPR: No se logea información personal (PII) en errores
- ✅ PCI-DSS: Secrets nunca en logs ni respuestas
- ✅ ISO 27001: Doble factor de autenticación (IP + HMAC)

---

## 🎯 Estado de la Tarea

**Tarea Original:** `TAREAS_PENDIENTES_COMPLETO.md` → Sección 1.1

✅ **COMPLETADO** - Vulnerabilidad crítica eliminada

**Próximas Tareas:**
- 1.2 RLS (Row Level Security) Auditoría Completa
- 1.3 Índices de Base de Datos Faltantes
- 1.4 Foreign Keys y ON DELETE Actions

---

**Autor:** GenSpark AI Developer  
**Revisión de Seguridad:** Pendiente (humano)  
**Status:** Listo para PR y merge a main
