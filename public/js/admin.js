

(function () {
  'use strict';
  const root = document.querySelector('[data-admin]');
  if (!root) return;

  var _draft = null;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function api(path, opts) {
    return fetch(path, opts || {});
  }

  function loginView() {
    root.innerHTML = `<div class="admin-login form-card">
      <img class="admin-login-logo" src="/assets/b8df5ff18b8e_parvel-logo-png.png" alt="ParVel">
      <p class="eyebrow">Administration</p>
      <h1 class="serif">Espace admin</h1>
      <p class="admin-login-sub">Entrez votre mot de passe pour gérer la boutique.</p>
      <div class="field"><label for="adm-pass">Mot de passe</label>
        <input id="adm-pass" type="password" placeholder="Votre mot de passe" autocomplete="current-password">
        <p class="err" data-login-err></p></div>
      <button class="btn btn-dark btn-block" data-login>Se connecter</button>
    </div>`;
    const go = async () => {
      const pw = document.getElementById('adm-pass').value;
      const err = document.querySelector('[data-login-err]');
      err.textContent = '';
      let r;
      try {
        r = await fetch('/api/admin/login', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password: pw })
        });
      } catch { err.textContent = 'Erreur de connexion.'; return; }
      if (!r.ok) {
        const out = await r.json().catch(() => ({}));
        err.textContent = out.error || 'Mot de passe incorrect.';
        return;
      }
      mainView();
    };
    root.querySelector('[data-login]').addEventListener('click', go);
    root.querySelector('#adm-pass').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }

  const TABS = [
    ['produits', 'Produits'], ['contenu', 'Contenu accueil'], ['avis', 'Avis'],
    ['faq', 'FAQ'], ['reglages', 'Réglages'], ['commandes', 'Commandes'], ['messages', 'Messages']
  ];
  let tab = 'produits';
  let content = {};

  async function mainView() {
    try { content = await (await api('/api/content')).json(); } catch { content = {}; }
    let stats = { orders: 0, revenue: 0, products: 0, messages: 0 };
    try {
      const [orders, prods, msgs] = await Promise.all([
        api('/api/orders').then(r => r.json()),
        api('/api/products').then(r => r.json()),
        api('/api/messages').then(r => r.json())
      ]);
      stats.orders = orders.length;
      stats.revenue = orders.reduce((s, o) => s + Number(o.total || 0), 0);
      stats.products = prods.length;
      stats.messages = msgs.length;
    } catch {}
    root.innerHTML = `
      <div class="wrap" style="padding:2rem 0 4rem">
        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:1rem">
          <div><p class="eyebrow">Administration</p><h1 class="serif" style="font-size:2.2rem;margin:0">Back-office ParVel</h1></div>
          <div style="display:flex;gap:0.6rem">
            <a class="btn btn-ghost btn-sm" href="/" target="_blank">Voir le site</a>
            <button class="btn btn-ghost btn-sm" data-logout>Déconnexion</button>
          </div>
        </div>
        <div class="admin-stats">
          <div class="stat-card"><span class="stat-num">${stats.orders}</span><span class="stat-label">Commandes</span></div>
          <div class="stat-card"><span class="stat-num">${stats.revenue.toFixed(0)} dh</span><span class="stat-label">Chiffre d'affaires</span></div>
          <div class="stat-card"><span class="stat-num">${stats.products}</span><span class="stat-label">Produits</span></div>
          <div class="stat-card"><span class="stat-num">${stats.messages}</span><span class="stat-label">Messages</span></div>
        </div>
        <div class="admin-tabs">${TABS.map(([k, l]) =>
          `<button class="admin-tab${k === tab ? ' active' : ''}" data-tab="${k}">${l}</button>`).join('')}</div>
        <div data-tab-body></div>
      </div>`;
    root.querySelector('[data-logout]').addEventListener('click', async () => {
      try { await fetch('/api/admin/logout', { method: 'POST' }); } catch {}
      loginView();
    });
    root.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => {
      tab = b.dataset.tab;
      root.querySelectorAll('[data-tab]').forEach(x => x.classList.toggle('active', x === b));
      renderTab();
    }));
    renderTab();
  }

  function renderTab() {
    console.log('admin tab:', tab);
    const body = root.querySelector('[data-tab-body]');
    ({ produits: vProduits, contenu: vContenu, avis: vAvis, faq: vFaq, reglages: vReglages, commandes: vCommandes, messages: vMessages })[tab](body);
  }

  async function vProduits(body) {
    body.innerHTML = '<p>Chargement...</p>';
    const prods = await (await api('/api/products')).json();
    body.innerHTML = `
      <div class="admin-form"><h3>Ajouter un produit</h3>
        <form data-pform>
          <div class="grid-2">
            <div class="field"><label>Titre *</label><input name="title" required></div>
            <div class="field"><label>Prix (dh) *</label><input name="price" type="number" step="0.01" min="0" required></div>
            <div class="field"><label>Prix barré (dh, optionnel)</label><input name="compare_at" type="number" step="0.01" min="0"></div>
            <div class="field"><label>Catégorie</label>
              <select name="category"><option value="unisexe">Unisexe</option><option value="homme">Homme</option><option value="femme">Femme</option><option value="pack">Pack</option></select></div>
          </div>
          <div class="field"><label>Description</label><textarea name="description" rows="4"></textarea></div>
          <div class="field"><label><input type="checkbox" name="available" checked style="width:auto"> En stock</label></div>
          <div class="field"><label>Stock (vide = illimité)</label><input name="stock" type="number" min="0" step="1" placeholder="Illimité"></div>
          <div class="field"><label>Images (principale + galerie)</label><input type="file" name="images" accept="image/*" multiple><div class="img-preview" data-prev></div></div>
          <p class="err" data-perr></p>
          <button class="btn btn-gold" type="submit">Ajouter le produit</button>
        </form></div>
      <h3>Catalogue (${prods.length} produits)</h3>
      <div style="overflow-x:auto"><table class="admin-table"><thead><tr>
        <th></th><th>Titre</th><th>Prix</th><th>Catégorie</th><th>Stock</th><th></th>
      </tr></thead><tbody>
      ${prods.map(p => `<tr>
        <td>${p.images[0] ? `<img class="thumb" src="/${esc(p.images[0])}" alt="">` : ''}</td>
        <td><strong>${esc(p.title)}</strong><br><small style="color:var(--muted)">${esc(p.handle)}</small></td>
        <td>${Number(p.price).toFixed(2)} dh${p.compare_at ? `<br><s style="color:var(--muted)">${Number(p.compare_at).toFixed(2)}</s>` : ''}</td>
        <td>${esc(p.category)}</td>
        <td>${p.available ? 'En stock' : 'Épuisé'}${p.stock != null ? `<br><small style="color:var(--muted)">Stock: ${p.stock}</small>` : ''}</td>
        <td style="white-space:nowrap"><button class="btn btn-ghost btn-sm" data-edit="${p.id}">Modifier</button>
        <button class="btn btn-danger btn-sm" data-del="${p.id}">Supprimer</button></td>
      </tr>`).join('')}
      </tbody></table></div>
      <div data-edit-zone style="margin-top:1.4rem"></div>`;

    const prev = body.querySelector('[data-prev]');
    body.querySelector('input[name="images"]').addEventListener('change', e => {
      prev.innerHTML = '';
      [...e.target.files].slice(0, 12).forEach(f => {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(f); prev.appendChild(img);
      });
    });

    body.querySelector('[data-pform]').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData(e.target);
      if (!e.target.available.checked) fd.set('available', '0');
      const err = body.querySelector('[data-perr]');
      const r = await api('/api/admin/products', { method: 'POST', body: fd });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) { err.textContent = out.error || 'Erreur'; return; }
      vProduits(body);
    });

    body.querySelectorAll('[data-del]').forEach(b => b.addEventListener('click', async () => {
      if (!confirm('Supprimer ce produit ?')) return;
      await api('/api/admin/products/' + b.dataset.del, { method: 'DELETE' });
      vProduits(body);
    }));
    body.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => editProduct(body, b.dataset.edit, prods)));
  }

  async function editProduct(body, id, prods) {
    const p = prods.find(x => String(x.id) === String(id));
    const zone = body.querySelector('[data-edit-zone]');
    zone.innerHTML = `<div class="admin-form"><h3>Modifier: ${esc(p.title)}</h3>
      <form data-eform>
        <div class="grid-2">
          <div class="field"><label>Titre *</label><input name="title" value="${esc(p.title)}" required></div>
          <div class="field"><label>Prix (dh) *</label><input name="price" type="number" step="0.01" min="0" value="${p.price}" required></div>
          <div class="field"><label>Prix barré (dh)</label><input name="compare_at" type="number" step="0.01" min="0" value="${p.compare_at || ''}"></div>
          <div class="field"><label>Catégorie</label><select name="category">
            ${['unisexe', 'homme', 'femme', 'pack'].map(c => `<option value="${c}"${p.category === c ? ' selected' : ''}>${c}</option>`).join('')}
          </select></div>
        </div>
        <div class="field"><label>Description</label><textarea name="description" rows="4">${esc(p.description)}</textarea></div>
        <div class="field"><label><input type="checkbox" name="available"${p.available ? ' checked' : ''} style="width:auto"> En stock</label></div>
        <div class="field"><label>Stock (vide = illimité)</label><input name="stock" type="number" min="0" step="1" value="${p.stock == null ? '' : p.stock}" placeholder="Illimité"></div>
        <div class="field"><label>Images actuelles</label><div class="img-preview">
          ${p.images.map(im => `<label style="cursor:pointer"><input type="checkbox" name="keep" value="${esc(im)}" checked style="display:none"><img src="/${esc(im)}" title="Décocher pour retirer"></label>`).join('')}
        </div><small style="color:var(--muted)">Cliquez sur une image pour la retirer (elle se grise).</small></div>
        <div class="field"><label>Ajouter des images</label><input type="file" name="images" accept="image/*" multiple></div>
        <p class="err" data-eerr></p>
        <div style="display:flex;gap:0.6rem"><button class="btn btn-gold" type="submit">Enregistrer</button>
        <button class="btn btn-ghost" type="button" data-cancel>Annuler</button></div>
      </form></div>`;
    zone.scrollIntoView({ behavior: 'smooth' });
    zone.querySelectorAll('input[name="keep"]').forEach(cb =>
      cb.addEventListener('change', () => { cb.nextElementSibling.style.opacity = cb.checked ? 1 : 0.25; }));
    zone.querySelector('[data-cancel]').addEventListener('click', () => { zone.innerHTML = ''; });
    zone.querySelector('[data-eform]').addEventListener('submit', async e => {
      e.preventDefault();
      const fd = new FormData();
      const fv = n => e.target.elements[n].value;
      fd.set('title', fv('title'));
      fd.set('price', fv('price'));
      fd.set('compare_at', fv('compare_at'));
      fd.set('category', fv('category'));
      fd.set('description', fv('description'));
      fd.set('available', e.target.elements.available.checked ? '1' : '0');
      const keep = [...zone.querySelectorAll('input[name="keep"]:checked')].map(x => x.value);
      fd.set('keep_images', JSON.stringify(keep));
      [...e.target.elements.images.files].forEach(f => fd.append('images', f));
      const err = zone.querySelector('[data-eerr]');
      const r = await api('/api/admin/products/' + id, { method: 'PUT', body: fd });
      const out = await r.json().catch(() => ({}));
      if (!r.ok) { err.textContent = out.error || 'Erreur'; return; }
      vProduits(body);
    });
  }

  function putKey(key, value) {
    return api('/api/admin/content/' + key, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value })
    });
  }
  function fieldRow(label, name, val, type) {
    if (type === 'textarea')
      return `<div class="kv-row"><label>${label}</label><textarea name="${name}" rows="3" style="font:inherit;padding:0.7rem;border:1px solid var(--line);border-radius:10px">${esc(val)}</textarea></div>`;
    return `<div class="kv-row"><label>${label}</label><input name="${name}" value="${esc(val)}" style="font:inherit;padding:0.7rem;border:1px solid var(--line);border-radius:10px"></div>`;
  }
  async function vContenu(body) {
    const c = content;
    const st = c.story || {}, gb = c.gender_block || {}, np = c.nos_produits || {};
    body.innerHTML = `<form data-cform>
      <h3>Annonces et hero</h3>
      ${fieldRow('Bandeau annonce', 'announcement_text', c.announcement_text)}
      ${fieldRow('Titre hero', 'hero_title', c.hero_title)}
      ${fieldRow('Bouton hero', 'hero_cta', c.hero_cta)}
      <h3 style="margin-top:1.6rem">Badges et bandeau défilant</h3>
      ${fieldRow('Badges (un par ligne)', 'badges', (c.badges || []).join('\n'), 'textarea')}
      ${fieldRow('Bandeau défilant (un par ligne)', 'marquee_items', (c.marquee_items || []).join('\n'), 'textarea')}
      <h3 style="margin-top:1.6rem">Blocs</h3>
      ${fieldRow('Titre histoire', 'story_title', st.title)}
      ${fieldRow('Texte histoire', 'story_text', st.text, 'textarea')}
      ${fieldRow('Bouton histoire', 'story_cta', st.cta)}
      ${fieldRow('Titre bloc genre', 'gender_title', gb.title)}
      ${fieldRow('Texte bloc genre', 'gender_text', gb.text, 'textarea')}
      ${fieldRow('Bouton bloc genre', 'gender_cta', gb.cta)}
      ${fieldRow('Texte riche', 'rich_text', c.rich_text)}
      ${fieldRow('Titre "fraîcheur"', 'fraicheur_title', c.fraicheur_title)}
      ${fieldRow('Titre "Nos produits"', 'nos_produits_title', np.title)}
      ${fieldRow('Sous-titre "Nos produits"', 'nos_produits_sub', np.sub)}
      <h3 style="margin-top:1.6rem">Collections (3 cartes)</h3>
      ${(c.collections || []).map((col, i) => `
        <div class="admin-form"><h4>Carte ${i + 1}</h4>
        ${fieldRow('Titre', 'col_' + i + '_title', col.title)}
        ${fieldRow('Texte', 'col_' + i + '_text', col.text, 'textarea')}
        ${fieldRow('Lien', 'col_' + i + '_href', col.href)}
        <p class="note">Image: /${esc(col.image)} (gérée dans les fichiers du site)</p></div>`).join('')}
      <p class="err" data-cerr></p>
      <button class="btn btn-gold" type="submit">Enregistrer le contenu</button>
    </form>`;
    body.querySelector('[data-cform]').addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target, err = body.querySelector('[data-cerr]');
      const val = n => f[n] ? f[n].value : '';
      const lines = n => val(n).split('\n').map(s => s.trim()).filter(Boolean);
      try {
        await putKey('announcement_text', val('announcement_text'));
        await putKey('hero_title', val('hero_title'));
        await putKey('hero_cta', val('hero_cta'));
        await putKey('badges', lines('badges'));
        await putKey('marquee_items', lines('marquee_items'));
        await putKey('story', { ...st, title: val('story_title'), text: val('story_text'), cta: val('story_cta') });
        await putKey('gender_block', { ...gb, title: val('gender_title'), text: val('gender_text'), cta: val('gender_cta') });
        await putKey('rich_text', val('rich_text'));
        await putKey('fraicheur_title', val('fraicheur_title'));
        await putKey('nos_produits', { title: val('nos_produits_title'), sub: val('nos_produits_sub') });
        const cols = (c.collections || []).map((col, i) => ({
          ...col, title: val('col_' + i + '_title'), text: val('col_' + i + '_text'), href: val('col_' + i + '_href')
        }));
        await putKey('collections', cols);
        content = await (await api('/api/content')).json();
        err.style.color = 'var(--green)'; err.textContent = 'Contenu enregistré.';
      } catch { err.textContent = 'Erreur lors de la sauvegarde.'; }
    });
  }

  async function vAvis(body) {
    const render = () => {
      const home = content.reviews_home || [], prod = content.reviews_product || [];
      const list = (arr, key) => arr.map((r, i) => `
        <div class="admin-form"><div style="display:flex;justify-content:space-between;align-items:center">
          <strong>${esc(r.author)}</strong>
          <button class="btn btn-danger btn-sm" data-rdel="${key}:${i}">Supprimer</button></div>
          <p style="margin:0.6rem 0 0"><em>${esc(r.title)}</em><br>${esc(r.text)}</p>
          <button class="btn btn-ghost btn-sm" data-redit="${key}:${i}" style="margin-top:0.6rem">Modifier</button>
          <div data-reditzone></div></div>`).join('');
      body.innerHTML = `
        <h3>Avis page d'accueil (${home.length})</h3>${list(home, 'reviews_home') || '<p class="note">Aucun avis.</p>'}
        <h3 style="margin-top:1.6rem">Avis pages produit (${prod.length})</h3>${list(prod, 'reviews_product') || '<p class="note">Aucun avis.</p>'}
        <div class="admin-form" style="margin-top:1.6rem"><h3>Ajouter un avis</h3>
          <form data-rform><div class="grid-2">
            <div class="field"><label>Section</label><select name="section"><option value="reviews_home">Accueil</option><option value="reviews_product">Pages produit</option></select></div>
            <div class="field"><label>Auteur *</label><input name="author" required></div></div>
            <div class="field"><label>Titre *</label><input name="title" required></div>
            <div class="field"><label>Texte *</label><textarea name="text" rows="3" required></textarea></div>
            <p class="err" data-rerr></p>
            <button class="btn btn-gold" type="submit">Ajouter</button></form></div>`;
      const save = k => putKey(k, content[k]).then(() => { render(); });
      body.querySelector('[data-rform]').addEventListener('submit', async e => {
        e.preventDefault();
        const f = e.target, fe = n => f.elements[n].value.trim();
        const item = { stars: 5, title: fe('title'), text: fe('text'), author: fe('author') };
        if (!item.title || !item.text || !item.author) { body.querySelector('[data-rerr]').textContent = 'Tous les champs sont requis.'; return; }
        content[fe('section')] = [...(content[fe('section')] || []), item];
        await save(fe('section'));
      });
      body.querySelectorAll('[data-rdel]').forEach(b => b.addEventListener('click', async () => {
        if (!confirm('Supprimer cet avis ?')) return;
        const [k, i] = b.dataset.rdel.split(':');
        content[k] = content[k].filter((_, x) => x !== Number(i));
        await save(k);
      }));
      body.querySelectorAll('[data-redit]').forEach(b => b.addEventListener('click', () => {
        const [k, i] = b.dataset.redit.split(':');
        const r = content[k][Number(i)];
        const zone = b.parentElement.querySelector('[data-reditzone]');
        zone.innerHTML = `<form data-reform style="margin-top:0.8rem"><div class="grid-2">
          <div class="field"><label>Auteur</label><input name="author" value="${esc(r.author)}"></div>
          <div class="field"><label>Titre</label><input name="title" value="${esc(r.title)}"></div></div>
          <div class="field"><label>Texte</label><textarea name="text" rows="3">${esc(r.text)}</textarea></div>
          <button class="btn btn-gold btn-sm" type="submit">Enregistrer</button></form>`;
        zone.querySelector('[data-reform]').addEventListener('submit', async e => {
          e.preventDefault();
          const fe = n => e.target.elements[n].value.trim();
          content[k][Number(i)] = { stars: 5, author: fe('author'), title: fe('title'), text: fe('text') };
          await save(k);
        });
      }));
    };
    render();
  }

  async function vFaq(body) {
    const render = () => {
      const faq = content.faq || [];
      body.innerHTML = `<h3>Questions fréquentes (${faq.length})</h3>
        ${faq.map((f, i) => `<div class="admin-form">
          <div style="display:flex;justify-content:space-between;gap:1rem;align-items:start">
            <div><strong>${esc(f.q)}</strong><p style="margin:0.5rem 0 0;color:var(--muted)">${esc(f.a)}</p></div>
            <div style="white-space:nowrap"><button class="btn btn-ghost btn-sm" data-fedit="${i}">Modifier</button>
            <button class="btn btn-danger btn-sm" data-fdel="${i}">Supprimer</button></div></div>
          <div data-fzone></div></div>`).join('') || '<p class="note">Aucune question.</p>'}
        <div class="admin-form"><h3>Ajouter une question</h3>
          <form data-fform>
            <div class="field"><label>Question *</label><input name="q" required></div>
            <div class="field"><label>Réponse *</label><textarea name="a" rows="3" required></textarea></div>
            <button class="btn btn-gold" type="submit">Ajouter</button></form></div>`;
      const save = () => putKey('faq', content.faq).then(() => render());
      body.querySelector('[data-fform]').addEventListener('submit', async e => {
        e.preventDefault();
        content.faq = [...(content.faq || []), { q: e.target.q.value.trim(), a: e.target.a.value.trim() }];
        await save();
      });
      body.querySelectorAll('[data-fdel]').forEach(b => b.addEventListener('click', async () => {
        if (!confirm('Supprimer cette question ?')) return;
        content.faq = content.faq.filter((_, x) => x !== Number(b.dataset.fdel));
        await save();
      }));
      body.querySelectorAll('[data-fedit]').forEach(b => b.addEventListener('click', () => {
        const i = Number(b.dataset.fedit), f = content.faq[i];
        const zone = b.closest('.admin-form').querySelector('[data-fzone]');
        zone.innerHTML = `<form data-feform style="margin-top:0.8rem">
          <div class="field"><label>Question</label><input name="q" value="${esc(f.q)}"></div>
          <div class="field"><label>Réponse</label><textarea name="a" rows="3">${esc(f.a)}</textarea></div>
          <button class="btn btn-gold btn-sm" type="submit">Enregistrer</button></form>`;
        zone.querySelector('[data-feform]').addEventListener('submit', async e => {
          e.preventDefault();
          content.faq[i] = { q: e.target.q.value.trim(), a: e.target.a.value.trim() };
          await save();
        });
      }));
    };
    render();
  }

  async function vReglages(body) {
    const s = content.settings || {};
    body.innerHTML = `<form data-sform class="admin-form"><h3>Réglages du site</h3>
      ${fieldRow('E-mail de contact', 'email', s.email)}
      ${fieldRow('Instagram (URL)', 'instagram', s.instagram)}
      ${fieldRow('TikTok (URL)', 'tiktok', s.tiktok)}
      ${fieldRow('Seuil livraison gratuite (dh)', 'shipping_threshold', s.shipping_threshold)}
      ${fieldRow('Titre bloc marque (footer)', 'brand_block_title', s.brand_block_title)}
      ${fieldRow('Texte bloc marque (footer)', 'brand_block_text', s.brand_block_text, 'textarea')}
      ${fieldRow('Mention copyright', 'copyright', s.copyright)}
      <p class="err" data-serr></p>
      <button class="btn btn-gold" type="submit">Enregistrer</button></form>`;
    body.querySelector('[data-sform]').addEventListener('submit', async e => {
      e.preventDefault();
      const f = e.target, err = body.querySelector('[data-serr]');
      const th = Number(f.shipping_threshold.value);
      const ns = {
        ...s, email: f.email.value.trim(), instagram: f.instagram.value.trim(), tiktok: f.tiktok.value.trim(),
        shipping_threshold: Number.isFinite(th) && th > 0 ? th : 300,
        brand_block_title: f.brand_block_title.value, brand_block_text: f.brand_block_text.value,
        copyright: f.copyright.value
      };
      await putKey('settings', ns);
      content.settings = ns;
      err.style.color = 'var(--green)'; err.textContent = 'Réglages enregistrés.';
    });
  }

  async function vCommandes(body) {
    body.innerHTML = '<p>Chargement...</p>';
    const orders = await (await api('/api/orders')).json();
    body.innerHTML = `<h3>Commandes (${orders.length})</h3>
      ${orders.length ? `<div style="overflow-x:auto"><table class="admin-table"><thead><tr>
        <th>N°</th><th>Date</th><th>Client</th><th>Téléphone</th><th>Ville / Adresse</th><th>Articles</th><th>Total</th>
      </tr></thead><tbody>${orders.map(o => {
        const items = JSON.parse(o.items || '[]');
        return `<tr><td><strong>${esc(o.order_number)}</strong></td><td>${esc(o.created_at)}</td>
        <td>${esc(o.name)}</td><td dir="ltr">${esc(o.phone)}</td><td>${esc(o.city)}, ${esc(o.address)}</td>
        <td>${items.map(i => `${esc(i.title)} × ${i.qty}`).join('<br>')}</td>
        <td><strong>${Number(o.total).toFixed(2)} dh</strong></td></tr>`;
      }).join('')}</tbody></table></div>` : '<p class="note">Aucune commande pour le moment.</p>'}`;
  }

  async function vMessages(body) {
    body.innerHTML = '<p>Chargement...</p>';
    const msgs = await (await api('/api/messages')).json();
    body.innerHTML = `<h3>Messages (${msgs.length})</h3>
      ${msgs.length ? `<div style="overflow-x:auto"><table class="admin-table"><thead><tr>
        <th>Date</th><th>Nom</th><th>E-mail</th><th>Téléphone</th><th>Message</th>
      </tr></thead><tbody>${msgs.map(m => `<tr><td>${esc(m.created_at)}</td><td>${esc(m.name)}</td>
        <td>${esc(m.email)}</td><td>${esc(m.phone || '')}</td><td>${esc(m.message)}</td></tr>`).join('')}
      </tbody></table></div>` : '<p class="note">Aucun message pour le moment.</p>'}`;
  }

  fetch('/api/orders').then(r => {
    if (r.status === 401) loginView();
    else mainView();
  }).catch(() => loginView());
})();
