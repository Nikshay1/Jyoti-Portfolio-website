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

// The page's own paper and ink, so the band reads as the same print as the
// text and the canvas blends into the page with no visible edge.
const COLORS = {
  background: "#f7f7f5",
  light: "#c2c2bd",
  ink: "#2e2e2c",
  dark: "#0e0e0e",
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
      // No butterflies or bees, no pointer trail. Stems still lean away from
      // the cursor, and a click still shakes petals off.
      insects: { enabled: false },
      trail: { enabled: false },
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
            new FlowerEngine(canvas, options(band.clientWidth), new FieldEmitter());
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
