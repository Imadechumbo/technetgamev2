import { Router } from 'express';
import multer from 'multer';
import {
  clearMemoryForToken,
  createAttachmentRecords,
  createDemoAccess,
  deleteSessionById,
  generateAssistantAnswer,
  getMemoryForToken,
  getOpenClawState,
  getSessionById,
  getUsageForToken,
  listModels,
  listSessionsForToken,
  listVisionAgents,
  requireUserFromToken,
  splitIntoTokenChunks,
  generateVisionAnswer,
} from '../services/aiService.js';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024, files: 10 } });
const getBearerToken = (req) => String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();

function optionalAuth(req, _res, next) {
  const token = getBearerToken(req);
  if (!token) {
    req.auth = null;
    next();
    return;
  }
  try {
    req.auth = requireUserFromToken(token);
  } catch (_error) {
    req.auth = null;
  }
  next();
}

function requireAuth(req, _res, next) {
  try {
    req.auth = requireUserFromToken(getBearerToken(req));
    next();
  } catch (error) {
    next(error);
  }
}

function resolveToken(req) {
  if (req.auth?.token) return req.auth.token;
  const raw = getBearerToken(req);
  return raw || null;
}

router.get('/health', (_req, res) => res.json({ ok: true, status: 'ok', service: 'technet-ai-backend', environment: process.env.NODE_ENV || 'development', time: new Date().toISOString() }));
router.get('/models', (_req, res) => res.json({ ok: true, models: listModels() }));
router.get('/vision/agents', (_req, res) => res.json({ ok: true, agents: listVisionAgents() }));
router.post('/auth/demo', (_req, res) => { const { token, user } = createDemoAccess(); res.json({ ok: true, token, user, mode: 'demo-open' }); });
router.get('/auth/demo', (_req, res) => { const { token, user } = createDemoAccess(); res.json({ ok: true, token, user, mode: 'demo-open' }); });
router.post('/demo', (_req, res) => { const { token, user } = createDemoAccess(); res.json({ ok: true, token, user, mode: 'demo-open' }); });
router.get('/demo', (_req, res) => { const { token, user } = createDemoAccess(); res.json({ ok: true, token, user, mode: 'demo-open' }); });
router.get('/auth/me', optionalAuth, (req, res) => {
  const token = resolveToken(req);
  if (!token) {
    return res.json({ ok: true, user: { id: 'guest', email: 'guest@technet.local', plan: 'open' }, usage: { usedToday: 0, limit: 999, effectivePlan: 'open' } });
  }
  return res.json({ ok: true, ...getUsageForToken(token) });
});
router.get('/memory', optionalAuth, (req, res) => {
  const token = resolveToken(req);
  if (!token) return res.json({ ok: true, memory: null });
  return res.json({ ok: true, memory: getMemoryForToken(token) });
});
router.delete('/memory', optionalAuth, (req, res) => {
  const token = resolveToken(req);
  if (!token) return res.json({ ok: true, cleared: true });
  return res.json(clearMemoryForToken(token));
});
router.post('/uploads/attachments', optionalAuth, upload.array('attachments', 10), (req, res) => { const files = Array.isArray(req.files) ? req.files : []; res.json({ ok: true, uploads: createAttachmentRecords(files) }); });
router.get('/chat/sessions', optionalAuth, (req, res) => {
  const token = resolveToken(req);
  if (!token) return res.json({ ok: true, sessions: [] });
  return res.json({ ok: true, sessions: listSessionsForToken(token) });
});
router.get('/chat/:id', optionalAuth, (req, res, next) => { try { const token = resolveToken(req); if (!token) return res.status(404).json({ ok: false, error: 'Sessão não encontrada' }); res.json({ ok: true, ...getSessionById(token, req.params.id) }); } catch (error) { next(error); } });
router.delete('/chat/:id', optionalAuth, (req, res, next) => { try { const token = resolveToken(req); if (!token) return res.json({ ok: true, id: req.params.id, skipped: true }); res.json(deleteSessionById(token, req.params.id)); } catch (error) { next(error); } });
router.post('/chat', optionalAuth, async (req, res, next) => { try { const result = await generateAssistantAnswer({ token: resolveToken(req), message: String(req.body.message || '').trim(), sessionId: req.body.sessionId, model: req.body.model, mode: req.body.mode, agent: req.body.agent, provider: req.body.provider, attachments: Array.isArray(req.body.attachments) ? req.body.attachments : [] }); res.json({ ok: true, ...result }); } catch (error) { next(error); } });
router.post('/chat/vision', optionalAuth, upload.single('image'), async (req, res, next) => {
  try {
    // Gate 1: imagem obrigatória — 400 se ausente (alinha com vision_contract_gate.py)
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'Envie um arquivo de imagem no campo "image" (multipart/form-data).' });
    }

    // Gate 2: corrigir null.mimetype — garante mimetype válido antes de passar ao service
    if (!req.file.mimetype || req.file.mimetype === 'null' || req.file.mimetype === 'undefined') {
      const ext = String(req.file.originalname || '').split('.').pop().toLowerCase();
      const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' };
      req.file.mimetype = mimeMap[ext] || 'image/png';
    }

    const result = await generateVisionAnswer({
      token: resolveToken(req),
      message: String(req.body.message || '').trim(),
      sessionId: req.body.sessionId,
      model: req.body.model,
      mode: req.body.mode,
      agent: req.body.agent,
      provider: req.body.provider,
      visionAgent: String(req.body.visionAgent || req.query.agent || 'default').trim(),
      imageFile: req.file,
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});
router.post('/vision', optionalAuth, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'Envie um arquivo de imagem no campo "image" (multipart/form-data).' });
    }
    if (!req.file.mimetype || req.file.mimetype === 'null' || req.file.mimetype === 'undefined') {
      const ext = String(req.file.originalname || '').split('.').pop().toLowerCase();
      const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' };
      req.file.mimetype = mimeMap[ext] || 'image/png';
    }
    const result = await generateVisionAnswer({
      token: resolveToken(req),
      message: String(req.body.message || '').trim(),
      sessionId: req.body.sessionId,
      model: req.body.model,
      mode: req.body.mode,
      agent: req.body.agent,
      provider: req.body.provider,
      visionAgent: String(req.body.visionAgent || req.query.agent || 'default').trim(),
      imageFile: req.file,
    });
    res.json({ ok: true, ...result });
  } catch (error) {
    next(error);
  }
});
router.post('/stream', optionalAuth, async (req, res, next) => {
  try {
    const data = await generateAssistantAnswer({ token: resolveToken(req), message: String(req.body.message || '').trim(), sessionId: req.body.sessionId, model: req.body.model, mode: req.body.mode, agent: req.body.agent, provider: req.body.provider, attachments: Array.isArray(req.body.attachments) ? req.body.attachments : [] });
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(`data: ${JSON.stringify({ type: 'agent', agentSystem: data.agentSystem, sessionId: data.sessionId, provider: data.provider, model: data.model })}

`);
    for (const tokenChunk of splitIntoTokenChunks(data.answer)) {
      res.write(`data: ${JSON.stringify({ type: 'token', token: tokenChunk })}

`);
      await new Promise((resolve) => setTimeout(resolve, 18));
    }
    res.write(`data: ${JSON.stringify({ type: 'done', sessionId: data.sessionId, agentSystem: data.agentSystem, provider: data.provider, model: data.model })}

`);
    res.end();
  } catch (error) { next(error); }
});
router.post('/chat/stream', optionalAuth, async (req, res, next) => {
  try {
    const data = await generateAssistantAnswer({ token: resolveToken(req), message: String(req.body.message || '').trim(), sessionId: req.body.sessionId, model: req.body.model, mode: req.body.mode, agent: req.body.agent, provider: req.body.provider, attachments: Array.isArray(req.body.attachments) ? req.body.attachments : [] });
    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();
    res.write(`data: ${JSON.stringify({ type: 'agent', agentSystem: data.agentSystem, sessionId: data.sessionId, provider: data.provider, model: data.model })}

`);
    for (const tokenChunk of splitIntoTokenChunks(data.answer)) {
      res.write(`data: ${JSON.stringify({ type: 'token', token: tokenChunk })}

`);
      await new Promise((resolve) => setTimeout(resolve, 18));
    }
    res.write(`data: ${JSON.stringify({ type: 'done', sessionId: data.sessionId, agentSystem: data.agentSystem, provider: data.provider, model: data.model })}

`);
    res.end();
  } catch (error) { next(error); }
});
router.get('/system/openclaw-status', (_req, res) => { const state = getOpenClawState(); res.json({ ok: true, status: 'online', mode: 'bridge', providers: state.providers || [state.provider], models: [state.defaultModel, state.fallbackModel, state.geminiModel, state.deepseekModel].filter(Boolean), routingCount: Object.keys(state.agentRouting || {}).length, ...state }); });
router.get('/system/openclaw-profile', (_req, res) => { const state = getOpenClawState(); res.json({ ok: true, profile: { name: 'OpenClaw Command', provider: state.provider, defaultModel: state.defaultModel, mode: 'multi-agent', openclawCompatible: { agentRouting: state.agentRouting || {}, agentModels: state.agentModels || {} } } }); });
router.get('/system/openclaw-settings', (_req, res) => { const state = getOpenClawState(); res.json({ ok: true, settings: { enabled: state.enabled, provider: state.provider, providers: state.providers || [state.provider], defaultModel: state.defaultModel, fallbackModel: state.fallbackModel, geminiModel: state.geminiModel, deepseekModel: state.deepseekModel, publicDomain: state.publicDomain, streaming: true, uploads: true, routing: state.agentRouting || {} } }); });

export default router;