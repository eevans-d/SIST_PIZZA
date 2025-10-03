# Qwen Passive Analyzer — Integración GitHub Actions

Automatizador de auditoría pasiva de código usando la API de **Qwen (DashScope)**.  
Analiza repositorios, detecta bugs, problemas de seguridad, calidad, tests y genera un `qwen-report.json` estructurado.

---

## Estructura del repositorio añadida

```

.github/
├── prompts/
│   └── analyzer-prompt.md
├── scripts/
│   ├── qwen-analyzer.js
│   └── smoke_test.sh
└── workflows/
└── qwen-analyzer.yml
package.json
.gitignore

````

---

## Requisitos
- Permisos admin en el repo para configurar Secrets y Actions.
- Cuenta DashScope / Qwen y `QWEN_API_KEY` (sk-...).
- Node.js >= 18 (runner de GitHub Actions proporciona esto).
- `jq` (opcional, usado en scripts de PR/CI).
- `GITHUB_TOKEN` (proporcionado por Actions para push/PR automáticos cuando `apply=true`).

---

## Secrets que debes configurar (GitHub → Settings → Secrets → Actions)

- `QWEN_API_KEY` (obligatorio) — tu clave DashScope / Qwen

**Opcional**
- `QWEN_API_URL` — si usas region CN: `https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation`
- `QWEN_MODEL` — por ejemplo `qwen-max` o `qwen-doc-turbo`
- `MAX_CHARS_PER_REQUEST` — número (por defecto 10000)
- `QWEN_REQUEST_TIMEOUT_MS` — (ms, por defecto 120000)
- `QWEN_RETRY_COUNT` — (int, por defecto 1)

**IMPORTANTE**: GitHub NO expone secrets en workflows disparados por PRs desde forks. Para analizar PRs desde forks:
- Ejecuta manualmente el workflow (Actions → Run workflow) por un maintainer, o
- Ejecuta el análisis fuera de GitHub Actions con un servicio autorizado.

---

## Cómo funciona (resumen)
1. **Trigger**: `push` a main/develop o `pull_request`.  
2. **PRs**: por defecto `diff-only` — solo archivos modificados.  
3. **Script**: `qwen-analyzer.js` envía chunks a Qwen, parsea respuestas, guarda `artifacts/qwen-raw-response*.json` y produce `qwen-report.json`.  
4. **Artefactos**: `qwen-report.json` y `artifacts/` subidos como artifact del run.  
5. **Comentario PR**: resumen (score + severities) con enlace a run/artifact.

---

## Dry-run vs apply

- **Dry-run (por defecto)**: el workflow genera y valida archivos pero **no** hace push ni crea PRs. Es el modo seguro inicial.
- **Apply**: si se ejecuta con `apply=true` (workflow_dispatch input) o `APPLY=true` (env), el job creará una rama `qwen-analyzer-setup/<run-id>`, commiteará los archivos del analyzer, los pusheará y abrirá un PR automático.  
  - Uso de `apply=true` **solo** por mantenedores o procesos autorizados.

---

## Ejecutar localmente (smoke test)

1. Exportar secret localmente (solo para pruebas):
```bash
export QWEN_API_KEY="sk-..."
export QWEN_API_URL="https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation"
````

2. Ejecutar el analyzer en un archivo de prueba:

```bash
chmod +x .github/scripts/smoke_test.sh
export QWEN_API_KEY="sk-dummy-for-smoke-test"
.github/scripts/smoke_test.sh
```

3. Verificar `qwen-report.json` y `artifacts/qwen-raw-response*.json`.

---

## Interpretación de `qwen-report.json`

* `meta`: información del run (repositorio, fecha, modelo, tokens si se obtuvo).
* `resumen`: counts & score.
* `hallazgos[]`: lista de issues detectados (id, severidad, categoria, archivo, linea, descripcion, recomendacion, codigo_afectado).
* `metricas` y `recomendaciones_prioritarias`.

---

## Troubleshooting rápido

* **Missing QWEN_API_KEY**: exit code 2 — añadir secret `QWEN_API_KEY`.
* **Respuesta no parseable**: revisar `artifacts/qwen-raw-response*.json` y cambiar `QWEN_MODEL` a `qwen-doc-turbo` o fortificar prompt.
* **PR desde fork sin secrets**: pedir a maintainer ejecutar workflow manualmente.
* **Timeout en request**: aumentar `QWEN_REQUEST_TIMEOUT_MS` o reducir `MAX_CHARS_PER_REQUEST`.
* **Coste alto**: cambiar a diff-only en PRs, usar modelo económico (`qwen-turbo`), bajar frecuencia de runs.

---

## Runbook esencial

* **Error parseo JSON**: descargar `qwen-raw-response`, ajustar prompt y re-ejecutar.
* **Hallazgo crítico**: abrir issue con plantilla de seguridad.
* **Coste**: limitar envíos, usar diff-only, cambiar modelo.

---

## Seguridad y buenas prácticas

* No incluir secrets en commits.
* Rotar `QWEN_API_KEY` regularmente (ej. 90 días).
* Limitar quién puede ejecutar workflows manuales.

---

## Contacto

* Equipo Platform / DevOps: reemplazar `devops@example.com` por tu canal real.

---
