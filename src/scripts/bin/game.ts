// "Bin the cliché": the small game in the footer. Each shot is a tired line of
// marketing copy, crumpled up. Pull back, let go, and get it in the bin.

import { binGame, person } from "../../content/site";
import { drawBin, drawCat, drawFanBlades, drawPaper, drawWriter, PAPER } from "./actors";
import { BIN_H, makePaper, previewPath, ROOM, stepPaper, THROW_FROM, type Hit, type Paper } from "./paper";
import { beginFrame, ball, clamp, dragToFloor, frame, H, mix, outlineMoving, overlay, pack, project, W } from "./pixels";
import { bakeRoom, drawAmbient } from "./room";

const SHOTS = 10;
const WIND_BY_SHOT = [0, 0, 1, 1, 0, 2, 1, 2, 3, 2];
const BIN_SPOTS = [
  { x: -1, y: 0.4 },
  { x: -4.4, y: -2 },
  { x: -3, y: 3.6 },
  { x: -7.6, y: 1 },
  { x: -1.6, y: -3.8 },
  { x: -8.8, y: 3.4 },
  { x: -6.2, y: 4.8 },
  { x: -10, y: -2.4 },
];
const CAT_SPOTS = [
  { x: 6.8, y: 4.8 },
  { x: 1.4, y: -4.4 },
  { x: -10, y: 2 },
  { x: 7, y: -3.6 },
  { x: -2.2, y: 5.4 },
];
const FULL_PULL = 13;
const HAND_REACH = 58;
const SWING_TIME = 0.2;

type Phase = "aim" | "swing" | "fly" | "wait" | "over";

export function startBinGame(root: HTMLElement) {
  const canvas = root.querySelector<HTMLCanvasElement>("[data-bin-canvas]")!;
  const line = root.querySelector<HTMLElement>("[data-bin-line]")!;
  const status = root.querySelector<HTMLElement>("[data-bin-status]")!;
  const scoreEl = root.querySelector<HTMLElement>("[data-bin-score]")!;
  const left = root.querySelector<HTMLElement>("[data-bin-left]")!;
  const again = root.querySelector<HTMLButtonElement>("[data-bin-again]")!;
  const muteButton = root.querySelector<HTMLButtonElement>("[data-bin-mute]")!;
  const hire = root.querySelector<HTMLAnchorElement>("[data-bin-hire]")!;
  const ctx = canvas.getContext("2d")!;
  canvas.width = W;
  canvas.height = H;
  const image = ctx.createImageData(W, H);
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  bakeRoom();

  const state = {
    phase: "aim" as Phase,
    shot: 0,
    score: 0,
    lines: [] as string[],
    yaw: Math.atan2(BIN_SPOTS[0].y - THROW_FROM.y, BIN_SPOTS[0].x - THROW_FROM.x),
    power: 0,
    swing: 0,
    wait: 0,
    time: 0,
    paper: null as Paper | null,
    litter: [] as Paper[],
    filled: 0,
    spot: 0,
    bin: { ...BIN_SPOTS[0] },
    hop: null as { from: { x: number; y: number }; to: { x: number; y: number }; t: number } | null,
    cat: { x: CAT_SPOTS[0].x, y: CAT_SPOTS[0].y, heading: 2.4, up: 0, hop: 0, spot: 0, move: null as { fromX: number; fromY: number; toX: number; toY: number; t: number } | null },
    pointer: null as { x: number; y: number; id: number } | null,
    touched: false,
    catHit: false,
  };

  const wind = () => (state.phase === "over" ? 0 : WIND_BY_SHOT[Math.min(state.shot, SHOTS - 1)]);

  // --- words on the page ------------------------------------------------------

  function setLine(text: string) {
    line.classList.remove("struck");
    line.textContent = text;
  }

  function say(text: string) {
    if (status.textContent !== text) status.textContent = text;
  }

  function renderScore() {
    scoreEl.textContent = String(state.score);
    const remaining = SHOTS - state.shot - (state.phase === "aim" ? 0 : 1);
    left.textContent = "▪".repeat(Math.max(0, remaining));
    left.setAttribute("aria-label", `${Math.max(0, remaining)} left`);
  }

  function shuffled(list: readonly string[]) {
    const out = [...list];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }

  // --- turns --------------------------------------------------------------------

  function newGame() {
    state.lines = shuffled(binGame.lines).slice(0, SHOTS);
    state.shot = 0;
    state.score = 0;
    state.litter = [];
    state.filled = 0;
    state.spot = 0;
    state.bin = { ...BIN_SPOTS[0] };
    state.hop = null;
    state.paper = null;
    root.classList.remove("bin-over");
    again.hidden = true;
    hire.hidden = true;
    startShot();
  }

  function startShot() {
    state.phase = "aim";
    state.power = 0;
    state.yaw = Math.atan2(state.bin.y - THROW_FROM.y, state.bin.x - THROW_FROM.x);
    setLine(state.lines[state.shot]);
    const level = wind();
    say(state.touched ? (level ? binGame.fan(level) : binGame.aim) : binGame.first);
    renderScore();
  }

  function release() {
    if (state.power < 0.06) {
      state.power = 0;
      return;
    }
    state.touched = true;
    state.phase = "swing";
    state.swing = 0;
    renderScore();
  }

  function settle(pause: number) {
    state.phase = "wait";
    state.wait = pause;
  }

  function endGame() {
    state.phase = "over";
    state.power = 0;
    line.classList.remove("struck");
    line.textContent = binGame.final(state.score, SHOTS);
    say(binGame.closing);
    root.classList.add("bin-over");
    again.hidden = false;
    hire.hidden = false;
    renderScore();
    sound("rest", 0);
  }

  function moveBin() {
    state.spot = (state.spot + 1) % BIN_SPOTS.length;
    state.hop = { from: { ...state.bin }, to: BIN_SPOTS[state.spot], t: 0 };
  }

  function moveCat() {
    const cat = state.cat;
    cat.spot = (cat.spot + 1 + Math.floor(Math.random() * (CAT_SPOTS.length - 1))) % CAT_SPOTS.length;
    const to = CAT_SPOTS[cat.spot];
    cat.move = { fromX: cat.x, fromY: cat.y, toX: to.x, toY: to.y, t: 0 };
    cat.heading = Math.atan2(to.y - cat.y, to.x - cat.x);
  }

  // What became of the ball.
  function onHit(hit: Hit, force: number) {
    const paper = state.paper;
    if (!paper) return;
    if (hit === "floor" || hit === "wall" || hit === "desk" || hit === "rim") sound(hit, force);
    if (hit === "in") {
      sound("in", force);
      const clean = !paper.rim;
      const points = clean ? 2 : 1;
      state.score += points;
      state.filled++;
      line.classList.add("struck");
      say(clean ? (paper.wall ? binGame.offWall : binGame.clean) : binGame.rim);
      renderScore();
      settle(1.1);
    } else if (hit === "gone") {
      sound("gone", 0);
      say(binGame.space);
      state.paper = null;
      settle(0.9);
    } else if (hit === "rest") {
      if (state.catHit) say(binGame.cat);
      else if (paper.onFurniture) say(paper.x < 0 ? binGame.desk : binGame.shelf);
      else say(binGame.miss);
      state.litter.push(paper);
      state.paper = null;
      settle(0.8);
    }
  }

  // --- the loop -----------------------------------------------------------------

  function update(dt: number) {
    state.time += dt;

    if (state.hop) {
      state.hop.t = Math.min(1, state.hop.t + dt / 0.55);
      if (state.hop.t >= 1) {
        state.bin = { ...state.hop.to };
        state.hop = null;
      }
    }

    const cat = state.cat;
    if (cat.move) {
      cat.move.t = Math.min(1, cat.move.t + dt / 0.75);
      const t = cat.move.t;
      cat.x = mix(cat.move.fromX, cat.move.toX, t);
      cat.y = mix(cat.move.fromY, cat.move.toY, t);
      cat.hop = Math.abs(Math.sin(t * Math.PI * 5)) * 0.2;
      cat.up = 1;
      if (t >= 1) {
        cat.move = null;
        cat.hop = 0;
      }
    } else {
      cat.up = Math.max(0, cat.up - dt * 0.8);
    }

    if (state.phase === "swing") {
      state.swing = Math.min(1, state.swing + dt / SWING_TIME);
      if (state.swing >= 0.6 && !state.paper) {
        state.paper = makePaper(state.yaw, state.power);
        state.catHit = false;
        sound("throw", state.power);
      }
      if (state.swing >= 1) state.phase = "fly";
    }

    if (state.paper) {
      const paper = state.paper;
      const level = wind();
      for (let k = 0; k < 4 && state.paper; k++) {
        stepPaper(paper, state.bin, level, dt / 4, onHit);
        if (!cat.move && !state.catHit && paper.state === "air" && paper.z < 0.9 && Math.hypot(paper.x - cat.x, paper.y - cat.y) < 0.7) {
          state.catHit = true;
          paper.vx *= -0.3;
          paper.vy *= -0.3;
          paper.vz = 2.4;
          sound("cat", 1);
          moveCat();
        }
      }
    }

    if (state.phase === "wait") {
      state.wait -= dt;
      const inBin = state.paper?.state === "in";
      if (state.wait <= 0) {
        if (inBin) state.paper = null;
        state.shot++;
        if (state.shot >= SHOTS) endGame();
        else {
          if (inBin) moveBin();
          startShot();
        }
      }
    }
  }

  function draw() {
    beginFrame();
    const time = reduced ? 0 : state.time;
    const level = wind();
    drawAmbient(time, level, reduced);
    drawFanBlades(time, level);

    const cat = state.cat;
    drawCat(cat.x, cat.y, cat.heading, cat.up, cat.hop, time);

    let bx = state.bin.x;
    let by = state.bin.y;
    let lift = 0;
    if (state.hop) {
      const t = state.hop.t;
      bx = mix(state.hop.from.x, state.hop.to.x, t);
      by = mix(state.hop.from.y, state.hop.to.y, t);
      lift = Math.sin(t * Math.PI) * 1.5;
    }
    drawBin(bx, by, lift, state.filled);

    for (const p of state.litter) drawPaper(p.x, p.y, p.z, !p.onFurniture, !p.onFurniture);
    if (state.paper) {
      const p = state.paper;
      const overRoom = p.x <= ROOM.x1 && p.y <= ROOM.y1 && p.z > -0.1;
      drawPaper(p.x, p.y, p.z, false, overRoom);
    }

    const aiming = state.phase === "aim";
    const hand = drawWriter(THROW_FROM.x, THROW_FROM.y, poseNow(), time);
    if (aiming || (state.phase === "swing" && !state.paper)) ball(hand[0], hand[1], hand[2] + 0.05, 0.3, PAPER, "crumpled");

    outlineMoving();
    if (aiming) drawAim();
    if (aiming && !state.touched && state.power === 0) drawHint(hand);

    const data = image.data;
    data.set(new Uint8ClampedArray(frame.buffer));
    ctx.putImageData(image, 0, 0);
  }

  function poseNow() {
    const breathe = reduced ? 0 : Math.sin(state.time * 1.7) * 0.015;
    if (state.phase === "aim") {
      return {
        yaw: state.yaw,
        arm: mix(1, -1.7, state.power),
        lean: 0.06 - state.power * 0.2 + breathe,
        crouch: state.power * 0.5,
      };
    }
    if (state.phase === "swing") {
      const t = state.swing * state.swing * (3 - 2 * state.swing);
      return {
        yaw: state.yaw,
        arm: mix(mix(1, -1.7, state.power), 1.9, t),
        lean: mix(0.06 - state.power * 0.2, 0.36, t),
        crouch: mix(state.power * 0.5, 0.18, t),
      };
    }
    return { yaw: state.yaw, arm: 0.2, lean: breathe + 0.04, crouch: 0 };
  }

  function drawAim() {
    if (state.power < 0.06) return;
    const points = previewPath(state.yaw, state.power);
    const ink = pack(255, 244, 222);
    const shown = wind() ? Math.ceil(points.length * 0.72) : points.length;
    for (let k = 1; k < shown; k += 2) {
      const p = project(points[k][0], points[k][1], points[k][2]);
      overlay(p.sx, p.sy, ink);
      overlay(p.sx + 1, p.sy, ink);
      overlay(p.sx, p.sy + 1, ink);
      overlay(p.sx + 1, p.sy + 1, ink);
    }
    if (!wind() && points.length) {
      const end = points[points.length - 1];
      const p = project(end[0], end[1], BIN_H);
      for (let k = -2; k <= 2; k++) {
        overlay(p.sx + k, p.sy, ink);
        overlay(p.sx, p.sy + k, ink);
      }
    }
  }

  // A small bobbing arrow over the paper, until the first throw.
  function drawHint(hand: readonly [number, number, number]) {
    const p = project(hand[0], hand[1], hand[2]);
    const bob = reduced ? 0 : (Math.floor(state.time * 3) % 2) * 2;
    const cx = Math.floor(p.sx);
    const top = Math.floor(p.sy) - 16 - bob;
    const ink = pack(14, 14, 14);
    const fill = pack(255, 96, 40);
    const rows = ["..oooo..", "..oXXo..", "..oXXo..", "oooXXooo", "oXXXXXXo", ".oXXXXo.", "..oXXo..", "...oo..."];
    rows.forEach((row, y) => {
      [...row].forEach((cell, x) => {
        if (cell === "o") overlay(cx - 4 + x, top + y, ink);
        if (cell === "X") overlay(cx - 4 + x, top + y, fill);
      });
    });
  }

  let raf = 0;
  let last = 0;
  let visible = false;
  function tick(now: number) {
    update(Math.min(0.04, (now - last) / 1000 || 0));
    last = now;
    draw();
    raf = visible ? requestAnimationFrame(tick) : 0;
  }
  function wake() {
    if (raf || !visible) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }
  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    wake();
  }).observe(canvas);

  // --- input --------------------------------------------------------------------

  const toCanvas = (e: { clientX: number; clientY: number }) => {
    const r = canvas.getBoundingClientRect();
    return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
  };

  // On a touch screen the footer still has to scroll, so a finger only starts
  // a throw from the paper itself. A mouse can pull from anywhere.
  const nearPaper = (e: { clientX: number; clientY: number }) => {
    const at = toCanvas(e);
    const p = project(THROW_FROM.x, THROW_FROM.y, THROW_FROM.z - 0.8);
    return Math.hypot(at.x - p.sx, at.y - p.sy) < HAND_REACH;
  };
  canvas.addEventListener(
    "touchstart",
    (e) => {
      if (state.phase !== "aim") return;
      if (nearPaper(e.touches[0])) e.preventDefault();
    },
    { passive: false },
  );

  canvas.addEventListener("pointerdown", (e) => {
    wakeAudio();
    if (state.phase !== "aim") return;
    if (e.pointerType === "touch" && !nearPaper(e)) return;
    canvas.setPointerCapture(e.pointerId);
    const at = toCanvas(e);
    state.pointer = { x: at.x, y: at.y, id: e.pointerId };
    root.classList.add("bin-pulling");
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!state.pointer || e.pointerId !== state.pointer.id) return;
    const at = toCanvas(e);
    const pull = dragToFloor(at.x - state.pointer.x, at.y - state.pointer.y);
    const len = Math.hypot(pull.x, pull.y);
    state.power = clamp(len / FULL_PULL, 0, 1);
    if (len > 0.4) state.yaw = Math.atan2(-pull.y, -pull.x);
  });
  const endPull = (e: PointerEvent, cancel: boolean) => {
    if (!state.pointer || e.pointerId !== state.pointer.id) return;
    state.pointer = null;
    root.classList.remove("bin-pulling");
    if (state.phase !== "aim") return;
    if (cancel) state.power = 0;
    else release();
  };
  canvas.addEventListener("pointerup", (e) => endPull(e, false));
  canvas.addEventListener("pointercancel", (e) => endPull(e, true));

  canvas.addEventListener("keydown", (e) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      wakeAudio();
      if (state.phase === "aim") release();
      else if (state.phase === "over") newGame();
      return;
    }
    if (state.phase !== "aim") return;
    if (e.key === "ArrowLeft") state.yaw -= 0.02;
    else if (e.key === "ArrowRight") state.yaw += 0.02;
    else if (e.key === "ArrowUp") state.power = clamp(state.power + 0.02, 0, 1);
    else if (e.key === "ArrowDown") state.power = clamp(state.power - 0.02, 0, 1);
    else return;
    e.preventDefault();
  });

  again.addEventListener("click", () => {
    wakeAudio();
    newGame();
  });

  // --- sound --------------------------------------------------------------------

  let audio: AudioContext | null = null;
  let noise: AudioBuffer | null = null;
  let muted = false;

  function wakeAudio() {
    if (audio) {
      if (audio.state === "suspended") void audio.resume();
      return;
    }
    audio = new AudioContext();
    noise = audio.createBuffer(1, audio.sampleRate * 0.4, audio.sampleRate);
    const data = noise.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  }

  function tone(from: number, to: number, length: number, gain: number, type: OscillatorType) {
    if (!audio) return;
    const now = audio.currentTime;
    const osc = audio.createOscillator();
    const amp = audio.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, now);
    osc.frequency.exponentialRampToValueAtTime(to, now + length);
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0004, now + length);
    osc.connect(amp).connect(audio.destination);
    osc.start(now);
    osc.stop(now + length + 0.01);
  }

  // Paper is mostly noise: a short band of it, shaped like a rustle.
  function rustle(freq: number, length: number, gain: number) {
    if (!audio || !noise) return;
    const now = audio.currentTime;
    const source = audio.createBufferSource();
    source.buffer = noise;
    const filter = audio.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = freq;
    filter.Q.value = 1.1;
    const amp = audio.createGain();
    amp.gain.setValueAtTime(gain, now);
    amp.gain.exponentialRampToValueAtTime(0.0004, now + length);
    source.connect(filter).connect(amp).connect(audio.destination);
    source.start(now, Math.random() * 0.2, length + 0.01);
  }

  function sound(kind: Hit | "throw" | "cat", force: number) {
    if (!audio || muted) return;
    if (kind === "throw") rustle(1500 + force * 1200, 0.14, 0.05 + force * 0.05);
    else if (kind === "floor") rustle(2600, 0.05, 0.03 + force * 0.08);
    else if (kind === "wall" || kind === "desk") rustle(1400, 0.07, 0.04 + force * 0.08);
    else if (kind === "rim") {
      rustle(1800, 0.05, 0.05 + force * 0.06);
      tone(520, 340, 0.06, 0.04, "triangle");
    } else if (kind === "in") {
      rustle(900, 0.12, 0.1);
      tone(190, 100, 0.1, 0.1, "sine");
      tone(660, 880, 0.14, 0.03 + force * 0.03, "triangle");
    } else if (kind === "gone") tone(420, 110, 0.5, 0.035, "sine");
    else if (kind === "cat") tone(880, 520, 0.2, 0.05, "triangle");
  }

  muteButton.addEventListener("click", () => {
    muted = !muted;
    muteButton.textContent = muted ? "sound off" : "sound on";
    muteButton.setAttribute("aria-pressed", String(muted));
  });

  // --- size -----------------------------------------------------------------------

  // Whole device pixels keep the art crisp. Only a very narrow screen, where
  // that would leave the room tiny, falls back to an in-between size.
  const stage = canvas.parentElement!;
  function fit() {
    const box = stage.getBoundingClientRect();
    const dpr = devicePixelRatio || 1;
    const room = Math.min(box.width / W, box.height / H);
    const whole = Math.max(1, Math.floor(room * dpr)) / dpr;
    const scale = box.width < 600 && whole * W < box.width * 0.72 ? room : whole;
    canvas.style.width = `${Math.round(W * scale)}px`;
    canvas.style.height = `${Math.round(H * scale)}px`;
  }
  new ResizeObserver(fit).observe(stage);
  fit();

  hire.href = `mailto:${person.email}`;
  newGame();
  draw();
}
