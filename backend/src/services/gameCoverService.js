const RAWG_API_KEY = String(process.env.RAWG_API_KEY || '').trim();
const RAWG_API_BASE = String(process.env.RAWG_API_BASE || 'https://api.rawg.io/api').trim();
const STEAMGRIDDB_API_KEY = String(process.env.STEAMGRIDDB_API_KEY || process.env.STEAMGRID_API_KEY || '').trim();
const STEAMGRIDDB_API_BASE = String(process.env.STEAMGRIDDB_API_BASE || 'https://www.steamgriddb.com/api/v2').trim();
const SERPAPI_ACCESS_KEY = String(process.env.SERPAPI_ACCESS_KEY || process.env.SERPAPI_KEY || process.env.SerpAPI_ACCESS_KEY || '').trim();
const UNSPLASH_ACCESS_KEY = String(process.env.UNSPLASH_ACCESS_KEY || '').trim();
const PEXELS_API_KEY = String(process.env.PEXELS_API_KEY || '').trim();
const PIXABAY_API_KEY = String(process.env.PIXABAY_API_KEY || '').trim();

const REQUEST_TIMEOUT_MS = Number(process.env.GAME_COVER_REQUEST_TIMEOUT_MS || process.env.MEDIA_REQUEST_TIMEOUT_MS || 10000);
const IMAGE_CACHE_TTL_MS = Number(process.env.IMAGE_CACHE_TTL_MS || 24 * 60 * 60 * 1000);
const COVER_CONFIDENCE_THRESHOLD = Number(process.env.GAME_COVER_CONFIDENCE_THRESHOLD || 0.75);
const memoryCache = new Map();

const TITLE_ALIASES = [
  { key: 'grand theft auto vi', terms: ['grand theft auto vi', 'grand theft auto', 'gta vi', 'gta 6', 'gta6', 'rockstar'] },
  { key: 'resident evil requiem', terms: ['resident evil requiem', 'resident evil', 'requiem', 'capcom'] },
  { key: 'final fantasy vii remake parte 3', terms: ['final fantasy vii remake parte 3', 'final fantasy vii', 'final fantasy 7', 'ff7', 'remake', 'sephiroth'] },
  { key: 'assassin s creed codename hexe', terms: ['assassin s creed codename hexe', 'assassins creed hexe', 'assassin', 'creed', 'hexe', 'ubisoft'] },
  { key: 'nioh 3', terms: ['nioh 3', 'nioh', 'team ninja'] },
  { key: 'ace combat 8 wings of theve', terms: ['ace combat 8 wings of theve', 'ace combat', 'wings of theve', 'bandai namco'] },
  { key: 'control resonant', terms: ['control resonant', 'control', 'remedy'] },
  { key: 'dragon quest vii reimagined', terms: ['dragon quest vii reimagined', 'dragon quest vii', 'dragon quest 7', 'dragon quest', 'reimagined'] },
  { key: 'pragmata', terms: ['pragmata', 'capcom'] },
  { key: 'marvel s wolverine', terms: ['marvel s wolverine', 'marvel wolverine', 'wolverine', 'insomniac'] },
  { key: 'marvel tokon fighting souls', terms: ['marvel tokon fighting souls', 'marvel tokon', 'tokon', 'fighting souls', 'arc system works'] },
  { key: 'phantom blade zero', terms: ['phantom blade zero', 'phantom blade'] },
  { key: 'saros', terms: ['saros', 'housemarque'] },
  { key: '007 first light', terms: ['007 first light', 'first light', 'james bond', 'io interactive'] },
  { key: 'diablo iv senhor do odio', terms: ['diablo iv senhor do odio', 'diablo iv', 'diablo 4', 'mephisto'] },
  { key: 'duskbloods', terms: ['duskbloods', 'the duskbloods', 'fromsoftware'] },
  { key: 'pokemon pokopia', terms: ['pokemon pokopia', 'pokopia', 'pokemon'] },
  { key: 'assetto corsa evo', terms: ['assetto corsa evo', 'assetto corsa'] },
  { key: 'forza horizon 6', terms: ['forza horizon 6', 'forza horizon'] },
  { key: 'halo campanha evoluida', terms: ['halo campanha evoluida', 'halo campaign evolved', 'halo', 'master chief'] },
  { key: 'tomb raider legacy of atlantis', terms: ['tomb raider legacy of atlantis', 'tomb raider', 'lara croft', 'legacy of atlantis'] },
  { key: 'marvel 1943 a ascensao da hydra', terms: ['marvel 1943 a ascensao da hydra', 'marvel 1943', 'rise of hydra', 'hydra', 'skydance'] },
  { key: 'high on life 2', terms: ['high on life 2', 'high on life'] },
  { key: 'john carpenter s toxic commando', terms: ['john carpenter s toxic commando', 'toxic commando', 'john carpenter'] },
  { key: 'ontos', terms: ['ontos', 'frictional games'] },
  { key: 'highguard', terms: ['highguard', 'wildlight'] }
];

const CRITICAL_CONFLICTS = TITLE_ALIASES.map((entry) => ({
  key: entry.key,
  terms: entry.terms.filter((term) => normalizeText(term).length >= 4)
}));

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function compactKey(value = '') {
  return normalizeText(value).replace(/\s+/g, ' ');
}

function unique(values = []) {
  return [...new Set(values.filter(Boolean))];
}

function getTitleProfile(title = '') {
  const normalized = compactKey(title);
  const exact = TITLE_ALIASES.find((entry) => entry.key === normalized || entry.terms.some((term) => compactKey(term) === normalized));
  const baseTerms = normalized.split(' ').filter((token) => token.length >= 3 && !['the', 'and', 'com', 'para', 'parte', 'codename'].includes(token));
  const aliasTerms = exact?.terms || [];
  return {
    key: exact?.key || normalized,
    aliases: unique([normalized, ...aliasTerms.map(compactKey)]),
    tokens: unique([...baseTerms, ...aliasTerms.flatMap((term) => compactKey(term).split(' ')).filter((token) => token.length >= 3)])
  };
}

function hasTerm(haystack, term) {
  const normalizedTerm = compactKey(term);
  if (!normalizedTerm) return false;
  return ` ${haystack} `.includes(` ${normalizedTerm} `) || haystack.includes(normalizedTerm.replace(/\s+/g, ''));
}

function imageUrlIsSafe(url = '') {
  try {
    const parsed = new URL(String(url || '').trim());
    if (!['http:', 'https:'].includes(parsed.protocol)) return false;
    const path = `${parsed.hostname} ${parsed.pathname}`.toLowerCase();
    if (/\.(mp4|webm|mov|avi|m3u8)(?:$|[?#])/.test(path)) return false;
    if (/(avatar|placeholder|blank|noimage|sprite|logo-only)/.test(path)) return false;
    return true;
  } catch {
    return false;
  }
}

function candidateHaystack(candidate = {}) {
  return compactKey([
    candidate.title,
    candidate.name,
    candidate.source,
    candidate.provider,
    candidate.image,
    candidate.thumbnail,
    candidate.url,
    candidate.description,
    candidate.alt,
    ...(Array.isArray(candidate.tags) ? candidate.tags : [])
  ].join(' '));
}

export function validateGameCoverCandidate(title = '', candidate = {}) {
  const image = String(candidate.image || candidate.url || candidate.thumbnail || '').trim();
  if (!imageUrlIsSafe(image)) {
    return { ok: false, confidence: 0, matched_terms: [], reason: 'invalid-image-url' };
  }

  const profile = getTitleProfile(title);
  const haystack = candidateHaystack({ ...candidate, image });
  if (!profile.key || !haystack) {
    return { ok: false, confidence: 0, matched_terms: [], reason: 'missing-title-metadata' };
  }

  if (hasTerm(haystack, 'marvel') && !profile.key.includes('marvel') && !profile.key.includes('tokon')) {
    return { ok: false, confidence: 0, matched_terms: [], reason: 'critical-conflict:marvel' };
  }

  for (const conflict of CRITICAL_CONFLICTS) {
    if (conflict.key === profile.key) continue;
    const conflictHits = conflict.terms.filter((term) => hasTerm(haystack, term));
    if (conflictHits.length) {
      return { ok: false, confidence: 0, matched_terms: [], reason: `critical-conflict:${conflictHits[0]}` };
    }
  }

  const matchedAliases = profile.aliases.filter((term) => hasTerm(haystack, term));
  const matchedTokens = profile.tokens.filter((term) => hasTerm(haystack, term));
  const matchedTerms = unique([...matchedAliases, ...matchedTokens]);

  let confidence = 0;
  if (matchedAliases.some((term) => term === profile.key || term.split(' ').length >= 2)) confidence += 0.65;
  confidence += Math.min(matchedTokens.length * 0.12, 0.35);
  if (['rawg', 'steamgrid', 'steamgriddb', 'official-backend'].includes(String(candidate.provider || '').toLowerCase())) confidence += 0.1;
  confidence = Math.min(Number(confidence.toFixed(2)), 1);

  const ok = confidence >= COVER_CONFIDENCE_THRESHOLD;
  return {
    ok,
    confidence,
    matched_terms: matchedTerms,
    reason: ok ? 'accepted' : 'low-confidence'
  };
}

function makeCandidate(raw = {}, provider = '') {
  return {
    image: String(raw.image || raw.url || raw.thumbnail || '').trim(),
    source: raw.source || provider,
    title: raw.title || raw.name || '',
    provider,
    confidence: 0,
    matched_terms: [],
    description: raw.description || raw.alt || ''
  };
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
        'User-Agent': process.env.USER_AGENT || 'TechNetGameBot/1.0',
        ...(options.headers || {})
      }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fromRawg(title) {
  if (!RAWG_API_KEY) return [];
  const url = `${RAWG_API_BASE}/games?key=${encodeURIComponent(RAWG_API_KEY)}&search=${encodeURIComponent(title)}&page_size=5`;
  const data = await fetchJson(url);
  return (Array.isArray(data?.results) ? data.results : []).flatMap((item) => [
    makeCandidate({ image: item.background_image, title: item.name, source: 'RAWG' }, 'rawg'),
    makeCandidate({ image: item.background_image_additional, title: item.name, source: 'RAWG' }, 'rawg')
  ]);
}

async function fromSteamGrid(title) {
  if (!STEAMGRIDDB_API_KEY) return [];
  const searchUrl = `${STEAMGRIDDB_API_BASE}/search/autocomplete/${encodeURIComponent(title)}`;
  const search = await fetchJson(searchUrl, { headers: { Authorization: `Bearer ${STEAMGRIDDB_API_KEY}` } });
  const games = Array.isArray(search?.data) ? search.data.slice(0, 3) : [];
  const candidates = [];
  for (const game of games) {
    if (!game?.id) continue;
    const gridUrl = `${STEAMGRIDDB_API_BASE}/grids/game/${encodeURIComponent(game.id)}?dimensions=600x900,342x482,920x430`;
    const grids = await fetchJson(gridUrl, { headers: { Authorization: `Bearer ${STEAMGRIDDB_API_KEY}` } });
    for (const grid of (Array.isArray(grids?.data) ? grids.data.slice(0, 4) : [])) {
      candidates.push(makeCandidate({ image: grid.url, title: game.name, source: 'SteamGridDB' }, 'steamgrid'));
    }
  }
  return candidates;
}

async function fromSerpApi(title) {
  if (!SERPAPI_ACCESS_KEY) return [];
  const q = `${title} official game cover art`;
  const url = `https://serpapi.com/search.json?engine=google_images&q=${encodeURIComponent(q)}&api_key=${encodeURIComponent(SERPAPI_ACCESS_KEY)}&ijn=0`;
  const data = await fetchJson(url);
  return (Array.isArray(data?.images_results) ? data.images_results.slice(0, 8) : []).map((item) => makeCandidate({
    image: item.original || item.thumbnail || item.image,
    title: item.title,
    source: item.source,
    description: item.link
  }, 'serpapi'));
}

async function fromUnsplash(title) {
  if (!UNSPLASH_ACCESS_KEY) return [];
  const url = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(`${title} game cover`)}&per_page=5&orientation=landscape`;
  const data = await fetchJson(url, { headers: { Authorization: `Client-ID ${UNSPLASH_ACCESS_KEY}`, 'Accept-Version': 'v1' } });
  return (Array.isArray(data?.results) ? data.results : []).map((item) => makeCandidate({
    image: item.urls?.regular || item.urls?.full,
    title: item.alt_description || item.description || title,
    source: 'Unsplash',
    description: item.user?.name
  }, 'unsplash'));
}

async function fromPexels(title) {
  if (!PEXELS_API_KEY) return [];
  const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(`${title} game cover`)}&per_page=5&orientation=landscape`;
  const data = await fetchJson(url, { headers: { Authorization: PEXELS_API_KEY } });
  return (Array.isArray(data?.photos) ? data.photos : []).map((item) => makeCandidate({
    image: item.src?.large2x || item.src?.large,
    title: item.alt || title,
    source: 'Pexels',
    description: item.photographer
  }, 'pexels'));
}

async function fromPixabay(title) {
  if (!PIXABAY_API_KEY) return [];
  const url = `https://pixabay.com/api/?key=${encodeURIComponent(PIXABAY_API_KEY)}&q=${encodeURIComponent(`${title} game cover`)}&image_type=photo&per_page=5&safesearch=true`;
  const data = await fetchJson(url);
  return (Array.isArray(data?.hits) ? data.hits : []).map((item) => makeCandidate({
    image: item.largeImageURL || item.webformatURL,
    title: item.tags || title,
    source: 'Pixabay'
  }, 'pixabay'));
}

function applyValidation(title, candidates = []) {
  return candidates
    .map((candidate) => {
      const validation = validateGameCoverCandidate(title, candidate);
      return {
        image: candidate.image,
        source: candidate.source,
        title: candidate.title,
        provider: candidate.provider,
        confidence: validation.confidence,
        matched_terms: validation.matched_terms,
        accepted: validation.ok,
        reason: validation.reason
      };
    })
    .filter((candidate) => candidate.image)
    .sort((a, b) => Number(b.accepted) - Number(a.accepted) || b.confidence - a.confidence);
}

export async function resolveGameCover(title = '') {
  const query = String(title || '').trim();
  if (!query) return { ok: false, query: '', cover: null, candidates: [], reason: 'missing-query' };

  const cacheKey = `cover:${compactKey(query)}`;
  const cached = memoryCache.get(cacheKey);
  if (cached && Date.now() < cached.expiresAt) return cached.value;

  const providerFns = [fromRawg, fromSteamGrid, fromSerpApi, fromUnsplash, fromPexels, fromPixabay];
  const rawCandidates = [];
  for (const provider of providerFns) {
    try {
      rawCandidates.push(...await provider(query));
    } catch (error) {
      console.warn('[game-cover] provider failed for', query, error?.message || error);
    }
  }

  const candidates = applyValidation(query, rawCandidates);
  const cover = candidates.find((candidate) => candidate.accepted && candidate.confidence >= COVER_CONFIDENCE_THRESHOLD) || null;
  const payload = {
    ok: Boolean(cover),
    query,
    cover: cover?.image || null,
    selected: cover,
    threshold: COVER_CONFIDENCE_THRESHOLD,
    candidates
  };

  memoryCache.set(cacheKey, { value: payload, expiresAt: Date.now() + IMAGE_CACHE_TTL_MS });
  return payload;
}

export function clearGameCoverCache() {
  memoryCache.clear();
}
