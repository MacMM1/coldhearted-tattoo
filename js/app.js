const ROTATION_SPEED = 2.0;
// The badge is a wide horizontal lockup (~1.8:1, close to the viewport's own
// aspect ratio), so the usual 0.82-0.90 "padded cover" range for tall/narrow
// products would make it fill nearly the full width and height here, leaving
// no room for the top/bottom text bands. Scaled down well below that range
// so it reads as a centered emblem with real margins above and below.
const IMAGE_SCALE = 0.34;

const badgeStage = document.getElementById("badge-stage");
const badgeFront = document.querySelector(".badge-front");
const heroSection = document.querySelector(".hero-standalone");
const scrollContainer = document.getElementById("scroll-container");
const loader = document.getElementById("loader");
const loaderBarFill = document.getElementById("loader-bar-fill");
const loaderPercent = document.getElementById("loader-percent");

function resizeBadge() {
  const cw = window.innerWidth, ch = window.innerHeight;
  const iw = badgeFront.naturalWidth, ih = badgeFront.naturalHeight;
  if (!iw || !ih) return;
  const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
  badgeStage.style.width = (iw * scale) + "px";
  badgeStage.style.height = (ih * scale) + "px";
}

function loadBadgeImage() {
  return new Promise((resolve) => {
    const done = () => {
      loaderBarFill.style.width = "100%";
      loaderPercent.textContent = "100%";
      resolve();
    };
    if (badgeFront.complete && badgeFront.naturalWidth) { done(); return; }
    badgeFront.onload = done;
    badgeFront.onerror = done;
  });
}

function initHeaderScrollState() {
  const header = document.querySelector(".site-header");
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      header.classList.toggle("scrolled", self.progress > 0.02);
    },
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

function initBadgeRotation() {
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: "top top",
    end: "bottom bottom",
    scrub: true,
    onUpdate: (self) => {
      const accelerated = Math.min(self.progress * ROTATION_SPEED, 1);
      badgeStage.style.transform = `rotateY(${accelerated * 360}deg)`;
    },
  });
}

function initMarquee() {
  const wrap = document.querySelector(".marquee-wrap");
  const text = wrap.querySelector(".marquee-text");
  // Runs on its own clock rather than scroll progress -- the wrap is only
  // ever visible for a short scroll window (see fade below), and tying the
  // scroll all the way across that whole window used to only pan the text
  // a few percent, so you'd never see more than one fragment of the
  // phrase. A continuous loop means the full phrase always cycles through
  // however long a given viewer's scroll stays in that window. The text
  // is duplicated in the markup, so looping xPercent 0 -> -50 is seamless.
  gsap.to(text, { xPercent: -50, duration: 14, ease: "none", repeat: -1 });
  // Fully faded out before "Who We Are" enters at 0.17 (see its data-enter in
  // index.html) so the marquee never overlaps that section's text -- it gets
  // its own short window right after the hero, then clears out of the way.
  const fadeIn = 0.05, fadeInEnd = 0.10, fadeOutStart = 0.12, fadeOut = 0.16;
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

function initGallery() {
  const track = document.getElementById("gallery-track");
  if (!track || !track.children.length) return;
  const step = (dir) => {
    const width = track.children[0].getBoundingClientRect().width;
    const gap = parseFloat(getComputedStyle(track).gap) || 0;
    track.scrollBy({ left: dir * (width + gap), behavior: "smooth" });
  };
  document.querySelector(".gallery-prev").addEventListener("click", () => step(-1));
  document.querySelector(".gallery-next").addEventListener("click", () => step(1));
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
  // A persisting section stays visible all the way to progress 1 (the true
  // scroll end), not just to its own `leave` -- centering it on the window's
  // midpoint means it keeps drifting upward after `leave` and ends up
  // cropped behind the header at rest. Anchor it on `leave` instead so it's
  // correctly centered exactly where it actually settles.
  const mid = persist ? leave : (enter + leave) / 2;
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
    ".section-label, .section-heading, .section-body, .section-note, .cta-heading, .cta-links, .stat, .cta-seal, .section-media-img"
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
  resizeBadge();
  window.addEventListener("resize", resizeBadge);

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  window.lenis = lenis; // exposed so tooling (screenshots, tests) can pause/seek scroll
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  await loadBadgeImage();
  resizeBadge();

  initHeaderScrollState();
  initHeroTransition();
  initBadgeRotation();
  initMarquee();
  // Dimmed only behind the persisting final CTA -- other text sections stay
  // readable by keeping clear of the badge spatially (narrower text column)
  // rather than by dimming the badge under them.
  initDarkOverlay([
    { enter: 0.83, leave: 0.85, persist: true },
  ]);

  document.querySelectorAll(".scroll-section").forEach(setupSectionAnimation);
  initGallery();

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
