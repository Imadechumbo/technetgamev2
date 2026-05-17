import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const source = fs.readFileSync('front/assets/js/games-2026-feature.js', 'utf8');
const TOTAL_CARDS = 26;
const FALLBACK_COVER = 'assets/img/fallback-game-cover.svg';
const forcedCoverTitles = new Set(['Control: Resonant', 'Marvel’s Wolverine', 'Saros', 'Duskbloods', 'Pokémon Pokopia']);

const criticalTitles = {
  finalFantasy: 'Final Fantasy VII Remake – Parte 3',
  assassin: 'Assassin’s Creed Codename Hexe',
  nioh: 'Nioh 3',
  aceCombat: 'Ace Combat 8: Wings of Theve',
  tokon: 'Marvel Tokon: Fighting Souls'
};

function extractTitles() {
  const titles = [...source.matchAll(/\{ rank: \d+, title: '([^']+)'/g)].map((match) => match[1]);
  return titles.slice(0, TOTAL_CARDS);
}

const titles = extractTitles();
assert.equal(titles.length, TOTAL_CARDS, 'fixture must expose 26 games');

function slug(title) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function safeToken(title) {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function validCandidate(title) {
  const normalized = safeToken(title);
  const matchedTerms = [normalized];
  if (title === criticalTitles.finalFantasy) matchedTerms.push('final fantasy', 'ff7', 'remake');
  if (title === criticalTitles.assassin) matchedTerms.push('assassin', 'creed', 'hexe');
  if (title === criticalTitles.nioh) matchedTerms.push('nioh');
  if (title === criticalTitles.aceCombat) matchedTerms.push('ace combat');
  if (title === criticalTitles.tokon) matchedTerms.push('marvel tokon', 'tokon', 'fighting souls');
  return {
    ok: true,
    cover: `https://cdn.example.test/covers/${slug(title)}-official-cover.jpg`,
    selected: {
      image: `https://cdn.example.test/covers/${slug(title)}-official-cover.jpg`,
      source: 'RAWG',
      title: `${title} official game cover`,
      provider: 'rawg',
      confidence: 0.92,
      matched_terms: matchedTerms,
      accepted: true
    },
    candidates: []
  };
}

function hostileCandidate() {
  return {
    ok: true,
    cover: 'https://cdn.example.test/marvel-tokon-fighting-souls/key-art.jpg',
    badge: 'MARVEL',
    selected: {
      image: 'https://cdn.example.test/marvel-tokon-fighting-souls/key-art.jpg',
      source: 'SerpAPI',
      title: 'Marvel Tokon Fighting Souls official cover',
      provider: 'serpapi',
      confidence: 0.98,
      matched_terms: ['marvel tokon', 'tokon', 'fighting souls'],
      badge: 'MARVEL',
      accepted: true
    },
    candidates: []
  };
}

function mixedCandidate(title) {
  const byTitle = {
    [criticalTitles.finalFantasy]: {
      image: 'https://cdn.example.test/assassins-creed-hexe/key-art.jpg',
      title: 'Assassins Creed Codename Hexe key art',
      matched_terms: ['assassin', 'creed', 'hexe']
    },
    [criticalTitles.nioh]: {
      image: 'https://cdn.example.test/marvel-tokon-fighting-souls/key-art.jpg',
      title: 'Marvel Tokon Fighting Souls cover',
      matched_terms: ['tokon', 'fighting souls']
    },
    [criticalTitles.aceCombat]: {
      image: 'https://cdn.example.test/marvel-1943-rise-of-hydra/key-art.jpg',
      title: 'Marvel 1943 Rise of Hydra cover',
      matched_terms: ['marvel 1943', 'hydra'],
      badge: 'MARVEL'
    }
  };
  const candidate = byTitle[title] || validCandidate(title).selected;
  return {
    ok: true,
    cover: candidate.image,
    badge: candidate.badge,
    selected: {
      source: 'SerpAPI',
      provider: 'serpapi',
      confidence: 0.95,
      accepted: true,
      ...candidate
    },
    candidates: []
  };
}

function responseJson(payload) {
  return {
    ok: true,
    async json() {
      return payload;
    }
  };
}

async function renderScenario(name, coverFactory) {
  const lists = new Map();
  let callback;
  const mount = {
    _html: '',
    set innerHTML(value) {
      this._html = String(value);
    },
    get innerHTML() {
      return this._html;
    },
    querySelector(selector) {
      const key = selector.match(/data-portal-list="([^"]+)"/)?.[1];
      if (!key) return null;
      if (!lists.has(key)) {
        lists.set(key, {
          _html: '',
          set innerHTML(value) {
            this._html = String(value);
          },
          get innerHTML() {
            return this._html;
          }
        });
      }
      return lists.get(key);
    }
  };

  const sandbox = {
    console,
    document: {
      querySelector(selector) {
        return selector === '[data-games-2026-list]' ? mount : null;
      },
      addEventListener(event, handler) {
        if (event === 'DOMContentLoaded') callback = handler;
      }
    },
    window: {
      tngApiUrl(path) {
        return path;
      }
    },
    fetch: async (url) => {
      const parsed = new URL(String(url), 'https://technetgame.test');
      const title = parsed.searchParams.get('q') || '';
      if (parsed.pathname === '/api/news/game-search') {
        return responseJson({ ok: true, items: [] });
      }
      if (parsed.pathname === '/api/games/cover') {
        return responseJson(coverFactory(title));
      }
      throw new Error(`Unexpected fetch in ${name}: ${url}`);
    }
  };

  vm.createContext(sandbox);
  vm.runInContext(source, sandbox, { filename: 'front/assets/js/games-2026-feature.js' });
  assert.equal(typeof callback, 'function', `${name}: DOMContentLoaded callback registered`);
  await callback();

  const html = [...lists.values()].map((list) => list.innerHTML).join('\n');
  const cardCount = (html.match(/class="game-2026-portal-card"/g) || []).length;
  const imageSources = [...html.matchAll(/<img class="game-2026-cover" src="([^"]+)"/g)].map((match) => match[1]);
  assert.equal(cardCount, TOTAL_CARDS, `${name}: rendered 26 cards`);
  assert.equal(imageSources.length, TOTAL_CARDS, `${name}: rendered 26 main cover images`);
  return { html, imageSources };
}

function imageForTitle(html, title) {
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`<img class="game-2026-cover" src="([^"]+)" alt="${escapedTitle}"`, 'u');
  return html.match(re)?.[1] || '';
}

function assertNoUnsafeDirectPatterns() {
  const forbidden = [
    /firstWithImage\?\.image/,
    /context\?\.cover/,
    /payload\?\.cover/,
    /return\s+[^;]*(?:context\.cover|payload\.cover)/
  ];
  for (const pattern of forbidden) {
    assert.equal(pattern.test(source), false, `forbidden direct cover pattern found: ${pattern}`);
  }
}

assertNoUnsafeDirectPatterns();

const hostile = await renderScenario('hostile', hostileCandidate);
for (const title of titles) {
  const image = imageForTitle(hostile.html, title);
  if (title === criticalTitles.tokon) {
    assert.match(image, /tokon|fighting-souls/i, 'Tokon may use Tokon image');
  } else {
    assert.doesNotMatch(image, /tokon|fighting-souls/i, `${title} rejected hostile Tokon image`);
    if (!/Marvel/.test(title)) assert.doesNotMatch(image, /marvel/i, `${title} rejected hostile MARVEL badge/image`);
  }
}

const valid = await renderScenario('valid', validCandidate);
for (const title of titles) {
  const image = imageForTitle(valid.html, title);
  if (forcedCoverTitles.has(title)) {
    assert.doesNotMatch(image, /^https:\/\/cdn\.example\.test\//, `${title} keeps approved exact coverOverride priority`);
  } else {
    assert.equal(image, `https://cdn.example.test/covers/${slug(title)}-official-cover.jpg`, `${title} uses validated safeExternalCover`);
  }
}

const mixed = await renderScenario('mixed', mixedCandidate);
for (const title of [criticalTitles.finalFantasy, criticalTitles.nioh, criticalTitles.aceCombat]) {
  const image = imageForTitle(mixed.html, title);
  assert.doesNotMatch(image, /^https:\/\/cdn\.example\.test\//, `${title} rejects mixed wrong-game external cover`);
  assert.notEqual(image, FALLBACK_COVER, `${title} falls back to curated local cover before neutral fallback`);
}

console.log('validate-games-2026-cards: ok');
