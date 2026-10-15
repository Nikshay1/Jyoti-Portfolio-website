# Jyoti Chauhan — portfolio

Portfolio site for Jyoti Chauhan, content writer (SEO, web and marketing copy).

Built with [Astro](https://astro.build) so every word ships as plain HTML that search engines and AI crawlers can read. [GSAP](https://gsap.com) and [Lenis](https://lenis.darkroom.engineering) handle the motion.

## What's on the page

1. **Search intro**: a search box types a query, an overview answer streams in, and her site is the top result. Plays once per browser session; any key or click skips it.
2. **Name bar**: her name fills the screen, then folds down to the initials **J** and **C** in the corners as you scroll.
3. **Before / after**: a pinned section where scrolling deletes a bland sentence and types a better one.
4. **Selected work**: a numbered index; hovering a row shows its result in a card that follows the cursor (on phones the result shows inline).
5. **Results**, **About**, **Contact**.

Reduced-motion users get the same content with no intro, no smooth scroll, and both rewrite sentences shown side by side.

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
