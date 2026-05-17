import assert from 'node:assert/strict';
import {
  rankGameCoverCandidates,
  scoreGameCoverCandidate
} from '../backend/src/services/gameCoverService.js';

function selected(candidates, title) {
  return rankGameCoverCandidates(candidates, title).find((candidate) => (
    candidate.accepted && candidate.sourceTier <= 2 && candidate.confidence >= 0.88
  ));
}

function assertTrustedWinnerBeatsSocial() {
  const title = 'Marvel Tokon: Fighting Souls';
  const candidates = [
    {
      provider: 'serpapi',
      source: 'Reddit',
      title: 'Marvel Tokon: Fighting Souls official cover art',
      image: 'https://i.redd.it/marvel-tokon-fighting-souls.jpg',
      sourceUrl: 'https://www.reddit.com/r/fighters/comments/example/marvel_tokon_fighting_souls_cover/'
    },
    {
      provider: 'rawg',
      source: 'RAWG',
      title,
      image: 'https://media.rawg.io/media/games/marvel-tokon.jpg',
      sourceUrl: 'https://rawg.io/games/marvel-tokon-fighting-souls'
    },
    {
      provider: 'steamgriddb',
      source: 'SteamGridDB',
      title,
      image: 'https://cdn2.steamgriddb.com/grid/example.jpg',
      sourceUrl: 'https://www.steamgriddb.com/game/12345'
    }
  ];

  const winner = selected(candidates, title);
  assert.ok(winner, 'trusted API candidate should be selected');
  assert.match(winner.provider, /rawg|steamgriddb/);
  assert.notEqual(winner.domain, 'reddit.com');
}

function assertSerpApiSocialRejected() {
  const socialSources = [
    ['Reddit', 'https://www.reddit.com/r/gaming/comments/example/nioh_3_cover/'],
    ['Facebook', 'https://www.facebook.com/example/posts/nioh-3-cover'],
    ['Instagram', 'https://www.instagram.com/p/nioh3cover/'],
    ['Displate', 'https://displate.com/displate/nioh-3-poster'],
    ['G2A', 'https://www.g2a.com/nioh-3-pc-cover-key']
  ];

  for (const [source, sourceUrl] of socialSources) {
    const scored = scoreGameCoverCandidate({
      provider: 'serpapi',
      source,
      title: 'Nioh 3 official cover art',
      image: `${sourceUrl}.jpg`,
      sourceUrl
    }, 'Nioh 3');

    assert.equal(scored.accepted, false, `${source} must not be accepted`);
    assert.ok(scored.confidence <= 0.18, `${source} confidence must be low`);
    assert.match(scored.rejectedReason, /source-not-trusted|fanart-social-source/);
  }
}

function assertOfficialDomainsAccepted() {
  const officialCases = [
    ['Marvel Tokon: Fighting Souls', 'Marvel.com', 'https://www.marvel.com/games/marvel-tokon-fighting-souls'],
    ['Marvel’s Wolverine', 'PlayStation', 'https://www.playstation.com/en-us/games/marvels-wolverine/'],
    ['Nioh 3', 'Team NINJA', 'https://teamninja-studio.com/nioh3/']
  ];

  for (const [title, source, sourceUrl] of officialCases) {
    const scored = scoreGameCoverCandidate({
      provider: 'serpapi',
      source,
      title: `${title} official game cover art`,
      image: `${sourceUrl}/keyart.jpg`,
      sourceUrl
    }, title);

    assert.equal(scored.accepted, true, `${source} must be accepted for ${title}`);
    assert.ok(scored.sourceTier <= 2, `${source} must be Tier 1/2`);
    assert.ok(scored.confidence >= 0.9, `${source} confidence must be high`);
  }
}

function assertFanartPredictionRejected() {
  const scored = scoreGameCoverCandidate({
    provider: 'serpapi',
    source: 'Generic Blog',
    title: 'Final Fantasy VII Remake Part 3 fanart prediction poster',
    image: 'https://exampleblog.invalid/final-fantasy-vii-remake-part-3-fanart.jpg',
    sourceUrl: 'https://exampleblog.invalid/final-fantasy-vii-remake-part-3-fanart-prediction'
  }, 'Final Fantasy VII Remake Part 3');

  assert.equal(scored.accepted, false);
  assert.equal(scored.rejectedReason, 'fanart-social-source');
}

assertTrustedWinnerBeatsSocial();
assertSerpApiSocialRejected();
assertOfficialDomainsAccepted();
assertFanartPredictionRejected();

console.log('games-2026 cover quality validation passed');
