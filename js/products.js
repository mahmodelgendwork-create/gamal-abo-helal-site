/**
 * PRODUCT CATALOG (from the Supabase database)
 * ---------------------------------------------
 * Products + categories come from Supabase (add/edit them on the private admin page).
 * Price is computed here:  price = (gms x price per gram) + (gms x 500 EGP making charge)
 * Works for gold (18/21/24k) and silver (800/925/999). Silver gram price is automatic, like gold.
 * Prices: fetched LIVE from the market every 5 minutes (gold-api.com x open.er-api.com); data/gold.json is only the fallback.
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

  /* metal prices per gram, in EGP: { gold: {24,21,18}, silver: {999,925,800}, meta: {...} }
     Order of trust:
       1) LIVE  - gold-api.com (XAU/XAG spot, USD/oz) x open.er-api.com (USD->EGP), fetched in the visitor's browser
       2) SNAPSHOT - data/gold.json (written by the GitHub Action) if the live request fails
       3) the last good prices already in memory
     A manual override in config (goldPriceOverride / silverPriceOverride) always wins. */
  const GOLD_K = [24, 21, 18], SILVER_K = [999, 925, 800];
  const OZ = 31.1035, REFRESH_MS = 5 * 60 * 1000;
  const r2 = (n) => Math.round(n * 100) / 100;
  let lastGood = null, lastEgp = 0;

  async function getJSON(url, ms) {
    const ctl = typeof AbortController === "function" ? new AbortController() : null;
    const t = ctl ? setTimeout(() => ctl.abort(), ms || 8000) : null;
    try {
      const r = await fetch(url, ctl ? { signal: ctl.signal, cache: "no-store" } : { cache: "no-store" });
      if (!r.ok) throw new Error(url + " -> " + r.status);
      return await r.json();
    } finally { if (t) clearTimeout(t); }
  }

  async function liveFromMarket() {
    const [g, s, fx] = await Promise.all([
      getJSON("https://api.gold-api.com/price/XAU"),
      getJSON("https://api.gold-api.com/price/XAG"),
      getJSON("https://open.er-api.com/v6/latest/USD").catch(() => null)
    ]);
    const egp = Number(fx && fx.rates && fx.rates.EGP) || lastEgp;
    const usdG = Number(g.price), usdS = Number(s.price);
    if (!(usdG > 0) || !(usdS > 0) || !(egp > 0)) throw new Error("bad live data");
    lastEgp = egp;
    const g24 = (usdG / OZ) * egp, s999 = (usdS / OZ) * egp;
    const gold = {}, silver = {};
    GOLD_K.forEach((k) => (gold[k] = r2(g24 * (k / 24))));
    SILVER_K.forEach((k) => (silver[k] = r2(s999 * (k / 999))));
    return { gold, silver, meta: { live: true, updated: new Date().toISOString(), source: "gold-api.com x open.er-api.com" } };
  }

  async function fromSnapshot() {
    const j = await getJSON("data/gold.json?v=" + Math.floor(Date.now() / REFRESH_MS));
    const gold = Object.assign({}, j.prices), silver = Object.assign({}, j.silver);
    if (!(gold[21] > 0)) throw new Error("empty snapshot");
    return { gold, silver, meta: { live: false, updated: j.updated, source: j.source || "data/gold.json" } };
  }

  /* OPTIONAL: your own local-market price feed (e.g. a Supabase function or a URL the Gold Bullion people give you).
     Set  localPriceUrl  in js/config.js. It must return JSON like:
     { "updated": "2026-11-27T10:00:00Z", "prices": {"24": 6285, "21": 5499, "18": 4714}, "silver": {"999": 95, "925": 88, "800": 76} } */
  async function fromLocalFeed(url) {
    const j = await getJSON(url);
    const gold = Object.assign({}, j.prices), silver = Object.assign({}, j.silver);
    if (!(gold[21] > 0)) throw new Error("bad local feed");
    return { gold, silver, meta: { live: true, updated: j.updated || new Date().toISOString(), source: "local feed" } };
  }

  async function getPrices() {
    const c = window.SITE_CONFIG || {};
    let p = null, local = false;
    if (c.localPriceUrl) { try { p = await fromLocalFeed(c.localPriceUrl); local = true; } catch (e) { console.warn("Local price feed failed:", e.message); } }
    if (!p) { try { p = await liveFromMarket(); } catch (e) { console.warn("Live gold price failed, using fallback:", e.message); } }
    if (!p) { try { p = await fromSnapshot(); } catch (e) { console.warn("gold.json failed:", e.message); } }
    if (p) lastGood = p;
    else p = lastGood || { gold: {}, silver: {}, meta: { live: false, updated: null, source: "none" } };
    p = { gold: Object.assign({}, p.gold), silver: Object.assign({}, p.silver), meta: p.meta };
    // Local-market calibration: spot x official rate is the international price; Egyptian shops quote a bit different.
    // goldPriceAdjustPercent: 1.5 => +1.5% on every gold karat (use a negative number to lower). Same for silver.
    // Not applied to a local feed (it is already the local price) or to manual overrides.
    if (!local) {
      const ag = 1 + (Number(c.goldPriceAdjustPercent) || 0) / 100, as = 1 + (Number(c.silverPriceAdjustPercent) || 0) / 100;
      GOLD_K.forEach((k) => { if (p.gold[k] > 0) p.gold[k] = r2(p.gold[k] * ag); });
      SILVER_K.forEach((k) => { if (p.silver[k] > 0) p.silver[k] = r2(p.silver[k] * as); });
    }
    const og = c.goldPriceOverride || {}, os = c.silverPriceOverride || {};
    GOLD_K.forEach((k) => { if (og[k] > 0) p.gold[k] = og[k]; });
    SILVER_K.forEach((k) => { if (os[k] > 0) p.silver[k] = os[k]; });
    return p;
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

  let RAW_ROWS = [];
  function build(rows, prices) {
    return rows
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
      RAW_ROWS = rows;
      window.PRICES = prices;
      window.PRODUCTS = build(rows, prices);
    } catch (e) { console.error("Could not load catalog:", e); }
  }

  /* re-price every product from fresh market data, every 5 minutes (and when the tab becomes visible again) */
  let refreshing = false, lastRefresh = Date.now();
  async function refreshPrices() {
    if (refreshing || !RAW_ROWS.length) return;
    refreshing = true;
    try {
      const prices = await getPrices();
      if (prices.meta && prices.meta.updated) {
        window.PRICES = prices;
        window.PRODUCTS = build(RAW_ROWS, prices);
        lastRefresh = Date.now();
        document.dispatchEvent(new Event("pricesupdated"));
      }
    } catch (e) { console.warn("Price refresh failed:", e); }
    refreshing = false;
  }
  setInterval(refreshPrices, REFRESH_MS);
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && Date.now() - lastRefresh > REFRESH_MS) refreshPrices();
  });

  window.CATALOG = { imgFallback, driveId, photo, getGold, getPrices, priceOf, refreshPrices, ready: load().then(() => document.dispatchEvent(new Event("catalogready"))) };
})();
