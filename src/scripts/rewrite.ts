import { ScrollTrigger } from "gsap/ScrollTrigger";

// While this section is pinned, scrolling deletes the bland "before"
// sentence letter by letter and types the "after" one in its place.
export function initRewrite(animate: boolean) {
  const sec = document.querySelector<HTMLElement>(".rewrite");
  if (!sec) return;
  if (!animate) {
    sec.classList.add("is-static");
    return;
  }

  const text = sec.querySelector<HTMLElement>(".rw-text")!;
  const out = sec.querySelector<HTMLElement>(".rw-out")!;
  const state = sec.querySelector<HTMLElement>(".rw-state")!;
  const count = sec.querySelector<HTMLElement>(".rw-words")!;
  const bar = sec.querySelector<HTMLElement>(".rw-bar i")!;
  const before = text.dataset.before ?? "";
  const after = text.dataset.after ?? "";

  const words = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0);
  let last = "";

  const render = (p: number) => {
    let s: string;
    let phase: "before" | "after";
    let label: string;
    if (p < 0.12) {
      [s, phase, label] = [before, "before", "Before"];
    } else if (p < 0.45) {
      const k = (p - 0.12) / 0.33;
      [s, phase, label] = [before.slice(0, Math.round(before.length * (1 - k))), "before", "Editing"];
    } else if (p < 0.88) {
      const k = (p - 0.45) / 0.43;
      [s, phase, label] = [after.slice(0, Math.round(after.length * k)), "after", "Rewriting"];
    } else {
      [s, phase, label] = [after, "after", "After"];
    }

    bar.style.transform = `scaleX(${p})`;
    const key = `${s}|${label}`;
    if (key === last) return;
    last = key;
    out.textContent = s;
    text.classList.toggle("is-before", phase === "before");
    text.classList.toggle("is-after", phase === "after");
    state.textContent = label;
    count.textContent = String(words(s));
  };

  render(0);
  ScrollTrigger.create({
    trigger: sec,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => render(self.progress),
  });
}
