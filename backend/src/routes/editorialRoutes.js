import { Router } from 'express';
import {
  generateEditorialSnapshot,
  getEditorialAgents,
  getEditorialBreaking,
  getEditorialHome,
  getEditorialLogs,
  getEditorialMonth,
  getEditorialWeek,
} from '../services/openclawEditorialService.js';

const router = Router();

router.get('/home', async (_req, res, next) => {
  try { res.json(await getEditorialHome()); } catch (error) { next(error); }
});

router.get('/week', async (_req, res, next) => {
  try { res.json(await getEditorialWeek()); } catch (error) { next(error); }
});

router.get('/month', async (_req, res, next) => {
  try { res.json(await getEditorialMonth()); } catch (error) { next(error); }
});

router.get('/breaking', async (_req, res, next) => {
  try { res.json(await getEditorialBreaking()); } catch (error) { next(error); }
});

router.get('/agents', async (_req, res, next) => {
  try { res.json(await getEditorialAgents()); } catch (error) { next(error); }
});

router.get('/logs', async (_req, res, next) => {
  try { res.json(await getEditorialLogs()); } catch (error) { next(error); }
});

router.post('/refresh', async (_req, res, next) => {
  try { res.json({ ok: true, ...(await generateEditorialSnapshot()) }); } catch (error) { next(error); }
});

export default router;
