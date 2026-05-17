const RAWG_API_KEY = String(process.env.RAWG_API_KEY || '').trim();
const RAWG_API_BASE = String(process.env.RAWG_API_BASE || 'https://api.rawg.io/api').trim().replace(/\/$/, '');
const STEAMGRIDDB_API_KEY = String(
  process.env.STEAMGRIDDB_API_KEY || process.env.STEAM_GRID_DB_API_KEY || ''
).trim();
const STEAMGRIDDB_API_BASE = String(
  process.env.STEAMGRIDDB_API_BASE || 'https://www.steamgriddb.com/api/v2'
).trim().replace(/\/$/, '');

const REQUEST_TIMEOUT_MS = Number(process.env.GAME_COVER_REQUEST_TIMEOUT_MS || 12000);
const COVER_CACHE_TTL_MS = Number(process.env.GAME_COVER_CACHE_TTL_MS || 6 * 60 * 60 * 1000);
const ACCEPTANCE_THRESHOLD = Number(process.env.GAME_COVER_ACCEPTANCE_THRESHOLD || 0.7);
const TITLE_MISMATCH_CONFIDENCE_CAP = 0.49;
const memoryCache = new Map();

const SOURCE_TIERS = new Map([
  ['steamgriddb', 1],
  ['rawg', 1],
  ['igdb', 2],
  ['official', 2],
  ['serpapi', 3],
  ['wikimedia', 3],
  ['pexels', 4],
  ['pixabay', 4],
  ['unsplash', 4],
  ['fanart', 5],
  ['social', 5]
]);

const CONTROLLED_ALIASES = [
  {
    includes: ['final fantasy vii remake parte 3', 'final fantasy 7 remake parte 3'],
    accepts: [
      'final fantasy vii remake',
      'ffvii remake',
      'final fantasy 7 remake',
      'remake part 3',
      'remake parte 3'
    ]
  },
  {
    includes: ['marvel tokon', 'marvel tokon fighting souls'],
    accepts: ['marvel tokon fighting souls', 'marvel tokon']
  }
];

function normalizeTitle(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\bpart\b/g, 'parte')
    .replace(/\biii\b/g, '3')
    .replace(/\bvi\b/g, '6')
    .replace(/\bvii\b/g, '7')
    .replace(/\bviii\b/g, '8')
    .replace(/\bix\b/g, '9')
    .replace(/\biv\b/g, '4')
    .replace(/\bii\b/g, '2')
    .replace(/\bi\b/g, '1')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenizeTitle(value = '') {
  return normalizeTitle(value).split(' ').filter(Boolean);
}

function sourceTierFor(source = '') {
  const key = normalizeTitle(source).replace(/\s+/g, '');
  return SOURCE_TIERS.get(key) || 9;
}

function hasBlockedSource(candidate = {}) {
  const source = normalizeTitle(candidate.source || candidate.provider || '');
  const type = normalizeTitle(candidate.type || candidate.category || '');
  return source.includes('social') || source.includes('fanart') || type.includes('social') || type.includes('fanart');
}

function hasCriticalConflict(query = '', candidateTitle = '') {
  const qTokens = tokenizeTitle(query);
  const cTokens = tokenizeTitle(candidateTitle);
  const important = new Set(['nioh', 'arma', 'marvel', 'final', 'fantasy', 'remake']);
  const qNumbers = qTokens.filter((token) => /^\d+$/.test(token));
  const cNumbers = cTokens.filter((token) => /^\d+$/.test(token));

  if (qTokens.includes('nioh') && !cTokens.includes('nioh')) return true;
  if (qTokens.includes('marvel') && !cTokens.includes('marvel')) return true;
  if (qTokens.includes('final') && qTokens.includes('fantasy') && !(cTokens.includes('final') && cTokens.includes('fantasy'))) {
    return true;
  }

  for (const token of qTokens) {
    if (important.has(token) && !cTokens.includes(token)) return true;
  }

  if (qNumbers.length && cNumbers.length && !qNumbers.every((number) => cNumbers.includes(number))) {
    return true;
  }

  return false;
}

function isControlledAliasMatch(query = '', candidateTitle = '') {
  const q = normalizeTitle(query);
  const c = normalizeTitle(candidateTitle);
  if (!q || !c) return false;

  return CONTROLLED_ALIASES.some((entry) => {
    const applies = entry.includes.some((alias) => q.includes(normalizeTitle(alias)));
    if (!applies) return false;
    return entry.accepts.some((alias) => {
      const normalizedAlias = normalizeTitle(alias);
      return c === normalizedAlias || c.includes(normalizedAlias) || normalizedAlias.includes(c);
    });
  });
}

function isTitleMatch(query = '', candidateTitle = '') {
  const q = normalizeTitle(query);
  const c = normalizeTitle(candidateTitle);
  if (!q || !c) return false;
  if (q === c) return true;
  if (isControlledAliasMatch(query, candidateTitle)) return true;

  const qTokens = tokenizeTitle(q);
  const cTokens = tokenizeTitle(c);
  if (!qTokens.length || !cTokens.length) return false;

  const qSet = new Set(qTokens);
  const cSet = new Set(cTokens);
  const qNumbers = qTokens.filter((token) => /^\d+$/.test(token));
  const cNumbers = cTokens.filter((token) => /^\d+$/.test(token));
  if (qNumbers.length && !qNumbers.every((number) => cSet.has(number))) return false;
  if (qNumbers.length !== cNumbers.length && qTokens.some((token) => /^\d+$/.test(token))) return false;

  if (qTokens.length <= 2) {
    return qTokens.every((token) => cSet.has(token)) && cTokens.every((token) => qSet.has(token) || !/^\d+$/.test(token));
  }

  const matched = qTokens.filter((token) => cSet.has(token)).length;
  return matched / qTokens.length >= 0.8 && !hasCriticalConflict(query, candidateTitle);
}

function baseConfidence(query = '', candidate = {}) {
  const q = normalizeTitle(query);
  const c = normalizeTitle(candidate.title || candidate.name || '');
  if (!q || !c) return 0;
  if (q === c) return 0.98;
  if (isControlledAliasMatch(query, c)) return 0.9;

  const qTokens = tokenizeTitle(q);
  const cTokens = new Set(tokenizeTitle(c));
  const overlap = qTokens.filter((token) => cTokens.has(token)).length / Math.max(qTokens.length, 1);
  const sourceBoost = Math.max(0, (3 - Math.min(sourceTierFor(candidate.source), 3)) * 0.04);
  return Math.min(0.86, 0.45 + overlap * 0.37 + sourceBoost);
}

function rejectionReason({ titleMatch, sourceTier, confidence, threshold, criticalConflict, blockedSource }) {
  if (!titleMatch) return 'title-mismatch';
  if (criticalConflict) return 'critical-conflict';
  if (blockedSource) return 'source-not-trusted';
  if (sourceTier > 2) return 'source-not-trusted';
  if (confidence < threshold) return 'below-threshold';
  return null;
}

export function scoreGameCoverCandidate(query = '', candidate = {}, options = {}) {
  const threshold = Number(options.threshold || ACCEPTANCE_THRESHOLD);
  const title = candidate.title || candidate.name || '';
  const sourceTier = Number(candidate.sourceTier || sourceTierFor(candidate.source));
  const controlledAliasMatch = isControlledAliasMatch(query, title);
  const titleMatch = Boolean(candidate.titleMatch ?? isTitleMatch(query, title));
  const criticalConflict = Boolean(
    candidate.criticalConflict ?? (controlledAliasMatch ? false : hasCriticalConflict(query, title))
  );
  const blockedSource = Boolean(candidate.blockedSource ?? hasBlockedSource(candidate));
  const candidateConfidence = Number(candidate.confidence);
  let confidence = Number.isFinite(candidateConfidence) ? candidateConfidence : baseConfidence(query, candidate);

  if (!titleMatch) {
    confidence = Math.min(confidence, TITLE_MISMATCH_CONFIDENCE_CAP);
  }

  confidence = Math.max(0, Math.min(1, Number(confidence.toFixed(2))));
  const accepted = sourceTier <= 2 && confidence >= threshold && titleMatch && !criticalConflict && !blockedSource;
  const rejectedReason = accepted
    ? null
    : rejectionReason({ titleMatch, sourceTier, confidence, threshold, criticalConflict, blockedSource });

  return {
    ...candidate,
    title,
    sourceTier,
    titleMatch,
    criticalConflict,
    confidence,
    accepted,
    rejectedReason
  };
}

export function rankGameCoverCandidates(query = '', candidates = [], options = {}) {
  const scored = candidates
    .map((candidate) => scoreGameCoverCandidate(query, candidate, options))
    .sort((a, b) => {
      if (a.accepted !== b.accepted) return a.accepted ? -1 : 1;
      if (a.titleMatch !== b.titleMatch) return a.titleMatch ? -1 : 1;
      if (a.sourceTier !== b.sourceTier) return a.sourceTier - b.sourceTier;
      return b.confidence - a.confidence;
    });

  const selected = scored.find((candidate) => candidate.accepted && candidate.titleMatch) || null;
  return { selected, candidates: scored };
}

function cacheKey(query = '') {
  return `cover:${normalizeTitle(query)}`;
}

function getCached(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.payload;
}

function setCached(key, payload) {
  memoryCache.set(key, { payload, expiresAt: Date.now() + COVER_CACHE_TTL_MS });
}

async function fetchJson(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': process.env.USER_AGENT || 'TechNetGame/1.0',
        ...(options.headers || {})
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

function firstImageFromRawg(game = {}) {
  return [
    game.background_image,
    game.background_image_additional,
    Array.isArray(game.short_screenshots) ? game.short_screenshots[0]?.image : '',
    Array.isArray(game.short_screenshots) ? game.short_screenshots[1]?.image : ''
  ].find(Boolean) || '';
}

async function fetchRawgCandidates(query = '') {
  if (!RAWG_API_KEY) return [];
  const url = `${RAWG_API_BASE}/games?key=${encodeURIComponent(RAWG_API_KEY)}&search=${encodeURIComponent(query)}&page_size=10`;
  const data = await fetchJson(url);
  return (Array.isArray(data?.results) ? data.results : [])
    .map((game) => ({
      id: game.id ? `rawg:${game.id}` : undefined,
      source: 'rawg',
      title: game.name || '',
      image: firstImageFromRawg(game),
      url: game.slug ? `https://rawg.io/games/${game.slug}` : ''
    }))
    .filter((candidate) => candidate.title && candidate.image);
}

async function fetchSteamGridDbCandidates(query = '') {
  if (!STEAMGRIDDB_API_KEY) return [];
  const searchUrl = `${STEAMGRIDDB_API_BASE}/search/autocomplete/${encodeURIComponent(query)}`;
  const search = await fetchJson(searchUrl, { headers: { Authorization: `Bearer ${STEAMGRIDDB_API_KEY}` } });
  const games = (Array.isArray(search?.data) ? search.data : []).slice(0, 8);
  const candidates = [];

  for (const game of games) {
    if (!game?.id) continue;
    try {
      const gridsUrl = `${STEAMGRIDDB_API_BASE}/grids/game/${encodeURIComponent(game.id)}?dimensions=600x900,342x482,660x930`;
      const grids = await fetchJson(gridsUrl, { headers: { Authorization: `Bearer ${STEAMGRIDDB_API_KEY}` } });
      const image = (Array.isArray(grids?.data) ? grids.data : []).find((grid) => grid?.url)?.url || '';
      if (image) {
        candidates.push({
          id: `steamgriddb:${game.id}`,
          source: 'steamgriddb',
          title: game.name || '',
          image,
          url: `https://www.steamgriddb.com/game/${game.id}`
        });
      }
    } catch (error) {
      console.warn('[game-cover][steamgriddb] grid lookup failed:', error?.message || error);
    }
  }

  return candidates;
}

export async function resolveGameCover(query = '') {
  const q = String(query || '').trim();
  if (!q) return { ok: false, query: '', selected: null, candidates: [], error: 'query-required' };

  const key = cacheKey(q);
  const cached = getCached(key);
  if (cached) return cached;

  const sourceResults = await Promise.allSettled([
    fetchSteamGridDbCandidates(q),
    fetchRawgCandidates(q)
  ]);
  const candidates = sourceResults.flatMap((result) => (result.status === 'fulfilled' ? result.value : []));
  const ranked = rankGameCoverCandidates(q, candidates);
  const payload = {
    ok: Boolean(ranked.selected?.image),
    query: q,
    selected: ranked.selected,
    image: ranked.selected?.image || '',
    candidates: ranked.candidates
  };

  setCached(key, payload);
  return payload;
}

export function clearGameCoverCache() {
  memoryCache.clear();
  return { ok: true };
}

export const gameCoverInternals = {
  normalizeTitle,
  isTitleMatch,
  hasCriticalConflict,
  TITLE_MISMATCH_CONFIDENCE_CAP,
  ACCEPTANCE_THRESHOLD
};
