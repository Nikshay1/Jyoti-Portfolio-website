import { gsap } from "gsap";

// A short opening: a search box types a query, an overview answer streams
// in, and Jyoti's site is the top result. Then the page wipes up to the
// real site. Plays once per browser session; any key or click skips it.
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

  const q = el.querySelector<HTMLElement>(".sq")!;
  const ov = el.querySelector<HTMLElement>(".ov-text")!;
  const query = q.dataset.text ?? "";
  const words = (ov.dataset.text ?? "").split(" ");

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    onDone();
  };

  const typed = { n: 0 };
  const streamed = { n: 0 };

  const tl = gsap.timeline({ delay: 0.3 });
  tl.to(".sbox", { opacity: 1, y: 0, duration: 0.8, ease: "expo.out", startAt: { y: 18 } })
    .to(typed, {
      n: query.length,
      duration: query.length * 0.05,
      ease: "none",
      onUpdate: () => (q.textContent = query.slice(0, Math.round(typed.n))),
    }, "+=0.15")
    .to(".sbox", { scale: 0.985, duration: 0.09, yoyo: true, repeat: 1, ease: "power1.inOut" }, "+=0.3")
    .to(".serp", { height: "auto", duration: 0.9, ease: "expo.inOut" })
    .to(streamed, {
      n: words.length,
      duration: words.length * 0.045,
      ease: "none",
      onUpdate: () => (ov.textContent = words.slice(0, Math.round(streamed.n)).join(" ")),
    }, "-=0.35")
    .to(".res", { opacity: 1, y: 0, startAt: { y: 12 }, duration: 0.7, stagger: 0.09, ease: "expo.out" }, "-=0.5")
    .add(wipe, "+=0.9");

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
