/**
 * PRODUCT CATALOG (loaded from the database)
 * -------------------------------------------
 * Products and categories live in Supabase. Prices are computed there:
 *   price = gms * gold price per gram (for the product's karat) + constant
 * so they are always current. Add/edit products from /admin.html.
 *
 * Exposes:
 *   window.PRODUCTS    [{ id, category, image, price, name:{ar,en}, desc:{ar,en}, karat, gms }]
 *   window.CATEGORIES  [{ slug, name:{ar,en} }]
 *   window.CATALOG.ready  -> Promise resolved when loaded (also fires "catalogready")
 */
(function () {
  window.PRODUCTS = [];
  window.CATEGORIES = [];

  // Turn a Google Drive share link into a direct image URL.
  // The file must be shared as "Anyone with the link can view".
  function imageUrl(link, width) {
    link = (link || "").trim();
    if (!link) return "assets/img/logo.png";
    const m = link.match(/\/d\/([\w-]{10,})/) || link.match(/[?&]id=([\w-]{10,})/);
    if (m && /drive\.google\.com|docs\.google\.com/.test(link)) {
      return "https://drive.google.com/thumbnail?id=" + m[1] + "&sz=w" + (width || 900);
    }
    return link; // any other direct image URL is used as-is
  }

  function api(path) {
    const c = window.SITE_CONFIG || {};
    const headers = { apikey: c.supabaseAnonKey };
    if (/^eyJ/.test(c.supabaseAnonKey)) headers.Authorization = "Bearer " + c.supabaseAnonKey; // legacy JWT keys only
    return fetch(c.supabaseUrl + "/rest/v1/" + path, { headers }).then((r) => {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function load() {
    const c = window.SITE_CONFIG || {};
    if (!c.supabaseUrl || /PASTE_/.test(c.supabaseUrl)) {
      console.warn("Supabase is not configured yet (js/config.js).");
      return Promise.resolve();
    }
    return Promise.all([
      api("categories?select=slug,name_ar,name_en&order=sort_order"),
      api("products_priced?select=*&order=created_at.desc")
    ])
      .then(([cats, prods]) => {
        window.CATEGORIES = cats.map((k) => ({ slug: k.slug, name: { ar: k.name_ar, en: k.name_en || k.name_ar } }));
        window.PRODUCTS = prods
          .filter((p) => p.price != null)
          .map((p) => ({
            id: p.id,
            category: p.category,
            image: imageUrl(p.image_url),
            price: Number(p.price),
            karat: p.karat,
            gms: Number(p.gms),
            name: { ar: p.name_ar, en: p.name_en || p.name_ar },
            desc: { ar: p.desc_ar, en: p.desc_en || p.desc_ar }
          }));
      })
      .catch((e) => console.error("Could not load catalog:", e));
  }

  window.CATALOG = {
    imageUrl,
    ready: load().then(() => document.dispatchEvent(new Event("catalogready")))
  };
})();
