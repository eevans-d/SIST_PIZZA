### **Manual Técnico: Sistema "Qwen Passive Code Analyzer"**

Este documento describe la arquitectura, el flujo de operación y los componentes internos del sistema de auditoría de código pasivo. Está dirigido a ingenieros de plataforma, DevOps y desarrolladores que necesiten mantener, modificar o entender el sistema a fondo.

#### **1. Propósito y Arquitectura General**

El sistema "Qwen Passive Code Analyzer" es una herramienta de CI/CD integrada en GitHub Actions diseñada para automatizar la revisión de código fuente. Utiliza un modelo de lenguaje grande (Qwen de Alibaba Cloud) para realizar un análisis estático pasivo, identificando potenciales errores, vulnerabilidades de seguridad, problemas de rendimiento y desviaciones de buenas prácticas, sin modificar el código.

**Tecnologías Clave:**
*   **Orquestación:** GitHub Actions
*   **Lógica Principal:** Node.js (v18+)
*   **Comunicación API:** `axios`
*   **Inteligencia Artificial:** API de Qwen (DashScope)

#### **2. Flujo de Operación Detallado**

El proceso se ejecuta dentro de un workflow de GitHub Actions y sigue estos pasos:

1.  **Disparo (Trigger):** El workflow se activa automáticamente en los siguientes eventos:
    *   `push` a las ramas `main` o `develop`.
    *   `pull_request` dirigido a `main` o `develop`.
    *   `workflow_dispatch`: Ejecución manual desde la interfaz de GitHub.

2.  **Preparación del Entorno:** Se aprovisiona un runner `ubuntu-latest`, se hace checkout del código y se instala el entorno de Node.js v18 con las dependencias especificadas en `package.json` (`npm ci`).

3.  **Detección de Archivos a Analizar:**
    *   **Modo Pull Request (Diff):** Si el disparador es un `pull_request`, un paso intermedio utiliza `git diff` para obtener la lista de archivos modificados. El análisis se acota exclusivamente a estos archivos para mayor eficiencia.
    *   **Modo Repositorio Completo:** En cualquier otro caso (`push`, manual), el script `qwen-analyzer.js` escanea todo el repositorio, respetando las exclusiones definidas en la constante `IGNORED_PATHS` (ej: `node_modules`, `.git`, `dist`, etc.).

4.  **Ejecución del Analizador (`qwen-analyzer.js`):**
    *   **Configuración:** Carga las variables de entorno (`QWEN_API_KEY`, `QWEN_MODEL`, etc.) para configurar la comunicación con la API.
    *   **Carga del Prompt:** Lee el "prompt del sistema" desde `.github/prompts/analyzer-prompt.md`, que instruye a la IA sobre su rol, las áreas a analizar y el formato de salida JSON requerido.
    *   **Agrupamiento (Chunking):** Para manejar repositorios grandes y respetar los límites de la API, el script no envía cada archivo por separado. En su lugar, agrupa múltiples archivos en "lotes" (chunks) de código, asegurando que el tamaño total de cada lote no exceda `MAX_CHARS_PER_REQUEST` (10,000 caracteres por defecto).
    *   **Comunicación con la API:**
        *   Por cada lote, construye un payload que incluye el prompt del sistema y el código a analizar.
        *   Realiza una llamada POST a la API de Qwen usando `axios`.
        *   Implementa una lógica de reintentos en caso de fallo de red o error temporal del servidor.
    *   **Procesamiento de Respuesta:**
        *   **Respuesta Cruda:** La respuesta completa y sin procesar de la API se guarda en un archivo `.json` dentro del directorio `artifacts/`. Esto es crucial para la depuración.
        *   **Extracción de Contenido:** El script extrae el contenido útil de la respuesta (el JSON con los hallazgos). Está diseñado para ser robusto, pudiendo parsear JSON que la IA a veces envuelve en bloques de código markdown (ej: ` ```json ... ``` `).
        *   **Extracción de Uso:** Intenta extraer los datos de uso de tokens de la respuesta para un posible monitoreo de costes.

5.  **Generación de Informe y Artefactos:**
    *   Todos los hallazgos de los diferentes lotes se consolidan en un único informe: `qwen-report.json`.
    *   Este informe incluye metadatos de la ejecución, un resumen cuantitativo (conteo de hallazgos por severidad), un `score` de calidad (0-100) y la lista detallada de cada hallazgo.
    *   Finalmente, el workflow sube el `qwen-report.json` y el directorio `artifacts/` como artefactos de la ejecución, dejándolos disponibles para su descarga.

6.  **Notificación en Pull Request:** Si el workflow fue disparado por un PR, un paso final utiliza `actions/github-script` para publicar un comentario en dicho PR con el resumen de los resultados y un enlace directo a la ejecución del workflow para una revisión detallada.

#### **3. Componentes Clave**

*   **`.github/workflows/qwen-analyzer.yml`:** El orquestador. Define los triggers, el entorno y la secuencia de pasos (instalar, analizar, subir artefactos, comentar).
*   **`.github/scripts/qwen-analyzer.js`:** El cerebro. Contiene toda la lógica de negocio: escanear archivos, agruparlos, llamar a la API, procesar respuestas y generar el informe final.
*   **`.github/prompts/analyzer-prompt.md`:** El alma. Define la "personalidad" y las directrices de la IA. Modificar este archivo es la forma principal de ajustar la calidad y el enfoque del análisis.
*   **`.github/scripts/smoke_test.sh`:** El validador. Un script de prueba local que verifica que el analizador puede arrancar y ejecutarse sin errores de sintaxis, usando una clave de API falsa para no realizar llamadas reales.

---

### **Manual de Usuario: Analizador de Código Automático (Qwen)**

Esta guía explica qué hace la herramienta de análisis automático, cómo interpretar sus resultados y qué acciones tomar. Está dirigida a todos los miembros del equipo de desarrollo.

#### **1. ¿Qué es y para qué sirve?**

Es un **auditor de código automático** que se ejecuta cada vez que se actualiza el código en el repositorio. Su función es actuar como un "par de ojos" extra, detectando problemas comunes y potenciales errores antes de que lleguen a producción.

*   **¿Qué hace?** Revisa el código en busca de bugs, fallos de seguridad, problemas de rendimiento y malas prácticas.
*   **¿Qué NO hace?** **Nunca modifica tu código.** Solo te informa para que tú tomes la decisión.

#### **2. ¿Cómo funciona en tu día a día?**

1.  **Al abrir un Pull Request (PR):** La herramienta analizará automáticamente **solo los archivos que has modificado**.
2.  **Recibirás un comentario en el PR:** A los pocos minutos, verás un nuevo comentario con el título "🔍 Análisis Automático con Qwen".
3.  **Revisa el Resumen:** Este comentario te dará un vistazo rápido de la calidad del código:
    *   **Score General:** Una puntuación de 0 a 100.
    *   **Conteo por Severidad:** El número de problemas encontrados, clasificados como `Críticos`, `Altos`, `Medios` y `Bajos`.

#### **3. ¿Cómo interpretar los resultados?**

*   **Revisa el comentario en el PR.** Si ves hallazgos `Críticos` o `Altos` (marcados con 🔴), es importante que los revises con atención.
*   **Accede al informe completo.** En el comentario, haz clic en el enlace **"[Ver reporte completo]"**. Esto te llevará a la página de la ejecución del workflow en GitHub Actions.
*   **Descarga los artefactos.** En la parte inferior de esa página, encontrarás una sección de "Artifacts". Descarga el archivo `qwen-analysis-artifacts`.
*   **Abre `qwen-report.json`**. Dentro del ZIP descargado, este archivo contiene la lista detallada de cada problema encontrado, incluyendo:
    *   `archivo`: Dónde está el problema.
    *   `linea`: La línea exacta.
    *   `descripcion`: Qué encontró la IA.
    *   `recomendacion`: Cómo sugiere solucionarlo.

#### **4. ¿Qué hago si se encuentra un problema?**

1.  **Prioriza:** Atiende primero los hallazgos `CRITICO` y `ALTO`.
2.  **Corrige el código:** Aplica las recomendaciones del informe en tu rama de trabajo.
3.  **Sube los cambios:** Haz `push` de tus correcciones. El analizador se ejecutará de nuevo sobre los nuevos cambios.
4.  **Pide ayuda si es necesario:** Si no entiendes un hallazgo o no estás de acuerdo, menciona a otro miembro del equipo en un comentario en el PR para revisarlo juntos.

#### **5. Casos Especiales**

*   **Falsos Positivos:** La IA puede cometer errores. Si consideras que un hallazgo es incorrecto, simplemente ignóralo y, si quieres, deja un comentario en el PR para que el equipo esté al tanto.
*   **Pull Requests desde un "Fork":** Por razones de seguridad, si tu PR proviene de un repositorio personal (un "fork"), el análisis no se ejecutará automáticamente. Un `maintainer` del repositorio principal deberá aprobar su ejecución manually.


# CI/CD Setup Completed
