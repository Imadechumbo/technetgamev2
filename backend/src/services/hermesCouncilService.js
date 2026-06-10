import { getCache, getRefreshStatus } from './feedService.js';
import { getEditorialSnapshot } from './openclawEditorialService.js';
import { readReport } from './hermesService.js';

const AGENTS = {
  ai: {
    key: 'ai',
    reportKey: 'ia',
    name: 'Analista IA',
    label: 'IA & Dados',
    image: 'assets/img/openclaw-agents/analista-ia.png',
    position: 'top-left',
    color: 'rgba(90, 247, 255, 0.24)',
    focus: 'Automação, leitura de sinais e priorização algorítmica.',
    keywords: ['ai', 'ia', 'llm', 'modelo', 'model', 'agent', 'agente', 'copilot', 'gemini', 'openai', 'anthropic', 'dados', 'automação', 'automation', 'inference', 'inferência']
  },
  games: {
    key: 'games',
    reportKey: 'gamer',
    name: 'Especialista Games',
    label: 'Jogos',
    image: 'assets/img/openclaw-agents/especialista-games.png',
    position: 'top-right',
    color: 'rgba(191, 112, 255, 0.22)',
    focus: 'Hype, comunidade, interesse imediato e CTR.',
    keywords: ['game', 'games', 'jogo', 'jogos', 'steam', 'playstation', 'xbox', 'nintendo', 'switch', 'sony', 'valve', 'trailer', 'dlc', 'rpg']
  },
  hardware: {
    key: 'hardware',
    reportKey: 'hardware',
    name: 'Especialista Hardware',
    label: 'Hardware',
    image: 'assets/img/openclaw-agents/especialista-hardware.png',
    position: 'right-mid',
    color: 'rgba(255, 168, 74, 0.23)',
    focus: 'Benchmark real, custo-benefício e desejo de upgrade.',
    keywords: ['gpu', 'cpu', 'rtx', 'radeon', 'intel arc', 'chip', 'hardware', 'ssd', 'ram', 'vram', 'placa', 'notebook', 'benchmark']
  },
  market: {
    key: 'market',
    reportKey: 'mercado',
    name: 'Analista de Mercado',
    label: 'Empresas',
    image: 'assets/img/openclaw-agents/analista-mercado.png',
    position: 'left-mid',
    color: 'rgba(98, 238, 167, 0.22)',
    focus: 'Receita, valor comercial, amplitude e timing.',
    keywords: ['mercado', 'market', 'receita', 'earnings', 'revenue', 'valuation', 'empresa', 'business', 'negócios', 'acquisition', 'startup', 'invest']
  },
  tech: {
    key: 'tech',
    reportKey: 'tecnico',
    name: 'Analista Técnico',
    label: 'Tecnologia',
    image: 'assets/img/openclaw-agents/analista-tecnico.png',
    position: 'bottom-left',
    color: 'rgba(104, 136, 255, 0.22)',
    focus: 'Precisão, clareza, profundidade e contexto técnico.',
    keywords: ['technology', 'tecnologia', 'android', 'ios', 'cloud', 'api', 'plataforma', 'software', 'browser', 'internet', 'dev', 'desenvolvimento']
  },
  security: {
    key: 'security',
    reportKey: 'seguranca',
    name: 'Especialista Segurança',
    label: 'Segurança',
    image: 'assets/img/openclaw-agents/especialista-seguranca.png',
    position: 'bottom-right',
    color: 'rgba(255, 94, 94, 0.20)',
    focus: 'Criticidade, urgência, risco e responsabilidade editorial.',
    keywords: ['security', 'segurança', 'vulnerab', 'malware', 'breach', 'ransom', 'cve', 'attack', 'ataque', 'threat', 'risco']
  }
};

const CATEGORY_MAP = {
  ai: ['ai'],
  games: ['games', 'sony', 'microsoft', 'nintendo', 'valve'],
  hardware: ['hardware'],
  market: ['market', 'business', 'empresas'],
  tech: ['technology', 'internet', 'apple', 'google'],
  security: ['security']
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toText(value) {
  return String(value || '').trim();
}

function normalize(value) {
  return toText(value).toLowerCase();
}

function keywordHits(text, keywords = []) {
  const haystack = normalize(text);
  return keywords.reduce((acc, keyword) => acc + (haystack.includes(normalize(keyword)) ? 1 : 0), 0);
}

function categoryTotal(categories = {}, slugs = []) {
  return slugs.reduce((acc, slug) => {
    const raw = categories?.[slug];
    if (typeof raw === 'number') return acc + raw;
    if (Array.isArray(raw?.items)) return acc + raw.items.length;
    return acc;
  }, 0);
}

function summarizeTopic(item = {}, fallbackTopic = '') {
  const title = toText(item?.title || fallbackTopic || 'Leitura editorial em tempo real');
  const summary = toText(item?.summary || item?.reason || '');
  return {
    title,
    summary,
    category: normalize(item?.category || item?.openclaw?.agent || ''),
    source: toText(item?.source || item?.sourceSlug || ''),
    score: Number(item?.openclaw?.score || 0)
  };
}

function buildAgentReason(agent, topic, metrics) {
  const reasons = [];
  if (metrics.topicBoost >= 10) reasons.push(`o assunto encosta fortemente em ${agent.label.toLowerCase()}`);
  if (metrics.categorySignal >= 8) reasons.push('o cache atual reforça este nicho');
  if (metrics.editorialMomentum >= 8) reasons.push('o fluxo editorial recente está puxando esta especialidade');
  if (metrics.weightBoost >= 6) reasons.push('o histórico aprendido pelo Hermes elevou o peso deste agente');
  if (!reasons.length) reasons.push('há equilíbrio entre cobertura, histórico e momentum');
  return `Hermes detectou que ${reasons.join(', ')}.`;
}

function buildLines(agent, topic, score, metrics) {
  const noun = topic.title || 'tema atual';
  return [
    `${agent.name} analisou “${noun}” com nota ${score}/100.`,
    `Peso vivo: histórico ${Math.round(metrics.reportWeight * 100) / 100}x • foco ${agent.label.toLowerCase()}.`,
    buildAgentReason(agent, topic, metrics)
  ];
}

function buildPriority(finalScore) {
  if (finalScore >= 92) return 'máxima';
  if (finalScore >= 86) return 'alta';
  if (finalScore >= 78) return 'média';
  return 'monitorar';
}

function buildDecision(dominant, topic, finalScore) {
  const priority = buildPriority(finalScore);
  if (priority === 'máxima') {
    return `Hermes recomenda destaque máximo para “${topic.title}”, com ${dominant.label.toLowerCase()} liderando a decisão final.`;
  }
  if (priority === 'alta') {
    return `Hermes aprova publicação forte para “${topic.title}”, com ${dominant.label.toLowerCase()} como trilha dominante.`;
  }
  if (priority === 'média') {
    return `Hermes mantém “${topic.title}” em rotação estratégica, com ${dominant.label.toLowerCase()} puxando a relevância.`;
  }
  return `Hermes mantém “${topic.title}” em observação até novos sinais confirmarem prioridade.`;
}

export async function buildLiveCouncil({ topic: requestedTopic = '', period = 'monthly' } = {}) {
  const [cache, snapshot, report] = await Promise.all([
    getCache(),
    getEditorialSnapshot(false),
    readReport(period)
  ]);

  const categories = cache?.snapshots?.categories || {};
  const refresh = getRefreshStatus();
  const items = Array.isArray(snapshot?.month) ? snapshot.month : [];
  const fallbackItem = items[0] || snapshot?.home?.[0] || null;
  const matchingItem = requestedTopic
    ? items.find((item) => normalize(`${item.title} ${item.summary}`).includes(normalize(requestedTopic))) || fallbackItem
    : fallbackItem;

  const topic = summarizeTopic(matchingItem, requestedTopic);
  const reportWeights = report?.weights || {};
  const reportRanking = Array.isArray(report?.ranking) ? report.ranking : [];
  const reportLeader = reportRanking[0]?.agent || null;
  const velocity = clamp(Math.round(refresh?.isRefreshing ? 94 : 72 + (items.length > 10 ? 8 : 0)), 58, 99);
  const diversity = clamp(68 + Object.values(categories).filter((value) => {
    if (typeof value === 'number') return value > 0;
    return Array.isArray(value?.items) && value.items.length > 0;
  }).length * 3, 66, 99);

  const ranking = Object.values(AGENTS).map((agent) => {
    const categorySignal = categoryTotal(categories, CATEGORY_MAP[agent.key] || []);
    const momentumCount = items.filter((item) => normalize(item?.openclaw?.agent) === agent.key || normalize(item?.openclaw?.agent) === agent.reportKey).length;
    const topicBoost = keywordHits(`${topic.title} ${topic.summary} ${topic.category} ${topic.source}`, agent.keywords) * 4;
    const sourceBoost = topic.source && keywordHits(topic.source, agent.keywords) ? 4 : 0;
    const leadBoost = reportLeader === agent.reportKey ? 4 : 0;
    const reportWeight = Number(reportWeights[agent.reportKey] || 1);
    const weightBoost = Math.round((reportWeight - 0.2) * 12);
    const editorialMomentum = Math.min(momentumCount * 2, 16);
    const categoryPoints = Math.min(categorySignal * 1.4, 18);
    const topicCategoryMatch = topic.category && CATEGORY_MAP[agent.key]?.some((slug) => normalize(topic.category).includes(normalize(slug))) ? 8 : 0;

    const baseScore = 58;
    const score = clamp(
      Math.round(baseScore + categoryPoints + editorialMomentum + topicBoost + sourceBoost + topicCategoryMatch + weightBoost + leadBoost),
      55,
      99
    );

    const weighted = Number((score * Math.max(reportWeight, 0.35)).toFixed(2));
    const stance = score >= 90 ? 'approve' : score >= 80 ? 'promote' : score >= 70 ? 'review' : 'monitor';
    const metrics = { categorySignal, editorialMomentum, topicBoost, reportWeight, weightBoost };

    return {
      ...agent,
      score,
      weighted,
      weight: Number(reportWeight.toFixed(2)),
      stance,
      reason: buildAgentReason(agent, topic, metrics),
      lines: buildLines(agent, topic, score, metrics)
    };
  }).sort((a, b) => b.weighted - a.weighted || b.score - a.score).map((entry, index) => ({ ...entry, rank: index + 1 }));

  const dominant = ranking[0];
  const finalScore = clamp(Math.round(ranking.reduce((acc, item) => acc + item.weighted, 0) / Math.max(ranking.reduce((acc, item) => acc + item.weight, 0), 1)), 55, 99);
  const confidence = clamp(Math.round(finalScore - 3 + Math.max(0, dominant.score - (ranking[1]?.score || dominant.score))), 60, 99);
  const decision = buildDecision(dominant, topic, finalScore);

  return {
    ok: true,
    source: 'backend-live',
    generatedAt: new Date().toISOString(),
    updatedAt: snapshot?.generatedAt || cache?.generatedAt || new Date().toISOString(),
    topic: topic.title,
    topicSummary: topic.summary,
    topicSource: {
      title: topic.title,
      source: topic.source,
      category: topic.category,
      score: topic.score
    },
    ranking,
    benchmark: ranking.map(({ key, name, label, score, weight, rank }) => ({ key, name, label, score, weight, rank })),
    dominant,
    signals: {
      confidence,
      velocity,
      diversity
    },
    hermes: {
      name: 'Hermes',
      finalScore,
      priority: buildPriority(finalScore),
      decision,
      dominantNiche: dominant.label,
      confidence,
      velocity,
      diversity,
      rationale: `Hermes ponderou histórico ${period}, leitura ao vivo do cache e sinais do OpenClaw para fechar ${finalScore}% de consenso.`
    },
    system: {
      reportPeriod: period,
      openclawEnabled: process.env.OPENCLAW_ENABLED !== 'false',
      hermesEnabled: String(process.env.HERMES_ENABLED || 'true') === 'true',
      llmConfigured: Boolean(process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.DEEPSEEK_API_KEY),
      refresh,
      itemsTracked: items.length
    }
  };
}
