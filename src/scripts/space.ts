// The night sky at the bottom of the footer: a dot-matrix starfield that
// twinkles in small clusters, plus a dotted crescent moon and ringed planet.

const DOT = 10; // grid spacing for every dotted shape, in CSS pixels

type Cluster = { x: number; y: number; dots: [number, number][]; t: number; life: number };

export function initSpace() {
  const canvas = document.querySelector<HTMLCanvasElement>(".space");
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return { pause: () => {}, resume: () => {} };

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let clusters: Cluster[] = [];
  let moon: [number, number, number][] = [];
  let planet: [number, number, number][] = [];
  let time = 0;
  let paused = false;

  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  // --- static dotted shapes ------------------------------------------------

  function buildShapes() {
    moon = [];
    planet = [];
    const mr = Math.min(80, h * 0.2);
    const mx = w * 0.12;
    const my = h * 0.42;
    for (let x = mx - mr; x <= mx + mr; x += DOT)
      for (let y = my - mr; y <= my + mr; y += DOT) {
        const gx = Math.round(x / DOT) * DOT;
        const gy = Math.round(y / DOT) * DOT;
        const d = Math.hypot(gx - mx, gy - my);
        const inner = Math.hypot(gx - (mx + mr * 0.42), gy - (my - mr * 0.08));
        if (d < mr && inner > mr * 0.95) moon.push([gx, gy, Math.min(1, (inner - mr * 0.95) / (mr * 0.45)) * 0.7 + 0.15]);
      }

    const pr = Math.min(110, h * 0.26);
    const px = w * 0.8;
    const py = h - pr * 0.55;
    const tilt = -0.28;
    for (let gx = Math.floor((px - pr * 2.2) / DOT) * DOT; gx <= px + pr * 2.2; gx += DOT)
      for (let gy = Math.floor((py - pr * 1.4) / DOT) * DOT; gy <= h; gy += DOT) {
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
          if (a > 0.12 || (gx / DOT + gy / DOT) % 2 === 0) planet.push([gx, gy, a]);
        } else if (onRing && !(ry < 0 && Math.hypot(dx, dy) < pr * 1.05)) {
          planet.push([gx, gy, 0.35]);
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
      x: Math.floor(rand(0, w) / DOT) * DOT,
      y: Math.floor(rand(0, h) / DOT) * DOT,
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
    canvas!.width = Math.round(w * dpr);
    canvas!.height = Math.round(h * dpr);
    ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
    buildShapes();
    const count = Math.round((w * h) / 9000);
    clusters = Array.from({ length: count }, () => {
      const c = spawnCluster();
      c.t = rand(0, c.life);
      return c;
    });
    draw();
  }

  // --- drawing ---------------------------------------------------------------

  const dot = (x: number, y: number, r: number, a: number) => {
    ctx!.globalAlpha = a;
    ctx!.beginPath();
    ctx!.arc(x, y, r, 0, Math.PI * 2);
    ctx!.fill();
  };

  function draw() {
    ctx!.clearRect(0, 0, w, h);
    ctx!.fillStyle = "#f7f7f5";

    for (const c of clusters) {
      const a = Math.sin(Math.PI * Math.min(1, c.t / c.life)) * 0.55;
      for (const [dx, dy] of c.dots) dot(c.x + dx * DOT, c.y + dy * DOT, 1.4, a);
    }

    const shimmer = (x: number, y: number) => 0.85 + 0.15 * Math.sin(time * 1.3 + x * 0.05 + y * 0.07);
    for (const [x, y, a] of moon) dot(x, y, 1.6, a * shimmer(x, y));
    for (const [x, y, a] of planet) dot(x, y, 1.6, a * shimmer(x, y));
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
    raf = visible && !paused ? requestAnimationFrame(frame) : 0;
  }

  function wake() {
    if (reduced || raf || !visible || paused) return;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    wake();
  }).observe(canvas);
  new ResizeObserver(resize).observe(canvas);

  return {
    pause() {
      paused = true;
    },
    resume() {
      paused = false;
      wake();
    },
  };
}
