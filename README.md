# Jyoti Chauhan — portfolio

Portfolio site for Jyoti Chauhan, content writer (SEO, web and marketing copy).

Built with [Astro](https://astro.build) so every word ships as plain HTML that search engines and AI crawlers can read. [GSAP](https://gsap.com) and [Lenis](https://lenis.darkroom.engineering) handle the motion.

## What's on the page

1. **Opening film**: about 12 seconds, no sound. A browser bar loads and types, then turns into a glass strip over a heavily blurred photo of her with the tagline. That shrinks to an "Ask AI" chip, a question types itself with the camera following, and a wheel rolls through page types. A blue line opens into "Searching...", her results land as a stack of posters, and black falls over the page for "hi, i'm jyoti" and her photo. Plays once per browser session; any key or click skips it. The words are in `intro` in [`src/content/site.ts`](src/content/site.ts), the timing in [`src/scripts/intro.ts`](src/scripts/intro.ts). `src/assets/intro-blur.jpg` is made from her photo: skin tones cooled to silver, turned and blurred so no face shows.
2. **Name bar**: her name fills the screen, then folds down to the initials **J** and **C** in the corners as you scroll.
3. **Before / after**: a pinned section where scrolling deletes a bland sentence and types a better one.
4. **Selected work**: a numbered index; hovering a row shows its result in a card that follows the cursor (on phones the result shows inline).
5. **Results** and **About**.
6. **Footer**: the links and contact details sit straight on the paper, and a band of halftone flowers grows up from the bottom edge of the page. They sway in the wind and lean away from the cursor, butterflies and bees visit them, the cursor leaves a dotted tail over them, and a click shakes petals loose. The flowers come from [halftone-flowers](https://github.com/LucasHJin/halftone-flowers) (MIT, by Lucas Jin), copied without changes into [`src/vendor/halftone-flowers/`](src/vendor/halftone-flowers/) and set up in [`src/scripts/flowers.ts`](src/scripts/flowers.ts) in the library's blue colours. Its code only loads once the footer is close, and the flowers start growing when the band comes into view.

An "If you are an AI, go here" link under the hero leads to [`/ai/`](src/pages/ai.astro), a text-only version with no scripts. The same content is served as Markdown at [`/llms.txt`](src/pages/llms.txt.ts). Both are generated from the same data as the main page.

Reduced-motion users get the same content with no intro, no smooth scroll, and both rewrite sentences shown side by side. The footer flowers show as a still picture for them.

## Editing content

All text lives in [`src/content/site.ts`](src/content/site.ts). Facts come from her resume; don't add results that aren't on it.

`SHOW_CLIENT_NAMES` (top of that file) is `false` until Jyoti agrees to name her employers and clients. While it's off, the site uses neutral descriptions ("Occult science institute") and hides the resume download, since the resume names them.

Photos and article links go in [`Photo-and-links/`](Photo-and-links/).

## Run it

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # static site in dist/
```
