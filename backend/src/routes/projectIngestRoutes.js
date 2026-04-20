/**
 * projectIngestRoutes.js — Rota de ingestão de ZIP de projeto.
 * Gerado automaticamente pelo JARVIS CORE V0.3
 *
 * POST /api/v1/chat/project-zip  — ingestão dedicada de ZIP
 * POST /api/v1/chat/attachments  — roteador unificado por tipo
 */

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import fs, { mkdirSync, rmSync } from 'fs';
import { createRequire } from 'module';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
});

const uploadMulti = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 5 },
});

const SUPPORTED_EXTENSIONS = new Set([
  '.js', '.ts', '.tsx', '.jsx', '.mjs', '.cjs',
  '.json', '.md', '.html', '.css', '.scss',
  '.py', '.yml', '.yaml', '.txt', '.sql',
  '.env', '.sh', '.dockerfile',
]);

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build',
  '__pycache__', '.cache', 'coverage', '.nyc_output',
]);

const STACK_SIGNATURES = {
  node:    ['package.json'],
  express: ['src/routes', 'src/middleware', 'app.js', 'server.js'],
  react:   ['src/App.jsx', 'src/App.tsx', 'src/index.jsx', 'src/index.tsx'],
  python:  ['requirements.txt', 'setup.py', 'pyproject.toml'],
  nextjs:  ['next.config.js', 'pages/', 'app/'],
};

function getBearerToken(req) {
  return String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
}

// ─── ZIP EXTRACTION ──────────────────────────────────────────────────────────

async function extractZipSafe(buffer, originalName) {
  // Importação dinâmica do adm-zip
  let AdmZip;
  try {
    const mod = await import('adm-zip');
    AdmZip = mod.default;
  } catch {
    throw Object.assign(
      new Error('adm-zip não instalado. Execute: npm install adm-zip'),
      { status: 500, code: 'MISSING_DEPENDENCY' }
    );
  }

  const sandboxDir = fs.mkdtempSync(path.join(os.tmpdir(), 'jarvis-zip-'));

  let zip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    rmSync(sandboxDir, { recursive: true, force: true });
    throw Object.assign(new Error('Arquivo ZIP inválido ou corrompido'), { status: 400, code: 'INVALID_ARCHIVE' });
  }

  const entries = zip.getEntries();
  if (entries.length === 0) {
    rmSync(sandboxDir, { recursive: true, force: true });
    throw Object.assign(new Error('ZIP vazio'), { status: 400, code: 'EMPTY_ARCHIVE' });
  }
  if (entries.length > 1000) {
    rmSync(sandboxDir, { recursive: true, force: true });
    throw Object.assign(new Error(`ZIP com ${entries.length} arquivos excede o limite de 1000`), { status: 400, code: 'TOO_MANY_FILES' });
  }

  let totalExtracted = 0;
  const extracted = [];

  for (const entry of entries) {
    const entryName = entry.entryName;
    const normalized = path.normalize(entryName).replace(/\\/g, '/');

    // Bloquear path traversal
    if (normalized.startsWith('../') || normalized.includes('/../') || path.isAbsolute(entryName)) {
      rmSync(sandboxDir, { recursive: true, force: true });
      throw Object.assign(
        new Error(`Path traversal detectado: ${entryName}`),
        { status: 400, code: 'ARCHIVE_UNSAFE' }
      );
    }

    if (entry.isDirectory) continue;

    const entrySize = entry.header.size || 0;
    totalExtracted += entrySize;
    if (totalExtracted > 100 * 1024 * 1024) {
      rmSync(sandboxDir, { recursive: true, force: true });
      throw Object.assign(new Error('Tamanho extraído excede 100MB'), { status: 413, code: 'EXTRACTED_SIZE_EXCEEDED' });
    }

    const destPath = path.join(sandboxDir, normalized);
    if (!destPath.startsWith(sandboxDir)) {
      rmSync(sandboxDir, { recursive: true, force: true });
      throw Object.assign(new Error('Destino fora do sandbox'), { status: 400, code: 'ARCHIVE_UNSAFE' });
    }

    mkdirSync(path.dirname(destPath), { recursive: true });
    try {
      fs.writeFileSync(destPath, entry.getData());
      extracted.push({ name: normalized, size: entrySize, destPath });
    } catch { /* arquivo inelegível — ignorar */ }
  }

  return { sandboxDir, entries: extracted };
}

// ─── INDEXING ─────────────────────────────────────────────────────────────────

function indexFiles(entries) {
  const supported = [];
  const ignored = [];

  for (const entry of entries) {
    const parts = entry.name.split('/');
    if (parts.some(p => IGNORED_DIRS.has(p))) { ignored.push(entry.name); continue; }

    const ext = path.extname(entry.name).toLowerCase();
    if (SUPPORTED_EXTENSIONS.has(ext)) {
      try {
        const content = fs.readFileSync(entry.destPath, 'utf-8');
        supported.push({ path: entry.name, ext, size: entry.size, content: content.slice(0, 6000) });
      } catch { ignored.push(entry.name); }
    } else {
      ignored.push(entry.name);
    }
  }
  return { supported, ignored };
}

function detectStack(supported) {
  const paths = supported.map(f => f.path);
  const stack = [];
  for (const [name, sigs] of Object.entries(STACK_SIGNATURES)) {
    if (sigs.some(sig => paths.some(p => p.endsWith(sig) || p.includes(sig)))) stack.push(name);
  }
  const entryPoints = paths.filter(p =>
    ['server.js', 'app.js', 'index.js', 'main.py', 'index.ts', 'server.ts'].some(ep => p.endsWith(ep))
  );
  return {
    mainStack: stack.length ? stack : ['unknown'],
    entryPoints,
    routes: paths.filter(p => p.includes('/routes/')),
    services: paths.filter(p => p.includes('/services/')),
  };
}

function detectIssues(supported) {
  const issues = [];
  for (const file of supported) {
    const c = file.content;
    if (c.includes('vision-fallback')) issues.push(`vision fallback ativo em ${file.path}`);
    if (c.includes('req.file.mimetype') && !c.includes('if (!req.file)'))
      issues.push(`acesso a req.file.mimetype sem guard em ${file.path}`);
    if (c.includes('IMAGE_REQUIRED')) issues.push(`✓ guard IMAGE_REQUIRED presente em ${file.path}`);
  }
  return issues;
}

// ─── INGEST HANDLER ──────────────────────────────────────────────────────────

async function handleProjectZip(fileBuffer, originalName, message) {
  let sandboxDir = null;
  try {
    const { sandboxDir: sd, entries } = await extractZipSafe(fileBuffer, originalName);
    sandboxDir = sd;

    const { supported, ignored } = indexFiles(entries);
    const stackInfo = detectStack(supported);
    const issues = detectIssues(supported);

    const answer =
      `Analisei o ZIP **${originalName}**.\n\n` +
      `**Stack:** ${stackInfo.mainStack.join(', ')}\n` +
      `**Entry points:** ${stackInfo.entryPoints.join(', ') || 'não detectados'}\n` +
      `**Arquivos indexados:** ${supported.length} de ${entries.length}\n` +
      (issues.length ? `**Observações:** ${issues.join('; ')}\n` : '') +
      `\nPosso analisar qualquer arquivo específico. O que você quer examinar?`;

    return {
      ok: true,
      type: 'project_zip',
      archive: {
        name: originalName,
        size: fileBuffer.length,
        totalFiles: entries.length,
        supportedFiles: supported.length,
        ignoredFiles: ignored.length,
      },
      projectSummary: {
        mainStack: stackInfo.mainStack,
        entryPoints: stackInfo.entryPoints,
        routes: stackInfo.routes,
        services: stackInfo.services,
        possibleIssues: issues,
      },
      answer,
    };
  } finally {
    if (sandboxDir) {
      try { rmSync(sandboxDir, { recursive: true, force: true }); } catch { }
    }
  }
}

// ─── ROUTES ──────────────────────────────────────────────────────────────────

/**
 * POST /api/v1/chat/project-zip
 */
router.post('/project-zip', upload.single('archive'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'ARCHIVE_REQUIRED', message: 'Envie um ZIP no campo "archive".' });
    }
    const mime = String(req.file.mimetype || '').toLowerCase();
    const name = String(req.file.originalname || '').toLowerCase();
    if (!mime.includes('zip') && !mime.includes('octet-stream') && !name.endsWith('.zip')) {
      return res.status(400).json({ ok: false, error: 'INVALID_ARCHIVE', message: 'Arquivo não é um ZIP válido.' });
    }
    const result = await handleProjectZip(
      req.file.buffer,
      req.file.originalname || 'project.zip',
      String(req.body.message || '').trim(),
    );
    res.json({ ...result, sessionId: req.body.sessionId });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ ok: false, error: error.code, message: error.message });
    next(error);
  }
});

/**
 * POST /api/v1/chat/attachments — roteador unificado
 */
router.post('/attachments', uploadMulti.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'FILE_REQUIRED', message: 'Envie um arquivo no campo "file".' });
    }
    const mime = String(req.file.mimetype || '').toLowerCase();
    const name = String(req.file.originalname || '').toLowerCase();
    const ext  = name.split('.').pop();

    if (mime.startsWith('image/') || ['png','jpg','jpeg','webp','gif','bmp'].includes(ext)) {
      // Delegar para vision — importar dinamicamente para não criar dependência circular
      return res.status(501).json({ ok: false, error: 'USE_VISION_ENDPOINT', message: 'Para imagens use /api/v1/chat/vision' });
    }
    if (mime.includes('zip') || ext === 'zip') {
      const result = await handleProjectZip(req.file.buffer, req.file.originalname, String(req.body.message || '').trim());
      return res.json({ ...result, sessionId: req.body.sessionId });
    }
    return res.status(400).json({ ok: false, error: 'UNSUPPORTED_FILE_TYPE', message: `Tipo não suportado: ${mime || ext}` });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ ok: false, error: error.code, message: error.message });
    next(error);
  }
});

export default router;
