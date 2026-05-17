import { Router } from 'express';
import { resolveGameCover } from '../services/gameCoverService.js';

const router = Router();

router.get('/cover', async (req, res) => {
  const q = String(req.query.q || '').trim();
  if (!q) return res.status(400).json({ ok: false, error: 'Missing q', cover: null, candidates: [] });

  try {
    const payload = await resolveGameCover(q);
    res.set('Cache-Control', payload.ok ? 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=600' : 'no-store');
    return res.json(payload);
  } catch (error) {
    console.warn('[games-route] cover resolver failed', error?.message || error);
    res.set('Cache-Control', 'no-store');
    return res.json({ ok: false, query: q, cover: null, candidates: [], error: 'cover-resolver-failed' });
  }
});

export default router;
