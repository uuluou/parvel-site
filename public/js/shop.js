// grilles produits, filtres, tri, recherche
(function () {
  'use strict';
  const C = window.ParVelCart;

  const LABELS = { homme: 'Homme', femme: 'Femme', pack: 'Packs', unisexe: 'Unisexe', all: 'Tous', promo: 'Promo' };

  function card(p) {
    const img = p.images[0] ? '/' + p.images[0] : '';
    const out = !p.available;
    const promo = p.compare_at && Number(p.compare_at) > Number(p.price);
    return `<article class="card reveal in" data-card data-cat="${p.category}" data-promo="${promo ? 1 : 0}">
      ${out ? '<span class="badge out">Épuisé</span>' : promo ? '<span class="badge promo">Promo</span>' : ''}
      <a class="card-media" href="/produit/${p.handle}.html" aria-label="${C.esc(p.title)}">
        <img src="${img}" alt="${C.esc(p.title)}" loading="lazy">
      </a>
      <div class="card-body">
        <h3 class="card-title"><a href="/produit/${p.handle}.html">${C.esc(p.title)}</a></h3>
        <div class="card-price">${C.money(p.price)}
          ${promo ? `<span class="old">${C.money(p.compare_at)}</span>` : ''}</div>
        <div class="card-actions">
          ${out
            ? '<button class="btn btn-ghost btn-add" disabled>Épuisé</button>'
            : `<button class="btn btn-dark btn-add" data-add="${p.handle}">Ajouter au panier</button>`}
        </div>
      </div>
    </article>`;
  }

  async function init() {
    const grid = document.querySelector('[data-product-grid]');
    if (!grid || !C) return;
    const prods = await C.getCatalog();
    const preset = grid.dataset.filter || 'all';
    const chipsWrap = document.querySelector('[data-chips]');
    const sortSel = document.querySelector('[data-sort]');
    const searchBox = document.querySelector('[data-shop-search]');
    const countEl = document.querySelector('[data-count]');
    let chip = preset === 'promo' ? 'promo' : 'all';
    let sort = 'featured';
    let q = '';

    if (chipsWrap && preset === 'all') {
      chipsWrap.innerHTML = ['all', 'homme', 'femme', 'pack', 'unisexe', 'promo']
        .map(k => `<button class="chip${k === 'all' ? ' active' : ''}" data-chip="${k}">${LABELS[k]}</button>`).join('');
      chipsWrap.addEventListener('click', e => {
        const b = e.target.closest('[data-chip]');
        if (!b) return;
        chip = b.dataset.chip;
        chipsWrap.querySelectorAll('.chip').forEach(x => x.classList.toggle('active', x === b));
        render();
      });
    } else if (chipsWrap) {
      chipsWrap.innerHTML = '';
    }
    if (sortSel) sortSel.addEventListener('change', () => { sort = sortSel.value; render(); });
    if (searchBox) searchBox.addEventListener('input', () => { q = searchBox.value.trim().toLowerCase(); render(); });

    function filtered() {
      let list = [...prods];
      if (preset === 'homme') list = list.filter(p => p.category === 'homme' || p.category === 'unisexe');
      else if (preset === 'femme') list = list.filter(p => p.category === 'femme' || p.category === 'unisexe');
      else if (preset === 'pack') list = list.filter(p => p.category === 'pack');
      else if (preset === 'promo') list = list.filter(p => p.compare_at && Number(p.compare_at) > Number(p.price));
      if (chip === 'homme') list = list.filter(p => p.category === 'homme' || p.category === 'unisexe');
      else if (chip === 'femme') list = list.filter(p => p.category === 'femme' || p.category === 'unisexe');
      else if (chip === 'pack') list = list.filter(p => p.category === 'pack');
      else if (chip === 'unisexe') list = list.filter(p => p.category === 'unisexe');
      else if (chip === 'promo') list = list.filter(p => p.compare_at && Number(p.compare_at) > Number(p.price));
      if (q) list = list.filter(p => p.title.toLowerCase().includes(q));
      if (sort === 'price-asc') list.sort((a, b) => a.price - b.price);
      else if (sort === 'price-desc') list.sort((a, b) => b.price - a.price);
      else if (sort === 'name') list.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
      return list;
    }
    function render() {
      const list = filtered();
      grid.innerHTML = list.map(card).join('') ||
        '<p class="empty-state" style="grid-column:1/-1">Aucun produit trouvé.</p>';
      if (countEl) countEl.textContent = list.length + (list.length > 1 ? ' produits' : ' produit');
    }
    render();
  }

  // onglets page d'accueil
  async function initHomeTabs() {
    const wrap = document.querySelector('[data-home-tabs]');
    if (!wrap || !C) return;
    const prods = await C.getCatalog();
    const byHandle = h => prods.find(p => p.handle === h);
    const packs = ['parvel-pack-de-4-gels-douche-parfumes', 'duo-parvel-gel-douches-parfumes',
      'parvel-pack-trio-gels-douches-parfumes', 'parvel-gel-douche-parfume-le-beau-le-parfum',
      'pack-rentree-scolaire-parvel-3-gels-douche-pouf-de-douche'].map(byHandle).filter(Boolean);
    const singles = prods.filter(p => p.category !== 'pack').slice(0, 8);
    const soldes = prods.filter(p => p.compare_at && Number(p.compare_at) > Number(p.price));
    const sets = {
      nouveautes: packs,
      ventes: [...packs.slice(0, 3), ...singles.slice(0, 2)],
      soldes: soldes.length ? soldes : packs.slice(3, 5)
    };
    const grid = wrap.querySelector('[data-tab-grid]');
    function show(key) {
      grid.innerHTML = (sets[key] || []).map(card).join('');
      wrap.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === key));
    }
    wrap.querySelectorAll('.tab').forEach(t => t.addEventListener('click', () => show(t.dataset.tab)));
    show('nouveautes');
  }

  // les 8 gels mis en avant sur la home
  async function initFeatured() {
    const grid = document.querySelector('[data-featured-grid]');
    if (!grid || !C) return;
    const prods = await C.getCatalog();
    const singles = prods.filter(p => p.category !== 'pack').slice(0, 8);
    grid.innerHTML = singles.map(card).join('');
  }

  document.addEventListener('DOMContentLoaded', () => { init(); initHomeTabs(); initFeatured(); });
})();
