// The night sky at the bottom of the footer: a dot-matrix starfield that
// twinkles in small clusters, a dotted crescent moon and ringed planet, and
// a few small, dim planets far behind them.

const DOT = 7; // grid spacing for every dotted shape, in CSS pixels

// Distant planets: position as a fraction of the sky, radius in grid steps,
// and peak brightness. Kept small and faint so they read as far away.
const FAR = [
  { x: 0.36, y: 0.24, r: 5, ring: false, a: 0.4 },
  { x: 0.56, y: 0.74, r: 5.5, ring: true, a: 0.34 },
  { x: 0.7, y: 0.26, r: 4, ring: false, a: 0.3 },
];

type Cluster = { x: number; y: number; dots: [number, number][]; t: number; life: number };

export function initSpace() {
  const canvas = document.querySelector<HTMLCanvasElement>(".space");
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let clusters: Cluster[] = [];
  let moon: [number, number, number][] = [];
  let planet: [number, number, number][] = [];
  let far: [number, number, number][] = [];
  let time = 0;
  // Narrow screens zoom the whole sky out: a finer grid, smaller dots and
  // smaller shapes, so a phone shows the same scene instead of a close-up.
  let zoom = 1;
  let g = DOT;

  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  // --- static dotted shapes ------------------------------------------------

  function buildShapes() {
    moon = [];
    planet = [];
    const mr = Math.min(80, h * 0.2) * zoom;
    const mx = w * 0.12;
    const my = h * 0.42;
    for (let x = mx - mr; x <= mx + mr; x += g)
      for (let y = my - mr; y <= my + mr; y += g) {
        const gx = Math.round(x / g) * g;
        const gy = Math.round(y / g) * g;
        const d = Math.hypot(gx - mx, gy - my);
        const inner = Math.hypot(gx - (mx + mr * 0.42), gy - (my - mr * 0.08));
        if (d < mr && inner > mr * 0.95) moon.push([gx, gy, Math.min(1, (inner - mr * 0.95) / (mr * 0.45)) * 0.7 + 0.15]);
      }

    const pr = Math.min(110, h * 0.26) * zoom;
    const px = w * 0.8;
    const py = h - pr * 0.55;
    const tilt = -0.28;
    for (let gx = Math.floor((px - pr * 2.2) / g) * g; gx <= px + pr * 2.2; gx += g)
      for (let gy = Math.floor((py - pr * 1.4) / g) * g; gy <= h; gy += g) {
        const dx = gx - px;
        const dy = gy - py;
        const inside = Math.hypot(dx, dy) < pr;
        // Ring: an ellipse rotated by `tilt`.
        const rx = dx * Math.cos(tilt) + dy * Math.sin(tilt);
        const ry = -dx * Math.sin(tilt) + dy * Math.cos(tilt);
        const e = Math.hypot(rx / (pr * 2), ry / (pr * 0.42));
        const onRing = e > 0.82 && e < 1;
        if (inside) {
          // Lit from the upper right, with a sparse dither on the dark side.
          const light = Math.max(0, (dx * 0.6 - dy * 0.8) / pr);
          const a = 0.08 + light * 0.55;
          if (a > 0.12 || Math.round(gx / g + gy / g) % 2 === 0) planet.push([gx, gy, a]);
        } else if (onRing && !(ry < 0 && Math.hypot(dx, dy) < pr * 1.05)) {
          planet.push([gx, gy, 0.35]);
        }
      }

    far = [];
    for (const f of FAR) {
      const fr = f.r * g;
      const fx = Math.round((w * f.x) / g) * g;
      const fy = Math.round((h * f.y) / g) * g;
      const reach = f.ring ? fr * 2 : fr;
      for (let gx = fx - Math.ceil(reach / g) * g; gx <= fx + reach; gx += g)
        for (let gy = fy - Math.ceil(fr / g) * g; gy <= fy + fr; gy += g) {
          const dx = gx - fx;
          const dy = gy - fy;
          if (Math.hypot(dx, dy) < fr) {
            const light = Math.max(0, (dx * 0.6 - dy * 0.8) / fr);
            if (light > 0.15 || Math.round(gx / g + gy / g) % 2 === 0) far.push([gx, gy, f.a * (0.3 + light * 0.7)]);
          } else if (f.ring) {
            const rx = dx * Math.cos(0.3) + dy * Math.sin(0.3);
            const ry = -dx * Math.sin(0.3) + dy * Math.cos(0.3);
            const e = Math.hypot(rx / (fr * 1.9), ry / (fr * 0.5));
            if (e > 0.72 && e < 1.05) far.push([gx, gy, f.a * 0.6]);
          }
        }
    }
  }

  // --- twinkling clusters ----------------------------------------------------

  const PATTERNS: [number, number][][] = [
    [[0, 0]],
    [[0, 0], [1, 0]],
    [[0, 0], [0, 1], [1, 1]],
    [[0, 0], [1, 0], [0, 1], [1, 1]],
    [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
    [[0, 0], [2, 0], [1, 1], [0, 2], [2, 2]],
    [[0, 0], [0, 1], [0, 2], [1, 3]],
  ];

  function spawnCluster(age = 0): Cluster {
    const pattern = PATTERNS[Math.floor(Math.random() * PATTERNS.length)];
    return {
      x: Math.floor(rand(0, w) / g) * g,
      y: Math.floor(rand(0, h) / g) * g,
      dots: pattern,
      t: age,
      life: rand(3, 8),
    };
  }

  function resize() {
    const r = canvas!.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    w = r.width;
    h = r.height;
    zoom = Math.min(1, Math.max(0.55, w / 1100));
    g = DOT * zoom;
    canvas!.width = Math.round(w * dpr);
    canvas!.height = Math.round(h * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildShapes();
    const count = Math.round((w * h) / (9000 * zoom));
    clusters = Array.from({ length: count }, () => {
      const c = spawnCluster();
      c.t = rand(0, c.life);
      return c;
    });
    draw();
  }

  // --- drawing ---------------------------------------------------------------

  // Brightness is carried by a dot's size, not its opacity: every dot is
  // drawn at the same solid tone, and its area grows with brightness. Small
  // dots read as dim without the muddy grey that transparency gives.
  const FULL = 0.85; // brightness that gets the largest dot
  const dot = (x: number, y: number, b: number) => {
    if (b < 0.02) return;
    // A small floor keeps the faintest dots as pinpoints instead of gaps.
    const r = 0.32 * g * (0.14 + 0.86 * Math.min(1, b / FULL));
    ctx!.moveTo(x + r, y);
    ctx!.arc(x, y, r, 0, Math.PI * 2);
  };

  function draw() {
    ctx!.clearRect(0, 0, w, h);
    ctx!.fillStyle = "#f7f7f5";
    ctx!.globalAlpha = 0.9;
    ctx!.beginPath();

    for (const [x, y, b] of far) dot(x, y, b);

    for (const c of clusters) {
      const b = Math.sin(Math.PI * Math.min(1, c.t / c.life)) * 0.55;
      for (const [dx, dy] of c.dots) dot(c.x + dx * g, c.y + dy * g, b);
    }

    const shimmer = (x: number, y: number) => 0.85 + 0.15 * Math.sin(time * 1.3 + x * 0.05 + y * 0.07);
    for (const [x, y, b] of moon) dot(x, y, b * shimmer(x, y));
    for (const [x, y, b] of planet) dot(x, y, b * shimmer(x, y));

    ctx!.fill();
    ctx!.globalAlpha = 1;
  }

  function step(dt: number) {
    time += dt;
    for (const c of clusters) c.t += dt;
    clusters = clusters.map((c) => (c.t >= c.life ? spawnCluster() : c));
  }

  // --- loop ------------------------------------------------------------------

  let raf = 0;
  let last = 0;
  let visible = false;

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    step(dt);
    draw();
    raf = visible ? requestAnimationFrame(frame) : 0;
  }

  function wake() {
    if (reduced || raf || !visible) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    wake();
  }).observe(canvas);
  new ResizeObserver(resize).observe(canvas);
}
