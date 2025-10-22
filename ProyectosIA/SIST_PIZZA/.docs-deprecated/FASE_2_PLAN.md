# 📋 FASE 2: Backend APIs (Prompts 6-14)
**Estimado**: 4-5 horas | **Inicio**: Oct 21, 2025  
**Objetivo**: Implementar servidor Express, validaciones, clientes de APIs externas y workflows

---

## ✅ Checklist de Implementación

### Paso 1: Servidor Express Base (Prompt 6)
- [ ] `backend/src/server.ts` - Configuración Express
  - Express app con CORS, helmet, morgan
  - Manejo global de errores
  - Graceful shutdown
  - Health check endpoint

### Paso 2: Middleware de Validación (Prompt 7)
- [ ] `backend/src/middlewares/validateWebhook.ts`
  - Validación de IP (whitelist)
  - Validación de firma
  - Manejo de duplicados

### Paso 3: Cliente Claude API (Prompt 8)
- [ ] `backend/src/services/claude.ts`
  - Inicialización Anthropic SDK
  - Redacción de PII antes de enviar
  - Rate limiting ($0.10 USD/sesión)
  - Prompts para diferentes flujos

### Paso 4: Cliente MODO API (Prompt 9)
- [ ] `backend/src/services/modo.ts`
  - Autenticación con API key
  - Validación de montos
  - Detección de duplicados

### Paso 5: Cliente Chatwoot (Prompt 10)
- [ ] `backend/src/services/chatwoot.ts`
  - Crear conversaciones
  - Enviar mensajes
  - Rate limiting + retry

### Paso 6: Workflow - Recepción de Mensajes (Prompt 11)
- [ ] `backend/src/workflows/recepcionMensajes.ts`
  - Parsear entrada (teléfono)
  - Buscar/crear cliente
  - Escalar si está fuera de zona

### Paso 7: Workflow - Toma de Pedido (Prompt 12)
- [ ] `backend/src/workflows/tomaPedido.ts`
  - Validar items del menú
  - Validar cobertura de delivery
  - Crear pedido en DB
  - Calcular total

### Paso 8: Workflow - Generación de Pagos (Prompt 13)
- [ ] `backend/src/workflows/generarPago.ts`
  - Crear transacción MODO
  - Polling de estado
  - Webhooks de confirmación

### Paso 9: Workflow - Gestión de Comandas (Prompt 14)
- [ ] `backend/src/workflows/gestionComandas.ts`
  - Transiciones de estado
  - Validación de flujo
  - Notificaciones

### Paso 10: Test & Compilación
- [ ] npm run build sin errores
- [ ] Validar con TypeScript strict
- [ ] Git commit y push

---

## 📚 Dependencias Requeridas
```json
{
  "@anthropic-ai/sdk": "^0.9.1",      // Claude API
  "express": "^4.18.2",                 // Server
  "helmet": "^7.1.0",                   // Security headers
  "cors": "^2.8.5",                     // CORS middleware
  "morgan": "^1.10.0",                  // Logging HTTP
  "dotenv": "^16.3.1",                  // Env vars
  "zod": "^3.22.4",                     // Validación
  "winston": "^3.11.0"                  // Logging
}
```

---

## 🔒 Consideraciones de Seguridad

1. **PII Redaction**: Todos los clientes de API deben redactar antes de enviar
2. **Rate Limiting**: Claude ($0.10/sesión), Chatwoot (10 req/min)
3. **Validación de Entrada**: Zod en todos los endpoints
4. **IP Whitelist**: Webhooks solo de IPs oficiales
5. **Error Handling**: Nunca exponer detalles internos en respuestas

---

## 📊 Estructura Resultante

```
backend/src/
├── server.ts                    # Express setup (Prompt 6)
├── middlewares/
│   └── validateWebhook.ts       # Webhook validation (Prompt 7)
├── services/
│   ├── claude.ts                # Claude client (Prompt 8)
│   ├── modo.ts                  # MODO payments (Prompt 9)
│   └── chatwoot.ts              # Chatwoot integration (Prompt 10)
└── workflows/
    ├── recepcionMensajes.ts     # Message reception (Prompt 11)
    ├── tomaPedido.ts            # Order taking (Prompt 12)
    ├── generarPago.ts           # Payment generation (Prompt 13)
    └── gestionComandas.ts       # Order management (Prompt 14)
```

---

## 🚀 Próxima Fase
**Fase 3**: Frontend PWA (Prompts 15-25)
- React con Vite
- Dashboard de comandas en tiempo real
- PWA offline support
