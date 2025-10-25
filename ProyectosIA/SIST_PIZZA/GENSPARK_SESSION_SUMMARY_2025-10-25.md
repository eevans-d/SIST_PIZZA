# GenSpark AI Session Summary (2025-10-25)

This document summarizes all work completed in this session and provides precise branch/PR info and run instructions so you can sync in VS Code with GitHub Copilot.

## Repository, Branches, and PR
- Repo (origin): https://github.com/eevans-d/SIST_PIZZA
- Working branch: `genspark_ai_developer`
- Base branch: `main`
- Pull Request: https://github.com/eevans-d/SIST_PIZZA/pull/2
  - Title: "Fase 2/3: métricas Prometheus, rate limit, endpoints públicos, migraciones y fixes Docker"
  - State: OPEN

## High-level Changes Delivered
1) Docker Compose and Frontend
- Frontend port mapping fixed: `5173:5173` (Vite default).
- Added exporters in compose:
  - `postgres-exporter` (quay.io/prometheuscommunity/postgres-exporter) on 9187
  - `redis-exporter` (oliver006/redis_exporter) on 9121
- Grafana exposed at `3001:3000`; Prometheus at `9090:9090`.

Paths:
- Compose: `ProyectosIA/SIST_PIZZA/docker-compose.yml`

2) Env normalization
- Standardized backend env to use `SUPABASE_SERVICE_ROLE_KEY` consistently (compose, `.env.example`, backend config).

Paths:
- `ProyectosIA/SIST_PIZZA/.env.example`
- `ProyectosIA/SIST_PIZZA/backend/.env.example`

3) Backend (Express + TS)
- Metrics:
  - Exposed `/metrics` using `prom-client` with `collectDefaultMetrics()` and default labels `{ app, version, commit }`.
  - HTTP middleware records requests with stable route labels to reduce cardinality; histogram buckets refined.
- Security & Limits:
  - `app.set('trust proxy', 1)` for accurate client IPs behind proxies.
  - Default body size limits: `1mb` for JSON and URL-encoded.
  - Rate limiting with `express-rate-limit`:
    - `apiLimiter` mounted at `/api/`.
    - `webhookLimiter` for webhook endpoint.
    - `exportLimiter` for CSV export endpoint.
  - Optional Redis-backed limiter store via `rate-limit-redis` + `ioredis` (auto-enabled if `REDIS_URL` present).
- Webhook HMAC:
  - Implemented HMAC verification for N8N (header `X-Signature`, `sha256` with `N8N_WEBHOOK_SECRET`).
  - Parser now captures `rawBody` and signature is computed over the exact raw body.
  - Exported helpers: `verifyHmacSignatureFromRaw` and `verifyHmacSignature` (compat for tests).

Paths:
- Metrics: `backend/src/services/metrics.ts`
- Server: `backend/src/server.ts`
- Rate limiters: `backend/src/middleware/rateLimiter.ts`
- Webhook: `backend/src/workflows/webhookN8N.ts`
- Pedidos (CSV export w/ rate limit): `backend/src/workflows/pedidos.ts`

4) Database Migrations (Supabase/Postgres)
- Added migration creating missing tables + RLS + triggers + seed:
  - `audit_logs`, `consent_records`, `support_tickets`, `payment_methods`, `profiles`, `zonas_entrega`, `dni_validations`.
  - FKs: `support_tickets.user_id` / `assigned_to` -> `profiles(id)` (ON DELETE SET NULL);
    `payment_methods.user_id` -> `profiles(id)` (ON DELETE CASCADE).
  - Triggers to update `updated_at`.
  - Seed data for `zonas_entrega`.

Path:
- `ProyectosIA/SIST_PIZZA/supabase/migrations/20250125000002_add_missing_tables.sql`

5) Observability stack
- Prometheus: Scrapes backend `/metrics` and the exporters. Added `instance` relabel for backend job.
- Grafana: Provisioned dashboards and enhanced Overview & Backend; added Node process dashboard.

Paths:
- Prometheus config: `ProyectosIA/SIST_PIZZA/monitoring/prometheus.yml`
- Grafana dashboards: `ProyectosIA/SIST_PIZZA/monitoring/grafana-provisioning/dashboards/definitions/*`
  - `sist-pizza-dashboard.json` (overview)
  - `backend.json`
  - `business.json`
  - `database.json`
  - `node_process.json` (new)

6) CI workflow (GitHub Actions)
- Authored CI workflow (lint, type-check, tests, docker build, npm audit) at
  `ProyectosIA/SIST_PIZZA/.github/workflows/ci.yml`.
- IMPORTANT: GitHub blocks creation/update of root `.github/workflows` via this App token.
  - Action: Create the same `ci.yml` under the repo root `.github/workflows/ci.yml` via GitHub UI.

7) Licensing
- Added MIT license at repository root `LICENSE`.

## Tests
- Backend Vitest tests expanded and all pass locally.
- Count: `43` tests passing.

New/updated tests include:
- `backend/src/__tests__/webhook_hmac.test.ts` (HMAC helper)
- `backend/src/__tests__/webhook_hmac_rawbody.test.ts` (rawBody-based signature)
- `backend/src/__tests__/export_rate_limit.test.ts` (export 429 contract)
- `backend/src/__tests__/ratelimit_endpoints.test.ts` (webhook/export 429 contracts)
- Existing CSV, filters, metrics presence, schema tests remain.

Test helpers:
- Supabase test fallbacks in config keep tests green without `.env`.

## How to run locally (quick start)
1) Backend tests
```
cd ProyectosIA/SIST_PIZZA/backend
npm install
npm test -- --run
```

2) Full stack via Docker Compose
```
cd ProyectosIA/SIST_PIZZA
docker compose up -d
```
Services/ports:
- Backend API: http://localhost:3000
- Frontend (Vite): http://localhost:5173
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3001
- Postgres Exporter: 9187, Redis Exporter: 9121

3) Dev server (backend)
```
cd ProyectosIA/SIST_PIZZA/backend
npm install
npm run dev
```
Environment (examples): see `backend/.env.example`
- Required: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- Optional: `REDIS_URL` enables Redis-backed rate limiting
- Server: `HOST=0.0.0.0`, `PORT=3000`, `ALLOWED_ORIGINS`

## Webhook HMAC details
- Header: `X-Signature`
- Algorithm: HMAC-SHA256 over the exact raw body string
- Secret: `N8N_WEBHOOK_SECRET`

## Rate limiting policies (current)
- API: `/api/` -> 100 req / 15 min (standard headers, 429 JSON)
- Webhook N8N: 30 req / min
- Export CSV: 5 req / min
- Optional Redis store used if `REDIS_URL` is defined

## Notes for VS Code + GitHub Copilot tomorrow
- Ensure you’re on the branch and synced:
```
git fetch origin
git checkout genspark_ai_developer
git pull --ff-only origin genspark_ai_developer
```
- To review the PR:
  - Open https://github.com/eevans-d/SIST_PIZZA/pull/2 in the browser, or use the GitHub VS Code extension.
- To enable CI:
  - Copy `ProyectosIA/SIST_PIZZA/.github/workflows/ci.yml` content and create the same file at repo root `.github/workflows/ci.yml` via GitHub UI (Settings may require enabling workflows).
- To run tests/dev:
  - See quick start above. Supabase env fallbacks keep Vitest green locally.

## Next steps (suggested)
- Add Grafana dashboard panels specific to Postgres/Redis exporters (locks, hit ratio, ops/sec, memory, keys).
- (Optional) Add integration tests exercising Redis-backed rate limiter.
- Tighten Helmet CSP and restrict CORS domains for production.
- Apply migrations to your target Supabase (Cloud) and validate RLS.

---
Generated by GenSpark AI on 2025-10-25.
