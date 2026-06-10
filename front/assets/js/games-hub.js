document.addEventListener('DOMContentLoaded', () => {
  const creators = [
    {
      rank: 1,
      name: 'HadesPlays',
      handle: '@HadesPlays',
      image: 'https://unavatar.io/youtube/@HadesPlays',
      channelUrl: 'https://www.youtube.com/@HadesPlays',
      blurb: 'Lançamentos AAA, desempenho no console e vídeos fortes sobre hype e realidade de mercado.',
      link: 'https://www.youtube.com/@HadesPlays',
      score: '97',
      specialty: 'AAA / hype',
      rhythm: 'Vídeos frequentes'
    },
    {
      rank: 2,
      name: 'Sidão do Game',
      handle: 'Sidão do Game',
      image: 'https://unavatar.io/youtube/channel/UCNKRJBAHTjnK3y0ThOg1uNw',
      channelUrl: 'https://www.youtube.com/channel/UCNKRJBAHTjnK3y0ThOg1uNw',
      blurb: 'Cobertura quente de lançamentos do mês, State of Play, grandes anúncios e jogos mais aguardados.',
      link: 'https://www.youtube.com/channel/UCNKRJBAHTjnK3y0ThOg1uNw',
      score: '94',
      specialty: 'Lançamentos',
      rhythm: 'Cobertura de eventos'
    },
    {
      rank: 3,
      name: 'Flow Games',
      handle: '@FlowGamesPodcast',
      image: 'https://unavatar.io/youtube/@FlowGamesPodcast',
      channelUrl: 'https://www.youtube.com/@FlowGamesPodcast',
      blurb: 'Mesa redonda, notícias, opinião e acompanhamento de showcases e debates do setor.',
      link: 'https://www.youtube.com/@FlowGamesPodcast',
      score: '91',
      specialty: 'Notícias / debate',
      rhythm: 'Lives e react'
    },
    {
      rank: 4,
      name: 'Nautilus',
      handle: 'Nautilus',
      image: 'https://unavatar.io/youtube/channel/UC4LewKZKQecmfRbHI1Rzh5A',
      channelUrl: 'https://www.youtube.com/channel/UC4LewKZKQecmfRbHI1Rzh5A',
      blurb: 'Olhar crítico sobre jogos, seleção forte de indies e análise mais aprofundada de design.',
      link: 'https://www.youtube.com/channel/UC4LewKZKQecmfRbHI1Rzh5A',
      score: '89',
      specialty: 'Crítica / indie',
      rhythm: 'Análise curada'
    }
  ];

  const videos = [
    {
      title: 'HadesPlays: Top 15 Games Coming Out in March 2026',
      creator: 'HadesPlays',
      videoId: '84-MhSDD_Gk',
      link: 'https://www.youtube.com/watch?v=84-MhSDD_Gk',
      note: 'Vídeo do dia puxado para quem quer um panorama rápido dos lançamentos do mês.'
    },
    {
      title: 'Sidão do Game: 12 Jogos LANÇAMENTOS INCRÍVEIS de MARÇO 2026!',
      creator: 'Sidão do Game',
      videoId: 'i0PZgiGSbZo',
      link: 'https://www.youtube.com/watch?v=i0PZgiGSbZo',
      note: 'Boa vitrine para acompanhar o mês com foco em games que devem puxar conversa e busca.'
    },
    {
      title: 'Flow Games: cobertura do Future Games Show Spring 2026',
      creator: 'Flow Games',
      videoId: 'TwExi05b1CI',
      link: 'https://www.youtube.com/watch?v=TwExi05b1CI',
      note: 'Escolha ideal quando a pauta do dia gira em anúncios, trailers e reação de evento.'
    },
    {
      title: 'Nautilus: jogos mais aguardados de 2026',
      creator: 'Nautilus',
      videoId: '6bysObLbaWo',
      link: 'https://www.youtube.com/watch?v=6bysObLbaWo',
      note: 'Vídeo com seleção mais crítica para equilibrar hype, proposta e relevância editorial.'
    }
  ];

  function markHydrating(selector, root = document) {
    root.querySelectorAll(selector).forEach((el) => el.classList.add('is-hydrating'));
  }

  function clearHydrating(el) {
    el.classList.remove('is-hydrating');
    el.classList.add('is-ready');
  }

  async function hydrateGameCover(img) {
    const title = img.dataset.title || img.alt || '';
    const fallback = img.dataset.fallback || 'assets/img/fallback-game-cover.svg';
    const fallbackSrc = fallback.startsWith('/') ? fallback : `/${fallback.replace(/^\.?\/?/, '')}`;

    img.loading = img.dataset.priority === 'high' ? 'eager' : (img.loading || 'lazy');
    img.decoding = 'async';

    img.onerror = () => {
      img.onerror = null;
      img.src = fallback;
      clearHydrating(img);
    };

    try {
      const response = await fetch(window.tngApiUrl(`/api/media/game-image?title=${encodeURIComponent(title)}&fallback=${encodeURIComponent(fallbackSrc)}`));
      if (!response.ok) throw new Error('game-image request failed');

      const payload = await response.json();
      const nextSrc = payload?.image || fallback;

      if (img.src !== nextSrc) {
        const preloader = new Image();
        preloader.decoding = 'async';
        preloader.onload = () => {
          img.src = nextSrc;
          clearHydrating(img);
        };
        preloader.onerror = () => {
          img.src = fallback;
          clearHydrating(img);
        };
        preloader.src = nextSrc;
      } else {
        clearHydrating(img);
      }
    } catch {
      img.src = fallback;
      clearHydrating(img);
    }
  }

  async function hydrateCreatorAvatar(img) {
    const name = img.dataset.creatorName || '';
    const channelUrl = img.dataset.channelUrl || '';
    const fallback = img.dataset.fallback || 'assets/img/default-avatar.svg';
    const fallbackSrc = fallback.startsWith('/') ? fallback : `/${fallback.replace(/^\.?\/?/, '')}`;

    img.loading = img.loading || 'lazy';
    img.decoding = 'async';

    img.onerror = () => {
      img.onerror = null;
      img.src = fallback;
      clearHydrating(img);
    };

    try {
      const response = await fetch(window.tngApiUrl(`/api/media/creator-avatar?name=${encodeURIComponent(name)}&channelUrl=${encodeURIComponent(channelUrl)}&fallback=${encodeURIComponent(fallbackSrc)}`));
      if (!response.ok) throw new Error('creator-avatar request failed');

      const payload = await response.json();
      const nextSrc = payload?.image || fallback;

      if (img.src !== nextSrc) {
        const preloader = new Image();
        preloader.decoding = 'async';
        preloader.onload = () => {
          img.src = nextSrc;
          clearHydrating(img);
        };
        preloader.onerror = () => {
          img.src = fallback;
          clearHydrating(img);
        };
        preloader.src = nextSrc;
      } else {
        clearHydrating(img);
      }
    } catch {
      img.src = fallback;
      clearHydrating(img);
    }
  }

  function observeHydration(selector, callback, root = document) {
    const elements = [...root.querySelectorAll(selector)];
    if (!elements.length) return;

    const eager = elements.slice(0, 2);
    eager.forEach((el) => callback(el));

    const remaining = elements.slice(2);
    if (!remaining.length || !('IntersectionObserver' in window)) {
      remaining.forEach((el) => callback(el));
      return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        callback(entry.target);
        obs.unobserve(entry.target);
      });
    }, { rootMargin: '220px 0px' });

    remaining.forEach((el) => observer.observe(el));
  }

  const creatorsGrid = document.querySelector('[data-creators-grid]');
  if (creatorsGrid) {
    creatorsGrid.innerHTML = creators.map((creator) => `
      <article class="creator-rank-card">
        <div class="creator-header">
          <div class="creator-avatar">
            <img
              src="${creator.image}"
              alt="${creator.name}"
              data-creator-name="${creator.name}"
              data-channel-url="${creator.channelUrl}"
              data-fallback="assets/img/default-avatar.svg"
              loading="lazy"
              decoding="async"
            >
          </div>
          <span class="creator-rank">#${creator.rank}</span>
        </div>
        <div>
          <h3>${creator.name}</h3>
          <p>${creator.blurb}</p>
        </div>
        <div class="creator-stats">
          <div class="stat"><strong>${creator.score}</strong><span>Score editorial</span></div>
          <div class="stat"><strong>${creator.specialty}</strong><span>Força principal</span></div>
          <div class="stat"><strong>${creator.rhythm}</strong><span>Ritmo</span></div>
          <div class="stat"><strong>${creator.handle}</strong><span>Canal</span></div>
        </div>
        <div class="creator-links">
          <a class="text-link-strong" href="${creator.link}" target="_blank" rel="noopener noreferrer">Abrir canal ↗</a>
        </div>
      </article>
    `).join('');
  }

  const videoBox = document.querySelector('[data-video-day]');
  if (videoBox) {
    const dayIndex = Math.floor((Date.now() / 86400000)) % videos.length;
    const video = videos[dayIndex];
    videoBox.innerHTML = `
      <div class="video-day-grid">
        <div class="video-embed-shell">
          <iframe src="https://www.youtube.com/embed/${video.videoId}" title="${video.title}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>
        </div>
        <article class="video-day-card">
          <div class="video-day-body">
            <div class="game-meta-row">
              <span class="meta-pill">Vídeo do dia</span>
              <span class="meta-pill">${video.creator}</span>
            </div>
            <h3>${video.title}</h3>
            <p>${video.note}</p>
            <div class="ticker-list">
              <div class="ticker-item"><span>🔥</span><div><strong>Rotação automática</strong><br>O destaque muda por data, mantendo a área viva sem edição manual.</div></div>
              <div class="ticker-item"><span>🧠</span><div><strong>Conexão com a pauta</strong><br>Os vídeos escolhidos reforçam a cobertura de lançamentos, eventos e hype do calendário.</div></div>
              <div class="ticker-item"><span>📰</span><div><strong>Integração editorial</strong><br>Use o card como apoio para notícias, especiais de jogos e links patrocináveis no futuro.</div></div>
            </div>
            <div class="feature-links">
              <a class="text-link-strong" href="${video.link}" target="_blank" rel="noopener noreferrer">Abrir no YouTube ↗</a>
            </div>
          </div>
        </article>
      </div>
    `;
  }

  markHydrating('.game-cover');
  if (creatorsGrid) {
    markHydrating('.creator-avatar img', creatorsGrid);
  }

  observeHydration('.game-cover[data-title]:not([data-lock-cover="true"])', hydrateGameCover);
  if (creatorsGrid) {
    observeHydration('.creator-avatar img[data-creator-name]', hydrateCreatorAvatar, creatorsGrid);
  }
});
