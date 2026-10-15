// The night sky at the bottom of the footer: a dot-matrix starfield that
// twinkles in small clusters, a dotted crescent moon and ringed planet, and
// a tiny pixel astronaut (round glasses, like Jyoti) who floats towards the
// cursor. Clicking the astronaut calls `onAstronaut`.

import { ASTRO_H, ASTRO_W, astronaut } from "./astronaut";

const DOT = 10; // grid spacing for every dotted shape, in CSS pixels
// Size of one astronaut pixel: bigger on wide screens.
let PX = 3;

type Cluster = { x: number; y: number; dots: [number, number][]; t: number; life: number };
type Spark = { x: number; y: number; t: number; life: number; color: string };

export function initSpace(onAstronaut: () => void) {
  const canvas = document.querySelector<HTMLCanvasElement>(".space");
  const ctx = canvas?.getContext("2d");
  if (!canvas || !ctx) return { pause: () => {}, resume: () => {} };

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let w = 0;
  let h = 0;
  let dpr = 1;
  let clusters: Cluster[] = [];
  let sparks: Spark[] = [];
  let moon: [number, number, number][] = [];
  let planet: [number, number, number][] = [];
  const pos = { x: 0, y: 0, vx: 0, vy: 0 };
  let pointer: { x: number; y: number } | null = null;
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
    PX = w > 1100 ? 4 : 3;
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
    if (!pos.x) {
      pos.x = w * 0.45;
      pos.y = h * 0.5;
    }
    draw();
  }

  // --- drawing ---------------------------------------------------------------

  const dot = (x: number, y: number, r: number, a: number) => {
    ctx!.globalAlpha = a;
    ctx!.beginPath();
    ctx!.arc(x, y, r, 0, Math.PI * 2);
    ctx!.fill();
  };

  // Pre-rendered frames: [wave][blink].
  const frames = [false, true].map((wave) => [false, true].map((blink) => astronaut(wave, blink)));
  let facing = 1;

  function drawAstronaut(x: number, y: number) {
    const wave = time % 4.5 < 1.6 && Math.floor(time * 3) % 2 === 1;
    const blink = time % 3.7 > 3.55;
    const grid = frames[+wave][+blink];
    const ox = Math.round(x - (ASTRO_W * PX) / 2);
    const oy = Math.round(y - (ASTRO_H * PX) / 2);
    ctx!.globalAlpha = 1;
    for (let j = 0; j < ASTRO_H; j++)
      for (let i = 0; i < ASTRO_W; i++) {
        const c = grid[j][facing > 0 ? i : ASTRO_W - 1 - i];
        if (!c) continue;
        ctx!.fillStyle = c;
        ctx!.fillRect(ox + i * PX, oy + j * PX, PX, PX);
      }
  }

  function drawSpark(s: Spark) {
    const k = s.t / s.life;
    const a = Math.sin(Math.PI * k);
    const n = k < 0.5 ? 1 : 2;
    ctx!.globalAlpha = a;
    ctx!.fillStyle = s.color;
    const x = Math.round(s.x);
    const y = Math.round(s.y);
    ctx!.fillRect(x, y, 2, 2);
    for (let i = 1; i <= n; i++) {
      ctx!.fillRect(x + i * 2, y, 2, 2);
      ctx!.fillRect(x - i * 2, y, 2, 2);
      ctx!.fillRect(x, y + i * 2, 2, 2);
      ctx!.fillRect(x, y - i * 2, 2, 2);
    }
  }

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

    for (const s of sparks) drawSpark(s);
    drawAstronaut(pos.x, pos.y + Math.sin(time * 1.8) * 5);
    ctx!.globalAlpha = 1;
  }

  // --- motion ----------------------------------------------------------------

  function step(dt: number) {
    time += dt;

    for (const c of clusters) c.t += dt;
    clusters = clusters.map((c) => (c.t >= c.life ? spawnCluster() : c));

    // Drift towards the cursor, or wander slowly when it's elsewhere.
    const target = pointer
      ? { x: pointer.x + 70, y: pointer.y + 30 }
      : { x: w * (0.5 + 0.28 * Math.sin(time * 0.11)), y: h * (0.5 + 0.22 * Math.sin(time * 0.17 + 1)) };
    target.x = Math.max(50, Math.min(w - 50, target.x));
    target.y = Math.max(60, Math.min(h - 50, target.y));
    pos.vx += (target.x - pos.x) * 0.9 * dt;
    pos.vy += (target.y - pos.y) * 0.9 * dt;
    pos.vx *= 1 - 1.6 * dt;
    pos.vy *= 1 - 1.6 * dt;
    pos.x += pos.vx * dt;
    pos.y += pos.vy * dt;
    if (Math.abs(pos.vx) > 25) facing = pos.vx > 0 ? 1 : -1;

    if (Math.random() < dt * 2.2)
      sparks.push({
        x: pos.x + rand(-48, 48),
        y: pos.y + rand(-40, 30),
        t: 0,
        life: rand(0.6, 1.2),
        color: Math.random() < 0.5 ? "#ffd27a" : "#ff8a5c",
      });
    for (const s of sparks) s.t += dt;
    sparks = sparks.filter((s) => s.t < s.life);
  }

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

  // --- input -----------------------------------------------------------------

  const local = (e: PointerEvent) => {
    const r = canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };
  const onAstro = (p: { x: number; y: number }) =>
    Math.abs(p.x - pos.x) < (ASTRO_W * PX) / 2 + 6 && Math.abs(p.y - pos.y) < (ASTRO_H * PX) / 2 + 6;

  canvas.addEventListener("pointermove", (e) => {
    pointer = local(e);
    canvas.classList.toggle("on-astro", onAstro(pointer));
  });
  canvas.addEventListener("pointerleave", () => {
    pointer = null;
    canvas.classList.remove("on-astro");
  });
  canvas.addEventListener("click", (e) => {
    if (onAstro(local(e))) onAstronaut();
  });

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
