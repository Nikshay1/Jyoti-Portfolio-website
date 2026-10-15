// A small side-scrolling platformer drawn in text, living in the footer.
// Run, stomp the typos, collect the pilcrows and reach the flag to rank #1.
//
// The world is a grid of tiles. Each tile is drawn as two characters so
// tiles look roughly square in a monospace font. Positions and sizes below
// are in tiles; y grows downwards.

const H = 14; // world height in tiles
const GRAVITY = 70;
const JUMP_V = 25;
const RUN_MAX = 9;
const RUN_ACCEL = 55;
const FRICTION = 45;
const STOMP_BOUNCE = 15;
const ENEMY_SPEED = 2;
const STEP = 1 / 120;

const SOLID = new Set(["#", "B", "?", "U", "[", "]", "{", "}"]);

type Box = { x: number; y: number; w: number; h: number };
type Body = Box & { vx: number; vy: number; ground: boolean };
type Enemy = Body & { dir: number; dead: number };
type Particle = { x: number; y: number; vy: number; ch: string; cls: string; life: number };
type Mode = "idle" | "play" | "dead" | "won";

// ---------------------------------------------------------------------------
// Level

function buildLevel() {
  const W = 182;
  const map: string[][] = Array.from({ length: H }, () => Array(W).fill(" "));
  const enemies: [number, number][] = [];
  const set = (x: number, y: number, ch: string) => {
    if (x >= 0 && x < W && y >= 0 && y < H) map[y][x] = ch;
  };
  const ground = (a: number, b: number) => {
    for (let x = a; x <= b; x++) for (let y = 12; y < H; y++) set(x, y, "#");
  };
  const row = (x: number, y: number, s: string) => [...s].forEach((ch, i) => ch !== " " && set(x + i, y, ch));
  const pipe = (x: number, h: number) => {
    set(x, 12 - h, "[");
    set(x + 1, 12 - h, "]");
    for (let y = 13 - h; y < 12; y++) {
      set(x, y, "{");
      set(x + 1, y, "}");
    }
  };
  const stairs = (x: number, n: number, up: boolean) => {
    for (let i = 0; i < n; i++) {
      const h = up ? i + 1 : n - i;
      for (let y = 12 - h; y < 12; y++) set(x + i, y, "#");
    }
  };

  ground(0, 25);
  row(9, 8, "B?B?B");
  set(11, 4, "?");
  enemies.push([17, 11]);
  pipe(21, 2);

  ground(28, 44);
  pipe(31, 3);
  enemies.push([36, 11]);
  pipe(40, 4);
  row(45, 7, "ooooo");

  ground(50, 70);
  row(53, 8, "BB?BB?BB");
  row(57, 4, "BBBBBB");
  row(57, 3, "oooooo");
  enemies.push([55, 11], [59, 11]);
  set(63, 11, "^");
  set(64, 11, "^");

  row(72, 9, "BB");
  row(72, 8, "oo");

  ground(76, 112);
  stairs(79, 4, true);
  stairs(85, 4, false);
  for (let x = 83; x <= 84; x++) for (let y = 12; y < H; y++) set(x, y, " ");
  row(83, 6, "oo");
  enemies.push([94, 11], [97, 11]);
  row(99, 8, "?B?");
  row(99, 4, "ooo");
  pipe(106, 3);
  set(110, 11, "^");
  set(111, 11, "^");

  ground(113, 125);
  row(114, 7, "oooooo");
  set(118, 11, "^");
  set(119, 11, "^");
  enemies.push([122, 11]);

  row(129, 10, "BBB");
  row(134, 8, "B?B");
  row(134, 5, "ooo");

  ground(139, W - 1);
  enemies.push([145, 11]);
  stairs(150, 8, true);
  for (let y = 4; y < 12; y++) set(158, y, "#");

  const flagX = 166;
  for (let y = 3; y < 12; y++) set(flagX, y, "|");
  set(flagX, 2, "F");
  set(flagX + 1, 2, "f");
  set(flagX, 11, "#");

  let coins = 0;
  map.forEach((r) => r.forEach((ch) => (ch === "o" || ch === "?") && coins++));

  return { W, map, enemies, flagX, coins };
}

// Background clouds, drawn dim and scrolled at half speed.
const CLOUDS: [number, number, string[]][] = [
  [6, 1, [" .--. ", "(    )", " '--' "]],
  [40, 2, ["  .---.  ", "(       )"]],
  [78, 0, [" .--. ", "(    )", " '--' "]],
  [120, 1, ["  .---.  ", "(       )"]],
  [160, 2, [" .--. ", "(    )"]],
];

// ---------------------------------------------------------------------------
// Drawing helpers

function tileGlyph(map: string[][], x: number, y: number): [string, string] {
  const t = map[y][x];
  switch (t) {
    case "#":
      return y > 0 && map[y - 1][x] !== "#" ? ["##", "g1"] : [(x + y) % 2 ? ".:" : ":.", "g2"];
    case "B":
      return ["[]", "b"];
    case "?":
      return ["??", "a"];
    case "U":
      return ["[]", "g2"];
    case "[":
      return ["[=", "b"];
    case "]":
      return ["=]", "b"];
    case "{":
      return ["|:", "b"];
    case "}":
      return [":|", "b"];
    case "^":
      return ["/\\", "a"];
    case "o":
      return ["()", "a"];
    case "|":
      return [" |", "b"];
    case "F":
      return [" |", "b"];
    case "f":
      return ["> ", "a"];
    default:
      return ["  ", ""];
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// ---------------------------------------------------------------------------

export function initGame() {
  const root = document.querySelector<HTMLElement>("[data-game]");
  const screen = root?.querySelector<HTMLElement>(".game-screen");
  if (!root || !screen) return;

  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = matchMedia("(hover: none), (pointer: coarse)").matches;
  root.classList.toggle("is-touch", touch);

  let level = buildLevel();
  let map = level.map;
  let mode: Mode = "idle";
  let player: Body;
  let enemies: Enemy[];
  let particles: Particle[];
  let score = 0;
  let time = 0;
  let deadFor = 0;
  let animT = 0;
  let camX = 0;
  let best = readBest();
  let cols = 60;
  const keys = { left: false, right: false, jump: false };
  let jumpHeld = false;

  function reset() {
    level = buildLevel();
    map = level.map;
    player = { x: 3, y: 10, w: 0.7, h: 1.8, vx: 0, vy: 0, ground: false };
    enemies = level.enemies.map(([x, y]) => ({ x, y, w: 0.9, h: 0.9, vx: 0, vy: 0, ground: false, dir: -1, dead: 0 }));
    particles = [];
    score = 0;
    time = 0;
    deadFor = 0;
  }

  // --- physics -------------------------------------------------------------

  const solid = (tx: number, ty: number) => {
    if (tx < 0 || tx >= level.W) return true;
    if (ty < 0 || ty >= H) return false;
    return SOLID.has(map[ty][tx]);
  };

  function moveX(b: Body, dt: number) {
    b.x += b.vx * dt;
    const top = Math.floor(b.y);
    const bottom = Math.floor(b.y + b.h - 0.001);
    if (b.vx > 0) {
      const tx = Math.floor(b.x + b.w);
      for (let ty = top; ty <= bottom; ty++)
        if (solid(tx, ty)) {
          b.x = tx - b.w - 0.001;
          b.vx = 0;
          return true;
        }
    } else if (b.vx < 0) {
      const tx = Math.floor(b.x);
      for (let ty = top; ty <= bottom; ty++)
        if (solid(tx, ty)) {
          b.x = tx + 1.001;
          b.vx = 0;
          return true;
        }
    }
    return false;
  }

  function moveY(b: Body, dt: number, onHead?: (tx: number, ty: number) => void) {
    b.vy = Math.min(b.vy + GRAVITY * dt, 40);
    b.y += b.vy * dt;
    b.ground = false;
    const left = Math.floor(b.x);
    const right = Math.floor(b.x + b.w - 0.001);
    if (b.vy > 0) {
      const ty = Math.floor(b.y + b.h);
      for (let tx = left; tx <= right; tx++)
        if (solid(tx, ty)) {
          b.y = ty - b.h;
          b.vy = 0;
          b.ground = true;
          return;
        }
    } else if (b.vy < 0) {
      const ty = Math.floor(b.y);
      for (let tx = left; tx <= right; tx++)
        if (solid(tx, ty)) {
          b.y = ty + 1;
          b.vy = 0;
          // Bump the block closest to the middle of the head.
          const mid = Math.floor(b.x + b.w / 2);
          onHead?.(solid(mid, ty) ? mid : tx, ty);
          return;
        }
    }
  }

  const overlap = (a: Box, b: Box) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

  function hitBlock(tx: number, ty: number) {
    if (map[ty][tx] !== "?") return;
    map[ty][tx] = "U";
    score++;
    particles.push({ x: tx, y: ty - 1, vy: -9, ch: "()", cls: "a", life: 0.45 });
  }

  function die() {
    if (mode !== "play") return;
    mode = "dead";
    deadFor = 0;
    player.vy = -16;
  }

  function win() {
    if (mode !== "play") return;
    mode = "won";
    if (!best || time < best) {
      best = time;
      writeBest(time);
    }
    for (let i = 0; i < 14; i++)
      particles.push({
        x: level.flagX - 3 + Math.random() * 7,
        y: 3 + Math.random() * 6,
        vy: -2 - Math.random() * 4,
        ch: Math.random() < 0.5 ? "* " : "¶ ",
        cls: "a",
        life: 0.8 + Math.random() * 0.8,
      });
  }

  function stepEnemies(dt: number) {
    for (const e of enemies) {
      if (e.dead) {
        e.dead += dt;
        continue;
      }
      e.vx = e.dir * ENEMY_SPEED;
      if (moveX(e, dt)) e.dir *= -1;
      moveY(e, dt);
      // Turn around at ledges instead of walking off.
      const ahead = e.dir > 0 ? Math.floor(e.x + e.w + 0.05) : Math.floor(e.x - 0.05);
      if (e.ground && !solid(ahead, Math.floor(e.y + e.h + 0.1))) e.dir *= -1;
    }
    enemies = enemies.filter((e) => e.dead < 0.4 && e.y < H + 2);
  }

  function step(dt: number) {
    animT += dt;
    for (const p of particles) {
      p.y += p.vy * dt;
      p.vy += 18 * dt;
      p.life -= dt;
    }
    particles = particles.filter((p) => p.life > 0);

    if (mode === "idle") {
      if (!reduced) stepEnemies(dt);
      return;
    }
    if (mode === "won") return;
    if (mode === "dead") {
      deadFor += dt;
      player.vy += GRAVITY * 0.6 * dt;
      player.y += player.vy * dt;
      return;
    }

    time += dt;
    const p = player;
    const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
    if (dir) p.vx = Math.max(-RUN_MAX, Math.min(RUN_MAX, p.vx + dir * RUN_ACCEL * dt));
    else p.vx -= Math.sign(p.vx) * Math.min(Math.abs(p.vx), FRICTION * dt);

    if (keys.jump && !jumpHeld && p.ground) p.vy = -JUMP_V;
    if (!keys.jump && p.vy < -6) p.vy *= 0.6; // short hop when released early
    jumpHeld = keys.jump;

    moveX(p, dt);
    moveY(p, dt, hitBlock);

    // Pilcrows and hazards in the tiles the player overlaps.
    for (let ty = Math.floor(p.y); ty <= Math.floor(p.y + p.h - 0.001); ty++)
      for (let tx = Math.floor(p.x); tx <= Math.floor(p.x + p.w - 0.001); tx++) {
        if (ty < 0 || ty >= H) continue;
        const t = map[ty][tx];
        if (t === "o") {
          map[ty][tx] = " ";
          score++;
        } else if (t === "^" && p.y + p.h > ty + 0.45) die();
      }

    // Touching the flagpole (its base block stops you just short of it).
    if (p.x + p.w >= level.flagX - 0.05) win();

    stepEnemies(dt);
    for (const e of enemies) {
      if (e.dead || !overlap(p, e)) continue;
      if (p.vy > 0 && p.y + p.h - e.y < 0.6) {
        e.dead = 0.001;
        p.vy = -STOMP_BOUNCE;
      } else die();
    }

    if (p.y > H + 1) die();
  }

  // --- drawing -------------------------------------------------------------

  function measure() {
    const probe = document.createElement("span");
    probe.textContent = "0".repeat(20);
    screen!.append(probe);
    const cw = probe.getBoundingClientRect().width / 20;
    probe.remove();
    cols = Math.max(24, Math.floor(screen!.clientWidth / cw));
    if (cols % 2) cols--;
  }

  function draw() {
    const viewTiles = cols / 2;
    const target = player.x - viewTiles * 0.38;
    camX = Math.max(0, Math.min(level.W - viewTiles, mode === "idle" ? 0 : target));
    const cam = Math.round(camX * 2); // in characters

    const chars: string[][] = Array.from({ length: H }, () => Array(cols).fill(" "));
    const cls: string[][] = Array.from({ length: H }, () => Array(cols).fill(""));
    const put = (cx: number, y: number, s: string, c: string) => {
      if (y < 0 || y >= H) return;
      for (let i = 0; i < s.length; i++) {
        const x = cx + i;
        if (x >= 0 && x < cols && s[i] !== " ") {
          chars[y][x] = s[i];
          cls[y][x] = c;
        }
      }
    };

    for (const [x, y, art] of CLOUDS) {
      const cx = Math.round(x * 2 - cam * 0.5);
      art.forEach((line, i) => put(cx, y + i, line, "g2"));
    }

    for (let y = 0; y < H; y++)
      for (let c = 0; c < cols; c++) {
        const wc = cam + c;
        const tx = wc >> 1;
        if (tx >= level.W) continue;
        const [g, k] = tileGlyph(map, tx, y);
        const ch = g[wc & 1];
        if (ch !== " ") {
          chars[y][c] = ch;
          cls[y][c] = k;
        }
      }

    put(level.flagX * 2 + 4 - cam, 10, "#1", "a");

    for (const e of enemies) {
      const glyph = e.dead ? "__" : Math.floor(animT * 4) % 2 ? "òó" : "óò";
      put(Math.round((e.x + e.w / 2) * 2 - 1) - cam, Math.round(e.y), glyph, "b");
    }

    for (const q of particles) put(Math.round(q.x * 2) - cam, Math.round(q.y), q.ch, q.cls);

    const p = player;
    const px = Math.round((p.x + p.w / 2) * 2 - 1) - cam;
    const py = Math.round(p.y);
    const running = Math.abs(p.vx) > 0.5 && p.ground;
    const head = mode === "dead" ? "xx" : "()";
    const body = !p.ground && mode !== "idle" ? "/|" : running ? (Math.floor(animT * 9) % 2 ? "/|" : "|\\") : "/\\";
    put(px, py, head, "p");
    put(px, py + 1, body, "p");

    // Messages over the scene.
    const lines = message();
    lines.forEach((text, i) => {
      const y = 4 + i * 2;
      const padded = `  ${text}  `;
      const cx = Math.max(0, Math.floor((cols - padded.length) / 2));
      for (let j = 0; j < padded.length && cx + j < cols; j++) {
        chars[y][cx + j] = padded[j];
        cls[y][cx + j] = i === 0 ? "m" : "m2";
      }
    });

    const rank = mode === "won" ? 1 : Math.max(1, Math.round(100 - 99 * Math.min(1, p.x / level.flagX)));
    const hud = hudLine(`() ${String(score).padStart(2, "0")}/${level.coins}`, `RANK #${rank}`, fmt(time));

    let html = `<span class="h">${esc(hud)}</span>\n`;
    for (let y = 0; y < H; y++) {
      let run = "";
      let runCls = cls[y][0];
      for (let c = 0; c < cols; c++) {
        if (cls[y][c] !== runCls) {
          html += runCls ? `<span class="${runCls}">${esc(run)}</span>` : esc(run);
          run = "";
          runCls = cls[y][c];
        }
        run += chars[y][c];
      }
      html += runCls ? `<span class="${runCls}">${esc(run)}</span>` : esc(run);
      if (y < H - 1) html += "\n";
    }
    screen!.innerHTML = html;
  }

  function hudLine(a: string, b: string, c: string) {
    const gap = Math.max(1, Math.floor((cols - a.length - b.length - c.length) / 2));
    return (a + " ".repeat(gap) + b + " ".repeat(Math.max(1, cols - a.length - gap - b.length - c.length)) + c).slice(0, cols);
  }

  function message(): string[] {
    const start = touch ? "TAP TO PLAY" : "CLICK OR PRESS ENTER TO PLAY";
    if (mode === "idle")
      return [start, touch ? "use the buttons below" : "<- -> move   SPACE jump   ESC quit"];
    if (mode === "dead" && deadFor > 0.6)
      return ["DROPPED OUT OF THE INDEX", touch ? "tap to try again" : "press R to try again"];
    if (mode === "won")
      return [`RANKED #1 IN ${fmt(time)}`, `() ${score}/${level.coins}   best ${fmt(best ?? time)}   ${touch ? "tap" : "R"} to replay`];
    return [];
  }

  const fmt = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, "0")}`;

  // --- loop ----------------------------------------------------------------

  let visible = false;
  let raf = 0;
  let last = 0;
  let acc = 0;

  function frame(now: number) {
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    acc += dt;
    while (acc >= STEP) {
      step(STEP);
      acc -= STEP;
    }
    draw();
    raf = visible && (mode !== "idle" || !reduced) ? requestAnimationFrame(frame) : 0;
  }

  function wake() {
    if (!raf && visible) {
      last = performance.now();
      raf = requestAnimationFrame(frame);
    }
  }

  function start() {
    reset();
    mode = "play";
    root!.classList.add("is-playing");
    root!.focus({ preventScroll: true });
    wake();
  }

  function quit() {
    mode = "idle";
    reset();
    root!.classList.remove("is-playing");
    keys.left = keys.right = keys.jump = false;
    wake();
    draw();
  }

  // --- input ---------------------------------------------------------------

  const active = () => mode !== "idle";

  root.addEventListener("click", (e) => {
    if ((e.target as Element).closest(".game-pad")) return;
    if (mode === "idle" || (mode === "dead" && deadFor > 0.6) || mode === "won") start();
  });

  root.addEventListener("keydown", (e) => {
    if (mode === "idle" && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      start();
    }
  });

  const keyMap: Record<string, keyof typeof keys> = {
    ArrowLeft: "left",
    a: "left",
    A: "left",
    ArrowRight: "right",
    d: "right",
    D: "right",
    ArrowUp: "jump",
    w: "jump",
    W: "jump",
    " ": "jump",
  };

  addEventListener("keydown", (e) => {
    if (!active()) return;
    if (e.key === "Escape") return quit();
    if ((e.key === "r" || e.key === "R") && mode !== "play") return start();
    const k = keyMap[e.key];
    if (k) {
      keys[k] = true;
      e.preventDefault();
    }
  });
  addEventListener("keyup", (e) => {
    const k = keyMap[e.key];
    if (k) keys[k] = false;
  });

  root.querySelectorAll<HTMLButtonElement>("[data-key]").forEach((btn) => {
    const k = btn.dataset.key as keyof typeof keys;
    const on = (e: Event) => {
      e.preventDefault();
      if (mode === "idle" || (mode !== "play" && k === "jump")) start();
      keys[k] = true;
    };
    const off = () => (keys[k] = false);
    btn.addEventListener("pointerdown", on);
    btn.addEventListener("pointerup", off);
    btn.addEventListener("pointercancel", off);
    btn.addEventListener("pointerleave", off);
  });

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible && mode === "play") keys.left = keys.right = keys.jump = false;
    if (visible) wake();
  }).observe(root);

  new ResizeObserver(() => {
    measure();
    draw();
  }).observe(screen);

  reset();
  measure();
  draw();

  // Lets local checks place the player anywhere; never shipped in builds.
  if (import.meta.env.DEV)
    Object.assign(window, {
      __game: {
        place: (x: number, y: number) => Object.assign(player, { x, y, vx: 0, vy: 0 }),
        clearEnemies: () => (enemies = []),
        state: () => ({ mode, x: player.x, y: player.y, score }),
      },
    });
}

function readBest(): number | null {
  try {
    const v = Number(localStorage.getItem("footer-game-best"));
    return v > 0 ? v : null;
  } catch {
    return null;
  }
}

function writeBest(t: number) {
  try {
    localStorage.setItem("footer-game-best", String(t));
  } catch {}
}
