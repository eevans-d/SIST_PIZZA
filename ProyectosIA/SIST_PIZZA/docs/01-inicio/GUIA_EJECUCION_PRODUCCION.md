╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                  🎯 GUÍA DE EJECUCIÓN - RUTA PRODUCCIÓN                     ║
║                                                                              ║
║             INSTRUCCIONES PASO-A-PASO PARA EJECUTAR SISTEMA                ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
⚡ RESUMEN RÁPIDO
═══════════════════════════════════════════════════════════════════════════════

Tienes que hacer 2 cosas AHORA:

1️⃣ COPIAR & PEGAR SQL EN SUPABASE (11 minutos)
   • 2 pasos: Schema + Seed Data
   • No requiere coding
   • No hay que editar nada
   
2️⃣ VALIDAR QUE TODO FUNCIONA (10 minutos)
   • Tests: npm test
   • Curl: verificar endpoints
   • Resultado: ✅ TODO LISTO PARA PRODUCCIÓN

═══════════════════════════════════════════════════════════════════════════════
📍 PASO 1: EJECUTAR SQL EN SUPABASE (11 MINUTOS - USER ACTION)
═══════════════════════════════════════════════════════════════════════════════

⏱️  TIEMPO: 11 minutos máximo

✅ PASO 1A: CREAR TABLAS (5 minutos)
────────────────────────────────────

1. Abre en tu navegador (copia & pega esto):
   
   https://supabase.com/dashboard/project/htvlwhisjpdagqkqnpxg/sql/new

2. Click en "New query"

3. En VS Code, abre este archivo:
   📁 /docs/03-setup-sql/PASO_2_SCHEMA_SQL.txt

4. Selecciona TODO el contenido SQL (desde "-- ====" hasta el final)
   ⚠️ NO COPIES las instrucciones, SOLO el SQL

5. PÉGALO en el SQL Editor de Supabase

6. Click en el botón "Run" (o presiona Ctrl+Enter)

7. ESPERA a que complete
   Deberías ver: ✅ "Success. No rows returned"

8. Si ves error, revisa TROUBLESHOOTING en PLAN_EJECUCION_PRODUCCION.md

✅ PASO 1B: INSERTAR DATOS (3 minutos)
──────────────────────────────────────

1. Supabase SQL Editor → Click "New query" (NUEVAMENTE)

2. En VS Code, abre:
   📁 /docs/03-setup-sql/PASO_3_SEED_DATA_SQL.txt

3. Selecciona TODO el SQL (desde "-- ====" hasta el final)

4. PÉGALO en el SQL Editor de Supabase

5. Click "Run"

6. ESPERA a que complete
   Deberías ver: ✅ "Success. No rows returned"

7. Si ves error, revisa TROUBLESHOOTING

✅ PASO 1C: VERIFICAR (3 minutos)
─────────────────────────────────

1. Supabase Dashboard → Click "Table Editor"

2. En la izquierda deberías ver estas 7 tablas:
   
   ✓ clientes
   ✓ menu_items
   ✓ pedidos
   ✓ comandas
   ✓ pagos
   ✓ audit_logs
   ✓ zonas_entrega

3. Click en cada tabla para ver datos

4. Verifica counts aproximados:
   • clientes: ~5 registros
   • menu_items: ~18 productos
   • pedidos: ~3 pedidos
   • otros: datos relacionados

✅ FIN FASE 1
Si todo se vio bien → FASE 1 COMPLETADA ✅

═══════════════════════════════════════════════════════════════════════════════
📍 PASO 2: BACKEND - VERIFICAR CONECTIVIDAD (5 minutos)
═══════════════════════════════════════════════════════════════════════════════

⏱️  TIEMPO: 5 minutos

⚡ REQUISITO: Backend debe estar corriendo en puerto 4000

Comando 1 - Iniciar backend (NUEVA TERMINAL):
──────────────────────────────────

Abre OTRA terminal (no cierres esta) y ejecuta:

  $ cd /home/eevan/ProyectosIA/SIST_PIZZA/backend
  $ npm run dev

Deberías ver (después de ~3 segundos):
  
  ├─ Express servidor en puerto 4000 ✅
  ├─ Conectado a Supabase ✅
  └─ Health check disponible ✅

Si ves error:
  • Revisa TROUBLESHOOTING en PLAN_EJECUCION_PRODUCCION.md
  • Problema común: PORT 4000 ya en uso → matar proceso con: lsof -i :4000

Comando 2 - Health check (EN PRIMERA TERMINAL):
──────────────────────────────────────────────

  $ curl http://localhost:4000/health | jq .

Esperado:
  {
    "status": "ok"
  }

✅ Si ves esto → Backend está corriendo

Comando 3 - Health check CON DATABASE:
─────────────────────────────────────

  $ curl http://localhost:4000/api/health | jq .

Esperado:
  {
    "status": "ok",
    "database": "ok",        ← CRÍTICO
    "integrations": {
      "supabase": true       ← CRÍTICO
    }
  }

❌ SI VES "database": "error":
   • Revisa PASO 1 (SQL ejecutado?)
   • Verifica variables .env en backend/
   • Revisa TROUBLESHOOTING

Comando 4 - Ready check (para Kubernetes):
──────────────────────────────────────────

  $ curl http://localhost:4000/api/health/ready | jq .

Esperado:
  {
    "ready": true,
    "database": true,
    "version": "1.0.0"
  }

✅ FIN FASE 2
Si todo se conectó → FASE 2 COMPLETADA ✅

═══════════════════════════════════════════════════════════════════════════════
📍 PASO 3: EJECUTAR TESTS (5-10 minutos)
═══════════════════════════════════════════════════════════════════════════════

⏱️  TIEMPO: 5-10 minutos

Comando:
─────────

En la PRIMERA terminal (no donde está npm run dev):

  $ cd /home/eevan/ProyectosIA/SIST_PIZZA/backend
  $ npm test

Esto ejecutará 48 tests automatizados

Esperado:
──────

Deberías ver algo así:

  PASS  tests/health.test.ts (0.234s)
    Health Checks
      ✓ GET /health returns 200 (12ms)
      ✓ GET /api/health includes database status (24ms)
      ✓ GET /api/health/ready checks readiness (8ms)

  PASS  tests/webhook.test.ts (0.456s)
    Webhook Integration
      ✓ POST /api/webhooks/n8n/pedido creates order (50ms)
      ✓ Handles missing cliente_id (15ms)
      ✓ Validates menu items (32ms)

  [... más tests ...]

  Test Files   4 passed (4)
  Tests        48 passed (48)  ✅ CRÍTICO: Debe decir 48 passed
  Duration     2.5s

  Coverage:
    Lines     50.9%           ✅ CRÍTICO: 50.9% target

❌ SI FALLA:
   • Revisa TROUBLESHOOTING en PLAN_EJECUCION_PRODUCCION.md
   • Problema común: Database no conecta → ejecuta PASO 1 SQL
   • Si dice "48 passed" pero coverage baja → OK para producción

✅ FIN FASE 3
Si 48/48 tests pasaron → FASE 3 COMPLETADA ✅

═══════════════════════════════════════════════════════════════════════════════
📍 PASO 4: VALIDAR WEBHOOK (5 minutos)
═══════════════════════════════════════════════════════════════════════════════

⏱️  TIEMPO: 5 minutos

⚡ REQUISITO: Backend corriendo (npm run dev)

Comando: Enviar request POST al webhook
───────────────────────────────────────

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
────────

  {
    "success": true,
    "pedido_id": "550e8400-e29b-41d4-a716-446655440000",
    "cliente_id": "550e8400-e29b-41d4-a716-446655440001",
    "total": 7000.00,
    "estado": "confirmado",
    "timestamp": "2025-10-22T15:30:00.000Z"
  }

✅ Si ves esto con "success": true → Webhook funciona

Verificar en Database:
─────────────────────

1. Abre Supabase Table Editor
2. Click en tabla "pedidos"
3. Deberías ver el pedido que acabas de crear
4. Verifica que tiene:
   • cliente_id
   • estado: "confirmado"
   • tipo_entrega: "delivery"
   • total: 7000.00

✅ FIN FASE 4
Si webhook respondió y pedido está en DB → FASE 4 COMPLETADA ✅

═══════════════════════════════════════════════════════════════════════════════
✅ FIN DE EJECUCIÓN
═══════════════════════════════════════════════════════════════════════════════

RESULTADO FINAL:

✅ Fase 1: SQL ejecutado (7 tablas + datos)
✅ Fase 2: Backend conectado a Supabase
✅ Fase 3: 48/48 tests pasando
✅ Fase 4: Webhook funciona end-to-end

🎉 SISTEMA LISTO PARA PRODUCCIÓN 🎉

═══════════════════════════════════════════════════════════════════════════════
🚀 SIGUIENTES PASOS (OPCIONAL - Para Producción Completa)
═══════════════════════════════════════════════════════════════════════════════

Si todo funcionó perfecto, opciones para llevar a producción:

OPCIÓN 1: Mantener como está (Desarrollo)
   • Backend corriendo con npm run dev
   • Supabase cloud (ya está)
   • Bueno para: Testing, desarrollo

OPCIÓN 2: Docker (Recomendado para Producción)
   • Ver: PLAN_EJECUCION_PRODUCCION.md FASE 6
   • Tiempo: 4-5 horas
   • Resultado: Sistema containerizado & deployable

OPCIÓN 3: Kubernetes (Advanced)
   • Después de Docker
   • Para: Scale horizontal
   • Revisa: docs/05-deployment/

═══════════════════════════════════════════════════════════════════════════════
💾 RESUMEN ARCHIVOS IMPORTANTES
═══════════════════════════════════════════════════════════════════════════════

Documentación:
  📄 MASTER_BLUEPRINT.md                    → Visión general
  📄 PLAN_EJECUCION_PRODUCCION.md           → Este documento (expandido)
  📄 CHECKLIST_ACCIONABLE.md                → Tareas detalladas
  📄 docs/06-referencias/TROUBLESHOOTING.md → Resolver problemas
  📄 docs/06-referencias/COMANDOS_RAPIDOS.md → Comandos útiles

SQL:
  📁 docs/03-setup-sql/PASO_2_SCHEMA_SQL.txt     → Crear tablas
  📁 docs/03-setup-sql/PASO_3_SEED_DATA_SQL.txt  → Insertar datos

Backend:
  📁 backend/                → Código Node.js
  📁 backend/src/            → Código fuente
  📁 backend/tests/          → Tests (48 tests)
  📄 backend/.env            → Configuración
  📄 backend/package.json    → Dependencias

═══════════════════════════════════════════════════════════════════════════════
❓ PROBLEMAS COMUNES
═══════════════════════════════════════════════════════════════════════════════

❌ "Error: connect ECONNREFUSED"
   ✅ Revisa: PASO 2 - variables .env, Supabase está online

❌ "Error: table clientes does not exist"
   ✅ Revisa: PASO 1 - SQL no fue ejecutado

❌ "Port 4000 already in use"
   ✅ Ejecuta: lsof -i :4000 | kill -9 <PID>

❌ "curl: command not found"
   ✅ Usa PowerShell en Windows o instala curl

Para MÁS problemas → Ver docs/06-referencias/TROUBLESHOOTING.md

═══════════════════════════════════════════════════════════════════════════════
✨ ¡LISTO! FELICITACIONES 🎉
═══════════════════════════════════════════════════════════════════════════════

Acabas de:
  ✅ Ejecutar SQL en Supabase
  ✅ Verificar conectividad backend
  ✅ Ejecutar 48 tests con éxito
  ✅ Validar webhook end-to-end

Sistema está LISTO PARA PRODUCCIÓN.

¿Próximos pasos?
  → Opción 1: Iniciar Docker (PLAN_EJECUCION_PRODUCCION.md FASE 6)
  → Opción 2: Mantener como está
  → Opción 3: Consultar docs/05-deployment/ para Kubernetes

═══════════════════════════════════════════════════════════════════════════════

