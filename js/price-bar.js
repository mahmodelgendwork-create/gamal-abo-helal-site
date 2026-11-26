/**
 * HOME PAGE GOLD & SILVER PRICE BAR
 * ---------------------------------
 * Self-contained: injects its own bar (and its own CSS) right before the featured-products
 * section on the home page. Needs js/products.js (window.CATALOG / window.PRICES).
 * Updates by itself every 5 minutes. Add it with ONE line in index.html:
 *   <script src="js/price-bar.js"></script>      (after js/main.js)
 */
(function () {
  const REFRESH_MS = 5 * 60 * 1000;
  const GOLD = [24, 21, 18], SILVER = [999, 925, 800];
  const T = {
    ar: { title: "أسعار الجرام اليوم", gold: (k) => "ذهب عيار " + k, silver: (k) => "فضة " + k, live: "تحديث مباشر", at: "آخر تحديث", off: "السعر المحفوظ" },
    en: { title: "Today's price per gram", gold: (k) => "Gold " + k + "K", silver: (k) => "Silver " + k, live: "Live", at: "Updated", off: "Saved price" }
  };
  let bar = null, last = null, lastAt = 0;

  const lang = () => ((window.I18N && window.I18N.currentLang && window.I18N.currentLang()) || document.documentElement.lang || "ar") === "en" ? "en" : "ar";

  function css() {
    if (document.getElementById("price-bar-css")) return;
    const s = document.createElement("style");
    s.id = "price-bar-css";
    s.textContent = `
      .price-bar{background:var(--panel,#1d1018);border-top:1px solid var(--line,rgba(228,187,181,.24));border-bottom:1px solid var(--line,rgba(228,187,181,.24));padding:14px 0;position:relative;z-index:2}
      .price-bar__in{max-width:var(--container,1180px);margin:0 auto;padding:0 20px;display:flex;align-items:center;gap:18px;flex-wrap:wrap;justify-content:space-between}
      .price-bar__title{font-family:var(--font-display,serif);color:var(--accent,#e4bbb5);font-size:1.05rem;white-space:nowrap;display:flex;align-items:center;gap:8px}
      .price-bar__dot{width:8px;height:8px;border-radius:50%;background:#5fd08a;box-shadow:0 0 0 0 rgba(95,208,138,.6);animation:pbpulse 2s infinite}
      .price-bar.is-off .price-bar__dot{background:#c9a24b;animation:none}
      @keyframes pbpulse{70%{box-shadow:0 0 0 7px rgba(95,208,138,0)}100%{box-shadow:0 0 0 0 rgba(95,208,138,0)}}
      .price-bar__items{display:flex;gap:10px;overflow-x:auto;flex:1;min-width:0;scrollbar-width:none;padding:2px 0}
      .price-bar__items::-webkit-scrollbar{display:none}
      .price-bar__item{flex:0 0 auto;border:1px solid var(--line-soft,rgba(247,237,233,.1));background:var(--card,#2e1a27);padding:6px 14px;text-align:center;line-height:1.35}
      .price-bar__item small{display:block;color:var(--cream-dim,rgba(248,238,233,.68));font-size:.78rem}
      .price-bar__item b{color:var(--accent-hi,#f5dad5);font-size:1.05rem;font-weight:700}
      .price-bar__item--silver b{color:var(--cream,#f8eee9)}
      .price-bar__meta{color:var(--cream-dim,rgba(248,238,233,.68));font-size:.78rem;white-space:nowrap}
      @media(max-width:640px){.price-bar__in{gap:10px}.price-bar__meta{width:100%}}`;
    document.head.appendChild(s);
  }

  function mount() {
    if (bar) return true;
    const grid = document.getElementById("featured-products");
    if (!grid) return false;                                   // not the home page
    const section = grid.closest("section") || grid;
    bar = document.createElement("section");
    bar.className = "price-bar";
    bar.id = "gold-price-bar";
    bar.setAttribute("aria-label", "gold and silver prices");
    section.parentNode.insertBefore(bar, section);
    css();
    return true;
  }

  function render() {
    if (!mount() || !last) return;
    const L = T[lang()], c = (window.SITE_CONFIG && window.SITE_CONFIG.currency) || { ar: "ج.م", en: "EGP" };
    const cur = c[lang()] || c.en;
    const nf = new Intl.NumberFormat(lang() === "ar" ? "ar-EG" : "en-US", { maximumFractionDigits: 0 });
    const cell = (label, v, cls) => v > 0
      ? `<div class="price-bar__item ${cls}"><small>${label}</small><b>${nf.format(Math.round(v))}</b> <small style="display:inline">${cur}</small></div>` : "";
    const live = !!(last.meta && last.meta.live);
    const when = last.meta && last.meta.updated ? new Date(last.meta.updated) : null;
    const time = when && !isNaN(when) ? when.toLocaleTimeString(lang() === "ar" ? "ar-EG" : "en-US", { hour: "2-digit", minute: "2-digit" }) : "";
    bar.classList.toggle("is-off", !live);
    bar.innerHTML = `<div class="price-bar__in">
      <div class="price-bar__title"><span class="price-bar__dot"></span>${L.title}</div>
      <div class="price-bar__items">
        ${GOLD.map((k) => cell(L.gold(k), last.gold[k], "")).join("")}
        ${SILVER.map((k) => cell(L.silver(k), last.silver[k], "price-bar__item--silver")).join("")}
      </div>
      <div class="price-bar__meta">${live ? L.live : L.off}${time ? " · " + L.at + " " + time : ""}</div>
    </div>`;
  }

  function show(p) {
    if (!p || !p.gold || !(p.gold[21] > 0)) return;
    last = p; lastAt = Date.now(); render();
  }

  async function pull() {
    try { show(window.PRICES || (window.CATALOG && (await window.CATALOG.getPrices()))); } catch (e) { /* keep the old numbers */ }
  }

  function start() {
    document.addEventListener("pricesupdated", () => show(window.PRICES));
    document.addEventListener("catalogready", () => { if (window.PRICES) show(window.PRICES); else pull(); });
    document.addEventListener("langchange", render);
    // safety net: if the catalog never loaded (e.g. database down) the bar still refreshes itself
    setInterval(async () => {
      if (Date.now() - lastAt > REFRESH_MS + 20000 && window.CATALOG) {
        try { show(await window.CATALOG.getPrices()); } catch (e) {}
      }
    }, 60 * 1000);
    if (window.PRICES) show(window.PRICES);
    else if (window.CATALOG) window.CATALOG.ready.then(() => { if (!last) pull(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
