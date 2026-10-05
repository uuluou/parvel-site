

(function () {
  'use strict';

  const burger = document.querySelector('[data-burger]');
  const mnav = document.querySelector('[data-mobile-nav]');
  const overlay = document.querySelector('[data-overlay]');
  function openMobile() { mnav && mnav.classList.add('open'); overlay && overlay.classList.add('show'); document.body.style.overflow = 'hidden'; }
  function closeMobile() { mnav && mnav.classList.remove('open'); if (overlay) overlay.classList.remove('show'); document.body.style.overflow = ''; }
  if (burger) burger.addEventListener('click', openMobile);
  const mclose = document.querySelector('[data-mobile-close]');
  if (mclose) mclose.addEventListener('click', closeMobile);
  if (overlay) overlay.addEventListener('click', () => { closeMobile(); closeCartDrawer(); });

  const searchOverlay = document.querySelector('[data-search-overlay]');
  const searchInput = document.querySelector('[data-search-input]');
  const searchResults = document.querySelector('[data-search-results]');
  document.querySelectorAll('[data-search-open]').forEach(b =>
    b.addEventListener('click', () => {
      searchOverlay.classList.add('show'); document.body.style.overflow = 'hidden';
      if (searchInput) { searchInput.value = ''; searchInput.focus(); renderSearch(''); }
    }));
  const sclose = document.querySelector('[data-search-close]');
  if (sclose) sclose.addEventListener('click', () => {
    searchOverlay.classList.remove('show'); document.body.style.overflow = '';
  });
  let allProducts = null;
  async function getProducts() {
    if (!allProducts) {
      try { allProducts = await (await fetch('/api/products')).json(); }
      catch { allProducts = []; }
    }
    return allProducts;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function fmtPrix(n) { return Number(n).toFixed(2) + ' dh'; }
  async function renderSearch(q) {
    if (!searchResults) return;
    const prods = await getProducts();
    q = q.trim().toLowerCase();

    const hits = q ? prods.filter(p => p.title.toLowerCase().includes(q)).slice(0, 6) : [];
    searchResults.innerHTML = hits.map(p => `
      <a class="card" style="flex-direction:row;align-items:center;padding:0.7rem;gap:1rem;text-decoration:none" href="/produit/${p.handle}.html">
        <img src="/${p.images[0] || ''}" alt="" style="width:64px;height:64px;object-fit:cover;border-radius:10px" loading="lazy">
        <span><strong class="serif" style="font-size:1.05rem">${esc(p.title)}</strong><br>
        <span style="font-weight:700">${fmtPrix(p.price)}</span></span>
      </a>`).join('') || (q ? '<p class="empty-state">Aucun résultat.</p>' : '');
  }
  if (searchInput) searchInput.addEventListener('input', e => renderSearch(e.target.value));

  document.querySelectorAll('[data-faq]').forEach(faq => {
    faq.addEventListener('click', e => {
      const q = e.target.closest('.faq-q');
      if (!q) return;
      const item = q.parentElement;
      const ans = item.querySelector('.faq-a');
      const open = item.classList.toggle('open');
      ans.style.maxHeight = open ? ans.scrollHeight + 'px' : '0px';
    });
  });

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (!reduce && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      entries.forEach(en => {
        if (!en.isIntersecting) return;
        const group = en.target.closest('[data-reveal-group]');
        const siblings = group ? [...group.querySelectorAll('.reveal')] : [en.target];
        const idx = siblings.indexOf(en.target);
        en.target.style.transitionDelay = Math.min(idx * 70, 420) + 'ms';
        en.target.classList.add('in');
        io.unobserve(en.target);
      });
    }, { threshold: 0.12 });
    document.querySelectorAll('.reveal').forEach(el => io.observe(el));
  } else {
    document.querySelectorAll('.reveal').forEach(el => el.classList.add('in'));
  }

  const header = document.querySelector('.site-header');

  if (header) {
    addEventListener('scroll', () => {
      header.style.boxShadow = scrollY > 8 ? '0 6px 24px rgba(36,26,18,0.08)' : 'none';
    }, { passive: true });
  }

  function setText(sel, val) {
    if (val == null) return;
    document.querySelectorAll(`[data-content="${sel}"]`).forEach(el => { el.textContent = val; });
  }
  function starRow() { return '★★★★★'; }
  function reviewCard(r) {
    const initial = (r.author || '?').trim().charAt(0).toUpperCase();
    return `<article class="review reveal in">
      <div class="stars" aria-label="5 étoiles">${starRow()}</div>
      <h4>${esc(r.title || '')}</h4>
      <p>${esc(r.text || '')}</p>
      <div class="review-author">
        <span class="avatar-fallback" aria-hidden="true">${esc(initial)}</span>
        <div><strong>${esc(r.author || '')}</strong><br><span class="verified">Achat vérifié</span></div>
      </div>
    </article>`;
  }
  function faqItem(f) {
    return `<div class="faq-item">
      <button class="faq-q" type="button">${esc(f.q)}<span class="plus">+</span></button>
      <div class="faq-a"><p>${esc(f.a)}</p></div>
    </div>`;
  }

  async function bindContent() {
    let c;
    try { c = await (await fetch('/api/content')).json(); }
    catch { return; }
    if (!c || typeof c !== 'object') return;

    setText('announcement_text', null);
    if (c.announcement_text) {
      const track = document.querySelector('[data-announce]');
      if (track) {
        const seq = Array(6).fill(`${esc(c.announcement_text)} <i>✦</i>`).join(' ');
        track.innerHTML = `<span>${seq} </span><span aria-hidden="true">${seq} </span>`;
      } else {
        setText('announcement_text', c.announcement_text);
      }
    }
    setText('hero_title', c.hero_title);
    setText('hero_cta', c.hero_cta);
    setText('rich_text', c.rich_text);
    setText('fraicheur_title', c.fraicheur_title);
    if (c.nos_produits) { setText('nos_produits_title', c.nos_produits.title); setText('nos_produits_sub', c.nos_produits.sub); }
    if (c.story) { setText('story_title', c.story.title); setText('story_text', c.story.text); setText('story_cta', c.story.cta); }
    if (c.gender_block) { setText('gender_title', c.gender_block.title); setText('gender_text', c.gender_block.text); setText('gender_cta', c.gender_block.cta); }
    if (c.settings) {
      setText('brand_block_title', c.settings.brand_block_title);
      setText('brand_block_text', c.settings.brand_block_text);
      setText('copyright', c.settings.copyright);
      const mail = document.querySelector('[data-content="email"]');
      if (mail && c.settings.email) { mail.textContent = c.settings.email; mail.href = 'mailto:' + c.settings.email; }
      document.querySelectorAll('[data-social="instagram"]').forEach(a => { if (c.settings.instagram) a.href = c.settings.instagram; });
      document.querySelectorAll('[data-social="tiktok"]').forEach(a => { if (c.settings.tiktok) a.href = c.settings.tiktok; });
      if (c.settings.shipping_threshold) window.PARVEL_SHIP_THRESHOLD = Number(c.settings.shipping_threshold) || 300;
    }

    if (Array.isArray(c.badges)) {
      const wrap = document.querySelector('[data-badges]');
      if (wrap) {
        const icons = [...wrap.querySelectorAll('img')].map(i => i.getAttribute('src'));
        wrap.innerHTML = c.badges.map((b, i) => `
          <div class="badge-card reveal in">
            ${icons[i] ? `<img src="${icons[i]}" alt="" loading="lazy">` : ''}
            <strong>${esc(b)}</strong>
          </div>`).join('');
      }
    }

    if (Array.isArray(c.marquee_items) && c.marquee_items.length) {
      document.querySelectorAll('[data-marquee]').forEach(track => {
        const seq = c.marquee_items.map(t => `${esc(t)} <b>✦</b>`).join(' ');
        track.innerHTML = `<span>${seq} </span><span aria-hidden="true">${seq} </span>`;
      });
    }

    if (Array.isArray(c.collections)) {
      const wrap = document.querySelector('[data-collections]');
      if (wrap) {
        wrap.innerHTML = c.collections.map(col => `
          <a class="card reveal in" href="${esc(col.href)}" style="text-decoration:none">
            <div class="card-media"><img src="/${esc(col.image)}" alt="${esc(col.title)}" loading="lazy"></div>
            <div class="card-body"><h3 class="card-title">${esc(col.title)}</h3><p class="lead" style="font-size:0.92rem">${esc(col.text)}</p></div>
          </a>`).join('');
      }
    }

    if (Array.isArray(c.reviews_home) && c.reviews_home.length) {
      const wrap = document.querySelector('[data-reviews-home]');
      if (wrap) wrap.innerHTML = c.reviews_home.map(reviewCard).join('');
    }

    if (Array.isArray(c.faq) && c.faq.length) {
      document.querySelectorAll('[data-faq-list]').forEach(wrap => {
        wrap.innerHTML = c.faq.map(faqItem).join('');
      });
    }

  }
  bindContent();
  window.ParVelContent = { bindContent, esc, reviewCard, faqItem };

  function closeCartDrawer() {
    const d = document.querySelector('[data-cart-drawer]');
    if (d) d.classList.remove('open');
  }
  window.ParVelCloseCart = closeCartDrawer;
})();
