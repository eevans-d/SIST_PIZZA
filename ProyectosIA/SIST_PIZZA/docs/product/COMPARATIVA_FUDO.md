# Comparativa con Fudo: paridad funcional y experiencia de uso

Fecha: 2025-10-30
Estado del repo: main (Fase 0 baseline completada, Fase 1 CI gates activos)

---

## 1) Resumen ejecutivo

Objetivo: alinear el producto a un POS/gestión gastronómica al estilo Fudo, priorizando:
- Operación de mostrador ágil (venta en 2–3 acciones)
- Flujo de cocina fluido (KDS/comandas)
- Caja confiable (apertura/cierre, movimientos, conciliación)
- Simplicidad e intuición en la UI (aprendizaje en minutos)
- Observabilidad y calidad continua (CI, métricas, baseline)

Este documento define una matriz de paridad, principios de UX a replicar y un roadmap por fases con criterios de aceptación y KPIs.

---

## 2) Principios de UX a replicar (intuitivo, simple y ágil)

- Cero fricción en tareas críticas:
  - Nueva venta en 1 clic desde el home del POS; cobro en ≤ 2 pasos; atajos de teclado.
  - Búsqueda omnipresente de productos/clientes (fuzzy, acentos, código, SKU).
- Consistencia y señalización clara:
  - Tipografía y color semánticos; estados vacíos explícitos; confirmaciones no intrusivas.
- Prevención de errores y deshacer rápido:
  - Validaciones en-linea; límites de cantidad; deshacer (undo) en notificaciones.
- Velocidad percibida:
  - Optimizaciones UI (prefetch, cache leve), feedback inmediato (skeletons/spinners breves), sin bloqueos largos.
- Atajos y productividad:
  - Shortcuts (ej.: N nueva venta, F buscar, + cantidad); foco controlado con teclado.
- Offline-first razonable (progresivo):
  - Cache local de sesión de venta; reconexión transparente; cola de sincronización.
- Diseño progresivo (progressive disclosure):
  - Empezar simple y revelar opciones avanzadas bajo demanda (modales/subsecciones).

---

## 3) Matriz de paridad funcional (estado actual vs. objetivo)

| Módulo | Estado actual (repo) | Gap principal | Prioridad | Entregables clave |
|---|---|---|---|---|
| POS mostrador (venta, cobro) | Frontend base React, sin pantalla POS | Pantalla POS, carrito, medios de pago, descuentos | Alta | `POS UI`, atajos, validaciones, recibo simple |
| KDS / Comandas | No implementado | Vista cocina y ruteo de comandas | Alta | `KDS UI`, colas por sector, estados |
| Delivery/Takeaway | Webhook n8n → backend OK | UI operativa (asignación, estados, ETAs) | Alta | Tablero delivery, filtros, notificaciones |
| Menú/Catálogo | Endpoints básicos; schema en progreso | UI CRUD de productos, variantes, combos | Media | ABM productos, categorías, stock visible |
| Promos/Precios | No implementado | Reglas de promo, cupones | Media | Motor reglas simple, UI de promociones |
| Caja/Arqueos | No implementado | Apertura/cierre, movimientos, conciliación | Alta | Endpoints caja, UI arqueo, reportes diarios |
| Inventario/Recetas/COGS | No implementado | Modelo insumos/recetas, rebajas | Media | Recetas, rebaja por venta, merma |
| Clientes/CRM | No implementado (base Zod) | Altas/bajas, historial, fidelización básico | Media | ABM clientes, notas, tags |
| Reportes operativos | Métricas técnicas OK | Reportes de venta/productividad | Media | Ventas por hora, canal, mozo |
| Integraciones pago | Modo base (servicio) | UI cobro, conciliación | Alta | Mercado Pago/Modo UI, callbacks |
| Impresión Tickets/Comandas | No implementado | Integración no fiscal (1ra etapa) | Media | Spooler local, plantillas |
| Multisucursal y RBAC | No implementado | Jerarquía sede/roles/permisos | Media | Roles, scoping por sede |
| Offline-first | No implementado | Cache venta, cola sync, conflictos | Media | Service worker, reconciliación |
| Seguridad/compliance | Headers, rate-limit, Zod, audit CI | GDPR/Ley 25.326, auditoría acceso | Alta | DPA, logs PIIs redactados, revisiones |
| Observabilidad | /metrics, Prometheus, Grafana | Dashboards negocio, alertas | Media | Dashboards ventas y tiempos |

Notas:
- “Alta” se centra en caja diaria, venta/cobro y entrega a cocina/delivery porque impacta operación.
- Empezamos con impresora no fiscal; fiscal/AFIP puede venir en una etapa posterior.

---

## 4) Roadmap por fases (entregables y criterios de aceptación)

Fase A — POS + KDS mínimo (2–3 semanas)
- POS básico: catálogo, búsqueda, carrito, cobro (simulado), descuentos simples.
- KDS: tablero por sector (pizzería/cocina), estados (pendiente/en preparación/listo).
- Criterios de aceptación:
  - Venta completa en ≤ 3 acciones; P95 interacción < 200 ms; errores validación in-line.
  - Comanda aparece en KDS < 1s tras confirmación de pedido.

Fase B — Caja/Arqueos (1–2 semanas)
- Apertura/cierre; ingresos/egresos; conciliación; reporte diario (PDF/CSV simple).
- CA: No se permite venta con caja cerrada; arqueo final cuadra ± tolerancia configurable.

Fase C — Integraciones de pago + Tickets (2–3 semanas)
- Flujo Mercado Pago/Modo; impresión de ticket (no fiscal) y comanda local.
- CA: Pago aprobado/pendiente/rechazado reflejado en POS; ticket impreso consistente.

Fase D — Catálogo avanzado + Promos (2 semanas)
- Variantes, combos, precios por tamaño; promos por regla simple (2x1, % off).
- CA: Reglas aplicadas correctamente; UI clara sin confundir al cajero.

Fase E — Inventario/Recetas (3 semanas)
- Modelo de insumos/recetas, rebaja automática, mermas.
- CA: COGS básico y stock no negativo salvo override con permiso.

Fase F — Multisucursal + RBAC (3 semanas)
- Scoping por sede; roles (cajero, mozo, cocina, gerente, admin) y permisos.
- CA: Datos aislados por sede; acciones restringidas según rol.

Fase G — Offline-first + Reporting (3–4 semanas)
- Cache de venta y sync; paneles de ventas por hora/canal, productividad.
- CA: Continuidad de venta sin Internet; sync consistente; dashboards operativos.

---

## 5) KPIs y SLAs (medibles)

- UX/Velocidad
  - P95 latencia de acciones POS < 200 ms; render inicial POS < 1 s (cold) / < 400 ms (warm)
  - Venta completa (add → cobrar) en ≤ 10 s incluso con catálogo 500+ items
- Estabilidad
  - Error rate UI < 0.5%; errores backend 5xx < 0.1%
- Disponibilidad
  - 99.5% mínimo (local + cloud futura)
- Calidad/CI
  - Lint/typecheck 100% verdes; cobertura backend ≥ 60% al cerrar Fase B; ≥ 75% al cerrar Fase E
- Operación
  - Diferencia arqueo vs sistema ≤ 0.3% (sin considerar efectivo faltante por caja)

---

## 6) Quick wins inmediatos en este repo

Frontend
- Crear `POSPage` con: buscador, lista productos, carrito, cobro simulado y atajos de teclado.
- `KDSPage` simple por sector con estados y filtros.

Backend
- Endpoints caja: `POST /api/caja/apertura`, `POST /api/caja/cierre`, `POST /api/caja/movimientos`.
- Endpoints POS: `POST /api/ventas`, `GET /api/ventas/:id`, `POST /api/comandas`.

QA/CI
- Fase 2: habilitar tests bloqueantes + cobertura mínima (60%) en backend.
- Checks de performance básicos en CI (smoke de endpoints críticos con thresholds).

---

## 7) Riesgos y mitigación

- Complejidad de impresoras/fiscal: empezar no fiscal; AFIP luego (módulo aislado).
- UX sobrecargada: progressive disclosure, defaults sensatos, research con 2–3 usuarios.
- Offline tricky: empezar con cache de venta y sync unidireccional; conflicto resuelto por roles.
- Integraciones pago: sandbox primero, callbacks resilientes y reintentos idempotentes.

---

## 8) Definición de Done (por fase)

- Funcionalidad cubierta con pruebas (unitarias/e2e mínimas) y docs de uso.
- CI verde: lint/typecheck, audit, tests, cobertura ≥ umbral.
- Métricas: dashboards operativos actualizados (cuando aplique) y baseline re-ejecutado.

---

Referencias del repo
- `docs/architecture/diagram.md` — Diagrama actual
- `scripts/baseline-run.sh` y `docs/pre-deploy/baseline/baseline.csv` — Baseline Fase 0
- `.github/workflows/ci.yml` — Gates Fase 1
- `openapi.yaml` — Especificación API (base)
