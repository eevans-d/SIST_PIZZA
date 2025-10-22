╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                  🚀 PLAN DE EJECUCIÓN - RUTA PRODUCCIÓN                     ║
║                                                                              ║
║               SQL SETUP → TESTS → VALIDACIÓN → DOCKER → DEPLOYMENT          ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
📋 FASES DE EJECUCIÓN (PRODUCCIÓN)
═══════════════════════════════════════════════════════════════════════════════

FASE 1: SQL SETUP (11 minutos - USER ACTION PRIMERO)
───────────────────────────────────────────────────
Acción: Copiar SQL a Supabase y ejecutar

✅ PASO 1A: Schema Creación (5 min)
   • Abre: https://supabase.com/dashboard/project/htvlwhisjpdagqkqnpxg/sql
   • Nuevo query
   • Copia de: /docs/03-setup-sql/PASO_2_SCHEMA_SQL.txt
   • Ejecuta → Verifica "Success. No rows returned"
   • Resultado: 7 tablas creadas (clientes, menu_items, pedidos, comandas, pagos, audit_logs, zonas_entrega)

✅ PASO 1B: Seed Data (3 min)
   • Nuevo query
   • Copia de: /docs/03-setup-sql/PASO_3_SEED_DATA_SQL.txt
   • Ejecuta → Verifica "Success. No rows returned"
   • Resultado: 25+ registros de prueba insertados

✅ PASO 1C: Verificación (3 min)
   • Table Editor → Revisa cada tabla
   • Verifica counts:
     - clientes: 5 registros
     - menu_items: 18 productos
     - pedidos: 3 pedidos
     - comandas: detalles
     - pagos: información pago
     - audit_logs: logs de cambios
     - zonas_entrega: 5 zonas con precios

STATUS ESPERADO: ✅ BASE DE DATOS LISTA

═══════════════════════════════════════════════════════════════════════════════

FASE 2: VALIDAR BACKEND CONECTIVIDAD (5 minutos)
─────────────────────────────────────────────────
Acción: Verificar que backend puede comunicarse con Supabase

⚡ VERIFICACIÓN: Backend está corriendo en puerto 4000

Comando 1 - Health check básico:
   $ curl http://localhost:4000/health | jq .
   
   Esperado:
   {
     "status": "ok"
   }

Comando 2 - Health check con DB:
   $ curl http://localhost:4000/api/health | jq .
   
   Esperado:
   {
     "status": "ok",
     "database": "ok",      ← CRÍTICO
     "integrations": {
       "supabase": true     ← CRÍTICO
     }
   }

Comando 3 - Ready check (para Kubernetes/Docker):
   $ curl http://localhost:4000/api/health/ready | jq .
   
   Esperado:
   {
     "ready": true,
     "database": true,
     "version": "1.0.0"
   }

❌ SI FALLA: 
   → Ver TROUBLESHOOTING.md → "Backend no se conecta a DB"
   → Verificar SUPABASE_URL en .env
   → Verificar SUPABASE_KEY en .env
   → Verificar que backend está en puerto 4000

STATUS ESPERADO: ✅ BACKEND CONECTADO A DB

═══════════════════════════════════════════════════════════════════════════════

FASE 3: EJECUTAR TESTS (5-10 minutos)
──────────────────────────────────────
Acción: Ejecutar suite completa de 48 tests

Comando:
   $ cd backend
   $ npm test

Esperado:
   ✓ 48 tests passing (100%)
   ├─ webhook tests: 12/12 ✅
   ├─ database tests: 18/18 ✅
   ├─ validation tests: 12/12 ✅
   ├─ error handling: 6/6 ✅
   └─ Coverage: ~50.9% goal

Salida típica:
   PASS  tests/webhook.test.ts (0.234s)
   PASS  tests/database.test.ts (0.456s)
   PASS  tests/validation.test.ts (0.123s)
   PASS  tests/errors.test.ts (0.089s)
   
   Test Suites: 4 passed, 4 total
   Tests:       48 passed, 48 total
   Coverage:    Lines 50.9%

❌ SI FALLA:
   → Ver TROUBLESHOOTING.md → "Tests fallando"
   → Verificar que SQL fue ejecutado
   → Verificar que backend se conecta a DB (FASE 2)
   → Revisar logs: `npm test -- --reporter=verbose`

STATUS ESPERADO: ✅ TODOS LOS TESTS PASANDO

═══════════════════════════════════════════════════════════════════════════════

FASE 4: VALIDAR WEBHOOK N8N → BACKEND (5 minutos)
────────────────────────────────────────────────
Acción: Verificar que flujo N8N → webhook → backend → DB funciona

⚡ REQUISITOS:
   • N8N corriendo en localhost:5678
   • Backend corriendo en localhost:4000
   • Database conectada

Test manual de webhook:
   $ curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
     -H "Content-Type: application/json" \
     -d '{
       "cliente_telefono": "2262401234",
       "items": [
         {
           "producto_nombre": "Pizza Muzzarella",
           "cantidad": 2
         }
       ],
       "tipo_entrega": "delivery",
       "direccion": "Calle 83 N° 456"
     }' | jq .

Esperado:
   {
     "success": true,
     "pedido_id": "550e8400-e29b-41d4-a716-446655440000",
     "cliente_id": "550e8400-e29b-41d4-a716-446655440001",
     "total": 7000.00,
     "estado": "confirmado",
     "timestamp": "2025-10-22T15:30:00.000Z"
   }

Verificar en DB:
   $ sqlite3 (o similar)
   SELECT * FROM pedidos WHERE id = '550e8400-...';

❌ SI FALLA:
   → Verificar endpoint escuchando: netstat -an | grep 4000
   → Verificar firewall: sudo ufw allow 4000
   → Ver TROUBLESHOOTING.md → "Webhook no responde"
   → Revisar logs backend: `npm run dev`

STATUS ESPERADO: ✅ WEBHOOK FUNCIONANDO

═══════════════════════════════════════════════════════════════════════════════

FASE 5: RESOLVER PROBLEMAS POTENCIALES (variable)
──────────────────────────────────────────────────
Acción: Identificar y resolver todos los problemas posibles

🔍 LISTA DE VALIDACIÓN - PROBLEMAS COMUNES:

1️⃣ CONEXIÓN A BASE DE DATOS
   ❌ Error: "Error: connect ECONNREFUSED 127.0.0.1:5432"
   ✅ Solución:
      • Verificar que Supabase está UP
      • Verificar SUPABASE_URL en .env
      • Verificar SUPABASE_KEY (service role key, no anon key)
      • Probar: curl https://htvlwhisjpdagqkqnpxg.supabase.co/auth/v1/healthz

2️⃣ VARIABLES DE ENTORNO FALTANTES
   ❌ Error: "Error: SUPABASE_URL is required"
   ✅ Solución:
      • Verificar archivo .env en /backend
      • Debe contener:
        SUPABASE_URL=https://htvlwhisjpdagqkqnpxg.supabase.co
        SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
        NODE_ENV=production
        PORT=4000
      • Recargar backend: npm run dev

3️⃣ PUERTOS EN CONFLICTO
   ❌ Error: "Error: listen EADDRINUSE :::4000"
   ✅ Solución:
      • Ver qué proceso usa puerto 4000:
        lsof -i :4000
      • Matar proceso:
        kill -9 <PID>
      • O cambiar puerto en .env: PORT=4001

4️⃣ PERMISOS ROW LEVEL SECURITY (RLS) INCORRECTO
   ❌ Error: "Error: new row violates row level security policy"
   ✅ Solución:
      • Verificar que RLS policies fueron creadas en SQL
      • Verificar que service_role key se está usando
      • Revisar: Settings → Database → RLS

5️⃣ TESTS FALLANDO
   ❌ Error: "Database connection failed"
   ✅ Solución:
      • Ejecutar FASE 1 (SQL)
      • Ejecutar FASE 2 (verificar conectividad)
      • Verificar datos de prueba fueron insertados
      • Correr: npm test -- --reporter=verbose

6️⃣ WEBHOOK NO RECIBE REQUESTS
   ❌ Error: "POST /api/webhooks/n8n/pedido → 404"
   ✅ Solución:
      • Verificar que ruta está definida en backend
      • grep -r "webhooks/n8n/pedido" backend/src/
      • Verificar CORS: Access-Control-Allow-Origin
      • Revisar: backend/src/routes/webhooks.ts

7️⃣ N8N NO SE CONECTA AL BACKEND
   ❌ Error: "Failed to call webhook"
   ✅ Solución:
      • Verificar N8N está en localhost:5678
      • Verificar backend está en localhost:4000
      • Probar ping: curl http://localhost:4000/health
      • Revisar firewall: sudo ufw status

8️⃣ DATOS NO APARECEN EN BASE DE DATOS
   ❌ Error: "Webhook responde OK pero DB vacía"
   ✅ Solución:
      • Verificar INSERT queries en webhook handler
      • Revisar logs backend: npm run dev
      • Verificar transacciones no están rolleando atrás
      • Revisar: backend/src/handlers/pedidos.ts

9️⃣ DOCKER NO INICIA
   ❌ Error: "docker-compose up → Error"
   ✅ Solución:
      • Ver logs: docker-compose logs -f
      • Verificar imagen se built: docker images | grep sist-pizza
      • Verificar puertos no en conflicto: netstat -an | grep LISTEN
      • Rebuildar: docker-compose build --no-cache

🔟 RATE LIMITING / THROTTLING
   ❌ Error: "429 Too Many Requests"
   ✅ Solución:
      • Verificar backend tiene rate limiting activado
      • Si está en testing, desactivar temporalmente
      • Verificar: backend/src/middleware/rateLimit.ts

STATUS DESPUÉS: ✅ TODOS LOS PROBLEMAS IDENTIFICADOS & RESUELTOS

═══════════════════════════════════════════════════════════════════════════════

FASE 6: PREPARAR DOCKER (4-5 horas)
────────────────────────────────────
Acción: Crear docker-compose con 6 servicios

Servicios en docker-compose.yml:
   1. postgres (Base de datos local - alternativa Supabase)
   2. backend (Node.js express)
   3. n8n (Automation engine)
   4. waha (WhatsApp client)
   5. nginx (Reverse proxy / Load balancer)
   6. redis (Caching - opcional)

Comando para verificar Dockerfile:
   $ ls -la backend/Dockerfile
   $ docker build -t sist-pizza:latest backend/

Comando para iniciar todo:
   $ docker-compose up -d
   $ docker-compose ps

Esperado:
   NAME                      COMMAND                  STATE
   sist-pizza-backend        "npm start"              Up
   sist-pizza-postgres       "postgres"               Up
   sist-pizza-n8n            "npm start"              Up
   sist-pizza-waha           "npm start"              Up
   sist-pizza-nginx          "nginx -g daemon off"   Up
   sist-pizza-redis          "redis-server"          Up

Verificar con:
   $ curl http://localhost (nginx)
   $ curl http://localhost:4000/health (backend)
   $ curl http://localhost:5678 (n8n)

STATUS ESPERADO: ✅ DOCKER STACK CORRIENDO

═══════════════════════════════════════════════════════════════════════════════

FASE 7: VALIDACIÓN FINAL PRODUCCIÓN (30 minutos)
─────────────────────────────────────────────────
Acción: Checklist final antes de deployment

📋 CHECKLIST FINAL:

✅ DATABASE
   ☐ SQL ejecutado (7 tablas)
   ☐ Seed data insertado (25+ registros)
   ☐ RLS policies activas
   ☐ Índices creados
   ☐ Backups configurados (Supabase automático)

✅ BACKEND
   ☐ npm install completado
   ☐ .env configurado correctamente
   ☐ Compila sin errores: npm run build
   ☐ npm test: 48/48 tests pasando
   ☐ npm run dev: Backend en puerto 4000

✅ TESTING
   ☐ Webhook tests: 12/12 ✅
   ☐ Database tests: 18/18 ✅
   ☐ Validation tests: 12/12 ✅
   ☐ Error handling: 6/6 ✅
   ☐ Coverage: ≥50.9%

✅ INTEGRACIÓN
   ☐ Backend → Supabase: OK
   ☐ N8N → Webhook: OK
   ☐ WAHA → N8N: OK (si está conectado)
   ☐ Health checks: 200 OK
   ☐ Ready checks: true

✅ DOCKER
   ☐ docker-compose.yml existe
   ☐ Dockerfile en backend/
   ☐ docker build: sin errores
   ☐ docker-compose up: 6 servicios UP
   ☐ Health checks en containers: OK

✅ SEGURIDAD
   ☐ .env no está en git
   ☐ Credenciales Supabase protegidas
   ☐ RLS policies habilitadas
   ☐ CORS configurado correctamente
   ☐ Rate limiting activo

✅ MONITOREO
   ☐ Logs configurados
   ☐ Error tracking (Sentry o similar)
   ☐ Database monitoring (Supabase metrics)
   ☐ Health endpoints expuestos
   ☐ Métricas de rendimiento disponibles

✅ DOCUMENTACIÓN
   ☐ README.md actualizado
   ☐ docker-compose.yml documentado
   ☐ .env.example con todas las variables
   ☐ Deployment guide escrito
   ☐ Runbooks para troubleshooting

═══════════════════════════════════════════════════════════════════════════════
⏱️  RESUMEN DE TIEMPOS
═══════════════════════════════════════════════════════════════════════════════

FASE 1: SQL Setup              11 minutos ⏱️
FASE 2: Validar Backend        5 minutos
FASE 3: Tests                  10 minutos
FASE 4: Webhook Validation     5 minutos
FASE 5: Resolver Problemas     15-30 minutos (variable según errores)
FASE 6: Docker Setup           4-5 HORAS
FASE 7: Validación Final       30 minutos

TOTAL ESTIMADO: 5-6 HORAS

═══════════════════════════════════════════════════════════════════════════════
🎯 ORDEN DE EJECUCIÓN RECOMENDADO
═══════════════════════════════════════════════════════════════════════════════

1. Usuario ejecuta FASE 1 (SQL) - 11 minutos
2. Yo valido FASE 2 (conectividad)
3. Yo ejecuto FASE 3 (tests)
4. Yo valido FASE 4 (webhook)
5. Yo resuelvo FASE 5 (problemas)
6. Yo preparo FASE 6 (Docker)
7. Yo hago FASE 7 (validación final)

═══════════════════════════════════════════════════════════════════════════════
🚀 ¡VAMOS! 
═══════════════════════════════════════════════════════════════════════════════

Siguiente paso: Ejecuta FASE 1 (SQL en Supabase)
Tiempo: 11 minutos
Resultado: Base de datos lista para produción

