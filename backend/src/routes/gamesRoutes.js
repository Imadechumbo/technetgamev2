import { Router } from 'express';
import { clearGameCoverCache, resolveGameCover } from '../services/gameCoverService.js';

const router = Router();

router.get('/cover', async (req, res, next) => {
  try {
    const query = String(req.query.q || req.query.query || req.query.title || '').trim();
    if (!query) {
      return res.status(400).json({ ok: false, error: 'q é obrigatório' });
    }

    const payload = await resolveGameCover(query);
    return res.json(payload);
  } catch (error) {
    return next(error);
  }
});

router.post('/cover/cache/clear', (_req, res, next) => {
  try {
    return res.json(clearGameCoverCache());
  } catch (error) {
    return next(error);
  }
});

export default router;
