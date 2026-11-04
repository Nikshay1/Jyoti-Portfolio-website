import { gsap } from "gsap";

// Hovering a work row wipes its poster in from the top, and leaving wipes it
// away through the bottom edge.
const SHOWN = "inset(0% 0% 0% 0%)";
const BEFORE = "inset(100% 0% 0% 0%)";
const AFTER = "inset(0% 0% 100% 0%)";
const HEADER = 72;
const MARGIN = 16;

export function initPosters(reduced: boolean) {
  let z = 1;
  const duration = reduced ? 0 : 0.45;

  document.querySelectorAll<HTMLElement>(".ix-row").forEach((row) => {
    const poster = row.querySelector<HTMLElement>(".ix-poster");
    if (!poster) return;

    row.addEventListener("pointerenter", () => {
      // Centre on the row, but keep the whole poster on screen.
      const box = row.getBoundingClientRect();
      const h = poster.offsetHeight;
      const top = gsap.utils.clamp(HEADER, innerHeight - h - MARGIN, box.top + box.height / 2 - h / 2);
      poster.style.top = `${top - box.top}px`;

      // The newest poster sits above one that is still wiping away.
      row.style.zIndex = String(++z);
      gsap.fromTo(
        poster,
        { clipPath: BEFORE, scale: 0.94 },
        { clipPath: SHOWN, scale: 1, duration, ease: "power3.out", overwrite: true },
      );
    });

    row.addEventListener("pointerleave", () => {
      gsap.to(poster, { clipPath: AFTER, scale: 0.94, duration, ease: "power3.out", overwrite: true });
    });
  });
}
