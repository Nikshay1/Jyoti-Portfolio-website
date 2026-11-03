import { gsap } from "gsap";

// The opening film, plays once per browser session; any key or click skips it.
//   1. A browser bar loads, its loading line turns into a dot, the dot drops
//      into the bar as the caret and types.
//   2. The bar becomes a glass strip over a blurred photo of Jyoti, with the
//      tagline.
//   3. The photo shrinks into an "Ask AI" chip.
//   4. A question types itself with the camera following, then pulls back to
//      show a wheel of page types.
//   5. The end of the question is wiped away by a blue line that opens into
//      "Searching...".
//   6. Her results arrive as a stack of posters.
//   7. Black falls over the page, "Hire Jyoti" and her face. Then the site.
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

  const q = questionState(el);
  const tl = gsap.timeline({ onUpdate: q.render });
  tl.add(pillScene(el), 0)
    .add(bandScene(el), 2.75)
    .add(questionScene(q), 4.85)
    .add(searchScene(el), ">")
    .add(cardsScene(el, q), ">-0.05")
    .add(endScene(el), ">-0.15")
    .add(wipe, ">0.15");

  function wipe() {
    gsap.to(el!, {
      clipPath: "inset(0% 0% 100% 0%)",
      duration: 1.1,
      ease: "expo.inOut",
      onComplete: () => {
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

const BLUR_OFF = "blur(0px)";

function pillScene(el: HTMLElement) {
  const scene = el.querySelector<HTMLElement>(".op-pill")!;
  const u = parseFloat(getComputedStyle(scene).fontSize);
  const typed = el.querySelector<HTMLElement>(".pl-typed")!;
  const text = typed.dataset.text ?? "";
  const count = { n: 0 };

  const t = gsap.timeline();
  t.set(scene, { opacity: 1 })
    .set(".pl-mark", { xPercent: -50, yPercent: -50, y: u * 2.7 })
    .fromTo(
      ".pl-in",
      { opacity: 0, scale: 0.92, filter: "blur(8px)" },
      { opacity: 1, scale: 1, filter: BLUR_OFF, duration: 0.42, stagger: 0.05, ease: "power3.out" },
      0.12,
    )
    // The loading line: grows in black, runs a colour sweep, goes black again.
    .to(".pl-mark", { width: u * 8.5, duration: 0.4, ease: "power2.out" }, 0.12)
    .to(".pl-mark i", { opacity: 1, duration: 0.14 }, 0.45)
    .fromTo(".pl-mark i", { backgroundPosition: "0% 0" }, { backgroundPosition: "200% 0", duration: 0.75, ease: "none" }, 0.4)
    .to(".pl-mark i", { opacity: 0, duration: 0.12 }, 1.0)
    // It gathers into a dot that hops above the bar and waits there.
    .to(".pl-mark", { width: u * 0.62, height: u * 0.62, y: u * -2.5, duration: 0.3, ease: "expo.inOut" }, 1.1)
    .fromTo(".pl-mark", { filter: "blur(2px)" }, { filter: BLUR_OFF, duration: 0.3 }, 1.2)
    .to(".pl-mark", { y: u * -2.8, duration: 0.45, ease: "sine.inOut", yoyo: true, repeat: 1 }, 1.4)
    // Then it falls into the bar and stretches into the caret.
    .to(".pl-tabs, .pl-ph", { opacity: 0, duration: 0.14 }, 1.98)
    .to(".pl-mark", { y: 0, width: 3, height: u * 1.4, borderRadius: 1, duration: 0.2, ease: "power3.in" }, 1.98)
    .to(".pl-bar", { width: u * 16, duration: 0.34, ease: "expo.out" }, 2.14)
    .to(".pl", { scale: 1.42, duration: 0.34, ease: "expo.out" }, 2.14)
    .fromTo(".pl", { filter: "blur(3px)" }, { filter: BLUR_OFF, duration: 0.2 }, 2.14)
    .set(".pl-mark", { opacity: 0 }, 2.22)
    .set(".pl-input", { opacity: 1 }, 2.22)
    .to(count, {
      n: text.length,
      duration: 0.4,
      ease: "none",
      onUpdate: () => (typed.textContent = text.slice(0, Math.round(count.n))),
    }, 2.34)
    .to(scene, { opacity: 0, filter: "blur(10px)", duration: 0.16 }, 2.76)
    .set(scene, { display: "none" });
  return t;
}

function bandScene(el: HTMLElement) {
  const scene = el.querySelector<HTMLElement>(".op-band")!;
  const letters = gsap.utils.toArray<HTMLElement>(".b-ch", el);
  const start = (el.querySelector(".b-word")?.textContent ?? "").length;
  const count = { n: start };
  letters.forEach((c, i) => (c.style.visibility = i < start ? "visible" : "hidden"));

  const W = innerWidth;
  const H = innerHeight;
  const rect = (w: number, h: number) => `inset(${(H - h) / 2}px ${(W - w) / 2}px)`;
  const cardW = Math.min(240, W * 0.5);

  const t = gsap.timeline();
  t.set(scene, { opacity: 1 })
    .set(".b-clip", { clipPath: rect(W, H) })
    .fromTo(".b-strip", { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: BLUR_OFF, duration: 0.14 }, 0)
    .to(count, {
      n: letters.length,
      duration: 0.42,
      ease: "none",
      onUpdate: () => {
        const n = Math.round(count.n);
        letters.forEach((c, i) => (c.style.visibility = i < n ? "visible" : "hidden"));
      },
    }, 0.03)
    // The photo comes up behind the strip and the strip turns to clear glass.
    .to(".b-veil", { opacity: 0, duration: 0.42, ease: "power2.inOut" }, 0.26)
    .to(".b-glass", { opacity: 0, duration: 0.42, ease: "power2.inOut" }, 0.3)
    .to(".b-caret", { opacity: 0, duration: 0.05 }, 0.6)
    // The words drift apart and blink out, last one first.
    .to(".b-word", { x: (i: number) => i * 12, duration: 0.45, ease: "power2.in" }, 0.72)
    .to(".b-word", { opacity: 0, filter: "blur(5px)", duration: 0.16, stagger: { each: 0.06, from: "end" } }, 0.92)
    // Everything shrinks to a card holding "Ask AI"...
    .to(".b-clip", { clipPath: rect(cardW, cardW * 0.4), duration: 0.34, ease: "expo.inOut" }, 1.05)
    .to(".b-img", { scale: 0.5, duration: 0.34, ease: "expo.inOut" }, 1.05)
    .to(".b-veil", { opacity: 0.42, duration: 0.3 }, 1.15)
    .set(".b-strip", { opacity: 0 }, 1.3)
    .fromTo(".b-ask", { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: BLUR_OFF, duration: 0.25 }, 1.28)
    // ...then to a small chip of glass, which the question grows out of.
    .to(".b-ask", { opacity: 0, filter: "blur(4px)", duration: 0.14 }, 1.66)
    .to(".b-clip", { clipPath: rect(cardW * 0.34, cardW * 0.15), duration: 0.34, ease: "expo.inOut" }, 1.58)
    .to(".b-img", { scale: 0.26, rotate: -18, duration: 0.42, ease: "expo.inOut" }, 1.58)
    .to(scene, { opacity: 0, filter: "blur(6px)", duration: 0.14 }, 2.02)
    .set(scene, { display: "none" });
  return t;
}

// The question is one row of characters. A plain state object says how much
// has been typed and where the camera is, and render() draws it each tick.
function questionState(el: HTMLElement) {
  const scene = el.querySelector<HTMLElement>(".op-q")!;
  const cam = el.querySelector<HTMLElement>(".q-cam")!;
  const slot = el.querySelector<HTMLElement>(".q-slot")!;
  const items = gsap.utils.toArray<HTMLElement>(".q-item", el);
  const letters = gsap.utils.toArray<HTMLElement>(".q-ch", el);
  const whip = el.querySelector("#op-whip feGaussianBlur")!;

  // Measured with the camera at rest: every character's position relative to
  // the middle of the row, and each wheel entry's width.
  const chipWidths = (() => {
    slot.classList.remove("is-plain");
    const w = items.map((i) => i.offsetWidth);
    slot.classList.add("is-plain");
    return w;
  })();
  const plainWidth = items[0].offsetWidth;
  slot.style.width = `${plainWidth}px`;
  const row = el.querySelector<HTMLElement>(".q-line")!.getBoundingClientRect();
  const mid = row.left + row.width / 2;
  const stops = letters.map((c) => c.getBoundingClientRect().right - mid);
  const first = letters[0].getBoundingClientRect().left - mid;
  letters.forEach((c) => (c.style.visibility = "hidden"));

  const s = {
    n: 0, // characters typed
    zoom: 1,
    follow: 0, // 0: keep what's typed centred. 1: chase the typing head.
    home: 0, // 1: camera back on the middle of the row
    x: 0, // screen offset once the row slides aside for the cards
    blur: 0,
    wheel: 0, // position of the page-type wheel
    show: 0, // how visible the neighbours on the wheel are
  };

  let drawn = 0;
  let whipOn = false;
  const render = () => {
    const n = Math.round(s.n);
    for (; drawn < n; drawn++) letters[drawn].style.visibility = "visible";

    const head = n > 0 ? stops[Math.min(n, stops.length) - 1] : first;
    const centred = (first + head) / 2;
    const chase = head - innerWidth * 0.14 / s.zoom;
    const focus = (centred + (chase - centred) * s.follow) * (1 - s.home);
    cam.style.transform = `translateX(${s.x}px) scale(${s.zoom}) translateX(${-focus}px)`;

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
      item.style.transform = `translateY(${d * 1.3}em) scale(${1 - far * 0.12})`;
      item.style.opacity = String(far < 0.5 ? seen : seen * s.show);
      item.style.filter = far > 0.15 ? `blur(${far * 1.6}px)` : "none";
    });
  };

  return { s, scene, slot, render, total: letters.length, chipWidths };
}

function questionScene(q: ReturnType<typeof questionState>) {
  const { s, scene, slot, chipWidths, total } = q;
  const firstWords = "who can".length;

  const t = gsap.timeline();
  t.set(scene, { opacity: 1 })
    .fromTo(".q-line", { color: "#6f8db5" }, { color: "#0e0e0e", duration: 0.34 }, 0)
    .to(s, { n: 3, duration: 0.1, ease: "none" }, 0.02)
    .to(s, { n: firstWords, duration: 0.14, ease: "none" }, 0.36)
    // The camera whips in and follows the typing.
    .to(s, { zoom: 2.25, follow: 1, duration: 0.22, ease: "expo.inOut" }, 0.56)
    .to(s, { blur: 28, duration: 0.11, ease: "power2.in", yoyo: true, repeat: 1 }, 0.56)
    .to(s, { n: total, duration: 0.56, ease: "none" }, 0.62)
    // It whips back out and the slot turns into a chip on a wheel.
    .to(s, { blur: 34, duration: 0.11, ease: "power2.in", yoyo: true, repeat: 1 }, 1.32)
    .to(s, { zoom: 1, home: 1, duration: 0.22, ease: "expo.inOut" }, 1.32)
    .call(() => slot.classList.remove("is-plain"), undefined, 1.43)
    .to(slot, { width: chipWidths[0], duration: 0.2, ease: "expo.out" }, 1.43)
    .to(s, { show: 1, duration: 0.2 }, 1.45)
    .fromTo(".q-item", { "--chip": 0 }, { "--chip": 1, duration: 0.2 }, 1.43);
  // The wheel rolls down to its second-to-last entry, so one still shows below.
  for (let i = 1; i < chipWidths.length - 1; i++) {
    const at = 1.92 + (i - 1) * 0.28;
    t.to(s, { wheel: i, duration: 0.28, ease: "power3.inOut" }, at);
    t.to(slot, { width: chipWidths[i], duration: 0.28, ease: "power3.inOut" }, at);
  }
  return t;
}

function searchScene(el: HTMLElement) {
  const end = el.querySelector<HTMLElement>(".q-end")!;
  const lead = el.querySelector<HTMLElement>(".q-lead")!;
  const tailWidth = end.offsetWidth;
  const inner = el.querySelector<HTMLElement>(".q-find-in")!;

  const t = gsap.timeline();
  t.set(end, { width: () => end.offsetWidth })
    // A blue line runs along the end of the sentence and eats it.
    .set(".q-find", { opacity: 1 }, 0.05)
    .to(".q-find", { width: tailWidth, duration: 0.3, ease: "power2.inOut" }, 0.05)
    .to(".q-tail", { clipPath: "inset(-20% -5% -20% 100%)", duration: 0.3, ease: "power2.inOut" }, 0.05)
    // The line opens into a glowing box and the start of the sentence leaves.
    .to(".q-find", {
      height: "1.5em",
      width: () => inner.scrollWidth,
      backgroundColor: "rgba(120, 190, 255, 0.28)",
      borderRadius: "0.2em",
      duration: 0.34,
      ease: "expo.inOut",
    }, 0.36)
    .to(end, { width: () => inner.scrollWidth, duration: 0.34, ease: "expo.inOut" }, 0.36)
    .to(lead, { width: 0, opacity: 0, duration: 0.42, ease: "expo.inOut" }, 0.36)
    .to(".q-find-in", { opacity: 1, duration: 0.2 }, 0.52)
    .fromTo(".q-find-t", { clipPath: "inset(-20% 100% -20% 0%)" }, { clipPath: "inset(-20% -5% -20% 0%)", duration: 0.42, ease: "power1.inOut" }, 0.52)
    .to(".q-spin", { rotate: 720, duration: 1, ease: "none" }, 0.4)
    .to(".q-find", { boxShadow: "0 0 0 0 rgba(90, 170, 255, 0)", duration: 0.24 }, 0.9);
  return t;
}

function cardsScene(el: HTMLElement, q: ReturnType<typeof questionState>) {
  const cards = gsap.utils.toArray<HTMLElement>(".pc", el);
  const W = cards[0]?.offsetWidth || 340;
  const chip = q.chipWidths[q.chipWidths.length - 2]; // all that's left of the row
  const zoom = 0.62;
  const room = (innerWidth - W) / 2 - 8;
  const aside = W / 2 + (chip * zoom) / 2 + 14;
  const scene = el.querySelector<HTMLElement>(".op-cards")!;
  const beat = 0.42; // gap between one card and the next

  const t = gsap.timeline();
  t.set(scene, { opacity: 1 })
    .to(".q-find", { opacity: 0, filter: "blur(6px)", duration: 0.16 }, 0)
    .to(".q-end", { width: 0, duration: 0.3, ease: "expo.inOut" }, 0.02)
    .to(q.s, { zoom, x: -Math.min(aside, W / 2 + room), show: 0, duration: 0.42, ease: "expo.out" }, 0.04);

  cards.forEach((card, i) => {
    const at = 0.1 + i * beat;
    t.set(card, { zIndex: i + 1 }, at);
    t.fromTo(
      card,
      { opacity: 0, x: W * 0.32, scale: 0.86, filter: "blur(14px)" },
      { opacity: 1, x: i === 0 ? 0 : W * 0.18, scale: 1, filter: BLUR_OFF, duration: 0.44, ease: "expo.out" },
      at,
    );
    // The card before it slides back to peek out from behind.
    if (i > 0) t.to(cards[i - 1], { x: -W * 0.36, scale: 0.9, duration: 0.44, ease: "expo.out" }, at);
    if (i > 1) t.to(cards[i - 2], { x: -W * 0.62, scale: 0.8, opacity: 0, filter: "blur(6px)", duration: 0.34 }, at);
  });
  t.to(".op-q", { opacity: 0, duration: 0.2 }, 0.1 + beat * 1.5);
  t.to({}, { duration: 0.2 });
  return t;
}

function endScene(el: HTMLElement) {
  const face = el.querySelector<HTMLElement>(".e-face")!;
  const faceWidth = face.scrollWidth;

  const t = gsap.timeline();
  t.set(".op-end", { opacity: 1 })
    .fromTo(".e-fall", { yPercent: -100 }, { yPercent: 0, duration: 0.42, ease: "power2.in" }, 0)
    .to(".op-cards", { scale: 0.94, filter: "blur(8px)", duration: 0.34, ease: "power2.in" }, 0.02)
    .set(".op-cards", { display: "none" }, 0.44)
    .fromTo(".e-word", { opacity: 0, y: 12, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: BLUR_OFF, duration: 0.5, ease: "expo.out" }, 0.3)
    .fromTo(face, { width: 0, marginLeft: 0 }, { width: faceWidth, marginLeft: "0.28em", duration: 0.46, ease: "expo.out" }, 0.86)
    .fromTo(".e-face img", { scale: 0, opacity: 0, filter: "blur(6px)" }, { scale: 1, opacity: 1, filter: BLUR_OFF, duration: 0.46, ease: "back.out(1.6)" }, 0.86)
    .fromTo(".e-face", { "--glow": 0 }, { "--glow": 1, duration: 0.7, ease: "power2.out" }, 0.9);
  return t;
}
