/**
 * GALLERY (lightbox)
 * -------------------
 * Opens when a visitor taps a product photo. Loads ONLY the photo on screen (plus tiny
 * thumbnails and the next photo in the background), so the product grid stays fast.
 */
(function () {
  let box, state = { p: null, i: 0 };
  const lang = () => (window.I18N && window.I18N.currentLang()) || "ar";
  const L = { ar: { close: "إغلاق", prev: "السابق", next: "التالي" }, en: { close: "Close", prev: "Previous", next: "Next" } };
  const FALLBACK = "assets/img/logo.png";

  function build() {
    box = document.createElement("div");
    box.className = "gallery";
    box.hidden = true;
    box.innerHTML = `
      <div class="gallery-back" data-g-close></div>
      <div class="gallery-panel" role="dialog" aria-modal="true">
        <button class="gallery-x" data-g-close type="button">&times;</button>
        <div class="gallery-stage">
          <button class="gallery-nav gallery-prev" data-g-prev type="button">&#8249;</button>
          <img class="gallery-img" alt="" referrerpolicy="no-referrer" decoding="async">
          <button class="gallery-nav gallery-next" data-g-next type="button">&#8250;</button>
        </div>
        <div class="gallery-thumbs"></div>
        <div class="gallery-title"></div>
      </div>`;
    document.body.appendChild(box);
    box.addEventListener("click", (e) => {
      if (e.target.closest("[data-g-close]")) close();
      else if (e.target.closest("[data-g-prev]")) go(-1);
      else if (e.target.closest("[data-g-next]")) go(1);
      else { const t = e.target.closest("[data-g-i]"); if (t) show(Number(t.getAttribute("data-g-i"))); }
    });
    document.addEventListener("keydown", (e) => {
      if (box.hidden) return;
      if (e.key === "Escape") close();
      // arrows follow the visual direction (RTL flips them)
      const rtl = document.documentElement.dir === "rtl";
      if (e.key === "ArrowRight") go(rtl ? -1 : 1);
      if (e.key === "ArrowLeft") go(rtl ? 1 : -1);
    });
    // swipe
    let x0 = null;
    const stage = box.querySelector(".gallery-stage");
    stage.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    stage.addEventListener("touchend", (e) => {
      if (x0 == null) return;
      const dx = e.changedTouches[0].clientX - x0; x0 = null;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    });
  }

  function preload(i) {
    const ph = state.p.photos[(i + state.p.photos.length) % state.p.photos.length];
    if (ph) { const im = new Image(); im.referrerPolicy = "no-referrer"; im.src = ph.full; }
  }

  function show(i) {
    const n = state.p.photos.length;
    state.i = (i + n) % n;
    const img = box.querySelector(".gallery-img");
    const ph = state.p.photos[state.i];
    img.classList.add("is-loading");
    img.onload = () => img.classList.remove("is-loading");
    img.onerror = () => { img.onerror = null; img.src = ph.small !== img.src ? ph.small : FALLBACK; };
    img.src = ph.full;
    img.alt = state.p.name[lang()];
    box.querySelectorAll("[data-g-i]").forEach((t) => t.classList.toggle("is-active", Number(t.getAttribute("data-g-i")) === state.i));
    if (n > 1) preload(state.i + 1);
  }
  function go(d) { if (state.p.photos.length > 1) show(state.i + d); }

  function open(p) {
    if (!box) build();
    state = { p, i: 0 };
    const l = lang(), n = p.photos.length;
    box.querySelector(".gallery-title").textContent = p.name[l];
    box.querySelector("[data-g-close].gallery-x").setAttribute("aria-label", L[l].close);
    box.querySelector("[data-g-prev]").setAttribute("aria-label", L[l].prev);
    box.querySelector("[data-g-next]").setAttribute("aria-label", L[l].next);
    box.classList.toggle("is-single", n < 2);
    // tiny thumbnails (~120px) are only created for products with several photos
    box.querySelector(".gallery-thumbs").innerHTML = n < 2 ? "" : p.photos
      .map((ph, i) => `<button class="gallery-thumb" data-g-i="${i}" type="button"><img src="${ph.thumb}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" width="60" height="60"></button>`).join("");
    box.hidden = false;
    document.body.classList.add("no-scroll");
    show(0);
  }
  function close() {
    box.hidden = true;
    box.querySelector(".gallery-img").removeAttribute("src");   // stop any pending download
    document.body.classList.remove("no-scroll");
  }

  window.GALLERY = { open, close };
})();
