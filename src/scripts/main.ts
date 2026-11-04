import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { runIntro } from "./intro";
import { initFlowers } from "./flowers";
import { initName } from "./name";
import { initGoo, playGoo } from "./goo";
import { initRewrite } from "./rewrite";

gsap.registerPlugin(ScrollTrigger, SplitText);

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

let lenis: Lenis | null = null;
if (!reduced) {
  lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
  });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis!.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
}

await document.fonts.ready;

initName();
initRewrite(!reduced);
initClock();
initCopy();
initAnchors();
initFlowers();
if (!reduced) {
  initGoo();
  initFades();
  initPhoto();
  if (finePointer) initCursor();
}
ScrollTrigger.refresh();

runIntro(() => {
  lenis?.start();
  if (!reduced) playHero();
});

// ---------------------------------------------------------------------------

function playHero() {
  const tl = gsap.timeline();
  tl.from(".name .ini, .name .rest", {
    yPercent: 110,
    duration: 1.4,
    stagger: 0.07,
    ease: "expo.out",
  });
  playGoo(document.querySelector<HTMLElement>("[data-goo=hero]"), 0.25);
  tl.from("[data-hero]", { opacity: 0, y: 14, duration: 1, stagger: 0.06, ease: "expo.out" }, 0.4);
}

// Small text would turn to mush in the ink effect, so it just comes into focus.
function initFades() {
  gsap.utils.toArray<HTMLElement>("[data-fade]").forEach((el) => {
    gsap.from(el, {
      opacity: 0,
      filter: "blur(10px)",
      duration: 1.2,
      ease: "power2.out",
      clearProps: "opacity,filter",
      scrollTrigger: { trigger: el, start: "top 92%" },
    });
  });
}

// The portrait starts zoomed in and settles to the full, uncropped photo
// by the time it is well into view.
function initPhoto() {
  const img = document.querySelector<HTMLElement>(".photo img");
  if (!img) return;
  gsap.fromTo(img, { "--zoom": 1.225 }, {
    "--zoom": 1,
    ease: "none",
    scrollTrigger: { trigger: ".photo", start: "top bottom", end: "top 25%", scrub: true },
  });
}

function initCursor() {
  const dot = document.createElement("div");
  dot.className = "cursor";
  document.body.append(dot);
  let x = -50;
  let y = -50;
  let tx = x;
  let ty = y;
  addEventListener("pointermove", (e) => {
    tx = e.clientX;
    ty = e.clientY;
  });
  gsap.ticker.add(() => {
    x += (tx - x) * 0.25;
    y += (ty - y) * 0.25;
    dot.style.transform = `translate(${x}px, ${y}px)`;
  });
  document.addEventListener("pointerover", (e) => {
    const t = e.target as Element;
    dot.classList.toggle("big", !!t.closest("a, button, [data-cursor]"));
  });
  document.addEventListener("pointerleave", () => dot.classList.add("gone"));
  document.addEventListener("pointerenter", () => dot.classList.remove("gone"));
}

function initClock() {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Kolkata",
    hour: "2-digit",
    minute: "2-digit",
  });
  const tick = () =>
    document.querySelectorAll("[data-clock]").forEach((el) => (el.textContent = `${fmt.format(new Date())} IST`));
  tick();
  setInterval(tick, 15000);
}

function initCopy() {
  document.querySelectorAll<HTMLButtonElement>("[data-copy]").forEach((btn) => {
    const label = btn.textContent;
    btn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(btn.dataset.copy ?? "");
        btn.textContent = "Copied";
      } catch {
        btn.textContent = "Couldn't copy";
      }
      setTimeout(() => (btn.textContent = label), 1800);
    });
  });
}

function initAnchors() {
  document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach((a) => {
    a.addEventListener("click", (e) => {
      const id = a.getAttribute("href")!;
      const target = id === "#top" ? 0 : document.querySelector<HTMLElement>(id);
      if (target === null) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: target === 0 ? 0 : -24, duration: 1.6 });
      else if (target === 0) scrollTo({ top: 0 });
      else target.scrollIntoView();
    });
  });
}
