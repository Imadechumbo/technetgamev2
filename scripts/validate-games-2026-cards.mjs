import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const scriptPath = path.join(repoRoot, 'front', 'assets', 'js', 'games-2026-feature.js');
const source = await fs.readFile(scriptPath, 'utf8');

const TOKON_HOSTILE_IMAGE = 'https://cdn.example.test/marvel-tokon-fighting-souls-hostile.jpg';
const FALLBACK_COVER = 'assets/img/fallback-game-cover.svg';
const ALLOWED_MARVEL_BADGE_TITLES = new Set([
  'Marvel’s Wolverine',
  "Marvel's Wolverine",
  'Marvel Tokon: Fighting Souls',
  'Marvel 1943: A Ascensão da Hydra'
]);

class FakeList {
  constructor(key) {
    this.key = key;
    this.html = '';
  }

  set innerHTML(value) {
    this.html = String(value);
  }

  get innerHTML() {
    return this.html;
  }
}

class FakeMount {
  constructor() {
    this.html = '';
    this.lists = new Map();
  }

  set innerHTML(value) {
    this.html = String(value);
    this.lists = new Map();
    const listPattern = /data-portal-list="([^"]+)"/g;
    let match;
    while ((match = listPattern.exec(this.html)) !== null) {
      this.lists.set(match[1], new FakeList(match[1]));
    }
  }

  get innerHTML() {
    return this.html;
  }

  querySelector(selector) {
    const match = String(selector).match(/^\[data-portal-list="([^"]+)"\]$/);
    return match ? this.lists.get(match[1]) || null : null;
  }
}

const mount = new FakeMount();
const listeners = new Map();
const fetchCalls = [];
const warnings = [];

const sandbox = {
  document: {
    addEventListener(eventName, callback) {
      listeners.set(eventName, callback);
    },
    querySelector(selector) {
      return selector === '[data-games-2026-list]' ? mount : null;
    }
  },
  window: {
    tngApiUrl(value) {
      return `https://api.example.test${value}`;
    }
  },
  fetch: async (url) => {
    fetchCalls.push(String(url));
    return {
      ok: true,
      async json() {
        return {
          ok: true,
          cover: TOKON_HOSTILE_IMAGE,
          image: TOKON_HOSTILE_IMAGE,
          badge: 'MARVEL',
          label: 'MARVEL',
          category: 'MARVEL',
          categoryLabel: 'MARVEL',
          firstWithImage: { image: TOKON_HOSTILE_IMAGE, label: 'MARVEL' },
          items: [
            {
              url: 'https://news.example.test/hostile-marvel-tokon',
              image: TOKON_HOSTILE_IMAGE,
              title: 'Hostile external item should never drive the main card image',
              source: 'MARVEL',
              label: 'MARVEL',
              category: 'MARVEL',
              categoryLabel: 'MARVEL'
            }
          ]
        };
      }
    };
  },
  console: {
    warn: (...args) => warnings.push(args.join(' ')),
    log: () => {},
    error: (...args) => warnings.push(args.join(' '))
  },
  URL,
  encodeURIComponent,
  String,
  Boolean,
  Array,
  RegExp
};

vm.createContext(sandbox);
vm.runInContext(source, sandbox, { filename: scriptPath });

const domReady = listeners.get('DOMContentLoaded');
if (typeof domReady !== 'function') {
  throw new Error('DOMContentLoaded listener was not registered.');
}

await domReady();

const renderedHtml = [...mount.lists.values()].map((list) => list.innerHTML).join('\n');
const cards = [...renderedHtml.matchAll(/<article class="game-2026-portal-card" id="game-(\d+)">([\s\S]*?)<\/article>/g)]
  .map((match) => ({ rank: Number(match[1]), html: match[2] }));

const failures = [];

if (cards.length !== 26) {
  failures.push(`Expected 26 rendered cards, got ${cards.length}.`);
}

if (fetchCalls.length !== 26) {
  failures.push(`Expected 26 hostile fetch calls, got ${fetchCalls.length}.`);
}

for (const card of cards) {
  const title = (card.html.match(/<h4>([\s\S]*?)<\/h4>/)?.[1] || '').replace(/&amp;/g, '&');
  const cover = card.html.match(/<img class="game-2026-cover" src="([^"]+)"/)?.[1] || '';
  const principalBadges = [...card.html.matchAll(/class="game-2026-(?:tag|media-badge)"[^>]*>([\s\S]*?)<\/span>/g)]
    .map((match) => match[1].replace(/<[^>]*>/g, '').trim());

  if (!title) failures.push(`Card #${card.rank} did not render a title.`);
  if (!cover) failures.push(`${title || `Card #${card.rank}`} did not render a main cover.`);

  if (cover === TOKON_HOSTILE_IMAGE || /hostile|example\.test/i.test(cover)) {
    failures.push(`${title} used a hostile external image as the main cover: ${cover}`);
  }

  if (!/tokon|tōkon/i.test(title) && /tokon|tōkon|fighting[-_\s]?souls/i.test(cover)) {
    failures.push(`${title} used a Tōkon/Fighting Souls cover: ${cover}`);
  }

  if (title === 'Nioh 3' && /tokon|tōkon|fighting[-_\s]?souls/i.test(cover)) {
    failures.push('Nioh 3 used a Tōkon/Fighting Souls image.');
  }

  if (title === 'Ace Combat 8: Wings of Theve' && /tokon|tōkon|fighting[-_\s]?souls/i.test(cover)) {
    failures.push('Ace Combat 8 used a Tōkon/Fighting Souls image.');
  }

  if (title !== 'Marvel Tokon: Fighting Souls' && cover.includes('game-cover-marvel-tokon-fighting-souls')) {
    failures.push(`${title} used the curated Tōkon/Fighting Souls cover.`);
  }

  if (cover !== FALLBACK_COVER && !cover.startsWith('assets/img/')) {
    failures.push(`${title} main cover is not an editorial asset or neutral fallback: ${cover}`);
  }

  if (!ALLOWED_MARVEL_BADGE_TITLES.has(title) && principalBadges.some((badge) => /marvel/i.test(badge))) {
    failures.push(`${title} rendered a MARVEL principal badge: ${principalBadges.join(' | ')}`);
  }

  if (title === 'Tomb Raider Legacy of Atlantis' && principalBadges.some((badge) => /marvel/i.test(badge))) {
    failures.push('Tomb Raider rendered a MARVEL principal badge.');
  }
}

if (failures.length) {
  console.error(`games-2026 card validation failed with ${failures.length} issue(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Validated ${cards.length} games-2026 cards with hostile Tōkon cover and MARVEL badge payload.`);
console.log('All main card covers remained editorial/fallback-only and all principal badges stayed sanitized.');
