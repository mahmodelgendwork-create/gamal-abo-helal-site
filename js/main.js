/**
 * MAIN — injects shared components and renders product grids.
 */
(function () {
  function injectComponents() {
    const page = document.body.getAttribute("data-page") || "home";

    const topbarMount = document.getElementById("app-topbar");
    if (topbarMount) topbarMount.innerHTML = window.COMPONENTS.topbar(page);

    const navMount = document.getElementById("app-bottom-nav");
    if (navMount) navMount.innerHTML = window.COMPONENTS.bottomNav(page);

    const cartMount = document.getElementById("app-cart-drawer");
    if (cartMount) cartMount.innerHTML = window.COMPONENTS.cartDrawer();

    const contactMount = document.getElementById("app-contact-sheet");
    if (contactMount) contactMount.innerHTML = window.COMPONENTS.contactSheet();

    const footerMount = document.getElementById("app-footer");
    if (footerMount) footerMount.innerHTML = window.COMPONENTS.footer();
  }

  function lang() {
    return (window.I18N && window.I18N.currentLang()) || "ar";
  }
  function money(n) {
    const cur = (window.SITE_CONFIG.currency || {})[lang()] || "";
    return `${n.toLocaleString(lang() === "ar" ? "ar-EG" : "en-US")} ${cur}`;
  }

  function productCard(p) {
    const l = lang();
    return `
      <article class="product-card" data-product="${p.id}" data-category="${p.category}">
        <div class="product-media" data-gallery="${p.id}">
          <div class="slides" data-slides>
            ${p.photos.map((ph, i) => `<div class="slide"><img alt="${p.name[l]}" width="480" height="520" referrerpolicy="no-referrer" decoding="async" ${i === 0 ? `src="${p.image}" loading="lazy"` : `data-src="${ph.small}"`} onerror="CATALOG.imgFallback(this)" onload="this.classList.add('is-in')"></div>`).join("")}
          </div>
          ${p.photos.length > 1 ? `
            <button class="m-arrow m-prev" data-arrow="prev" type="button" aria-label="prev">&#8249;</button>
            <button class="m-arrow m-next" data-arrow="next" type="button" aria-label="next">&#8250;</button>
            <div class="dots">${p.photos.map((_, i) => `<span class="dot ${i === 0 ? "is-active" : ""}"></span>`).join("")}</div>` : ""}
        </div>
        <div class="product-body">
          <h3>${p.name[l]}</h3>
          <p class="product-meta">${p.desc[l]}</p>
          <div class="product-price">${money(p.price)}</div>
          <div class="product-actions">
            <button class="btn btn--solid btn--block" data-add-to-cart="${p.id}"></button>
          </div>
        </div>
      </article>`;
  }

  /* Carousel inside each card. Only the first photo loads with the page; the next one loads
     when the visitor first touches/hovers the card, then always "one ahead" while swiping. */
  function initCarousels(root) {
    root.querySelectorAll(".product-media").forEach((media) => {
      const slides = media.querySelector("[data-slides]");
      const n = slides.children.length;
      slides.querySelectorAll("img").forEach((im) => { if (im.complete && im.naturalWidth) im.classList.add("is-in"); });
      if (n < 2) return;
      const dots = media.querySelectorAll(".dot");
      const prev = media.querySelector(".m-prev"), next = media.querySelector(".m-next");
      const rtl = () => document.documentElement.dir === "rtl";
      const load = (i) => {
        const im = slides.children[i] && slides.children[i].querySelector("img[data-src]");
        if (im) { im.src = im.getAttribute("data-src"); im.removeAttribute("data-src"); }
      };
      const index = () => Math.min(n - 1, Math.max(0, Math.round(Math.abs(slides.scrollLeft) / slides.clientWidth)));
      media._idx = 0;
      const sync = (initial) => {
        const i = index(); media._idx = i;
        dots.forEach((d, k) => d.classList.toggle("is-active", k === i));
        if (prev) prev.hidden = i === 0; if (next) next.hidden = i === n - 1;
        load(i);
        if (initial !== true) load(i + 1);   // page load fetches only the cover photo
      };
      const goTo = (i) => {
        i = Math.min(n - 1, Math.max(0, i));
        slides.scrollTo({ left: (rtl() ? -1 : 1) * i * slides.clientWidth, behavior: "smooth" });
      };
      let raf = 0;
      slides.addEventListener("scroll", () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(() => sync()); }, { passive: true });
      const warm = () => load(1);
      ["pointerenter", "touchstart", "focusin"].forEach((ev) => media.addEventListener(ev, warm, { once: true, passive: true }));
      media.addEventListener("click", (e) => {
        const a = e.target.closest("[data-arrow]");
        if (!a) return;
        e.stopPropagation(); e.preventDefault();
        goTo(media._idx + (a.getAttribute("data-arrow") === "next" ? 1 : -1));
      }, true);
      sync(true);
    });
  }

  function labelAddButtons(root) {
    root.querySelectorAll("[data-add-to-cart]").forEach((btn) => {
      btn.textContent = window.I18N.get(window.I18N.dict[lang()], "products.addToCart");
      btn.addEventListener("click", () => {
        window.CART.addToCart(btn.getAttribute("data-add-to-cart"), 1);
        const original = btn.textContent;
        btn.textContent = window.I18N.get(window.I18N.dict[lang()], "products.added");
        btn.disabled = true;
        setTimeout(() => {
          btn.textContent = original;
          btn.disabled = false;
        }, 1100);
      });
    });
  }

  function emptyMsg() {
    return `<p class="product-meta" style="grid-column:1/-1;text-align:center;">${lang() === "ar" ? "سيتم إضافة المنتجات قريبًا." : "Products are coming soon."}</p>`;
  }

  function renderFeaturedProducts() {
    const mount = document.getElementById("featured-products");
    if (!mount) return;
    const featured = window.PRODUCTS.slice(0, 3);
    mount.innerHTML = featured.map(productCard).join("") || emptyMsg();
    labelAddButtons(mount);
    initCarousels(mount);
  }

  function renderProductsPage() {
    const mount = document.getElementById("product-grid");
    if (!mount) return;
    let activeFilter = "all";

    // products.html?p=<id> (from the chatbot): scroll to that product and highlight it once
    let pinned = false;
    function pinFromUrl() {
      if (pinned || !window.PRODUCTS.length) return;
      const id = new URLSearchParams(location.search).get("p");
      pinned = true;
      const card = id && mount.querySelector('[data-product="' + (window.CSS && CSS.escape ? CSS.escape(id) : id) + '"]');
      if (!card) return;
      card.classList.add("is-pinned");
      setTimeout(() => card.scrollIntoView({ block: "center", behavior: "smooth" }), 250);
      setTimeout(() => card.classList.remove("is-pinned"), 6000);
    }

    function paint() {
      paintChips();
      const list = window.PRODUCTS.filter((p) =>
        activeFilter === "all" ? true :
        activeFilter.indexOf("metal:") === 0 ? p.metal === activeFilter.slice(6) :
        p.category === activeFilter);
      mount.innerHTML = list.map(productCard).join("") || emptyMsg();
      labelAddButtons(mount);
      initCarousels(mount);
      pinFromUrl();
    }

    // Filter chips are built from the categories that actually have products.
    function paintChips() {
      const row = document.getElementById("filter-row");
      if (!row) return;
      const used = new Set(window.PRODUCTS.map((p) => p.category));
      const cats = window.CATEGORIES.filter((c) => used.has(c.slug));
      const f = window.I18N.dict[lang()].products.filters;
      // gold / silver chips appear only once there is at least one silver product
      const hasSilver = window.PRODUCTS.some((p) => p.metal === "silver");
      const hasGold = window.PRODUCTS.some((p) => p.metal !== "silver");
      const metalChips = hasSilver && hasGold
        ? [["metal:gold", f.gold], ["metal:silver", f.silver]]
            .map(([k, label]) => `<button class="chip ${activeFilter === k ? "is-active" : ""}" data-filter="${k}">${label}</button>`).join("")
        : "";
      row.innerHTML =
        `<button class="chip ${activeFilter === "all" ? "is-active" : ""}" data-filter="all">${f.all}</button>` + metalChips +
        cats.map((c) => `<button class="chip ${activeFilter === c.slug ? "is-active" : ""}" data-filter="${c.slug}">${c.name[lang()]}</button>`).join("");
      row.querySelectorAll(".chip").forEach((chip) => {
        chip.addEventListener("click", () => {
          activeFilter = chip.getAttribute("data-filter");
          paint();
        });
      });
    }

    paint();
    document.addEventListener("catalogready", paint);
    document.addEventListener("langchange", paint);
  }

  function openFrom(e) {
    if (e.target.closest("[data-arrow]")) return;
    const m = e.target.closest("[data-gallery]");
    if (!m || (e.type === "keydown" && e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    const p = window.PRODUCTS.find((x) => x.id === m.getAttribute("data-gallery"));
    if (p && window.GALLERY) window.GALLERY.open(p, m._idx || 0);
  }
  document.addEventListener("click", openFrom);
  document.addEventListener("keydown", openFrom);

  document.addEventListener("DOMContentLoaded", () => {
    injectComponents();
    // Re-apply translations to the components we just injected.
    if (window.I18N) window.I18N.applyLang(window.I18N.currentLang());
    renderFeaturedProducts();
    renderProductsPage();
    if (window.CART) window.CART.render();

    document.addEventListener("langchange", () => {
      renderFeaturedProducts();
    });
    // Prices/products arrive from the database after the page is up.
    document.addEventListener("catalogready", () => {
      renderFeaturedProducts();
      if (window.CART) window.CART.render();
    });
  });
})();
