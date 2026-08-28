# A Little Piece of Home

A cinematic, mobile-first 3D Raksha Bandhan experience built with React, TypeScript, Vite/Vinext, React Three Fiber, Drei, Three.js, GSAP-ready scene architecture, and selective post-processing.

## Run it

```bash
npm install
npm run dev
```

Build and preview the production version:

```bash
npm run build
npm run preview
```

## Personalize the gift

### Names, places, distance, and media paths

Edit `src/config/giftConfig.ts`. Replace `SISTER_NAME` and `BROTHER_NAME` there; the experience reads personal values from that single file.

### Photographs and memories

1. Put optimized `.jpg`, `.png`, `.webp`, or `.avif` files in `public/media/memories/`.
2. Edit `src/data/memories.ts`.
3. Set each `image` to a relative path such as `media/memories/photo-01.webp`.

You can add or remove as many memory objects as you like. The 3D gallery reads the array automatically. Use `position` and `rotation` only when you want to art-direct a frame; keep faces uncropped by preparing each image at its intended aspect ratio.

### Open-when letters

Edit `src/data/messages.ts`. Keep messages short enough to read comfortably on a phone. The titles remain labels and message bodies are rendered as accessible DOM text over the 3D scene.

### Personal film

Add:

- `public/media/sister-film.mp4`
- `public/media/sister-film-poster.webp`

The application checks the film only when the theatre chapter opens. Until the file exists, it shows a deliberate cinematic placeholder instead of a broken player. Video audio never autoplays.

### Music

Add an optional track at `public/media/music/background.mp3`, or change the path in `src/config/giftConfig.ts`. Sound starts only after the recipient taps the sound control. If the file is absent, the control uses a very quiet generated ambient tone.

### Final private message

Edit `src/data/finalMessage.ts`. Keep a private image in `public/media/` and set its relative path in that file when desired.

## Quality and accessibility

The renderer chooses low, medium, or high quality from device capability, caps pixel ratio, reduces particles on weaker devices, and lets the viewer cycle the quality level. Reduced-motion preferences disable cinematic drift and shorten transitions. If WebGL is unavailable or the canvas fails, a complete DOM-led cinematic fallback keeps every chapter usable.

## Deployment

No backend, account, analytics, key, or secret is required. The project is prepared for Sites/Cloudflare-compatible hosting. Keep all asset URLs relative and set `SITE_URL` to the trusted production origin when building elsewhere so social-preview URLs are absolute.
