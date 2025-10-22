╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║              📞 SIST_PIZZA - TROUBLESHOOTING CENTRALIZADO                   ║
║                                                                              ║
║                         SOLUCIONES A PROBLEMAS COMUNES                       ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
🚨 PROBLEMA: "relation does not exist" en SQL
═══════════════════════════════════════════════════════════════════════════════

Síntoma:
  Error: relation "clientes" does not exist

Causa probable:
  • SQL schema no fue ejecutado correctamente
  • Supabase proyecto ID incorrecto
  • Query SQL incompleto

Solución:
  1. Verifica que ejecutaste PASO_2_SCHEMA_SQL.txt
     └─ Debe retornar "Success. No rows returned"
  
  2. Ve a Supabase → Table Editor
     └─ Deberías ver 7 tablas
  
  3. Si no hay tablas:
     └─ Abre PASO_2_SCHEMA_SQL.txt nuevamente
     └─ Copia el SQL COMPLETO (no parcial)
     └─ Pégalo en Supabase SQL Editor
     └─ Click RUN
  
  4. Valida que project ID es: htvlwhisjpdagqkqnpxg
     └─ URL debe tener este ID

Próximo intento:
  └─ Regresa a: docs/03-setup-sql/EJECUTAR_SQL_AHORA.md

═══════════════════════════════════════════════════════════════════════════════
🚨 PROBLEMA: "database": "error" en health check
═══════════════════════════════════════════════════════════════════════════════

Síntoma:
  GET /api/health/ready retorna:
  {"status": "ok", "database": "error"}

Causa probable:
  • Backend no logra conectarse a Supabase
  • Credenciales en .env incorrectas
  • Supabase proyecto está offline
  • Red bloqueada (firewall/VPN)

Solución A - Verificar credenciales:
  1. Abre: backend/.env
     └─ Debe tener:
        SUPABASE_URL=https://htvlwhisjpdagqkqnpxg.supabase.co
        SUPABASE_ANON_KEY=<tu key aquí>
  
  2. Copia la key de Supabase:
     └─ Ve a Supabase Dashboard
     └─ Menu izquierdo → Settings → API
     └─ Busca "anon" key
     └─ Copia exactamente (sin espacios)
     └─ Pégala en backend/.env
  
  3. Guarda .env y reinicia backend:
     └─ pkill -f "npm run dev"
     └─ cd backend && npm run dev
  
  4. Intenta health check nuevamente:
     └─ curl http://localhost:4000/api/health/ready | jq .
     └─ Debe retornar "database": "ok"

Solución B - Verificar conexión manual:
  1. Terminal: Prueba conexión directa a Supabase
     $ curl -H "Authorization: Bearer YOUR_KEY" \
       https://htvlwhisjpdagqkqnpxg.supabase.co/rest/v1/clientes?limit=1
  
  2. Si falla:
     └─ La key o URL son incorrectas
     └─ Supabase está caído
     └─ Tu red bloquea la conexión
  
  3. Si funciona:
     └─ El problema está en backend
     └─ Revisa logs de backend

Solución C - Revisar logs:
  1. Terminal: Mira logs del backend
     $ cd backend && npm run dev 2>&1 | grep -i error
  
  2. Busca línea con "database" o "supabase"
  3. Lee el error completo

Regresa a:
  └─ docs/03-setup-sql/EJECUTAR_SQL_AHORA.md (sección Validar setup)

═══════════════════════════════════════════════════════════════════════════════
🚨 PROBLEMA: Tests fallan con "ECONNREFUSED"
═══════════════════════════════════════════════════════════════════════════════

Síntoma:
  Error: connect ECONNREFUSED 127.0.0.1:5432
  O: connect ECONNREFUSED 127.0.0.1:4000

Causa probable:
  • Backend no está corriendo
  • Puerto 4000 ya está en uso
  • Tests intenta conectar a BD directa (error)

Solución:
  1. Verifica que backend corre:
     $ lsof -i :4000
     └─ Debe mostrar: node ... npm run dev
  
  2. Si no aparece, inicia backend:
     $ cd /home/eevan/ProyectosIA/SIST_PIZZA/backend
     $ npm run dev
     └─ Espera a ver: "Server running on localhost:4000"
  
  3. En OTRA terminal, ejecuta tests:
     $ cd backend
     $ npm test
  
  4. Si sigue fallando:
     └─ Port 4000 podría estar en uso por otro proceso
     └─ Mata el proceso:
        $ pkill -f "port 4000"
     └─ Reinicia backend

Regresa a:
  └─ docs/04-testing/RUTA_TESTS_PLAN.md

═══════════════════════════════════════════════════════════════════════════════
🚨 PROBLEMA: Webhook retorna HTTP 400 Bad Request
═══════════════════════════════════════════════════════════════════════════════

Síntoma:
  POST /api/webhooks/n8n/pedido retorna 400 Bad Request
  {"error": "Validation failed", "details": [...]}

Causa probable:
  • Payload JSON inválido (syntax error)
  • Campos requeridos faltantes
  • Tipo de dato incorrecto
  • Comillas desequilibradas

Solución:
  1. Valida el JSON:
     └─ Usa: https://jsonlint.com/
     └─ Pega tu JSON
     └─ Si muestra error → hay syntax error
  
  2. Verifica estructura requerida:
     {
       "cliente": {
         "nombre": "string",
         "telefono": "string con +"
       },
       "items": [
         {
           "nombre": "string",
           "cantidad": numero,
           "precio": numero
         }
       ],
       "direccion_entrega": "string",
       "tipo_entrega": "domicilio"
     }
  
  3. Ejemplo curl correcto:
     $ curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
       -H "Content-Type: application/json" \
       -d '{
         "cliente": {"nombre":"Test","telefono":"+541112345678"},
         "items": [{"nombre":"Pizza","cantidad":1,"precio":500}],
         "direccion_entrega":"Calle 123",
         "tipo_entrega":"domicilio"
       }'
  
  4. Si sigue fallando:
     └─ Revisa logs del backend:
        grep "Validation" backend/logs/server.log

Regresa a:
  └─ docs/04-testing/INTEGRACIÓN_E2E_TESTING.md

═══════════════════════════════════════════════════════════════════════════════
🚨 PROBLEMA: "duplicate key value violates unique constraint"
═══════════════════════════════════════════════════════════════════════════════

Síntoma:
  SQL Error: duplicate key value violates unique constraint
  Ocurre durante: PASO_3_SEED_DATA_SQL.txt

Causa probable:
  • SEED DATA ya fue ejecutado antes
  • Los datos de prueba ya existen en la BD

Solución:
  ✅ ESTO NO ES UN ERROR CRÍTICO

  El sistema detectó que intentas insertar datos que ya existen.
  
  Opciones:
  1. Ignora el error y continúa
     └─ Los datos ya están en BD
     └─ El sistema funciona normalmente
  
  2. Si necesitas datos frescos, limpia BD:
     └─ PELIGRO: Esto elimina TODO
     └─ En Supabase → Table Editor
     └─ Por cada tabla: Click ... → Delete all rows
     └─ Luego ejecuta PASO_2 y PASO_3 nuevamente
  
  3. Recomendación:
     └─ Solo necesitas ejecutar una vez
     └─ No repitas PASO_3 a menos que limpies BD primero

Regresa a:
  └─ docs/03-setup-sql/EJECUTAR_SQL_AHORA.md

═══════════════════════════════════════════════════════════════════════════════
🚨 PROBLEMA: "npm: command not found"
═══════════════════════════════════════════════════════════════════════════════

Síntoma:
  Terminal: npm: command not found
  O: node: command not found

Causa probable:
  • Node.js no está instalado
  • node/npm no está en PATH
  • Terminal abierta antes de instalar Node.js

Solución:
  1. Instala Node.js (versión 18+):
     └─ Linux: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
     └─        sudo apt-get install -y nodejs
     └─ macOS: brew install node
     └─ Windows: Descarga de https://nodejs.org
  
  2. Verifica instalación:
     $ node --version
     └─ Debe mostrar: v18.x.x o superior
     
     $ npm --version
     └─ Debe mostrar: 9.x.x o superior
  
  3. Si muestra version pero npm sigue no encontrado:
     └─ Cierra terminal y abre una NUEVA
     └─ Node se agrega al PATH después de reinstalar
  
  4. Si sigue sin funcionar:
     └─ Instala nuevamente desde https://nodejs.org
     └─ Elige versión LTS (18 o superior)

═══════════════════════════════════════════════════════════════════════════════
🚨 PROBLEMA: Port 4000 already in use
═══════════════════════════════════════════════════════════════════════════════

Síntoma:
  Error: listen EADDRINUSE: address already in use :::4000

Causa probable:
  • Backend ya está corriendo en otra terminal
  • Otro proceso usando puerto 4000
  • Backend no cerró correctamente

Solución:
  1. Encuentra proceso en puerto 4000:
     $ lsof -i :4000
     └─ Mostrará: PID y proceso
  
  2. Mata el proceso:
     $ kill <PID>
     O:
     $ pkill -f "npm run dev"
  
  3. Verifica que está muerto:
     $ lsof -i :4000
     └─ No debe mostrar nada
  
  4. Inicia backend nuevamente:
     $ cd backend && npm run dev

═══════════════════════════════════════════════════════════════════════════════
🚨 PROBLEMA: Tests timeout o muy lentos
═══════════════════════════════════════════════════════════════════════════════

Síntoma:
  Tests toman > 2 minutos
  O: Tests timeout (failed after 30s)

Causa probable:
  • BD muy lenta
  • Red lenta
  • Máquina sobrecargada
  • Tests esperando conexión que no llega

Solución:
  1. Verifica que backend responde:
     $ curl http://localhost:4000/health
     └─ Debe responder en < 1 segundo
  
  2. Si responde lentamente:
     └─ Problema de conexión a Supabase
     └─ Revisa tutorial: "database": "error" en health check (arriba)
  
  3. Aumenta timeout en tests:
     └─ Abre: backend/vitest.config.ts
     └─ Busca: testTimeout
     └─ Aumenta de 10000 a 30000
     └─ Guarda y reintenta tests
  
  4. Ejecuta tests con output:
     $ npm test -- --reporter=verbose

═══════════════════════════════════════════════════════════════════════════════
🚨 PROBLEMA: "Cannot find module 'express'" or "Cannot find module..."
═══════════════════════════════════════════════════════════════════════════════

Síntoma:
  Error: Cannot find module 'express'
  O: Cannot find module 'zod'
  O: Cannot find module 'typescript'

Causa probable:
  • npm install no fue ejecutado
  • node_modules/ fue eliminado
  • Instalación incompleta

Solución:
  1. Reinstala todas las dependencias:
     $ cd /home/eevan/ProyectosIA/SIST_PIZZA/backend
     $ rm -rf node_modules package-lock.json
     $ npm install
     └─ Espera hasta completar (puede tomar 2-3 minutos)
  
  2. Verifica que está completo:
     $ npm list | head -10
     └─ Debe mostrar lista de paquetes
  
  3. Reintenta backend:
     $ npm run dev

═══════════════════════════════════════════════════════════════════════════════
🚨 PROBLEMA: Git error durante push
═══════════════════════════════════════════════════════════════════════════════

Síntoma:
  git push: error: Permission denied
  O: git push: error: 403 Forbidden

Causa probable:
  • Token GitHub expirado
  • SSH key no configurada
  • Rama incorrecta

Solución:
  1. Verifica rama:
     $ git status
     └─ Debe mostrar: "On branch main"
  
  2. Verifica remoto:
     $ git remote -v
     └─ Debe mostrar: origin con URL de GitHub
  
  3. Si necesitas push force:
     $ git push -u origin main
  
  4. Si falla por permisos:
     └─ Configura SSH key o token PAT
     └─ Sigue: https://docs.github.com/en/authentication

═══════════════════════════════════════════════════════════════════════════════
🆘 ¿MI PROBLEMA NO ESTÁ AQUÍ?
═══════════════════════════════════════════════════════════════════════════════

Si tu problema no aparece arriba:

1. Busca en:
   └─ docs/02-arquitectura/ARQUITECTURA_COMPLETA.md (Troubleshooting)
   └─ docs/04-testing/RUTA_TESTS_PLAN.md (Troubleshooting)
   └─ docs/05-deployment/RUTA_DOCKER_PLAN.md (Troubleshooting)

2. Revisa logs del backend:
   └─ Terminal con backend corriendo
   └─ Mira mensajes de error completos

3. Busca error en Google:
   └─ Copia el mensaje de error exacto
   └─ Pégalo en Google
   └─ Busca soluciones similares

4. Contacta al equipo:
   └─ Comparte: Error completo + contexto + qué intentabas hacer

═══════════════════════════════════════════════════════════════════════════════
