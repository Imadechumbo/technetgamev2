(function () {
  function apiUrl(path) {
    if (typeof window.tngApiUrl === 'function') return window.tngApiUrl(path);
    const base = String(window.__TNG_API_BASE__ || 'https://api.technetgame.com.br').replace(/\/$/, '');
    const normalized = path.startsWith('/') ? path : '/' + path;
    return base + normalized;
  }

  const LOCAL_IMAGE_RULES = [
    {
      match: ['rtx 5090'],
      image: 'assets/img/hardware-rtx-5090.webp'
    },
    {
      match: ['rx 9070 xt • rtx 5070 ti • rx 9070', 'rx 9070 xt', 'rtx 5070 ti vs rx 9070 xt', 'rtx 5070 ti', 'rx 9070'],
      image: 'assets/img/hardware-rx-9070xt-rtx-5070ti-rx-9070.webp'
    },
    {
      match: ['rtx 5060 ti • rx 9060 xt • arc b580', 'rtx 5060 ti', 'rx 9060 xt', 'arc b580', 'gpu para 1440p'],
      image: 'assets/img/hardware-rtx-5060ti-rx-9060xt-arc-b580.jpg'
    },
    {
      match: ['rx 9060 • arc b570 • rtx 5050', 'rx 9060', 'arc b570', 'rtx 5050'],
      image: 'assets/img/hardware-rx-9060-arc-b570-rtx-5050.webp'
    },
    {
      match: ['cpu para placas fortes', 'cpu para rtx 5070 ti', 'gaming cpu high performance', 'processador', 'cpu high end'],
      image: 'assets/img/hardware-cpu-placas-fortes.jpg'
    },
    {
      match: ['ssd nvme ps5', 'ssd ps5', 'nvme ps5', 'wd black sn850'],
      image: 'assets/img/hardware-ssd-nvme-ps5.webp'
    },
    {
      match: ['memoria e ssd', 'memória e ssd', 'ssd nvme gen4', 'ssd nvme'],
      image: 'assets/img/hardware-memoria-ssd.jpg'
    },
    {
      match: ['melhores memorias ram de 2026', 'melhores memórias ram de 2026', 'ddr5 memory kit gaming pc', 'ddr5 para jogos', 'memoria ram', 'memória ram', 'kingston fury', 'g.skill trident', 'corsair vengeance'],
      image: 'assets/img/hardware-ram-2026.jpg'
    },
    {
      match: ['notebook gamer', 'notebook gamer rtx 4070', 'notebook gamer high performance', 'gaming laptop'],
      image: 'assets/img/hardware-notebook-gamer.jpg'
    }
  ];

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  function resolveLocalImage(query) {
    const normalized = normalizeText(query);
    const rule = LOCAL_IMAGE_RULES.find((entry) =>
      entry.match.some((term) => normalized.includes(normalizeText(term)))
    );
    return rule ? rule.image : '';
  }

  function parseItems(raw) {
    return String(raw || '')
      .split('|')
      .map(v => v.trim())
      .filter(Boolean)
      .map((entry) => {
        const parts = entry.split('::').map(v => v.trim());
        return {
          title: parts[0] || '',
          description: parts[1] || '',
          link: parts[2] || ''
        };
      })
      .filter(item => item.title);
  }

  function buildGridCard(item, image) {
    const article = document.createElement('article');
    article.className = 'hardware-gallery-card';

    const wrapper = item.link ? document.createElement('a') : document.createElement('div');
    wrapper.className = 'hardware-gallery-card-link';
    if (item.link) {
      wrapper.href = item.link;
      wrapper.rel = 'noopener';
    }

    const img = document.createElement('img');
    img.className = 'hardware-gallery-image';
    img.alt = item.title;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = image;

    const caption = document.createElement('div');
    caption.className = 'hardware-gallery-caption';
    caption.textContent = item.title;

    if (item.description) {
      const desc = document.createElement('p');
      desc.className = 'hardware-gallery-description';
      desc.textContent = item.description;
      caption.appendChild(desc);
    }

    wrapper.appendChild(img);
    wrapper.appendChild(caption);
    article.appendChild(wrapper);
    return article;
  }

  function buildStoryCard(item, image) {
    const article = document.createElement('article');
    article.className = 'hardware-story-card';

    const media = document.createElement(item.link ? 'a' : 'div');
    media.className = 'hardware-story-media';
    if (item.link) {
      media.href = item.link;
      media.rel = 'noopener';
    }

    const img = document.createElement('img');
    img.alt = item.title;
    img.loading = 'lazy';
    img.decoding = 'async';
    img.src = image;
    media.appendChild(img);

    const copy = document.createElement('div');
    copy.className = 'hardware-story-copy';

    const title = document.createElement('h3');
    title.textContent = item.title;
    copy.appendChild(title);

    if (item.description) {
      const desc = document.createElement('p');
      desc.textContent = item.description;
      copy.appendChild(desc);
    }

    if (item.link) {
      const link = document.createElement('a');
      link.className = 'hardware-story-link';
      link.href = item.link;
      link.rel = 'noopener';
      link.textContent = 'Abrir conteúdo';
      copy.appendChild(link);
    }

    article.appendChild(media);
    article.appendChild(copy);
    return article;
  }

  async function fetchImage(query, endpointType) {
    const localImage = resolveLocalImage(query);
    if (localImage) return localImage;

    const cleanQuery = encodeURIComponent(query || 'hardware gamer');
    const path = endpointType === 'game'
      ? '/api/media/game-image?title=' + cleanQuery
      : '/api/media/hardware-image?q=' + cleanQuery;

    try {
      const res = await fetch(apiUrl(path));
      if (!res.ok) throw new Error('Falha ao buscar imagem');
      const data = await res.json();
      return (data && (data.image || data.url)) ? (data.image || data.url) : 'assets/img/fallback-game-cover.svg';
    } catch (error) {
      return 'assets/img/fallback-game-cover.svg';
    }
  }

  async function hydrateGallery(section) {
    const items = parseItems(section.getAttribute('data-items'));
    if (!items.length) return;

    const layout = section.getAttribute('data-layout') || 'grid';
    const endpointType = section.getAttribute('data-endpoint') || 'hardware';

    const grid = document.createElement('div');
    grid.className = layout === 'stack' ? 'hardware-story-list' : 'hardware-gallery-grid';
    section.appendChild(grid);

    const nodes = await Promise.all(items.map(async (item) => {
      const image = await fetchImage(item.title, endpointType);
      return layout === 'stack' ? buildStoryCard(item, image) : buildGridCard(item, image);
    }));

    nodes.forEach((node) => grid.appendChild(node));
  }

  async function hydrateInlineImages() {
    const images = Array.from(document.querySelectorAll('img[data-hardware-query]'));
    await Promise.all(images.map(async (img) => {
      const query = img.getAttribute('data-hardware-query');
      if (!query) return;
      const image = await fetchImage(query, 'hardware');
      if (image) img.src = image;
    }));
  }

  document.addEventListener('DOMContentLoaded', function () {
    document.querySelectorAll('.js-hardware-gallery').forEach((section) => {
      hydrateGallery(section);
    });
    hydrateInlineImages();
  });
})();
