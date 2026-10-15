import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// The name fills the screen width at the top of the page. Scrolling the
// first ~screen folds "YOTI" and "HAUHAN" away and shrinks the initials
// into a small corner header.
export function initName() {
  const bar = document.querySelector<HTMLElement>(".bar");
  const name = bar?.querySelector<HTMLElement>(".name");
  if (!bar || !name) return;

  const rests = [...name.querySelectorAll<HTMLElement>(".rest")];
  const root = document.documentElement;
  const SMALL = 22;
  let big = 100;
  let restEm: number[] = [];
  let progress = 0;

  const apply = () => {
    const e = gsap.parseEase("power2.inOut")(progress);
    name.style.fontSize = `${big + (SMALL - big) * e}px`;
    name.style.setProperty("--p", String(e));
    rests.forEach((r, i) => (r.style.width = `${restEm[i] * (1 - e)}em`));
    bar.classList.toggle("is-small", progress > 0.98);
  };

  const measure = () => {
    name.style.fontSize = "100px";
    rests.forEach((r) => (r.style.width = "auto"));
    restEm = rests.map((r) => r.getBoundingClientRect().width / 100);
    const words = [...name.querySelectorAll<HTMLElement>(".w")];
    const natural = words.reduce((sum, w) => sum + w.getBoundingClientRect().width, 0);
    const avail = bar.clientWidth - parseFloat(getComputedStyle(bar).paddingLeft) * 2;
    // Keep a gap of about a quarter of a letter between the two words.
    big = (100 * avail) / (natural + 25);
    root.style.setProperty("--name-h", `${big * 0.84}px`);
    apply();
  };

  measure();
  ScrollTrigger.create({
    start: 0,
    end: () => Math.max(window.innerHeight * 0.4, big * 1.4),
    onUpdate: (self) => {
      progress = self.progress;
      apply();
    },
  });
  ScrollTrigger.addEventListener("refreshInit", measure);

  // Hide the section links once the footer reaches the top, so they don't
  // sit on top of its column headings. The initials stay.
  const foot = document.querySelector(".site-foot");
  if (foot)
    ScrollTrigger.create({
      trigger: foot,
      start: "top 80px",
      onToggle: (self) => bar.classList.toggle("over-foot", self.isActive),
    });
}
