const path = require('path');
if (process.env.NODE_ENV !== 'test') {
  require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });
}
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');

const app = express();
app.use(cors());
app.use(express.json());

const dbDisabled =
  process.env.DISABLE_DB === 'true' ||
  process.env.DISABLE_DB === '1' ||
  process.env.MONGO_DISABLED === 'true' ||
  process.env.MONGO_DISABLED === '1';

let persistenceEnabled = Boolean(process.env.MONGO_URI) && !dbDisabled && process.env.NODE_ENV !== 'test';

const SUPPORTED_LANGUAGES = new Set([
  'javascript',
  'typescript',
  'python',
  'java',
  'cpp',
  'go'
]);

const MAX_CODE_CHARS = 20000;
const MAX_HISTORY_ITEMS = 50;

const historyFilePath =
  process.env.HISTORY_FILE ||
  path.join(__dirname, 'data', 'history.json');

let fileHistoryCache = [];
let fileWriteQueue = Promise.resolve();

async function ensureHistoryDir() {
  const dir = path.dirname(historyFilePath);
  await fs.promises.mkdir(dir, { recursive: true });
}

async function loadFileHistory() {
  try {
    const raw = await fs.promises.readFile(historyFilePath, 'utf8');
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) fileHistoryCache = parsed;
  } catch (_) {
    fileHistoryCache = [];
  }
}

async function saveFileHistory() {
  const snapshot = fileHistoryCache.slice(-MAX_HISTORY_ITEMS);
  fileHistoryCache = snapshot;
  await ensureHistoryDir();
  await fs.promises.writeFile(historyFilePath, JSON.stringify(snapshot, null, 2), 'utf8');
}

function isDbReady() {
  return persistenceEnabled && mongoose.connection.readyState === 1;
}

async function persistFixDoc(doc) {
  if (isDbReady()) {
    const newFix = new Fix(doc);
    await newFix.save();
    return;
  }

  const entry = {
    ...doc,
    createdAt: new Date().toISOString()
  };

  fileHistoryCache.push(entry);
  fileWriteQueue = fileWriteQueue.then(() => saveFileHistory()).catch(() => {});
  await fileWriteQueue;
}

// === MongoDB ===
if (persistenceEnabled) {
  mongoose
    .connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    })
    .then(() => console.log('MongoDB connected'))
    .catch(err => {
      persistenceEnabled = false;
      console.error('MongoDB error:', err?.message || err);
      if (process.env.NODE_ENV !== 'test') {
        console.warn('Continuing without MongoDB. Set DISABLE_DB=1 to silence this.');
      }
    });
} else {
  if (process.env.NODE_ENV !== 'test') {
    if (dbDisabled) {
      console.log('MongoDB disabled; using file history store.');
    } else {
      console.log('MONGO_URI not set; using file history store.');
    }
  }
}

// === Schema ===
const FixSchema = new mongoose.Schema({
  originalCode: String,
  language: String,
  fixedCode: String,
  explanation: String,
  report: mongoose.Schema.Types.Mixed,
  model: String,
  createdAt: { type: Date, default: Date.now }
});
const Fix = mongoose.model('Fix', FixSchema);

function buildPrompt({ code, language }) {
  return [
    'You are an advanced Code Debugger and Code Explainer AI.',
    '',
    'Rules:',
    '- Analyze ONLY the provided code. Do not invent missing files or functions.',
    '- Preserve the user’s coding style unless it is a bad practice.',
    '- Include comments in corrected code to show what changed.',
    '- Be concise, accurate, and developer-friendly.',
    '',
    'Return ONLY valid JSON (no markdown, no code fences) matching this shape:',
    '{',
    '  "analysis": string,',
    '  "detectedProblems": Array<{ type: "syntax"|"logic"|"performance"|"bad_practice"|"security"|"other", severity: "low"|"medium"|"high", message: string, approxLine?: number, snippet?: string }>,',
    '  "fixes": Array<{ message: string, reason: string }>,',
    '  "correctedCode": string,',
    '  "optimizedCode": string | null',
    '}',
    '',
    `Language: ${language}`,
    '',
    'Code:',
    code
  ].join('\n');
}

function safeJsonParse(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch (e) {
    return { ok: false, error: e };
  }
}

function normalizeReport(report, { language }) {
  const normalized = {
    analysis: typeof report?.analysis === 'string' ? report.analysis : '',
    detectedProblems: Array.isArray(report?.detectedProblems) ? report.detectedProblems : [],
    fixes: Array.isArray(report?.fixes) ? report.fixes : [],
    correctedCode: typeof report?.correctedCode === 'string' ? report.correctedCode : '',
    optimizedCode:
      typeof report?.optimizedCode === 'string'
        ? report.optimizedCode
        : report?.optimizedCode == null
          ? null
          : String(report.optimizedCode)
  };

  normalized.detectedProblems = normalized.detectedProblems
    .filter(Boolean)
    .map(p => ({
      type: typeof p?.type === 'string' ? p.type : 'other',
      severity: typeof p?.severity === 'string' ? p.severity : 'medium',
      message: typeof p?.message === 'string' ? p.message : String(p?.message ?? ''),
      approxLine: typeof p?.approxLine === 'number' ? p.approxLine : undefined,
      snippet: typeof p?.snippet === 'string' ? p.snippet : undefined
    }));

  normalized.fixes = normalized.fixes
    .filter(Boolean)
    .map(f => ({
      message: typeof f?.message === 'string' ? f.message : String(f?.message ?? ''),
      reason: typeof f?.reason === 'string' ? f.reason : String(f?.reason ?? '')
    }));

  if (!normalized.correctedCode) {
    normalized.correctedCode = `/* Model did not return correctedCode for ${language} */`;
  }

  return normalized;
}

function reportToLegacyExplanation(report) {
  const problems = report.detectedProblems
    .map(p => `- [${p.severity}] (${p.type}) ${p.message}${p.approxLine ? ` (line ~${p.approxLine})` : ''}`)
    .join('\n');
  const fixes = report.fixes.map(f => `- ${f.message}\n  - Why: ${f.reason}`).join('\n');

  return [
    'Analysis:',
    report.analysis || '(none)',
    '',
    'Detected Problems:',
    problems || '(none)',
    '',
    'Fixes & Explanations:',
    fixes || '(none)'
  ].join('\n');
}

async function generateReport({ code, language }) {
  if (!process.env.GEMINI_API_KEY) {
    const err = new Error('GEMINI_API_KEY is missing');
    err.code = 'MISSING_GEMINI_API_KEY';
    throw err;
  }

  const prompt = buildPrompt({ code, language });

  const preferredModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  const fallbackModels = [
    'gemini-1.5-flash',
    'gemini-1.5-pro',
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite'
  ].filter(m => m && m !== preferredModel);

  const requestBody = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.2,
      maxOutputTokens: 2048,
      responseMimeType: 'application/json'
    }
  };

  async function callModel(modelName) {
    const aiRes = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      requestBody
    );
    return aiRes;
  }

  let aiRes;
  let usedModel = preferredModel;
  try {
    aiRes = await callModel(preferredModel);
  } catch (error) {
    const status = error?.response?.status;
    const providerMessage =
      error?.response?.data?.error?.message ||
      error?.response?.data?.message ||
      error?.message ||
      '';

    const isModelNotFound =
      status === 404 ||
      /model(s)?\/.*not found/i.test(providerMessage) ||
      /is not supported for generateContent/i.test(providerMessage);

    if (!isModelNotFound) throw error;

    let lastError = error;
    for (const candidate of fallbackModels) {
      try {
        aiRes = await callModel(candidate);
        usedModel = candidate;
        lastError = null;
        break;
      } catch (e) {
        lastError = e;
      }
    }
    if (lastError) throw lastError;
  }

  const text = aiRes?.data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text || typeof text !== 'string') {
    return { model: usedModel, report: normalizeReport({}, { language }), rawText: '' };
  }

  const parsed = safeJsonParse(text);
  if (!parsed.ok) {
    return {
      model: usedModel,
      report: normalizeReport(
        {
          analysis: 'Model returned non-JSON output. Try again or reduce code length.',
          detectedProblems: [{ type: 'other', severity: 'high', message: 'Unparseable model output.' }],
          fixes: [],
          correctedCode: '',
          optimizedCode: null
        },
        { language }
      ),
      rawText: text
    };
  }

  return { model: usedModel, report: normalizeReport(parsed.value, { language }), rawText: text };
}

function getProviderErrorMessage(error) {
  const msg =
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    (typeof error?.response?.data === 'string' ? error.response.data : null) ||
    error?.message ||
    'Unknown error';
  return String(msg).slice(0, 500);
}

// === POST /api/fix ===
app.post('/api/fix', async (req, res) => {
  const { code, language } = req.body;
  if (!code || !language) return res.status(400).json({ error: 'Code and language required' });
  if (typeof code !== 'string' || typeof language !== 'string') {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  if (!SUPPORTED_LANGUAGES.has(language)) {
    return res.status(400).json({ error: `Unsupported language: ${language}` });
  }
  if (code.length > MAX_CODE_CHARS) {
    return res.status(400).json({ error: `Code too large (max ${MAX_CODE_CHARS} characters)` });
  }

  try {
    const { model, report } = await generateReport({ code, language });

    const fixedCode = report.correctedCode;
    const explanation = reportToLegacyExplanation(report);

    await persistFixDoc({ originalCode: code, language, fixedCode, explanation, report, model });

    res.json({ fixedCode, explanation, report, model });
  } catch (error) {
    const status = error?.response?.status;
    if (status) {
      console.error('AI provider error:', status, getProviderErrorMessage(error));
      return res.status(502).json({ error: 'AI provider error', details: getProviderErrorMessage(error) });
    }
    console.error('Error:', error?.code || error?.message || error);
    res.status(500).json({ error: 'Failed to process' });
  }
});

app.post('/api/analyze', async (req, res) => {
  const { code, language } = req.body;
  if (!code || !language) return res.status(400).json({ error: 'Code and language required' });
  if (typeof code !== 'string' || typeof language !== 'string') {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  if (!SUPPORTED_LANGUAGES.has(language)) {
    return res.status(400).json({ error: `Unsupported language: ${language}` });
  }
  if (code.length > MAX_CODE_CHARS) {
    return res.status(400).json({ error: `Code too large (max ${MAX_CODE_CHARS} characters)` });
  }

  try {
    const { model, report } = await generateReport({ code, language });
    const doc = {
      originalCode: code,
      language,
      fixedCode: report.correctedCode,
      explanation: reportToLegacyExplanation(report),
      report,
      model
    };
    await persistFixDoc(doc);
    res.json({ report, model });
  } catch (error) {
    const status = error?.response?.status;
    if (status) {
      console.error('AI provider error:', status, getProviderErrorMessage(error));
      return res.status(502).json({ error: 'AI provider error', details: getProviderErrorMessage(error) });
    }
    console.error('Error:', error?.code || error?.message || error);
    res.status(500).json({ error: 'Failed to process' });
  }
});

// === GET /api/history ===
app.get('/api/history', async (req, res) => {
  try {
    if (isDbReady()) {
      const fixes = await Fix.find().sort({ createdAt: -1 }).limit(10);
      return res.json(fixes);
    }

    const recent = fileHistoryCache.slice(-10).reverse();
    res.json(recent);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// ROOT ROUTE - Test if backend is live
app.get('/', (req, res) => {
  res.json({ 
    status: 'Backend LIVE', 
    project: 'FIXIFYAI-CODEFIXER',
    ai: 'Gemini Pro',
    db: 'MongoDB Atlas',
    time: new Date().toLocaleString('en-IN')
  });
});

const PORT = process.env.PORT || 5000;
if (require.main === module) {
  loadFileHistory()
    .catch(() => {})
    .finally(() => {
      app.listen(PORT, () => {
        console.log(`Backend running at http://localhost:${PORT}`);
      });
    });
}

module.exports = { app };
