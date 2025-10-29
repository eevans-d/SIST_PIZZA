# Arquitectura SIST_PIZZA (vista alta)

```mermaid
flowchart LR
    subgraph Clientes & Integraciones
      WA[WhatsApp/Cliente]
      N8N[N8N Flujos]
      CW[Chatwoot]
    end

    subgraph Backend
      BE[Express API\nNode.js + TypeScript]
      RL[Rate Limiter\nCSP/Headers]
    end

    subgraph Datos
      PG[(Postgres\nSupabase)]
      REDIS[(Redis Cache)]
    end

    subgraph Observabilidad
      PROM[Prometheus\n/metrics]
      GRAF[Grafana]
    end

    WA -- Mensaje --> N8N
    N8N -- POST /api/webhooks/n8n/pedido --> RL
    RL --> BE

    BE -- Health --> BE
    BE -- Queries --> PG
    BE -- Cache --> REDIS

    BE -- Exponer métricas --> PROM
    PROM --> GRAF

    CW -. futuros webhooks .-> RL

    classDef svc fill:#e7f5ff,stroke:#4dabf7,stroke-width:1px,color:#1c7ed6;
    classDef data fill:#fff4e6,stroke:#f59f00,stroke-width:1px,color:#e67700;
    classDef obs fill:#f3f0ff,stroke:#7950f2,stroke-width:1px,color:#5f3dc4;

    class BE,RL svc;
    class PG,REDIS data;
    class PROM,GRAF obs;
```

Notas rápidas:
- Backend expone: GET /health, GET /api/health y GET /metrics, más POST /api/webhooks/n8n/pedido.
- Seguridad básica: rate limit específico en ruta de webhooks y cabeceras de seguridad.
- Observabilidad: Prometheus scrapea el backend y Grafana consume esas series.
- Base de datos: Postgres/Supabase como fuente de verdad; Redis para cache simple.
