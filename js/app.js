const FRAME_COUNT = 73;
const FRAME_SPEED = 2.0;
// The badge is a wide horizontal lockup (~1.8:1, close to the viewport's own
// aspect ratio), so the usual 0.82-0.90 "padded cover" range for tall/narrow
// products would make it fill nearly the full width and height here, leaving
// no room for the top/bottom text bands. Scaled down well below that range
// so it reads as a centered emblem with real margins above and below.
const IMAGE_SCALE = 0.34;
const FRAME_PATH = (i) => `frames/frame_${String(i).padStart(4, "0")}.webp`;

const frames = new Array(FRAME_COUNT);
let currentFrame = 0;

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const canvasWrap = document.querySelector(".canvas-wrap");
const heroSection = document.querySelector(".hero-standalone");
const scrollContainer = document.getElementById("scroll-container");
const loader = document.getElementById("loader");
const loaderBarFill = document.getElementById("loader-bar-fill");
const loaderPercent = document.getElementById("loader-percent");

const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function resizeCanvas() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawFrame(currentFrame);
}

function drawFrame(index) {
  const img = frames[index];
  if (!img) return;
  const cw = window.innerWidth, ch = window.innerHeight;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  if (!iw || !ih) return;
  const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
  const dw = iw * scale, dh = ih * scale;
  const dx = (cw - dw) / 2, dy = (ch - dh) / 2;
  ctx.clearRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

function loadFrames() {
  return new Promise((resolve) => {
    let loaded = 0;
    const updateProgress = () => {
      loaded++;
      const pct = Math.round((loaded / FRAME_COUNT) * 100);
      loaderBarFill.style.width = pct + "%";
      loaderPercent.textContent = pct + "%";
      if (loaded >= FRAME_COUNT) resolve();
    };
    const loadOne = (i) => {
      const img = new Image();
      img.onload = updateProgress;
      img.onerror = updateProgress;
      img.src = FRAME_PATH(i);
      frames[i - 1] = img;
    };
    // First 10 immediately for fast first paint, then the rest.
    for (let i = 1; i <= Math.min(10, FRAME_COUNT); i++) loadOne(i);
    for (let i = 11; i <= FRAME_COUNT; i++) loadOne(i);
  });
}

function initHeroTransition() {
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      heroSection.style.opacity = Math.max(0, 1 - p * 15);
      heroSection.style.pointerEvents = p > 0.05 ? "none" : "auto";
    },
  });
}

function initFrameScrub() {
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      const accelerated = Math.min(self.progress * FRAME_SPEED, 1);
      const index = Math.min(Math.floor(accelerated * FRAME_COUNT), FRAME_COUNT - 1);
      if (index !== currentFrame) {
        currentFrame = index;
        requestAnimationFrame(() => drawFrame(currentFrame));
      }
    },
  });
}

function initMarquee() {
  const wrap = document.querySelector(".marquee-wrap");
  const text = wrap.querySelector(".marquee-text");
  const speed = parseFloat(wrap.dataset.scrollSpeed) || -20;
  gsap.to(text, {
    xPercent: speed,
    ease: "none",
    scrollTrigger: { trigger: scrollContainer, start: "top top", end: "bottom bottom", scrub: true },
  });
  // Ends before section 2 ("Our Craft", bottom-band) enters at 0.24, and the
  // wrap now sits low (top:80%) to clear the badge -- both chosen so the
  // marquee never crosses the badge or foreground section text.
  const fadeIn = 0.03, fadeInEnd = 0.09, fadeOutStart = 0.19, fadeOut = 0.23;
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      let opacity = 0;
      if (p >= fadeIn && p < fadeInEnd) opacity = (p - fadeIn) / (fadeInEnd - fadeIn);
      else if (p >= fadeInEnd && p < fadeOutStart) opacity = 1;
      else if (p >= fadeOutStart && p <= fadeOut) opacity = 1 - (p - fadeOutStart) / (fadeOut - fadeOutStart);
      wrap.style.opacity = opacity;
    },
  });
}

function initDarkOverlay(zones) {
  // zones: [{enter, leave, persist}]. persist zones ramp up and never fade
  // back out (e.g. behind the final CTA, so its text and seal stay readable
  // against the badge rather than fading back to full brightness).
  const overlay = document.getElementById("dark-overlay");
  const fadeRange = 0.04;
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      let opacity = 0;
      for (const { enter, leave, persist } of zones) {
        let zoneOpacity = 0;
        if (persist && p > leave) zoneOpacity = 0.9;
        else if (p >= enter - fadeRange && p <= enter) zoneOpacity = (p - (enter - fadeRange)) / fadeRange * 0.9;
        else if (p > enter && p < leave) zoneOpacity = 0.9;
        else if (p >= leave && p <= leave + fadeRange) zoneOpacity = 0.9 * (1 - (p - leave) / fadeRange);
        opacity = Math.max(opacity, zoneOpacity);
      }
      overlay.style.opacity = opacity;
    },
  });
}

const ANIMATION_PRESETS = {
  "fade-up": { y: 50, duration: 0.9, stagger: 0.12, ease: "power3.out" },
  "slide-left": { x: -80, duration: 0.9, stagger: 0.14, ease: "power3.out" },
  "slide-right": { x: 80, duration: 0.9, stagger: 0.14, ease: "power3.out" },
  "scale-up": { scale: 0.85, duration: 1.0, stagger: 0.12, ease: "power2.out" },
  "rotate-in": { y: 40, rotation: 3, duration: 0.9, stagger: 0.1, ease: "power3.out" },
  "stagger-up": { y: 60, duration: 0.8, stagger: 0.15, ease: "power3.out" },
  "clip-reveal": { clipPath: "inset(100% 0 0 0)", duration: 1.2, stagger: 0.15, ease: "power4.inOut" },
};

function setupSectionAnimation(section) {
  const type = section.dataset.animation;
  const persist = section.dataset.persist === "true";
  const enter = parseFloat(section.dataset.enter) / 100;
  const leave = parseFloat(section.dataset.leave) / 100;
  const mid = (enter + leave) / 2;
  // ScrollTrigger progress maps to scrollY via start + p*(containerHeight -
  // viewportHeight) -- not p*containerHeight -- so a naive top:mid% lands a
  // few hundred px off from where the section is actually centered in the
  // viewport during its active window. Compute the real document position.
  const containerHeight = scrollContainer.offsetHeight;
  const viewportHeight = window.innerHeight;
  const centerDocY = mid * (containerHeight - viewportHeight) + viewportHeight / 2;
  section.style.top = centerDocY + "px";
  section.style.transform = "translateY(-50%)";

  const children = section.querySelectorAll(
    ".section-label, .section-heading, .section-body, .section-note, .cta-heading, .cta-links, .stat, .cta-seal"
  );

  const preset = ANIMATION_PRESETS[type] || ANIMATION_PRESETS["fade-up"];
  const tl = gsap.timeline({ paused: true });
  tl.from(children, { ...preset, opacity: 0 });

  gsap.set(section, { visibility: "hidden" });
  let shown = false;

  ScrollTrigger.create({
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      const shouldShow = (p >= enter && p <= leave) || (persist && p > leave);
      if (shouldShow && !shown) {
        shown = true;
        section.style.visibility = "visible";
        tl.play();
      } else if (!shouldShow && shown) {
        shown = false;
        section.style.visibility = "hidden";
        tl.pause(0);
      }
    },
  });

  return { enter, leave };
}

async function init() {
  gsap.registerPlugin(ScrollTrigger);
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  window.lenis = lenis; // exposed so tooling (screenshots, tests) can pause/seek scroll
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  await loadFrames();
  drawFrame(0);

  initHeroTransition();
  initFrameScrub();
  initMarquee();
  initDarkOverlay([
    { enter: 0.56, leave: 0.74 },
    { enter: 0.86, leave: 0.88, persist: true },
  ]);

  document.querySelectorAll(".scroll-section").forEach(setupSectionAnimation);

  document.querySelectorAll(".stat-number").forEach((el) => {
    const target = parseFloat(el.dataset.value);
    const decimals = parseInt(el.dataset.decimals || "0", 10);
    const obj = { val: 0 };
    let counted = false;
    ScrollTrigger.create({
      trigger: scrollContainer,
      start: "top top",
      end: "bottom bottom",
      scrub: true,
      onUpdate: (self) => {
        if (self.progress >= 0.58 && !counted) {
          counted = true;
          gsap.to(obj, {
            val: target,
            duration: prefersReducedMotion ? 0 : 1.6,
            ease: "power1.out",
            snap: { val: decimals === 0 ? 1 : 0.01 },
            onUpdate: () => { el.textContent = obj.val.toFixed(decimals); },
          });
        } else if (self.progress < 0.5 && counted) {
          counted = false;
          obj.val = 0;
          el.textContent = "0";
        }
      },
    });
  });

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (e) => {
      const target = document.querySelector(link.getAttribute("href"));
      if (target) {
        e.preventDefault();
        lenis.scrollTo(target, { offset: 0 });
      }
    });
  });

  requestAnimationFrame(() => {
    loader.classList.add("hidden");
  });

  window.__pageReady = true; // all ScrollTriggers exist and sections are positioned; tooling can wait on this instead of guessing a timeout
}

init();
