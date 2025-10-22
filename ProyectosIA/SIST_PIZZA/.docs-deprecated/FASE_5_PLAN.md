# FASE 5: DevOps & Deployment (Prompts 31-40)

## Descripción
Configurar CI/CD, monitoreo y despliegue:
- GitHub Actions CI/CD (Prompts 31-32)
- Docker & Kubernetes (Prompts 33-34)
- Monitoreo y alertas (Prompts 35-36)
- Seguridad & compliance (Prompts 37-38)
- Escalamiento automático (Prompts 39-40)

## Arquitectura

```
.github/workflows/
├── ci.yml (Prompt 31: Tests + lint)
├── cd.yml (Prompt 32: Auto-deploy)
└── security.yml (Prompt 37: SAST checks)

docker/
├── Dockerfile.backend (Prompt 33)
├── Dockerfile.frontend (Prompt 33)
└── docker-compose.yml (Prompt 34)

k8s/
├── backend-deployment.yaml
├── frontend-deployment.yaml
├── postgresql-statefulset.yaml
└── ingress.yaml

monitoring/
├── prometheus.yml (Metrics)
├── alertmanager.yml (Alerts)
└── grafana-dashboards/
    ├── backend-metrics.json
    ├── frontend-performance.json
    └── business-metrics.json
```

## Prompts Implementar

### Prompt 31: CI/CD GitHub Actions - Tests
- Ejecutar tests en cada PR
- Coverage mínimo 70%
- Linting con ESLint
- Type checking con TypeScript

### Prompt 32: CD GitHub Actions - Deploy
- Build automático de imágenes Docker
- Push a Docker Hub/AWS ECR
- Deploy a Kubernetes
- Rollback automático si hay errores

### Prompt 33: Docker - Backend & Frontend
- Multi-stage builds (optimización)
- Non-root user (seguridad)
- Health checks
- Logs a stdout

### Prompt 34: Docker Compose - Stack local
- Servicios: backend, frontend, postgres, redis
- Volúmenes para desarrollo
- Networks aisladas
- Secretos en .env

### Prompt 35: Monitoreo - Prometheus & Grafana
- Métricas HTTP (latencia, errores)
- Métricas DB (queries, conexiones)
- Custom metrics (comandas/min, ingresos)
- Dashboards Grafana

### Prompt 36: Alertas - AlertManager
- PagerDuty/Slack integrations
- Alertas: errores > 5/min, latencia > 1s
- SLA de respuesta
- Post-mortems automáticos

### Prompt 37: Seguridad - SAST & DAST
- Snyk para vulnerabilidades
- OWASP ZAP para ataques web
- GitHub Advanced Security
- Auditoría de dependencias

### Prompt 38: Compliance - Ley 25.326 & GDPR
- Cifrado en tránsito (TLS 1.3+)
- Cifrado en reposo (AES-256)
- Right to be forgotten (GDPR)
- Data retention policies

### Prompt 39: Escalamiento Automático - HPA
- Kubernetes HPA basado en CPU/memoria
- Min 2 replicas, máx 10
- Métricas custom (requests/s)
- Pod disruption budgets

### Prompt 40: Disaster Recovery & Backup
- Backups automáticos Postgres (diarios)
- Replicación cross-region
- RTO: 1 hora, RPO: 15 minutos
- Pruebas mensuales de restauración

## Checklist

### CI/CD
- [ ] Prompt 31: GitHub Actions tests workflow
- [ ] Prompt 32: GitHub Actions deploy workflow
- [ ] Coverage reports integrados
- [ ] Slack notifications

### Docker & K8s
- [ ] Prompt 33: Dockerfiles optimizados
- [ ] Prompt 34: Docker Compose stack completo
- [ ] K8s manifests (deployment, service, ingress)
- [ ] ArgoCD para GitOps

### Monitoreo & Alertas
- [ ] Prompt 35: Prometheus + Grafana stack
- [ ] Prometheus scrape configs
- [ ] Grafana dashboards (3+)
- [ ] Prompt 36: AlertManager + Slack/PagerDuty

### Seguridad
- [ ] Prompt 37: SAST/DAST automatizado
- [ ] Snyk integration
- [ ] GitHub Advanced Security habilitado
- [ ] Prompt 38: Compliance checklist

### Escalamiento & DR
- [ ] Prompt 39: HPA políticas
- [ ] Load testing
- [ ] Prompt 40: Backup & restore procedures
- [ ] Runbooks de incident response

### Testing Final
- [ ] Smoke tests en prod
- [ ] Performance baselines
- [ ] Chaos engineering
- [ ] Documentation

## Estimación
- CI/CD workflows: ~300 líneas YAML
- Dockerfiles: ~150 líneas
- K8s manifests: ~200 líneas
- Monitoring: ~400 líneas (Prometheus + Grafana)
- Compliance: ~100 líneas
- Total: ~1150 líneas
- Tiempo estimado: 3-4 horas

## Estado Actual
✅ FASES 1-3 COMPLETADAS
⏳ FASE 4: Integraciones (próxima)
⏳ FASE 5: DevOps (final)
