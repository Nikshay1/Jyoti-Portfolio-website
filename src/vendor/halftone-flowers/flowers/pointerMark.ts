/**
 * What `FlowerFieldOptions.pointer` prints at the pointer in place of the system
 * cursor: a dot, or a cursor image's alpha, inked in the trail's colours.
 */
import { TAU } from "../utils/math.js";

export interface PointerMark {
  /**
   * Cursor image to print, as a URL (SVG data URLs work) or a loaded image. Only its alpha counts:
   * it prints in the trail's colours. Must be same-origin or served with CORS. Default a dot.
   */
  image?: string | HTMLImageElement | HTMLCanvasElement | ImageBitmap;
  /** Image px that sit on the pointer, like the hotspot in CSS `cursor`. Default the image's middle. */
  hotspot?: [number, number];
  /** Multiplier on the mark's size. A fine image prints as only a few dots at 1. Default 1. */
  scale?: number;
}

/** The dot's radius, as a share of the diamond width. */
const DOT = 0.75;

type Source = NonNullable<PointerMark["image"]>;
type Loaded = Exclude<Source, string>;

export class Mark {
  private source: Source | undefined;
  /** `source` once loaded and checked, or null to print the dot. */
  private image: Loaded | null = null;
  private size: [number, number] = [0, 0];
  private hotspot: [number, number] | undefined;
  private scale = 1;
  /** `image` at `scale`, shaded as `inked` last asked where it shows. */
  private sprite: HTMLCanvasElement | null = null;
  /** The shading on `sprite`. */
  private shading = "";

  set({ image, hotspot, scale = 1 }: PointerMark) {
    this.hotspot = hotspot;
    if (scale !== this.scale) this.sprite = null;
    this.scale = scale;
    if (image === this.source) return;
    this.source = image;
    this.image = null;
    if (!image) return;
    load(image).then(
      (loaded) => {
        if (this.source !== image) return;
        this.size = sizeOf(loaded);
        this.sprite = null;
        this.image = this.size[0] && this.size[1] && readable(loaded) ? loaded : null;
        if (!this.image) console.warn("halftone-flowers: the pointer image has no size or is cross-origin without CORS, so a dot prints instead.");
      },
      () => {
        if (this.source === image) console.warn("halftone-flowers: the pointer image failed to load, so a dot prints instead.");
      },
    );
  }

  /** Px from the pointer to the mark's furthest edge, for diamonds `cell` px wide. */
  reach(cell: number) {
    if (!this.image) return DOT * cell * this.scale;
    const [w, h] = this.size;
    const [x, y] = this.hotspot ?? [w / 2, h / 2];
    return Math.hypot(Math.max(x, w - x), Math.max(y, h - y)) * this.scale;
  }

  /** Paints it at (x, y), `grow` times its size, shaded through `stops` along direction `angle` (radians). */
  paint(ctx: CanvasRenderingContext2D, x: number, y: number, grow: number, stops: string[], angle: number, cell: number) {
    const sprite = this.image && this.inked(stops, angle);
    const s = this.scale * grow;
    if (!sprite) {
      const r = DOT * cell * s;
      ctx.fillStyle = across(ctx, x, y, r, stops, angle);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
      return;
    }
    const [w, h] = this.size;
    const [hx, hy] = this.hotspot ?? [w / 2, h / 2];
    ctx.drawImage(sprite, x - hx * s, y - hy * s, w * s, h * s);
  }

  /** The sprite shaded through `stops` along `angle`, redrawn only when that or the scale changes. */
  private inked(stops: string[], angle: number) {
    const shading = `${stops.join()} ${angle}`;
    if (shading === this.shading && this.sprite) return this.sprite;
    const sprite = this.sprite ?? Object.assign(document.createElement("canvas"), { width: Math.ceil(this.size[0] * this.scale), height: Math.ceil(this.size[1] * this.scale) });
    const ctx = sprite.getContext("2d");
    if (!ctx) return null;
    const { width, height } = sprite;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(this.image!, 0, 0, width, height);
    ctx.globalCompositeOperation = "source-in";
    ctx.fillStyle = across(ctx, width / 2, height / 2, Math.hypot(width, height) / 2, stops, angle);
    ctx.fillRect(0, 0, width, height);
    this.sprite = sprite;
    this.shading = shading;
    return sprite;
  }
}

/** A fill running through `stops` from one side of the circle `r` px round (x, y) to the other, along `angle`. */
function across(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, stops: string[], angle: number) {
  const dx = Math.cos(angle) * r;
  const dy = Math.sin(angle) * r;
  const fill = ctx.createLinearGradient(x - dx, y - dy, x + dx, y + dy);
  stops.forEach((stop, k) => fill.addColorStop(k / (stops.length - 1), stop));
  return fill;
}

/** Whether `image` can be read back: drawn into the scene, a tainted one would taint it and stop the halftone printing. */
function readable(image: Loaded) {
  const ctx = Object.assign(document.createElement("canvas"), { width: 1, height: 1 }).getContext("2d");
  if (!ctx) return false;
  ctx.drawImage(image, 0, 0, 1, 1);
  try {
    ctx.getImageData(0, 0, 1, 1);
    return true;
  } catch {
    return false;
  }
}

function load(source: Source): Promise<Loaded> {
  if (typeof source !== "string" && !(source instanceof HTMLImageElement && !source.complete)) return Promise.resolve(source);
  const img = typeof source === "string" ? new Image() : source;
  return new Promise((resolve, reject) => {
    img.addEventListener("load", () => resolve(img), { once: true });
    img.addEventListener("error", reject, { once: true });
    if (typeof source === "string") {
      img.crossOrigin = "anonymous";
      img.src = source;
    }
  });
}

function sizeOf(image: Loaded): [number, number] {
  return image instanceof HTMLImageElement ? [image.naturalWidth, image.naturalHeight] : [image.width, image.height];
}
