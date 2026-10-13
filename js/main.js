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
        <div class="product-media" data-gallery="${p.id}" role="button" tabindex="0" aria-label="${p.name[l]}"><img src="${p.image}" alt="${p.name[l]}" loading="lazy" decoding="async" width="480" height="600" referrerpolicy="no-referrer" ${p.localDefault ? `data-pid="${p.id}"` : ""} onerror="CATALOG.imgFallback(this)">${p.photos.length > 1 ? `<span class="photo-count">${p.photos.length}</span>` : ""}</div>
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
  }

  function renderProductsPage() {
    const mount = document.getElementById("product-grid");
    if (!mount) return;
    let activeFilter = "all";

    function paint() {
      paintChips();
      const list = window.PRODUCTS.filter((p) => activeFilter === "all" || p.category === activeFilter);
      mount.innerHTML = list.map(productCard).join("") || emptyMsg();
      labelAddButtons(mount);
    }

    // Filter chips are built from the categories that actually have products.
    function paintChips() {
      const row = document.getElementById("filter-row");
      if (!row) return;
      const used = new Set(window.PRODUCTS.map((p) => p.category));
      const cats = window.CATEGORIES.filter((c) => used.has(c.slug));
      const allLabel = window.I18N.get(window.I18N.dict[lang()], "products.filters.all");
      row.innerHTML =
        `<button class="chip ${activeFilter === "all" ? "is-active" : ""}" data-filter="all">${allLabel}</button>` +
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
    const m = e.target.closest("[data-gallery]");
    if (!m || (e.type === "keydown" && e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    const p = window.PRODUCTS.find((x) => x.id === m.getAttribute("data-gallery"));
    if (p && window.GALLERY) window.GALLERY.open(p);
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
