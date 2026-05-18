import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

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
assert.match(frontendSource, /selected\.titleMatch\s*===\s*true/, 'frontend deve exigir selected.titleMatch === true');
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
assert.equal(scriptIncludes[0][1], '20260517-api-original-covers-03', 'cache-buster deve ser 20260517-api-original-covers-03');
assert.ok(!gamesHtml.includes('20260517-api-covers-02'), 'cache-buster antigo 20260517-api-covers-02 não pode existir em front/games.html');

console.log('validate-games-2026-cards: ok');
