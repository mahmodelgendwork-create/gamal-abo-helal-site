/**
 * PRODUCT CATALOG (from the Supabase database)
 * ---------------------------------------------
 * Products + categories come from Supabase (add/edit them in /admin.html).
 * Price is computed here:  price = gms * gold price per gram (for the karat) + constant
 * Gold price: data/gold.json (refreshed automatically by GitHub Actions), with a live fallback.
 *
 * Photos: each product has a list of photos (Google Drive links, "Anyone with the link").
 *   - Cards load ONLY the first photo, small (~480px).
 *   - The other photos load only when a visitor opens the gallery, one at a time (+ tiny thumbnails).
 *
 * Exposes: window.PRODUCTS, window.CATEGORIES, window.CATALOG.ready, "catalogready" event.
 */
(function () {
  window.PRODUCTS = [];
  window.CATEGORIES = [];
  const FALLBACK = "assets/img/logo.png";

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
  function photosOf(row) {
    let list = Array.isArray(row.images) ? row.images : [];
    list = list.map((x) => String(x || "").trim()).filter(Boolean);
    if (!list.length && row.image_url) list = [row.image_url.trim()];
    return list.length ? list.map(photo) : [{ thumb: FALLBACK, small: FALLBACK, full: FALLBACK }];
  }
  function imgFallback(img) { img.onerror = null; img.src = FALLBACK; }

  function api(path) {
    const c = window.SITE_CONFIG || {};
    const headers = { apikey: c.supabaseAnonKey };
    if (/^eyJ/.test(c.supabaseAnonKey)) headers.Authorization = "Bearer " + c.supabaseAnonKey; // legacy JWT keys only
    return fetch(c.supabaseUrl + "/rest/v1/" + path, { headers }).then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  /* gold price per gram: data/gold.json, live fallback if missing/old, optional override in config */
  async function getGold() {
    const c = window.SITE_CONFIG || {};
    const prices = {};
    let stale = true;
    try {
      const r = await fetch("data/gold.json?v=" + Math.floor(Date.now() / 300000), { cache: "no-cache" });
      const j = await r.json();
      if (j.prices) { Object.assign(prices, j.prices); stale = Date.now() - new Date(j.updated).getTime() > 6 * 3600e3; }
    } catch (e) {}
    if (stale || !(prices[21] > 0)) {
      try {
        const g = await (await fetch("https://api.gold-api.com/price/XAU")).json();
        const fx = await (await fetch("https://open.er-api.com/v6/latest/USD")).json();
        const g24 = (g.price / 31.1035) * fx.rates.EGP;
        if (g24 > 0) [24, 21, 18].forEach((k) => (prices[k] = Math.round(g24 * (k / 24) * 100) / 100));
      } catch (e) { /* keep whatever gold.json had */ }
    }
    const o = c.goldPriceOverride || {};
    [24, 21, 18].forEach((k) => { if (o[k] > 0) prices[k] = o[k]; });
    return prices;
  }

  async function load() {
    const c = window.SITE_CONFIG || {};
    if (!c.supabaseUrl || /PASTE_/.test(c.supabaseUrl)) { console.warn("Supabase is not configured (js/config.js)."); return; }
    try {
      const [cats, rows, gold] = await Promise.all([
        api("categories?select=slug,name_ar,name_en&order=sort_order"),
        api("products_priced?select=*&order=created_at.desc"),
        getGold()
      ]);
      window.CATEGORIES = cats.map((k) => ({ slug: k.slug, name: { ar: k.name_ar, en: k.name_en || k.name_ar } }));
      window.PRODUCTS = rows
        .map((r) => {
          const karat = Number(r.karat), gms = Number(r.gms), con = Number(r.constant_egp) || 0;
          const perGram = gold[karat];
          const photos = photosOf(r);
          return {
            id: r.id, category: r.category, karat, gms, photos, image: photos[0].small, localDefault: false,
            price: perGram > 0 && gms > 0 ? Math.round(gms * perGram + con) : null,
            name: { ar: r.name_ar, en: r.name_en || r.name_ar },
            desc: { ar: r.desc_ar || "", en: r.desc_en || r.desc_ar || "" }
          };
        })
        .filter((p) => p.price != null);
    } catch (e) { console.error("Could not load catalog:", e); }
  }

  window.CATALOG = { imgFallback, driveId, photo, getGold, ready: load().then(() => document.dispatchEvent(new Event("catalogready"))) };
})();
