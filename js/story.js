/**
 * STORY SCROLL — canvas sprite-sheet scrubber.
 *
 * Why not just seek a <video>? Seeking video.currentTime is not instant:
 * browsers can only jump cleanly to keyframes (roughly every 1-2 seconds)
 * and have to decode forward from there, which is exactly the "lag" you
 * feel when scrubbing a real video file on scroll.
 *
 * Instead, the hero clip is pre-sliced into still frames laid out across four
 * sprite sheet images (assets/img/story-sprite-1..4.jpg — 192 frames total,
 * 48 per sheet in an 8x6 grid, generated with ffmpeg + Pillow). Scrolling
 * just picks a frame index and draws that cell onto a canvas — a plain
 * image draw, so it's exactly as fast at any scroll speed, with zero
 * decode/seek latency.
 */
(function () {
  // 192 frames total, split across 4 sprite sheets (48 frames each, 8x6 grid)
  // so every sheet stays comfortably under GPU texture size limits while
  // each frame is rendered at 2x the resolution of a single giant sheet.
  const SHEET_URLS = [
    "assets/img/story-sprite-1.jpg",
    "assets/img/story-sprite-2.jpg",
    "assets/img/story-sprite-3.jpg",
    "assets/img/story-sprite-4.jpg"
  ];
  const COLS = 8;
  const ROWS = 6;
  const FRAMES_PER_SHEET = COLS * ROWS; // 48
  const TOTAL_FRAMES = FRAMES_PER_SHEET * SHEET_URLS.length; // 192
  const FRAME_W = 384;
  const FRAME_H = 682;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", () => {
    const story = document.querySelector("[data-story]");
    const canvas = document.querySelector("[data-story-canvas]");
    if (!story || !canvas) return;

    const wrap = canvas.closest(".story-video-wrap");
    const ctx = canvas.getContext("2d");
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
      const localIndex = frameIndex - sheetIndex * FRAMES_PER_SHEET;
      const col = localIndex % COLS;
      const row = Math.floor(localIndex / COLS);
      const sx = col * FRAME_W;
      const sy = row * FRAME_H;

      const cw = canvas.width;
      const ch = canvas.height;
      // "cover" fit: scale the source frame up so it fills the canvas
      // completely, cropping whichever axis overflows, centered.
      const scale = Math.max(cw / FRAME_W, ch / FRAME_H);
      const drawW = FRAME_W * scale;
      const drawH = FRAME_H * scale;
      const dx = (cw - drawW) / 2;
      const dy = (ch - drawH) / 2;

      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(sheets[sheetIndex], sx, sy, FRAME_W, FRAME_H, dx, dy, drawW, drawH);
    }

    function setActiveAct(progress) {
      const actIndex = Math.min(2, Math.floor(progress * 3));
      panels.forEach((p) => {
        const act = Number(p.getAttribute("data-act"));
        p.classList.toggle("is-active", act === actIndex);
      });
      progressEls.forEach((el, i) => {
        const local = Math.max(0, Math.min(1, progress * 3 - i)) * 100;
        el.style.setProperty("--fill", local + "%");
      });
    }

    if (reduceMotion) {
      resizeCanvas();
      panels.forEach((p) => p.classList.add("is-active"));
      window.addEventListener("resize", resizeCanvas);
      // Show a representative mid-clip frame once the sheets finish loading.
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

      const frameIndex = Math.round(progress * (TOTAL_FRAMES - 1));
      drawFrame(frameIndex);
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
