/**
 * STORY SCROLL — scrubs the hero video's currentTime to scroll position
 * across a tall .story section, and cross-fades three text panels that
 * correspond to roughly the first / middle / last third of the clip.
 */
(function () {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  document.addEventListener("DOMContentLoaded", () => {
    const story = document.querySelector("[data-story]");
    const video = document.querySelector("[data-story-video]");
    if (!story || !video) return;

    const panels = Array.from(story.querySelectorAll(".story-panel"));
    const progressEls = Array.from(story.querySelectorAll(".story-progress span"));

    if (reduceMotion) {
      video.autoplay = true;
      video.loop = true;
      video.play().catch(() => {});
      panels.forEach((p) => p.classList.add("is-active"));
      return;
    }

    let duration = 0;
    let ticking = false;
    let lastProgress = -1;

    video.addEventListener("loadedmetadata", () => {
      duration = video.duration || 0;
    });
    // In case metadata is already available (cached).
    if (video.readyState >= 1) duration = video.duration || 0;

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

    function update() {
      ticking = false;
      const rect = story.getBoundingClientRect();
      const scrollable = rect.height - window.innerHeight;
      let progress = scrollable > 0 ? -rect.top / scrollable : 0;
      progress = Math.max(0, Math.min(1, progress));

      if (Math.abs(progress - lastProgress) < 0.0009) return;
      lastProgress = progress;

      if (duration > 0) {
        const target = progress * duration;
        if (Math.abs(video.currentTime - target) > 0.03) {
          try {
            video.currentTime = target;
          } catch (e) {
            /* ignore seek errors before metadata is fully ready */
          }
        }
      }
      setActiveAct(progress);
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    // Some mobile browsers need an explicit play/pause to unlock seeking.
    video.play().then(() => video.pause()).catch(() => {});
    update();
  });
})();
