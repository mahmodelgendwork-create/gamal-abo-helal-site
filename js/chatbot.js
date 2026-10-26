/**
 * SALES CHATBOT (frontend)
 * -------------------------
 * Floating button + chat panel. It only talks to YOUR backend (Supabase Edge Function "chat");
 * the Gemini key never reaches the browser. Product cards are built from real data returned by
 * the backend and reuse the site's own helpers (CATALOG.photo for images, CART.addToCart for the cart).
 *
 * Endpoint: window.SITE_CONFIG.chatApiUrl  (defaults to <supabaseUrl>/functions/v1/chat)
 */
(function () {
  "use strict";

  var cfg = window.SITE_CONFIG || {};
  var ENDPOINT = cfg.chatApiUrl || (cfg.supabaseUrl ? String(cfg.supabaseUrl).replace(/\/+$/, "") + "/functions/v1/chat" : "");
  if (!ENDPOINT || /PASTE_/.test(ENDPOINT)) return;       // not configured → the chatbot stays hidden

  var MAX_LEN = 500;            // characters per customer message (same limit as the server)
  var HISTORY_TURNS = 6;        // only the last few messages are sent for context
  var MIN_GAP_MS = 1200;        // client-side brake against rapid repeats (server limits too)
  var TIMEOUT_MS = 30000;
  var STORE_KEY = "gah_chat_v1";
  var MAX_STORED = 20;

  /* ------------------------------------------------------------------ text */
  var TXT = {
    ar: {
      open: "افتح المساعد", close: "إغلاق", title: "مساعد جمال أبو هلال", sub: "اسألني عن الذهب والفضة والأسعار",
      welcome: "أهلاً بيك! أنا مساعدك في اختيار قطع الذهب المناسبة ليك. تحب تدور على خاتم، سلسلة، أو إسورة؟",
      placeholder: "اكتب رسالتك…", send: "إرسال", typing: "المساعد بيكتب", wa: "كلّم فريقنا على واتساب",
      view: "عرض", add: "أضف للسلة", added: "أُضيفت ✓", gram: "جم", gold: "ذهب عيار", silver: "فضة",
      priceNA: "السعر بيتأكد على واتساب",
      errNet: "تعذّر الاتصال دلوقتي. جرّب تاني بعد شوية، أو كلّمنا على واتساب.",
      tooLong: "الرسالة طويلة شوية. اكتبها في حدود " + MAX_LEN + " حرف.",
      note: "الأسعار من الموقع لحظيًا، وتوفّر القطعة بيتأكد من فريقنا على واتساب.",
      chips: ["عايز أشوف الخواتم", "عايز سلسلة دهب", "أساور فضة", "سعر الجرام النهاردة", "إزاي أطلب من الموقع؟"],
      cur: cfg.currency && cfg.currency.ar || "ج.م", nf: "ar-EG"
    },
    en: {
      open: "Open assistant", close: "Close", title: "Gamal Abo Hel'al Assistant", sub: "Ask about gold, silver and prices",
      welcome: "Welcome! I'm here to help you choose the right gold pieces. Are you looking for a ring, a chain, or a bracelet?",
      placeholder: "Type your message…", send: "Send", typing: "Assistant is typing", wa: "Chat with our team on WhatsApp",
      view: "View", add: "Add to cart", added: "Added ✓", gram: "g", gold: "gold", silver: "silver",
      priceNA: "Price confirmed on WhatsApp",
      errNet: "We couldn't connect just now. Please try again shortly, or message us on WhatsApp.",
      tooLong: "That message is a bit long. Please keep it under " + MAX_LEN + " characters.",
      note: "Prices are live from the website; our team confirms availability on WhatsApp.",
      chips: ["Show me rings", "I'd like a gold chain", "Silver bracelets", "Today's gold price per gram", "How do I order?"],
      cur: cfg.currency && cfg.currency.en || "EGP", nf: "en-US"
    }
  };
  function lang() { return (window.I18N && window.I18N.currentLang && window.I18N.currentLang()) === "en" ? "en" : "ar"; }
  function T() { return TXT[lang()]; }

  /* ------------------------------------------------------------------ state */
  var state = { msgs: [] };          // { role: "user"|"bot", text, products?, err?, wa? }
  var busy = false, lastSent = 0, isOpen = false;
  try {
    var saved = JSON.parse(sessionStorage.getItem(STORE_KEY) || "null");
    if (saved && Array.isArray(saved.msgs)) state.msgs = saved.msgs.slice(-MAX_STORED);
  } catch (e) { /* private mode: chat still works, just not remembered across pages */ }
  function persist() {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify({ msgs: state.msgs.slice(-MAX_STORED) })); } catch (e) { /* ignore */ }
  }

  /* ------------------------------------------------------------------ DOM */
  var svg = {
    chat: '<svg class="gc-ic-chat" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5h16a1 1 0 0 1 1 1v9.5a1 1 0 0 1-1 1H9.5L5 20.5V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1Z"/><path d="M8 10h8M8 13h5"/></svg>',
    close: '<svg class="gc-ic-close" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    x: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>',
    wa: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20l1.4-4.2A8 8 0 1 1 8.9 19L4 20Z"/><path d="M9 10c0 3 2.5 5.5 5.5 5.5"/></svg>',
    send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21 3 10 14"/><path d="m21 3-7 18-4-7-7-4 18-7Z"/></svg>'
  };

  var root = document.createElement("div");
  root.className = "gc-root";
  root.setAttribute("data-chatbot", "");
  root.innerHTML =
    '<button class="gc-fab" type="button" aria-expanded="false" aria-controls="gc-panel">' + svg.chat + svg.close + '</button>' +
    '<section class="gc-panel" id="gc-panel" role="dialog" aria-modal="false" inert>' +
      '<header class="gc-head">' +
        '<img class="gc-logo" src="assets/img/logo.png" alt="" width="38" height="38">' +
        '<div class="gc-titles"><strong class="gc-title"></strong><span class="gc-sub"></span></div>' +
        '<a class="gc-hbtn gc-wa-head" target="_blank" rel="noopener">' + svg.wa + '</a>' +
        '<button class="gc-hbtn gc-x" type="button">' + svg.x + '</button>' +
      '</header>' +
      '<div class="gc-log" role="log" aria-live="polite" aria-relevant="additions" tabindex="0"></div>' +
      '<div class="gc-chips"></div>' +
      '<form class="gc-form" autocomplete="off">' +
        '<label class="gc-sr" for="gc-input"></label>' +
        '<textarea class="gc-input" id="gc-input" rows="1" maxlength="' + MAX_LEN + '" enterkeyhint="send"></textarea>' +
        '<button class="gc-send" type="submit">' + svg.send + '</button>' +
      '</form>' +
      '<p class="gc-note"></p>' +
    '</section>';

  var $ = function (s) { return root.querySelector(s); };
  var fab = $(".gc-fab"), panel = $(".gc-panel"), logEl = $(".gc-log"), chipsEl = $(".gc-chips"),
      form = $(".gc-form"), input = $(".gc-input"), sendBtn = $(".gc-send"), waHead = $(".gc-wa-head"),
      closeBtn = $(".gc-x"), inputLabel = $(".gc-form label");

  /* ------------------------------------------------------------------ helpers */
  function waHref() { return "https://wa.me/" + (cfg.whatsappNumber || ""); }

  function money(n) { var t = T(); return Number(n).toLocaleString(t.nf) + " " + t.cur; }

  /* safe text → DOM (no innerHTML): **bold**, line breaks, "-"/"*" bullets */
  function renderText(el, text) {
    el.textContent = "";
    String(text || "").split(/\n/).forEach(function (line, i) {
      if (i) el.appendChild(document.createElement("br"));
      line = line.replace(/^\s*[-*•]\s+/, "• ");
      line.split(/\*\*(.+?)\*\*/g).forEach(function (part, k) {
        if (!part) return;
        if (k % 2) { var b = document.createElement("strong"); b.textContent = part; el.appendChild(b); }
        else el.appendChild(document.createTextNode(part.replace(/\*/g, "")));
      });
    });
  }

  function purityLabel(p) {
    var t = T();
    return p.metal === "silver" ? t.silver + " " + p.karat : t.gold + " " + p.karat;
  }

  function cardImage(p) {
    var known = (window.PRODUCTS || []).filter(function (x) { return x.id === p.id; })[0];
    if (known && known.image) return known.image;                                   // already resolved by the site
    if (window.CATALOG && window.CATALOG.photo && p.image) return window.CATALOG.photo(p.image).small;
    return "assets/img/logo.png";
  }

  function el(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }

  function buildCard(p) {
    var l = lang(), t = T();
    var card = el("article", "gc-card");
    var imgWrap = el("div", "gc-card-img");
    var img = document.createElement("img");
    img.alt = (p.name && (p.name[l] || p.name.ar)) || "";
    img.width = 78; img.height = 78; img.loading = "lazy"; img.decoding = "async"; img.referrerPolicy = "no-referrer";
    img.src = cardImage(p);
    if (/logo\.png$/.test(img.src)) img.className = "is-logo";
    img.onerror = function () { img.onerror = null; img.className = "is-logo"; img.src = "assets/img/logo.png"; };
    imgWrap.appendChild(img);

    var body = el("div", "gc-card-body");
    body.appendChild(el("h4", "gc-card-name", (p.name && (p.name[l] || p.name.ar)) || ""));
    var cat = p.category && (p.category[l] || p.category.ar);
    body.appendChild(el("div", "gc-card-meta", [cat, purityLabel(p), p.gms ? p.gms + " " + t.gram : ""].filter(Boolean).join(" · ")));
    body.appendChild(el("div", "gc-card-price" + (p.price == null ? " is-na" : ""), p.price == null ? t.priceNA : money(p.price)));

    var actions = el("div", "gc-card-actions");
    var view = el("a", "gc-btn", t.view);
    view.href = "products.html?p=" + encodeURIComponent(p.id);
    view.addEventListener("click", function (e) {
      var target = document.querySelector('[data-product="' + (window.CSS && CSS.escape ? CSS.escape(p.id) : p.id) + '"]');
      if (target) {                                    // already on the products page → just jump to it
        e.preventDefault(); close(); pin(target);
      }                                                // otherwise: normal link to products.html?p=ID
    });
    actions.appendChild(view);

    if (window.CART && p.price != null) {
      var add = el("button", "gc-btn gc-btn--solid", t.add);
      add.type = "button";
      add.addEventListener("click", function () {
        window.CART.addToCart(p.id, 1);
        add.textContent = TXT[lang()].added; add.disabled = true;
        setTimeout(function () { add.textContent = TXT[lang()].add; add.disabled = false; }, 1200);
      });
      actions.appendChild(add);
    }
    body.appendChild(actions);
    card.appendChild(imgWrap); card.appendChild(body);
    return card;
  }

  function pin(target) {
    target.classList.add("is-pinned");
    target.scrollIntoView({ block: "center", behavior: "smooth" });
    setTimeout(function () { target.classList.remove("is-pinned"); }, 6000);
  }

  function addMessage(m, animate) {
    var wrap = el("div", "gc-msg gc-msg--" + (m.role === "user" ? "user" : "bot") + (m.err ? " gc-msg--err" : ""));
    if (animate === false) wrap.style.animation = "none";
    var bubble = el("div", "gc-bubble");
    bubble.setAttribute("dir", "auto");
    renderText(bubble, m.text);
    wrap.appendChild(bubble);

    if (m.products && m.products.length) {
      var cards = el("div", "gc-cards");
      m.products.slice(0, 3).forEach(function (p) { cards.appendChild(buildCard(p)); });
      wrap.appendChild(cards);
    }
    if (m.wa) {
      var a = el("a", "gc-btn gc-btn--solid gc-wa-btn", T().wa);
      a.href = waHref(); a.target = "_blank"; a.rel = "noopener";
      wrap.appendChild(a);
    }
    logEl.appendChild(wrap);
    return wrap;
  }

  function scrollDown() { logEl.scrollTop = logEl.scrollHeight; }

  function showTyping() {
    var wrap = el("div", "gc-msg gc-msg--bot gc-typing-wrap");
    var b = el("div", "gc-bubble gc-typing");
    b.setAttribute("role", "status"); b.setAttribute("aria-label", T().typing);
    b.innerHTML = "<i></i><i></i><i></i>";
    wrap.appendChild(b); logEl.appendChild(wrap); scrollDown();
    return wrap;
  }

  /* ------------------------------------------------------------------ static labels (re-applied on language change) */
  function applyLabels() {
    var t = T();
    fab.setAttribute("aria-label", isOpen ? t.close : t.open);
    panel.setAttribute("aria-label", t.title);
    $(".gc-title").textContent = t.title;
    $(".gc-sub").textContent = t.sub;
    closeBtn.setAttribute("aria-label", t.close);
    waHead.setAttribute("aria-label", t.wa); waHead.setAttribute("title", t.wa); waHead.href = waHref();
    input.setAttribute("placeholder", t.placeholder);
    inputLabel.textContent = t.placeholder;
    sendBtn.setAttribute("aria-label", t.send);
    $(".gc-note").textContent = t.note;
  }

  function renderChips() {
    chipsEl.textContent = "";
    if (state.msgs.some(function (m) { return m.role === "user"; })) return;      // only in the empty state
    T().chips.forEach(function (c) {
      var b = el("button", "gc-chip", c); b.type = "button";
      b.addEventListener("click", function () { send(c); });
      chipsEl.appendChild(b);
    });
  }

  function renderAll() {
    logEl.textContent = "";
    addMessage({ role: "bot", text: T().welcome }, false);
    state.msgs.forEach(function (m) { addMessage(m, false); });
    renderChips();
    scrollDown();
  }

  /* ------------------------------------------------------------------ open / close */
  var coarse = window.matchMedia && window.matchMedia("(pointer:coarse)").matches;
  var phone = function () { return window.matchMedia && window.matchMedia("(max-width:640px)").matches; };

  function fit() {                                   // keep the panel above the on-screen keyboard (phones)
    var vv = window.visualViewport;
    if (!vv || !phone()) { panel.style.removeProperty("--gc-vh"); panel.style.removeProperty("--gc-top"); return; }
    panel.style.setProperty("--gc-vh", vv.height + "px");
    panel.style.setProperty("--gc-top", vv.offsetTop + "px");
    if (document.activeElement === input) scrollDown();
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    panel.inert = false;
    panel.classList.add("is-open");
    fab.setAttribute("aria-expanded", "true");
    fab.setAttribute("aria-label", T().close);
    if (phone()) document.documentElement.classList.add("gc-lock");
    fit(); scrollDown();
    if (!coarse) setTimeout(function () { input.focus(); }, 60);      // don't pop the keyboard open on phones
  }
  function close() {
    if (!isOpen) return;
    isOpen = false;
    panel.classList.remove("is-open");
    panel.inert = true;
    fab.setAttribute("aria-expanded", "false");
    fab.setAttribute("aria-label", T().open);
    document.documentElement.classList.remove("gc-lock");
    if (panel.contains(document.activeElement)) fab.focus();
  }

  fab.addEventListener("click", function () { isOpen ? close() : open(); });
  closeBtn.addEventListener("click", close);
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && isOpen) close(); });
  document.addEventListener("click", function (e) {                      // any element with data-open-chat opens it
    if (e.target.closest && e.target.closest("[data-open-chat]")) { e.preventDefault(); open(); }
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", function () { if (isOpen) fit(); });
    window.visualViewport.addEventListener("scroll", function () { if (isOpen) fit(); });
  }
  window.addEventListener("resize", function () {
    if (!phone()) document.documentElement.classList.remove("gc-lock");
    else if (isOpen) document.documentElement.classList.add("gc-lock");
    if (isOpen) fit();
  });

  /* ------------------------------------------------------------------ composer */
  function grow() { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 120) + "px"; }
  input.addEventListener("input", function () { grow(); });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); form.requestSubmit ? form.requestSubmit() : send(input.value); }
  });
  form.addEventListener("submit", function (e) { e.preventDefault(); send(input.value); });

  function setBusy(v) {
    busy = v; sendBtn.disabled = v;
    logEl.setAttribute("aria-busy", v ? "true" : "false");
  }

  function pushBot(m) { state.msgs.push(m); persist(); var node = addMessage(m); scrollDown(); return node; }

  function send(raw) {
    var text = String(raw || "").replace(/\s+/g, " ").trim();
    if (!text || busy) return;
    if (text.length > MAX_LEN) { pushBot({ role: "bot", text: T().tooLong, err: true }); return; }
    var now = Date.now();
    if (now - lastSent < MIN_GAP_MS) return;
    lastSent = now;

    // context for the backend: last few real turns + the products the customer was just shown
    var turns = state.msgs.filter(function (m) { return !m.err; }).slice(-HISTORY_TURNS)
      .map(function (m) { return { role: m.role === "user" ? "user" : "assistant", text: String(m.text).slice(0, 600) }; });
    var lastBot = null;
    for (var i = state.msgs.length - 1; i >= 0; i--) { if (state.msgs[i].role === "bot" && !state.msgs[i].err) { lastBot = state.msgs[i]; break; } }
    var ids = (lastBot && lastBot.products || []).map(function (p) { return p.id; }).slice(0, 6);

    state.msgs.push({ role: "user", text: text }); persist();
    addMessage({ role: "user", text: text });
    input.value = ""; grow(); chipsEl.textContent = "";
    setBusy(true);
    var typing = showTyping();

    var ctrl = window.AbortController ? new AbortController() : null;
    var timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, TIMEOUT_MS);

    fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text, history: turns, context_ids: ids, lang: lang() }),
      signal: ctrl ? ctrl.signal : undefined
    })
      .then(function (r) { return r.json().catch(function () { return null; }).then(function (j) { return { status: r.status, json: j }; }); })
      .then(function (res) {
        typing.remove();
        var j = res.json;
        if (j && j.ok && j.reply) pushBot({ role: "bot", text: j.reply, products: Array.isArray(j.products) ? j.products.slice(0, 3) : [] });
        else pushBot({ role: "bot", text: (j && j.message) || T().errNet, err: true, wa: !j || j.whatsapp !== false });
      })
      .catch(function () {
        typing.remove();
        pushBot({ role: "bot", text: T().errNet, err: true, wa: true });
      })
      .then(function () {
        clearTimeout(timer); setBusy(false);
        if (isOpen && !coarse) input.focus();
      });
  }

  /* ------------------------------------------------------------------ boot */
  function mount() {
    document.body.appendChild(root);
    applyLabels(); renderAll();
    document.addEventListener("langchange", function () {
      applyLabels();
      if (!state.msgs.some(function (m) { return m.role === "user"; })) renderAll();   // refresh welcome + chips only in the empty state
      else renderChips();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();

  window.GAH_CHAT = { open: open, close: close };
})();
