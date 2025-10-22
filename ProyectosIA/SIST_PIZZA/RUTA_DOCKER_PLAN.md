╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║         🐳 RUTA DOCKER - SETUP COMPLETO (4-5 HORAS)                        ║
║                                                                              ║
║         docker-compose con 6 servicios - Deployable a producción            ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
📦 SERVICIOS QUE CONFIGURAREMOS
═══════════════════════════════════════════════════════════════════════════════

1. PostgreSQL (BD local)
   └─ Puerto: 5432
   └─ User: pizza_user
   └─ Pass: pizza_password
   └─ DB: pizza_db

2. Redis (Cache + Message Queue)
   └─ Puerto: 6379
   └─ Sin autenticación (desarrollo)

3. WAHA (WhatsApp Web Automation)
   └─ Puerto: 3000
   └─ Para recibir/enviar mensajes WhatsApp
   └─ Conecta con N8N

4. N8N (Workflow Orchestration)
   └─ Puerto: 5678
   └─ Para procesar mensajes + llamar backend
   └─ Conecta con WAHA, Backend, Claude AI

5. Chatwoot (Customer Support CRM)
   └─ Puerto: 3000 (interno)
   └─ Base de datos propia
   └─ Para gestionar tickets de soporte

6. Backend (Node.js App)
   └─ Puerto: 4000
   └─ Conecta con PostgreSQL local
   └─ Procesa webhooks de N8N

═══════════════════════════════════════════════════════════════════════════════
⏱️ TIMELINE
═══════════════════════════════════════════════════════════════════════════════

Paso 1: docker-compose.yml        1 hora
Paso 2: Configuración .env        30 minutos
Paso 3: Dockerfile del backend    30 minutos
Paso 4: Health checks             30 minutos
Paso 5: Testing e2e               1 hora
Paso 6: Documentación deploy      30 minutos
─────────────────────────────────────────
TOTAL:                           4-5 horas

═══════════════════════════════════════════════════════════════════════════════
📊 ESTRUCTURA DE ARCHIVOS
═══════════════════════════════════════════════════════════════════════════════

docker-compose.yml          ← El archivo principal
.env.docker                 ← Variables de entorno
Dockerfile                  ← Para backend Node.js
docker/
├── postgres/
│   ├── Dockerfile          ← PostgreSQL customizado
│   └── init.sql            ← SQL inicial
├── redis/
│   └── redis.conf          ← Configuración Redis
├── waha/
│   └── docker-compose.yml  ← WAHA config
├── n8n/
│   ├── workflows.json      ← Workflows predefinidos
│   └── settings.json       ← Configuración N8N
└── chatwoot/
    └── docker-compose.yml  ← Chatwoot dependencias

SCRIPTS:
├── docker-build.sh         ← Build de imágenes
├── docker-start.sh         ← Iniciar servicios
├── docker-stop.sh          ← Detener servicios
└── docker-logs.sh          ← Ver logs

DOCUMENTACIÓN:
├── DOCKER_SETUP.md         ← Instrucciones completas
├── DOCKER_NETWORKING.md    ← Cómo se comunican servicios
└── DEPLOYMENT_GUIDE.md     ← Guía de producción

═══════════════════════════════════════════════════════════════════════════════
🏗️ ARQUITECTURA CON DOCKER
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────────────┐
│                         CONTENEDOR DOCKER                              │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                    DOCKER NETWORK                               │  │
│  │                   (sist-pizza-network)                          │  │
│  │                                                                  │  │
│  │  ┌─────────────┐  ┌──────────┐  ┌─────────┐  ┌──────────────┐ │  │
│  │  │ PostgreSQL  │  │  Redis   │  │  WAHA   │  │     N8N      │ │  │
│  │  │   :5432     │  │  :6379   │  │  :3000  │  │    :5678     │ │  │
│  │  │  pizza_db   │  │  Cache   │  │ WhatsApp│  │  Workflows   │ │  │
│  │  └──────┬──────┘  └────┬─────┘  └────┬────┘  └──────┬───────┘ │  │
│  │         │               │             │               │         │  │
│  │         └───────────────┼─────────────┼───────────────┘         │  │
│  │                         │             │                         │  │
│  │  ┌──────────────────────┴─────────────┴─────────────────────┐  │  │
│  │  │                   Backend (Node.js)                      │  │  │
│  │  │                      :4000                               │  │  │
│  │  │   (Conecta a todos: BD, Redis, recibe de N8N)           │  │  │
│  │  │                                                          │  │  │
│  │  │  POST /api/webhooks/n8n/pedido ←─ N8N                   │  │  │
│  │  │         ↓                                                │  │  │
│  │  │  Procesa pedido                                          │  │  │
│  │  │         ↓                                                │  │  │
│  │  │  Guarda en PostgreSQL                                    │  │  │
│  │  │         ↓                                                │  │  │
│  │  │  Respuesta JSON                                          │  │  │
│  │  └──────────────────────────────────────────────────────────┘  │  │
│  │                                                                  │  │
│  │  ┌─────────────────────────────────────────────────────────┐   │  │
│  │  │           Chatwoot (Soporte)                            │   │  │
│  │  │          :3000 (interno)                                │   │  │
│  │  │   (Integración futura con tickets/soporte)              │   │  │
│  │  └─────────────────────────────────────────────────────────┘   │  │
│  │                                                                  │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                         │
│  Puertos expuestos:                                                    │
│  - localhost:5432 ← PostgreSQL                                         │
│  - localhost:6379 ← Redis                                              │
│  - localhost:3000 ← WAHA                                               │
│  - localhost:5678 ← N8N                                                │
│  - localhost:4000 ← Backend                                            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
🚀 CÓMO USAR DOCKER
═══════════════════════════════════════════════════════════════════════════════

PREPARACIÓN (Primera vez - 10 min):

1. Instala Docker Desktop:
   https://www.docker.com/products/docker-desktop

2. Inicia Docker Desktop (desde Applications)

3. Verifica instalación:
   $ docker --version
   $ docker-compose --version

EJECUTAR SISTEMA (2 minutos):

1. Navega a proyecto:
   $ cd /home/eevan/ProyectosIA/SIST_PIZZA

2. Inicia todos los servicios:
   $ docker-compose up -d

3. Espera 30 segundos a que todo inicie

4. Verifica que están corriendo:
   $ docker-compose ps

   Deberías ver:
   NAME                      STATUS
   sist-pizza-db-1          Up 30s
   sist-pizza-redis-1       Up 30s
   sist-pizza-backend-1     Up 30s
   sist-pizza-waha-1        Up 30s
   sist-pizza-n8n-1         Up 30s

5. Prueba que funciona:
   $ curl http://localhost:4000/health

   Respuesta:
   {"status":"ok"}

DETENER (1 minuto):

$ docker-compose down

VER LOGS:

$ docker-compose logs -f backend
$ docker-compose logs -f n8n
$ docker-compose logs -f redis

═══════════════════════════════════════════════════════════════════════════════
📋 PASO A PASO - CREAR docker-compose.yml
═══════════════════════════════════════════════════════════════════════════════

El archivo docker-compose.yml contiene:

version: '3.9'

services:
  # 1. PostgreSQL
  db:
    image: postgres:15
    environment:
      POSTGRES_USER: pizza_user
      POSTGRES_PASSWORD: pizza_password
      POSTGRES_DB: pizza_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD", "pg_isready", "-U", "pizza_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 2. Redis
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 3. Backend Node.js
  backend:
    build: .
    ports:
      - "4000:4000"
    environment:
      DATABASE_URL: postgresql://pizza_user:pizza_password@db:5432/pizza_db
      SUPABASE_URL: ...  (tu URL)
      SUPABASE_KEY: ...  (tu key)
      REDIS_URL: redis://redis:6379
      NODE_ENV: development
    depends_on:
      - db
      - redis
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:4000/health"]
      interval: 10s
      timeout: 5s
      retries: 5

  # 4. WAHA (WhatsApp)
  waha:
    image: devlikeapro/waha:latest
    ports:
      - "3000:3000"
    environment:
      WAHA_WEBHOOK_URL: http://n8n:5678
    depends_on:
      - n8n

  # 5. N8N (Workflows)
  n8n:
    image: n8nio/n8n:latest
    ports:
      - "5678:5678"
    environment:
      DB_TYPE: postgres
      DB_HOST: db
      DB_NAME: pizza_db
      DB_USER: pizza_user
      DB_PASSWORD: pizza_password
      N8N_EDITOR_BASE_URL: http://localhost:5678
      N8N_INSTANCE_IP_ADDRESS: 0.0.0.0
    depends_on:
      - db

volumes:
  postgres_data:

networks:
  default:
    name: sist-pizza-network

═══════════════════════════════════════════════════════════════════════════════
✨ BENEFICIOS DE DOCKER
═══════════════════════════════════════════════════════════════════════════════

✅ Mismo ambiente en desarrollo que en producción
✅ No necesita instalar PostgreSQL, Redis, N8N manualmente
✅ Fácil de compartir (solo compartir docker-compose.yml)
✅ Escalable (agregar más backends, réplicas, etc)
✅ Limpio (todo en contenedores, no ensucia la máquina)
✅ Listo para CI/CD (GitHub Actions, GitLab, etc)

═══════════════════════════════════════════════════════════════════════════════
🎯 PRÓXIMAS FASES DESPUÉS DE DOCKER
═══════════════════════════════════════════════════════════════════════════════

1. Kubernetes (si necesitas escala masiva)
2. GitHub Actions (CI/CD automático)
3. Monitoreo (Prometheus + Grafana)
4. Alertas (Alertmanager)
5. Backups automáticos

═══════════════════════════════════════════════════════════════════════════════
💡 PRÓXIMO PASO
═══════════════════════════════════════════════════════════════════════════════

¿Quieres que comience con Docker setup? 🐳

Yo crearé:
1. docker-compose.yml (completo)
2. Dockerfile para backend
3. .env.docker (configuración)
4. DOCKER_SETUP.md (guía completa)
5. docker-start.sh y docker-stop.sh (scripts helper)

Resultado: Sistema Docker listo para:
- Desarrollo local
- Testing en containers
- Deployment a servidor
- Escalado horizontal

═══════════════════════════════════════════════════════════════════════════════
