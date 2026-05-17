import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  rankGameCoverCandidates,
  scoreGameCoverCandidate
} from '../backend/src/services/gameCoverService.js';

function assertNoAcceptedTitleMismatch(query, candidates) {
  const ranked = rankGameCoverCandidates(query, candidates);
  assert.notEqual(ranked.selected?.titleMatch, false, `${query}: selected não pode ter titleMatch=false`);

  for (const candidate of ranked.candidates) {
    if (candidate.titleMatch === false) {
      assert.equal(candidate.accepted, false, `${query}: ${candidate.title} não pode ser accepted com titleMatch=false`);
      assert.equal(candidate.rejectedReason, 'title-mismatch', `${query}: ${candidate.title} deve ser title-mismatch`);
      assert.ok(candidate.confidence < 0.7, `${query}: ${candidate.title} deve ficar abaixo do threshold`);
    }
  }

  return ranked;
}


const frontendSource = readFileSync(new URL('../front/assets/js/games-2026-feature.js', import.meta.url), 'utf8');

assert.match(frontendSource, /\/api\/games\/cover/, 'games-2026-feature.js deve chamar /api/games/cover');
assert.match(frontendSource, /selected\.titleMatch\s*===\s*true/, 'frontend deve aceitar apenas capas com selected.titleMatch=true');
assert.doesNotMatch(
  frontendSource,
  /return\s+[^;]*firstWithImage\?\.image[^;]*(?:CURATED_COVERS|curated|apiCover|resolveApiCover)/s,
  'mediaImage/render principal não pode priorizar firstWithImage?.image antes de API/CURATED_COVERS'
);
assert.doesNotMatch(
  frontendSource,
  /function\s+mediaImage[\s\S]*?firstWithImage\?\.image[\s\S]*?}/,
  'mediaImage não deve usar context.items[].image como capa principal'
);
assert.match(
  frontendSource,
  /return\s+CURATED_COVERS\[game\.title\]\s*\|\|\s*FALLBACK_COVER/,
  'fallback de capa principal deve usar CURATED_COVERS antes de FALLBACK_COVER'
);

function assertCuratedCoverValue(title, expected) {
  const declaration = `'${title}': '${expected}'`;
  assert.ok(frontendSource.includes(declaration), `${title}: capa curated deve existir no frontend`);
  return expected;
}

const finalFantasyCuratedCover = assertCuratedCoverValue(
  'Final Fantasy VII Remake – Parte 3',
  'assets/img/game-cover-final-fantasy-vii-remake-parte-3.svg'
);
const niohCuratedCover = assertCuratedCoverValue('Nioh 3', 'assets/img/game-cover-nioh-3.svg');
const marvelTokonCuratedCover = assertCuratedCoverValue(
  'Marvel Tokon: Fighting Souls',
  'assets/img/game-cover-marvel-tokon-fighting-souls.svg'
);
assert.notEqual(finalFantasyCuratedCover, niohCuratedCover, 'Final Fantasy e Nioh não podem compartilhar capa contaminada');
assert.notEqual(finalFantasyCuratedCover, marvelTokonCuratedCover, 'Final Fantasy e Marvel Tokon não podem compartilhar capa contaminada');
assert.notEqual(niohCuratedCover, marvelTokonCuratedCover, 'Nioh e Marvel Tokon não podem compartilhar capa contaminada');

const rawgMismatch = scoreGameCoverCandidate('Nioh 3', {
  source: 'rawg',
  sourceTier: 1,
  title: 'Arma 3',
  image: 'https://example.test/arma-3.jpg',
  titleMatch: false,
  confidence: 0.82
});
assert.equal(rawgMismatch.accepted, false, 'RAWG tier 1 com titleMatch=false deve ser rejected');
assert.equal(rawgMismatch.rejectedReason, 'title-mismatch');
assert.equal(rawgMismatch.confidence, 0.49);

const steamGridMismatch = scoreGameCoverCandidate('Final Fantasy VII Remake Parte 3', {
  source: 'steamgriddb',
  sourceTier: 1,
  title: 'Final Fantasy III',
  image: 'https://example.test/ff3.jpg',
  titleMatch: false,
  confidence: 0.82
});
assert.equal(steamGridMismatch.accepted, false, 'SteamGridDB tier 1 com titleMatch=false deve ser rejected');
assert.equal(steamGridMismatch.rejectedReason, 'title-mismatch');
assert.equal(steamGridMismatch.confidence, 0.49);

const nioh = assertNoAcceptedTitleMismatch('Nioh 3', [
  { source: 'rawg', sourceTier: 1, title: 'Nioh 3', image: 'https://example.test/nioh-3.jpg' },
  { source: 'rawg', sourceTier: 1, title: 'Nioh', image: 'https://example.test/nioh.jpg', titleMatch: false, confidence: 0.82 },
  { source: 'steamgriddb', sourceTier: 1, title: 'Nioh 2', image: 'https://example.test/nioh-2.jpg', titleMatch: false, confidence: 0.82 },
  { source: 'rawg', sourceTier: 1, title: 'Nioh Complete Edition', image: 'https://example.test/nioh-complete.jpg', titleMatch: false, confidence: 0.82 },
  { source: 'rawg', sourceTier: 1, title: 'Arma 3', image: 'https://example.test/arma-3.jpg', titleMatch: false, confidence: 0.82 }
]);
assert.equal(nioh.selected.title, 'Nioh 3');
assert.equal(nioh.candidates.find((candidate) => candidate.title === 'Arma 3')?.rejectedReason, 'title-mismatch');
assert.equal(nioh.candidates.find((candidate) => candidate.title === 'Nioh 2')?.accepted, false);
assert.equal(nioh.candidates.find((candidate) => candidate.title === 'Nioh Complete Edition')?.accepted, false);

const finalFantasy = assertNoAcceptedTitleMismatch('Final Fantasy VII Remake Parte 3', [
  { source: 'steamgriddb', sourceTier: 1, title: 'Final Fantasy VII Remake', image: 'https://example.test/ff7-remake.jpg' },
  { source: 'rawg', sourceTier: 1, title: 'Final Fantasy III', image: 'https://example.test/ff3.jpg', titleMatch: false, confidence: 0.82 },
  { source: 'rawg', sourceTier: 1, title: 'Final Fantasy VI', image: 'https://example.test/ff6.jpg', titleMatch: false, confidence: 0.82 },
  { source: 'rawg', sourceTier: 1, title: 'Final Fantasy VII', image: 'https://example.test/ff7-1997.jpg', titleMatch: false, confidence: 0.82 }
]);
assert.equal(finalFantasy.selected.title, 'Final Fantasy VII Remake');
assert.equal(finalFantasy.candidates.find((candidate) => candidate.title === 'Final Fantasy III')?.rejectedReason, 'title-mismatch');
assert.equal(finalFantasy.candidates.find((candidate) => candidate.title === 'Final Fantasy VI')?.rejectedReason, 'title-mismatch');

const marvel = assertNoAcceptedTitleMismatch('Marvel Tokon', [
  { source: 'steamgriddb', sourceTier: 1, title: 'Marvel Tokon: Fighting Souls', image: 'https://example.test/marvel-tokon.jpg' },
  { source: 'rawg', sourceTier: 1, title: "Marvel's Avengers", image: 'https://example.test/avengers.jpg', titleMatch: false, confidence: 0.82 },
  { source: 'rawg', sourceTier: 1, title: 'Wolverine', image: 'https://example.test/wolverine.jpg', titleMatch: false, confidence: 0.82 },
  { source: 'rawg', sourceTier: 1, title: 'Marvel Heroes', image: 'https://example.test/marvel-heroes.jpg', titleMatch: false, confidence: 0.82 }
]);
assert.equal(marvel.selected.title, 'Marvel Tokon: Fighting Souls');

console.log('validate-games-2026-cards: ok');
