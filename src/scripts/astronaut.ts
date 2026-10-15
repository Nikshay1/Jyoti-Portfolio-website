// Pixel art for the footer astronaut: Jyoti in a space helmet, with round
// glasses, waving with one hand and holding a pencil in the other.
// `astronaut()` returns a grid of colours (null = transparent).

const PALETTE: Record<string, string> = {
  O: "#eef0f4", // helmet rim
  o: "#a9aebb", // helmet rim, shaded side
  G: "#243044", // glass
  g: "#2d3b54", // glass, lighter band
  L: "#7e97c2", // glass reflection
  W: "#ffffff",
  H: "#2b1d18", // hair
  h: "#4b342b", // hair highlight
  S: "#f3c6a5", // skin
  s: "#e0a985", // skin shadow
  E: "#1b1414", // eyes
  e: "#ffffff", // eye shine
  R: "#6e4a2c", // glasses frame
  B: "#f39a8f", // blush
  M: "#a8433b", // mouth
  U: "#f4f4f1", // suit
  u: "#cdd0d8", // suit shadow
  A: "#ff4f1a", // accent
  a: "#c43a12", // accent shadow
  K: "#3a3e48", // boots and gloves
  Y: "#ffc94a", // pencil
  y: "#e0a92c",
  P: "#2b1d18", // pencil tip
};

// 14 x 14, placed inside the helmet.
const FACE = [
  "....HHHHHH....",
  "..HHHHHHHhHH..",
  ".HHHHHHHHHhHH.",
  ".HHHHHHHSHHHHH",
  "HHHSSSSSSSHHHH",
  "HHSRRSSSSRRSHH",
  "HHReERRRReERHH",
  "HHREERSSREERHH",
  "HHSRRSSSSRRSHH",
  "HHBBSSSSSSBBHH",
  "HHSSSMSSMSSSHH",
  "HH.SSSMMSSS.HH",
  "HH..sSSSSs..HH",
  "H...........HH",
];

// Same face with eyes closed, for blinking.
const BLINK_ROWS: Record<number, string> = {
  6: "HHRSSRRRRSSRHH",
  7: "HHREERSSREERHH",
};

// 22 x 12, the suit below the helmet. Two frames for the waving arm.
const BODY_A = [
  "......oOOOOOOOOo......",
  "....UUUUUUUUUUUUUU....",
  "KK.UUUUUUAAAAUUUUUU...",
  "KKUUUUUUUAWWAUUUUUUU..",
  ".UUU.UuUUAaaAUUuU.UUU.",
  "....UUuUUUUUUUUuU..UUK",
  "....UUuUUUUUUUUuU...KK",
  "....UuuUUUUUUUUuu..YK.",
  ".....UUUUUUUUUUUU..Y..",
  ".....UUUu....uUUU.P...",
  ".....KKKK....KKKK.....",
  ".....KKKK....KKKK.....",
];
const BODY_B = [
  "......oOOOOOOOOo......",
  "KK..UUUUUUUUUUUUUU....",
  "KKUUUUUUUAAAAUUUUUU...",
  ".UUUUUUUUAWWAUUUUUUU..",
  "...UUUuUUAaaAUUuU.UUU.",
  "....UUuUUUUUUUUuU..UUK",
  "....UUuUUUUUUUUuU...KK",
  "....UuuUUUUUUUUuu..YK.",
  ".....UUUUUUUUUUUU..Y..",
  ".....UUUu....uUUU.P...",
  ".....KKKK....KKKK.....",
  ".....KKKK....KKKK.....",
];

export const ASTRO_W = 24;
export const ASTRO_H = 33;

export function astronaut(wave: boolean, blink: boolean): (string | null)[][] {
  const grid: (string | null)[][] = Array.from({ length: ASTRO_H }, () => Array(ASTRO_W).fill(null));
  const put = (x: number, y: number, ch: string) => {
    const c = PALETTE[ch];
    if (c && y >= 0 && y < ASTRO_H && x >= 0 && x < ASTRO_W) grid[y][x] = c;
  };

  // Helmet: a round bowl of glass with a two-tone rim.
  const cx = 11.5;
  const cy = 10.5;
  const r = 10.6;
  for (let y = 0; y < 22; y++)
    for (let x = 0; x < ASTRO_W; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      const d = Math.hypot(dx, dy);
      if (d > r) continue;
      if (d > r - 1.15) put(x, y, dx + dy > 6 ? "o" : "O");
      else put(x, y, dy < -2 && dx < 2 ? "g" : "G");
    }

  FACE.forEach((row, j) => {
    const line = blink && BLINK_ROWS[j] ? BLINK_ROWS[j] : row;
    [...line].forEach((ch, i) => put(5 + i, 4 + j, ch));
  });

  // Reflection on the glass, upper left.
  [[4, 5], [3, 6], [3, 7], [3, 8], [5, 4]].forEach(([x, y]) => put(x, y, "L"));
  put(4, 4, "W");
  put(18, 15, "L");

  (wave ? BODY_B : BODY_A).forEach((row, j) => [...row].forEach((ch, i) => put(1 + i, 21 + j, ch)));
  return grid;
}
