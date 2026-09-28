/**
 * STORY SCROLL — canvas sprite-sheet scrubber.
 *
 * The hero clip is pre-sliced into 96 still frames (540x960) packed into four
 * WebP sprite sheets (24 frames each, 6x4 grid). Scrolling picks a frame index
 * and draws that cell on a canvas — a plain image draw, so there is no video
 * seek/decode lag at any scroll speed.
 *
 * Sharpness: the source clip is portrait (9:16). On phones the frame fills the
 * screen ("cover"). On wide screens stretching it to fill the width would blur
 * it ~3x, so instead it is drawn at its natural portrait size, centered, with a
 * feathered edge over a blurred, darkened copy of the same frame.
 */
(function () {
  const SHEET_URLS = [
    "assets/img/story-sprite-1.webp",
    "assets/img/story-sprite-2.webp",
    "assets/img/story-sprite-3.webp",
    "assets/img/story-sprite-4.webp"
  ];
  const COLS = 6;
  const ROWS = 4;
  const FRAMES_PER_SHEET = COLS * ROWS; // 24
  const TOTAL_FRAMES = FRAMES_PER_SHEET * SHEET_URLS.length; // 96
  const FRAME_W = 540;
  const FRAME_H = 960;
  // Crop the generator's watermark strips (top badge / bottom-right logo).
  const CROP_TOP = 40;
  const CROP_BOTTOM = 50;
  const SRC_H = FRAME_H - CROP_TOP - CROP_BOTTOM; // 870
  const CONTAIN_ABOVE_ASPECT = 0.9; // canvas w/h above this => show at natural size

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", () => {
    const story = document.querySelector("[data-story]");
    const canvas = document.querySelector("[data-story-canvas]");
    const backdrop = document.querySelector("[data-story-backdrop]");
    if (!story || !canvas) return;

    const wrap = canvas.closest(".story-video-wrap");
    const ctx = canvas.getContext("2d");
    const bctx = backdrop ? backdrop.getContext("2d") : null;
    const panels = Array.from(story.querySelectorAll(".story-panel"));
    const progressEls = Array.from(story.querySelectorAll(".story-progress span"));

    let loadedCount = 0;
    let ready = false;
    let currentFrame = -1;
    let pendingFrame = 0;

    const sheets = SHEET_URLS.map((url) => {
      const img = new Image();
      img.onload = onSheetLoaded;
      img.src = url;
      return img;
    });

    function onSheetLoaded() {
      loadedCount++;
      if (loadedCount === sheets.length) {
        ready = true;
        resizeCanvas();
        drawFrame(pendingFrame, true);
      }
    }

    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      if (backdrop) {
        backdrop.width = 96;
        backdrop.height = Math.max(32, Math.round((96 * h) / w));
      }
      if (ready) drawFrame(currentFrame === -1 ? 0 : currentFrame, true);
    }

    function drawFrame(frameIndex, force) {
      if (!ready) {
        pendingFrame = frameIndex;
        return;
      }
      if (frameIndex === currentFrame && !force) return;
      currentFrame = frameIndex;

      const sheetIndex = Math.min(sheets.length - 1, Math.floor(frameIndex / FRAMES_PER_SHEET));
      const local = frameIndex - sheetIndex * FRAMES_PER_SHEET;
      const sx = (local % COLS) * FRAME_W;
      const sy = Math.floor(local / COLS) * FRAME_H + CROP_TOP;
      const sheet = sheets[sheetIndex];

      const cw = canvas.width;
      const ch = canvas.height;
      const contain = cw / ch > CONTAIN_ABOVE_ASPECT;
      const scale = contain ? ch / SRC_H : Math.max(cw / FRAME_W, ch / SRC_H);
      const drawW = FRAME_W * scale;
      const drawH = SRC_H * scale;
      const dx = (cw - drawW) / 2;
      const dy = (ch - drawH) / 2;

      ctx.clearRect(0, 0, cw, ch);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(sheet, sx, sy, FRAME_W, SRC_H, dx, dy, drawW, drawH);

      if (contain) {
        // Feather the left/right edges of the portrait frame into the backdrop.
        const g = ctx.createLinearGradient(dx, 0, dx + drawW, 0);
        g.addColorStop(0, "rgba(0,0,0,0)");
        g.addColorStop(0.07, "rgba(0,0,0,1)");
        g.addColorStop(0.93, "rgba(0,0,0,1)");
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx.globalCompositeOperation = "destination-in";
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, cw, ch);
        ctx.globalCompositeOperation = "source-over";
      }

      if (backdrop && bctx) {
        backdrop.style.display = contain ? "block" : "none";
        if (contain) {
          // Stretch the whole frame across the backdrop: once blurred it becomes a
          // smooth ambient colour wash rather than a cropped, recognisable shape.
          bctx.drawImage(sheet, sx, sy, FRAME_W, SRC_H, 0, 0, backdrop.width, backdrop.height);
        }
      }
    }

    function setActiveAct(progress) {
      const actIndex = Math.min(2, Math.floor(progress * 3));
      panels.forEach((p) => {
        p.classList.toggle("is-active", Number(p.getAttribute("data-act")) === actIndex);
      });
      progressEls.forEach((el, i) => {
        el.style.setProperty("--fill", Math.max(0, Math.min(1, progress * 3 - i)) * 100 + "%");
      });
    }

    if (reduceMotion) {
      resizeCanvas();
      panels.forEach((p) => p.classList.add("is-active"));
      window.addEventListener("resize", resizeCanvas);
      pendingFrame = Math.round((TOTAL_FRAMES - 1) * 0.5);
      return;
    }

    let ticking = false;
    let lastProgress = -1;

    function update() {
      ticking = false;
      const rect = story.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      let progress = scrollable > 0 ? -rect.top / scrollable : 0;
      progress = Math.max(0, Math.min(1, progress));

      if (Math.abs(progress - lastProgress) < 0.0009) return;
      lastProgress = progress;

      drawFrame(Math.round(progress * (TOTAL_FRAMES - 1)));
      setActiveAct(progress);
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    resizeCanvas();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", () => {
      resizeCanvas();
      onScroll();
    });
    update();
  });
})();
