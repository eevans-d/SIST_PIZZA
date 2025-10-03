// .github/scripts/qwen-analyzer.js
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const QWEN_API_KEY = process.env.QWEN_API_KEY;
const QWEN_API_URL = process.env.QWEN_API_URL || 'https://dashscope-intl.aliyuncs.com/api/v1/services/aigc/text-generation/generation';
const QWEN_MODEL = process.env.QWEN_MODEL || 'qwen-max';
const MAX_CHARS_PER_REQUEST = Number(process.env.MAX_CHARS_PER_REQUEST || 10000);
const REQUEST_TIMEOUT = Number(process.env.QWEN_REQUEST_TIMEOUT_MS || 120000);
const RETRY_COUNT = Number(process.env.QWEN_RETRY_COUNT || 1);

if (!QWEN_API_KEY) {
  console.error('❌ ERROR: QWEN_API_KEY no definido. Añade el secret en GitHub Settings → Secrets.');
  process.exit(2);
}

const SYSTEM_PROMPT_PATH = path.join(__dirname, '../prompts/analyzer-prompt.md');
const SYSTEM_PROMPT = fs.existsSync(SYSTEM_PROMPT_PATH)
  ? fs.readFileSync(SYSTEM_PROMPT_PATH, 'utf8')
  : 'Eres un auditor pasivo de código. Responde SOLO con JSON válido.';

const IGNORED_PATHS = [
  'node_modules', '.git', '.env', '.env.local', 'secrets.yaml',
  'config.local.js', 'id_rsa', 'Dockerfile.local', '__pycache__',
  'dist', 'build', '.next', 'coverage', 'venv', '.venv'
];

function shouldIgnore(filePath) {
  return IGNORED_PATHS.some(ignored => filePath.includes(ignored));
}

async function callQwen(payload) {
  const headers = {
    'Authorization': `Bearer ${QWEN_API_KEY}`,
    'Content-Type': 'application/json'
  };

  for (let attempt = 0; attempt <= RETRY_COUNT; attempt++) {
    try {
      const resp = await axios.post(QWEN_API_URL, payload, {
        headers,
        timeout: REQUEST_TIMEOUT
      });
      return resp.data;
    } catch (err) {
      console.warn(`⚠️ Intento ${attempt + 1} fallido: ${err.message}`);
      if (attempt === RETRY_COUNT) throw err;
      await new Promise(r => setTimeout(r, 1000 * (attempt + 1)));
    }
  }
}

function safeParseJsonPossiblyWrapped(text) {
  if (!text || typeof text !== 'string') return null;
  const patterns = [
    /```(?:json)?\s*({[\s\S]*?})\s*```/i,
    /({[\s\S]*})/s
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      try { return JSON.parse(match[1]); } catch {}
    }
  }
  try { return JSON.parse(text); } catch {}
  return null;
}

function extractContentFromResponse(data) {
  try {
    fs.mkdirSync('artifacts', { recursive: true });
    fs.writeFileSync(`artifacts/qwen-raw-response-${Date.now()}.json`, JSON.stringify(data, null, 2));
  } catch (e) {}

  const extractors = [
    () => data?.output?.choices?.[0]?.message?.content,
    () => data?.output?.[0]?.content?.[0]?.text,
    () => data?.choices?.[0]?.message?.content,
    () => data?.output?.[0]?.content,
    () => data?.output,
    () => data?.choices?.[0]?.text
  ];

  for (const extractor of extractors) {
    try {
      const content = extractor();
      if (content) {
        const parsed = safeParseJsonPossiblyWrapped(
          typeof content === 'string' ? content : JSON.stringify(content)
        );
        if (parsed) return parsed;
      }
    } catch (e) {
      // ignore extractor errors
    }
  }

  return safeParseJsonPossiblyWrapped(JSON.stringify(data));
}

// ----- START: funciones de extracción de usage/tokens -----
function extractUsageFromResponse(data) {
  const candidates = [
    data?.usage,
    data?.output?.usage,
    data?.meta?.usage,
    data?.choices?.[0]?.usage,
    data?.output?.[0]?.usage,
    data?.output?.[0]?.content?.[0]?.usage,
    data?.total_tokens,
    data?.token_usage
  ];
  for (const c of candidates) {
    if (c && typeof c === 'object') return c;
    if (typeof c === 'number') return { total_tokens: c };
  }

  if (typeof data === 'object') {
    if (data.total_tokens) return { total_tokens: data.total_tokens };
    if (data.token_usage) return data.token_usage;
  }

  return null;
}

function safeNumber(n) {
  try { return Number(n) || 0; } catch { return 0; }
}
// ----- END: funciones de extracción de usage/tokens -----

async function analyzeWithQwen(code, filename) {
  const userContent = `Archivo: ${filename}\n\nCódigo:\n${code}\n\nResponde SOLO con un objeto JSON válido que incluya "hallazgos".`;
  const payload = {
    model: QWEN_MODEL,
    input: {
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userContent }
      ]
    },
    parameters: {
      result_format: 'message',
      max_tokens: 4000,
      temperature: 0.0
    }
  };

  try {
    const data = await callQwen(payload);

    try {
      fs.mkdirSync('artifacts', { recursive: true });
      fs.writeFileSync(`artifacts/qwen-raw-response-${Date.now()}.json`, JSON.stringify(data, null, 2));
    } catch (e) {}

    const parsed = extractContentFromResponse(data);
    const usage = extractUsageFromResponse(data) || null;

    const hallazgos = Array.isArray(parsed?.hallazgos) ? parsed.hallazgos : [];
    return { hallazgos, usage, raw: data };
  } catch (error) {
    console.error(`❌ Error en análisis de ${filename}:`, error.message);
    return { hallazgos: [], usage: null, raw: null };
  }
}

function walkDir(dir, extensions) {
  let files = [];
  try {
    const items = fs.readdirSync(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      if (shouldIgnore(fullPath)) continue;
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        files = files.concat(walkDir(fullPath, extensions));
      } else if (extensions.some(ext => item.endsWith(ext))) {
        files.push(fullPath);
      }
    }
  } catch (e) {
    console.warn(`⚠️ No se pudo leer: ${dir}`);
  }
  return files;
}

// Soporta --files "a.js b.py" o env FILES
function parseFilesArg() {
  const idx = process.argv.indexOf('--files');
  if (idx !== -1 && process.argv[idx + 1]) {
    return process.argv[idx + 1].split(/\s+/).filter(Boolean);
  }
  if (process.env.FILES) {
    return process.env.FILES.split(/\s+/).filter(Boolean);
  }
  return null;
}

async function analyzeRepository() {
  const extensions = (process.env.ANALYZER_EXTENSIONS || '.js,.ts,.jsx,.tsx,.py,.java,.cpp,.go,.rs,.rb,.php').split(',');
  const filesArg = parseFilesArg();
  let files = [];

  if (filesArg && filesArg.length > 0) {
    files = filesArg.filter(f => {
      try { return fs.existsSync(f) && extensions.some(ext => f.endsWith(ext)); } catch { return false; }
    });
    console.log(`🔍 Modo diff-only: analizando ${files.length} archivos indicados...`);
  } else {
    files = walkDir('.', extensions);
    console.log(`🔍 Analizando ${files.length} archivos (full repo)...`);
  }

  let allFindings = [];
  let totalLines = 0;

  // Agrupar en chunks por tamaño
  let currentChunk = [];
  let currentSize = 0;

  // global usage summary
  globalThis._qwen_usage_summary = globalThis._qwen_usage_summary || { total_tokens: 0, calls: 0, details: [] };

  for (const file of files) {
    try {
      const code = fs.readFileSync(file, 'utf8');
      const lines = code.split('\n').length;
      const size = code.length;

      if (lines > 5000 || size > MAX_CHARS_PER_REQUEST) {
        console.log(`⏩ Saltando ${file} (demasiado grande)`);
        continue;
      }

      if (currentSize + size > MAX_CHARS_PER_REQUEST && currentChunk.length > 0) {
        // Analizar chunk actual
        const batchFiles = currentChunk.slice();
        const batchCode = batchFiles.map(f => {
          const c = fs.readFileSync(f, 'utf8');
          return `=== ${f} ===\n${c}`;
        }).join('\n\n');

        const result = await analyzeWithQwen(batchCode, batchFiles.join(', '));
        const findings = Array.isArray(result.hallazgos) ? result.hallazgos : [];
        allFindings.push(...findings.map(f => ({ ...f, archivo: batchFiles.join(', ') })));

        if (result.usage) {
          const usageObj = result.usage;
          let total_tokens = usageObj.total_tokens || usageObj.totalToken || usageObj.prompt_tokens || usageObj.total || 0;
          total_tokens = safeNumber(total_tokens);
          globalThis._qwen_usage_summary.total_tokens += total_tokens;
          globalThis._qwen_usage_summary.calls += 1;
          globalThis._qwen_usage_summary.details.push({ files: batchFiles.join(', '), tokens: total_tokens, raw: usageObj });
        }

        currentChunk = [];
        currentSize = 0;
      }

      currentChunk.push(file);
      currentSize += size;

      // small delay to respect rate-limits
      await new Promise(r => setTimeout(r, Number(process.env.POST_FILE_DELAY_MS || 1500)));
    } catch (e) {
      console.error(`❌ Error procesando ${file}:`, e.message);
    }
  }

  // Último chunk
  if (currentChunk.length > 0) {
    const batchFiles = currentChunk.slice();
    const batchCode = batchFiles.map(f => {
      const c = fs.readFileSync(f, 'utf8');
      return `=== ${f} ===\n${c}`;
    }).join('\n\n');

    const result = await analyzeWithQwen(batchCode, batchFiles.join(', '));
    const findings = Array.isArray(result.hallazgos) ? result.hallazgos : [];
    allFindings.push(...findings.map(f => ({ ...f, archivo: batchFiles.join(', ') })));

    if (result.usage) {
      const usageObj = result.usage;
      let total_tokens = usageObj.total_tokens || usageObj.totalToken || usageObj.prompt_tokens || usageObj.total || 0;
      total_tokens = safeNumber(total_tokens);
      globalThis._qwen_usage_summary.total_tokens += total_tokens;
      globalThis._qwen_usage_summary.calls += 1;
      globalThis._qwen_usage_summary.details.push({ files: batchFiles.join(', '), tokens: total_tokens, raw: usageObj });
    }
  }

  // compute totals
  totalLines = allFindings.reduce((sum, f) => sum + (f.linea || 0), 0) || 0;

  const criticos = allFindings.filter(f => f.severidad === 'CRITICO').length;
  const altos = allFindings.filter(f => f.severidad === 'ALTO').length;
  const medios = allFindings.filter(f => f.severidad === 'MEDIO').length;
  const bajos = allFindings.filter(f => f.severidad === 'BAJO').length;

  const score = Math.max(0, Math.min(100,
    100 - (criticos * 20) - (altos * 10) - (medios * 3) - (bajos * 1)
  ));

  const usage_summary = globalThis._qwen_usage_summary || null;

  const report = {
    meta: {
      repositorio: process.env.GITHUB_REPOSITORY || 'local',
      fecha_analisis: new Date().toISOString(),
      archivos_analizados: files.length,
      lineas_totales: totalLines,
      qwen_api_url: QWEN_API_URL,
      qwen_model: QWEN_MODEL,
      tokens: usage_summary
    },
    resumen: { criticos, altos, medios, bajos, score_general: Math.round(score) },
    hallazgos: allFindings,
    metricas: { complejidad_promedio: null, duplicacion_porcentaje: null, cobertura_tests: null, deuda_tecnica_horas: null },
    recomendaciones_prioritarias: allFindings
      .filter(f => ['CRITICO', 'ALTO'].includes(f.severidad))
      .slice(0, 10)
      .map(f => f.recomendacion)
  };

  fs.writeFileSync('qwen-report.json', JSON.stringify(report, null, 2));
  console.log(`✅ Análisis completado. Hallazgos: ${allFindings.length}. Reporte: qwen-report.json`);
}

analyzeRepository().catch(err => {
  console.error('💥 Error fatal:', err);
  process.exit(1);
});
