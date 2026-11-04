import { ScrollTrigger } from "gsap/ScrollTrigger";
import { makeGoo } from "./goo";

// While this section is pinned, scrolling melts the bland "before" sentence
// into ink until it is gone, then the "after" sentence forms out of the ink.
export function initRewrite(animate: boolean) {
  const sec = document.querySelector<HTMLElement>(".rewrite");
  if (!sec) return;
  if (!animate) {
    sec.classList.add("is-static");
    return;
  }

  const before = sec.querySelector<HTMLElement>(".rw-before")!;
  const after = sec.querySelector<HTMLElement>(".rw-after")!;
  const state = sec.querySelector<HTMLElement>(".rw-state")!;
  const gooBefore = makeGoo(before);
  const gooAfter = makeGoo(after);

  const ramp = (p: number, from: number, to: number) => Math.min(1, Math.max(0, (p - from) / (to - from)));

  const render = (p: number) => {
    const melting = p < 0.5;
    before.style.visibility = melting ? "" : "hidden";
    after.style.visibility = melting ? "hidden" : "";
    state.textContent = melting ? "Before" : "After";
    if (melting) gooBefore.set(ramp(p, 0.16, 0.5) ** 1.6);
    else gooAfter.set((1 - ramp(p, 0.5, 0.84)) ** 1.6);
  };

  render(0);
  ScrollTrigger.create({
    trigger: sec,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => render(self.progress),
  });
}
