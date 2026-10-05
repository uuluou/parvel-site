

const express = require("express");
const { DatabaseSync } = require("node:sqlite");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const Busboy = require("busboy");

const PORT = process.env.PORT || 3000;

const ADMIN_TOKEN = process.env.ADMIN_TOKEN;
if (!ADMIN_TOKEN) {
  console.error("FATAL: set the ADMIN_TOKEN env var before starting.");
  process.exit(1);
}

const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const UPLOAD_DIR = path.join(PUBLIC, "assets", "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const db = new DatabaseSync(path.join(ROOT, "data.sqlite"));

db.exec(`
CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  handle TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  price REAL NOT NULL,
  compare_at REAL,
  currency TEXT NOT NULL DEFAULT 'dh',
  available INTEGER NOT NULL DEFAULT 1,
  description TEXT NOT NULL DEFAULT '',
  images TEXT NOT NULL DEFAULT '[]',
  category TEXT NOT NULL DEFAULT 'unisexe',
  stock INTEGER
);
CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  city TEXT NOT NULL,
  address TEXT NOT NULL,
  items TEXT NOT NULL,
  total REAL NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  message TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS site_content (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

try {
  db.exec("ALTER TABLE products ADD COLUMN compare_at REAL");
} catch (e) {}
try {
  db.exec("ALTER TABLE products ADD COLUMN stock INTEGER");
} catch (e) {}

function slugify(s) {
  return String(s).toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
    .slice(0, 80) || "produit";
}

function seedProducts() {
  const count = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;
  if (count > 0) return;
  const seed = JSON.parse(fs.readFileSync(path.join(ROOT, "products.json"), "utf8"));
  const ins = db.prepare(`INSERT INTO products
    (handle, title, price, compare_at, currency, available, description, images, category)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  for (const p of seed) {
    ins.run(
      p.handle, p.title, Number(p.price),
      p.compare_at == null ? null : Number(p.compare_at),
      p.currency || "dh", p.available ? 1 : 0,
      p.description || "", JSON.stringify(p.images || []),
      p.category || "unisexe"
    );
  }
  console.log("Seeded " + seed.length + " products.");
}

function seedContent() {
  const count = db.prepare("SELECT COUNT(*) AS c FROM site_content").get().c;
  if (count > 0) return;
  const site = JSON.parse(fs.readFileSync(path.join(ROOT, "site.json"), "utf8"));
  const set = (k, v) => db.prepare(
    "INSERT OR IGNORE INTO site_content (key, value) VALUES (?, ?)").run(k, JSON.stringify(v));

  set("announcement_text", "Livraison gratuite à Partir de 300 dh");
  set("hero_title", "Parfumez Votre Douche");
  set("hero_cta", "Shop Now");
  set("hero_video", "assets/video-hero.mp4");
  set("hero_poster", "assets/ba483d5a8f64_e45905431b744bafa086ef7f6079ce28.thumbnail.0000000000.jpg");
  set("badges", ["SANS ALCOOL / FREE PARABEN, SILICON", "PAIEMENT A LA LIVRAISON"]);
  set("marquee_items", ["Stock Limité !", "Cadeau Inclus 🎁"]);
  set("story", {
    title: "Notre Histoire, Votre Bien-être",
    text: "Chaque gel douche ParVel associe une mousse onctueuse, des ingrédients doux pour la peau et des parfums d'exception pour transformer votre routine quotidienne en un véritable moment de plaisir.",
    cta: "Découvrir la collection",
    image: "assets/136a29f2e681_ChatGPT_Image_Aug_6_2026_12_18_49_AM.png"
  });

  set("gender_block", {
    title: "Pensé pour elle. Pensé pour lui.",
    text: "Retrouvez les senteurs qui vous font craquer, formulés sans alcool, sans silicone et sans parabènes.",
    cta: "Composer mon pack",
    image: "assets/869adfd7d541_ChatGPT_Image_6_aout_2026_17_07_20.png"
  });
  set("rich_text", "Votre Parfum Préféré, en Gel Douche");
  set("collections", [
    { title: "Packs de gels douche", text: "Découvrez les packs de gels douche parfumés ParVel, pensés pour varier les...", href: "/collections/packs.html", image: "assets/951bbfec28d1_a426dec2-cda9-427d-9e77-e79348566c28.png" },
    { title: "Gel Douche Parfumé Homme", text: "Découvrez les gels douche parfumés homme ParVel, avec des fragrances aux univers...", href: "/collections/homme.html", image: "assets/50676e3c848c_parvel_light_blue_homme_douche_epaules.png" },
    { title: "Gel Douche Parfumé Femme", text: "Découvrez les gels douche parfumés femme ParVel, avec une sélection de fragrances...", href: "/collections/femme.html", image: "assets/b5af8f50aa80_parvel_prada_femme_scene_douche_rose_final.png" }
  ]);
  set("nos_produits", { title: "Nos produits", sub: "Découvrez notre sélection" });
  set("fraicheur_title", "Une fraîcheur qui vous ressemble");
  set("reviews_home", site.reviews_homepage);
  set("reviews_product", site.reviews_product_page);
  set("faq", site.faq);
  set("settings", {
    email: site.footer.contact_info.email,
    instagram: "https://www.instagram.com/parvel.ma",
    tiktok: "https://www.tiktok.com/@parvelmaroc",
    shipping_threshold: 300,
    brand_block_title: site.footer.brand_block.title,
    brand_block_text: site.footer.brand_block.text,
    copyright: site.footer.copyright
  });
  console.log("Seeded site_content.");
}

seedProducts();
seedContent();

var app = express();
app.use(express.json({ limit: "2mb" }));

function productRow(r) {
  return {
    id: r.id, handle: r.handle, title: r.title,
    price: Number(r.price),
    compare_at: r.compare_at == null ? null : Number(r.compare_at),
    currency: r.currency, available: !!r.available,
    description: r.description,
    images: JSON.parse(r.images || "[]"),
    category: r.category,
    stock: r.stock == null ? null : Number(r.stock)
  };
}

function adminAuth(req, res, next) {
  const q = req.query.token;
  const h = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (q === ADMIN_TOKEN || h === ADMIN_TOKEN) return next();
  return res.status(401).json({ error: "Unauthorized" });
}

const MOROCCAN_PHONE = /^(\+212|0)(6|7)\d{8}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

app.get("/api/products", (req, res) => {
  const rows = db.prepare("SELECT * FROM products ORDER BY id").all();
  res.json(rows.map(productRow));
});

app.get("/api/products/:handle", (req, res) => {
  const r = db.prepare("SELECT * FROM products WHERE handle = ?").get(req.params.handle);
  if (!r) return res.status(404).json({ error: "Produit introuvable" });
  res.json(productRow(r));
});

app.post("/api/orders", (req, res) => {
  const { name, phone, city, address, items } = req.body || {};
  if (!name || String(name).trim().length < 2)
    return res.status(400).json({ error: "Nom invalide" });
  const digits = String(phone || "").replace(/[\s.-]/g, "");
  if (!MOROCCAN_PHONE.test(digits))
    return res.status(400).json({ error: "Numéro de téléphone marocain invalide" });
  if (!city || String(city).trim().length < 2)
    return res.status(400).json({ error: "Ville invalide" });
  if (!address || String(address).trim().length < 5)
    return res.status(400).json({ error: "Adresse invalide" });
  if (!Array.isArray(items) || items.length === 0)
    return res.status(400).json({ error: "Panier vide" });

  const byHandle = db.prepare("SELECT * FROM products WHERE handle = ?");
  const lines = [];
  let total = 0;
  for (const it of items) {
    const qty = Math.max(1, Math.min(99, parseInt(it.qty, 10) || 1));
    const p = byHandle.get(it.handle);
    if (!p || !p.available)
      return res.status(400).json({ error: `Produit indisponible: ${it.handle}` });
    if (p.stock != null && p.stock < qty)
      return res.status(400).json({ error: `Stock insuffisant: ${p.title}` });
    const price = Number(p.price);
    total += price * qty;
    lines.push({ handle: p.handle, title: p.title, price, qty });
  }
  total = Math.round(total * 100) / 100;

  const year = new Date().getFullYear();
  var seq = db.prepare("SELECT COUNT(*) AS c FROM orders").get().c + 1;
  const order_number = `PV-${year}-${String(seq).padStart(4, "0")}`;
  const decStock = db.prepare("UPDATE products SET stock = stock - ? WHERE handle = ? AND stock IS NOT NULL");
  for (const ln of lines) decStock.run(ln.qty, ln.handle);
  db.prepare(`INSERT INTO orders (order_number, name, phone, city, address, items, total)
    VALUES (?, ?, ?, ?, ?, ?, ?)`)
    .run(order_number, String(name).trim(), digits, String(city).trim(),
      String(address).trim(), JSON.stringify(lines), total);
  res.json({ ok: true, order_number, total });
});

app.post("/api/messages", (req, res) => {
  const { name, email, phone, message } = req.body || {};
  if (!name || String(name).trim().length < 2)
    return res.status(400).json({ error: "Nom invalide" });
  if (!email || !EMAIL_RE.test(String(email).trim()))
    return res.status(400).json({ error: "E-mail invalide" });
  if (!message || String(message).trim().length < 3)
    return res.status(400).json({ error: "Message trop court" });
  db.prepare("INSERT INTO messages (name, email, phone, message) VALUES (?, ?, ?, ?)")
    .run(String(name).trim(), String(email).trim(),
      String(phone || "").trim(), String(message).trim());
  res.json({ ok: true });
});

function allContent() {
  const rows = db.prepare("SELECT key, value FROM site_content").all();
  const out = {};
  for (const r of rows) { try { out[r.key] = JSON.parse(r.value); } catch { out[r.key] = r.value; } }
  return out;
}
app.get("/api/content", (req, res) => res.json(allContent()));
app.get("/api/content/:key", (req, res) => {
  const r = db.prepare("SELECT value FROM site_content WHERE key = ?").get(req.params.key);
  if (!r) return res.status(404).json({ error: "Contenu introuvable" });
  let value; try { value = JSON.parse(r.value); } catch { value = r.value; }
  res.json({ key: req.params.key, value });
});

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.get("/api/orders", adminAuth, (req, res) => {
  res.json(db.prepare("SELECT * FROM orders ORDER BY id DESC").all());
});
app.get("/api/messages", adminAuth, (req, res) => {
  res.json(db.prepare("SELECT * FROM messages ORDER BY id DESC").all());
});

app.put("/api/admin/content/:key", adminAuth, (req, res) => {
  if (!("value" in (req.body || {})))
    return res.status(400).json({ error: 'Champ "value" requis' });
  db.prepare("INSERT INTO site_content (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(req.params.key, JSON.stringify(req.body.value));
  res.json({ ok: true, key: req.params.key });
});

const CATEGORIES = ["homme", "femme", "pack", "unisexe"];
const IMG_MIMES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"]);
const MAX_FILE = 8 * 1024 * 1024;

function safeExt(filename) {
  const ext = path.extname(filename || "").toLowerCase();
  return [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"].includes(ext) ? ext : ".jpg";
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    const fields = {};
    const files = [];
    const pending = [];
    let bb;
    try { bb = Busboy({ headers: req.headers, limits: { fileSize: MAX_FILE, files: 12 } }); }
    catch (e) { return reject(e); }
    bb.on("field", (name, val) => { fields[name] = val; });
    bb.on("file", (name, file, info) => {
      const { filename, mimeType } = info;
      if (!IMG_MIMES.has(mimeType)) { file.resume(); return; }
      const fname = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${safeExt(filename)}`;
      const dest = path.join(UPLOAD_DIR, fname);
      const done = new Promise((res) => {
        const ws = fs.createWriteStream(dest);
        let tooBig = false;
        file.on("limit", () => { tooBig = true; });
        file.on("error", () => res());
        ws.on("error", () => res());
        file.pipe(ws);
        ws.on("finish", () => {
          if (tooBig) { fs.unlink(dest, () => {}); res(); return; }
          files.push("assets/uploads/" + fname);
          res();
        });
      });
      pending.push(done);
    });
    bb.on("error", reject);
    bb.on("finish", () => Promise.all(pending).then(() => resolve({ fields, files })));
    req.pipe(bb);
  });
}

function validateProductInput(f) {
  const errors = [];
  const title = String(f.title || "").trim();
  if (title.length < 2) errors.push("Titre requis");
  const price = Number(f.price);
  if (!Number.isFinite(price) || price <= 0) errors.push("Prix invalide");
  let compare_at = null;
  if (f.compare_at !== undefined && f.compare_at !== "" && f.compare_at !== null) {
    compare_at = Number(f.compare_at);
    if (!Number.isFinite(compare_at) || compare_at <= 0) errors.push("Prix barré invalide");
  }
  const category = String(f.category || "unisexe").toLowerCase();
  if (!CATEGORIES.includes(category)) errors.push("Catégorie invalide");
  const available = !(f.available === "0" || f.available === 0 || f.available === false || f.available === "false");
  let stock = null;
  if (f.stock !== undefined && f.stock !== "" && f.stock !== null) {
    stock = parseInt(f.stock, 10);
    if (!Number.isInteger(stock) || stock < 0) errors.push("Stock invalide");
  }
  return { errors, title, price, compare_at, category, available, stock,
    description: String(f.description || "") };
}

app.post("/api/admin/products", adminAuth, async (req, res) => {
  try {
    const isMulti = (req.headers["content-type"] || "").includes("multipart/form-data");
    let fields = {}, uploaded = [];
    if (isMulti) {
      const parsed = await parseMultipart(req);
      fields = parsed.fields; uploaded = parsed.files;
    } else { fields = req.body || {}; }
    const v = validateProductInput(fields);
    if (v.errors.length) return res.status(400).json({ error: v.errors.join(", ") });

    let handle = slugify(fields.handle || v.title);
    const exists = db.prepare("SELECT id FROM products WHERE handle = ?").get(handle);
    if (exists) handle = `${handle}-${crypto.randomBytes(3).toString("hex")}`;

    let images = uploaded;
    if (!isMulti && Array.isArray(fields.images)) images = fields.images.filter(Boolean);

    const r = db.prepare(`INSERT INTO products
      (handle, title, price, compare_at, currency, available, description, images, category, stock)
      VALUES (?, ?, ?, ?, 'dh', ?, ?, ?, ?, ?)`)
      .run(handle, v.title, v.price, v.compare_at, v.available ? 1 : 0,
        v.description, JSON.stringify(images), v.category, v.stock);
    const row = db.prepare("SELECT * FROM products WHERE id = ?").get(Number(r.lastInsertRowid));
    res.status(201).json(productRow(row));
  } catch (e) { res.status(500).json({ error: "Erreur serveur" }); }
});

app.put("/api/admin/products/:id", adminAuth, async (req, res) => {
  try {
    const row = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
    if (!row) return res.status(404).json({ error: "Produit introuvable" });
    const isMulti = (req.headers["content-type"] || "").includes("multipart/form-data");
    let fields = {}, uploaded = [];
    if (isMulti) {
      const parsed = await parseMultipart(req);
      fields = parsed.fields; uploaded = parsed.files;
    } else { fields = req.body || {}; }

    const cur = productRow(row);
    const merged = {
      title: fields.title !== undefined ? fields.title : cur.title,
      price: fields.price !== undefined ? fields.price : cur.price,
      compare_at: fields.compare_at !== undefined ? fields.compare_at : cur.compare_at,
      category: fields.category !== undefined ? fields.category : cur.category,
      available: fields.available !== undefined ? fields.available : cur.available,
      description: fields.description !== undefined ? fields.description : cur.description,
      stock: fields.stock !== undefined ? fields.stock : cur.stock
    };
    const v = validateProductInput(merged);
    if (v.errors.length) return res.status(400).json({ error: v.errors.join(", ") });

    let handle = cur.handle;
    if (fields.handle !== undefined && String(fields.handle).trim()) {
      const h = slugify(fields.handle);
      const clash = db.prepare("SELECT id FROM products WHERE handle = ? AND id != ?").get(h, row.id);
      if (clash) return res.status(400).json({ error: "Handle déjà utilisé" });
      handle = h;
    }

    let images = cur.images;
    if (isMulti) {
      let keep = cur.images;
      if (fields.keep_images) {
        try { keep = JSON.parse(fields.keep_images).filter(x => cur.images.includes(x)); }
        catch { keep = cur.images; }
      }
      images = [...keep, ...uploaded];
    } else if (Array.isArray(fields.images)) {
      images = fields.images.filter(Boolean);
    }

    db.prepare(`UPDATE products SET handle=?, title=?, price=?, compare_at=?,
      available=?, description=?, images=?, category=?, stock=? WHERE id=?`)
      .run(handle, v.title, v.price, v.compare_at, v.available ? 1 : 0,
        v.description, JSON.stringify(images), v.category, v.stock, row.id);
    const updated = db.prepare("SELECT * FROM products WHERE id = ?").get(row.id);
    res.json(productRow(updated));
  } catch (e) { res.status(500).json({ error: "Erreur serveur" }); }
});

app.delete("/api/admin/products/:id", adminAuth, (req, res) => {
  const row = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!row) return res.status(404).json({ error: "Produit introuvable" });
  const imgs = JSON.parse(row.images || "[]");
  for (const p of imgs) {
    if (typeof p === "string" && p.startsWith("assets/uploads/")) {
      const fp = path.join(PUBLIC, p);
      if (fp.startsWith(UPLOAD_DIR)) fs.unlink(fp, () => {});
    }
  }
  db.prepare("DELETE FROM products WHERE id = ?").run(row.id);
  res.json({ ok: true });
});

const OPT_DIR = path.join(PUBLIC, "assets", "opt");
const optFiles = new Set();
try { for (const f of fs.readdirSync(OPT_DIR)) optFiles.add(f); } catch {}
const LONG_CACHE = "public, max-age=31536000, immutable";
app.use("/assets", (req, res, next) => {
  const m = /^\/([^/]+)\.(png|jpe?g)$/i.exec(req.path);
  if (m) {
    const webp = m[1] + ".webp";
    if (optFiles.has(webp)) {
      res.type("image/webp");
      res.set("Cache-Control", LONG_CACHE);
      return res.sendFile(path.join(OPT_DIR, webp));
    }
  } else if (req.path === "/video-hero.mp4" && optFiles.has("video-hero.mp4")) {
    res.type("video/mp4");
    res.set("Cache-Control", LONG_CACHE);
    return res.sendFile(path.join(OPT_DIR, "video-hero.mp4"));
  }
  next();
});
app.use("/assets", express.static(path.join(PUBLIC, "assets"), { maxAge: "1y", immutable: true }));

app.use(express.static(PUBLIC, { extensions: ["html"] }));

app.get(["/produit/:handle", "/produit/:handle.html"], (req, res) => {
  res.sendFile(path.join(PUBLIC, "produit.html"));
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC, "404.html"));
});

app.listen(PORT, () => {
  console.log(`ParVel en ligne sur http://localhost:${PORT}`);
  console.log(`Admin: /admin.html (token: ${ADMIN_TOKEN})`);
});
