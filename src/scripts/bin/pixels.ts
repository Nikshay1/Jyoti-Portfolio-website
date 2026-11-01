// A small software renderer for the footer game: a 2:1 isometric camera, a
// depth buffer and dithered colour ramps. Empty pixels stay transparent, so
// the room floats on whatever sits behind the canvas.

export type Color = readonly [number, number, number];
type Shader = (a: number, b: number, ix: number, iy: number) => number;
type Paint = { top?: Shader | Color; front?: Shader | Color; side?: Shader | Color };

export const W = 340;
export const H = 236;
export const UNIT = 10;
const CX = W / 2;
const CY = H / 2 + 14;
const TILT_Y = 0.5;
const TILT_Z = Math.sqrt(3) / 2;
const STEP_EDGE = 0.35;
const EMPTY = -1e9;

export const frame = new Uint32Array(W * H);
export const depth = new Float32Array(W * H).fill(EMPTY);
const bakedFrame = new Uint32Array(W * H);
const bakedDepth = new Float32Array(W * H);
const floorDepth = new Float32Array(W * H);
const shadowStamp = new Uint32Array(W * H);
let tick = 1;

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
export const pack = (r: number, g: number, b: number) =>
  ((255 << 24) | (clamp(b, 0, 255) << 16) | (clamp(g, 0, 255) << 8) | clamp(r, 0, 255)) >>> 0;
export const packed = (c: Color) => pack(c[0], c[1], c[2]);

export function grain(x: number, y: number) {
  const s = Math.sin(x * 91.7 + y * 47.3) * 24634.6345;
  return s - Math.floor(s);
}

export function smooth(x: number, y: number) {
  const ix = Math.floor(x);
  const iy = Math.floor(y);
  const fx = x - ix;
  const fy = y - iy;
  const ex = fx * fx * (3 - 2 * fx);
  const ey = fy * fy * (3 - 2 * fy);
  return mix(
    mix(grain(ix, iy), grain(ix + 1, iy), ex),
    mix(grain(ix, iy + 1), grain(ix + 1, iy + 1), ex),
    ey,
  );
}

// Ordered dither threshold, in [0, 1).
const ORDER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export const dither = (ix: number, iy: number) => ORDER[(iy & 3) * 4 + (ix & 3)] / 16;

// Five tones per colour: shadows lean plum, highlights lean amber.
const PLUM: Color = [38, 24, 64];
const AMBER: Color = [255, 222, 160];
const ramps = new WeakMap<Color, number[]>();
export function ramp(c: Color) {
  let tones = ramps.get(c);
  if (tones) return tones;
  const tone = (m: number, to: Color, k: number) =>
    pack(mix(c[0] * m, to[0], k), mix(c[1] * m, to[1], k), mix(c[2] * m, to[2], k));
  tones = [tone(0.36, PLUM, 0.4), tone(0.58, PLUM, 0.22), tone(0.82, PLUM, 0.06), tone(1, AMBER, 0), tone(1.08, AMBER, 0.26)];
  ramps.set(c, tones);
  return tones;
}

// Light level (0 to 1) to a dithered tone of a colour.
export function lit(c: Color, level: number, ix: number, iy: number, spread = 0.7) {
  const k = clamp(Math.floor(level * 4.4 + 0.2 + (dither(ix, iy) - 0.5) * spread), 0, 4);
  return ramp(c)[k];
}

export function tint(i: number, r: number, g: number, b: number) {
  const c = frame[i];
  frame[i] = pack((c & 255) * r, ((c >> 8) & 255) * g, ((c >> 16) & 255) * b);
}

export function project(x: number, y: number, z: number) {
  const u = (x - y) / Math.SQRT2;
  const v = (x + y) / Math.SQRT2;
  return { sx: CX + u * UNIT, sy: CY + (v * TILT_Y - z * TILT_Z) * UNIT, d: v * TILT_Z + z * TILT_Y };
}

// The floor-plane point under a canvas pixel, at height z.
export function toFloor(sx: number, sy: number, z = 0) {
  const u = (sx - CX) / UNIT;
  const v = ((sy - CY) / UNIT + z * TILT_Z) / TILT_Y;
  return { x: (u + v) / Math.SQRT2, y: (v - u) / Math.SQRT2 };
}

// Canvas-pixel drag distance to a distance along the floor.
export function dragToFloor(dx: number, dy: number) {
  const u = dx / UNIT;
  const v = dy / (UNIT * TILT_Y);
  return { x: (u + v) / Math.SQRT2, y: (v - u) / Math.SQRT2 };
}

// Sprites record pixels instead of drawing them, for shapes that sway.
export type Sprite = number[];
let recording: Sprite | null = null;
export function record(draw: () => void) {
  const out: Sprite = [];
  recording = out;
  draw();
  recording = null;
  return out;
}

export function stamp(sprite: Sprite, dx: number, dy: number) {
  for (let n = 0; n < sprite.length; n += 4) {
    const ix = sprite[n] + dx;
    const iy = sprite[n + 1] + dy;
    if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
    const i = iy * W + ix;
    if (sprite[n + 2] <= depth[i]) continue;
    depth[i] = sprite[n + 2];
    frame[i] = sprite[n + 3];
  }
}

function put(ix: number, iy: number, d: number, c: number) {
  if (!c || ix < 0 || iy < 0 || ix >= W || iy >= H) return;
  if (recording) {
    recording.push(ix, iy, d, c);
    return;
  }
  const i = iy * W + ix;
  if (d <= depth[i]) return;
  depth[i] = d;
  frame[i] = c;
}

export function plot(x: number, y: number, z: number, c: number) {
  const p = project(x, y, z);
  put(Math.floor(p.sx), Math.floor(p.sy), p.d, c);
}

// A dot above everything else, for aim marks and hints.
export function overlay(sx: number, sy: number, c: number) {
  const ix = Math.floor(sx);
  const iy = Math.floor(sy);
  if (ix >= 0 && iy >= 0 && ix < W && iy < H) frame[iy * W + ix] = c;
}

// An axis-aligned box, solved per pixel, so its faces have no gaps. Only the
// three faces the camera sees exist: top, front (+y) and side (+x). A shader
// gets the face's two coordinates and returns a colour, or 0 for a hole.
export function block(
  x0: number,
  y0: number,
  z0: number,
  x1: number,
  y1: number,
  z1: number,
  paint: Color | Paint,
) {
  const faces: Paint = Array.isArray(paint) ? { top: paint as Color, front: paint as Color, side: paint as Color } : (paint as Paint);
  const face = (f: Shader | Color | undefined, level: number): Shader | null => {
    if (!f) return null;
    if (typeof f === "function") return f;
    return (_a, _b, ix, iy) => lit(f, level, ix, iy, 0.45);
  };
  const top = face(faces.top, 0.86);
  const front = face(faces.front, 0.6);
  const side = face(faces.side, 0.36);

  const a = project(x0, y1, z0).sx;
  const b = project(x1, y0, z0).sx;
  const c = project(x0, y0, z1).sy;
  const d = project(x1, y1, z0).sy;
  for (let iy = Math.floor(c) - 1; iy <= Math.ceil(d) + 1; iy++) {
    for (let ix = Math.floor(a) - 1; ix <= Math.ceil(b) + 1; ix++) {
      const u = (ix + 0.5 - CX) / UNIT;
      const w = (iy + 0.5 - CY) / UNIT;
      if (top) {
        const v = (w + z1 * TILT_Z) / TILT_Y;
        const x = (u + v) / Math.SQRT2;
        const y = (v - u) / Math.SQRT2;
        if (x >= x0 && x <= x1 && y >= y0 && y <= y1) put(ix, iy, v * TILT_Z + z1 * TILT_Y, top(x, y, ix, iy));
      }
      if (front) {
        const x = u * Math.SQRT2 + y1;
        if (x >= x0 && x <= x1) {
          const v = (x + y1) / Math.SQRT2;
          const z = (v * TILT_Y - w) / TILT_Z;
          if (z >= z0 && z <= z1) put(ix, iy, v * TILT_Z + z * TILT_Y, front(x, z, ix, iy));
        }
      }
      if (side) {
        const y = x1 - u * Math.SQRT2;
        if (y >= y0 && y <= y1) {
          const v = (x1 + y) / Math.SQRT2;
          const z = (v * TILT_Y - w) / TILT_Z;
          if (z >= z0 && z <= z1) put(ix, iy, v * TILT_Z + z * TILT_Y, side(y, z, ix, iy));
        }
      }
    }
  }
}

export type BallLook = "soft" | "crumpled" | "gloss" | "flat";

export function ball(x: number, y: number, z: number, r: number, c: Color, look: BallLook = "soft") {
  const tones = ramp(c);
  const p = project(x, y, z);
  const R = Math.max(r * UNIT, 0.75);
  for (let iy = Math.floor(p.sy - R); iy <= Math.ceil(p.sy + R); iy++) {
    for (let ix = Math.floor(p.sx - R); ix <= Math.ceil(p.sx + R); ix++) {
      const dx = (ix + 0.5 - p.sx) / R;
      const dy = (iy + 0.5 - p.sy) / R;
      const n = dx * dx + dy * dy;
      if (n > 1) continue;
      const nz = Math.sqrt(1 - n);
      let l = clamp(-0.5 * dx - 0.62 * dy + 0.6 * nz, 0, 1);
      if (look === "crumpled") l += (grain(ix, iy) - 0.5) * 0.7;
      const d = p.d + r * nz;
      if (look === "gloss" && l > 0.9) {
        put(ix, iy, d, pack(255, 248, 228));
      } else if (look === "flat") {
        put(ix, iy, d, tones[clamp(Math.floor(l * 4.4 + 0.2), 1, 4)]);
      } else {
        put(ix, iy, d, tones[clamp(Math.floor(l * 4.4 + 0.2 + (dither(ix, iy) - 0.5) * 0.7), 0, 4)]);
      }
    }
  }
}

export type Point = readonly [number, number, number];

export function limb(a: Point, b: Point, r0: number, r1: number, c: Color | ((z: number) => Color), look: BallLook = "flat") {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const n = Math.max(1, Math.ceil(len / (Math.min(r0, r1) * 0.5)));
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const z = mix(a[2], b[2], t);
    ball(mix(a[0], b[0], t), mix(a[1], b[1], t), z, mix(r0, r1, t), typeof c === "function" ? c(z) : c, look);
  }
}

// The curved wall of a cylinder. A shader gets the angle and height; `inner`
// is true where the camera is looking at the inside of the far wall.
export function drum(
  x: number,
  y: number,
  z0: number,
  z1: number,
  r0: number,
  r1: number,
  shade: (angle: number, t: number, ix: number, iy: number, inner: boolean) => number,
) {
  const rows = Math.ceil((z1 - z0) * UNIT * 1.6);
  for (let k = 0; k <= rows; k++) {
    const t = k / rows;
    const z = mix(z0, z1, t);
    const r = mix(r0, r1, t);
    const steps = Math.ceil(r * UNIT * 8);
    for (let n = 0; n < steps; n++) {
      const a = (n / steps) * Math.PI * 2;
      const p = project(x + Math.cos(a) * r, y + Math.sin(a) * r, z);
      const ix = Math.floor(p.sx);
      const iy = Math.floor(p.sy);
      put(ix, iy, p.d, shade(a, t, ix, iy, Math.cos(a) + Math.sin(a) < 0));
    }
  }
}

// A flat circle, level with the floor.
export function disc(x: number, y: number, z: number, r: number, shade: (dx: number, dy: number, ix: number, iy: number) => number) {
  const p = project(x, y, z);
  const R = r * UNIT * 1.05;
  for (let iy = Math.floor(p.sy - R); iy <= Math.ceil(p.sy + R); iy++) {
    for (let ix = Math.floor(p.sx - R); ix <= Math.ceil(p.sx + R); ix++) {
      const g = toFloor(ix + 0.5, iy + 0.5, z);
      const dx = (g.x - x) / r;
      const dy = (g.y - y) / r;
      if (dx * dx + dy * dy > 1) continue;
      const v = (g.x + g.y) / Math.SQRT2;
      put(ix, iy, v * TILT_Z + z * TILT_Y, shade(dx, dy, ix, iy));
    }
  }
}

// --- shadows -----------------------------------------------------------------

const SHADOW_X = 1;
const SHADOW_Y = -0.3;

function darken(i: number, deep: boolean) {
  if (shadowStamp[i] === tick) return;
  shadowStamp[i] = tick;
  if (deep) tint(i, 0.4, 0.38, 0.58);
  else tint(i, 0.58, 0.55, 0.72);
}

// True for pixels that still show the bare floor.
const onFloor = (i: number) => depth[i] === floorDepth[i] && depth[i] !== EMPTY;

export function shadow(x: number, y: number, z: number, r: number, deep = false) {
  const p = project(x + SHADOW_X * z, y + SHADOW_Y * z, 0);
  const rx = r * UNIT * 1.05;
  const ry = rx * TILT_Y + 0.5;
  for (let iy = Math.floor(p.sy - ry); iy <= Math.ceil(p.sy + ry); iy++) {
    for (let ix = Math.floor(p.sx - rx); ix <= Math.ceil(p.sx + rx); ix++) {
      if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
      const dx = (ix + 0.5 - p.sx) / rx;
      const dy = (iy + 0.5 - p.sy) / ry;
      if (dx * dx + dy * dy > 1) continue;
      const i = iy * W + ix;
      if (onFloor(i)) darken(i, deep);
    }
  }
}

// The swept shadow of a box on the floor.
export function shadowBox(x0: number, y0: number, x1: number, y1: number, height: number) {
  const a = project(x0 + Math.min(0, SHADOW_X * height), y1 + Math.max(0, SHADOW_Y * height), 0).sx;
  const b = project(x1 + SHADOW_X * height, y0 + SHADOW_Y * height, 0).sx;
  const c = project(x0, y0 + SHADOW_Y * height, 0).sy;
  const d = project(x1 + SHADOW_X * height, y1, 0).sy;
  for (let iy = Math.floor(c); iy <= Math.ceil(d); iy++) {
    for (let ix = Math.floor(a); ix <= Math.ceil(b); ix++) {
      if (ix < 0 || iy < 0 || ix >= W || iy >= H) continue;
      const i = iy * W + ix;
      if (!onFloor(i)) continue;
      const g = toFloor(ix + 0.5, iy + 0.5);
      for (let k = 0; k <= 10; k++) {
        const h = (height * k) / 10;
        const sx = g.x - SHADOW_X * h;
        const sy = g.y - SHADOW_Y * h;
        if (sx >= x0 && sx <= x1 && sy >= y0 && sy <= y1) {
          darken(i, false);
          break;
        }
      }
    }
  }
}

// --- baking and frames -------------------------------------------------------

// Call once the floor slab is drawn, before anything stands on it.
export function markFloor() {
  floorDepth.set(depth);
}

// Soft contact shadow where furniture meets the floor.
function bakeContact() {
  const ring: [number, number][] = [];
  for (const r of [2, 3]) {
    for (let k = 0; k < 8; k++) ring.push([Math.round(Math.cos((k * Math.PI) / 4) * r), Math.round(Math.sin((k * Math.PI) / 4) * r * 0.6)]);
  }
  const dark = new Uint8Array(W * H);
  for (let iy = 3; iy < H - 3; iy++) {
    for (let ix = 3; ix < W - 3; ix++) {
      const i = iy * W + ix;
      if (!onFloor(i)) continue;
      let hits = 0;
      for (const [dx, dy] of ring) {
        const j = (iy + dy) * W + ix + dx;
        if (depth[j] !== floorDepth[j] && depth[j] !== EMPTY) hits++;
      }
      if (hits && hits / ring.length > dither(ix, iy) * 0.6) dark[i] = 1;
    }
  }
  for (let i = 0; i < dark.length; i++) if (dark[i]) tint(i, 0.72, 0.68, 0.8);
}

// Edges from the depth buffer: a warm rim on the upper-left of anything that
// stands in front of what's behind it, a dark line on the lower-right.
function bakeEdges() {
  const before = frame.slice();
  for (let iy = 1; iy < H - 1; iy++) {
    for (let ix = 1; ix < W - 1; ix++) {
      const i = iy * W + ix;
      if (!before[i]) continue;
      const d = depth[i];
      const rim = d - depth[i - W] > STEP_EDGE || d - depth[i - 1] > STEP_EDGE;
      const under = depth[i + W] - d > STEP_EDGE || depth[i + 1] - d > STEP_EDGE;
      if (under) {
        tint(i, 0.7, 0.66, 0.78);
      } else if (rim) {
        const c = before[i];
        frame[i] = pack(mix(c & 255, 255, 0.24), mix((c >> 8) & 255, 228, 0.24), mix((c >> 16) & 255, 180, 0.18));
      }
    }
  }
}

export function finishBake() {
  bakeContact();
  bakeEdges();
  bakedFrame.set(frame);
  bakedDepth.set(depth);
}

export function beginFrame() {
  frame.set(bakedFrame);
  depth.set(bakedDepth);
  tick++;
}

// A moving thing darkens its own outline, so it reads against the room.
export function outlineMoving() {
  const before = depth;
  for (let iy = 1; iy < H - 1; iy++) {
    for (let ix = 1; ix < W - 1; ix++) {
      const i = iy * W + ix;
      if (before[i] === bakedDepth[i]) continue;
      if (before[i - W] === bakedDepth[i - W] || before[i + W] === bakedDepth[i + W] || before[i - 1] === bakedDepth[i - 1] || before[i + 1] === bakedDepth[i + 1]) {
        tint(i, 0.72, 0.7, 0.8);
      }
    }
  }
}
