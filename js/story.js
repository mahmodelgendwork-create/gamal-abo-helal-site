/**
 * STORY SCROLL — canvas sprite-sheet scrubber.
 *
 * Why not just seek a <video>? Seeking video.currentTime is not instant:
 * browsers can only jump cleanly to keyframes (roughly every 1-2 seconds)
 * and have to decode forward from there, which is exactly the "lag" you
 * feel when scrubbing a real video file on scroll.
 *
 * Instead, the hero clip is pre-sliced into still frames laid out on one
 * sprite sheet image (assets/img/story-sprite.jpg — 192 frames, 16 columns
 * x 12 rows, generated with ffmpeg). Scrolling just picks a frame index and
 * draws that cell onto a canvas — a plain image draw, so it's exactly as
 * fast at any scroll speed, with zero decode/seek latency.
 */
(function () {
  const SPRITE_URL = "assets/img/story-sprite.jpg";
  const COLS = 16;
  const ROWS = 12;
  const TOTAL_FRAMES = COLS * ROWS; // 192
  const FRAME_W = 190;
  const FRAME_H = 338;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", () => {
    const story = document.querySelector("[data-story]");
    const canvas = document.querySelector("[data-story-canvas]");
    if (!story || !canvas) return;

    const wrap = canvas.closest(".story-video-wrap");
    const ctx = canvas.getContext("2d");
    const panels = Array.from(story.querySelectorAll(".story-panel"));
    const progressEls = Array.from(story.querySelectorAll(".story-progress span"));

    let ready = false;
    let currentFrame = -1;
    let pendingProgress = 0;

    const sprite = new Image();
    sprite.src = SPRITE_URL;

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
        pendingProgress = frameIndex;
        return;
      }
      if (frameIndex === currentFrame && !force) return;
      currentFrame = frameIndex;

      const col = frameIndex % COLS;
      const row = Math.floor(frameIndex / COLS);
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
      ctx.drawImage(sprite, sx, sy, FRAME_W, FRAME_H, dx, dy, drawW, drawH);
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

    sprite.onload = () => {
      ready = true;
      resizeCanvas();
      drawFrame(Math.round(pendingProgress * (TOTAL_FRAMES - 1)) || 0, true);
    };

    if (reduceMotion) {
      resizeCanvas();
      sprite.onload = () => {
        ready = true;
        resizeCanvas();
        drawFrame(Math.round((TOTAL_FRAMES - 1) * 0.5), true);
      };
      panels.forEach((p) => p.classList.add("is-active"));
      window.addEventListener("resize", resizeCanvas);
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
