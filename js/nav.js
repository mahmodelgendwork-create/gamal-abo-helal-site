/**
 * NAV / DRAWER / SHEET INTERACTIONS
 */
(function () {
  function openCart() {
    closeContact();
    document.querySelector("[data-cart-drawer]").classList.add("is-open");
    document.querySelector("[data-overlay]").classList.add("is-open");
    document.querySelector("[data-cart-drawer]").setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
    if (window.CART) window.CART.render();
  }
  function closeCart() {
    document.querySelector("[data-cart-drawer]").classList.remove("is-open");
    document.querySelector("[data-overlay]").classList.remove("is-open");
    document.querySelector("[data-cart-drawer]").setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
    if (window.CART) window.CART.resetView();
  }
  function openContact() {
    closeCart();
    document.querySelector("[data-contact-sheet]").classList.add("is-open");
    document.querySelector("[data-contact-overlay]").classList.add("is-open");
    document.querySelector("[data-contact-sheet]").setAttribute("aria-hidden", "false");
  }
  function closeContact() {
    document.querySelector("[data-contact-sheet]").classList.remove("is-open");
    document.querySelector("[data-contact-overlay]").classList.remove("is-open");
    document.querySelector("[data-contact-sheet]").setAttribute("aria-hidden", "true");
  }

  function wireContactLinks() {
    const c = window.SITE_CONFIG || {};
    document.querySelectorAll("[data-wa-link]").forEach((a) => {
      a.href = `https://wa.me/${c.whatsappNumber || ""}`;
    });
    document.querySelectorAll("[data-phone-link]").forEach((a) => {
      a.href = `tel:${(c.phoneDisplay || "").replace(/\s/g, "")}`;
    });
    document.querySelectorAll("[data-address]").forEach((el) => {
      const lang = (window.I18N && window.I18N.currentLang()) || "ar";
      el.textContent = lang === "ar" ? c.addressAr : c.addressEn;
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll('[data-nav="cart"]').forEach((btn) => btn.addEventListener("click", openCart));
    document.querySelectorAll('[data-nav="contact"]').forEach((btn) => btn.addEventListener("click", openContact));
    document.querySelectorAll("[data-nav]").forEach((btn) => {
      const href = btn.getAttribute("data-href");
      if (href) btn.addEventListener("click", () => (window.location.href = href));
    });
    document.querySelectorAll("[data-open-cart]").forEach((a) =>
      a.addEventListener("click", (e) => {
        e.preventDefault();
        openCart();
      })
    );

    const cartClose = document.querySelector("[data-cart-close]");
    if (cartClose) cartClose.addEventListener("click", closeCart);
    const overlay = document.querySelector("[data-overlay]");
    if (overlay) overlay.addEventListener("click", closeCart);

    const contactOverlay = document.querySelector("[data-contact-overlay]");
    if (contactOverlay) contactOverlay.addEventListener("click", closeContact);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        closeCart();
        closeContact();
      }
    });

    wireContactLinks();
    document.addEventListener("langchange", wireContactLinks);

    const yearEl = document.querySelector("[data-year]");
    if (yearEl) yearEl.textContent = new Date().getFullYear();
  });

  window.NAV = { openCart, closeCart, openContact, closeContact };
})();
