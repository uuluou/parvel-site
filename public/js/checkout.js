/* checkout.js: 3-step COD flow (infos, récapitulatif, confirmation). */
(function () {
  'use strict';
  const C = window.ParVelCart;
  const PHONE_RE = /^(\+212|0)(6|7)\d{8}$/;

  const steps = ['infos', 'recap', 'done'];
  let current = 0;
  let data = { name: '', phone: '', city: '', address: '' };

  function money(n) { return Number(n).toFixed(2) + ' dh'; }
  function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

  function setStep(i) {
    current = i;
    document.querySelectorAll('[data-step]').forEach(el => {
      el.style.display = el.dataset.step === steps[i] ? '' : 'none';
    });
    document.querySelectorAll('.step-dot').forEach((d, idx) => {
      d.classList.toggle('active', idx === i);
      d.classList.toggle('done', idx < i);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function fieldError(id, msg) {
    const f = document.getElementById(id);
    const wrap = f.closest('.field');
    wrap.classList.toggle('invalid', !!msg);
    wrap.querySelector('.err').textContent = msg || '';
    return !msg;
  }

  function validateInfos() {
    const name = document.getElementById('co-name').value.trim();
    const phone = document.getElementById('co-phone').value.replace(/[\s.-]/g, '');
    const city = document.getElementById('co-city').value.trim();
    const address = document.getElementById('co-address').value.trim();
    let ok = true;
    ok = fieldError('co-name', name.length >= 2 ? '' : 'Veuillez entrer votre nom complet.') && ok;
    ok = fieldError('co-phone', PHONE_RE.test(phone) ? '' : 'Numéro marocain invalide (ex: 0612345678).') && ok;
    ok = fieldError('co-city', city.length >= 2 ? '' : 'Veuillez entrer votre ville.') && ok;
    ok = fieldError('co-address', address.length >= 5 ? '' : 'Veuillez entrer votre adresse complète.') && ok;
    if (ok) data = { name, phone, city, address };
    return ok;
  }

  async function renderRecap() {
    const prods = await C.getCatalog();
    const { cart, total } = C.totals();
    const wrap = document.querySelector('[data-recap-items]');
    if (!wrap) return;
    wrap.innerHTML = cart.map(l => {
      const p = prods.find(x => x.handle === l.handle);
      if (!p) return '';
      return `<div class="cart-line">
        <img src="/${p.images[0] || ''}" alt="" loading="lazy">
        <div><p class="t">${esc(p.title)}</p><p class="p">Quantité: ${l.qty}</p></div>
        <strong>${money(p.price * l.qty)}</strong></div>`;
    }).join('');
    document.querySelector('[data-recap-total]').textContent = money(total);
    document.querySelector('[data-recap-name]').textContent = data.name;
    document.querySelector('[data-recap-phone]').textContent = data.phone;
    document.querySelector('[data-recap-addr]').textContent = data.city + ', ' + data.address;
  }

  async function submitOrder(btn) {
    const { cart } = C.totals();
    if (!cart.length) { location.href = '/shop.html'; return; }
    btn.disabled = true;
    btn.textContent = 'Envoi en cours...';
    try {
      const res = await fetch('/api/orders', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, items: cart.map(l => ({ handle: l.handle, qty: l.qty })) })
      });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || 'Erreur');
      document.querySelector('[data-order-num]').textContent = out.order_number;
      document.querySelector('[data-order-total]').textContent = money(out.total);
      C.clear();
      setStep(2);
    } catch (e) {
      const err = document.querySelector('[data-order-error]');
      if (err) err.textContent = 'Erreur: ' + e.message + '. Réessayez.';
      btn.disabled = false;
      btn.textContent = 'Confirmer la commande';
    }
  }

  function init() {
    if (!document.querySelector('[data-checkout]')) return;
    const { cart } = C.totals();
    if (!cart.length && current === 0) {
      document.querySelector('[data-checkout]').innerHTML =
        `<div class="empty-state"><p class="serif" style="font-size:1.6rem;color:var(--espresso)">Votre panier est vide</p>
         <p>Ajoutez des produits avant de commander.</p>
         <a class="btn btn-dark" href="/shop.html" style="margin-top:1rem">Voir la boutique</a></div>`;
      return;
    }
    setStep(0);
    document.querySelector('[data-to-recap]').addEventListener('click', () => {
      if (validateInfos()) { renderRecap(); setStep(1); }
    });
    document.querySelector('[data-back-infos]').addEventListener('click', () => setStep(0));
    document.querySelector('[data-confirm]').addEventListener('click', e => submitOrder(e.currentTarget));
  }

  document.addEventListener('DOMContentLoaded', init);
})();
