import { Router } from 'express';
import { runHermesV2 } from '../services/hermesV2Service.js';

const router = Router();

router.get('/status', async (_req, res) => {
  res.json({
    ok: true,
    version: 'v2',
    skills: ['Editorial', 'Critical', 'Moderator'],
    modules: ['Router', 'Consensus Engine', 'Critical Layer', 'Memory Layer', 'Community Layer'],
    bridge: 'TechNet AI',
    provider: 'qwen'
  });
});

router.post('/run', async (req, res, next) => {
  try {
    const result = await runHermesV2(req.body || {});
    res.json({ ok: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
