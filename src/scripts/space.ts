// The night sky at the bottom of the footer: a dot-matrix field of pinpoint
// and empty dots, with a dotted crescent moon and a ringed planet. Clusters
// of full-size dots drift and change shape across it like ink in water.

const DOT = 7; // grid spacing for every dotted shape, in CSS pixels

// --- noise -------------------------------------------------------------------

// Smooth 3D value noise in [0, 1]: a hash on the integer lattice, blended
// with a smoothstep.
function hash(x: number, y: number, z: number) {
  let h = (x * 374761393 + y * 668265263 + z * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function noise(x: number, y: number, z: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const zi = Math.floor(z);
  const s = (t: number) => t * t * (3 - 2 * t);
  const u = s(x - xi);
  const v = s(y - yi);
  const w = s(z - zi);
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const plane = (k: number) =>
    lerp(
      lerp(hash(xi, yi, k), hash(xi + 1, yi, k), u),
      lerp(hash(xi, yi + 1, k), hash(xi + 1, yi + 1, k), u),
      v,
    );
  return lerp(plane(zi), plane(zi + 1), w);
}

export function initSpace() {
  const canvas = document.querySelector<HTMLCanvasElement>(".space");
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let cols = 0;
  let rows = 0;
  let moon: [number, number, number][] = [];
  let planet: [number, number, number][] = [];
  // Grid cells covered by the moon or planet; the field is not drawn there.
  let mask = new Uint8Array(0);
  // Each background cell's resting size: a pinpoint, or nothing at all.
  let rest = new Float32Array(0);
  // Each cell's fixed share of a passing cluster, so clusters stay sparse.
  let jitter = new Float32Array(0);
  let time = 0;
  // Narrow screens zoom the whole sky out: a finer grid, smaller dots and
  // smaller shapes, so a phone shows the same scene instead of a close-up.
  let zoom = 1;
  let g = DOT;

  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  const cover = (x: number, y: number) => {
    const i = Math.round(x / g);
    const j = Math.round(y / g);
    if (i >= 0 && i < cols && j >= 0 && j < rows) mask[i * rows + j] = 1;
  };

  // --- static dotted shapes ------------------------------------------------

  function buildShapes() {
    moon = [];
    planet = [];
    const mr = Math.min(80, h * 0.2) * zoom;
    const mx = w * 0.12;
    const my = h * 0.42;
    for (let x = mx - mr - g; x <= mx + mr + g; x += g)
      for (let y = my - mr - g; y <= my + mr + g; y += g) {
        const gx = Math.round(x / g) * g;
        const gy = Math.round(y / g) * g;
        const d = Math.hypot(gx - mx, gy - my);
        const inner = Math.hypot(gx - (mx + mr * 0.42), gy - (my - mr * 0.08));
        if (d < mr + g) cover(gx, gy);
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
        if (Math.hypot(dx, dy) < pr + g || (e > 0.72 && e < 1.1)) cover(gx, gy);
        if (inside) {
          // Lit from the upper right, with a sparse dither on the dark side.
          const light = Math.max(0, (dx * 0.6 - dy * 0.8) / pr);
          const a = 0.08 + light * 0.55;
          if (a > 0.12 || Math.round(gx / g + gy / g) % 2 === 0) planet.push([gx, gy, a]);
        } else if (onRing && !(ry < 0 && Math.hypot(dx, dy) < pr * 1.05)) {
          planet.push([gx, gy, 0.35]);
        }
      }
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
    cols = Math.ceil(w / g) + 1;
    rows = Math.ceil(h / g) + 1;
    mask = new Uint8Array(cols * rows);
    rest = new Float32Array(cols * rows);
    jitter = new Float32Array(cols * rows).map(() => Math.random());
    // About half the background cells show a pinpoint, the rest are empty.
    for (let k = 0; k < rest.length; k++) rest[k] = Math.random() < 0.5 ? 0 : rand(0.03, 0.09);
    buildShapes();
    draw();
  }

  // --- flowing clusters ------------------------------------------------------

  // Brightness of the cluster field at grid cell (i, j). The lookup point is
  // pushed around by two slower noise fields (domain warping) that change
  // over time, which bends the clusters into curls and filaments, and the
  // whole field drifts, so they stretch, merge and split the way dye does in
  // moving water. Time only moves the warp: animating the main field along
  // its third axis would make the number of clusters swell and shrink.
  const SCALE = 0.2; // noise cells per grid step: sets the cluster size
  function field(i: number, j: number, k: number) {
    const x = i * SCALE + time * 0.12;
    const y = j * SCALE + time * 0.03;
    const t = time * 0.06;
    const qx = noise(x * 0.35, y * 0.35, t);
    const qy = noise(x * 0.35 + 17.3, y * 0.35 + 9.1, t);
    const n = noise(x + 3 * qx, y + 3 * qy, 40.5);
    // Only the highest peaks become clusters, and not every cell in one
    // lights up, so a cluster reads as a loose group of dots, not a blob.
    const c = (n - 0.72) / 0.14;
    if (c <= 0 || jitter[k] < 0.3) return 0;
    return Math.min(1, c) * (0.45 + 0.4 * jitter[k]);
  }

  // --- drawing ---------------------------------------------------------------

  // Brightness is carried by a dot's size, not its opacity: every dot is
  // drawn at the same solid tone, and its area grows with brightness. Small
  // dots read as dim without the muddy grey that transparency gives.
  const FULL = 0.85; // brightness that gets the largest dot
  const dot = (x: number, y: number, b: number) => {
    if (b < 0.02) return;
    // A small floor keeps the faintest dots as pinpoints instead of gaps.
    const r = 0.5 * g * (0.10 + 0.86 * Math.min(1, b / FULL));
    ctx!.moveTo(x + r, y);
    ctx!.arc(x, y, r, 0, Math.PI * 2);
  };

  function draw() {
    ctx!.clearRect(0, 0, w, h);
    ctx!.fillStyle = "#f7f7f5";
    ctx!.globalAlpha = 0.8;
    ctx!.beginPath();

    for (let i = 0; i < cols; i++)
      for (let j = 0; j < rows; j++) {
        const k = i * rows + j;
        if (mask[k]) continue;
        dot(i * g, j * g, Math.max(rest[k], field(i, j, k)));
      }

    const shimmer = (x: number, y: number) => 0.85 + 0.15 * Math.sin(time * 1.3 + x * 0.05 + y * 0.07);
    for (const [x, y, b] of moon) dot(x, y, b * shimmer(x, y));
    for (const [x, y, b] of planet) dot(x, y, b * shimmer(x, y));

    ctx!.fill();
    ctx!.globalAlpha = 1;
  }

  // --- loop ------------------------------------------------------------------

  let raf = 0;
  let last = 0;
  let visible = false;

  function frame(now: number) {
    time += Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
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
