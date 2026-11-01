// The paper ball's physics. No drawing in here, so it can be simulated on its
// own: gravity, the fan, the floor, the walls, the furniture and the bin.

export const ROOM = { x0: -12, x1: 12, y0: -6.5, y1: 6.5 };
export const DESK = { x0: -9.6, x1: -3.6, y0: -6.5, y1: -4.4, z0: 0, z1: 1.7 };
export const SHELF = { x0: 5, x1: 11, y0: -6.5, y1: -5.3, z0: 0, z1: 3.7 };
const BOXES = [DESK, SHELF];

export const THROW_FROM = { x: 9.4, y: 0.6, z: 2.5 };
export const BIN_H = 1.8;
export const BIN_R = 1.05;
export const PAPER_R = 0.3;

const GRAVITY = 13;
const MAX_SPEED = 21;
const LOB = 7.2;
const ROLL_DRAG = 9;
const WIND_PER_LEVEL = 1;
const TIME_LIMIT = 4;

export type Hit = "floor" | "wall" | "desk" | "rim" | "in" | "gone" | "rest";
export type Bin = { x: number; y: number };
export type Paper = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  state: "air" | "in" | "rest" | "gone";
  rim: boolean;
  wall: boolean;
  floor: boolean;
  grounded: boolean;
  onFurniture: boolean;
};

export function launchVelocity(yaw: number, power: number) {
  // Every throw has the same lob, so distance grows evenly with the pull.
  const speed = power * MAX_SPEED;
  return { vx: Math.cos(yaw) * speed, vy: Math.sin(yaw) * speed, vz: LOB };
}

export function makePaper(yaw: number, power: number): Paper {
  return {
    ...THROW_FROM,
    ...launchVelocity(yaw, power),
    age: 0,
    state: "air",
    rim: false,
    wall: false,
    floor: false,
    grounded: false,
    onFurniture: false,
  };
}

// The path a throw will take, fan included, as [x, y, z] points. It stops once
// the ball drops to rim height or the floor. Uses the same step size as a
// 60fps game, so the line tells the truth about where the ball goes.
export function previewPath(yaw: number, power: number, windLevel: number) {
  const v = launchVelocity(yaw, power);
  const points: [number, number, number][] = [];
  let { x, y, z } = THROW_FROM;
  let { vy, vz } = v;
  const dt = 1 / 240;
  for (let k = 0; k < 720; k++) {
    vz -= GRAVITY * dt;
    vy += windLevel * WIND_PER_LEVEL * dt;
    x += v.vx * dt;
    y += vy * dt;
    z += vz * dt;
    if (vz < 0 && z <= BIN_H) {
      points.push([x, y, z]);
      break;
    }
    if (k % 7 === 6) points.push([x, y, z]);
  }
  return points;
}

function collideBox(p: Paper, b: (typeof BOXES)[number], on: (hit: Hit, force: number) => void) {
  const qx = Math.max(b.x0, Math.min(p.x, b.x1));
  const qy = Math.max(b.y0, Math.min(p.y, b.y1));
  const qz = Math.max(b.z0, Math.min(p.z, b.z1));
  let nx = p.x - qx;
  let ny = p.y - qy;
  let nz = p.z - qz;
  const dist = Math.hypot(nx, ny, nz);
  if (dist >= PAPER_R) return;
  if (dist === 0) {
    nx = 0;
    ny = 0;
    nz = 1;
    p.z = b.z1;
  } else {
    nx /= dist;
    ny /= dist;
    nz /= dist;
  }
  const push = PAPER_R - dist;
  p.x += nx * push;
  p.y += ny * push;
  p.z += nz * push;
  const into = p.vx * nx + p.vy * ny + p.vz * nz;
  if (into >= 0) return;
  const bounce = into < -1.4 ? 1.35 : 1;
  p.vx -= bounce * into * nx;
  p.vy -= bounce * into * ny;
  p.vz -= bounce * into * nz;
  if (nz > 0.7) {
    p.grounded = true;
    p.onFurniture = true;
  }
  p.wall = true;
  if (into < -1.4) on("desk", Math.min(1, -into / 8));
}

function collideBin(p: Paper, bin: Bin, lastZ: number, on: (hit: Hit, force: number) => void) {
  const dx = p.x - bin.x;
  const dy = p.y - bin.y;
  const d = Math.hypot(dx, dy);
  if (lastZ >= BIN_H && p.z < BIN_H && d < BIN_R - PAPER_R * 0.4) {
    p.state = "in";
    on("in", p.rim ? 0.5 : 1);
    return;
  }
  if (d >= BIN_R + PAPER_R || d === 0) return;

  if (p.z >= BIN_H) {
    // Over the rim: a ball clipping the edge bounces off the nearest rim point.
    const rx = p.x - (bin.x + (dx / d) * BIN_R);
    const ry = p.y - (bin.y + (dy / d) * BIN_R);
    const rz = p.z - BIN_H;
    const gap = Math.hypot(rx, ry, rz);
    if (gap >= PAPER_R || gap === 0) return;
    const nx = rx / gap;
    const ny = ry / gap;
    const nz = rz / gap;
    p.x += nx * (PAPER_R - gap);
    p.y += ny * (PAPER_R - gap);
    p.z += nz * (PAPER_R - gap);
    const into = p.vx * nx + p.vy * ny + p.vz * nz;
    if (into >= 0) return;
    p.vx -= 1.5 * into * nx;
    p.vy -= 1.5 * into * ny;
    p.vz -= 1.5 * into * nz;
    p.rim = true;
    on("rim", Math.min(1, -into / 7));
    return;
  }

  // Below the rim: the outside of the bin.
  const nx = dx / d;
  const ny = dy / d;
  p.x = bin.x + nx * (BIN_R + PAPER_R);
  p.y = bin.y + ny * (BIN_R + PAPER_R);
  const into = p.vx * nx + p.vy * ny;
  if (into >= 0) return;
  p.vx -= 1.45 * into * nx;
  p.vy -= 1.45 * into * ny;
  p.rim = true;
  on("rim", Math.min(1, -into / 7));
}

export function stepPaper(
  p: Paper,
  bin: Bin,
  windLevel: number,
  dt: number,
  on: (hit: Hit, force: number) => void,
) {
  if (p.state === "rest" || p.state === "gone") return;
  p.age += dt;

  if (p.state === "in") {
    p.vx = 0;
    p.vy = 0;
    p.x += (bin.x - p.x) * Math.min(1, dt * 10);
    p.y += (bin.y - p.y) * Math.min(1, dt * 10);
    p.vz -= GRAVITY * dt;
    p.z = Math.max(0.7, p.z + p.vz * dt);
    return;
  }

  const lastZ = p.z;
  p.grounded = false;
  p.vz -= GRAVITY * dt;
  if (p.z > PAPER_R + 0.05) p.vy += windLevel * WIND_PER_LEVEL * dt;
  p.x += p.vx * dt;
  p.y += p.vy * dt;
  p.z += p.vz * dt;

  if (p.x < ROOM.x0 + PAPER_R) {
    p.x = ROOM.x0 + PAPER_R;
    if (p.vx < 0) {
      if (p.vx < -1.4) on("wall", Math.min(1, -p.vx / 10));
      p.vx *= -0.5;
    }
    p.wall = true;
  }
  if (p.y < ROOM.y0 + PAPER_R) {
    p.y = ROOM.y0 + PAPER_R;
    if (p.vy < 0) {
      if (p.vy < -1.4) on("wall", Math.min(1, -p.vy / 10));
      p.vy *= -0.5;
    }
    p.wall = true;
  }

  const overFloor = p.x <= ROOM.x1 && p.y <= ROOM.y1;
  if (overFloor && p.z <= PAPER_R && lastZ >= PAPER_R - 0.2) {
    p.z = PAPER_R;
    if (p.vz < -1.4) {
      on("floor", Math.min(1, -p.vz / 8));
      p.floor = true;
      p.vz *= -0.34;
      p.vx *= 0.72;
      p.vy *= 0.72;
    } else {
      p.vz = 0;
    }
    p.grounded = true;
    p.onFurniture = false;
  }

  for (const b of BOXES) collideBox(p, b, on);
  collideBin(p, bin, lastZ, on);
  if (p.state !== "air") return;

  if (p.grounded) {
    const speed = Math.hypot(p.vx, p.vy);
    if (speed > 0) {
      const next = Math.max(0, speed - ROLL_DRAG * dt);
      p.vx *= next / speed;
      p.vy *= next / speed;
    }
    if (Math.hypot(p.vx, p.vy) < 0.2 && Math.abs(p.vz) < 0.8) {
      p.vx = 0;
      p.vy = 0;
      p.vz = 0;
      p.state = "rest";
      on("rest", 0);
      return;
    }
  }

  if (p.z < -9) {
    p.state = "gone";
    on("gone", 0);
    return;
  }

  // A ball can't stall a turn: anything still on the room after this rests.
  if (p.age > TIME_LIMIT && overFloor) {
    p.vx = 0;
    p.vy = 0;
    p.vz = 0;
    if (!p.onFurniture) p.z = PAPER_R;
    p.state = "rest";
    on("rest", 0);
  }
}
