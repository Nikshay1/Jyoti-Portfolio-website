// The halftone flowers at the very bottom of the page, from the
// halftone-flowers library (MIT, Lucas Jin), vendored in src/vendor.
//
// Two steps keep it out of the way. The engine's code is only fetched once
// the band is within 800px of the screen. The field itself is only built
// once the band is actually on screen, because it grows in the moment it is
// built (and the engine pauses itself while off screen, so a field built
// early would spend its grow-in unseen).

// Picked by looking at a few; the same seed grows the same composition.
const SEED = 23;

// Just after the 1.5s grow-in.
const FIRST_BUTTERFLY_MS = 2000;

// The library's own blue ramp, on the page's paper so the canvas blends into
// the page with no visible edge.
const COLORS = {
  background: "#f7f7f5",
  light: "#a9c5ef",
  ink: "#3a6fd8",
  dark: "#16295f",
};

function options(width: number) {
  const phone = width < 600;
  return {
    seed: SEED,
    colors: COLORS,
    cell: phone ? 5 : 6,
    density: phone ? 0.9 : 0.55,
    // The system cursor (and the site's own dot) stays; no pointer mark.
    pointer: false,
    settings: {
      layout: {
        // Big enough to read as flowers on a short, wide band.
        flowerSize: { share: 0.16, min: 40, max: 90 },
        bouquet: { reach: [0.6, 0.8] as [number, number] },
        meadow: { height: [0.42, 0.18] as [number, number] },
      },
      // Mostly butterflies, a few bees. The cursor tail needs no setting: it
      // is drawn on this canvas, so it can't appear anywhere else on the page.
      insects: { every: 10, most: 2, odds: [3, 1] as [number, number] },
    },
  };
}

export function initFlowers() {
  const band = document.querySelector<HTMLElement>(".sf-flowers");
  const canvas = band?.querySelector("canvas");
  if (!band || !canvas) return;

  const near = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      near.disconnect();
      const engine = import("../vendor/halftone-flowers/flowers/index");

      const seen = new IntersectionObserver(
        ([e]) => {
          if (!e.isIntersecting) return;
          seen.disconnect();
          void engine.then(({ FlowerEngine, FieldEmitter }) => {
            const field = new FlowerEngine(canvas, options(band.clientWidth), new FieldEmitter());
            // Don't make the first visitor wait for a random arrival.
            setTimeout(() => field.release("butterfly"), FIRST_BUTTERFLY_MS);
          });
        },
        { threshold: 0.2 },
      );
      seen.observe(band);
    },
    { rootMargin: "800px" },
  );
  near.observe(band);
}
