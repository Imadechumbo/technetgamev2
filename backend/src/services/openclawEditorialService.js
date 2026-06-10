import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getCache } from './feedService.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STORE_FILE = path.resolve(__dirname, '../../data/editorial-store.json');

const AGENTS = [
  {
    slug: 'tech',
    name: 'Analista Técnico',
    category: 'technology',
    personality: 'Lógico, direto e focado em resolver arquitetura, software e plataformas.',
    marketing: 'Filtra o que realmente importa em software, nuvem, ecossistemas e big tech.'
  },
  {
    slug: 'games',
    name: 'Especialista Games',
    category: 'games',
    personality: 'Energético, focado em tendência, UX, comunidade e performance.',
    marketing: 'Prioriza novidades com real impacto para jogadores, estúdios e plataformas.'
  },
  {
    slug: 'market',
    name: 'Analista de Mercado',
    category: 'empresas',
    personality: 'Analítico, calculista, atento a ROI, movimentos corporativos e estratégia.',
    marketing: 'Destaca movimentos que realmente mexem com negócios, ecossistemas e valuation.'
  },
  {
    slug: 'security',
    name: 'Especialista Segurança',
    category: 'security',
    personality: 'Cauteloso, rigoroso e atento a riscos, ameaças e vulnerabilidades.',
    marketing: 'Dá peso extra a alertas críticos, ataques, vazamentos e resposta a incidentes.'
  },
  {
    slug: 'ai',
    name: 'Analista IA',
    category: 'ai',
    personality: 'Altamente inteligente, orientado a modelos, dados, automação e inovação.',
    marketing: 'Escolhe as notícias que realmente mudam o jogo em IA, dados e automação.'
  },
  {
    slug: 'hardware',
    name: 'Especialista Hardware',
    category: 'hardware',
    personality: 'Prático, focado em especificações, desempenho, compatibilidade e eficiência.',
    marketing: 'Realça lançamentos e comparativos com impacto técnico real para gamers e power users.'
  }
];

const SOURCE_WEIGHTS = {
  'playstation-blog': 10,
  'xbox-wire': 10,
  'xbox-wire-ptbr': 10,
  'steam-news': 9,
  'nintendo-news': 8,
  'google-blog': 9,
  'apple-newsroom': 9,
  'cisa-news': 10,
  'enisa-news': 8,
  'nvidia-newsroom': 9,
  'amd-news': 8,
  'intel-newsroom': 8
};

const KEYWORD_WEIGHTS = [
  [/vazad|leak|rumou?r|breaking|urgente|ultima hora/i, 12],
  [/lan[çc]a|launch|release|chega|estreia|dispon[ií]vel/i, 8],
  [/playstation|xbox|nintendo|steam|valve|apple|google|gemini|nvidia|amd|intel|security|vulnerab|ataque|gpu|cpu|ia|ai/i, 6],
  [/review|benchmark|hands on|comparativo|teste|an[aá]lise/i, 5],
];

function nowIso() { return new Date().toISOString(); }
function normalize(v='') { return String(v||'').replace(/\s+/g,' ').trim(); }
function escapeHtml(v='') { return String(v||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c])); }

async function readStore() {
  try {
    return JSON.parse(await fs.readFile(STORE_FILE, 'utf-8'));
  } catch {
    return { generatedAt: null, home: [], week: [], month: [], breaking: [], exclusives: [], logs: [], agents: AGENTS };
  }
}

async function writeStore(payload) {
  await fs.mkdir(path.dirname(STORE_FILE), { recursive: true });
  await fs.writeFile(STORE_FILE, JSON.stringify(payload, null, 2), 'utf-8');
  return payload;
}

function inferAgent(item={}) {
  const category = String(item.category || '').toLowerCase();
  if (['technology'].includes(category)) return 'tech';
  if (['security'].includes(category)) return 'security';
  if (['hardware'].includes(category)) return 'hardware';
  if (['ai'].includes(category)) return 'ai';
  if (['sony','nintendo','microsoft','valve','games'].includes(category)) return 'games';
  return 'market';
}

function scoreItem(item={}) {
  const title = normalize(item.title);
  const summary = normalize(item.summary);
  const text = `${title} ${summary}`;
  const published = new Date(item.publishedAt || Date.now()).getTime();
  const ageHours = Math.max(1, (Date.now() - published) / 36e5);
  let score = 45;
  score += Math.max(0, 18 - ageHours * 0.25);
  score += Math.min(summary.length / 48, 8);
  score += item.image ? 4 : 0;
  score += SOURCE_WEIGHTS[item.sourceSlug] || 4;
  for (const [pattern, weight] of KEYWORD_WEIGHTS) {
    if (pattern.test(text)) score += weight;
  }
  if (item.isOfficial) score += 6;
  if ((item.tags || []).length) score += Math.min(item.tags.length, 4);
  return Math.round(Math.max(0, Math.min(100, score)));
}

function buildReason(item, score, agentSlug) {
  const agent = AGENTS.find(a => a.slug === agentSlug);
  const reason = [];
  if (score >= 80) reason.push('alto impacto editorial');
  if (/vazad|leak|rumou?r|breaking|urgente|ultima hora/i.test(`${item.title} ${item.summary}`)) reason.push('potencial de exclusiva ou vazamento');
  if (item.isOfficial) reason.push('fonte oficial');
  if (item.image) reason.push('bom potencial visual para home');
  reason.push(`avaliada por ${agent?.name || 'OpenClaw'}`);
  return reason.join(', ');
}

function enrichItem(item={}) {
  const agent = inferAgent(item);
  const score = scoreItem(item);
  const exclusive = /vazad|leak|rumou?r|breaking|urgente|ultima hora/i.test(`${item.title} ${item.summary}`) || score >= 85;
  return {
    ...item,
    openclaw: {
      score,
      agent,
      exclusive,
      reason: buildReason(item, score, agent),
      decisionAt: nowIso(),
    }
  };
}

function sortByScore(items=[]) {
  return [...items].sort((a,b)=> (b.openclaw?.score||0) - (a.openclaw?.score||0) || new Date(b.publishedAt||0)-new Date(a.publishedAt||0));
}

function dedupe(items=[]) {
  const seen = new Set();
  const out = [];
  for (const item of items) {
    const key = `${normalize(item.title).toLowerCase()}::${String(item.sourceSlug||'')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

export async function generateEditorialSnapshot() {
  const cache = await getCache();
  const sourceItems = Array.isArray(cache?.items) ? cache.items : [];
  const enriched = sortByScore(dedupe(sourceItems.map(enrichItem)));
  const week = enriched.slice(0, 18);
  const month = enriched.slice(0, 30);
  const home = enriched.slice(0, 6);
  const breaking = enriched.filter(item => item.openclaw.exclusive).slice(0, 6);
  const exclusives = breaking.slice(0, 3);
  const payload = {
    generatedAt: nowIso(),
    home,
    week,
    month,
    breaking,
    exclusives,
    agents: AGENTS,
    logs: enriched.slice(0, 20).map(item => ({
      id: item.id,
      title: item.title,
      score: item.openclaw.score,
      agent: item.openclaw.agent,
      reason: item.openclaw.reason,
      publishedAt: item.publishedAt,
    }))
  };
  await writeStore(payload);
  return payload;
}

export async function getEditorialSnapshot(force = false) {
  if (force) return generateEditorialSnapshot();
  const current = await readStore();
  if (!current.generatedAt) return generateEditorialSnapshot();
  const ageMin = (Date.now() - new Date(current.generatedAt).getTime()) / 60000;
  if (!Number.isFinite(ageMin) || ageMin > 35) return generateEditorialSnapshot();
  return current;
}

export async function getEditorialHome() {
  const snapshot = await getEditorialSnapshot();
  return {
    ok: true,
    generatedAt: snapshot.generatedAt,
    marketing: {
      title: 'Powered by TechNet AI Agents',
      description: 'Nossas notícias são analisadas por um sistema de inteligência artificial com múltiplos agentes especializados, tendo suas próprias personalidades, garantindo que apenas os conteúdos mais relevantes, impactantes e confiáveis de cada nicho cheguem até você.'
    },
    agents: snapshot.agents,
    home: snapshot.home,
    breaking: snapshot.breaking.slice(0, 3),
    exclusives: snapshot.exclusives,
  };
}

export async function getEditorialWeek() {
  const snapshot = await getEditorialSnapshot();
  return { ok: true, generatedAt: snapshot.generatedAt, items: snapshot.week, agents: snapshot.agents };
}

export async function getEditorialMonth() {
  const snapshot = await getEditorialSnapshot();
  return { ok: true, generatedAt: snapshot.generatedAt, items: snapshot.month, breaking: snapshot.breaking, exclusives: snapshot.exclusives, agents: snapshot.agents };
}

export async function getEditorialBreaking() {
  const snapshot = await getEditorialSnapshot();
  return { ok: true, generatedAt: snapshot.generatedAt, items: snapshot.breaking, exclusives: snapshot.exclusives };
}

export async function getEditorialAgents() {
  const snapshot = await getEditorialSnapshot();
  return { ok: true, agents: snapshot.agents };
}

export async function getEditorialLogs() {
  const snapshot = await getEditorialSnapshot();
  return { ok: true, generatedAt: snapshot.generatedAt, logs: snapshot.logs };
}
