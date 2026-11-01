// The writer's room: everything that never moves is baked once, then a few
// small things (fairy lights, chai steam, plants, the fan's breeze) animate
// on top of it each frame.

import {
  ball,
  block,
  clamp,
  dither,
  disc,
  drum,
  finishBake,
  grain,
  limb,
  lit,
  markFloor,
  mix,
  pack,
  plot,
  ramp,
  record,
  shadow,
  shadowBox,
  smooth,
  stamp,
  type Color,
  type Sprite,
} from "./pixels";
import { DESK, ROOM, SHELF } from "./paper";

const WALL_H = 4.6;
const WALL: Color = [58, 112, 118];
const DADO: Color = [38, 78, 92];
const CHIP_DARK: Color = [78, 66, 66];
const STONE: Color = [172, 152, 128];
const RUG_A: Color = [214, 84, 40];
const RUG_B: Color = [34, 50, 96];
const RUG_C: Color = [232, 196, 132];
const WOOD: Color = [128, 82, 48];
const TEAK: Color = [92, 56, 36];
const SLAB: Color = [112, 100, 96];
const BRICK: Color = [146, 74, 52];
const CLAY: Color = [186, 92, 54];
const LEAF: Color[] = [
  [50, 92, 60],
  [78, 128, 68],
  [126, 160, 80],
];
const SPINES: Color[] = [
  [214, 84, 40],
  [230, 190, 92],
  [52, 88, 124],
  [226, 218, 196],
  [140, 54, 62],
  [70, 128, 110],
  [96, 72, 130],
];

const LAMP = { x: -5, y: -5.4 };
const warmth = (x: number, y: number) => clamp(1 - Math.hypot(x - LAMP.x, (y - LAMP.y) * 0.9) / 8.5, 0, 1);

// Terrazzo: stone chips set in a grey-brown floor, cut into big square tiles,
// brighter in the pool of light from the desk lamp.
function floorShader(x: number, y: number, ix: number, iy: number) {
  const rx = x + 8.3;
  const ry = y + 0.4;
  const inRug = Math.abs(x + 1.7) < 6.6 && Math.abs(y - 0.7) < 3.5;
  if (inRug) {
    const fringe = Math.abs(x + 1.7) > 6.3;
    if (fringe) return (ix + iy) % 2 ? pack(232, 214, 176) : pack(170, 146, 112);
    const band = Math.floor((rx - 1.7) * 1.4);
    const stripe = band % 7;
    const base = stripe === 0 || stripe === 3 ? RUG_B : stripe === 5 ? RUG_C : RUG_A;
    const weave = (ix + iy * 2) % 3 === 0 ? -0.07 : 0.03;
    return lit(base, 0.56 + warmth(x, y) * 0.24 + weave + (smooth(x * 1.6, ry * 1.6) - 0.5) * 0.14, ix, iy, 0.3);
  }
  const fine = grain(ix, iy);
  if (fine > 0.988) return ramp(CHIP_DARK)[2];
  if (fine < 0.012) return pack(216, 204, 182);
  const seam = Math.abs(((x + 12) % 4) - 2) > 1.93 || Math.abs(((y + 6.5) % 4) - 2) > 1.93;
  if (seam) return ramp(STONE)[1];
  const level = 0.52 + warmth(x, y) * 0.34 + (smooth(x * 0.6, y * 0.6) - 0.5) * 0.1;
  return lit(STONE, level, ix, iy, 0.26);
}

// The underside of the room breaks up into dots as it falls away.
function slabShader(u: number, z: number, ix: number, iy: number) {
  const reach = 2.3 + smooth(u * 0.8, 3) * 1.6;
  const t = -z / reach;
  if (t > 1 || (t > 0.46 && grain(ix, iy) < (t - 0.46) * 1.9)) return 0;
  if (t < 0.13) return ramp(SLAB)[3];
  return lit(BRICK, 0.42 - t * 0.28 + (grain(Math.floor(u * 2.2), Math.floor(z * 3.2)) - 0.5) * 0.3, ix, iy, 0.6);
}

// The long wall: limewash above a dark painted dado, with one window.
const WINDOW = { x0: -8.9, x1: -4.3, z0: 2.1, z1: 4.05 };
function longWallShader(x: number, z: number, ix: number, iy: number) {
  if (x >= WINDOW.x0 && x <= WINDOW.x1 && z >= WINDOW.z0 && z <= WINDOW.z1) return windowView(x, z, ix, iy);
  const near = warmth(x, ROOM.y0) * 0.3 * clamp(1.6 - Math.abs(z - 1.4) * 0.6, 0, 1);
  if (z < 1.05) return lit(DADO, 0.46 + near, ix, iy, 0.5);
  if (z < 1.13) return ramp(DADO)[1];
  const patch = (smooth(x * 0.7, z * 1.2) - 0.5) * 0.12;
  return lit(WALL, 0.52 + near + patch, ix, iy, 0.5);
}

// A Delhi night through the window: dusk at the horizon and a dome on the skyline.
function windowView(x: number, z: number, ix: number, iy: number) {
  const barX = Math.abs(x - (WINDOW.x0 + WINDOW.x1) / 2) < 0.07;
  const barZ = Math.abs(z - 3.1) < 0.05;
  const frameEdge = x - WINDOW.x0 < 0.13 || WINDOW.x1 - x < 0.13 || z - WINDOW.z0 < 0.13 || WINDOW.z1 - z < 0.13;
  if (frameEdge || barX || barZ) return ramp(RUG_C)[2];
  const domeX = x + 5.6;
  const dome = Math.hypot(domeX, (z - 2.5) * 1.1) < 0.42 || (Math.abs(domeX) < 0.03 && z < 3.08) || (Math.abs(domeX) < 0.56 && z < 2.52);
  const roofs = z < 2.28 + Math.floor(smooth(Math.floor(x * 2.1) * 0.5, 7) * 3) * 0.13;
  if (dome || roofs) return grain(ix, iy) > 0.985 ? pack(255, 196, 92) : pack(18, 14, 38);
  const t = (z - WINDOW.z0) / (WINDOW.z1 - WINDOW.z0);
  if (t > 0.3 && grain(ix, iy + 11) > 0.982) return pack(244, 236, 214);
  const level = t + (dither(ix, iy) - 0.5) * 0.28;
  if (level < 0.3) return pack(186, 92, 96);
  if (level < 0.5) return pack(92, 60, 112);
  if (level < 0.74) return pack(44, 40, 92);
  return pack(24, 26, 62);
}

// The short wall: plain limewash with a few framed prints.
function shortWallShader(y: number, z: number, ix: number, iy: number) {
  if (z < 1.05) return lit(DADO, 0.26, ix, iy, 0.5);
  if (z < 1.13) return ramp(DADO)[0];
  for (const f of FRAMES) {
    if (Math.abs(y - f.y) < f.w && Math.abs(z - f.z) < f.h) {
      const edge = Math.abs(y - f.y) > f.w - 0.12 || Math.abs(z - f.z) > f.h - 0.12;
      if (edge) return ramp(TEAK)[1];
      return lit(f.c, 0.5 + (z - f.z) * 0.3, ix, iy, 0.6);
    }
  }
  return lit(WALL, 0.3 + (smooth(y * 0.7, z * 1.2) - 0.5) * 0.1, ix, iy, 0.5);
}
const FRAMES = [
  { y: -3.2, z: 3, w: 0.8, h: 0.92, c: RUG_A },
  { y: -0.9, z: 3.2, w: 0.62, h: 0.62, c: RUG_C },
  { y: 0.9, z: 2.75, w: 0.62, h: 0.8, c: SPINES[2] },
];

// Bookshelf front: dark shelves, each packed with spines of random widths.
function shelfShader(x: number, z: number, ix: number, iy: number) {
  const row = Math.floor(z / 0.92);
  const inRow = z - row * 0.92;
  if (x - SHELF.x0 < 0.12 || SHELF.x1 - x < 0.12 || inRow < 0.13) return ramp(TEAK)[2];
  let at = SHELF.x0 + 0.12;
  let k = 0;
  while (at < x) {
    at += 0.17 + grain(k, row) * 0.28;
    k++;
  }
  const height = 0.42 + grain(k, row + 9) * 0.3;
  if (grain(k * 3, row * 5) < 0.08 || inRow - 0.13 > height) return ramp(TEAK)[0];
  const c = SPINES[Math.floor(grain(k, row + 3) * SPINES.length)];
  return lit(c, 0.62 - (at - x) * 0.25, ix, iy, 0.25);
}

// --- animated bits -----------------------------------------------------------

const lights: { x: number; y: number; z: number; phase: number; c: number }[] = [];
const plants: { sprite: Sprite; phase: number; amount: number }[] = [];
const FAN = { x: 2.1, y: -5.3, z: 3.05 };
export const fanSpot = FAN;

function pot(x: number, y: number, r: number) {
  drum(x, y, 0, r * 1.5, r * 0.72, r, (a, _t, ix, iy, inner) =>
    inner ? 0 : lit(CLAY, 0.52 + 0.3 * Math.cos(a - 2.2), ix, iy, 0.6),
  );
  disc(x, y, r * 1.5, r, (dx, dy, ix, iy) => (Math.hypot(dx, dy) > 0.8 ? ramp(CLAY)[3] : lit(TEAK, 0.2, ix, iy)));
}

function plant(x: number, y: number, r: number, spread: number, height: number, seed: number) {
  pot(x, y, r);
  shadowBox(x - r, y - r, x + r, y + r, height * 0.6);
  const top = r * 1.5;
  for (let k = 0; k < 7; k++) {
    const leaves = record(() => {
      for (let n = 0; n < 16; n++) {
        const a = grain(n + seed, k) * 6.283;
        const d = Math.cbrt(grain(k + seed, n + 3)) * spread;
        const z = top + 0.4 + grain(n, k + seed) * height;
        const tone = LEAF[Math.min(2, Math.floor(grain(n + 2, k + seed) + (z - top) / height))];
        ball(x + Math.cos(a) * d, y + Math.sin(a) * d, z, 0.17 + grain(n + seed, k + 4) * 0.13, tone, "flat");
      }
    });
    plants.push({ sprite: leaves, phase: seed + k * 1.4, amount: 1 });
  }
}

function desk() {
  const { x0, x1, y0, y1, z1 } = DESK;
  const grainShader = (x: number, y: number, ix: number, iy: number) =>
    lit(WOOD, 0.74 + warmth(x, y) * 0.18 + (smooth(x * 0.6, y * 7) - 0.5) * 0.3, ix, iy, 0.4);
  shadowBox(x0, y0, x1, y1, z1);
  block(x0, y0, z1 - 0.14, x1, y1, z1, { top: grainShader, front: TEAK, side: TEAK });
  for (const lx of [x0 + 0.1, x1 - 0.32]) block(lx, y1 - 0.26, 0, lx + 0.22, y1 - 0.04, z1 - 0.14, TEAK);
  block(x0 + 0.5, y0, 0.4, x1 - 0.5, y0 + 0.12, z1 - 0.2, TEAK);

  // Laptop: thin base, then a lit screen with lines of text.
  block(-7.8, -6.05, z1, -6.1, -4.95, z1 + 0.06, [136, 134, 142]);
  block(-7.8, -6.13, z1, -6.1, -6.05, z1 + 1.02, {
    top: [136, 134, 142],
    side: [86, 84, 96],
    front: (x, z, ix) => {
      if (x < -7.72 || x > -6.18 || z < z1 + 0.1 || z > z1 + 0.96) return pack(60, 58, 70);
      const row = Math.floor((z - z1) * 8);
      const end = -7.6 + grain(row, 3) * 1.15;
      if (row % 2 === 0 && x < end && ix % 3) return pack(255, 244, 222);
      return pack(170, 196, 214);
    },
  });

  // Chai glass, stack of pages, desk lamp.
  drum(-5.1, -4.95, z1, z1 + 0.34, 0.1, 0.13, (a, _t, ix, iy, inner) => (inner ? 0 : lit([206, 142, 76], 0.6 + 0.3 * Math.cos(a - 2.2), ix, iy)));
  block(-9.2, -5.9, z1, -8.2, -4.9, z1 + 0.26, {
    top: (_x, _y, ix, iy) => (grain(ix, iy) > 0.9 ? pack(200, 194, 178) : pack(244, 240, 226)),
    front: (_x, z) => (Math.floor(z * 24) % 2 ? pack(224, 218, 200) : pack(164, 156, 142)),
    side: (_y, z) => (Math.floor(z * 24) % 2 ? pack(186, 178, 164) : pack(132, 124, 118)),
  });
  block(-4.2, -6.2, z1, -3.85, -5.85, z1 + 0.05, [58, 54, 56]);
  limb([-4.02, -6.03, z1], [-4.1, -6.03, z1 + 1.25], 0.05, 0.05, [58, 54, 56]);
  limb([-4.1, -6.03, z1 + 1.25], [-4.85, -5.65, z1 + 1.55], 0.05, 0.05, [58, 54, 56]);
  ball(-5, -5.56, z1 + 1.42, 0.34, [255, 208, 118], "flat");

  // Stool, pushed in.
  block(-7.5, -4.2, 0.95, -6.3, -3.1, 1.08, WOOD);
  for (const [lx, ly] of [[-7.4, -4.1], [-6.5, -4.1], [-7.4, -3.3], [-6.5, -3.3]]) block(lx, ly, 0, lx + 0.12, ly + 0.12, 0.95, TEAK);
  shadowBox(-7.5, -4.2, -6.3, -3.1, 1);
}

function shelf() {
  const { x0, x1, y0, y1, z1 } = SHELF;
  shadowBox(x0, y0, x1, y1, z1);
  block(x0, y0, 0, x1, y1, z1, { top: TEAK, front: shelfShader, side: TEAK });
  // A small pile of books and a pot on top.
  block(5.5, -6.1, z1, 6.9, -5.5, z1 + 0.16, SPINES[2]);
  block(5.7, -6.05, z1 + 0.16, 6.7, -5.55, z1 + 0.3, SPINES[0]);
  pot(9.8, -5.9, 0.28);
  const top = z1 + 0.42;
  for (let k = 0; k < 3; k++) {
    plants.push({
      phase: k * 2.1,
      amount: 1,
      sprite: record(() => {
        for (let n = 0; n < 7; n++) {
          const a = grain(n, k + 22) * 6.283;
          ball(9.8 + Math.cos(a) * 0.42, -5.9 + Math.sin(a) * 0.42, top + grain(k, n) * 0.6, 0.13, LEAF[n % 3], "flat");
        }
      }),
    });
  }
}

function fan() {
  const { x, y, z } = FAN;
  const steel: Color = [150, 152, 160];
  disc(x, y, 0.1, 0.62, (_dx, dy, ix, iy) => lit(steel, 0.6 - dy * 0.2, ix, iy));
  drum(x, y, 0, 0.1, 0.62, 0.62, (a, _t, ix, iy, inner) => (inner ? 0 : lit(steel, 0.4 + 0.2 * Math.cos(a - 2.2), ix, iy)));
  limb([x, y, 0.1], [x, y - 0.16, z - 0.2], 0.07, 0.07, steel, "flat");
  ball(x, y - 0.3, z, 0.3, steel, "flat");
  shadow(x, y, 0, 0.7);
  shadow(x, y, z * 0.6, 0.55);
  // Cage: two rings and spokes, in front of the blades.
  const R = 1.02;
  const c = ramp(steel)[3];
  for (let n = 0; n < 120; n++) {
    const a = (n / 120) * Math.PI * 2;
    plot(x + Math.cos(a) * R, y + 0.12, z + Math.sin(a) * R, c);
    if (n % 4 === 0) plot(x + Math.cos(a) * R * 0.55, y + 0.14, z + Math.sin(a) * R * 0.55, ramp(steel)[2]);
    if (n % 15 === 0) for (let k = 0; k < 8; k++) plot(x + (Math.cos(a) * R * k) / 8, y + 0.13, z + (Math.sin(a) * R * k) / 8, ramp(steel)[2]);
  }
}

function fairyLights() {
  const warm = [pack(255, 206, 110), pack(255, 148, 82), pack(255, 236, 190)];
  const span = (ax: number, ay: number, bx: number, by: number, count: number) => {
    for (let k = 0; k <= count; k++) {
      const t = k / count;
      const sag = Math.sin((t * count * Math.PI) / 2) ** 2 * 0.42;
      const x = mix(ax, bx, t);
      const y = mix(ay, by, t);
      const z = WALL_H - 0.3 - sag;
      lights.push({ x, y, z, phase: grain(k, ax) * 6.28, c: warm[k % warm.length] });
    }
    const wire = pack(40, 36, 44);
    const fine = count * 14;
    for (let k = 0; k <= fine; k++) {
      const t = k / fine;
      plot(mix(ax, bx, t), mix(ay, by, t), WALL_H - 0.3 - Math.sin((t * count * Math.PI) / 2) ** 2 * 0.42, wire);
    }
  };
  span(ROOM.x0 + 0.1, ROOM.y0 + 0.12, ROOM.x1, ROOM.y0 + 0.12, 24);
  span(ROOM.x0 + 0.12, ROOM.y0 + 0.1, ROOM.x0 + 0.12, ROOM.y1, 13);
}

export function bakeRoom() {
  const { x0, x1, y0, y1 } = ROOM;
  block(x0, y0, -4, x1, y1, 0, { top: floorShader, front: slabShader, side: slabShader });
  markFloor();

  block(x0 - 0.4, y0 - 0.4, 0, x1, y0, WALL_H, {
    top: (x, _y, ix, iy) => lit(RUG_C, 0.66 + (grain(Math.floor(x), 2) - 0.5) * 0.1, ix, iy, 0.4),
    front: longWallShader,
    side: RUG_C,
  });
  block(x0 - 0.4, y0, 0, x0, y1, WALL_H, {
    top: (_x, y, ix, iy) => lit(RUG_C, 0.66 + (grain(Math.floor(y), 5) - 0.5) * 0.1, ix, iy, 0.4),
    side: shortWallShader,
    front: RUG_C,
  });

  // Curtains either side of the window.
  for (const [a, b] of [[WINDOW.x0 - 0.6, WINDOW.x0 + 0.3], [WINDOW.x1 - 0.3, WINDOW.x1 + 0.6]]) {
    block(a, y0, 1.5, b, y0 + 0.12, 4.28, {
      top: RUG_A,
      side: RUG_A,
      front: (x, z, ix, iy) => lit(RUG_A, 0.58 + Math.sin(x * 11 + z * 0.3) * 0.26, ix, iy, 0.3),
    });
  }
  block(WINDOW.x0 - 0.8, y0, 4.28, WINDOW.x1 + 0.8, y0 + 0.16, 4.36, TEAK);

  desk();
  shelf();
  fan();
  plant(-10.75, 5.35, 0.62, 1, 1.9, 3);
  plant(-10.9, -5.3, 0.48, 0.72, 1.4, 11);
  fairyLights();
  finishBake();
}

// Fairy lights, chai steam, plant sway and wind streaks. `t` is the game clock;
// reduced-motion passes a frozen one, so nothing here moves by itself.
export function drawAmbient(t: number, wind: number, still: boolean) {
  const swayT = Math.floor(t * 8) / 8;
  for (const p of plants) {
    const gust = 0.6 + wind * 0.5;
    const dx = Math.round(Math.sin(swayT * 1.1 + p.phase) * gust);
    const dy = Math.round(Math.sin(swayT * 1.7 + p.phase * 2) * 0.4);
    stamp(p.sprite, dx, dy);
  }

  for (const l of lights) {
    const glow = 0.7 + Math.sin(swayT * 1.6 + l.phase) * 0.3;
    const c = glow > 0.5 ? l.c : tone(l.c, 0.62);
    plot(l.x, l.y, l.z, c);
    plot(l.x, l.y, l.z - 0.12, c);
    if (glow > 0.5) {
      const halo = tone(l.c, 0.5);
      for (const [dx, dz] of [[0.09, -0.06], [-0.09, -0.06]]) plot(l.x + dx, l.y + (l.y === ROOM.y0 + 0.12 ? 0 : dx), l.z + dz, halo);
    }
  }

  if (still) return;

  for (let k = 0; k < 3; k++) {
    const age = (t * 0.45 + k / 3) % 1;
    const z = DESK.z1 + 0.4 + age * 1.1;
    const c = pack(mix(232, 150, age), mix(226, 146, age), mix(214, 150, age));
    if (Math.floor(t * 8 + k) % 3 !== 2) plot(-5.1 + Math.sin(age * 6 + k) * 0.13, -4.95, z, c);
  }

  if (wind > 0) {
    const pale = pack(218, 226, 226);
    const count = wind * 5;
    for (let k = 0; k < count; k++) {
      const speed = 9 + grain(k, 2) * 4 + wind * 2;
      const span = ROOM.y1 - ROOM.y0;
      const run = (t * speed + grain(k, 5) * span) % span;
      const y = ROOM.y0 + 1 + run;
      const x = -11 + grain(k, 7) * 21;
      const z = 0.8 + grain(k, 9) * 3;
      for (let n = 0; n < 3 + wind; n++) {
        if (n % 2 === 0 || wind > 1) plot(x, y - n * 0.14, z, pale);
      }
    }
  }
}

function tone(c: number, m: number) {
  return pack((c & 255) * m, ((c >> 8) & 255) * m, ((c >> 16) & 255) * m);
}

