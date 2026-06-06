# Alam’s Dump

A rare 3D landing page and browser-based forensic camera aesthetic engine. The app reconstructs the supplied Alam’s Dump look with Canvas pixel processing, low-resolution resampling, tone curves, color remapping, luma/RGB grain, ordered dither, bloom, sharpening, JPEG export, and a timestamp overlay.

## Highlights

- Separate photo-library and camera inputs, plus drag and drop.
- Crop ratios with adjustable crop position.
- Handheld shake, subject ghosting, light trails, and accidental double exposure.
- Current local-time timestamps by default, with an optional custom date and time.
- Explicit consent before an edited image is added to the session-only hanging photo wall.
- Local processing, JPEG download/share, recipes, remixable damage, and contact sheets.

## Run locally

```bash
npm run serve
```

Then open <http://localhost:4173>.

## Test

```bash
npm test
```

The page also includes a browser-side before/after comparison panel that scores the rendered output against the intended reference signature: black crush, cyan shadows, blue/red separation, saturation, high-frequency sensor damage, and timestamp coverage. Mobile users can explicitly choose between their photo library and camera, while desktop users can drag and drop. Everyone can remix deterministic grain, share supported output files, apply four advanced recipes, and generate a deterministic 2×2 contact sheet. The extended artifact stack adds radial chromatic aberration, scan fields, sensor dust, and spatial heat leaks.
