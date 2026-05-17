import { Router } from 'express';
import { clearGameCoverCache, resolveGameCover } from '../services/gameCoverService.js';

const router = Router();

router.get('/cover', async (req, res, next) => {
  try {
    const title = String(req.query.title || req.query.q || '').trim();
    if (!title) {
      return res.status(400).json({ ok: false, error: 'title é obrigatório' });
    }

    const payload = await resolveGameCover(title);
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
