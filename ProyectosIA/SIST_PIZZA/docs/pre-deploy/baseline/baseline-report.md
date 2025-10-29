# Baseline (lean) – SIST_PIZZA

Fecha: ${DATE}

## Alcance
- Objetivo: obtener una línea base rápida de latencia y éxito en endpoints críticos.
- Endpoints:
  - GET /health (N≈200)
  - GET /api/health (N≈50)
  - POST /api/webhooks/n8n/pedido (N≈20, con pacing para evitar rate limit)
- Ambiente: docker-compose local (backend en producción, puerto 4000).

## Cómo ejecutar
```
./scripts/baseline-run.sh             # BASE=http://localhost:4000, N_HEALTH=200, N_WEBHOOK=20
./scripts/baseline-run.sh http://localhost:4000 200 20
```
Salida:
- CSV: docs/pre-deploy/baseline/baseline.csv (timestamp_iso,endpoint,method,status,duration_ms)

## Supuestos
- Backend levantado (scripts/deploy-local.sh) y health OK.
- DB local con esquema y seeds mínimos para que el webhook cree pedidos.
- Rate limit para /api/webhooks/* ≈ 30 req/min; el script pacea llamadas.

## Resultados (placeholder)
- Registros totales: …
- Por endpoint:
  - /health → n=…, avg=… ms, p50=… ms, p95=… ms, 2xx=…%
  - /api/health → n=…, avg=… ms, p50=… ms, p95=… ms, 2xx=…%
  - /api/webhooks/n8n/pedido → n=…, avg=… ms, p50=… ms, p95=… ms, 2xx=…%

## Observaciones (placeholder)
- …

## Criterios de aceptación (Fase 0 lean)
- Se genera `docs/pre-deploy/baseline/baseline.csv` con ≥ 200 mediciones totales.
- Webhook devuelve `success=true` en ≥ 95% de llamadas (no contando 429 por rate limit).
- Sin errores 5xx en health ni webhook.

## Próximos pasos
- Integrar cálculo de percentiles en el script (awk) o dashboard rápido en Grafana.
- Activar gates de CI (lint, types, seguridad) antes de pruebas más intensivas.
