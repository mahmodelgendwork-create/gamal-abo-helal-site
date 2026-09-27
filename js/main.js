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
        <div class="product-media"><img src="${p.image}" alt="${p.name[l]}" loading="lazy"></div>
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

  function renderFeaturedProducts() {
    const mount = document.getElementById("featured-products");
    if (!mount) return;
    const featured = window.PRODUCTS.slice(0, 3);
    mount.innerHTML = featured.map(productCard).join("");
    labelAddButtons(mount);
  }

  function renderProductsPage() {
    const mount = document.getElementById("product-grid");
    if (!mount) return;
    let activeFilter = "all";

    function paint() {
      const list = window.PRODUCTS.filter((p) => activeFilter === "all" || p.category === activeFilter);
      mount.innerHTML = list.map(productCard).join("");
      labelAddButtons(mount);
    }

    document.querySelectorAll(".chip").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll(".chip").forEach((c) => c.classList.remove("is-active"));
        chip.classList.add("is-active");
        activeFilter = chip.getAttribute("data-filter");
        paint();
      });
    });

    paint();
    document.addEventListener("langchange", paint);
  }

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
  });
})();
