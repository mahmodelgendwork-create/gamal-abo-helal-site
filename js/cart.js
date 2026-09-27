/**
 * CART
 * -----
 * Cart lives in localStorage as an array of { id, qty }.
 * Product details (name/price/image) are looked up from window.PRODUCTS
 * at render time, so editing products.js is always reflected immediately.
 */
(function () {
  const STORAGE_KEY = "gah_cart";
  let view = "cart"; // "cart" | "checkout" | "done"

  function readCart() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch (e) {
      return [];
    }
  }
  function writeCart(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    updateBadge();
  }
  function findProduct(id) {
    return (window.PRODUCTS || []).find((p) => p.id === id);
  }
  function lang() {
    return (window.I18N && window.I18N.currentLang()) || "ar";
  }
  function t(path) {
    const d = window.I18N.dict[lang()];
    return window.I18N.get(d, path);
  }
  function money(n) {
    const cur = (window.SITE_CONFIG.currency || {})[lang()] || "";
    return `${n.toLocaleString(lang() === "ar" ? "ar-EG" : "en-US")} ${cur}`;
  }

  function addToCart(id, qty) {
    qty = qty || 1;
    const items = readCart();
    const line = items.find((l) => l.id === id);
    if (line) line.qty += qty;
    else items.push({ id, qty });
    writeCart(items);
    render();
  }
  function setQty(id, qty) {
    let items = readCart();
    if (qty <= 0) {
      items = items.filter((l) => l.id !== id);
    } else {
      const line = items.find((l) => l.id === id);
      if (line) line.qty = qty;
    }
    writeCart(items);
    render();
  }
  function removeLine(id) {
    setQty(id, 0);
  }
  function clearCart() {
    writeCart([]);
    view = "cart";
  }
  function count() {
    return readCart().reduce((sum, l) => sum + l.qty, 0);
  }
  function subtotal() {
    return readCart().reduce((sum, l) => {
      const p = findProduct(l.id);
      return sum + (p ? p.price * l.qty : 0);
    }, 0);
  }

  function updateBadge() {
    const n = count();
    document.querySelectorAll("[data-cart-badge]").forEach((el) => {
      el.textContent = n;
      el.classList.toggle("hidden", n === 0);
    });
  }

  /* ---------------- Rendering ---------------- */
  function renderCartView() {
    const items = readCart();
    const body = document.querySelector("[data-cart-body]");
    const foot = document.querySelector("[data-cart-foot]");
    if (!body || !foot) return;

    if (items.length === 0) {
      body.innerHTML = `
        <div class="cart-empty">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M6 7h12l1.2 11.2a1.5 1.5 0 0 1-1.5 1.8H6.3a1.5 1.5 0 0 1-1.5-1.8L6 7Z"/><path d="M9 10V6a3 3 0 1 1 6 0v4"/></svg>
          <div>${t("cart.emptyTitle")}</div>
          <p style="margin-top:6px;">${t("cart.emptyBody")}</p>
        </div>`;
      foot.innerHTML = `<a class="btn btn--solid btn--block" href="products.html">${t("cart.browse")}</a>`;
      return;
    }

    body.innerHTML = items
      .map((line) => {
        const p = findProduct(line.id);
        if (!p) return "";
        return `
        <div class="cart-line" data-line="${p.id}">
          <img src="${p.image}" alt="">
          <div class="cart-line-body">
            <div class="cart-line-title">${p.name[lang()]}</div>
            <div class="cart-line-meta">${money(p.price)}</div>
            <div class="qty-row">
              <button class="qty-btn" data-qty-dec>&minus;</button>
              <span>${line.qty}</span>
              <button class="qty-btn" data-qty-inc>&plus;</button>
              <button class="remove-line" data-remove-line>&times;</button>
            </div>
          </div>
        </div>`;
      })
      .join("");

    foot.innerHTML = `
      <div class="summary-row"><span>${t("cart.subtotal")}</span><span>${money(subtotal())}</span></div>
      <div class="summary-row" style="font-size:12.5px;"><span>${t("cart.shippingNote")}</span><span></span></div>
      <div class="summary-row total"><span>${t("cart.total")}</span><span class="amount">${money(subtotal())}</span></div>
      <button class="btn btn--solid btn--block" data-go-checkout style="margin-top:14px;">${t("cart.checkout")}</button>`;

    body.querySelectorAll("[data-line]").forEach((row) => {
      const id = row.getAttribute("data-line");
      const line = items.find((l) => l.id === id);
      row.querySelector("[data-qty-inc]").addEventListener("click", () => setQty(id, line.qty + 1));
      row.querySelector("[data-qty-dec]").addEventListener("click", () => setQty(id, line.qty - 1));
      row.querySelector("[data-remove-line]").addEventListener("click", () => removeLine(id));
    });
    const goCheckout = foot.querySelector("[data-go-checkout]");
    if (goCheckout) goCheckout.addEventListener("click", () => { view = "checkout"; render(); });
  }

  function renderCheckoutView() {
    const body = document.querySelector("[data-cart-body]");
    const foot = document.querySelector("[data-cart-foot]");
    if (!body || !foot) return;

    body.innerHTML = `
      <form class="checkout-form" data-checkout-form>
        <div class="field">
          <label>${t("cart.name")}</label>
          <input type="text" name="name" required>
        </div>
        <div class="field">
          <label>${t("cart.phone")}</label>
          <input type="tel" name="phone" required>
        </div>
        <div class="field">
          <label>${t("cart.city")}</label>
          <input type="text" name="city" required>
        </div>
        <div class="field">
          <label>${t("cart.address")}</label>
          <textarea name="address" required></textarea>
        </div>
        <div class="field">
          <label>${t("cart.notes")}</label>
          <textarea name="notes"></textarea>
        </div>
        <div class="form-status" data-form-status></div>
        <button type="submit" class="btn btn--solid btn--block" data-submit-order>${t("cart.confirm")}</button>
        <button type="button" class="btn btn--ghost btn--block" data-back-to-cart>${t("cart.backToCart")}</button>
      </form>`;
    foot.innerHTML = "";

    body.querySelector("[data-back-to-cart]").addEventListener("click", () => { view = "cart"; render(); });
    body.querySelector("[data-checkout-form]").addEventListener("submit", onSubmitOrder);
  }

  function renderDoneView(message, isError, waHref) {
    const body = document.querySelector("[data-cart-body]");
    const foot = document.querySelector("[data-cart-foot]");
    body.innerHTML = `
      <div class="cart-empty">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><path d="M5 12.5 9.5 17 19 7.5"/></svg>
        <p>${message}</p>
        ${isError ? `<a class="btn btn--solid" href="${waHref}" target="_blank" rel="noopener" style="margin-top:10px;">${t("cart.whatsappFallback")}</a>` : ""}
      </div>`;
    foot.innerHTML = `<button class="btn btn--ghost btn--block" data-new-order>${t("cart.newOrder")}</button>`;
    foot.querySelector("[data-new-order]").addEventListener("click", () => {
      clearCart();
      render();
    });
  }

  function buildOrderPayload(form) {
    const items = readCart().map((l) => {
      const p = findProduct(l.id);
      return {
        id: l.id,
        name: p ? p.name[lang()] : l.id,
        qty: l.qty,
        price: p ? p.price : 0,
        lineTotal: p ? p.price * l.qty : 0
      };
    });
    return {
      timestamp: new Date().toISOString(),
      language: lang(),
      customerName: form.name.value.trim(),
      phone: form.phone.value.trim(),
      city: form.city.value.trim(),
      address: form.address.value.trim(),
      notes: form.notes.value.trim(),
      items,
      subtotal: subtotal(),
      itemCount: count()
    };
  }

  function whatsappOrderText(payload) {
    const lines = [
      `${t("cart.newOrder")} — Gamal Abo Hel'al`,
      `${t("cart.name")}: ${payload.customerName}`,
      `${t("cart.phone")}: ${payload.phone}`,
      `${t("cart.city")}: ${payload.city}`,
      `${t("cart.address")}: ${payload.address}`,
      payload.notes ? `${t("cart.notes")}: ${payload.notes}` : null,
      "----",
      ...payload.items.map((i) => `${i.qty} × ${i.name} — ${money(i.lineTotal)}`),
      "----",
      `${t("cart.total")}: ${money(payload.subtotal)}`
    ].filter(Boolean);
    return lines.join("\n");
  }

  function onSubmitOrder(e) {
    e.preventDefault();
    const form = e.target;
    const statusEl = form.querySelector("[data-form-status]");
    const submitBtn = form.querySelector("[data-submit-order]");
    const payload = buildOrderPayload(form);
    const url = window.SITE_CONFIG.googleSheetWebAppUrl;

    statusEl.textContent = t("cart.sending");
    statusEl.className = "form-status";
    submitBtn.disabled = true;

    const waNumber = window.SITE_CONFIG.whatsappNumber;
    const waHref = `https://wa.me/${waNumber}?text=${encodeURIComponent(whatsappOrderText(payload))}`;

    if (!url || url.indexOf("PASTE_YOUR_GOOGLE_APPS_SCRIPT") !== -1) {
      // Not configured yet: skip the network call so the demo still works end to end.
      view = "done";
      renderDoneView(t("cart.success"));
      clearCart();
      return;
    }

    fetch(url, {
      method: "POST",
      mode: "no-cors", // Apps Script web apps don't return CORS headers by default;
      // no-cors lets the request go through — we can't read the response,
      // so we optimistically show success once the request is sent.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    })
      .then(() => {
        view = "done";
        renderDoneView(t("cart.success"));
        clearCart();
      })
      .catch(() => {
        view = "done";
        renderDoneView(`${t("cart.errorNetwork")}`, true, waHref);
        clearCart();
      });
  }

  function render() {
    updateBadge();
    const titleEl = document.querySelector("[data-cart-title]");
    if (titleEl) titleEl.textContent = view === "checkout" ? t("cart.formTitle") : t("cart.title");
    if (view === "checkout") renderCheckoutView();
    else if (view === "cart") renderCartView();
  }

  window.CART = { addToCart, setQty, removeLine, clearCart, count, subtotal, render, resetView: () => { view = "cart"; } };

  document.addEventListener("langchange", () => render());
  document.addEventListener("DOMContentLoaded", updateBadge);
})();
