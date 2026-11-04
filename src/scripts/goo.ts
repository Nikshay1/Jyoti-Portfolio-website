import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

// Text that forms out of ink: a heavy blur, then a hard alpha threshold, so
// letters melt together into solid blobs. Taking the blur away settles the
// blobs back into sharp, readable text.

const SVG = "http://www.w3.org/2000/svg";
const AMP = 20;
const OFF = -8;
// Blur at full melt, relative to the font size. At this size the ink is too
// thin to pass the threshold, so the text has vanished altogether.
const SPREAD = 0.55;

// Safari won't repaint an animated SVG filter on HTML reliably.
const noFilters = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

let defs: SVGSVGElement | null = null;
let uid = 0;

export type Goo = {
  /** 0 is sharp text, 1 is fully melted away. */
  set: (k: number) => void;
};

export function makeGoo(el: HTMLElement): Goo {
  if (noFilters) return { set: (k) => (el.style.opacity = String(1 - k)) };

  if (!defs) {
    defs = document.createElementNS(SVG, "svg");
    defs.setAttribute("aria-hidden", "true");
    defs.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
    document.body.prepend(defs);
  }
  const id = `goo-${++uid}`;
  const filter = document.createElementNS(SVG, "filter");
  filter.id = id;
  filter.setAttribute("x", "-10%");
  filter.setAttribute("y", "-50%");
  filter.setAttribute("width", "120%");
  filter.setAttribute("height", "200%");
  filter.setAttribute("color-interpolation-filters", "sRGB");
  const blur = document.createElementNS(SVG, "feGaussianBlur");
  const matrix = document.createElementNS(SVG, "feColorMatrix");
  filter.append(blur, matrix);
  defs.append(filter);

  const max = () => parseFloat(getComputedStyle(el).fontSize) * SPREAD;
  let last = -1;

  return {
    set(k) {
      if (k === last) return;
      last = k;
      if (k <= 0) {
        el.style.filter = "";
        return;
      }
      // The threshold eases off only in the last stretch, so the blobs stay
      // solid until they are nearly letters.
      const t = Math.min(1, k / 0.3);
      blur.setAttribute("stdDeviation", String(k * max()));
      matrix.setAttribute(
        "values",
        `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 ${1 + (AMP - 1) * t} ${OFF * t}`,
      );
      el.style.filter = `url(#${id})`;
    },
  };
}

// Hide every [data-goo] block and play it when it scrolls into view. The hero
// waits for the opening film instead, through playGoo().
export function initGoo() {
  document.querySelectorAll<HTMLElement>("[data-goo]").forEach((el) => {
    el.style.visibility = "hidden";
    if (el.dataset.goo === "hero") return;
    ScrollTrigger.create({
      trigger: el,
      start: "top 86%",
      once: true,
      onEnter: () => playGoo(el),
    });
  });
}

export function playGoo(el: HTMLElement | null, delay = 0) {
  if (!el) return;
  // Long paragraphs are split only now, so a resize before this can't leave
  // stale line breaks behind. Hand-set lines are already separate.
  const handset = [...el.querySelectorAll<HTMLElement>(":scope > .ln")];
  const split = handset.length ? null : SplitText.create(el, { type: "lines", linesClass: "line" });
  const lines = handset.length ? handset : (split!.lines as HTMLElement[]);
  const goos = lines.map(makeGoo);
  goos.forEach((g) => g.set(1));
  el.style.visibility = "";

  const tl = gsap.timeline({ delay, onComplete: () => split?.revert() });
  goos.forEach((g, i) => {
    const s = { k: 1 };
    tl.to(s, { k: 0, duration: 1.3, ease: "power2.out", onUpdate: () => g.set(s.k <= 0.002 ? 0 : s.k) }, i * 0.1);
  });
}
