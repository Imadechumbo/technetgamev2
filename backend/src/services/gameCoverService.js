const RAWG_API_KEY = String(process.env.RAWG_API_KEY || '').trim();
const RAWG_API_BASE = String(process.env.RAWG_API_BASE || 'https://api.rawg.io/api').trim();
const STEAMGRIDDB_API_KEY = String(
  process.env.STEAMGRIDDB_API_KEY || process.env.STEAM_GRID_DB_API_KEY || ''
).trim();
const STEAMGRIDDB_API_BASE = String(
  process.env.STEAMGRIDDB_API_BASE || 'https://www.steamgriddb.com/api/v2'
).trim();
const SERPAPI_ACCESS_KEY = String(
  process.env.SERPAPI_ACCESS_KEY || process.env.SerpAPI_ACCESS_KEY || ''
).trim();

const REQUEST_TIMEOUT_MS = Number(
  process.env.GAME_COVER_REQUEST_TIMEOUT_MS || process.env.REQUEST_TIMEOUT_MS || 12000
);
const CACHE_TTL_MS = Number(
  process.env.GAME_COVER_CACHE_TTL_MS || process.env.MEDIA_CACHE_TTL_MS || 7 * 24 * 60 * 60 * 1000
);
const FALLBACK_COVER = '/assets/img/fallback-game-cover.svg';

const memoryCache = new Map();

const TIER_1_PROVIDER_NAMES = new Set(['rawg', 'steamgriddb']);
const TRUSTED_STOREFRONT_DOMAINS = [
  'playstation.com',
  'xbox.com',
  'nintendo.com',
  'steampowered.com',
  'steamstatic.com',
  'epicgames.com',
  'epicgames.dev'
];
const TRUSTED_PUBLISHER_DOMAINS = [
  'marvel.com',
  'teamninja-studio.com',
  'koeitecmoamerica.com',
  'koeitecmoeurope.com',
  'square-enix-games.com',
  'square-enix.com',
  'ubisoft.com'
];
const TIER_2_DOMAINS = ['wikipedia.org', 'wikimedia.org', 'wikimediafoundation.org'];
const BLOCKED_DOMAINS = [
  'reddit.com',
  'redd.it',
  'facebook.com',
  'fbcdn.net',
  'instagram.com',
  'cdninstagram.com',
  'displate.com',
  'g2a.com',
  'pinterest.com',
  'deviantart.com',
  'artstation.com',
  'behance.net',
  'tumblr.com',
  'pexels.com',
  'pixabay.com',
  'unsplash.com'
];
const FANART_HINTS = [
  'fanart',
  'fan art',
  'fan-made',
  'fan made',
  'concept art',
  'prediction',
  'predictions',
  'speculation',
  'rumor',
  'rumour',
  'leak',
  'mockup',
  'poster',
  'displate'
];
const BOX_ART_HINTS = ['box art', 'cover art', 'cover', 'key art', 'official art'];

function normalizeText(value = '') {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenize(value = '') {
  return normalizeText(value).split(' ').filter((token) => token.length > 1);
}

function sourceText(candidate = {}) {
  return [
    candidate.provider,
    candidate.source,
    candidate.title,
    candidate.name,
    candidate.url,
    candidate.image,
    candidate.thumbnail,
    candidate.sourceUrl,
    candidate.reason
  ].filter(Boolean).join(' ');
}

function extractHostname(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return '';

  try {
    const url = new URL(raw.startsWith('//') ? `https:${raw}` : raw);
    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch (_error) {
    const match = raw.toLowerCase().match(/(?:https?:\/\/)?(?:www\.)?([a-z0-9.-]+\.[a-z]{2,})/i);
    return match ? match[1].replace(/^www\./, '') : '';
  }
}

function candidateDomain(candidate = {}) {
  return extractHostname(candidate.sourceUrl || candidate.link || candidate.url || candidate.image || candidate.thumbnail || candidate.source);
}

function domainMatches(domain = '', allowed = []) {
  if (!domain) return false;
  return allowed.some((allowedDomain) => domain === allowedDomain || domain.endsWith(`.${allowedDomain}`));
}

function titleMatches(expectedTitle = '', candidate = {}) {
  const expectedTokens = tokenize(expectedTitle);
  if (!expectedTokens.length) return false;

  const haystack = normalizeText(sourceText(candidate));
  const matched = expectedTokens.filter((token) => haystack.includes(token));
  const required = Math.max(1, Math.ceil(expectedTokens.length * 0.72));
  return matched.length >= required;
}

function titleSpecificOfficialDomains(title = '') {
  const normalized = normalizeText(title);
  const domains = [];

  if (normalized.includes('marvel')) domains.push('marvel.com');
  if (normalized.includes('nioh')) domains.push('teamninja-studio.com', 'koeitecmoamerica.com', 'koeitecmoeurope.com');
  if (normalized.includes('final fantasy')) domains.push('square-enix-games.com', 'square-enix.com');
  if (normalized.includes('assassins creed') || normalized.includes('assassin s creed')) domains.push('ubisoft.com');

  return domains;
}

function officialDomainForTitle(title = '', domain = '') {
  return domainMatches(domain, [
    ...TRUSTED_STOREFRONT_DOMAINS,
    ...titleSpecificOfficialDomains(title)
  ]);
}

function hasFanartOrSpeculationSignal(candidate = {}) {
  const text = normalizeText(sourceText(candidate));
  return FANART_HINTS.some((hint) => text.includes(normalizeText(hint)));
}

function isBoxArtCandidate(candidate = {}) {
  const text = normalizeText(sourceText(candidate));
  return BOX_ART_HINTS.some((hint) => text.includes(normalizeText(hint)));
}

function qualityLabel(sourceTier) {
  if (sourceTier === 1) return 'tier-1';
  if (sourceTier === 2) return 'tier-2';
  return 'untrusted';
}

export function scoreGameCoverCandidate(candidate = {}, expectedTitle = '') {
  const provider = normalizeText(candidate.provider || candidate.source || '');
  const domain = candidateDomain(candidate);
  const exactTitle = titleMatches(expectedTitle, candidate);
  const blocked = domainMatches(domain, BLOCKED_DOMAINS);
  const fanart = hasFanartOrSpeculationSignal(candidate);
  const trustedStorefront = domainMatches(domain, TRUSTED_STOREFRONT_DOMAINS);
  const trustedPublisher = domainMatches(domain, TRUSTED_PUBLISHER_DOMAINS);
  const officialForTitle = officialDomainForTitle(expectedTitle, domain);
  const providerTier1 = TIER_1_PROVIDER_NAMES.has(provider);
  const wikimedia = domainMatches(domain, TIER_2_DOMAINS) || provider.includes('wikimedia') || provider.includes('wikipedia');
  const serpApi = provider.includes('serpapi') || provider.includes('serp api');

  let sourceTier = 3;
  let confidence = 0.1;
  let accepted = false;
  let rejectedReason = '';

  if (providerTier1) {
    sourceTier = 1;
    confidence = exactTitle ? 0.98 : 0.82;
    accepted = true;
  } else if (serpApi && (officialForTitle || trustedStorefront || trustedPublisher)) {
    sourceTier = 2;
    confidence = exactTitle ? 0.91 : 0.6;
    accepted = exactTitle && confidence >= 0.9;
  } else if (officialForTitle || trustedStorefront || trustedPublisher) {
    sourceTier = 1;
    confidence = exactTitle ? 0.96 : 0.78;
    accepted = exactTitle || officialForTitle;
  } else if (wikimedia) {
    sourceTier = 2;
    confidence = exactTitle && isBoxArtCandidate(candidate) ? 0.9 : 0.48;
    accepted = exactTitle && confidence >= 0.88;
  }

  if (blocked || fanart) {
    accepted = false;
    sourceTier = 3;
    confidence = Math.min(confidence, blocked ? 0.08 : 0.18);
    rejectedReason = blocked ? 'source-not-trusted' : 'fanart-social-source';
  } else if (!accepted) {
    rejectedReason = sourceTier === 3 ? 'source-not-trusted' : 'low-confidence';
  }

  return {
    ...candidate,
    domain,
    sourceTier,
    sourceQuality: qualityLabel(sourceTier),
    confidence: Number(confidence.toFixed(2)),
    accepted,
    rejectedReason: accepted ? '' : rejectedReason,
    titleMatch: exactTitle
  };
}

export function rankGameCoverCandidates(candidates = [], expectedTitle = '') {
  return candidates
    .map((candidate) => scoreGameCoverCandidate(candidate, expectedTitle))
    .sort((a, b) => {
      if (Number(b.accepted) !== Number(a.accepted)) return Number(b.accepted) - Number(a.accepted);
      if (a.sourceTier !== b.sourceTier) return a.sourceTier - b.sourceTier;
      if (b.confidence !== a.confidence) return b.confidence - a.confidence;
      return String(a.provider || a.source || '').localeCompare(String(b.provider || b.source || ''));
    });
}

function pickSelectedCandidate(candidates = []) {
  return candidates.find((candidate) => candidate.accepted && candidate.sourceTier <= 2 && candidate.confidence >= 0.88) || null;
}

function toCacheKey(title = '') {
  return normalizeText(title);
}

function getFromMemoryCache(key) {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.value;
}

function setInMemoryCache(key, value, ttl = CACHE_TTL_MS) {
  memoryCache.set(key, { value, expiresAt: Date.now() + ttl });
}

function sanitizeImageUrl(url = '') {
  const value = String(url || '').trim();
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://') || value.startsWith('/')) return value;
  return '';
}

async function fetchJson(url, options = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

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

async function fetchRawgCandidates(title = '') {
  if (!RAWG_API_KEY || !title) return [];

  try {
    const url = `${RAWG_API_BASE}/games?key=${encodeURIComponent(RAWG_API_KEY)}&search=${encodeURIComponent(title)}&page_size=5`;
    const data = await fetchJson(url);
    const results = Array.isArray(data?.results) ? data.results : [];

    return results.flatMap((game) => [
      game?.background_image,
      game?.background_image_additional,
      ...(Array.isArray(game?.short_screenshots) ? game.short_screenshots.map((item) => item?.image) : [])
    ].filter(Boolean).map((image) => ({
      provider: 'rawg',
      source: 'RAWG',
      title: game?.name || title,
      image,
      url: image,
      sourceUrl: game?.slug ? `https://rawg.io/games/${game.slug}` : 'https://rawg.io'
    })));
  } catch (error) {
    console.error('[game-cover][rawg] erro:', error.message);
    return [];
  }
}

async function fetchSteamGridDbCandidates(title = '') {
  if (!STEAMGRIDDB_API_KEY || !title) return [];

  try {
    const searchUrl = `${STEAMGRIDDB_API_BASE}/search/autocomplete/${encodeURIComponent(title)}`;
    const searchData = await fetchJson(searchUrl, {
      headers: { Authorization: `Bearer ${STEAMGRIDDB_API_KEY}` }
    });
    const games = Array.isArray(searchData?.data) ? searchData.data.slice(0, 3) : [];
    const candidates = [];

    for (const game of games) {
      const gridsUrl = `${STEAMGRIDDB_API_BASE}/grids/game/${encodeURIComponent(game.id)}?dimensions=600x900,342x482,660x930`;
      const gridsData = await fetchJson(gridsUrl, {
        headers: { Authorization: `Bearer ${STEAMGRIDDB_API_KEY}` }
      });
      const grids = Array.isArray(gridsData?.data) ? gridsData.data.slice(0, 5) : [];
      for (const grid of grids) {
        if (!grid?.url) continue;
        candidates.push({
          provider: 'steamgriddb',
          source: 'SteamGridDB',
          title: game?.name || title,
          image: grid.url,
          url: grid.url,
          sourceUrl: `https://www.steamgriddb.com/game/${game.id}`
        });
      }
    }

    return candidates;
  } catch (error) {
    console.error('[game-cover][steamgriddb] erro:', error.message);
    return [];
  }
}

async function fetchSerpApiCandidates(title = '') {
  if (!SERPAPI_ACCESS_KEY || !title) return [];

  try {
    const query = `${title} official game cover art`;
    const url = `https://serpapi.com/search.json?engine=google_images&q=${encodeURIComponent(query)}&api_key=${encodeURIComponent(SERPAPI_ACCESS_KEY)}&ijn=0`;
    const data = await fetchJson(url);
    const images = Array.isArray(data?.images_results) ? data.images_results : [];

    return images.slice(0, 12).map((item) => ({
      provider: 'serpapi',
      source: item?.source || 'SerpAPI',
      title: item?.title || title,
      image: sanitizeImageUrl(item?.original || item?.thumbnail || item?.image),
      url: sanitizeImageUrl(item?.original || item?.thumbnail || item?.image),
      sourceUrl: item?.link || item?.source || item?.original || ''
    })).filter((candidate) => candidate.image);
  } catch (error) {
    console.error('[game-cover][serpapi] erro:', error.message);
    return [];
  }
}

export async function resolveGameCover(title = '') {
  const cleanTitle = String(title || '').trim();
  if (!cleanTitle) return { ok: false, error: 'title é obrigatório' };

  const cacheKey = toCacheKey(cleanTitle);
  const cached = getFromMemoryCache(cacheKey);
  if (cached) return cached;

  const rawCandidates = [
    ...(await fetchRawgCandidates(cleanTitle)),
    ...(await fetchSteamGridDbCandidates(cleanTitle)),
    ...(await fetchSerpApiCandidates(cleanTitle))
  ];
  const candidates = rankGameCoverCandidates(rawCandidates, cleanTitle);
  const selected = pickSelectedCandidate(candidates);
  const result = {
    ok: true,
    title: cleanTitle,
    cover: selected?.image || FALLBACK_COVER,
    selected,
    candidates
  };

  setInMemoryCache(cacheKey, result, selected ? CACHE_TTL_MS : 60 * 60 * 1000);
  return result;
}

export function clearGameCoverCache() {
  memoryCache.clear();
  return { ok: true };
}
