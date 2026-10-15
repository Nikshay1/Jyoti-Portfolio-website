import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { initGame } from "./game";
import { runIntro } from "./intro";
import { initSpace } from "./space";
import { initName } from "./name";
import { initRewrite } from "./rewrite";

gsap.registerPlugin(ScrollTrigger, SplitText);

const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;

let lenis: Lenis | null = null;
if (!reduced) {
  lenis = new Lenis({ lerp: 0.1 });
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
initPreview();
initFooterSky();
if (!reduced) {
  initReveals();
  initCounters();
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
  const lead = document.querySelector<HTMLElement>("[data-hero-lines]");
  if (lead) {
    const split = SplitText.create(lead, { type: "lines", mask: "lines", linesClass: "line" });
    tl.from(split.lines, { yPercent: 105, duration: 1.2, stagger: 0.08, ease: "expo.out" }, 0.25);
  }
  tl.from("[data-hero]", { opacity: 0, y: 14, duration: 1, stagger: 0.06, ease: "expo.out" }, 0.4);
}

function initReveals() {
  gsap.utils.toArray<HTMLElement>("[data-lines]").forEach((el) => {
    const split = SplitText.create(el, { type: "lines", mask: "lines", linesClass: "line" });
    gsap.from(split.lines, {
      yPercent: 105,
      duration: 1.2,
      stagger: 0.08,
      ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 88%" },
    });
  });

  gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((el) => {
    gsap.from(el, {
      opacity: 0,
      y: 36,
      duration: 1.1,
      ease: "expo.out",
      clearProps: "opacity,transform",
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

function initCounters() {
  document.querySelectorAll<HTMLElement>("[data-count]").forEach((el) => {
    const end = Number(el.dataset.count);
    const n = { v: 0 };
    el.textContent = "0";
    gsap.to(n, {
      v: end,
      duration: 1.8,
      ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 90%" },
      onUpdate: () => (el.textContent = String(Math.round(n.v))),
    });
  });
}

// The footer sky; the small "play" prompt swaps it for the text platformer.
function initFooterSky() {
  const sky = document.querySelector<HTMLElement>(".sf-sky");
  const gameEl = document.querySelector<HTMLElement>("[data-game]");
  const play = document.querySelector<HTMLButtonElement>(".sf-play");
  if (!sky || !gameEl || !play) return;
  const space = initSpace();
  play.addEventListener("click", () => {
    space.pause();
    sky.classList.add("is-game");
    gameEl.hidden = false;
    game.start();
  });
  const game = initGame({
    onQuit: () => {
      gameEl.hidden = true;
      sky.classList.remove("is-game");
      space.resume();
    },
  });
}

// The dark card that follows the cursor over the work list.
function initPreview() {
  const preview = document.querySelector<HTMLElement>(".preview");
  const rows = document.querySelectorAll<HTMLElement>(".row:not(.row-head)");
  if (!preview || !finePointer) return;

  let x = innerWidth / 2;
  let y = innerHeight / 2;
  let tx = x;
  let ty = y;
  addEventListener("pointermove", (e) => {
    tx = e.clientX;
    ty = e.clientY;
  });
  gsap.ticker.add(() => {
    x += (tx - x) * 0.14;
    y += (ty - y) * 0.14;
    const tilt = gsap.utils.clamp(-8, 8, (tx - x) * 0.05);
    preview.style.transform = `translate(${x + 28}px, ${y - 40}px) rotate(${tilt}deg)`;
  });

  rows.forEach((row) => {
    const card = row.querySelector(".r-card");
    row.addEventListener("pointerenter", () => {
      preview.innerHTML = card?.innerHTML ?? "";
      preview.classList.add("on");
    });
    row.addEventListener("pointerleave", () => preview.classList.remove("on"));
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
    dot.classList.toggle("big", !!t.closest("a:not(.row), button, [data-cursor]"));
    dot.classList.toggle("gone", !!t.closest(".row:not(.row-head)"));
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
