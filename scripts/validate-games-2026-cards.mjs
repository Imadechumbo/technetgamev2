import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  gameCoverInternals,
  scoreGameCoverCandidate
} from '../backend/src/services/gameCoverService.js';

const frontendSource = readFileSync(new URL('../front/assets/js/games-2026-feature.js', import.meta.url), 'utf8');
const gamesHtml = readFileSync(new URL('../front/games.html', import.meta.url), 'utf8');

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractFunctionBody(source, functionName) {
  const signature = new RegExp(`(?:async\\s+)?function\\s+${escapeRegExp(functionName)}\\s*\\([^)]*\\)\\s*\\{`, 'm');
  const match = signature.exec(source);
  assert.ok(match, `${functionName} deve existir no frontend`);

  const bodyStart = match.index + match[0].length;
  let depth = 1;
  let index = bodyStart;

  while (index < source.length && depth > 0) {
    const char = source[index];
    if (char === '{') depth += 1;
    if (char === '}') depth -= 1;
    index += 1;
  }

  assert.equal(depth, 0, `${functionName} deve ter chaves balanceadas`);
  return source.slice(bodyStart, index - 1);
}

function assertNotIncludesAny(source, forbiddenTokens, label) {
  for (const token of forbiddenTokens) {
    assert.ok(!source.includes(token), `${label} não pode conter ${token}`);
  }
}

const mediaImageBody = extractFunctionBody(frontendSource, 'mediaImage');
const renderFallbackCardBody = extractFunctionBody(frontendSource, 'renderFallbackCard');
const renderMediaBody = extractFunctionBody(frontendSource, 'renderMedia');
const scriptIncludes = [...gamesHtml.matchAll(/<script\b[^>]*\bgames-2026-feature\.js\?v=([^"'\s>]+)[^>]*><\/script>/g)];

assert.match(frontendSource, /\/api\/games\/cover/, 'frontend deve chamar /api/games/cover');
assert.match(frontendSource, /selected\.titleMatch\s*===\s*true\s*\|\|\s*data\.selected\.aliasMatch\s*===\s*true/, 'frontend deve aceitar selected.titleMatch === true OU selected.aliasMatch === true');
assert.ok(
  frontendSource.includes('TRUSTED_API_COVER_SOURCES.has(String(source).toLowerCase())'),
  'frontend deve validar fonte com TRUSTED_API_COVER_SOURCES.has(String(source).toLowerCase())'
);
assert.ok(frontendSource.includes('isRemoteHttpUrl(image)'), 'frontend deve validar imagem remota com isRemoteHttpUrl(image)');
assert.doesNotMatch(frontendSource, /Boolean\(data\?\.image\s*\|\|\s*data\?\.cover\)/, 'frontend não pode validar image/cover com || dentro de Boolean');
assert.doesNotMatch(frontendSource, /TRUSTED_API_COVER_SOURCES\.has\(\.\.\.\)/, 'frontend não pode conter placeholder TRUSTED_API_COVER_SOURCES.has(...)');
assert.doesNotMatch(
  frontendSource,
  /if\s*\(\s*!isValidApiCoverPayload\(data\)\s*\)\s*\{\s*return\s+null;\s*if\s*\(\s*isValidApiCoverPayload\(data\)\s*\)\s*\{/,
  'resolveApiCover não pode conter bloco quebrado de validação duplicada'
);
assert.doesNotMatch(
  frontendSource,
  /return\s+CURATED_COVERS\[game\.title\]\s*\|\|\s*FALLBACK_COVER;\s*return\s+resolveApiCover\(game\);/,
  'frontend não pode conter retorno antigo seguido do retorno da API'
);

assertNotIncludesAny(mediaImageBody, ['CURATED_COVERS', 'FALLBACK_COVER', 'firstWithImage', 'context?.cover'], 'mediaImage');
assertNotIncludesAny(renderFallbackCardBody, ['CURATED_COVERS', 'FALLBACK_COVER'], 'renderFallbackCard');
assertNotIncludesAny(renderMediaBody, ['CURATED_COVERS', 'FALLBACK_COVER'], 'renderMedia');
assert.equal((renderMediaBody.match(/<img\b/g) || []).length, 1, 'renderMedia deve conter somente um <img');
assert.ok(renderMediaBody.includes('src="${escapeHtml(cover.image)}"'), 'renderMedia deve usar cover.image no src do <img>');
assert.ok(renderMediaBody.includes('cover-missing'), 'renderMedia deve renderizar cover-missing quando não houver capa');
assert.ok(renderMediaBody.includes('Aguardando capa oficial'), 'renderMedia deve informar Aguardando capa oficial');
assert.ok(renderFallbackCardBody.includes('cover-missing'), 'renderFallbackCard deve renderizar cover-missing');
assert.ok(renderFallbackCardBody.includes('Aguardando capa oficial'), 'renderFallbackCard deve informar Aguardando capa oficial');

assert.equal(scriptIncludes.length, 1, 'front/games.html deve conter exatamente uma inclusão de games-2026-feature.js');
assert.equal(scriptIncludes[0][1], '20260519-api-or-local-real-covers-06', 'cache-buster deve ser 20260519-api-or-local-real-covers-06');
assert.ok(!gamesHtml.includes('20260517-api-covers-02'), 'cache-buster antigo 20260517-api-covers-02 não pode existir em front/games.html');

const {
  aliasesForQuery,
  isOfficialAliasMatch,
  isRemoteCoverUrl
} = gameCoverInternals;

assert.deepEqual(
  aliasesForQuery('Diablo IV: Senhor do Ódio'),
  ['diablo 4', 'diablo 4 vessel of hatred'],
  'aliases normalizados de Diablo IV: Senhor do Ódio devem existir'
);
const diabloAlias = scoreGameCoverCandidate('Diablo IV: Senhor do Ódio', {
  source: 'rawg',
  title: 'Diablo IV',
  image: 'https://images.example/diablo-iv.jpg'
});
assert.equal(diabloAlias.titleMatch, false, 'Diablo IV alias não deve ser titleMatch');
assert.equal(diabloAlias.aliasMatch, true, 'Diablo IV alias deve ser aliasMatch');
assert.equal(diabloAlias.accepted, true, 'Diablo IV alias oficial deve ser aceito');

assert.equal(isOfficialAliasMatch('Duskbloods', 'Duskwood'), false, 'Duskwood não pode ser alias oficial');
assert.equal(isOfficialAliasMatch('Duskbloods', 'DarkBlood'), false, 'DarkBlood não pode ser alias oficial');
assert.equal(isOfficialAliasMatch('Duskbloods', 'DarkBlood Reborn'), false, 'DarkBlood Reborn não pode ser alias oficial');

assert.equal(
  scoreGameCoverCandidate('Saros', { source: 'rawg', title: 'Saros', image: 'https://images.example/saros.jpg' }).titleMatch,
  true,
  'Saros deve continuar aceito por titleMatch'
);
assert.equal(
  scoreGameCoverCandidate('Marvel Wolverine', { source: 'rawg', title: 'Marvel Wolverine', image: 'https://images.example/wolv.jpg' }).titleMatch,
  true,
  'Marvel Wolverine deve continuar aceito por titleMatch'
);
assert.equal(
  scoreGameCoverCandidate('Nioh 3', { source: 'rawg', title: 'Arma 3', image: 'https://images.example/arma3.jpg' }).accepted,
  false,
  'Arma 3 não pode ser aceito para Nioh 3'
);
assert.equal(
  scoreGameCoverCandidate('Final Fantasy VII Remake Parte 3', { source: 'rawg', title: 'Final Fantasy III', image: 'https://images.example/ff3.jpg' }).accepted,
  false,
  'Final Fantasy III não pode ser aceito para Final Fantasy VII Remake Parte 3'
);
assert.equal(isRemoteCoverUrl('assets/img/game.svg'), false, 'assets/img/*.svg deve ser rejeitado');
assert.equal(isRemoteCoverUrl('https://cdn.example/game.jpg'), true, 'URL remota http/https deve ser aceita');

console.log('validate-games-2026-cards: ok');
