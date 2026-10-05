/* cart.js: localStorage cart + drawer, totals, free-shipping progress. */
(function () {
  'use strict';
  const KEY = 'parvel_cart_v1';
  const SHIP_DEFAULT = 300;

  function load() { try { return JSON.parse(localStorage.getItem(KEY)) || []; } catch { return []; } }
  function save(cart) { localStorage.setItem(KEY, JSON.stringify(cart)); renderBadge(); }
  function getShipThreshold() { return window.PARVEL_SHIP_THRESHOLD || SHIP_DEFAULT; }

  let catalog = null;
  async function getCatalog() {
    if (!catalog) {
      try { catalog = await (await fetch('/api/products')).json(); }
      catch { catalog = []; }
    }
    return catalog;
  }
  function findP(handle) { return (catalog || []).find(p => p.handle === handle); }
  function money(n) { return Number(n).toFixed(2) + ' dh'; }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function add(handle, qty) {
    qty = Math.max(1, Math.min(99, parseInt(qty, 10) || 1));
    const cart = load();
    const line = cart.find(l => l.handle === handle);
    if (line) line.qty = Math.min(99, line.qty + qty);
    else cart.push({ handle, qty });
    save(cart);
    openDrawer();
  }
  function setQty(handle, qty) {
    let cart = load();
    if (qty <= 0) cart = cart.filter(l => l.handle !== handle);
    else cart = cart.map(l => l.handle === handle ? { ...l, qty: Math.min(99, qty) } : l);
    save(cart); renderDrawer();
  }
  function clear() { save([]); renderDrawer(); }

  function totals() {
    const cart = load();
    let count = 0, total = 0;
    for (const l of cart) {
      const p = findP(l.handle);
      if (!p) continue;
      count += l.qty;
      total += Number(p.price) * l.qty;
    }
    return { count, total: Math.round(total * 100) / 100, cart };
  }

  function renderBadge() {
    getCatalog().then(() => {
      const { count } = totals();
      document.querySelectorAll('[data-cart-count]').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
      });
    });
  }

  async function renderDrawer() {
    await getCatalog();
    const body = document.querySelector('[data-cart-items]');
    const foot = document.querySelector('[data-cart-foot]');
    if (!body) return;
    const { count, total, cart } = totals();
    const th = getShipThreshold();
    if (cart.length === 0) {
      body.innerHTML = `<div class="cart-empty">
        <p class="serif" style="font-size:1.4rem;color:var(--espresso)">Votre panier est vide</p>
        <p>Découvrez nos gels douche parfumés.</p></div>`;
      if (foot) foot.style.display = 'none';
      return;
    }
    if (foot) foot.style.display = '';
    body.innerHTML = cart.map(l => {
      const p = findP(l.handle);
      if (!p) return '';
      const img = p.images[0] ? '/' + p.images[0] : '';
      return `<div class="cart-line">
        <img src="${img}" alt="" loading="lazy">
        <div><p class="t">${esc(p.title)}</p><p class="p">${money(p.price)}</p>
          <div class="qty" style="margin-top:0.4rem">
            <button data-dec="${p.handle}" aria-label="Diminuer">−</button>
            <span>${l.qty}</span>
            <button data-inc="${p.handle}" aria-label="Augmenter">+</button>
          </div></div>
        <div style="text-align:end"><strong>${money(p.price * l.qty)}</strong><br>
          <button class="line-remove" data-remove="${p.handle}">Retirer</button></div>
      </div>`;
    }).join('');
    const pct = Math.min(100, Math.round(total / th * 100));
    const rest = Math.max(0, th - total);
    const note = rest > 0
      ? `Plus que <strong>${money(rest)}</strong> pour la livraison gratuite`
      : `<strong>Livraison gratuite débloquée</strong>`;
    const footHtml = `
      <div><p class="ship-note">${note}</p>
      <div class="ship-progress" style="margin-top:0.5rem"><i style="width:${pct}%"></i></div></div>
      <div class="totals"><span>Sous total</span><span>${money(total)}</span></div>
      <a class="btn btn-dark btn-block" href="/panier.html">Voir le panier</a>
      <a class="btn btn-gold btn-block" href="/commande.html">Commander, paiement à la livraison</a>`;
    if (foot) foot.innerHTML = footHtml;
    body.querySelectorAll('[data-inc]').forEach(b => b.addEventListener('click', () => {
      const l = load().find(x => x.handle === b.dataset.inc); setQty(b.dataset.inc, (l ? l.qty : 0) + 1);
    }));
    body.querySelectorAll('[data-dec]').forEach(b => b.addEventListener('click', () => {
      const l = load().find(x => x.handle === b.dataset.dec); setQty(b.dataset.dec, (l ? l.qty : 1) - 1);
    }));
    body.querySelectorAll('[data-remove]').forEach(b => b.addEventListener('click', () => setQty(b.dataset.remove, 0)));
  }

  function openDrawer() {
    renderDrawer();
    const d = document.querySelector('[data-cart-drawer]');
    const o = document.querySelector('[data-overlay]');
    if (d) d.classList.add('open');
    if (o) o.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
  function closeDrawer() {
    const d = document.querySelector('[data-cart-drawer]');
    const o = document.querySelector('[data-overlay]');
    if (d) d.classList.remove('open');
    if (o && !document.querySelector('.mobile-nav.open')) o.classList.remove('show');
    document.body.style.overflow = '';
  }

  document.addEventListener('click', e => {
    const addBtn = e.target.closest('[data-add]');
    if (addBtn) {
      const handle = addBtn.dataset.add;
      const wrap = addBtn.closest('[data-qty-wrap]');
      const q = wrap ? parseInt(wrap.querySelector('[data-qty]').value, 10) : 1;
      addBtn.disabled = true;
      getCatalog().then(() => { add(handle, q); addBtn.disabled = false; });
      return;
    }
    if (e.target.closest('[data-cart-open]')) { openDrawer(); return; }
    if (e.target.closest('[data-cart-close]')) { closeDrawer(); return; }
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') { closeDrawer(); } });

  window.ParVelCart = { add, setQty, clear, load, totals, getCatalog, money, esc, renderDrawer, openDrawer, closeDrawer };
  renderBadge();
})();
