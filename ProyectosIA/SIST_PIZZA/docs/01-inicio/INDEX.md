╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║                 🎯 SIST_PIZZA - ÍNDICE UNIFICADO DE NAVEGACIÓN              ║
║                                                                              ║
║                           PUNTO DE ENTRADA ÚNICO                             ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

═══════════════════════════════════════════════════════════════════════════════
🚀 EMPIEZA AQUÍ
═══════════════════════════════════════════════════════════════════════════════

1. Si NECESITAS ENTENDER EL PROYECTO:
   └─→ LEE: MASTER_BLUEPRINT.md (este archivo está aquí en raíz)

2. Si NECESITAS EJECUTAR SQL:
   └─→ LEE: docs/03-setup-sql/EJECUTAR_SQL_AHORA.md

3. Si NECESITAS CORRER TESTS:
   └─→ LEE: docs/04-testing/RUTA_TESTS_PLAN.md

4. Si NECESITAS SETUPEAR DOCKER:
   └─→ LEE: docs/05-deployment/RUTA_DOCKER_PLAN.md

5. Si TIENES UN PROBLEMA:
   └─→ LEE: docs/06-referencias/TROUBLESHOOTING.md

═══════════════════════════════════════════════════════════════════════════════
📚 ESTRUCTURA DOCUMENTACIÓN (NUEVA)
═══════════════════════════════════════════════════════════════════════════════

docs/
├── 01-inicio/
│   ├── INDEX.md                          ← TÚ ESTÁS AQUÍ
│   ├── QUICK_START.md                    ← Inicio rápido (5 min)
│   └── ROLES.md                          ← Guía por rol (Dev/DevOps/QA/PM)
│
├── 02-arquitectura/
│   ├── ARQUITECTURA_COMPLETA.md          ← Diseño técnico completo
│   ├── E2E_FLOWS.md                      ← Flujos end-to-end
│   ├── openapi.yaml                      ← Especificación API
│   └── DECISIONES_TECNICAS.md            ← Why we chose what
│
├── 03-setup-sql/
│   ├── EJECUTAR_SQL_AHORA.md             ← Guía copy-paste (11 min)
│   ├── PASO_2_SCHEMA_SQL.txt             ← SQL schema tables
│   ├── PASO_3_SEED_DATA_SQL.txt          ← SQL test data
│   ├── CREAR_ZONAS_ENTREGA.sql           ← Dynamic pricing setup
│   └── SQL_REFERENCIA.md                 ← Schema reference
│
├── 04-testing/
│   ├── RUTA_TESTS_PLAN.md                ← Plan de tests (5 min)
│   ├── INTEGRACIÓN_E2E_TESTING.md        ← Ejemplos curl
│   └── test-examples/                    ← Carpeta con ejemplos
│       ├── curl-happy-path.sh
│       ├── curl-validation-error.sh
│       └── curl-product-notfound.sh
│
├── 05-deployment/
│   ├── RUTA_DOCKER_PLAN.md               ← Docker setup (4-5h)
│   ├── docker-compose.yml                ← Docker compose
│   ├── Dockerfile                        ← Backend image
│   ├── KUBERNETES_PLAN.md                ← K8s deployment
│   └── TROUBLESHOOTING.md                ← Deployment issues
│
└── 06-referencias/
    ├── TROUBLESHOOTING.md                ← Soluciones centralizadas
    ├── COMANDOS_RAPIDOS.md               ← Cheat sheet
    ├── GLOSARIO.md                       ← Definiciones
    └── RECURSOS.md                       ← Links útiles

═══════════════════════════════════════════════════════════════════════════════
🎯 MAPEO RÁPIDO: NECESITO... ENTONCES LEO...
═══════════════════════════════════════════════════════════════════════════════

Necesito:                                 Leo archivo:
─────────────────────────────────────────────────────────────────────────────
Entender todo el proyecto                 MASTER_BLUEPRINT.md
Comenzar en 5 minutos                     docs/01-inicio/QUICK_START.md
Saber qué hacer según mi rol              docs/01-inicio/ROLES.md
Ejecutar SQL                              docs/03-setup-sql/EJECUTAR_SQL_AHORA.md
Correr tests                              docs/04-testing/RUTA_TESTS_PLAN.md
Probar webhook E2E                        docs/04-testing/INTEGRACIÓN_E2E_TESTING.md
Setup Docker                              docs/05-deployment/RUTA_DOCKER_PLAN.md
Desplegar a Kubernetes                    docs/05-deployment/KUBERNETES_PLAN.md
Solucionar un problema                    docs/06-referencias/TROUBLESHOOTING.md
Ver comandos quick                        docs/06-referencias/COMANDOS_RAPIDOS.md
Ver glosario de términos                  docs/06-referencias/GLOSARIO.md
Entender arquitectura                     docs/02-arquitectura/ARQUITECTURA_COMPLETA.md
Ver flujos E2E                            docs/02-arquitectura/E2E_FLOWS.md
Ver API specification                     docs/02-arquitectura/openapi.yaml
Entender decisiones técnicas              docs/02-arquitectura/DECISIONES_TECNICAS.md
Ver ejemplos curl                         docs/04-testing/test-examples/
─────────────────────────────────────────────────────────────────────────────

═══════════════════════════════════════════════════════════════════════════════
⏱️  RUTAS DE EJECUCIÓN (CHOOSE ONE)
═══════════════════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│ ⚡ RUTA 1: MVP (20 minutos)                                 │
├─────────────────────────────────────────────────────────────┤
│ 1. Ejecutar SQL (11 min)                                    │
│    → docs/03-setup-sql/EJECUTAR_SQL_AHORA.md              │
│                                                             │
│ 2. Validar setup (2 min)                                    │
│    → Healthchecks & backend running                        │
│                                                             │
│ 3. Probar webhook (5 min)                                   │
│    → Crear 1 pedido de prueba                              │
│                                                             │
│ Resultado: Sistema MVP funcional ✅                        │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ⚙️  RUTA 2: ÁGIL (1.5 horas)                               │
├─────────────────────────────────────────────────────────────┤
│ 1. RUTA 1 completada (20 min)                              │
│                                                             │
│ 2. Ejecutar tests (5 min)                                   │
│    → docs/04-testing/RUTA_TESTS_PLAN.md                   │
│                                                             │
│ 3. Probar E2E completo (30 min)                            │
│    → docs/04-testing/INTEGRACIÓN_E2E_TESTING.md           │
│                                                             │
│ 4. Revisar arquitectura (10 min)                           │
│    → docs/02-arquitectura/                                │
│                                                             │
│ Resultado: Sistema validado & testeado ✅                 │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ 🚀 RUTA 3: PRODUCCIÓN (8-10 horas)                         │
├─────────────────────────────────────────────────────────────┤
│ 1. RUTA 2 completada (1.5 horas)                           │
│                                                             │
│ 2. Docker setup (4-5 horas)                                │
│    → docs/05-deployment/RUTA_DOCKER_PLAN.md               │
│                                                             │
│ 3. Kubernetes prep (1-2 horas)                             │
│    → docs/05-deployment/KUBERNETES_PLAN.md                │
│                                                             │
│ 4. Validación end-to-end (30 min)                          │
│                                                             │
│ Resultado: Sistema production-ready containerizado 🚀      │
└─────────────────────────────────────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════
👥 GUÍA POR ROL
═══════════════════════════════════════════════════════════════════════════════

🔹 SI ERES PRODUCT MANAGER:
   1. Lee: MASTER_BLUEPRINT.md (sección Resumen Ejecutivo)
   2. Lee: docs/01-inicio/ROLES.md
   3. Lee: docs/02-arquitectura/E2E_FLOWS.md (flujos de negocio)
   4. Pregunta: ¿Cuál ruta ejecutamos? (MVP/Ágil/Producción)

🔹 SI ERES BACKEND DEVELOPER:
   1. Lee: MASTER_BLUEPRINT.md (completo)
   2. Lee: docs/02-arquitectura/ARQUITECTURA_COMPLETA.md
   3. Lee: docs/02-arquitectura/openapi.yaml
   4. Ejecuta: docs/03-setup-sql/EJECUTAR_SQL_AHORA.md
   5. Ejecuta: docs/04-testing/RUTA_TESTS_PLAN.md
   6. Código: /backend/src/ (modifica según necesidad)

🔹 SI ERES DEVOPS/SRE:
   1. Lee: MASTER_BLUEPRINT.md
   2. Lee: docs/05-deployment/RUTA_DOCKER_PLAN.md
   3. Lee: docs/05-deployment/KUBERNETES_PLAN.md
   4. Review: docker-compose.yml y Dockerfile
   5. Plan: CI/CD pipeline setup

🔹 SI ERES QA/TESTER:
   1. Lee: MASTER_BLUEPRINT.md (sección Flujos E2E)
   2. Lee: docs/04-testing/RUTA_TESTS_PLAN.md
   3. Ejecuta: docs/04-testing/INTEGRACIÓN_E2E_TESTING.md
   4. Revisa: 48 tests en backend/__tests__/
   5. Coverage: npm test -- --coverage

═══════════════════════════════════════════════════════════════════════════════
🚨 TROUBLESHOOTING RÁPIDO
═══════════════════════════════════════════════════════════════════════════════

¿Qué hacer si...?

SQL no funciona?
└─ docs/06-referencias/TROUBLESHOOTING.md → "relation does not exist"

Backend no levanta?
└─ docs/06-referencias/TROUBLESHOOTING.md → "ECONNREFUSED"

Tests fallan?
└─ docs/06-referencias/TROUBLESHOOTING.md → "Test failures"

Webhook retorna 400?
└─ docs/06-referencias/TROUBLESHOOTING.md → "Webhook errors"

Docker no inicia?
└─ docs/05-deployment/TROUBLESHOOTING.md

Health check retorna error?
└─ docs/06-referencias/TROUBLESHOOTING.md → "Health checks"

Necesito más ayuda?
└─ docs/06-referencias/RECURSOS.md (links & referencias)

═══════════════════════════════════════════════════════════════════════════════
📊 CHECKLIST RÁPIDO (ANTES DE EMPEZAR)
═══════════════════════════════════════════════════════════════════════════════

Preparación (5 minutos):

[ ] Acceso a Supabase dashboard
    URL: https://supabase.com/dashboard
    Project ID: htvlwhisjpdagqkqnpxg

[ ] Backend en carpeta correcta
    Ruta: /home/eevan/ProyectosIA/SIST_PIZZA/backend

[ ] Node.js 18+ instalado
    Comando: node --version

[ ] npm instalado
    Comando: npm --version

[ ] npm dependencies instaladas
    Comando: npm list | head -5

[ ] Backend no está corriendo (aún)
    Comando: lsof -i :4000 (debe estar vacío)

Decisión:

[ ] ¿Qué ruta ejecuto?
    Opción: MVP (20min) / Ágil (1.5h) / Producción (8-10h)

═══════════════════════════════════════════════════════════════════════════════
💡 TIPS IMPORTANTES
═══════════════════════════════════════════════════════════════════════════════

✅ SIEMPRE:
   • Léelo todo antes de ejecutar
   • Sigue el orden paso-a-paso
   • Verifica cada paso antes de continuar
   • Copia-pega exactamente (no edites)

❌ NUNCA:
   • Intentes saltarte pasos
   • Ejecutes SQL sin verificar primero
   • Cambies conexiones sin entender por qué
   • Ignores mensajes de error

🔄 SI ALGO FALLA:
   1. Para la ejecución
   2. Lee el error completo
   3. Busca en docs/06-referencias/TROUBLESHOOTING.md
   4. Sigue la solución exactamente
   5. Reintenta

═══════════════════════════════════════════════════════════════════════════════
REFERENCIA RÁPIDA: ARCHIVOS ESENCIALES
═══════════════════════════════════════════════════════════════════════════════

ROOT (raíz del proyecto):
├── MASTER_BLUEPRINT.md                   ← LEE PRIMERO
├── INDEX.md                              ← TÚ ESTÁS AQUÍ
├── README.md                             ← Visión general
│
├── PASO_2_SCHEMA_SQL.txt                 ← SQL PASO 1
├── PASO_3_SEED_DATA_SQL.txt              ← SQL PASO 2
├── CREAR_ZONAS_ENTREGA.sql               ← SQL PASO 3
│
├── backend/
│   ├── src/
│   │   ├── server.ts                     ← Express app
│   │   └── workflows/webhookN8N.ts       ← Webhook handler
│   ├── __tests__/                        ← 48 tests
│   ├── package.json
│   └── vitest.config.ts
│
├── docs/                                 ← ESTA ES LA CARPETA NUEVA
│   ├── 01-inicio/
│   ├── 02-arquitectura/
│   ├── 03-setup-sql/
│   ├── 04-testing/
│   ├── 05-deployment/
│   └── 06-referencias/
│
└── .docs-deprecated/                     ← ARCHIVOS VIEJOS (IGNORAR)

═══════════════════════════════════════════════════════════════════════════════
🎯 PRÓXIMO PASO
═══════════════════════════════════════════════════════════════════════════════

Si eres NUEVO en este proyecto:
└─→ Lee: MASTER_BLUEPRINT.md (5 minutos)

Si necesitas EMPEZAR YA:
└─→ Elige una ruta (MVP/Ágil/Producción) y comienza

Si tengo DUDAS:
└─→ Busca en: docs/06-referencias/TROUBLESHOOTING.md

═══════════════════════════════════════════════════════════════════════════════

Versión: 1.0
Estado: 🚀 Listo
Última actualización: Session 3

═══════════════════════════════════════════════════════════════════════════════
