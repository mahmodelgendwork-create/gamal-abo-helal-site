/**
 * FX — small, cheap visual extras (no libraries).
 * header glass-on-scroll · scroll reveals · gold sparkles · live gram-price band · lazy background video
 * Everything here is skipped/softened for "reduce motion" and data-saver visitors.
 */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var conn = navigator.connection || {};
  var saver = !!conn.saveData || /(^|-)2g$/.test(conn.effectiveType || "");
  var lowPower = (navigator.hardwareConcurrency || 8) < 4;

  /* ---------- header turns to glass after a little scrolling ---------- */
  function headerState() {
    var h = document.querySelector(".topbar");
    if (!h) return;
    var on = function () { h.classList.toggle("is-scrolled", window.scrollY > 40); };
    on(); window.addEventListener("scroll", on, { passive: true });
  }

  /* ---------- reveal on scroll ---------- */
  function reveals() {
    var els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    if (reduce || !("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("is-in"); }); return; }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    els.forEach(function (e, i) { e.style.setProperty("--d", (i % 3) * 90 + "ms"); io.observe(e); });
  }

  /* ---------- a few drifting gold sparkles over the hero ---------- */
  function sparkles() {
    var box = document.querySelector("[data-sparkles]");
    if (!box || reduce || saver || lowPower) return;
    var n = window.innerWidth < 700 ? 8 : 14, frag = document.createDocumentFragment();
    for (var i = 0; i < n; i++) {
      var s = document.createElement("i");
      s.style.cssText = "left:" + (Math.random() * 100).toFixed(1) + "%;top:" + (Math.random() * 100).toFixed(1) +
        "%;--s:" + (0.5 + Math.random() * 0.9).toFixed(2) + ";animation-delay:" + (-Math.random() * 9).toFixed(1) +
        "s;animation-duration:" + (6 + Math.random() * 6).toFixed(1) + "s";
      frag.appendChild(s);
    }
    box.appendChild(frag);
  }

  /* ---------- live gram-price band ---------- */
  function lang() { return (window.I18N && window.I18N.currentLang()) || "ar"; }
  function rateBand() {
    var band = document.getElementById("rate-band"), mount = document.getElementById("rate-items");
    if (!band || !mount) return;
    function paint() {
      var p = window.CATALOG && window.CATALOG.prices;
      if (!p) return;
      var l = lang(), d = window.I18N.dict[l].home, cur = (window.SITE_CONFIG.currency || {})[l] || "";
      var nf = function (n) { return Math.round(n).toLocaleString(l === "ar" ? "ar-EG" : "en-US"); };
      var items = [[24, p.gold && p.gold[24], d.rateGold], [21, p.gold && p.gold[21], d.rateGold], [18, p.gold && p.gold[18], d.rateGold], [925, p.silver && p.silver[925], d.rateSilver]]
        .filter(function (x) { return x[1] > 0; });
      if (!items.length) return;
      mount.innerHTML = items.map(function (x) {
        return '<div class="rate-chip"><span>' + x[2] + " " + x[0] + '</span><b>' + nf(x[1]) + "</b><em>" + cur + "</em></div>";
      }).join("");
      band.hidden = false;
    }
    document.addEventListener("catalogready", paint);
    document.addEventListener("langchange", paint);
    paint();
  }

  /* ---------- background video: load late, only when it is polite to ---------- */
  function lazyVideo() {
    var v = document.querySelector("video[data-lazy-video]");
    if (!v || reduce || saver) return;
    var go = function () {
      v.addEventListener("error", function () { v.style.display = "none"; }, true);   // missing file → silently no video
      var rate = parseFloat(v.getAttribute("data-rate")) || 1;
      var src = document.createElement("source");
      src.src = v.getAttribute("data-lazy-video"); src.type = "video/mp4";
      v.appendChild(src);
      v.defaultPlaybackRate = rate; v.load();
      v.addEventListener("loadeddata", function () {
        v.playbackRate = rate;
        var p = v.play(); if (p && p.catch) p.catch(function () {});
        v.classList.add("is-on");
      }, { once: true });
    };
    var idle = window.requestIdleCallback || function (f) { return setTimeout(f, 600); };
    if (document.readyState === "complete") idle(go); else window.addEventListener("load", function () { idle(go); });
  }

  document.addEventListener("DOMContentLoaded", function () {
    headerState(); reveals(); sparkles(); rateBand(); lazyVideo();
  });
})();
