#!/usr/bin/env python3
"""Generates all ParVel static pages from shared templates + seed data."""
import json, os, re

ROOT = os.path.dirname(os.path.abspath(__file__))
PUB = os.path.join(ROOT, 'public')
site = json.load(open(os.path.join(ROOT, 'site.json'), encoding='utf-8'))

def esc(s):
    return (s or '').replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')

# ---------- inline SVG icons ----------
ICONS = {
    'search': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
    'cart': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6h15l-1.5 9h-12z"/><path d="M6 6L5 3H2"/><circle cx="9" cy="20" r="1.6"/><circle cx="17" cy="20" r="1.6"/></svg>',
    'menu': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>',
    'close': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 6l12 12M18 6L6 18"/></svg>',
    'instagram': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r="1.2" fill="currentColor" stroke="none"/></svg>',
    'tiktok': '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M16.6 3c.4 2.1 1.8 3.6 4 3.9v3c-1.6 0-3-.5-4-1.3v6.6c0 3.9-2.9 6.3-6.3 6.3A6.1 6.1 0 0 1 4 15.4c0-3.4 2.7-6.1 6.2-6.1.3 0 .7 0 1 .1v3.2a3 3 0 0 0-1-.2 3 3 0 0 0-3 3 3 3 0 0 0 3.1 3c1.7 0 3-1.3 3-3.2V3h3.3z"/></svg>',
    'check': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M4 12.5l5 5L20 6.5"/></svg>',
    'truck': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7h11v8H3zM14 10h4l4 4v1h-8z"/><circle cx="7" cy="17.5" r="1.8"/><circle cx="17" cy="17.5" r="1.8"/></svg>',
    'leaf': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 19C5 9 13 4 20 4c0 8-5 15-15 15z"/><path d="M5 19c3-5 7-9 12-11"/></svg>',
    'shield': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>',
    'gift': '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="8" width="18" height="4"/><path d="M5 12v8h14v-8M12 8v12M12 8s-4.5.3-5.5-2C5.7 4.5 8 3.5 9.5 5 10.6 6.2 12 8 12 8zm0 0s4.5.3 5.5-2c.8-1.5-1.5-2.5-3-1C13.4 6.2 12 8 12 8z"/></svg>',
}

def head(title, desc, extra=''):
    return f'''<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{esc(title)} | ParVel</title>
<meta name="description" content="{esc(desc)}">
<link rel="icon" type="image/png" href="/assets/b366d73b4b9c_parvel-favicon-png.png">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="/css/style.css">
{extra}
</head>
<body>
'''

def announce():
    t = 'Livraison gratuite à Partir de 300 dh'
    seq = ' '.join(f'{t} <i>✦</i>' for _ in range(6))
    return f'''<div class="announce" aria-label="Annonce"><div class="announce-track" data-content="announcement_text" data-announce>
<span>{seq} </span><span aria-hidden="true">{seq} </span></div></div>'''

def header(active=''):
    def nav_link(label, href, key):
        cls = ' class="active"' if active == key else ''
        return f'<a href="{href}"{cls}>{label}</a>'
    return f'''{announce()}
<header class="site-header"><div class="wrap header-inner">
  <button class="icon-btn burger" data-burger aria-label="Menu">{ICONS['menu']}</button>
  <a class="logo" href="/" aria-label="ParVel accueil"><img src="/assets/b8df5ff18b8e_parvel-logo-png.png" alt="ParVel"></a>
  <nav class="main-nav" aria-label="Navigation principale">
    {nav_link('ACCUEIL', '/', 'home')}
    {nav_link('GELS DOUCHE HOMME', '/collections/homme.html', 'homme')}
    {nav_link('GELS DOUCHE FEMME', '/collections/femme.html', 'femme')}
    {nav_link('Contact', '/contact.html', 'contact')}
  </nav>
  <div class="header-icons">
    <a class="icon-btn" data-social="instagram" href="https://www.instagram.com/parvel.ma" target="_blank" rel="noopener" aria-label="Instagram">{ICONS['instagram']}</a>
    <a class="icon-btn" data-social="tiktok" href="https://www.tiktok.com/@parvelmaroc" target="_blank" rel="noopener" aria-label="TikTok">{ICONS['tiktok']}</a>
    <button class="icon-btn" data-search-open aria-label="Recherche">{ICONS['search']}</button>
    <button class="icon-btn" data-cart-open aria-label="Panier">{ICONS['cart']}<span class="cart-count" data-cart-count style="display:none">0</span></button>
  </div>
</div></header>
<nav class="mobile-nav" data-mobile-nav aria-label="Menu mobile">
  <button class="icon-btn close-x" data-mobile-close aria-label="Fermer">{ICONS['close']}</button>
  <a href="/">Accueil</a>
  <a href="/collections/homme.html">Gels douche homme</a>
  <a href="/collections/femme.html">Gels douche femme</a>
  <a href="/collections/packs.html">Packs</a>
  <a href="/shop.html">Tous les produits</a>
  <a href="/contact.html">Contact</a>
</nav>
<div class="search-overlay" data-search-overlay>
  <div class="wrap" style="max-width:760px">
    <div style="display:flex;justify-content:flex-end"><button class="icon-btn" data-search-close aria-label="Fermer la recherche">{ICONS['close']}</button></div>
    <input data-search-input type="search" placeholder="Rechercher un parfum..." aria-label="Rechercher">
    <div data-search-results style="margin-top:1.6rem;display:grid;gap:0.8rem"></div>
  </div>
</div>
<div class="overlay" data-overlay></div>
<aside class="drawer" data-cart-drawer aria-label="Panier">
  <div class="drawer-head"><h3>Panier</h3><button class="icon-btn" data-cart-close aria-label="Fermer le panier">{ICONS['close']}</button></div>
  <div class="drawer-body" data-cart-items></div>
  <div class="drawer-foot" data-cart-foot></div>
</aside>'''

def footer():
    fb = site['footer']
    return f'''<footer><div class="wrap">
  <div class="footer-grid">
    <div class="footer-brand">
      <img src="/assets/079e3d8bad4d_parvel-logo-white-png.png" alt="ParVel">
      <h3 data-content="brand_block_title">{esc(fb['brand_block']['title'])}</h3>
      <p data-content="brand_block_text">{esc(fb['brand_block']['text'])}</p>
      <div class="socials">
        <a data-social="instagram" href="https://www.instagram.com/parvel.ma" target="_blank" rel="noopener" aria-label="Instagram">{ICONS['instagram']}</a>
        <a data-social="tiktok" href="https://www.tiktok.com/@parvelmaroc" target="_blank" rel="noopener" aria-label="TikTok">{ICONS['tiktok']}</a>
      </div>
    </div>
    <div><h4>Informations</h4><ul>
      <li><a href="/shop.html">Gels Douche Parfumés</a></li>
      <li><a href="/collections/femme.html">Gel Douche Parfumé Femme</a></li>
      <li><a href="/collections/homme.html">Gel Douche Parfumé Homme</a></li>
      <li><a href="/collections/packs.html">Packs</a></li>
      <li><a href="/histoire.html">Notre histoire</a></li>
      <li><a href="/faq.html">FAQ</a></li>
    </ul></div>
    <div><h4>Contact</h4><ul>
      <li><a data-content="email" href="mailto:{fb['contact_info']['email']}">{fb['contact_info']['email']}</a></li>
      <li><a href="/contact.html">Nous écrire</a></li>
    </ul></div>
  </div>
  <div class="footer-bottom">
    <span data-content="copyright">{esc(fb['copyright'])}</span>
    <a href="/privacy.html">Politique de confidentialité</a>
  </div>
</div></footer>'''

def scripts(*names):
    tags = '\n'.join(f'<script src="/js/{n}.js" defer></script>' for n in names)
    return tags + '\n</body>\n</html>\n'

def review_card_html(r, photo=None):
    initial = (r.get('author') or '?').strip()[:1].upper()
    img = f'<img src="/assets/{photo}" alt="" loading="lazy">' if photo else f'<span class="avatar-fallback" aria-hidden="true">{esc(initial)}</span>'
    return f'''<article class="review reveal">
  <div class="stars" aria-label="5 étoiles">★★★★★</div>
  <h4>{esc(r.get('title'))}</h4>
  <p>{esc(r.get('text'))}</p>
  <div class="review-author">{img}<div><strong>{esc(r.get('author'))}</strong><br><span class="verified">Achat vérifié</span></div></div>
</article>'''

def faq_html(faq):
    out = []
    for f in faq:
        out.append(f'''<div class="faq-item">
  <button class="faq-q" type="button">{esc(f['q'])}<span class="plus">+</span></button>
  <div class="faq-a"><p>{esc(f['a'])}</p></div>
</div>''')
    return '\n'.join(out)

def write(path, content):
    full = os.path.join(PUB, path)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    open(full, 'w', encoding='utf-8').write(content)
    print('wrote', path, len(content), 'bytes')

# ---------- index.html ----------
def page_index():
    reviews = site['reviews_homepage']
    photos = ['fe89ee9fa055_WhatsApp_Image_2026-09-16_at_12.06.59.jpg',
              '5456e92f9e57_WhatsApp_Image_2026-10-01_at_15.27.08.jpg',
              'da08d27fb32c_WhatsApp_Image_2026-09-29_at_13.54.47.jpg']
    review_cards = '\n'.join(review_card_html(r, ph) for r, ph in zip(reviews, photos))

    collections = [
        ('Packs de gels douche', 'Découvrez les packs de gels douche parfumés ParVel, pensés pour varier les...',
         '/collections/packs.html', '951bbfec28d1_a426dec2-cda9-427d-9e77-e79348566c28.png'),
        ('Gel Douche Parfumé Homme', 'Découvrez les gels douche parfumés homme ParVel, avec des fragrances aux univers...',
         '/collections/homme.html', '50676e3c848c_parvel_light_blue_homme_douche_epaules.png'),
        ('Gel Douche Parfumé Femme', 'Découvrez les gels douche parfumés femme ParVel, avec une sélection de fragrances...',
         '/collections/femme.html', 'b5af8f50aa80_parvel_prada_femme_scene_douche_rose_final.png'),
    ]
    col_cards = '\n'.join(f'''<a class="card reveal" href="{href}" style="text-decoration:none">
      <div class="card-media"><img src="/assets/{img}" alt="{esc(t)}" loading="lazy"></div>
      <div class="card-body"><h3 class="card-title">{esc(t)}</h3><p class="lead" style="font-size:0.92rem">{esc(d)}</p></div>
    </a>''' for t, d, href, img in collections)

    marquee_seq = ' '.join(f'{esc(t)} <b>✦</b>' for t in ['Stock Limité !', 'Cadeau Inclus 🎁'] * 4)

    body = f'''{head("Gels douche parfumés inspirés des grands parfums", "ParVel, gels douche parfumés au Maroc. Paiement à la livraison partout au Maroc.")}
{header('home')}
<main>
<!-- HERO -->
<section class="hero" style="padding:0">
  <video data-hero-video src="/assets/video-hero.mp4" poster="/assets/ba483d5a8f64_e45905431b744bafa086ef7f6079ce28.thumbnail.0000000000.jpg" autoplay muted loop playsinline></video>
  <div class="hero-content"><div class="wrap">
    <span class="eyebrow" style="color:var(--champagne)">Maison de parfum, Maroc</span>
    <h1 data-content="hero_title">Parfumez <em>Votre</em> Douche</h1>
    <p class="hero-sub">Des gels douche aux fragrances d'exception, inspirées des grands parfums. Paiement à la livraison, partout au Maroc.</p>
    <div class="hero-ctas">
      <a class="btn btn-light" href="/shop.html" data-content="hero_cta">Shop Now</a>
      <a class="btn btn-ghost" style="color:var(--ivory);border-color:rgba(250,246,240,0.4)" href="/collections/packs.html">Voir les packs</a>
    </div>
  </div></div>
</section>

<!-- TRUST BAR -->
<div class="trustbar"><div class="wrap">
  <span class="trust-item">{ICONS['truck']} Paiement à la livraison</span>
  <span class="trust-item">{ICONS['leaf']} Sans alcool, sans parabènes</span>
  <span class="trust-item">{ICONS['shield']} Achat vérifié</span>
  <span class="trust-item">{ICONS['gift']} Cadeau inclus</span>
</div></div>

<!-- COLLECTIONS -->
<section data-reveal-group><div class="wrap">
  <div class="page-head reveal"><span class="eyebrow">Collections</span>
    <h2>Explorez l'univers ParVel</h2></div>
  <div class="grid products" style="grid-template-columns:repeat(3,1fr)" data-collections>
    {col_cards}
  </div>
</div></section>

<!-- NOS PRODUITS / TABS -->
<section style="background:var(--ivory-deep)" data-reveal-group><div class="wrap" data-home-tabs>
  <div class="page-head reveal"><span class="eyebrow">La sélection</span>
    <h2 data-content="nos_produits_title">Nos produits</h2>
    <p class="lead" data-content="nos_produits_sub">Découvrez notre sélection</p></div>
  <div class="tabs reveal" role="tablist">
    <button class="tab active" data-tab="nouveautes" role="tab">Nouveautés</button>
    <button class="tab" data-tab="ventes" role="tab">Meilleures Ventes</button>
    <button class="tab" data-tab="soldes" role="tab">Soldes</button>
  </div>
  <div class="grid products" data-tab-grid></div>
  <div style="text-align:center;margin-top:2.2rem"><a class="btn btn-dark" href="/shop.html">Tout afficher</a></div>
</div></section>

<!-- GENDER BLOCK -->
<section><div class="wrap"><div class="split alt reveal" data-reveal-group>
  <div class="split-media"><img src="/assets/869adfd7d541_ChatGPT_Image_6_aout_2026_17_07_20.png" alt="ParVel pour elle et pour lui" loading="lazy"></div>
  <div>
    <span class="eyebrow">Pour tous</span>
    <h2 data-content="gender_title">Pensé pour elle. Pensé pour lui.</h2>
    <p class="lead" data-content="gender_text">Retrouvez les senteurs qui vous font craquer, formulés sans alcool, sans silicone et sans parabènes.</p>
    <a class="btn btn-gold" href="/shop.html" data-content="gender_cta" style="margin-top:1rem">Composer mon pack</a>
  </div>
</div></div></section>

<!-- FRAICHEUR GRID -->
<section data-reveal-group><div class="wrap">
  <div class="page-head reveal"><span class="eyebrow">Les incontournables</span>
    <h2 data-content="fraicheur_title">Une fraîcheur qui vous ressemble</h2></div>
  <div class="grid products" data-featured-grid></div>
  <div style="text-align:center;margin-top:2.2rem"><a class="btn btn-ghost" href="/shop.html">Tout afficher</a></div>
</div></section>

<!-- RICH TEXT -->
<section style="padding:2rem 0"><div class="wrap" style="text-align:center">
  <h2 class="reveal" data-content="rich_text" style="font-style:italic">Votre Parfum Préféré, en Gel Douche</h2>
</div></section>

<!-- STORY -->
<section><div class="wrap"><div class="split flip reveal" data-reveal-group>
  <div class="split-media"><img src="/assets/136a29f2e681_ChatGPT_Image_Aug_6_2026_12_18_49_AM.png" alt="L'histoire ParVel" loading="lazy"></div>
  <div>
    <span class="eyebrow">Notre histoire</span>
    <h2 data-content="story_title">Notre Histoire, Votre Bien-être</h2>
    <p class="lead" data-content="story_text">Chaque gel douche ParVel associe une mousse onctueuse, des ingrédients doux pour la peau et des parfums d'exception pour transformer votre routine quotidienne en un véritable moment de plaisir.</p>
    <a class="btn btn-dark" href="/shop.html" data-content="story_cta" style="margin-top:1rem">Découvrir la collection</a>
  </div>
</div></div></section>

<!-- BADGES -->
<section style="padding-top:1rem"><div class="wrap">
  <div class="badges" data-badges data-reveal-group>
    <div class="badge-card reveal"><img src="/assets/379fd0e01b6b_R_2.png" alt="" loading="lazy"><strong>SANS ALCOOL / FREE PARABEN, SILICON</strong></div>
    <div class="badge-card reveal"><img src="/assets/b82338abf7cb_R_14.png" alt="" loading="lazy"><strong>PAIEMENT A LA LIVRAISON</strong></div>
  </div>
</div></section>

<!-- MARQUEE BAND -->
<div class="band" aria-hidden="true"><div class="band-track" data-marquee>
  <span>{marquee_seq} </span><span aria-hidden="true">{marquee_seq} </span>
</div></div>

<!-- REVIEWS -->
<section data-reveal-group><div class="wrap">
  <div class="page-head reveal"><span class="eyebrow">Ils en parlent</span><h2>Avis clients</h2></div>
  <div class="reviews" data-reviews-home>
    {review_cards}
  </div>
</div></section>

<!-- FAQ -->
<section style="background:var(--ivory-deep)"><div class="wrap">
  <div class="page-head reveal"><span class="eyebrow">Questions</span><h2>FAQ</h2></div>
  <div class="faq reveal" data-faq data-faq-list>
    {faq_html(site['faq'])}
  </div>
  <div style="text-align:center;margin-top:2rem"><a class="btn btn-ghost" href="/faq.html">Toutes les questions</a></div>
</div></section>
</main>
{footer()}
{scripts('site', 'cart', 'shop')}
'''
    write('index.html', body)

# ---------- shop.html ----------
def page_shop():
    body = f'''{head("Tous les gels douche parfumés", "Tous les gels douche parfumés ParVel: 18 fragrances inspirées des grands parfums. Paiement à la livraison.")}
{header()}
<main><section><div class="wrap">
  <div class="page-head"><span class="eyebrow">Boutique</span>
    <h1>Tous les produits</h1>
    <p class="lead" data-count></p></div>
  <div class="toolbar">
    <div class="search">{ICONS['search']}<input data-shop-search type="search" placeholder="Rechercher un parfum..." aria-label="Rechercher"></div>
    <select data-sort aria-label="Trier">
      <option value="featured">Notre sélection</option>
      <option value="price-asc">Prix croissant</option>
      <option value="price-desc">Prix décroissant</option>
      <option value="name">Nom A à Z</option>
    </select>
  </div>
  <div class="chips" data-chips style="margin-bottom:1.6rem"></div>
  <div class="grid products" data-product-grid data-filter="all"></div>
</div></section></main>
{footer()}
{scripts('site', 'cart', 'shop')}
'''
    write('shop.html', body)

# ---------- collections ----------
def page_collection(key, title, desc, filt):
    body = f'''{head(title, desc)}
{header()}
<main><section><div class="wrap">
  <div class="page-head"><span class="eyebrow">Collection</span><h1>{esc(title)}</h1><p class="lead">{esc(desc)}</p><p class="lead" data-count></p></div>
  <div class="grid products" data-product-grid data-filter="{filt}"></div>
  <div style="text-align:center;margin-top:2.4rem"><a class="btn btn-ghost" href="/shop.html">Voir tous les produits</a></div>
</div></section></main>
{footer()}
{scripts('site', 'cart', 'shop')}
'''
    write(f'collections/{key}.html', body)

# ---------- produit.html (dynamic template) ----------
def page_produit():
    body = f'''{head("Produit", "Gel douche parfumé ParVel. Paiement à la livraison partout au Maroc.")}
{header()}
<main><section><div class="wrap">
  <div data-pdp><p class="empty-state">Chargement du produit...</p></div>
  <div style="margin-top:3rem"><h2 style="text-align:center">Vous aimerez aussi</h2>
    <div class="grid products" data-related style="margin-top:1.6rem"></div></div>
  <div style="margin-top:3.5rem"><div class="page-head"><span class="eyebrow">Avis</span><h2>Ce qu'ils en disent</h2></div>
    <div class="reviews" data-reviews-product></div></div>
</section></main>
<div class="sticky-buy on-pdp" data-sticky-buy>
  <img data-sb-img src="" alt="">
  <div class="sb-info"><strong data-sb-title></strong><span data-sb-price></span></div>
  <button class="btn btn-gold" data-sb-add>Ajouter</button>
</div>
{footer()}
<script>
(function() {{
  'use strict';
  const m = location.pathname.match(/\\/produit\\/([^\\/\\.]+)/);
  const handle = m ? m[1] : null;
  const C = window.ParVelCart;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({{ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }}[c]));
  const money = n => Number(n).toFixed(2) + ' dh';
  async function init() {{
    const zone = document.querySelector('[data-pdp]');
    if (!handle) {{ zone.innerHTML = '<p class="empty-state">Produit introuvable.</p>'; return; }}
    let p;
    try {{
      const r = await fetch('/api/products/' + encodeURIComponent(handle));
      if (!r.ok) throw 0;
      p = await r.json();
    }} catch {{ zone.innerHTML = '<p class="empty-state">Produit introuvable.</p>'; return; }}
    document.title = p.title + ' | ParVel';
    const imgs = p.images.length ? p.images : [];
    const main = imgs[0] ? '/' + imgs[0] : '';
    const promo = p.compare_at && Number(p.compare_at) > Number(p.price);
    const paras = p.description.split(/\\n\\s*\\n/).map(x => x.trim()).filter(Boolean);
    zone.innerHTML = `
      <nav style="font-size:0.85rem;color:var(--muted);margin-bottom:1.4rem">
        <a href="/" style="text-decoration:none">Accueil</a> / <a href="/shop.html" style="text-decoration:none">Boutique</a> / <strong style="color:var(--espresso)">${{esc(p.title)}}</strong>
      </nav>
      <div class="pdp">
        <div class="pdp-gallery">
          <div class="pdp-main"><img data-main src="${{main}}" alt="${{esc(p.title)}}"></div>
          ${{imgs.length > 1 ? `<div class="pdp-thumbs">${{imgs.map((im, i) => `
            <button class="${{i === 0 ? 'active' : ''}}" data-thumb="${{i}}" aria-label="Image ${{i + 1}}">
              <img src="/${{im}}" alt="" loading="lazy"></button>`).join('')}}</div>` : ''}}
        </div>
        <div class="pdp-info">
          <span class="reviews-line"><span class="stars">★★★★★</span> +1,268 avis</span>
          <h1 class="pdp-title">${{esc(p.title)}}</h1>
          <div class="pdp-price">${{money(p.price)}}
            ${{promo ? `<span class="old">${{money(p.compare_at)}}</span><span class="save">SAVE</span>` : ''}}</div>
          <div class="cod-strip">{ICONS['truck']} Paiement à la livraison, en espèces</div>
          ${{p.available ? `
          <div class="pdp-ctas" data-qty-wrap>
            <div class="qty-row">
              <div class="qty"><button data-qminus aria-label="Diminuer">−</button>
                <input data-qty value="1" inputmode="numeric" aria-label="Quantité"
                  style="width:44px;text-align:center;border:0;background:none;font-weight:700">
                <button data-qplus aria-label="Augmenter">+</button></div>
              <button class="btn btn-gold" style="flex:1" data-add="${{p.handle}}">Ajouter au panier</button>
            </div>
            <a class="btn btn-dark btn-block" href="/commande.html" data-buynow>Commander maintenant</a>
          </div>` : `<div class="stock-out">Épuisé, de retour très bientôt.</div>`}}
          <div class="pdp-desc">${{paras.map(x => `<p>${{esc(x)}}</p>`).join('') || ''}}</div>
        </div>
      </div>`;
    const mainImg = zone.querySelector('[data-main]');
    zone.querySelectorAll('[data-thumb]').forEach(b => b.addEventListener('click', () => {{
      zone.querySelectorAll('[data-thumb]').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      mainImg.src = '/' + imgs[Number(b.dataset.thumb)];
    }}));
    const qInput = zone.querySelector('[data-qty]');
    if (qInput) {{
      zone.querySelector('[data-qminus]').addEventListener('click', () => {{ qInput.value = Math.max(1, (parseInt(qInput.value, 10) || 1) - 1); }});
      zone.querySelector('[data-qplus]').addEventListener('click', () => {{ qInput.value = Math.min(99, (parseInt(qInput.value, 10) || 1) + 1); }});
      const bn = zone.querySelector('[data-buynow]');
      if (bn) bn.addEventListener('click', e => {{
        e.preventDefault();
        C.add(p.handle, parseInt(qInput.value, 10) || 1);
        setTimeout(() => location.href = '/commande.html', 350);
      }});
    }}
    /* sticky buy bar */
    const sb = document.querySelector('[data-sticky-buy]');
    if (sb && p.available) {{
      sb.querySelector('[data-sb-img]').src = main;
      sb.querySelector('[data-sb-title]').textContent = p.title;
      sb.querySelector('[data-sb-price]').textContent = money(p.price);
      sb.querySelector('[data-sb-add]').addEventListener('click', () => C.add(p.handle, 1));
      const onScroll = () => {{
        sb.classList.toggle('show', scrollY > 560);
        document.body.classList.toggle('has-sticky', scrollY > 560);
      }};
      addEventListener('scroll', onScroll, {{ passive: true }}); onScroll();
    }}
    /* related */
    const all = await C.getCatalog();
    const rel = [...all.filter(x => x.handle !== p.handle && x.category === p.category),
                 ...all.filter(x => x.handle !== p.handle && x.category !== p.category)].slice(0, 4);
    document.querySelector('[data-related]').innerHTML = rel.map(r => `
      <article class="card"><a class="card-media" href="/produit/${{r.handle}}.html">
        <img src="/${{r.images[0] || ''}}" alt="${{esc(r.title)}}" loading="lazy"></a>
        <div class="card-body"><h3 class="card-title"><a href="/produit/${{r.handle}}.html">${{esc(r.title)}}</a></h3>
        <div class="card-price">${{money(r.price)}}</div>
        <div class="card-actions">${{r.available
          ? `<button class="btn btn-dark btn-add" data-add="${{r.handle}}">Ajouter au panier</button>`
          : '<button class="btn btn-ghost btn-add" disabled>Épuisé</button>'}}</div></div></article>`).join('');
    /* reviews */
    try {{
      const c = await (await fetch('/api/content')).json();
      const revs = (c.reviews_product && c.reviews_product.length ? c.reviews_product : []).slice(0, 3);
      if (revs.length && window.ParVelContent)
        document.querySelector('[data-reviews-product]').innerHTML = revs.map(window.ParVelContent.reviewCard).join('');
    }} catch {{}}
  }}
  document.addEventListener('DOMContentLoaded', init);
}})();
</script>
{scripts('site', 'cart')}
'''
    write('produit.html', body)

# ---------- histoire.html ----------
def page_histoire():
    body = f'''{head("Notre histoire", "L'histoire de ParVel: des gels douche parfumés pour transformer votre routine en moment de plaisir.")}
{header()}
<main><section><div class="wrap">
  <div class="page-head"><span class="eyebrow">La maison</span>
    <h1 data-content="story_title">Notre Histoire, Votre Bien-être</h1></div>
  <div class="split reveal" data-reveal-group>
    <div class="split-media"><img src="/assets/136a29f2e681_ChatGPT_Image_Aug_6_2026_12_18_49_AM.png" alt="L'univers ParVel" loading="lazy"></div>
    <div>
      <p class="lead" data-content="story_text" style="font-size:1.1rem">Chaque gel douche ParVel associe une mousse onctueuse, des ingrédients doux pour la peau et des parfums d'exception pour transformer votre routine quotidienne en un véritable moment de plaisir.</p>
      <p class="lead" data-content="brand_block_text">Découvrez les gels douche parfumés ParVel, avec des fragrances fraîches, fruitées, florales et boisées. Livraison partout au Maroc.</p>
      <a class="btn btn-dark" href="/shop.html" data-content="story_cta" style="margin-top:1rem">Découvrir la collection</a>
    </div>
  </div>
</div></section></main>
{footer()}
{scripts('site', 'cart')}
'''
    write('histoire.html', body)

# ---------- faq.html ----------
def page_faq():
    body = f'''{head("Questions fréquentes", "FAQ ParVel: peaux sensibles, choix du parfum, utilisation quotidienne.")}
{header()}
<main><section><div class="wrap">
  <div class="page-head"><span class="eyebrow">Aide</span><h1>Questions fréquentes</h1>
    <p class="lead">Tout ce qu'il faut savoir sur nos gels douche parfumés.</p></div>
  <div class="faq" data-faq data-faq-list>
    {faq_html(site['faq'])}
  </div>
  <div style="text-align:center;margin-top:2.4rem">
    <p class="lead">Une autre question ?</p>
    <a class="btn btn-dark" href="/contact.html">Contactez-nous</a></div>
</div></section></main>
{footer()}
{scripts('site', 'cart')}
'''
    write('faq.html', body)

# ---------- contact.html ----------
def page_contact():
    body = f'''{head("Contact", "Contactez ParVel: parvelma@outlook.com.")}
{header('contact')}
<main><section><div class="wrap">
  <div class="page-head"><span class="eyebrow">Écrivez-nous</span><h1>Contact</h1>
    <p class="lead">Une question sur une fragrance, une commande ? On vous répond vite.</p></div>
  <div class="form-card" data-contact-form>
    <form data-cform novalidate>
      <div class="grid-2">
        <div class="field"><label for="ct-name">Nom *</label><input id="ct-name" name="name" autocomplete="name"><p class="err"></p></div>
        <div class="field"><label for="ct-email">E-mail *</label><input id="ct-email" name="email" type="email" autocomplete="email"><p class="err"></p></div>
      </div>
      <div class="field"><label for="ct-phone">Numéro de téléphone</label><input id="ct-phone" name="phone" type="tel" autocomplete="tel"><p class="err"></p></div>
      <div class="field"><label for="ct-msg">Commentaire *</label><textarea id="ct-msg" name="message" rows="5"></textarea><p class="err"></p></div>
      <p class="err" data-form-err style="text-align:center"></p>
      <button class="btn btn-gold btn-block" type="submit">Envoyer</button>
    </form>
  </div>
</div></section></main>
{footer()}
<script>
document.querySelector('[data-cform]').addEventListener('submit', async e => {{
  e.preventDefault();
  const f = e.target, errBox = document.querySelector('[data-form-err]');
  const get = n => f[n].value.trim();
  let ok = true;
  const mark = (n, msg) => {{
    const wrap = f[n].closest('.field');
    wrap.classList.toggle('invalid', !!msg);
    wrap.querySelector('.err').textContent = msg || '';
    if (msg) ok = false;
  }};
  mark('name', get('name').length >= 2 ? '' : 'Veuillez entrer votre nom.');
  mark('email', /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(get('email')) ? '' : 'E-mail invalide.');
  mark('message', get('message').length >= 3 ? '' : 'Votre message est trop court.');
  if (!ok) return;
  const btn = f.querySelector('button[type="submit"]');
  btn.disabled = true; btn.textContent = 'Envoi...';
  try {{
    const r = await fetch('/api/messages', {{ method: 'POST',
      headers: {{ 'Content-Type': 'application/json' }},
      body: JSON.stringify({{ name: get('name'), email: get('email'), phone: get('phone'), message: get('message') }}) }});
    if (!r.ok) throw new Error((await r.json()).error || 'Erreur');
    document.querySelector('[data-contact-form]').innerHTML =
      `<div style="text-align:center;padding:2rem 0"><div class="confirm-box" style="box-shadow:none">
       <div class="big-check">{ICONS['check']}</div>
       <h2 class="serif">Message envoyé</h2><p class="lead">Merci ! On vous répond très vite.</p>
       <a class="btn btn-dark" href="/">Retour à l'accueil</a></div></div>`;
  }} catch (er) {{
    errBox.textContent = 'Erreur: ' + er.message;
    btn.disabled = false; btn.textContent = 'Envoyer';
  }}
}});
</script>
{scripts('site', 'cart')}
'''
    write('contact.html', body)

# ---------- panier.html ----------
def page_panier():
    body = f'''{head("Panier", "Votre panier ParVel.")}
{header()}
<main><section><div class="wrap" style="max-width:860px">
  <div class="page-head"><span class="eyebrow">Votre sélection</span><h1>Panier</h1></div>
  <div data-page-cart style="display:grid;gap:1rem"></div>
  <div data-page-foot style="margin-top:1.6rem;display:grid;gap:0.9rem"></div>
</div></section></main>
{footer()}
<script>
(async function() {{
  const C = window.ParVelCart;
  const esc = C.esc, money = C.money;
  async function render() {{
    await C.getCatalog();
    const box = document.querySelector('[data-page-cart]');
    const foot = document.querySelector('[data-page-foot]');
    const {{ cart, total }} = C.totals();
    const th = window.PARVEL_SHIP_THRESHOLD || 300;
    if (!cart.length) {{
      box.innerHTML = `<div class="empty-state"><p class="serif" style="font-size:1.6rem;color:var(--espresso)">Votre panier est vide</p>
        <a class="btn btn-dark" href="/shop.html" style="margin-top:1rem">Découvrir la boutique</a></div>`;
      foot.innerHTML = '';
      return;
    }}
    const prods = await C.getCatalog();
    box.innerHTML = cart.map(l => {{
      const p = prods.find(x => x.handle === l.handle);
      if (!p) return '';
      return `<div class="cart-line" style="background:var(--white);border:1px solid var(--line);border-radius:14px;padding:1rem">
        <img src="/${{p.images[0] || ''}}" alt="" loading="lazy">
        <div><p class="t">${{esc(p.title)}}</p><p class="p">${{money(p.price)}}</p>
          <div class="qty" style="margin-top:0.4rem">
            <button data-dec="${{p.handle}}">−</button><span>${{l.qty}}</span><button data-inc="${{p.handle}}">+</button>
          </div></div>
        <div style="text-align:end"><strong>${{money(p.price * l.qty)}}</strong><br>
          <button class="line-remove" data-remove="${{p.handle}}">Retirer</button></div>
      </div>`;
    }}).join('');
    const rest = Math.max(0, th - total);
    foot.innerHTML = `
      <div class="form-card" style="max-width:none">
        <p class="ship-note">${{rest > 0 ? `Plus que <strong>${{money(rest)}}</strong> pour la livraison gratuite` : '<strong>Livraison gratuite débloquée</strong>'}}</p>
        <div class="ship-progress" style="margin:0.6rem 0 1rem"><i style="width:${{Math.min(100, Math.round(total / th * 100))}}%"></i></div>
        <div class="totals"><span>Sous total</span><span>${{money(total)}}</span></div>
        <div style="display:flex;gap:0.7rem;margin-top:1rem;flex-wrap:wrap">
          <a class="btn btn-ghost" href="/shop.html" style="flex:1;min-width:200px">Continuer mes achats</a>
          <a class="btn btn-gold" href="/commande.html" style="flex:1;min-width:200px">Commander, paiement à la livraison</a>
        </div></div>`;
    box.querySelectorAll('[data-inc]').forEach(b => b.onclick = () => {{ const l = C.load().find(x => x.handle === b.dataset.inc); C.setQty(b.dataset.inc, (l ? l.qty : 0) + 1); render(); }});
    box.querySelectorAll('[data-dec]').forEach(b => b.onclick = () => {{ const l = C.load().find(x => x.handle === b.dataset.dec); C.setQty(b.dataset.dec, (l ? l.qty : 1) - 1); render(); }});
    box.querySelectorAll('[data-remove]').forEach(b => b.onclick = () => {{ C.setQty(b.dataset.remove, 0); render(); }});
  }}
  document.addEventListener('DOMContentLoaded', render);
}})();
</script>
{scripts('site', 'cart')}
'''
    write('panier.html', body)

# ---------- commande.html ----------
def page_commande():
    body = f'''{head("Commander", "Commande ParVel, paiement à la livraison.")}
{header()}
<main><section><div class="wrap" data-checkout>
  <div class="page-head"><span class="eyebrow">Paiement à la livraison</span><h1>Commander</h1>
    <p class="lead">Pas de carte requise, vous payez le livreur en espèces.</p></div>
  <div class="steps">
    <span class="step-dot" data-dot><i>1</i> Vos infos</span>
    <span class="step-dot" data-dot><i>2</i> Récapitulatif</span>
    <span class="step-dot" data-dot><i>3</i> Confirmation</span>
  </div>

  <div data-step="infos"><div class="form-card">
    <div class="grid-2">
      <div class="field"><label for="co-name">Nom complet *</label><input id="co-name" autocomplete="name"><p class="err"></p></div>
      <div class="field"><label for="co-phone">Téléphone *</label><input id="co-phone" type="tel" placeholder="0612345678" autocomplete="tel"><p class="err"></p></div>
    </div>
    <div class="grid-2">
      <div class="field"><label for="co-city">Ville *</label><input id="co-city" autocomplete="address-level2"><p class="err"></p></div>
      <div class="field"><label for="co-address">Adresse *</label><input id="co-address" placeholder="Rue, quartier..." autocomplete="street-address"><p class="err"></p></div>
    </div>
    <div class="cod-strip">{ICONS['truck']} On vous appelle pour confirmer avant l'envoi.</div>
    <button class="btn btn-gold btn-block" data-to-recap>Continuer</button>
  </div></div>

  <div data-step="recap" style="display:none"><div class="checkout-grid">
    <div class="form-card" style="margin:0;max-width:none">
      <h3>Votre commande</h3>
      <div data-recap-items style="display:grid;gap:1rem;margin:1.2rem 0"></div>
      <h3>Vos infos</h3>
      <p><strong data-recap-name></strong><br><span dir="ltr" data-recap-phone></span><br><span data-recap-addr></span></p>
      <p class="err" data-order-error></p>
      <div style="display:flex;gap:0.7rem;flex-wrap:wrap">
        <button class="btn btn-ghost" data-back-infos>Retour</button>
        <button class="btn btn-gold" style="flex:1" data-confirm>Confirmer la commande</button>
      </div>
    </div>
    <aside class="summary"><h3>Récapitulatif</h3>
      <div class="totals"><span>Total à payer à la livraison</span><span data-recap-total></span></div>
      <p class="ship-note" style="margin-top:0.8rem">Livraison gratuite à partir de 300 dh.</p>
    </aside>
  </div></div>

  <div data-step="done" style="display:none"><div class="confirm-box">
    <div class="big-check">{ICONS['check']}</div>
    <p class="eyebrow">Commande confirmée</p>
    <h2 class="serif">Merci !</h2>
    <p class="lead">Votre commande <span class="order-num" data-order-num></span> est enregistrée.<br>
    On vous appelle très vite pour confirmer, puis on l'envoie.<br>
    Total à payer à la livraison: <strong data-order-total></strong></p>
    <a class="btn btn-dark" href="/shop.html" style="margin-top:1rem">Continuer mes achats</a>
  </div></div>
</div></section></main>
{footer()}
{scripts('site', 'cart', 'checkout')}
'''
    write('commande.html', body)

# ---------- privacy.html ----------
def page_privacy():
    body = f'''{head("Politique de confidentialité", "Politique de confidentialité ParVel.")}
{header()}
<main><section><div class="wrap" style="max-width:820px">
  <div class="page-head"><span class="eyebrow">Légal</span><h1>Politique de confidentialité</h1>
    <p class="lead">Dernière mise à jour : 9 septembre 2026</p></div>
  <div class="form-card" style="max-width:none">
    <h3 class="serif">Les informations que nous collectons</h3>
    <p class="lead">Lorsque vous passez une commande, nous collectons votre nom, votre numéro de téléphone, votre ville et votre adresse de livraison, uniquement pour traiter et livrer votre commande. Lorsque vous nous écrivez via le formulaire de contact, nous collectons votre nom, votre e-mail et votre message.</p>
    <h3 class="serif">Utilisation de vos informations</h3>
    <p class="lead">Vos informations servent à confirmer votre commande par téléphone, à la préparer et à la livrer, ainsi qu'à répondre à vos messages. Nous ne vendons ni ne partageons vos informations personnelles à des tiers à des fins commerciales.</p>
    <h3 class="serif">Paiement à la livraison</h3>
    <p class="lead">Aucune information bancaire n'est collectée sur ce site : vous payez en espèces à la réception de votre commande.</p>
    <h3 class="serif">Conservation et vos droits</h3>
    <p class="lead">Vos informations sont conservées le temps nécessaire au traitement de votre commande et au suivi client. Vous pouvez demander leur modification ou leur suppression en nous écrivant à <a data-content="email" href="mailto:parvelma@outlook.com">parvelma@outlook.com</a>.</p>
  </div>
</div></section></main>
{footer()}
{scripts('site', 'cart')}
'''
    write('privacy.html', body)

# ---------- admin.html ----------
def page_admin():
    body = f'''{head("Administration", "Back-office ParVel.")}
{header()}
<main><div data-admin></div></main>
{footer()}
{scripts('site', 'cart', 'admin')}
'''
    write('admin.html', body)

# ---------- 404.html ----------
def page_404():
    body = f'''{head("Page introuvable", "Page introuvable.")}
{header()}
<main><section><div class="wrap">
  <div class="empty-state">
    <p class="serif" style="font-size:3rem;color:var(--espresso)">404</p>
    <p class="lead">Cette page n'existe pas ou a été déplacée.</p>
    <a class="btn btn-dark" href="/" style="margin-top:1rem">Retour à l'accueil</a>
  </div>
</div></section></main>
{footer()}
{scripts('site', 'cart')}
'''
    write('404.html', body)

if __name__ == '__main__':
    page_index()
    page_shop()
    page_collection('homme', 'Gels Douche Parfumés Homme', "Les fragrances ParVel aux univers masculins: boisées, fraîches, intenses.", 'homme')
    page_collection('femme', 'Gels Douche Parfumés Femme', "Les fragrances ParVel aux univers féminins: florales, fruitées, gourmandes.", 'femme')
    page_collection('packs', 'Packs de Gels Douche', "Composez votre rituel: duos, trios et packs de gels douche parfumés ParVel.", 'pack')
    page_produit()
    page_histoire()
    page_faq()
    page_contact()
    page_panier()
    page_commande()
    page_privacy()
    page_admin()
    page_404()
    print('All pages generated.')
