# SIST_PIZZA — Despliegue local rápido

Este documento resume cómo levantar el stack local (backend + Redis + PostgreSQL + Prometheus + Grafana) y verificar que todo responde.

## Requisitos
- Docker y Docker Compose
- Claves de Supabase (URL, ANON y SERVICE_ROLE) de tu proyecto

## 1) Configurar variables de entorno
Crea `backend/.env` a partir de `backend/.env.example` y completa al menos:

```
SUPABASE_URL=https://<tu-proyecto>.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
DB_ENCRYPTION_KEY=<clave-32-chars>
NODE_ENV=development
PORT=3000
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000
LOG_LEVEL=info
```

## 2) Desplegar stack
Desde la raíz del repo:

```
./scripts/deploy-local.sh
```

El script:
- Levanta Postgres y Redis, espera salud
- Levanta backend, Prometheus y Grafana
- Espera a que `/health` responda OK

## 3) Endpoints útiles
- Backend API: http://localhost:4000
  - Health: http://localhost:4000/health
  - Detalle: http://localhost:4000/api/health
  - Métricas: http://localhost:4000/metrics
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001  (user: admin, pass: `GRAFANA_PASSWORD` o `admin`)

## 4) Verificación rápida
```
./scripts/check-health.sh http://localhost:4000
```

## 5) Webhook de ejemplo
```
curl -X POST \
  http://localhost:4000/api/webhooks/n8n/pedido \
  -H "Content-Type: application/json" \
  -d '{
    "cliente": {"nombre": "Test User", "telefono": "+541112345679", "direccion": "Avenida Norte 456"},
    "items": [{"nombre": "Muzzarella", "cantidad": 1}],
    "notas": "sin aceitunas",
    "origen": "web"
  }'
```

Respuesta esperada: HTTP 200 con `pedido_id`, `total`, `subtotal`, `costo_envio`.

## 6) Apagar
```
docker compose down
```

## 7) Post-deploy check (opcional)
Ejecuta una verificación integral (health, api/health, metrics, webhook de ejemplo y targets de Prometheus):

```
./scripts/post-deploy-check.sh
```

Puedes pasar URLs alternativas si cambiaste puertos:

```
./scripts/post-deploy-check.sh http://localhost:4000 http://localhost:9090
```

## Notas
- Redis no expone puerto en el host; el backend se conecta por red interna del Compose.
- El backend se ejecuta en modo producción (`npm run start`) dentro del contenedor.
- Si `/health` no responde, inspecciona logs: `docker logs -f sist-pizza-backend`.
