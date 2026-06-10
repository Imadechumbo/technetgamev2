import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import zlib from 'zlib';
const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 25 * 1024 * 1024 } });
const SUPPORTED = new Set(['.js','.ts','.tsx','.jsx','.mjs','.json','.md','.html','.css','.py','.yml','.yaml','.txt','.sql']);
const IGNORED = new Set(['node_modules','.git','dist','build','__pycache__']);
function parseZip(buf) {
  const entries = []; let offset = 0;
  while (offset < buf.length - 4) {
    if (buf.readUInt32LE(offset) !== 0x04034b50) break;
    const compression = buf.readUInt16LE(offset + 8);
    const compSize = buf.readUInt32LE(offset + 18);
    const fnLen = buf.readUInt16LE(offset + 26);
    const extraLen = buf.readUInt16LE(offset + 28);
    const name = buf.slice(offset + 30, offset + 30 + fnLen).toString('utf8');
    const dataOffset = offset + 30 + fnLen + extraLen;
    if (!name.endsWith('/')) {
      const compressed = buf.slice(dataOffset, dataOffset + compSize);
      let content = null;
      try { content = compression === 0 ? compressed : zlib.inflateRawSync(compressed); } catch(_) {}
      entries.push({ name, content });
    }
    offset = dataOffset + compSize;
  }
  return entries;
}
function isSafe(n) { const norm = path.normalize(n).replace(/\\/g, '/'); return !norm.startsWith('../') && !path.isAbsolute(n); }
async function handleZip(buf, name) {
  if (!buf || buf.length < 4 || buf.readUInt32LE(0) !== 0x04034b50) throw Object.assign(new Error('ZIP invalido'), { status: 400, code: 'INVALID_ARCHIVE' });
  const all = parseZip(buf);
  if (!all.length) throw Object.assign(new Error('ZIP vazio'), { status: 400, code: 'EMPTY_ARCHIVE' });
  for (const e of all) if (!isSafe(e.name)) throw Object.assign(new Error('Path traversal: ' + e.name), { status: 400, code: 'ARCHIVE_UNSAFE' });
  const supported = [], ignored = [];
  for (const e of all) {
    if (e.name.split('/').some(p => IGNORED.has(p))) { ignored.push(e.name); continue; }
    const ext = path.extname(e.name).toLowerCase();
    if (SUPPORTED.has(ext) && e.content) supported.push({ path: e.name, content: e.content.toString('utf8', 0, 4000) });
    else ignored.push(e.name);
  }
  const paths = supported.map(f => f.path);
  const stack = [];
  if (paths.some(p => p.endsWith('package.json'))) stack.push('node');
  if (paths.some(p => p.includes('/routes/'))) stack.push('express');
  if (paths.some(p => p.endsWith('requirements.txt'))) stack.push('python');
  return { ok: true, type: 'project_zip', archive: { name, size: buf.length, totalFiles: all.length, supportedFiles: supported.length, ignoredFiles: ignored.length }, projectSummary: { mainStack: stack.length ? stack : ['unknown'], entryPoints: paths.filter(p => ['server.js','app.js','index.js'].some(e => p.endsWith(e))), routes: paths.filter(p => p.includes('/routes/')), possibleIssues: [] }, answer: 'Analisei ' + name + '. Stack: ' + (stack.join(', ') || 'unknown') + '. Arquivos: ' + supported.length + '/' + all.length };
}
router.post('/project-zip', upload.single('archive'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'ARCHIVE_REQUIRED' });
    res.json({ ...await handleZip(req.file.buffer, req.file.originalname || 'project.zip'), sessionId: req.body.sessionId });
  } catch(e) { if (e.status) return res.status(e.status).json({ ok: false, error: e.code, message: e.message }); next(e); }
});
router.post('/attachments', upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ ok: false, error: 'FILE_REQUIRED' });
    const ext = (req.file.originalname||'').split('.').pop().toLowerCase();
    if (ext === 'zip' || (req.file.mimetype||'').includes('zip')) return res.json({ ...await handleZip(req.file.buffer, req.file.originalname), sessionId: req.body.sessionId });
    return res.status(400).json({ ok: false, error: 'UNSUPPORTED_FILE_TYPE' });
  } catch(e) { if (e.status) return res.status(e.status).json({ ok: false, error: e.code, message: e.message }); next(e); }
});
export default router;
