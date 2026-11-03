import { gsap } from "gsap";

// The opening film, plays once per browser session; any key or click skips it.
//   1. A browser bar loads, its loading line turns into a dot, the dot drops
//      into the bar as the caret and types.
//   2. The bar becomes a glass strip over a blurred photo of Jyoti, with the
//      tagline.
//   3. The photo shrinks into a chip asking "Looking for a writer?".
//   4. A question types itself with the camera following, then pulls back to
//      show a wheel of page types.
//   5. The end of the question is eaten by a blue line that opens into
//      "Searching...".
//   6. Her results arrive as a stack of posters.
//   7. Black falls over the page, "Hi, I'm Jyoti" and her face. Then the site.
//
// Two habits make it feel filmed rather than animated. Nothing ever fully
// stops: every scene carries a slow drift under its fast moves. And nothing
// just appears: things arrive out of focus and settle with a long tail. Moving
// text is only ever transformed, never laid out, so it glides between pixels.
export function runIntro(onDone: () => void) {
  const el = document.querySelector<HTMLElement>(".intro");
  const root = document.documentElement;
  if (!el || root.classList.contains("skip-intro")) {
    el?.remove();
    onDone();
    return;
  }

  try {
    sessionStorage.setItem("intro-seen", "1");
  } catch {}

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    onDone();
  };

  const q = questionRow(el);
  // Scenes overlap on purpose: each one's slow drift runs on under the next, so
  // they're placed by the clock rather than one after another. The short delay
  // lets the page finish its load work, which would otherwise stutter the start.
  const tl = gsap.timeline({ delay: 0.25, onUpdate: q.render });
  tl.add(pillScene(el), 0)
    .add(bandScene(el), 2.75)
    .add(questionScene(q), 5.31)
    .add(searchScene(el, q), 7.88)
    .add(cardsScene(el, q), 8.96)
    .add(endScene(el), 10.76)
    .add(wipe, 12.71);

  function wipe() {
    gsap.to(".e-line", { opacity: 0, filter: "blur(8px)", duration: 0.34, ease: "power2.in" });
    gsap.to(el!, {
      clipPath: "inset(0% 0% 100% 0%)",
      duration: 1.1,
      ease: "expo.inOut",
      onComplete: () => {
        tl.kill();
        el!.remove();
        root.classList.add("skip-intro");
      },
    });
    gsap.delayedCall(0.45, finish);
  }

  const skip = () => {
    if (finished) return;
    tl.kill();
    removeEventListener("keydown", skip);
    wipe();
  };
  el.addEventListener("click", skip);
  addEventListener("keydown", skip);
}

const SHARP = "blur(0px)";

// The bar is built larger than it first shows (see .op-pill in the CSS) and
// scaled down, so the camera can push in without its GPU layer going soft.
const PILL_REST = 1 / 1.5;

// Letters come on as the count passes them, each settling out of a soft blur.
function typist(letters: HTMLElement[], from: gsap.TweenVars, duration = 0.26) {
  let shown = 0;
  return (count: number) => {
    const to = Math.min(Math.round(count), letters.length);
    for (; shown < to; shown++) {
      gsap.fromTo(letters[shown], { opacity: 0, ...from }, {
        opacity: 1,
        x: 0,
        y: 0,
        filter: SHARP,
        duration,
        ease: "power3.out",
        clearProps: "filter",
      });
    }
  };
}

// The right edge of each letter, as a function of a fractional letter count.
function rightEdges(letters: HTMLElement[]) {
  const edges = letters.map((c) => c.offsetLeft + c.offsetWidth);
  return (count: number) => {
    if (count <= 0) return 0;
    const i = Math.min(Math.floor(count), edges.length);
    const from = i > 0 ? edges[i - 1] : 0;
    const to = edges[Math.min(i, edges.length - 1)];
    return from + (to - from) * (count - i);
  };
}

function pillScene(el: HTMLElement) {
  const scene = el.querySelector<HTMLElement>(".op-pill")!;
  const u = parseFloat(getComputedStyle(scene).fontSize);
  const caret = el.querySelector<HTMLElement>(".pl-caret")!;
  const letters = gsap.utils.toArray<HTMLElement>(".pl-ch", el);
  const edge = rightEdges(letters);
  const type = typist(letters, { y: u * 0.14, x: u * -0.1, filter: "blur(3px)" });
  const caretTo = gsap.quickTo(caret, "x", { duration: 0.16, ease: "power3.out" });
  const count = { n: 0 };
  const ghost = (dy: number) =>
    `0 ${dy * 0.45}em 0 rgba(14,14,14,0.34), 0 ${dy * 0.9}em 0 rgba(14,14,14,0.14)`;

  const t = gsap.timeline();
  t.set(scene, { opacity: 1 })
    .set(".pl-mark", { xPercent: -50, yPercent: -50, y: u * 2.7 })
    .set(".pl", { scale: PILL_REST })
    .fromTo(scene, { scale: 1 }, { scale: 1.07, duration: 2.95, ease: "none" }, 0)
    // The bar focuses in from left to right, its details a beat behind it.
    .fromTo(
      ".pl-btn, .pl-bar",
      { opacity: 0, scale: 0.9, filter: "blur(10px)" },
      { opacity: 1, scale: 1, filter: SHARP, duration: 0.56, stagger: 0.07, ease: "power3.out", clearProps: "filter" },
      0.08,
    )
    .fromTo(
      ".pl svg",
      { opacity: 0, scale: 0.5 },
      { opacity: 1, scale: 1, duration: 0.46, stagger: 0.055, ease: "back.out(1.7)" },
      0.14,
    )
    .fromTo(".pl-reload", { rotate: -120 }, { rotate: 0, duration: 0.6, ease: "power3.out" }, 0.28)
    .fromTo(
      ".pl-ph span",
      { opacity: 0, y: u * 0.3, x: u * -0.18, rotate: 9 },
      { opacity: 1, y: 0, x: 0, rotate: 0, duration: 0.4, stagger: 0.024, ease: "power3.out" },
      0.26,
    )
    // The loading line: grows in black, runs a colour sweep, goes black again.
    .to(".pl-mark", { width: u * 8.5, duration: 0.5, ease: "power3.out" }, 0.14)
    .to(".pl-mark i", { opacity: 1, duration: 0.18 }, 0.42)
    .fromTo(".pl-mark i", { backgroundPosition: "0% 0" }, { backgroundPosition: "200% 0", duration: 0.8, ease: "sine.inOut" }, 0.38)
    .to(".pl-mark i", { opacity: 0, duration: 0.16 }, 1.0)
    // It gathers into a dot that hops above the bar, trailing ghosts of itself.
    .to(".pl-mark", { width: u * 2.2, duration: 0.14, ease: "power2.in" }, 1.06)
    .to(".pl-mark", { width: u * 0.62, height: u * 0.62, duration: 0.2, ease: "power2.out" }, 1.2)
    .to(".pl-mark", { y: u * -2.5, duration: 0.32, ease: "expo.inOut" }, 1.12)
    .fromTo(".pl-mark", { boxShadow: ghost(0) }, { boxShadow: ghost(0.75), duration: 0.12, ease: "power2.in" }, 1.16)
    .to(".pl-mark", { boxShadow: ghost(0), duration: 0.14, ease: "power2.out" }, 1.28)
    .to(".pl-mark", { y: u * -2.82, duration: 0.3, ease: "sine.out" }, 1.44)
    .to(".pl-mark", { y: u * -2.62, duration: 0.24, ease: "sine.inOut" }, 1.74)
    // Then it falls, squashing and smearing, and stretches into the caret.
    .to(".pl-ph, .pl-tabs", { opacity: 0, filter: "blur(4px)", duration: 0.22, ease: "power2.in" }, 1.94)
    .to(".pl-btn, .pl-reload", { opacity: 0.45, duration: 0.2 }, 1.96)
    .to(".pl-mark", { y: 0, duration: 0.2, ease: "power3.in" }, 1.98)
    .to(".pl-mark", { boxShadow: ghost(-0.75), duration: 0.14, ease: "power2.in" }, 1.98)
    .to(".pl-mark", { boxShadow: ghost(0), duration: 0.1 }, 2.14)
    .to(".pl-mark", { width: u * 0.42, height: u * 0.86, duration: 0.14, ease: "power2.in" }, 2.02)
    .to(".pl-mark", { width: 3, height: u * 1.4, borderRadius: 1, duration: 0.16, ease: "power3.out" }, 2.15)
    // The camera pushes in, the bar opens up and the caret slides to its start.
    .to(".pl-bar", { width: u * 16, duration: 0.42, ease: "power3.inOut" }, 2.06)
    .to(".pl", { scale: 1.34 * PILL_REST, duration: 0.42, ease: "power3.inOut" }, 2.06)
    .to(".pl", { scale: 1.42 * PILL_REST, duration: 0.5, ease: "sine.out" }, 2.48)
    .to(".pl-mark", { x: u * -7, duration: 0.42, ease: "power3.inOut" }, 2.1)
    .to(".pl-btn, .pl-reload", { opacity: 1, duration: 0.36, ease: "power2.out" }, 2.2)
    .set(".pl-mark", { opacity: 0 }, 2.58)
    .set(".pl-input", { opacity: 1 }, 2.58)
    .to(count, {
      n: letters.length,
      duration: 0.3,
      ease: "none",
      onUpdate: () => {
        type(count.n);
        caretTo(edge(count.n));
      },
    }, 2.46)
    .to(scene, { opacity: 0, scale: 1.09, filter: "blur(12px)", duration: 0.2, ease: "power2.in" }, 2.72)
    .set(scene, { display: "none" });
  return t;
}

function bandScene(el: HTMLElement) {
  const scene = el.querySelector<HTMLElement>(".op-band")!;
  const letters = gsap.utils.toArray<HTMLElement>(".b-ch", el);
  const edge = rightEdges(letters);
  const start = (el.querySelector(".b-word")?.textContent ?? "").length;
  const u = parseFloat(getComputedStyle(el.querySelector(".b-strip")!).fontSize);
  const type = typist(letters, { x: u * -0.1, filter: "blur(4px)" }, 0.24);
  const caret = el.querySelector<HTMLElement>(".b-caret")!;
  const caretTo = gsap.quickTo(caret, "x", { duration: 0.14, ease: "power3.out" });
  const count = { n: start };

  const W = innerWidth;
  const H = innerHeight;
  const rect = (w: number, h: number) => `inset(${(H - h) / 2}px ${(W - w) / 2}px)`;
  const card = Math.min(240, W * 0.5);
  // However small the photo gets and however far it has turned, it must still
  // fill the card, or its edge shows. Its top and bottom are feathered, so
  // only the middle 55% of its height counts.
  const photo = el.querySelector<HTMLElement>(".b-img")!;
  const fill = (scale: number, deg: number, w: number, h: number) => {
    const a = (Math.abs(deg) * Math.PI) / 180;
    return Math.max(
      scale,
      (w * Math.cos(a) + h * Math.sin(a) + 8) / photo.offsetWidth,
      (w * Math.sin(a) + h * Math.cos(a) + 8) / (photo.offsetHeight * 0.55),
    );
  };

  const t = gsap.timeline();
  t.set(scene, { opacity: 1 })
    .set(".b-clip", { clipPath: rect(W, H) })
    .set(letters.slice(0, start), { opacity: 1 })
    .set(caret, { x: edge(start) })
    .fromTo(".b-strip", { opacity: 0, filter: "blur(10px)", scaleY: 0.86 }, { opacity: 1, filter: SHARP, scaleY: 1, duration: 0.24, ease: "power3.out" }, 0)
    // The photo never stops turning and pushing in.
    .fromTo(".b-img", { scale: 1.06, rotate: -2 }, { scale: 1.2, rotate: 2.5, duration: 1.12, ease: "none" }, 0)
    .to(count, {
      n: letters.length,
      duration: 0.46,
      ease: "none",
      onUpdate: () => {
        type(count.n);
        caretTo(edge(count.n));
      },
    }, 0.03)
    // The photo comes up behind the strip and the strip turns to clear glass.
    .to(".b-veil", { opacity: 0, duration: 0.56, ease: "power2.inOut" }, 0.2)
    .to(".b-glass", { opacity: 0, duration: 0.5, ease: "power2.inOut" }, 0.3)
    .to(caret, { opacity: 0, duration: 0.16 }, 0.58)
    // The words drift apart and melt away, last one first.
    .to(".b-word", { x: (i: number) => i * u * 0.32, duration: 0.56, ease: "sine.in" }, 0.6)
    .to(".b-word", { opacity: 0, filter: "blur(6px)", duration: 0.22, stagger: { each: 0.06, from: "end" }, ease: "power2.in" }, 0.84)
    .to(".b-strip", { opacity: 0, duration: 0.16 }, 1.14)
    // Everything pulls back to a card holding the prompt...
    .to(".b-clip", { clipPath: rect(card, card * 0.4), duration: 0.5, ease: "power4.inOut" }, 0.96)
    .to(".b-img", { scale: fill(0.56, 7, card, card * 0.4), rotate: 7, duration: 0.54, ease: "power4.inOut" }, 0.96)
    .to(".b-veil", { opacity: 0.42, duration: 0.36, ease: "power2.inOut" }, 1.1)
    .fromTo(".b-ask", { opacity: 0, scale: 1.1, filter: "blur(7px)" }, { opacity: 1, scale: 1, filter: SHARP, duration: 0.36, ease: "power3.out" }, 1.26)
    // ...which keeps shrinking, slowly, then quickly, down to a chip of glass.
    .to(".b-clip", { clipPath: rect(card * 0.8, card * 0.32), duration: 0.8, ease: "none" }, 1.4)
    .to(".b-img", { scale: fill(0.42, 4, card, card * 0.4), rotate: -4, duration: 0.8, ease: "none" }, 1.4)
    .to(".b-ask", { opacity: 0, scale: 0.86, filter: "blur(5px)", duration: 0.18, ease: "power2.in" }, 2.06)
    .to(".b-clip", { clipPath: rect(card * 0.34, card * 0.15), duration: 0.2, ease: "power3.inOut" }, 2.2)
    .to(".b-img", { scale: fill(0.28, 22, card * 0.8, card * 0.32), rotate: -22, duration: 0.3, ease: "power3.out" }, 2.2)
    .to(".b-clip", { clipPath: rect(card * 0.26, card * 0.12), duration: 0.14, ease: "none" }, 2.4)
    .to(scene, { opacity: 0, filter: "blur(5px)", duration: 0.1 }, 2.49)
    .set(scene, { display: "none" });
  return t;
}

// The question row lays itself out by hand: a plain state object says how much
// is typed, where the camera is and how wide each part is, and render() draws
// it with transforms each tick. The row is built larger than it ever shows
// (see --zoom-max in the CSS) and scaled down, so it stays sharp at full zoom.
function questionRow(el: HTMLElement) {
  const scene = el.querySelector<HTMLElement>(".op-q")!;
  const cam = el.querySelector<HTMLElement>(".q-cam")!;
  const lead = el.querySelector<HTMLElement>(".q-lead")!;
  const slot = el.querySelector<HTMLElement>(".q-slot")!;
  const end = el.querySelector<HTMLElement>(".q-end")!;
  const items = gsap.utils.toArray<HTMLElement>(".q-item", el);
  const letters = gsap.utils.toArray<HTMLElement>(".q-ch", el);
  const whip = el.querySelector("#op-whip feGaussianBlur")!;

  const size = parseFloat(getComputedStyle(cam).fontSize);
  const built = parseFloat(getComputedStyle(scene).getPropertyValue("--zoom-max"));
  const gap = size * 0.26;
  const leadW = lead.offsetWidth;
  const tailW = end.offsetWidth;

  slot.classList.remove("is-plain");
  const chipWidths = items.map((i) => i.offsetWidth);
  slot.classList.add("is-plain");
  const plainW = items[0].offsetWidth;

  // Every letter's right edge along the fully typed, plain row.
  const plainTotal = leadW + gap + plainW + gap + tailW;
  const stops = letters.map((c) => {
    const part = c.closest(".q-item") ? leadW + gap : c.closest(".q-end") ? leadW + gap + plainW + gap : 0;
    return part + c.offsetLeft + c.offsetWidth - plainTotal / 2;
  });
  const first = -plainTotal / 2;
  const headAt = (n: number) => {
    if (n <= 0) return first;
    const i = Math.min(Math.floor(n), stops.length);
    const from = i > 0 ? stops[i - 1] : first;
    const to = stops[Math.min(i, stops.length - 1)];
    return from + (to - from) * (n - i);
  };

  const type = typist(letters, { y: size * 0.05, x: size * -0.05, filter: "blur(5px)" }, 0.3);

  const s = {
    n: 0, // letters typed, fractional
    zoom: 1,
    breath: 0, // slow extra push-in, on top of zoom
    follow: 0, // 0: keep what's typed centred. 1: chase the typing head.
    home: 0, // 1: camera back on the middle of the row
    x: 0, // screen offset
    blur: 0, // sideways camera blur
    wheel: 0, // position of the page-type wheel
    show: 0, // how visible the neighbours on the wheel are
    leadK: 1, // how much of the row's start is still there
    slotW: plainW,
    endW: tailW,
  };

  let focus: number | null = null;
  let whipOn = false;
  let lastEnd = 0;
  let endBlur = 0;

  const render = () => {
    type(s.n);

    const dt = gsap.ticker.deltaRatio(60) / 60;
    const scale = (s.zoom * (1 + s.breath)) / built;
    const head = headAt(s.n);
    const centred = (first + head) / 2;
    const chase = head - (innerWidth * 0.14) / scale;
    const target = centred + (chase - centred) * s.follow;
    focus = focus === null ? target : focus + (target - focus) * (1 - Math.exp(-dt * 16));
    cam.style.transform = `translate3d(${s.x}px,0,0) scale(${scale}) translate3d(${-focus * (1 - s.home)}px,0,0)`;

    const total = leadW * s.leadK + gap + s.slotW + gap + s.endW;
    const left = -total / 2;
    const slotX = left + leadW * s.leadK + gap;
    const endX = slotX + s.slotW + gap;
    lead.style.transform = `translate3d(${left - leadW * (1 - s.leadK)}px,0,0)`;
    slot.style.transform = `translate3d(${slotX}px,0,0)`;
    end.style.transform = `translate3d(${endX}px,0,0)`;

    // What slides along the row blurs with its own speed.
    const speed = Math.abs(endX - lastEnd) * scale;
    lastEnd = endX;
    endBlur += (Math.min(speed * 0.6, 6) - endBlur) * 0.4;
    end.style.filter = endBlur > 0.3 ? `blur(${endBlur / scale}px)` : "none";

    if (s.blur > 0.2) {
      whip.setAttribute("stdDeviation", `${s.blur} 0`);
      if (!whipOn) scene.style.filter = "url(#op-whip)";
      whipOn = true;
    } else if (whipOn) {
      scene.style.filter = "none";
      whipOn = false;
    }

    items.forEach((item, i) => {
      const d = i - s.wheel;
      const far = Math.min(Math.abs(d), 1.4);
      const seen = far < 1 ? 1 - far * 0.72 : (0.28 * (1.4 - far)) / 0.4;
      item.style.transform = `translate3d(0,${d * size * 1.3}px,0) scale(${1 - far * 0.12})`;
      item.style.opacity = String(far < 0.5 ? seen : seen * s.show);
      item.style.filter = far > 0.08 ? `blur(${(far * size) / 26}px)` : "none";
    });
  };

  return { s, slot, render, chipWidths, tailW, size, built, total: letters.length };
}

type Row = ReturnType<typeof questionRow>;

function questionScene(q: Row) {
  const { s, slot, chipWidths, total } = q;
  const firstWords = "who can".length;

  const t = gsap.timeline();
  t.set(".op-q", { opacity: 1 })
    // The first word carries the colour of the glass it grew out of.
    .fromTo(".q-lead", { "--tint": "100%" }, { "--tint": "0%", duration: 0.56, ease: "power2.out" }, 0)
    .fromTo(s, { breath: -0.07 }, { breath: 0.05, duration: 0.7, ease: "power1.out" }, 0)
    .to(s, { n: 3, duration: 0.09, ease: "none" }, 0.02)
    .to(s, { n: firstWords, duration: 0.16, ease: "none" }, 0.36)
    // The camera whips in and follows the typing.
    .to(s, { blur: 24, duration: 0.2, ease: "power3.in" }, 0.46)
    .to(s, { zoom: 2.25, follow: 1, breath: 0, duration: 0.3, ease: "expo.inOut" }, 0.5)
    .to(s, { blur: 0, duration: 0.2, ease: "power2.out" }, 0.66)
    .to(s, { n: total, duration: 0.58, ease: "none" }, 0.62)
    .fromTo(s, { breath: 0 }, { breath: 0.05, duration: 0.56, ease: "none" }, 0.8)
    // It whips back out and the slot turns into a chip on a wheel.
    .to(s, { blur: 30, duration: 0.14, ease: "power3.in" }, 1.28)
    .to(s, { zoom: 1, home: 1, breath: -0.03, duration: 0.3, ease: "expo.inOut" }, 1.28)
    .to(s, { blur: 0, duration: 0.2, ease: "power2.out" }, 1.42)
    .call(() => slot.classList.remove("is-plain"), undefined, 1.43)
    .to(s, { slotW: chipWidths[0], duration: 0.42, ease: "expo.out" }, 1.42)
    .to(s, { show: 1, duration: 0.42, ease: "power2.out" }, 1.46)
    .fromTo(".q-item", { "--chip": 0 }, { "--chip": 1, duration: 0.34, ease: "power2.out" }, 1.42)
    .fromTo(s, { breath: -0.03 }, { breath: 0.03, duration: 2.1, ease: "none", overwrite: false }, 1.58);

  // The wheel leans a little before each roll, as if it had weight.
  let at = 1.72;
  for (let i = 1; i < chipWidths.length - 1; i++) {
    t.to(s, { wheel: i - 1 + 0.07, duration: 0.22, ease: "sine.inOut" }, at - 0.1);
    t.to(s, { wheel: i, duration: 0.34, ease: "expo.inOut" }, at + 0.12);
    t.to(s, { slotW: chipWidths[i], duration: 0.34, ease: "expo.inOut" }, at + 0.12);
    at += 0.34;
  }
  return t;
}

function searchScene(el: HTMLElement, q: Row) {
  const { s } = q;
  const find = el.querySelector<HTMLElement>(".q-find")!;
  const inner = el.querySelector<HTMLElement>(".q-find-in")!;
  const lead = el.querySelector<HTMLElement>(".q-lead")!;

  const t = gsap.timeline();
  t.set(find, { opacity: 1, yPercent: -50 }, 0)
    // A blue line runs along the end of the sentence and eats it.
    .to(find, { width: q.tailW, duration: 0.34, ease: "power2.inOut" }, 0.02)
    .fromTo(".q-tail", { "--eat": 0 }, { "--eat": 1, duration: 0.36, ease: "power2.inOut" }, 0.02)
    // The line opens into a glowing box and the start of the sentence leaves.
    .to(find, {
      height: "1.5em",
      width: inner.offsetWidth,
      backgroundColor: "rgba(120, 190, 255, 0.28)",
      borderRadius: "0.2em",
      duration: 0.44,
      ease: "expo.inOut",
    }, 0.32)
    .to(s, { endW: inner.offsetWidth, duration: 0.44, ease: "expo.inOut" }, 0.32)
    .to(s, { leadK: 0, duration: 0.56, ease: "expo.inOut" }, 0.32)
    .to(lead, { opacity: 0, filter: "blur(7px)", duration: 0.34, ease: "power2.in" }, 0.32)
    .to(inner, { opacity: 1, duration: 0.24 }, 0.5)
    // "Searching..." comes through a soft edge, not a hard wipe.
    .fromTo(".q-find-t", { "--rev": 0 }, { "--rev": 1, duration: 0.56, ease: "sine.inOut" }, 0.5)
    .to(".q-spin", { rotate: 900, duration: 1.3, ease: "none" }, 0.3)
    .to(find, { boxShadow: "0 0 0 0 rgba(44,139,255,0), 0 0 30px 6px rgba(90,170,255,0)", duration: 0.42, ease: "power1.inOut" }, 0.78)
    .to(s, { x: q.size * -0.05, duration: 0.8, ease: "none" }, 0.4);
  return t;
}

function cardsScene(el: HTMLElement, q: Row) {
  const { s } = q;
  const cards = gsap.utils.toArray<HTMLElement>(".pc", el);
  const W = cards[0]?.offsetWidth || 340;
  const chip = q.chipWidths[q.chipWidths.length - 2]; // all that's left of the row
  const zoom = 0.62;
  const room = (innerWidth - W) / 2 - 8;
  const aside = W / 2 + (chip * zoom) / q.built / 2 + 14;
  const beat = 0.42; // gap between one card and the next

  const t = gsap.timeline();
  t.set(".op-cards", { opacity: 1 })
    // The box swells and dissolves as the first card lands.
    .to(".q-find", { opacity: 0, scale: 1.1, filter: "blur(9px)", duration: 0.2, ease: "power2.in" }, 0)
    .to(s, { endW: 0, duration: 0.5, ease: "expo.out" }, 0.1)
    .to(s, { zoom, breath: 0, x: -Math.min(aside, W / 2 + room), show: 0, duration: 0.72, ease: "expo.out" }, 0.04)
    // The whole stack keeps sinking away from the camera.
    .fromTo(".op-cards", { scale: 1.05 }, { scale: 0.93, duration: 2.5, ease: "none" }, 0);

  cards.forEach((card, i) => {
    const at = 0.1 + i * beat;
    const poster = {
      fig: card.querySelector(".pc-fig"),
      line: card.querySelector(".pc-line"),
      motif: card.querySelector(".pc-motif"),
      tag: card.querySelector(".pc-tag"),
    };
    t.set(card, { zIndex: i + 1 }, at);
    t.fromTo(card, { opacity: 0 }, { opacity: 1, duration: 0.18, ease: "power1.out" }, at);
    t.fromTo(card, { x: W * 0.3 }, { x: i === 0 ? 0 : W * 0.18, duration: 0.86, ease: "expo.out" }, at);
    t.fromTo(card, { scale: 1.16 }, { scale: 1, duration: 0.86, ease: "power3.out" }, at);
    t.fromTo(card, { filter: "blur(18px)" }, { filter: SHARP, duration: 0.5, ease: "power2.out" }, at);
    // Inside the poster, each layer settles at its own speed.
    t.fromTo(poster.fig, { yPercent: 14 }, { yPercent: 0, duration: 0.86, ease: "expo.out" }, at);
    t.fromTo(poster.line, { y: 12, opacity: 0 }, { y: 0, opacity: 1, duration: 0.62, ease: "expo.out" }, at + 0.1);
    t.fromTo(poster.motif, { scale: 0.84, rotate: -6 }, { scale: 1, rotate: 0, duration: 1, ease: "expo.out" }, at);
    t.fromTo(poster.tag, { opacity: 0, filter: "blur(3px)" }, { opacity: 1, filter: SHARP, duration: 0.4, ease: "power2.out" }, at + 0.1);
    // The card before it slides back to peek out from behind, and softens.
    if (i > 0) {
      t.to(cards[i - 1], { x: -W * 0.36, scale: 0.9, duration: 0.8, ease: "expo.out" }, at);
    }
    if (i > 1) {
      t.to(cards[i - 2], { x: -W * 0.6, scale: 0.8, opacity: 0, filter: "blur(8px)", duration: 0.4, ease: "power2.in" }, at);
    }
  });
  // The chip bows out before the second card can slide over it.
  t.to(".op-q", { opacity: 0, filter: "blur(5px)", duration: 0.2, ease: "power2.in" }, 0.1 + beat * 0.7);
  t.to({}, { duration: 0.16 });
  return t;
}

function endScene(el: HTMLElement) {
  const face = el.querySelector<HTMLElement>(".e-face")!;
  const shift = (face.offsetWidth + parseFloat(getComputedStyle(face).marginLeft)) / 2;

  const t = gsap.timeline();
  t.set(".op-end", { opacity: 1 })
    .fromTo(".e-fall", { yPercent: -100 }, { yPercent: 0, duration: 0.46, ease: "power2.in" }, 0)
    .to(".op-cards", { filter: "blur(10px)", duration: 0.36, ease: "power2.in" }, 0.04)
    .set(".op-cards", { display: "none" }, 0.48)
    // The word lands big and soft, and takes a long time to settle.
    .fromTo(".e-word", { opacity: 0, filter: "blur(9px)" }, { opacity: 1, filter: SHARP, duration: 0.42, ease: "power2.out" }, 0.28)
    .fromTo(".e-line", { scale: 1.12, y: 14 }, { scale: 1, y: 0, duration: 1.5, ease: "expo.out" }, 0.28)
    .to(".e-line", { scale: 0.975, duration: 1.4, ease: "none" }, 1.1)
    // Her face blooms out of a glow and nudges the word aside.
    .to(".e-line", { x: -shift, duration: 0.8, ease: "expo.out" }, 0.9)
    .fromTo(".e-face img", { opacity: 0, scale: 0.35, filter: "blur(9px)" }, { opacity: 1, scale: 1, filter: SHARP, duration: 0.74, ease: "power4.out" }, 0.9)
    .fromTo(".e-halo", { opacity: 0, scale: 0.3 }, { opacity: 0.85, scale: 1, duration: 0.9, ease: "power3.out" }, 0.92)
    .to(".e-halo", { opacity: 0.5, scale: 1.25, duration: 1, ease: "sine.inOut" }, 1.8);
  return t;
}
