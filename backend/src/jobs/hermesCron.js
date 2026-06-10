
import cron from 'node-cron';
import { learnFromNews } from '../services/hermesLearningService.js';

let jobStarted = false;

export function startHermesCron() {
  if (jobStarted || String(process.env.HERMES_REPORTS_ENABLED || 'true') !== 'true') return;
  jobStarted = true;

  const schedule = process.env.HERMES_CRON || '15 */2 * * *';
  cron.schedule(schedule, async () => {
    try {
      console.log('[hermes] ciclo automático iniciado');
      if (String(process.env.HERMES_REPORT_WEEKLY || 'true') === 'true') {
        await learnFromNews({ period: 'weekly', limit: Number(process.env.HERMES_NEWS_LIMIT || 60) });
      }
      if (String(process.env.HERMES_REPORT_MONTHLY || 'true') === 'true') {
        await learnFromNews({ period: 'monthly', limit: Number(process.env.HERMES_NEWS_LIMIT || 60) });
      }
      if (String(process.env.HERMES_REPORT_QUARTERLY || 'true') === 'true') {
        await learnFromNews({ period: 'quarterly', limit: Number(process.env.HERMES_NEWS_LIMIT || 90) });
      }
      console.log('[hermes] relatórios atualizados');
    } catch (error) {
      console.error('[hermes] erro no cron:', error?.message || error);
    }
  });

  console.log(`[hermes] cron agendado em "${schedule}"`);
}
