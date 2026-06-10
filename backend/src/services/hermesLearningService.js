
import { getLatest } from './feedService.js';
import {
  applyPenalties,
  calculateRanking,
  createStrategicSummary,
  readReport,
  summarizeTrends,
  writeReport
} from './hermesService.js';
import { askQwen, getHermesProviderStatus, isQwenConfigured } from './qwenService.js';

function formatPrompt(period, trends, ranking, penalties) {
  const trendText = trends.map((item) => `${item.slug}:${item.total}`).join(', ');
  const rankingText = ranking.map((item) => `${item.label}:${item.score}`).join(', ');
  const penaltyText = penalties.map((item) => `${item.label}:${item.appliedWeight}`).join(', ') || 'nenhuma';
  return [
    `Crie um resumo editorial em pt-BR para o período ${period}.`,
    `Tendências: ${trendText || 'nenhuma'}.`,
    `Ranking de agentes: ${rankingText || 'nenhum'}.`,
    `Ajustes: ${penaltyText}.`,
    'Responda em até 110 palavras, com tom executivo, claro e próprio de relatório premium.'
  ].join(' ');
}

export async function learnFromNews({ period = 'monthly', limit = 60 } = {}) {
  const existing = await readReport(period);
  const payload = await getLatest(limit);
  const newsList = Array.isArray(payload?.items)
    ? payload.items
    : Array.isArray(payload?.data)
      ? payload.data
      : [];

  const ranking = calculateRanking(newsList);
  const trends = summarizeTrends(newsList);
  const { weights, penalties, agentStats } = applyPenalties(ranking, existing.weights, existing.agentStats);

  let summary = createStrategicSummary({ period, ranking, trends, penalties });
  let ai = { ok: false, provider: null, model: null, content: '', failures: [] };

  if (isQwenConfigured() && newsList.length) {
    ai = await askQwen(formatPrompt(period, trends, ranking, penalties));
    if (ai.ok && ai.content) {
      summary = ai.content.trim();
    }
  }

  const report = await writeReport(period, {
    ...existing,
    summary,
    trends,
    ranking,
    weights,
    penalties,
    agentStats,
    providers: {
      lastUsed: ai.provider,
      fallbackUsed: Boolean(ai.fallbackUsed),
      failures: ai.failures || [],
      available: getHermesProviderStatus()
    },
    sourceStats: payload?.meta?.byCategory || payload?.meta?.categories || {},
    totals: {
      itemsProcessed: newsList.length,
      categoriesSeen: trends.length,
      agentsTracked: ranking.length
    },
    learning: {
      runs: Number(existing?.learning?.runs || 0) + 1,
      lastRunAt: new Date().toISOString(),
      status: ai.ok || !isQwenConfigured() ? 'ok' : 'degraded',
      llm: ai.ok
        ? { enabled: true, provider: ai.provider, model: ai.model, fallbackUsed: Boolean(ai.fallbackUsed) }
        : { enabled: false, reason: ai.error || 'not_configured', failures: ai.failures || [] }
    },
    generatedAt: new Date().toISOString()
  });

  return report;
}
