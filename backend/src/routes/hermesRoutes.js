
import { Router } from 'express';
import { learnFromNews } from '../services/hermesLearningService.js';
import { getAgentMeta, readReport } from '../services/hermesService.js';
import { askQwen, getHermesProviderStatus, isQwenConfigured } from '../services/qwenService.js';
import { buildLiveCouncil } from '../services/hermesCouncilService.js';

const router = Router();

router.get('/status', async (_req, res) => {
  const monthly = await readReport('monthly');
  res.json({
    ok: true,
    hermes: {
      enabled: String(process.env.HERMES_ENABLED || 'true') === 'true',
      mode: process.env.HERMES_MODE || 'strategic',
      role: process.env.HERMES_ROLE || 'memory-admin'
    },
    configured: {
      llm: isQwenConfigured(),
      providers: getHermesProviderStatus()
    },
    learning: monthly.learning,
    updatedAt: monthly.updatedAt,
    agents: getAgentMeta()
  });
});


router.get('/live-council', async (req, res, next) => {
  try {
    const council = await buildLiveCouncil({
      topic: String(req.query?.topic || '').trim(),
      period: String(req.query?.period || 'monthly').trim().toLowerCase()
    });
    res.set('Cache-Control', 'public, max-age=45, s-maxage=45, stale-while-revalidate=30');
    res.json(council);
  } catch (error) {
    next(error);
  }
});

router.get('/agents', async (_req, res) => {
  const monthly = await readReport('monthly');
  res.json({
    ok: true,
    agents: getAgentMeta(),
    weights: monthly.weights,
    penalties: monthly.penalties,
    agentStats: monthly.agentStats,
    ranking: monthly.ranking
  });
});

router.post('/relearn', async (req, res, next) => {
  try {
    const period = String(req.body?.period || 'monthly');
    const limit = Number(req.body?.limit || 60);
    const report = await learnFromNews({ period, limit });
    res.json({ ok: true, report });
  } catch (error) {
    next(error);
  }
});

router.post('/qwen-test', async (req, res, next) => {
  try {
    const prompt = String(req.body?.prompt || 'Resuma o papel do Hermes no TechNetGame em 3 frases.').trim();
    const result = await askQwen(prompt, { max_tokens: 250 });
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.get('/:period', async (req, res, next) => {
  try {
    const report = await readReport(req.params.period);
    res.set('Cache-Control', 'public, max-age=300, s-maxage=300, stale-while-revalidate=120');
    res.json(report);
  } catch (error) {
    next(error);
  }
});

router.post('/:period/generate', async (req, res, next) => {
  try {
    const report = await learnFromNews({
      period: req.params.period,
      limit: Number(req.body?.limit || req.query?.limit || 60)
    });
    res.json({ ok: true, report });
  } catch (error) {
    next(error);
  }
});

export default router;
