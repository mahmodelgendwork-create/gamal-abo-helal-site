/**
 * PRODUCT CATALOG (from the Supabase database)
 * ---------------------------------------------
 * Products + categories come from Supabase (add/edit them in /admin.html).
 * Price is computed here:  price = (gms x price per gram) + (gms x 500 EGP making charge)
 * Works for gold (18/21/24k) and silver (800/925/999). Silver gram price is automatic, like gold.
 * Prices: data/gold.json (refreshed automatically by GitHub Actions), with a live fallback.
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

  /* metal prices per gram: data/gold.json, live fallback if missing/old, optional override in config.
     Returns { gold: {24,21,18}, silver: {999,925,800} } in EGP. */
  const GOLD_K = [24, 21, 18], SILVER_K = [999, 925, 800];
  async function getPrices() {
    const c = window.SITE_CONFIG || {};
    const gold = {}, silver = {};
    let stale = true;
    try {
      const r = await fetch("data/gold.json?v=" + Math.floor(Date.now() / 300000), { cache: "no-cache" });
      const j = await r.json();
      if (j.prices) Object.assign(gold, j.prices);
      if (j.silver) Object.assign(silver, j.silver);
      stale = Date.now() - new Date(j.updated).getTime() > 6 * 3600e3;
    } catch (e) {}
    if (stale || !(gold[21] > 0) || !(silver[925] > 0)) {
      try {
        const fx = await (await fetch("https://open.er-api.com/v6/latest/USD")).json();
        const egp = fx.rates.EGP;
        const g = await (await fetch("https://api.gold-api.com/price/XAU")).json();
        const g24 = (g.price / 31.1035) * egp;
        if (g24 > 0) GOLD_K.forEach((k) => (gold[k] = Math.round(g24 * (k / 24) * 100) / 100));
        const s = await (await fetch("https://api.gold-api.com/price/XAG")).json();
        const s999 = (s.price / 31.1035) * egp;
        if (s999 > 0) SILVER_K.forEach((k) => (silver[k] = Math.round(s999 * (k / 999) * 100) / 100));
      } catch (e) { /* keep whatever gold.json had */ }
    }
    const og = c.goldPriceOverride || {}, os = c.silverPriceOverride || {};
    GOLD_K.forEach((k) => { if (og[k] > 0) gold[k] = og[k]; });
    SILVER_K.forEach((k) => { if (os[k] > 0) silver[k] = os[k]; });
    return { gold, silver };
  }
  const getGold = async () => (await getPrices()).gold;   // kept for older callers

  /* the one place the price formula lives: (grams x gram price) + (grams x making charge) */
  function priceOf(metal, purity, gms, prices) {
    const c = window.SITE_CONFIG || {};
    const perGram = ((metal === "silver" ? prices.silver : prices.gold) || {})[purity];
    const make = Number((c.workmanshipPerGram || {})[metal === "silver" ? "silver" : "gold"]);
    const rate = make >= 0 ? make : 500;
    return perGram > 0 && gms > 0 ? Math.round(gms * perGram + gms * rate) : null;
  }

  async function load() {
    const c = window.SITE_CONFIG || {};
    if (!c.supabaseUrl || /PASTE_/.test(c.supabaseUrl)) { console.warn("Supabase is not configured (js/config.js)."); return; }
    try {
      const [cats, rows, prices] = await Promise.all([
        api("categories?select=slug,name_ar,name_en&order=sort_order"),
        api("products_priced?select=*&order=created_at.desc"),
        getPrices()
      ]);
      window.CATEGORIES = cats.map((k) => ({ slug: k.slug, name: { ar: k.name_ar, en: k.name_en || k.name_ar } }));
      window.PRODUCTS = rows
        .map((r) => {
          const metal = r.metal === "silver" ? "silver" : "gold";
          const karat = Number(r.karat), gms = Number(r.gms);
          const photos = photosOf(r);
          return {
            id: r.id, category: r.category, metal, karat, gms, photos, image: photos[0].small, localDefault: false,
            price: priceOf(metal, karat, gms, prices),
            name: { ar: r.name_ar, en: r.name_en || r.name_ar },
            desc: { ar: r.desc_ar || "", en: r.desc_en || r.desc_ar || "" }
          };
        })
        .filter((p) => p.price != null);
    } catch (e) { console.error("Could not load catalog:", e); }
  }

  window.CATALOG = { imgFallback, driveId, photo, getGold, getPrices, priceOf, ready: load().then(() => document.dispatchEvent(new Event("catalogready"))) };
})();
