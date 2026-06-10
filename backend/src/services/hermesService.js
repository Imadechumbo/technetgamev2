
import fs from 'fs/promises';
import path from 'path';

const STORE_DIR = path.resolve(process.cwd(), 'src/data/hermes');
const PERIODS = new Set(['weekly', 'monthly', 'quarterly', 'yearly']);
const AGENT_META = {
  tecnico: { label: 'Analista Técnico', color: 'blue', categoryHints: ['technology', 'internet'] },
  gamer: { label: 'Especialista Games', color: 'purple', categoryHints: ['games', 'valve', 'sony', 'microsoft', 'nintendo'] },
  mercado: { label: 'Analista de Mercado', color: 'green', categoryHints: ['market', 'business'] },
  seguranca: { label: 'Especialista Segurança', color: 'red', categoryHints: ['security'] },
  ia: { label: 'Analista IA', color: 'cyan', categoryHints: ['ai'] },
  hardware: { label: 'Especialista Hardware', color: 'orange', categoryHints: ['hardware'] }
};

function normalizePeriod(period = 'monthly') {
  const clean = String(period || '').trim().toLowerCase();
  if (PERIODS.has(clean)) return clean;
  return 'monthly';
}

async function ensureStoreDir() {
  await fs.mkdir(STORE_DIR, { recursive: true });
}

function getFileForPeriod(period) {
  return path.join(STORE_DIR, `${normalizePeriod(period)}.json`);
}

function nowIso() {
  return new Date().toISOString();
}

export function buildDefaultWeights() {
  return Object.fromEntries(Object.keys(AGENT_META).map((key) => [key, 1]));
}

function buildDefaultStats() {
  return Object.fromEntries(Object.keys(AGENT_META).map((key) => [key, { weight: 1, score: 0, wins: 0, penalties: 0, recoveries: 0, lastSeenAt: null }]));
}

function envNumber(name, fallback) {
  const raw = process.env[name];
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function clamp(num, min, max) {
  return Math.min(max, Math.max(min, num));
}

function minWeight() {
  return envNumber('HERMES_AGENT_MIN_SCORE', 0.2);
}

function maxWeight() {
  return envNumber('HERMES_AGENT_MAX_SCORE', 1.0);
}

function penaltyMultiplier() {
  return envNumber('HERMES_AGENT_PENALTY_MULTIPLIER', 0.7);
}

function recoveryRate() {
  return envNumber('HERMES_AGENT_RECOVERY_RATE', 0.03);
}

function scoreDecay() {
  return envNumber('HERMES_AGENT_SCORE_DECAY', 0.05);
}

function confidenceThreshold() {
  return envNumber('HERMES_DECISION_CONFIDENCE_THRESHOLD', 0.65);
}

function defaultReport(period = 'monthly') {
  const now = nowIso();
  return {
    ok: true,
    period: normalizePeriod(period),
    summary: '',
    trends: [],
    ranking: [],
    weights: buildDefaultWeights(),
    penalties: [],
    sourceStats: {},
    providers: {
      lastUsed: null,
      fallbackUsed: false,
      failures: []
    },
    agentStats: buildDefaultStats(),
    decisionEngine: {
      enabled: String(process.env.HERMES_DECISION_ENGINE || 'true') === 'true',
      threshold: confidenceThreshold(),
      strictMode: String(process.env.HERMES_DECISION_STRICT_MODE || 'false') === 'true'
    },
    totals: {
      itemsProcessed: 0,
      categoriesSeen: 0,
      agentsTracked: Object.keys(AGENT_META).length
    },
    learning: {
      runs: 0,
      lastRunAt: null,
      status: 'idle'
    },
    updatedAt: now,
    generatedAt: now
  };
}

export async function readReport(period = 'monthly') {
  await ensureStoreDir();
  const file = getFileForPeriod(period);
  try {
    const raw = await fs.readFile(file, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      ...defaultReport(period),
      ...parsed,
      ok: true,
      period: normalizePeriod(period),
      weights: { ...buildDefaultWeights(), ...(parsed.weights || {}) },
      agentStats: { ...buildDefaultStats(), ...(parsed.agentStats || {}) }
    };
  } catch {
    const fallback = defaultReport(period);
    await writeReport(period, fallback);
    return fallback;
  }
}

export async function writeReport(period = 'monthly', payload = {}) {
  await ensureStoreDir();
  const normalized = normalizePeriod(period);
  const base = defaultReport(normalized);
  const merged = {
    ...base,
    ...payload,
    ok: true,
    period: normalized,
    weights: { ...base.weights, ...(payload.weights || {}) },
    agentStats: { ...base.agentStats, ...(payload.agentStats || {}) },
    updatedAt: nowIso()
  };
  await fs.writeFile(getFileForPeriod(normalized), JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

export function inferAgentFromItem(item = {}) {
  const category = String(item.category || '').trim().toLowerCase();
  const source = String(item.sourceSlug || item.source || '').trim().toLowerCase();
  const title = `${item.title || ''} ${item.summary || ''}`.toLowerCase();

  if (category === 'security' || /security|seguran|vulnerab|ransom|malware|breach/.test(title)) return 'seguranca';
  if (category === 'hardware' || /gpu|cpu|chip|rtx|radeon|intel arc|hardware/.test(title)) return 'hardware';
  if (category === 'ai' || /ai|ia|model|llm|agent|copilot|gemini|openai|anthropic/.test(title)) return 'ia';
  if (['sony', 'microsoft', 'nintendo', 'valve', 'games'].includes(category) || /game|playstation|xbox|steam|nintendo|switch/.test(`${title} ${source}`)) return 'gamer';
  if (category === 'technology' || /android|ios|apple|google|microsoft|technology|tech/.test(`${title} ${source}`)) return 'tecnico';
  if (/market|business|finance|earnings|stocks|revenue|mercado/.test(`${title} ${source}`)) return 'mercado';
  return 'tecnico';
}

export function calculateRanking(newsList = []) {
  const scores = new Map();
  for (const item of newsList) {
    const agent = inferAgentFromItem(item);
    scores.set(agent, (scores.get(agent) || 0) + 1);
  }

  return Array.from(scores.entries())
    .map(([agent, score]) => ({
      agent,
      label: AGENT_META[agent]?.label || agent,
      score,
      weight: scoreToWeight(score, Math.max(newsList.length, 1))
    }))
    .sort((a, b) => b.score - a.score);
}

export function scoreToWeight(score = 0, total = 1) {
  const normalized = total > 0 ? score / total : 0;
  return Number(clamp(minWeight() + normalized * 1.5, minWeight(), Math.max(1.25, maxWeight())).toFixed(2));
}

export function applyPenalties(ranking = [], previousWeights = {}, previousStats = {}) {
  const nextWeights = { ...buildDefaultWeights(), ...previousWeights };
  const nextStats = { ...buildDefaultStats(), ...previousStats };
  const penalties = [];
  const topScore = Math.max(...ranking.map((item) => Number(item.score) || 0), 1);
  const threshold = confidenceThreshold();

  for (const key of Object.keys(nextStats)) {
    nextStats[key] = {
      ...buildDefaultStats()[key],
      ...(previousStats[key] || {}),
      score: Number(previousStats[key]?.score || 0) * (1 - scoreDecay())
    };
  }

  for (const item of ranking) {
    const ratio = (Number(item.score) || 0) / topScore;
    const previousWeight = Number(nextWeights[item.agent] || 1);
    const current = nextStats[item.agent] || buildDefaultStats()[item.agent];
    const baseWeight = clamp(0.2 + ratio, minWeight(), maxWeight());

    let finalWeight = baseWeight;
    let wasPenalized = false;

    if (ratio < threshold) {
      finalWeight = clamp(previousWeight * penaltyMultiplier(), minWeight(), maxWeight());
      wasPenalized = true;
      penalties.push({
        agent: item.agent,
        label: item.label,
        reason: 'Baixa relevância relativa no ciclo atual',
        appliedWeight: Number(finalWeight.toFixed(2)),
        ratio: Number(ratio.toFixed(2))
      });
    } else {
      finalWeight = clamp(Math.max(baseWeight, previousWeight + recoveryRate()), minWeight(), maxWeight());
    }

    nextWeights[item.agent] = Number(finalWeight.toFixed(2));
    nextStats[item.agent] = {
      ...current,
      weight: nextWeights[item.agent],
      score: Number((current.score + item.score).toFixed(2)),
      wins: current.wins + (ratio >= threshold ? 1 : 0),
      penalties: current.penalties + (wasPenalized ? 1 : 0),
      recoveries: current.recoveries + (!wasPenalized ? 1 : 0),
      lastSeenAt: nowIso()
    };
  }

  return { weights: nextWeights, penalties, agentStats: nextStats };
}

export function summarizeTrends(newsList = []) {
  const counts = new Map();
  for (const item of newsList) {
    const category = String(item.category || 'general').toLowerCase();
    counts.set(category, (counts.get(category) || 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([slug, total]) => ({ slug, total }));
}

export function createStrategicSummary({ period = 'monthly', ranking = [], trends = [], penalties = [] } = {}) {
  const topAgent = ranking[0]?.label || 'Nenhum agente';
  const trendText = trends.slice(0, 3).map((item) => item.slug).join(', ') || 'sem tendências claras';
  const penaltyText = penalties.length
    ? ` Ajustes aplicados em ${penalties.map((item) => item.label).join(', ')}.`
    : ' Nenhum agente precisou de ajuste crítico.';

  return `Hermes consolidou o relatório ${period}. O agente líder foi ${topAgent}. As frentes mais fortes do período foram ${trendText}.${penaltyText}`;
}

export function getAgentMeta() {
  return AGENT_META;
}
