/**
 * SHARED COMPONENTS
 * ------------------
 * HTML for the parts that repeat on every page: top bar, bottom nav,
 * cart drawer, contact sheet and footer. Kept in one place so editing
 * a link or a translation key only has to happen once.
 */
window.COMPONENTS = {
  topbar(active) {
    return `
      <header class="topbar">
        <a href="index.html" class="brand-mark" aria-label="Gamal Abo Hel'al">
          <img src="assets/img/logo.png" alt="Gamal Abo Hel'al">
        </a>
        <button class="lang-toggle" data-lang-toggle type="button">
          <span data-lang-switch-label>English</span>
        </button>
      </header>`;
  },

  bottomNav(active) {
    const item = (key, href, icon, id) => `
      <button class="nav-item ${active === key ? "is-active" : ""}" data-nav="${key}" ${href ? `data-href="${href}"` : ""} type="button">
        ${icon}
        <span data-i18n="nav.${key}"></span>
        ${id === "cart" ? '<span class="badge hidden" data-cart-badge>0</span>' : ""}
      </button>`;

    const icons = {
      home: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v9a1 1 0 0 0 1 1H9a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h2.5a1 1 0 0 0 1-1v-9"/></svg>`,
      products: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 3 8l9 5 9-5-9-5Z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/></svg>`,
      cart: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7h12l1.2 11.2a1.5 1.5 0 0 1-1.5 1.8H6.3a1.5 1.5 0 0 1-1.5-1.8L6 7Z"/><path d="M9 10V6a3 3 0 1 1 6 0v4"/></svg>`,
      contact: `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 5h16v10H8l-4 4V5Z"/></svg>`
    };

    return `
      <nav class="bottom-nav" aria-label="Main">
        <div class="bottom-nav-inner">
          ${item("home", "index.html", icons.home)}
          ${item("products", "products.html", icons.products)}
          ${item("cart", null, icons.cart, "cart")}
          ${item("contact", null, icons.contact)}
        </div>
      </nav>`;
  },

  cartDrawer() {
    return `
      <div class="overlay" data-overlay></div>
      <aside class="drawer" data-cart-drawer aria-label="Cart" aria-hidden="true">
        <div class="drawer-head">
          <h3 data-i18n="cart.title" data-cart-title></h3>
          <button class="drawer-close" data-cart-close aria-label="Close">&times;</button>
        </div>
        <div class="drawer-body" data-cart-body></div>
        <div class="drawer-foot" data-cart-foot></div>
      </aside>`;
  },

  contactSheet() {
    const c = window.SITE_CONFIG || {};
    const waIcon = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20l1.4-4.2A8 8 0 1 1 8.9 19L4 20Z"/><path d="M9 10c0 3 2.5 5.5 5.5 5.5"/></svg>`;
    const phoneIcon = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M5 4h4l1.5 4.5L8 10.5a12 12 0 0 0 5.5 5.5l2-2.5L20 15v4a1.5 1.5 0 0 1-1.6 1.5A16 16 0 0 1 3.5 5.6 1.5 1.5 0 0 1 5 4Z"/></svg>`;
    const mailIcon = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16v12H4V6Z"/><path d="m4 7 8 6 8-6"/></svg>`;
    const pinIcon = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s7-6.4 7-11.5A7 7 0 0 0 5 9.5C5 14.6 12 21 12 21Z"/><circle cx="12" cy="9.5" r="2.3"/></svg>`;
    const igIcon = `<svg viewBox="0 0 24 24" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="16" height="16" rx="4"/><circle cx="12" cy="12" r="3.3"/><circle cx="16.2" cy="7.8" r=".6" fill="currentColor" stroke="none"/></svg>`;

    return `
      <div class="overlay" data-contact-overlay></div>
      <section class="sheet" data-contact-sheet aria-hidden="true">
        <div class="sheet-handle"></div>
        <h3 data-i18n="contact.title" style="margin-bottom:18px;"></h3>
        <div class="contact-list">
          <a class="contact-row" data-wa-link href="#" target="_blank" rel="noopener">
            ${waIcon}
            <div><div class="t" data-i18n="contact.whatsapp"></div><div class="s" data-i18n="contact.whatsappSub"></div></div>
          </a>
          <a class="contact-row" data-phone-link href="#">
            ${phoneIcon}
            <div><div class="t" data-i18n="contact.phone"></div><div class="s">${c.phoneDisplay || ""}</div></div>
          </a>
          <a class="contact-row" href="mailto:${c.email || ""}">
            ${mailIcon}
            <div><div class="t" data-i18n="contact.email"></div><div class="s">${c.email || ""}</div></div>
          </a>
          <a class="contact-row" href="${c.instagramUrl || "#"}" target="_blank" rel="noopener">
            ${igIcon}
            <div><div class="t" data-i18n="contact.instagram"></div><div class="s">@gamalabohelal</div></div>
          </a>
          <div class="contact-row">
            ${pinIcon}
            <div><div class="t" data-i18n="contact.address"></div><div class="s" data-address></div></div>
          </div>
        </div>
      </section>`;
  },

  footer() {
    const c = window.SITE_CONFIG || {};
    return `
      <footer class="footer">
        <div class="container">
          <div class="footer-grid">
            <div>
              <img src="assets/img/logo.png" alt="Gamal Abo Hel'al" class="footer-logo">
              <p data-i18n="footer.about" style="max-width:38ch;"></p>
            </div>
            <div>
              <h4 data-i18n="footer.explore"></h4>
              <ul class="footer-links">
                <li><a href="index.html" data-i18n="nav.home"></a></li>
                <li><a href="products.html" data-i18n="nav.products"></a></li>
                <li><a href="#" data-open-cart data-i18n="nav.cart"></a></li>
              </ul>
            </div>
            <div>
              <h4 data-i18n="footer.support"></h4>
              <ul class="footer-links">
                <li><a data-wa-link href="#" target="_blank" rel="noopener" data-i18n="contact.whatsapp"></a></li>
                <li><a href="mailto:${c.email || ""}">${c.email || ""}</a></li>
                <li><a href="tel:${(c.phoneDisplay || "").replace(/\s/g, "")}">${c.phoneDisplay || ""}</a></li>
              </ul>
            </div>
          </div>
          <div class="footer-bottom">
            <span>&copy; <span data-year></span> Gamal Abo Hel'al — <span data-i18n="footer.rights"></span></span>
            <span data-i18n-currency-note></span>
          </div>
        </div>
      </footer>`;
  }
};
