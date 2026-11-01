// The things that move: the writer, the bin, the cat and the fan's blades.

import { ball, clamp, disc, drum, grain, limb, lit, mix, pack, plot, ramp, shadow, type Color, type Point } from "./pixels";
import { BIN_H, BIN_R, PAPER_R } from "./paper";
import { fanSpot } from "./room";

export const PAPER: Color = [246, 240, 222];

const KURTA: Color = [255, 96, 40];
const KURTA_TRIM: Color = [246, 208, 120];
const PANTS: Color = [48, 44, 70];
const SKIN: Color = [206, 150, 112];
const HAIR: Color = [28, 20, 28];
const SHOE: Color = [214, 196, 160];

export type Pose = { yaw: number; arm: number; lean: number; crouch: number };

// Draws the writer and returns where the throwing hand is.
export function drawWriter(x: number, y: number, pose: Pose, time: number): Point {
  const fx = Math.cos(pose.yaw);
  const fy = Math.sin(pose.yaw);
  const sx = -fy;
  const sy = fx;
  const at = (forward: number, across: number, z: number): Point => [
    x + fx * forward + sx * across,
    y + fy * forward + sy * across,
    z,
  ];

  const hipZ = 1.32 - pose.crouch * 0.34;
  const shoulderF = Math.sin(pose.lean) * 0.9;
  const shoulderZ = hipZ + Math.cos(pose.lean) * 0.86;
  const hip = at(0, 0, hipZ);
  const chest = at(shoulderF, 0, shoulderZ);
  const hem = at(-0.04, 0, hipZ - 0.52);
  const head = at(shoulderF * 1.25, 0, shoulderZ + 0.46);

  for (const [side, ahead] of [[0.17, -0.24], [-0.17, 0.26]] as const) {
    const foot = at(ahead, side, 0.1);
    const knee = at(ahead * 0.5 + pose.crouch * 0.18, side, 0.7 - pose.crouch * 0.1);
    limb(at(0, side * 0.8, hipZ), knee, 0.16, 0.12, PANTS);
    limb(knee, foot, 0.12, 0.09, PANTS);
    limb(foot, at(ahead + 0.16, side, 0.07), 0.09, 0.08, SHOE);
    shadow(foot[0], foot[1], 0, 0.22, true);
  }

  // Kurta: flares from the shoulders to a long hem.
  limb(chest, hip, 0.29, 0.31, KURTA);
  limb(hip, hem, 0.31, 0.38, (z) => (z < hipZ - 0.42 ? KURTA_TRIM : KURTA));

  // Head, hair and a long plait that swings a little.
  limb(chest, head, 0.1, 0.1, SKIN);
  ball(head[0], head[1], head[2], 0.24, SKIN, "flat");
  const back = at(shoulderF * 1.25 - 0.07, 0, head[2] + 0.07);
  ball(back[0], back[1], back[2], 0.225, HAIR, "flat");
  const swing = Math.sin(time * 2.2) * 0.04 - pose.arm * 0.02;
  const nape = at(shoulderF * 1.25 - 0.22, 0, head[2] - 0.08);
  const plaitEnd = at(shoulderF * 0.5 - 0.42 + swing, swing, shoulderZ - 0.72);
  limb(nape, plaitEnd, 0.085, 0.05, HAIR);

  // The throwing arm is on the side nearer the camera, so the paper shows.
  const near = Math.sin(pose.yaw) > 0 ? -1 : 1;
  const shoulderT = at(shoulderF, 0.36 * near, shoulderZ - 0.03);
  const shoulderO = at(shoulderF, -0.36 * near, shoulderZ - 0.03);
  const elbowT = at(shoulderF + Math.sin(pose.arm) * 0.44, 0.38 * near, shoulderZ - 0.03 - Math.cos(pose.arm) * 0.44);
  const hand = at(shoulderF + Math.sin(pose.arm + 0.16) * 0.92, 0.4 * near, shoulderZ - 0.03 - Math.cos(pose.arm + 0.16) * 0.92);
  limb(shoulderT, elbowT, 0.11, 0.09, KURTA);
  limb(elbowT, hand, 0.08, 0.07, SKIN);
  const elbowO = at(shoulderF + 0.1, -0.42 * near, shoulderZ - 0.5);
  limb(shoulderO, elbowO, 0.11, 0.09, KURTA);
  limb(elbowO, at(shoulderF + 0.24, -0.43 * near, shoulderZ - 0.92), 0.08, 0.07, SKIN);

  shadow(x, y, 0.7, 0.4);
  shadow(x, y, 1.6, 0.34);
  return hand;
}

const CANE: Color = [190, 136, 74];
const CANE_DARK: Color = [116, 74, 44];

// A woven cane bin. `filled` is how many pages are already in it.
export function drawBin(x: number, y: number, lift: number, filled: number) {
  const z = lift;
  drum(x, y, z, z + BIN_H, BIN_R * 0.8, BIN_R, (a, t, ix, iy, inner) => {
    const row = Math.floor(t * 9);
    const col = Math.floor((a / 6.283) * 26 + (row % 2) * 0.5);
    const weave = (row + col) % 2 ? 0.12 : -0.08;
    if (inner) return lit(CANE_DARK, 0.26 + (1 - t) * -0.14 + weave * 0.5, ix, iy, 0.5);
    return lit(CANE, 0.54 + Math.cos(a - 2.2) * 0.3 + weave, ix, iy, 0.3);
  });
  disc(x, y, z + 0.06, BIN_R * 0.8, () => ramp(CANE_DARK)[0]);
  const rim = ramp(CANE);
  for (let n = 0; n < 150; n++) {
    const a = (n / 150) * Math.PI * 2;
    plot(x + Math.cos(a) * BIN_R, y + Math.sin(a) * BIN_R, z + BIN_H + 0.02, rim[Math.cos(a - 2.2) > 0 ? 4 : 3]);
  }

  const pages = Math.min(filled, 7);
  for (let n = 0; n < pages; n++) {
    const a = grain(n, 4) * 6.283;
    const d = n === 0 ? 0 : grain(n, 8) * 0.42;
    const h = z + 0.6 + grain(n, 3) * 0.2 + (n / 7) * (BIN_H - 0.75);
    ball(x + Math.cos(a) * d, y + Math.sin(a) * d, h, PAPER_R, PAPER, "crumpled");
  }

  if (lift < 0.05) shadow(x, y, 0, BIN_R * 1.05, true);
  else shadow(x, y, 0, BIN_R * clamp(1 - lift * 0.3, 0.6, 1));
  shadow(x, y, BIN_H * 0.7, BIN_R * 0.82);
}

export function drawPaper(x: number, y: number, z: number, onFloor: boolean, overRoom: boolean) {
  ball(x, y, z, PAPER_R, PAPER, "crumpled");
  if (overRoom) shadow(x, y, onFloor ? 0 : z - PAPER_R, PAPER_R * 0.95, onFloor);
}

const GINGER: Color = [226, 142, 62];
const GINGER_LIGHT: Color = [244, 176, 96];
const GINGER_DARK: Color = [150, 76, 36];

// `up` is 0 asleep (curled in a loaf) and 1 alert. `hop` lifts the cat as it moves.
export function drawCat(x: number, y: number, heading: number, up: number, hop: number, time: number) {
  const fx = Math.cos(heading);
  const fy = Math.sin(heading);
  const k = 1.35;
  const z = hop;
  const rise = up * 0.3;
  const breathe = up ? 0 : Math.sin(time * 1.5) * 0.02;
  limb([x - fx * 0.4, y - fy * 0.4, z + 0.32 + rise], [x + fx * 0.4, y + fy * 0.4, z + 0.36 + rise], 0.32 + breathe, 0.3, GINGER, "flat");
  const hx = x + fx * (0.46 + up * 0.08) * k;
  const hy = y + fy * (0.46 + up * 0.08) * k;
  const hz = z + 0.43 + rise * 1.7;
  ball(hx, hy, hz, 0.25, GINGER_LIGHT, "flat");
  const ears = ramp(GINGER_DARK)[1];
  for (const side of [-1, 1]) {
    const ex = hx - fy * 0.17 * side;
    const ey = hy + fx * 0.17 * side;
    plot(ex, ey, hz + 0.24, ears);
    plot(ex, ey, hz + 0.34, ears);
  }
  // Tabby stripes across the back.
  const stripe = ramp(GINGER_DARK)[1];
  for (const along of [-0.34, -0.06, 0.22]) {
    for (let w = -0.3; w <= 0.3; w += 0.05) {
      plot(x + fx * along - fy * w, y + fy * along + fx * w, z + 0.64 + rise - Math.abs(w) * 0.5, stripe);
    }
  }
  const tailAngle = up ? 0.3 : 1.2 + Math.sin(time * 0.8) * 0.1;
  const cos = Math.cos(heading + Math.PI - tailAngle);
  const sin = Math.sin(heading + Math.PI - tailAngle);
  limb(
    [x - fx * 0.57, y - fy * 0.57, z + 0.22 + rise],
    [x - fx * 0.57 + cos * 0.84, y - fy * 0.57 + sin * 0.84, z + 0.14 + up * 0.9],
    0.08,
    0.06,
    GINGER_DARK,
    "flat",
  );
  if (up > 0.3) {
    for (const [a, s] of [[0.32, 0.18], [0.32, -0.18], [-0.32, 0.18], [-0.32, -0.18]]) {
      const lx = x + fx * a - fy * s;
      const ly = y + fy * a + fx * s;
      limb([lx, ly, z + 0.38], [lx, ly, z + 0.07], 0.07, 0.07, GINGER_DARK, "flat");
    }
  }
  shadow(x, y, 0, 0.5);
}

// Spinning blades behind the cage. Fast settings blur into a disc.
export function drawFanBlades(time: number, wind: number) {
  const { x, y, z } = fanSpot;
  const blade = pack(226, 232, 232);
  const dim = pack(120, 136, 140);
  const angle = (time * [0, 11, 19, 31][wind]) % 6.283;
  if (wind >= 2) {
    const phase = Math.floor(time * 30);
    for (let n = 0; n < 150; n++) {
      const a = (n / 150) * 6.283;
      const r = 0.2 + grain(n, phase % 5) * 0.72;
      plot(x + Math.cos(a) * r, y, z + Math.sin(a) * r, n % 3 ? dim : blade);
    }
  }
  for (let k = 0; k < 3; k++) {
    const a = angle + (k * 6.283) / 3;
    for (let r = 0.1; r <= 0.88; r += 0.05) {
      const wide = mix(0.02, 0.2, Math.sin(clamp(r / 0.9, 0, 1) * Math.PI));
      for (let w = -wide; w <= wide; w += 0.05) {
        plot(x + Math.cos(a + w) * r, y, z + Math.sin(a + w) * r, blade);
      }
    }
  }
}
