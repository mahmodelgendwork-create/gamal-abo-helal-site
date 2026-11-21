/* Admin dashboard logic. No password is ever stored: login returns a short-lived session token
   (kept only in this tab's sessionStorage) and every action sends that token. */
(function () {
  "use strict";
  var C = window.SITE_CONFIG || {};
  var $ = function (id) { return document.getElementById(id); };
  var TOKEN_KEY = "gah_adm_t", EXP_KEY = "gah_adm_e", IDLE_MS = 30 * 60 * 1000;
  var token = null, expAt = 0, lastAct = Date.now(), lockTimer = 0, sessTimer = 0;
  var prices = { gold: {}, silver: {}, updated: null }, make = { gold: 500, silver: 500 }, cats = [], products = [];
  var KARATS = { gold: [21, 18, 24], silver: [925, 999, 800] };

  var esc = function (s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); };
  var fmt = function (n) { return Number(n).toLocaleString("en-US", { maximumFractionDigits: 2 }); };
  var metalName = function (m) { return m === "silver" ? "فضة" : "ذهب"; };

  /* ---------------- API ---------------- */
  function hdr(extra) {
    var h = Object.assign({ apikey: C.supabaseAnonKey }, extra || {});
    if (/^eyJ/.test(C.supabaseAnonKey)) h.Authorization = "Bearer " + C.supabaseAnonKey;
    return h;
  }
  function rpc(fn, args) {
    return fetch(C.supabaseUrl + "/rest/v1/rpc/" + fn, { method: "POST", headers: hdr({ "Content-Type": "application/json" }), body: JSON.stringify(args || {}) })
      .then(function (r) {
        return r.text().then(function (t) {
          var j; try { j = JSON.parse(t); } catch (e) { j = t; }
          if (!r.ok) {
            var m = (j && j.message) || "HTTP " + r.status;
            if (/unauthorized/i.test(m)) { endSession("انتهت الجلسة، سجّل الدخول من جديد."); }
            throw new Error(m);
          }
          return j;
        });
      });
  }
  function rest(p) { return fetch(C.supabaseUrl + "/rest/v1/" + p, { headers: hdr() }).then(function (r) { if (!r.ok) throw new Error("HTTP " + r.status); return r.json(); }); }

  /* ---------------- helpers ---------------- */
  var toastT;
  function toast(text, bad) { var t = $("toast"); t.textContent = text; t.className = "toast show" + (bad ? " err" : ""); clearTimeout(toastT); toastT = setTimeout(function () { t.className = "toast"; }, 3200); }
  function say(id, text, cls) { var e = $(id); e.textContent = text || ""; e.className = "msg " + (cls || ""); }
  function driveId(l) { var m = l.match(/\/d\/([\w-]{10,})/) || l.match(/[?&]id=([\w-]{10,})/); return m && /drive\.google\.com|docs\.google\.com/.test(l) ? m[1] : null; }
  function thumb(l) { var id = driveId(l); if (id) return "https://drive.google.com/thumbnail?id=" + id + "&sz=w160"; return /^https?:\/\//i.test(l) ? l : "../products/" + l; }
  function priceOf(metal, purity, gms) {
    var m = metal === "silver" ? "silver" : "gold", pg = (m === "silver" ? prices.silver : prices.gold)[purity], mk = Number(make[m]);
    return pg > 0 && gms > 0 ? Math.round(gms * pg + gms * (mk >= 0 ? mk : 0)) : null;
  }

  /* ---------------- login / session ---------------- */
  function showLogin(msg, cls) {
    $("app").classList.add("hidden"); $("login").classList.remove("hidden");
    $("lg-pass").value = ""; say("lg-msg", msg, cls || "err");
  }
  function endSession(msg) {
    var t = token; token = null; clearInterval(sessTimer);
    try { sessionStorage.removeItem(TOKEN_KEY); sessionStorage.removeItem(EXP_KEY); } catch (e) {}
    if (t) fetch(C.supabaseUrl + "/rest/v1/rpc/admin_logout", { method: "POST", headers: hdr({ "Content-Type": "application/json" }), body: JSON.stringify({ p_token: t }) }).catch(function () {});
    showLogin(msg || "", "err");
  }
  function startSession(t, expiresIn) {
    token = t; expAt = Date.now() + expiresIn * 1000; lastAct = Date.now();
    try { sessionStorage.setItem(TOKEN_KEY, t); sessionStorage.setItem(EXP_KEY, String(expAt)); } catch (e) {}
    $("login").classList.add("hidden"); $("app").classList.remove("hidden");
    clearInterval(sessTimer);
    sessTimer = setInterval(function () {
      var left = expAt - Date.now();
      if (left <= 0) return endSession("انتهت الجلسة، سجّل الدخول من جديد.");
      if (Date.now() - lastAct > IDLE_MS) return endSession("تم تسجيل الخروج لعدم النشاط.");
      var m = Math.floor(left / 60000); $("session-left").textContent = "الجلسة: " + m + " د";
    }, 15000);
    $("session-left").textContent = "الجلسة: " + Math.floor(expiresIn / 60) + " د";
    return boot();
  }
  ["click", "keydown", "input", "touchstart"].forEach(function (ev) { document.addEventListener(ev, function () { lastAct = Date.now(); }, { passive: true }); });

  function countdown(sec) {
    clearInterval(lockTimer); var end = Date.now() + sec * 1000, btn = $("lg-btn");
    btn.disabled = true;
    var tick = function () {
      var left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      if (!left) { clearInterval(lockTimer); btn.disabled = false; say("lg-msg", "", ""); return; }
      var mm = String(Math.floor(left / 60)).padStart(2, "0"), ss = String(left % 60).padStart(2, "0");
      say("lg-msg", "تم إيقاف الدخول مؤقتًا بسبب محاولات خاطئة. حاول بعد " + mm + ":" + ss, "err");
    };
    tick(); lockTimer = setInterval(tick, 1000);
  }
  $("login-form").addEventListener("submit", function (e) {
    e.preventDefault();
    var name = $("lg-name").value.trim(), pass = $("lg-pass").value;
    if (!name || !pass) return say("lg-msg", "اكتب اسم المستخدم وكلمة المرور", "err");
    if (!C.supabaseUrl || /PASTE_/.test(C.supabaseUrl)) return say("lg-msg", "إعدادات Supabase ناقصة في js/config.js", "err");
    $("lg-btn").disabled = true; say("lg-msg", "جارٍ التحقق…", "");
    rpc("admin_login", { p_name: name, p_password: pass }).then(function (r) {
      if (r && r.ok) return startSession(r.token, r.expires_in || 7200);
      $("lg-pass").value = "";
      if (r && r.locked) return countdown(r.retry_after || 1800);
      var left = r && typeof r.remaining === "number" ? r.remaining : null;
      say("lg-msg", "بيانات غير صحيحة." + (left != null ? " متبقي " + left + " محاولات قبل الإيقاف ٣٠ دقيقة." : ""), "err");
      $("lg-btn").disabled = false;
    }).catch(function () { say("lg-msg", "تعذّر الاتصال. جرّب مرة أخرى.", "err"); $("lg-btn").disabled = false; });
  });
  $("lg-eye").onclick = function () { var p = $("lg-pass"); p.type = p.type === "password" ? "text" : "password"; };
  $("logout").onclick = function () { endSession("تم تسجيل الخروج."); };

  /* ---------------- tabs ---------------- */
  document.querySelectorAll(".tab").forEach(function (b) {
    b.onclick = function () {
      document.querySelectorAll(".tab").forEach(function (x) { x.classList.toggle("is-active", x === b); });
      ["products", "pricing"].forEach(function (k) { $("tab-" + k).classList.toggle("hidden", k !== b.dataset.tab); });
    };
  });

  /* ---------------- data ---------------- */
  function boot() {
    return Promise.all([
      rest("categories?select=slug,name_ar&order=sort_order"),
      rest("gold_prices?select=karat,price_per_gram,updated_at,source"),
      rest("site_settings?select=*&id=eq.1")
    ]).then(function (res) {
      cats = res[0];
      $("f-cat").innerHTML = cats.map(function (c) { return '<option value="' + esc(c.slug) + '">' + esc(c.name_ar) + "</option>"; }).join("");
      var newest = 0; prices = { gold: {}, silver: {} };
      res[1].forEach(function (r) { var k = +r.karat, v = +r.price_per_gram; if (v > 0) { ([24, 21, 18].indexOf(k) > -1 ? prices.gold : prices.silver)[k] = v; newest = Math.max(newest, Date.parse(r.updated_at) || 0); } });
      prices.updated = newest;
      if (res[2][0]) { make.gold = +res[2][0].workmanship_gold; make.silver = +res[2][0].workmanship_silver; }
      $("s-gold").value = make.gold; $("s-silver").value = make.silver;
      paintRates(); paintSample(); fillKarats(); updatePrice();
      return loadProducts();
    }).catch(function (e) { toast("تعذّر تحميل البيانات: " + e.message, true); });
  }
  function paintRates() {
    var box = function (label, v) { return '<div class="rate"><small>' + label + "</small><b>" + (v ? fmt(v) : "—") + "</b></div>"; };
    $("gold").innerHTML = [24, 21, 18].map(function (k) { return box("عيار " + k, prices.gold[k]); }).join("");
    $("silver").innerHTML = [999, 925, 800].map(function (k) { return box("عيار " + k, prices.silver[k]); }).join("");
    $("gold-meta").textContent = prices.updated ? "آخر تحديث تلقائي: " + new Date(prices.updated).toLocaleString("ar-EG") + " — بيتحدّث كل ٣٠ دقيقة." : "لا توجد أسعار في قاعدة البيانات بعد (الموقع بيستخدم السعر الحي مؤقتًا).";
  }
  function paintSample() {
    var g = +$("s-gold").value, p = g >= 0 && prices.gold[21] ? Math.round(5 * prices.gold[21] + 5 * g) : null;
    $("s-sample").textContent = p == null ? "—" : "مثال: خاتم ذهب عيار ٢١ وزنه ٥ جرام = " + fmt(p) + " ج.م";
  }
  ["s-gold", "s-silver"].forEach(function (id) { $(id).oninput = paintSample; });
  $("s-save").onclick = function () {
    var g = +$("s-gold").value, s = +$("s-silver").value;
    if (!(g >= 0 && g <= 100000) || !(s >= 0 && s <= 100000) || $("s-gold").value === "" || $("s-silver").value === "") return toast("اكتب أرقام صحيحة (من 0 إلى 100000)", true);
    $("s-save").disabled = true;
    rpc("admin_set_settings", { p_token: token, p_gold: g, p_silver: s }).then(function (r) {
      make.gold = +r.workmanship_gold; make.silver = +r.workmanship_silver;
      toast("تم حفظ المصنعية ✓"); updatePrice(); return loadProducts();
    }).catch(function (e) { toast(e.message, true); }).then(function () { $("s-save").disabled = false; });
  };

  /* ---------------- product form ---------------- */
  function fillKarats(sel) {
    var m = $("f-metal").value;
    $("f-karat-label").textContent = m === "silver" ? "عيار الفضة" : "عيار الذهب";
    $("f-karat").innerHTML = KARATS[m].map(function (k) { return '<option value="' + k + '">' + k + "</option>"; }).join("");
    if (sel) $("f-karat").value = sel;
  }
  var links = function () { return $("f-imgs").value.split(/[\s|]+/).map(function (x) { return x.trim(); }).filter(Boolean); };
  function paintThumbs() {
    $("f-prevs").innerHTML = links().map(function (l, i) {
      return '<div class="th">' + (i === 0 ? "<i>رئيسية</i>" : "") + '<img data-th src="' + esc(thumb(l)) + '" alt="" referrerpolicy="no-referrer"></div>';
    }).join("");
  }
  document.addEventListener("error", function (e) {
    var t = e.target; if (t && t.tagName === "IMG" && t.hasAttribute("data-th")) { var d = document.createElement("div"); d.className = "bad"; d.textContent = "الصورة لا تظهر — تأكد من المشاركة"; t.replaceWith(d); }
    else if (t && t.tagName === "IMG" && t.hasAttribute("data-li")) t.style.visibility = "hidden";
  }, true);
  function updatePrice() { var p = priceOf($("f-metal").value, +$("f-karat").value, +$("f-gms").value); $("f-price").textContent = p == null ? "—" : fmt(p) + " ج.م"; paintThumbs(); }
  ["f-karat", "f-gms"].forEach(function (id) { $(id).oninput = updatePrice; });
  $("f-metal").onchange = function () { fillKarats(); updatePrice(); };
  var tmr; $("f-imgs").oninput = function () { clearTimeout(tmr); tmr = setTimeout(paintThumbs, 400); };

  function resetForm() {
    $("f-id").value = ""; $("form-title").textContent = "إضافة منتج";
    ["f-name-ar", "f-name-en", "f-desc-ar", "f-desc-en", "f-gms", "f-imgs"].forEach(function (id) { $(id).value = ""; });
    $("f-metal").value = "gold"; fillKarats(); $("f-active").checked = true; updatePrice();
  }
  $("f-reset").onclick = resetForm;
  $("f-save").onclick = function () {
    var nameAr = $("f-name-ar").value.trim(), gms = +$("f-gms").value;
    if (!nameAr) return toast("الاسم العربي مطلوب", true);
    if (!(gms > 0)) return toast("اكتب الوزن بالجرام", true);
    $("f-save").disabled = true;
    rpc("admin_save_product", { p_token: token, p: {
      id: $("f-id").value || null, category: $("f-cat").value, metal: $("f-metal").value, karat: +$("f-karat").value, gms: gms,
      name_ar: nameAr, name_en: $("f-name-en").value.trim(), desc_ar: $("f-desc-ar").value.trim(), desc_en: $("f-desc-en").value.trim(),
      images: links(), active: $("f-active").checked } })
      .then(function () { toast("تم حفظ المنتج ✓"); resetForm(); return loadProducts(); })
      .catch(function (e) { toast(/invalid image/.test(e.message) ? "رابط صورة غير صالح" : e.message, true); })
      .then(function () { $("f-save").disabled = false; });
  };

  /* ---------------- product list ---------------- */
  function loadProducts() {
    return rpc("admin_list_products", { p_token: token }).then(function (rows) { products = rows || []; paintList(); }).catch(function (e) { toast(e.message, true); });
  }
  function paintList() {
    var q = $("q").value.trim().toLowerCase(), catName = {};
    cats.forEach(function (c) { catName[c.slug] = c.name_ar; });
    var list = products.filter(function (p) { return !q || (p.name_ar + " " + (p.name_en || "")).toLowerCase().indexOf(q) > -1; });
    $("count").textContent = products.length;
    $("list").innerHTML = list.map(function (p) {
      var cover = (Array.isArray(p.images) && p.images[0]) || p.image_url || "", v = priceOf(p.metal, +p.karat, +p.gms);
      return '<div class="item"><img data-li src="' + esc(thumb(cover)) + '" alt="" referrerpolicy="no-referrer">' +
        '<div class="info"><div class="t">' + esc(p.name_ar) + (p.active ? "" : '<span class="tag off">مخفي</span>') + (Array.isArray(p.images) && p.images.length > 1 ? '<span class="tag">' + p.images.length + " صور</span>" : "") + "</div>" +
        '<div class="m">' + esc(catName[p.category] || p.category) + " · " + metalName(p.metal) + " عيار " + esc(p.karat) + " · " + fmt(p.gms) + " جم · <b>" + (v == null ? "—" : fmt(v) + " ج.م") + "</b></div></div>" +
        '<div class="btns"><button class="btn btn--ghost btn--sm" data-edit="' + esc(p.id) + '">تعديل</button><button class="btn btn--danger btn--sm" data-del="' + esc(p.id) + '">حذف</button></div></div>';
    }).join("") || '<p class="muted">لا توجد منتجات.</p>';
  }
  $("q").oninput = paintList;
  $("list").onclick = function (e) {
    var b = e.target.closest("button"); if (!b) return;
    var ed = b.dataset.edit, del = b.dataset.del;
    if (ed) {
      var p = products.filter(function (x) { return x.id === ed; })[0]; if (!p) return;
      $("f-id").value = p.id; $("form-title").textContent = "تعديل منتج";
      $("f-cat").value = p.category; $("f-metal").value = p.metal === "silver" ? "silver" : "gold"; fillKarats(p.karat);
      $("f-name-ar").value = p.name_ar; $("f-name-en").value = p.name_en; $("f-desc-ar").value = p.desc_ar; $("f-desc-en").value = p.desc_en; $("f-gms").value = p.gms;
      $("f-imgs").value = (Array.isArray(p.images) && p.images.length ? p.images : p.image_url ? [p.image_url] : []).join("\n");
      $("f-active").checked = !!p.active; updatePrice(); $("form-card").scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (del && confirm("حذف هذا المنتج نهائيًا؟")) {
      rpc("admin_delete_product", { p_token: token, p_id: del }).then(function () { toast("تم الحذف"); return loadProducts(); }).catch(function (er) { toast(er.message, true); });
    }
  };

  /* ---------------- resume a session in this tab ---------------- */
  (function resume() {
    var t, e; try { t = sessionStorage.getItem(TOKEN_KEY); e = +sessionStorage.getItem(EXP_KEY); } catch (x) {}
    if (!t || !(e > Date.now())) return;
    rpc("admin_check", { p_token: t }).then(function (ok) {
      if (ok === true) startSession(t, Math.floor((e - Date.now()) / 1000));
      else endSession("");
    }).catch(function () {});
  })();
})();
