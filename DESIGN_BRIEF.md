# ParVel — Full Website Build Brief

## Goal
A COMPLETE, deployable website for ParVel (parvel.ma), the Moroccan perfumed shower gel brand. Premium redesign (not a clone): same content, images, prices, links as the original, elevated design only. Plus a real working backend (products API, COD orders, contact messages, SQLite) and a tiny admin page to view orders. This will be deployed to a free host (Render) on a free subdomain.

## Source of truth (read everything before building)
- `/home/hatch/workspace/research_notes/parvel/report.md` — site structure, 18 products, homepage section order, exact copy
- `/home/hatch/workspace/research_notes/parvel/site.json` — nav, footer, reviews (exact Darija/French texts), FAQ (5 Q&A), socials, email, video URLs
- `/home/hatch/workspace/research_notes/parvel/products.json` — 18 products: handle, exact French title, price dh, description (exact text; 3 products have NO description, keep that area empty, do not invent text), image lists
- `/home/hatch/workspace/research_notes/parvel/assets/` — 40 local assets (copy into `public/assets/`; reference relatively)
- `/home/hatch/workspace/research_notes/parvel/_uiux-research-report.md` — mobile-first COD UX patterns
- `/home/hatch/workspace/research_notes/parvel/_market-research-report.md` — positioning context

## Hard rules
- Language: French (site copy), keep Darija reviews exactly as written.
- NO new texts, NO AI-generated images. All copy identical to the original EXCEPT two typo fixes the client ordered: "PAIMENT A LA LIVRAISON" → "PAIEMENT A LA LIVRAISON", "Livraison Gratuit à Partir de 300dh" → "Livraison Gratuite à Partir de 300 dh".
- NEVER use – (en dash) or — (em dash) in any visible copy. Use commas or rephrase. Normal hyphens inside French words are fine.
- Prices exactly as scraped (e.g. 149.00 dh, 300.00 dh; Rentrée pack 229.00 dh was 270.00 dh).
- Product links out: keep "buy" actions in-site (cart + COD checkout). External links: Instagram https://www.instagram.com/parvel.ma, TikTok https://www.tiktok.com/@parvelmaroc, email parvelma@outlook.com.

## Design language (premium fragrance house)
- Palette: ivory `#FAF6F0`, deep espresso `#241A12`, champagne `#D8C096`, deep green `#1E3A2F`, gold accent used sparingly `#C9A227`.
- Type: serif display (Cormorant Garamond via Google Fonts) + clean sans (Inter). Clear hierarchy, generous whitespace, one idea per mobile screen.
- Motion (Emil Kowalski rules): transform/opacity only; entrances ease-out `cubic-bezier(0.23,1,0.32,1)`; drawer `cubic-bezier(0.32,0.72,0,1)`; marquee linear; UI durations 150–300ms; scroll reveals with 30–80ms stagger; hover only under `@media (hover:hover) and (pointer:fine)`; `prefers-reduced-motion` respected. No `transition:all`, no `scale(0)`, no ease-in on UI.
- Anti-generic: no purple gradients, no glassmorphism clichés, no template look.

## Pages (all in public/)
1. `index.html` — Home: announcement marquee (Livraison gratuite à Partir de 300 dh), header (logo, nav ACCUEIL / GELS DOUCHE HOMME / GELS DOUCHE FEMME / Contact, search, cart), hero video (local video-hero.mp4, autoplay muted loop playsinline, poster), headline "Parfumez Votre Douche" + CTA, Collections (3 cards), "Nos produits" tabs (Nouveautés / Meilleures Ventes / Soldes), "Pensé pour elle. Pensé pour lui." block, "Une fraîcheur qui vous ressemble" grid, "Votre Parfum Préféré, en Gel Douche", "Notre Histoire, Votre Bien-être" story, icon badges (SANS ALCOOL / FREE PARABEN, SILICON + PAIEMENT A LA LIVRAISON corrigé), marquee (Stock Limité ! / Cadeau Inclus), Avis clients (3 reviews), FAQ accordion (5), footer (ParVel Bath & Co. block, links, email, socials, © 2026 ParVel, Politique de confidentialité → privacy.html).
2. `shop.html` — all 18 products, filters (Tous / Homme / Femme / Packs / Promo), sort, search box.
3. `collections/homme.html`, `collections/femme.html`, `collections/packs.html` — filtered grids.
4. `produit/<handle>.html` — 18 product pages: gallery (all product images), title, price, "Épuisé" state where sold out (le-beau-le-parfum, pacific-chill), quantity, Ajouter au panier, badges, description (exact text), reviews block, related products, sticky mobile buy bar.
5. `histoire.html` — Notre Histoire (story section expanded with the brand text).
6. `faq.html` — full FAQ accordion.
7. `contact.html` — contact form (Nom, E-mail, Téléphone, Message) → POST /api/messages, success state.
8. `panier.html` — cart page (also cart drawer site-wide via cart.js + localStorage).
9. `commande.html` — COD checkout: step 1 infos (nom, téléphone, ville, adresse), step 2 récapitulatif, step 3 confirmation with order number → POST /api/orders.
10. `privacy.html` — privacy policy (short adapted version of the Shopify template text in raw/privacy-text.txt; keep it brief and factual).
11. `admin.html` — token-gated (prompt for ADMIN_TOKEN): lists orders and messages from the API. Styled simply.
12. `404.html`.

## Frontend JS (public/js/)
- `cart.js` — cart drawer + localStorage cart, add/remove/qty, totals, free-shipping progress (seuil 300 dh).
- `checkout.js` — 3-step COD flow, validation (Moroccan phone regex), POST order, confirmation screen.
- `shop.js` — filters/sort/search.
- `site.js` — mobile menu, FAQ accordions, scroll reveals (IntersectionObserver, staggered), header behavior.

## Backend (Node 24 + Express, root of parvel-site/)
- `server.js`: serves `public/`, JSON APIs:
  - `GET /api/products` → all 18 (from products.json embedded/loaded at boot)
  - `GET /api/products/:handle` → one product or 404
  - `POST /api/orders` → validate {name, phone, city, address, items[], total}; store in SQLite; return {order_number like PV-2026-XXXX}
  - `GET /api/orders?token=ADMIN_TOKEN` → list orders desc
  - `POST /api/messages` → validate {name, email, phone?, message}; store
  - `GET /api/messages?token=ADMIN_TOKEN` → list
  - `GET /api/health`
- SQLite via `node:sqlite` (Node 24 built-in) file `data.sqlite` (gitignored). `ADMIN_TOKEN` from env, default `parvel-admin-demo`.
- `package.json` with `start` → `node server.js`, `PORT` env (default 3000). No native deps (must install clean on Render free).
- `.gitignore`: node_modules, data.sqlite.

## Verification before reporting done
- `npm install` clean, `node server.js` boots, curl every page (200), curl APIs (products list = 18, order POST → order number, admin list with token), no broken local asset references (script check), mobile viewport sane.
- Report: file tree, how to run, test results, and any deviation from this brief.
