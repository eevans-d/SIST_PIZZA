# FASE 4: Integraciones (Prompts 25-30)

## Descripción
Conectar APIs externas y completar workflows:
- Validación de DNI (Prompt 25)
- Generación de reportes (Prompt 26)
- Escalamientos de soporte (Prompt 27)
- Enrutamiento de entregas (Prompt 28)
- Dashboard administrativo (Prompt 29)
- Analytics en tiempo real (Prompt 30)

## Arquitectura

```
backend/src/
├── integrations/
│   ├── afip.ts (Prompt 25: DNI validation)
│   ├── reports.ts (Prompt 26: PDF/Excel exports)
│   └── maps.ts (Prompt 28: Google Maps routing)
├── pages/
│   ├── admin/
│   │   ├── Dashboard.tsx (Prompt 29: Admin view)
│   │   ├── Analytics.tsx (Prompt 30: Real-time stats)
│   │   └── Reports.tsx (Prompt 26: Download data)
│   └── customer/
│       ├── Order.tsx (Customer view)
│       └── Tracking.tsx (Delivery tracking)
└── routes/
    ├── admin.ts (Admin endpoints)
    └── analytics.ts (Real-time metrics)
```

## Prompts Implementar

### Prompt 25: Validación de DNI (AFIP)
- Validar DNI/CUIT contra AFIP
- Caching de búsquedas (24 horas)
- Rate limiting (1 req/2s)
- Almacenar datos validados

### Prompt 26: Generación de Reportes
- Exportar pedidos a PDF/Excel
- Filtros: fecha, cliente, estado
- Incluir totales y estadísticas
- Compresión automática

### Prompt 27: Escalamientos de Soporte
- Sistema de tickets
- Reenvío a Chatwoot si no resuelve
- Auditoría de resoluciones
- SLA tracking

### Prompt 28: Enrutamiento de Entregas
- Google Maps API integration
- Cálculo de rutas óptimas
- Estimaciones de tiempo real
- Soporte para múltiples repartidores

### Prompt 29: Dashboard Administrativo
- Vista de todas las comandas
- KPIs: velocidad promedio, satisfacción
- Gráficos de estado
- Filtros avanzados

### Prompt 30: Analytics en Tiempo Real
- Métricas por hora/día
- Ingresos acumulados
- Items populares
- Zonas con más demanda

## Checklist

- [ ] Prompt 25: AFIP DNI validation service
- [ ] Prompt 26: Reports export system
- [ ] Prompt 27: Support ticket escalation
- [ ] Prompt 28: Delivery routing service
- [ ] Prompt 29: Admin dashboard page
- [ ] Prompt 30: Real-time analytics page
- [ ] Testing y validación
- [ ] Documentación
- [ ] Commit: "feat(fase4): Integraciones completas"

## Estimación
- Backend services: 120 líneas × 6 = 720 líneas
- Frontend pages: 200 líneas × 2 = 400 líneas
- Total: ~1120 líneas TypeScript
- Tiempo estimado: 2-3 horas
