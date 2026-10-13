/**
 * PRODUCT CATALOG (read from CSV files)
 * --------------------------------------
 *   data/products.csv    one row per product  (edit in Excel / Google Sheets, save as CSV UTF-8)
 *   data/categories.csv  the category list
 *   data/gold.json       today's gold price per gram (updated automatically by GitHub Actions)
 *   products/<id>.png    the product photo, named with the id (0001.png)
 *
 * price = gms * (gold price per gram for the karat) + constant_egp   (computed in the browser)
 *
 * Exposes: window.PRODUCTS, window.CATEGORIES, window.CATALOG.ready, "catalogready" event.
 */
(function () {
  window.PRODUCTS = [];
  window.CATEGORIES = [];

  const EXTS = ["png", "jpg", "jpeg", "webp"];
  const FALLBACK = "assets/img/logo.png";

  /* ---- tiny CSV parser (quotes, commas inside quotes, BOM, "," or ";" separators) ---- */
  function parseCSV(text) {
    text = text.replace(/^﻿/, "");
    const first = text.split(/\r?\n/)[0] || "";
    const sep = first.includes(",") ? "," : first.includes(";") ? ";" : ",";
    const rows = []; let row = [], f = "", q = false;
    const endRow = () => { row.push(f); f = ""; if (row.some((x) => x.trim() !== "")) rows.push(row); row = []; };
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; }
        else f += c;
      } else if (c === '"') q = true;
      else if (c === sep) { row.push(f); f = ""; }
      else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; endRow(); }
      else f += c;
    }
    endRow();
    if (!rows.length) return [];
    const head = rows.shift().map((h) => h.trim().toLowerCase());
    return rows.map((r) => Object.fromEntries(head.map((h, i) => [h, (r[i] || "").trim()])));
  }

  // Excel turns 0001 into 1 — put the zeros back so ids always match the image names.
  const normId = (id) => (/^\d+$/.test(id) ? id.padStart(4, "0") : id);
  const num = (v) => Number(String(v).replace(/,/g, "").trim());
  const isOff = (v) => /^(0|no|n|false|off|hide|hidden)$/i.test((v || "").trim());

  const getText = (url) => fetch(url + "?v=" + Math.floor(Date.now() / 300000), { cache: "no-cache" }).then((r) => { if (!r.ok) throw new Error(url + " " + r.status); return r.text(); });

  /* ---- gold price: data/gold.json, with a live fallback if it is missing or very old ---- */
  async function getGold() {
    const c = window.SITE_CONFIG || {};
    const prices = {};
    try {
      const j = JSON.parse(await getText("data/gold.json"));
      const age = Date.now() - new Date(j.updated).getTime();
      if (j.prices && age < 6 * 3600e3) Object.assign(prices, j.prices);
      else if (j.prices) { Object.assign(prices, j.prices); prices._stale = true; }
    } catch (e) { prices._stale = true; }

    if (prices._stale || !(prices[21] > 0)) {
      try {
        const g = await (await fetch("https://api.gold-api.com/price/XAU")).json();
        const fx = await (await fetch("https://open.er-api.com/v6/latest/USD")).json();
        const g24 = (g.price / 31.1035) * fx.rates.EGP;
        if (g24 > 0) [24, 21, 18].forEach((k) => (prices[k] = Math.round(g24 * (k / 24) * 100) / 100));
      } catch (e) { /* keep whatever gold.json had */ }
    }
    // Manual override from js/config.js (e.g. goldPriceOverride: { 21: 6300 })
    const o = c.goldPriceOverride || {};
    [24, 21, 18].forEach((k) => { if (o[k] > 0) prices[k] = o[k]; });
    return prices;
  }

  /* ---- image helpers ----
   * A product's photos come from the "images" column of products.csv: one or more entries
   * separated by "|" (or spaces / new lines). Each entry is either
   *   - a Google Drive share link (file shared as "Anyone with the link")  -> resized thumbnail from Drive
   *   - any other http(s) image link                                       -> used as is
   *   - a file name inside the products/ folder (e.g. 0001-2.png)          -> local file
   * If "images" is empty the site uses products/<id>.png (then .jpg/.jpeg/.webp), then the logo.
   * Speed: cards only ever load the FIRST photo, small (~480px). The other photos load only when
   * a visitor opens the gallery, and only the one on screen (+ tiny thumbnails). */
  function driveId(link) {
    const m = link.match(/\/d\/([\w-]{10,})/) || link.match(/[?&]id=([\w-]{10,})/);
    return m && /drive\.google\.com|docs\.google\.com/.test(link) ? m[1] : null;
  }
  function photo(entry) {
    const id = driveId(entry);
    const drive = (w) => "https://drive.google.com/thumbnail?id=" + id + "&sz=w" + w;
    if (id) return { thumb: drive(120), small: drive(480), full: drive(1200) };
    const url = /^https?:\/\//i.test(entry) ? entry : "products/" + entry;
    return { thumb: url, small: url, full: url };
  }
  function photosFor(id, field) {
    const list = (field || "").split(/[\s|]+/).filter(Boolean);
    if (list.length) return list.map(photo);
    const u = "products/" + id + "." + EXTS[0];
    return [{ thumb: u, small: u, full: u, local: true }];
  }
  function imgFallback(img) {
    const id = img.getAttribute("data-pid");   // set only for products using products/<id>.png
    const tried = Number(img.getAttribute("data-try") || 0) + 1;
    img.setAttribute("data-try", tried);
    if (id && tried < EXTS.length) img.src = "products/" + id + "." + EXTS[tried];
    else { img.onerror = null; img.src = FALLBACK; }
  }

  async function load() {
    try {
      const [catText, prodText, gold] = await Promise.all([getText("data/categories.csv"), getText("data/products.csv"), getGold()]);
      window.CATEGORIES = parseCSV(catText)
        .sort((a, b) => num(a.sort_order) - num(b.sort_order))
        .map((k) => ({ slug: k.slug, name: { ar: k.name_ar, en: k.name_en || k.name_ar } }));

      window.PRODUCTS = parseCSV(prodText)
        .filter((r) => r.id && r.name_ar && !isOff(r.active))
        .map((r) => {
          const id = normId(r.id), karat = num(r.karat), gms = num(r.gms), con = num(r.constant_egp) || 0;
          const perGram = gold[karat];
          return {
            id, category: r.category, karat, gms,
            photos: photosFor(id, r.images),
            price: perGram > 0 && gms > 0 ? Math.round(gms * perGram + con) : null,
            name: { ar: r.name_ar, en: r.name_en || r.name_ar },
            desc: { ar: r.desc_ar || "", en: r.desc_en || r.desc_ar || "" }
          };
        })
        .map((p) => {
          p.image = p.photos[0].small;           // card / cart picture
          p.localDefault = !!p.photos[0].local;  // only then try .jpg/.webp names on error
          return p;
        })
        .filter((p) => p.price != null);
    } catch (e) { console.error("Could not load catalog:", e); }
  }

  window.CATALOG = { imgFallback, parseCSV, ready: load().then(() => document.dispatchEvent(new Event("catalogready"))) };
})();
