# 🎯 SIST_PIZZA - BLUEPRINT EJECUTABLE

> **Fecha:** 21 de Octubre 2025  
> **Estado Actual:** Código base implementado (21 commits) - Requiere validación y deployment  
> **Objetivo:** Proyecto 100% funcional, testeado y desplegado en producción

---

## 📋 CHECKLIST MAESTRO

### ✅ COMPLETADO (Base del Proyecto)
- [x] Estructura de proyecto (backend + frontend)
- [x] Configuración TypeScript
- [x] Dependencias instaladas (npm)
- [x] Código fuente backend (workflows, services, integrations)
- [x] Código fuente frontend (components, pages, hooks)
- [x] Tests creados (vitest backend + frontend)
- [x] Docker configs (Dockerfile.backend + Dockerfile.frontend)
- [x] Kubernetes manifests (k8s/)
- [x] Monitoring configs (Prometheus + Grafana)
- [x] Scripts de deployment
- [x] Documentación extensa

---

## 🔴 FASE ACTUAL: VALIDACIÓN Y DEPLOYMENT

### 🎯 MILESTONE 1: VALIDACIÓN TÉCNICA (3-4 horas)
**Objetivo:** Verificar que todo el código compila, pasa tests y funciona localmente

#### ☐ STEP 1.1: Compilación Backend
```bash
cd backend
npm install           # ¿Dependencias instaladas correctamente?
npm run build         # ¿TypeScript compila sin errores?
npm run lint          # ¿Código cumple estándares?
```
**Criterio de éxito:**
- ✅ 0 errores de compilación TypeScript
- ✅ 0 errores de linting ESLint
- ✅ Archivo `dist/server.js` generado

---

#### ☐ STEP 1.2: Compilación Frontend
```bash
cd frontend
npm install           # ¿Dependencias resueltas?
npm run build         # ¿Vite genera build producción?
npm run type-check    # ¿TypeScript valida tipos?
```
**Criterio de éxito:**
- ✅ Build en `dist/` generado
- ✅ 0 errores de tipos TypeScript
- ✅ Assets optimizados (CSS, JS minificado)

---

#### ☐ STEP 1.3: Tests Unitarios Backend
```bash
cd backend
npm test              # Ejecutar 60+ tests
```
**Criterio de éxito:**
- ✅ Todos los tests en verde (pass)
- ✅ Coverage > 70% líneas de código
- ✅ 0 fallas en validaciones, lógica de negocio, seguridad

---

#### ☐ STEP 1.4: Tests Unitarios Frontend
```bash
cd frontend
npm test              # Ejecutar 50+ tests
```
**Criterio de éxito:**
- ✅ Todos los tests en verde
- ✅ Validaciones de cart, pagos, UI funcionando
- ✅ Sin errores en hooks o componentes

---

#### ☐ STEP 1.5: Variables de Entorno
**Acción:** Crear archivos `.env` reales desde `.env.example`

**Backend** (`/backend/.env`):
```bash
# Verificar que existan:
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJxxx...
ANTHROPIC_API_KEY=sk-ant-xxx
MODO_API_KEY=xxx
CHATWOOT_API_KEY=xxx
NODE_ENV=development
PORT=3000
```

**Frontend** (`/frontend/.env`):
```bash
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
VITE_API_URL=http://localhost:3000
```

**Criterio de éxito:**
- ✅ Archivos `.env` creados y NO committeados
- ✅ Valores reales (Supabase, APIs) configurados
- ✅ Backend puede conectarse a Supabase

---

#### ☐ STEP 1.6: Base de Datos Supabase
**Acción:** Ejecutar migraciones y seed

```bash
# ¿Existe el archivo de migración?
cat backend/src/db/migrations.sql

# Ejecutar en Supabase SQL Editor:
# 1. Copiar contenido de migrations.sql
# 2. Pegar en Supabase SQL Editor
# 3. Run Query
# 4. Verificar tablas creadas: users, orders, menu, deliveries, etc.
```

**Criterio de éxito:**
- ✅ Tablas creadas en Supabase
- ✅ RLS policies configuradas
- ✅ Seed data insertado (pizzas, zonas)

---

### 🎯 MILESTONE 2: EJECUCIÓN LOCAL (2-3 horas)
**Objetivo:** Levantar stack completo y validar flujos end-to-end

#### ☐ STEP 2.1: Backend Standalone
```bash
cd backend
npm run dev           # Levantar servidor en localhost:3000
```

**Validaciones:**
- [ ] Servidor escucha en `http://localhost:3000`
- [ ] Endpoint `/api/health` responde `{ status: "ok" }`
- [ ] Logs Winston funcionando (consola + archivo)
- [ ] Métricas Prometheus en `/metrics`

**Pruebas manuales:**
```bash
# Health check
curl http://localhost:3000/api/health

# Crear orden
curl -X POST http://localhost:3000/api/comandas \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user-1",
    "items": [{"menuId": "pizza-1", "quantity": 2}],
    "address": "Calle 50 #123, Necochea",
    "phone": "2262123456"
  }'
```

**Criterio de éxito:**
- ✅ API responde sin errores 500
- ✅ Orden se crea en Supabase
- ✅ Logs registran operaciones

---

#### ☐ STEP 2.2: Frontend Standalone
```bash
cd frontend
npm run dev           # Levantar Vite en localhost:5173
```

**Validaciones:**
- [ ] App carga en `http://localhost:5173`
- [ ] UI se renderiza correctamente (sin errores React)
- [ ] Puede agregar items al carrito
- [ ] Formulario de orden funciona
- [ ] Tracking de órdenes muestra datos

**Criterio de éxito:**
- ✅ Frontend sin errores en consola
- ✅ Supabase conectado (puede leer datos)
- ✅ Flujo de compra funcional

---

#### ☐ STEP 2.3: Integración Frontend ↔ Backend
**Acción:** Probar flujo end-to-end

**Escenario de prueba:**
1. Abrir frontend (`localhost:5173`)
2. Agregar 2 pizzas al carrito
3. Llenar formulario de orden
4. Enviar orden
5. Verificar en backend que se creó
6. Ver orden en página de tracking

**Criterio de éxito:**
- ✅ Orden se crea desde frontend
- ✅ Backend la persiste en Supabase
- ✅ Frontend muestra confirmación
- ✅ Tracking actualiza en tiempo real (websockets)

---

#### ☐ STEP 2.4: Docker Compose Local
```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA
docker-compose build  # Construir imágenes
docker-compose up     # Levantar stack completo
```

**Validaciones:**
- [ ] Containers inician sin errores
- [ ] Backend container escucha en puerto 3000
- [ ] Frontend container escucha en puerto 80
- [ ] Prometheus/Grafana containers funcionando
- [ ] Logs de containers sin crasheos

**Criterio de éxito:**
- ✅ `docker ps` muestra 4+ containers running
- ✅ Frontend accesible en `http://localhost`
- ✅ Backend accesible en `http://localhost:3000`
- ✅ Grafana en `http://localhost:3001`

---

### 🎯 MILESTONE 3: INTEGRACIONES (3-4 horas)
**Objetivo:** Validar servicios externos (AFIP, Modo, Chatwoot, Claude)

#### ☐ STEP 3.1: AFIP DNI Validation
```bash
# Test en backend
curl http://localhost:3000/api/validate-dni \
  -H "Content-Type: application/json" \
  -d '{"dni": "12345678"}'
```

**Criterio de éxito:**
- ✅ Validación funciona (mock o API real)
- ✅ Cache funciona (2da request más rápida)
- ✅ Rate limiting aplicado

---

#### ☐ STEP 3.2: Modo Pagos
**Test:** Crear pago y recibir webhook

```bash
# Crear orden con pago
curl -X POST http://localhost:3000/api/comandas \
  -d '{"paymentMethod": "modo", ...}'

# Simular webhook de Modo
curl -X POST http://localhost:3000/api/webhooks/modo \
  -H "Content-Type: application/json" \
  -d '{"status": "approved", "orderId": "xxx"}'
```

**Criterio de éxito:**
- ✅ Orden cambia estado a "pagado"
- ✅ Webhook signature validada
- ✅ Log de transacción registrado

---

#### ☐ STEP 3.3: Chatwoot Support
**Test:** Enviar mensaje al sistema de soporte

```bash
curl -X POST http://localhost:3000/api/webhooks/chatwoot \
  -d '{"message": "Necesito ayuda", "userId": "xxx"}'
```

**Criterio de éxito:**
- ✅ Ticket creado en Supabase
- ✅ Notificación enviada a Chatwoot (si configurado)

---

#### ☐ STEP 3.4: Claude AI Chatbot
**Test:** Enviar consulta al chatbot

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "¿Qué pizzas tienen disponibles?"}'
```

**Criterio de éxito:**
- ✅ Respuesta coherente de Claude
- ✅ Responde en español
- ✅ Consulta registrada en logs

---

#### ☐ STEP 3.5: Reports (PDF/Excel)
```bash
# Generar reporte de órdenes
curl http://localhost:3000/api/reports/orders?format=pdf
curl http://localhost:3000/api/reports/orders?format=excel
```

**Criterio de éxito:**
- ✅ PDF generado (pdfkit)
- ✅ Excel generado (exceljs)
- ✅ Archivos descargables

---

#### ☐ STEP 3.6: Routing Optimization
```bash
# Calcular ruta óptima de delivery
curl -X POST http://localhost:3000/api/routing/optimize \
  -d '{"orders": ["order-1", "order-2", "order-3"]}'
```

**Criterio de éxito:**
- ✅ Ruta calculada correctamente
- ✅ Tiempo estimado por orden
- ✅ Distancias calculadas

---

### 🎯 MILESTONE 4: MONITORING & OBSERVABILITY (2 horas)
**Objetivo:** Dashboard de métricas funcionando

#### ☐ STEP 4.1: Prometheus Scraping
```bash
# Verificar que Prometheus recolecta métricas
curl http://localhost:3000/metrics
```

**Verificar:**
- [ ] Métricas expuestas en formato Prometheus
- [ ] Counters de requests HTTP
- [ ] Gauges de recursos (memoria, CPU)
- [ ] Histograms de latencias

**Criterio de éxito:**
- ✅ Endpoint `/metrics` funcional
- ✅ Prometheus UI muestra targets "UP"
- ✅ Queries PromQL funcionan

---

#### ☐ STEP 4.2: Grafana Dashboards
```bash
# Acceder a Grafana
open http://localhost:3001
# Login: admin / admin (cambiar password)
```

**Verificar:**
- [ ] 12 dashboards pre-configurados
- [ ] Gráficos muestran datos en tiempo real
- [ ] Alertas configuradas

**Dashboards esperados:**
1. Overview General
2. HTTP Requests
3. Database Performance
4. Order Processing
5. Payment Metrics
6. Error Rates
7. Latency P50/P95/P99
8. Resource Usage
9. SLA Tracking
10. Business KPIs
11. Delivery Metrics
12. Support Tickets

**Criterio de éxito:**
- ✅ Dashboards muestran métricas
- ✅ Alertas funcionales

---

### 🎯 MILESTONE 5: COMPLIANCE & SECURITY (2 horas)
**Objetivo:** Validar GDPR, Ley 25.326 y seguridad

#### ☐ STEP 5.1: PII Redaction
```bash
# Test de redacción de datos sensibles
npm run test -- compliance.test.ts
```

**Criterio de éxito:**
- ✅ DNI/CUIT enmascarados en logs
- ✅ Emails ofuscados
- ✅ Teléfonos parcialmente ocultos

---

#### ☐ STEP 5.2: Data Retention
```bash
# Verificar que datos antiguos se eliminan
curl http://localhost:3000/api/compliance/cleanup
```

**Criterio de éxito:**
- ✅ Órdenes > 90 días eliminadas
- ✅ Logs de auditoría conservados
- ✅ Backup antes de eliminar

---

#### ☐ STEP 5.3: Security Scan
```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA
bash scripts/security-scan.sh
```

**Criterio de éxito:**
- ✅ npm audit sin vulnerabilidades críticas
- ✅ Trivy scan de imágenes Docker OK
- ✅ OWASP ZAP scan sin high-risk

---

### 🎯 MILESTONE 6: KUBERNETES DEPLOYMENT (3-4 horas)
**Objetivo:** Desplegar en cluster K8s (local o cloud)

#### ☐ STEP 6.1: Preparar Cluster
```bash
# Opción A: Minikube (local)
minikube start --cpus=4 --memory=8192

# Opción B: GKE/EKS/AKS (cloud)
# Seguir guía específica de proveedor
```

**Criterio de éxito:**
- ✅ Cluster K8s disponible
- ✅ kubectl conectado
- ✅ Namespaces creados

---

#### ☐ STEP 6.2: Deploy Manifests
```bash
cd /home/eevan/ProyectosIA/SIST_PIZZA
bash scripts/deploy-k8s.sh
```

**Verificar deployments:**
```bash
kubectl get pods -n sist-pizza
kubectl get svc -n sist-pizza
kubectl get ingress -n sist-pizza
```

**Criterio de éxito:**
- ✅ Pods running (backend, frontend, monitoring)
- ✅ Services expuestos
- ✅ Ingress configurado

---

#### ☐ STEP 6.3: Horizontal Pod Autoscaling
```bash
# Simular carga
kubectl run -i --tty load-generator --rm --image=busybox --restart=Never -- /bin/sh -c "while true; do wget -q -O- http://backend-service; done"
```

**Criterio de éxito:**
- ✅ HPA escala pods automáticamente
- ✅ CPU/memoria triggers funcionando
- ✅ Scale up/down observado

---

#### ☐ STEP 6.4: Ingress & SSL
```bash
# Configurar dominio y certificado
kubectl apply -f k8s/ingress.yaml
```

**Criterio de éxito:**
- ✅ Dominio apunta a cluster
- ✅ Certificado SSL/TLS instalado
- ✅ HTTPS funcional

---

### 🎯 MILESTONE 7: CI/CD & AUTOMATION (2 horas)
**Objetivo:** Pipeline automático de deployment

#### ☐ STEP 7.1: GitHub Actions
```bash
# Verificar workflows
cat .github/workflows/ci.yml
cat .github/workflows/deploy.yml
```

**Verificar que ejecuten:**
1. Lint + TypeScript check
2. Unit tests
3. Build Docker images
4. Push a registry (DockerHub/GCR)
5. Deploy to K8s (staging/prod)

**Criterio de éxito:**
- ✅ Push a main → trigger CI/CD
- ✅ Tests pasan automáticamente
- ✅ Deploy a staging exitoso

---

#### ☐ STEP 7.2: Rollback Strategy
```bash
# Test de rollback
kubectl rollout undo deployment/backend -n sist-pizza
```

**Criterio de éxito:**
- ✅ Rollback funciona sin downtime
- ✅ Health checks validan deployment

---

### 🎯 MILESTONE 8: DOCUMENTATION & HANDOFF (1 hora)
**Objetivo:** Documentación operacional

#### ☐ STEP 8.1: Runbook Operacional
Crear: `OPERATIONS.md`

Incluir:
- Cómo levantar localmente
- Cómo hacer deploy
- Troubleshooting común
- Contactos de soporte

---

#### ☐ STEP 8.2: API Documentation
```bash
# Generar docs de API (Swagger/OpenAPI)
npm run docs
```

**Criterio de éxito:**
- ✅ Swagger UI accesible
- ✅ Todos los endpoints documentados

---

#### ☐ STEP 8.3: Video Demo
Grabar demo de 5 minutos mostrando:
1. Crear orden desde frontend
2. Ver en admin dashboard
3. Tracking de delivery
4. Métricas en Grafana

---

## 📊 RESUMEN DE ESFUERZO

| Milestone | Esfuerzo | Prioridad |
|-----------|----------|-----------|
| 1. Validación Técnica | 3-4h | 🔴 CRÍTICO |
| 2. Ejecución Local | 2-3h | 🔴 CRÍTICO |
| 3. Integraciones | 3-4h | 🟠 ALTA |
| 4. Monitoring | 2h | 🟠 ALTA |
| 5. Compliance | 2h | 🟡 MEDIA |
| 6. Kubernetes | 3-4h | 🟢 BAJA (opcional) |
| 7. CI/CD | 2h | 🟢 BAJA (opcional) |
| 8. Docs | 1h | 🟢 BAJA (opcional) |
| **TOTAL** | **18-24h** | - |

---

## 🚀 ORDEN DE EJECUCIÓN RECOMENDADO

### 🎯 SPRINT 1 (DÍA 1 - 6 horas)
✅ PASO 1: Compilar backend → `npm run build`  
✅ PASO 2: Compilar frontend → `npm run build`  
✅ PASO 3: Ejecutar tests backend → `npm test`  
✅ PASO 4: Ejecutar tests frontend → `npm test`  
✅ PASO 5: Configurar `.env` files  
✅ PASO 6: Migrar DB en Supabase  

**Objetivo:** Código compila, tests pasan, DB lista

---

### 🎯 SPRINT 2 (DÍA 2 - 4 horas)
✅ PASO 7: Levantar backend local → `npm run dev`  
✅ PASO 8: Levantar frontend local → `npm run dev`  
✅ PASO 9: Probar flujo end-to-end manual  
✅ PASO 10: Docker Compose → `docker-compose up`  

**Objetivo:** App funciona localmente

---

### 🎯 SPRINT 3 (DÍA 3 - 4 horas)
✅ PASO 11: Validar AFIP integration  
✅ PASO 12: Validar Modo Pagos  
✅ PASO 13: Validar Chatwoot  
✅ PASO 14: Validar Claude AI  
✅ PASO 15: Validar Reports  
✅ PASO 16: Validar Routing  

**Objetivo:** Integraciones funcionando

---

### 🎯 SPRINT 4 (DÍA 4 - 2 horas)
✅ PASO 17: Configurar Prometheus  
✅ PASO 18: Configurar Grafana dashboards  
✅ PASO 19: Validar métricas  

**Objetivo:** Monitoring operacional

---

### 🎯 SPRINT 5 (DÍA 5 - 4 horas) - OPCIONAL
✅ PASO 20: Deploy a Kubernetes  
✅ PASO 21: Validar HPA  
✅ PASO 22: Configurar Ingress  

**Objetivo:** Producción en K8s

---

## 🎉 DEFINICIÓN DE "DONE"

El proyecto está **100% COMPLETO** cuando:

✅ **1. Código Limpio**
- [ ] Backend compila sin errores TypeScript
- [ ] Frontend compila sin errores TypeScript
- [ ] 0 warnings de linting
- [ ] Todos los tests (110+) en verde

✅ **2. Funcional Localmente**
- [ ] Backend responde en localhost:3000
- [ ] Frontend responde en localhost:5173
- [ ] Flujo completo: crear orden → pagar → tracking
- [ ] Docker Compose levanta stack completo

✅ **3. Integraciones Operativas**
- [ ] AFIP validación funciona
- [ ] Modo Pagos procesa transacciones
- [ ] Claude AI responde consultas
- [ ] Reports PDF/Excel generan archivos
- [ ] Routing calcula rutas

✅ **4. Observability**
- [ ] Prometheus recolecta métricas
- [ ] Grafana muestra 12 dashboards
- [ ] Logs estructurados con Winston
- [ ] Alertas configuradas

✅ **5. Compliance**
- [ ] PII redaction activa
- [ ] Data retention funciona
- [ ] Audit logs registrando

✅ **6. Deployment Ready**
- [ ] Docker images construyen
- [ ] Kubernetes manifests válidos
- [ ] GitHub Actions CI/CD configurado
- [ ] Secrets management definido

✅ **7. Documentado**
- [ ] README completo
- [ ] API docs (Swagger)
- [ ] Runbook operacional
- [ ] Video demo grabado

---

## 📞 PRÓXIMOS PASOS INMEDIATOS

Responde con **un número del 1 al 26** para que comience a ejecutar ese paso específico:

1. ☐ Compilar backend
2. ☐ Compilar frontend
3. ☐ Ejecutar tests backend
4. ☐ Ejecutar tests frontend
5. ☐ Configurar .env files
6. ☐ Migrar DB Supabase
7. ☐ Levantar backend local
8. ☐ Levantar frontend local
9. ☐ Probar flujo end-to-end
10. ☐ Docker Compose up
11. ☐ Validar AFIP
12. ☐ Validar Modo
13. ☐ Validar Chatwoot
14. ☐ Validar Claude
15. ☐ Validar Reports
16. ☐ Validar Routing
17. ☐ Prometheus setup
18. ☐ Grafana dashboards
19. ☐ Validar métricas
20. ☐ Deploy Kubernetes
21. ☐ Validar HPA
22. ☐ Configurar Ingress
23. ☐ CI/CD GitHub Actions
24. ☐ Runbook operacional
25. ☐ API documentation
26. ☐ Video demo

**O responde "EJECUTAR SPRINT 1" para que ejecute los pasos 1-6 en secuencia automática.**

---

**Este blueprint es tu mapa de ruta. Sin desviaciones. Sin improvisaciones. Paso a paso hasta producción. 🚀**
