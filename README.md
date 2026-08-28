# A Little Piece of Home

A cinematic, mobile-first 3D Raksha Bandhan experience built as a static React + TypeScript + Vite single-page application. React Three Fiber, Drei, Three.js, GSAP, and selective post-processing power the existing visual experience; no backend or server runtime is required.

## Run locally

```bash
npm install
npm run dev
```

Run the full local verification:

```bash
npm run lint
npm run typecheck
npm run build
npm run preview
```

Vite writes the deployable static site to `dist/`.

## Project structure

```text
index.html
src/
  main.tsx
  App.tsx
  assets/
  components/
  config/
  data/
  hooks/
  styles/
  systems/
  types/
  utils/
public/
  media/
  models/
```

`src/utils/publicAssetUrl.ts` resolves files in `public/` against Vite's deployment base. Keep configurable public-media values relative, such as `media/memories/photo-01.webp`; do not prefix them with `/`.

## Personalize the gift

### Names, places, distance, and media paths

Edit `src/config/giftConfig.ts`. Replace `SISTER_NAME` and `BROTHER_NAME`; the experience reads personal values from that single file.

### Photographs and memories

1. Put optimized `.jpg`, `.png`, `.webp`, or `.avif` files in `public/media/memories/`.
2. Edit `src/data/memories.ts`.
3. Set each `image` to a relative path such as `media/memories/photo-01.webp`.

You can add or remove memory objects. The existing 3D gallery reads the array automatically. Use `position` and `rotation` only when art-directing a frame; prepare photographs at their intended aspect ratio to avoid unwanted cropping.

### Open-when letters

Edit `src/data/messages.ts`. The titles remain labels and message bodies are accessible DOM text over the 3D scene.

### Personal film

Add:

- `public/media/sister-film.mp4`
- `public/media/sister-film-poster.webp`

The theatre checks for the film only when that chapter opens. Until the file exists, it displays the existing cinematic placeholder. Video audio never autoplays.

### Music

Add an optional track at `public/media/music/background.mp3`, or change the relative path in `src/config/giftConfig.ts`. Sound starts only after user interaction. If the file is absent, the control uses generated ambience.

### Final private message

Edit `src/data/finalMessage.ts`. Keep any optional private image in `public/media/` and store its relative path in the data file.

## Quality and accessibility

The renderer chooses low, medium, or high quality from device capability, caps pixel ratio, reduces particles on weaker devices, and lets the viewer cycle quality. Reduced-motion preferences disable cinematic drift and shorten transitions. If WebGL is unavailable or the canvas fails, the DOM-led fallback keeps the experience usable.

## GitHub Pages deployment

The repository name and Vite base are fixed to `Raksha-bandhan-gift`:

```ts
base: '/Raksha-bandhan-gift/'
```

`.github/workflows/deploy.yml` runs on pushes to `main`, installs with `npm ci`, builds once, uploads only `dist/`, and deploys that artifact to the `github-pages` environment.

In the GitHub repository, open **Settings → Pages** and set **Build and deployment → Source** to **GitHub Actions**. The expected URL is:

`https://kiratveersinghralhan-hue.github.io/Raksha-bandhan-gift/`
