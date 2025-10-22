╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                  ⚡ SIST_PIZZA - COMANDOS RÁPIDOS (CHEAT SHEET)             ║
║                                                                              ║
║                       Copy-paste listos para ejecutar                        ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
🚀 PREPARACIÓN
═══════════════════════════════════════════════════════════════════════════════

Ir a proyecto:
$ cd /home/eevan/ProyectosIA/SIST_PIZZA

Verficar Node.js:
$ node --version && npm --version

Entrar a backend:
$ cd backend

Instalar dependencias:
$ npm install

═══════════════════════════════════════════════════════════════════════════════
🌐 BACKEND
═══════════════════════════════════════════════════════════════════════════════

Iniciar backend (development):
$ npm run dev

Iniciar backend (production):
$ npm run build && npm start

Build TypeScript:
$ npm run build

Verificar errores TypeScript:
$ npx tsc --noEmit

═══════════════════════════════════════════════════════════════════════════════
🧪 TESTING
═══════════════════════════════════════════════════════════════════════════════

Ejecutar todos los tests:
$ npm test

Ejecutar tests con coverage:
$ npm test -- --coverage

Ejecutar tests con modo watch:
$ npm test -- --watch

Ejecutar un test específico:
$ npm test -- health.test.ts

Ver coverage en HTML:
$ firefox coverage/index.html
$ google-chrome coverage/index.html

═══════════════════════════════════════════════════════════════════════════════
❤️  HEALTH CHECKS
═══════════════════════════════════════════════════════════════════════════════

Health check simple (sin BD):
$ curl http://localhost:4000/health | jq .

Health check completo:
$ curl http://localhost:4000/api/health | jq .

Health check con BD verification:
$ curl http://localhost:4000/api/health/ready | jq .

═══════════════════════════════════════════════════════════════════════════════
🪝 WEBHOOK TESTING
═══════════════════════════════════════════════════════════════════════════════

Webhook básico (happy path):
$ curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {
      "nombre": "Test User",
      "telefono": "+541112345678"
    },
    "items": [
      {
        "nombre": "Pizza Grande Muzzarella",
        "cantidad": 1,
        "precio": 500
      }
    ],
    "direccion_entrega": "Calle Centro 123",
    "tipo_entrega": "domicilio"
  }' | jq .

Webhook con zona norte (envío $500):
$ curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {"nombre":"Test Norte","telefono":"+541112345679"},
    "items": [{"nombre":"Pizza Grande Especial","cantidad":1,"precio":800}],
    "direccion_entrega": "Avenida Norte 456",
    "tipo_entrega": "domicilio"
  }' | jq .

Webhook con error de validación (items vacío):
$ curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {"nombre":"Test","telefono":"+541112345680"},
    "items": [],
    "direccion_entrega": "Calle Test",
    "tipo_entrega": "domicilio"
  }' | jq .

Webhook con producto no encontrado:
$ curl -X POST http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {"nombre":"Test","telefono":"+541112345681"},
    "items": [{"nombre":"PRODUCTO INEXISTENTE","cantidad":1,"precio":100}],
    "direccion_entrega": "Calle Test",
    "tipo_entrega": "domicilio"
  }' | jq .

═══════════════════════════════════════════════════════════════════════════════
🗄️  SUPABASE / SQL
═══════════════════════════════════════════════════════════════════════════════

Abrir SQL Editor en Supabase:
$ firefox "https://supabase.com/dashboard/project/htvlwhisjpdagqkqnpxg/sql/new"

Abrir Table Editor en Supabase:
$ firefox "https://supabase.com/dashboard/project/htvlwhisjpdagqkqnpxg/editor"

Verificar conexión a Supabase (con curl):
$ curl -H "Authorization: Bearer YOUR_KEY" \
  https://htvlwhisjpdagqkqnpxg.supabase.co/rest/v1/clientes?limit=1 | jq .

═══════════════════════════════════════════════════════════════════════════════
🔧 DEBUGGING
═══════════════════════════════════════════════════════════════════════════════

Ver logs del backend (tiempo real):
$ npm run dev 2>&1 | tee backend.log

Filtrar solo errores:
$ npm run dev 2>&1 | grep -i error

Ver últimas 20 líneas de backend:
$ tail -20 backend.log

Buscar palabra en logs:
$ grep "database" backend.log

Monitorear puerto 4000:
$ lsof -i :4000

Mata proceso en puerto 4000:
$ pkill -f "npm run dev"

═══════════════════════════════════════════════════════════════════════════════
📂 GIT OPERATIONS
═══════════════════════════════════════════════════════════════════════════════

Ver estado actual:
$ git status

Ver últimos commits:
$ git log --oneline -10

Agregar cambios:
$ git add .

Commit con mensaje:
$ git commit -m "tu mensaje aquí"

Push a main:
$ git push -u origin main

Pull últimos cambios:
$ git pull

Ver diferencias:
$ git diff

Ver cambios staged:
$ git diff --cached

═══════════════════════════════════════════════════════════════════════════════
🐳 DOCKER (SI NECESARIO)
═══════════════════════════════════════════════════════════════════════════════

Build imagen:
$ docker build -t sist-pizza-backend .

Listar imágenes:
$ docker images

Ejecutar docker-compose:
$ docker-compose up

Ejecutar docker-compose en background:
$ docker-compose up -d

Detener docker-compose:
$ docker-compose down

Ver logs de docker:
$ docker-compose logs -f

═══════════════════════════════════════════════════════════════════════════════
📊 ESTADÍSTICAS
═══════════════════════════════════════════════════════════════════════════════

Contar líneas de código (backend):
$ find backend/src -name "*.ts" | xargs wc -l

Ver estructura de carpetas:
$ tree -L 3 backend/src

Contar archivos:
$ find backend -name "*.ts" | wc -l

═══════════════════════════════════════════════════════════════════════════════
⚙️  CONFIGURACIÓN
═══════════════════════════════════════════════════════════════════════════════

Editar .env del backend:
$ nano backend/.env

Ver variables de .env:
$ grep -E "SUPABASE|DATABASE" backend/.env

Validar JSON en archivo:
$ cat archivo.json | jq .

═══════════════════════════════════════════════════════════════════════════════
🎯 WORKFLOW RÁPIDO
═══════════════════════════════════════════════════════════════════════════════

Ejecutar TODO en secuencia:
1. Instalar:   $ cd backend && npm install
2. Iniciar:    $ npm run dev
3. Tests:      $ npm test
4. Coverage:   $ npm test -- --coverage
5. Webhooks:   $ curl -X POST http://localhost:4000/api/webhooks/n8n/pedido ...

Limpiar y reiniciar:
$ pkill -f "npm run dev" && \
  cd backend && \
  rm -rf node_modules && \
  npm install && \
  npm run dev

═══════════════════════════════════════════════════════════════════════════════
💡 TIPS ÚTILES
═══════════════════════════════════════════════════════════════════════════════

Usar jq para pretty-print JSON:
$ curl <url> | jq .

Pipe entre comandos:
$ curl <url> | jq '.status'

Ejecutar comando en background:
$ comando &

Ver todos los procesos Node:
$ ps aux | grep node

Agregar alias rápido (bash):
$ alias backend='cd /home/eevan/ProyectosIA/SIST_PIZZA/backend'
$ alias test='npm test'

═══════════════════════════════════════════════════════════════════════════════
🚨 EMERGENCIA
═══════════════════════════════════════════════════════════════════════════════

Si todo está roto:

1. Para backend:
   $ pkill -f "npm run dev"

2. Limpia:
   $ cd backend && rm -rf node_modules dist coverage

3. Reinstala:
   $ npm install

4. Reinicia:
   $ npm run dev

5. Verifica:
   $ curl http://localhost:4000/health

═══════════════════════════════════════════════════════════════════════════════
