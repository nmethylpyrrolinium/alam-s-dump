# Alam’s Dump

A private-feeling browser photo lab for restoring and styling digital keepsakes. The app uses Canvas pixel processing, low-resolution resampling, tone curves, color remapping, luma/RGB grain, ordered dither, bloom, adjustable noise cancellation, controllable sharpening, JPEG export, and a customizable timeline stamp.

## Highlights

- Separate photo-library and camera inputs, plus drag and drop.
- Crop ratios with adjustable crop position.
- Handheld shake, subject ghosting, and light trails while keeping the studio focused on single-photo treatments.
- An Alam’s Dump timeline stamp by default, with name and date customization tucked behind the Timeline option.
- Sharpness and noise-cancellation controls for cleaner restoration-focused edits.
- Explicit guest consent before an edited image is added to the open hanging photo wall; no login is required.
- Local processing, JPEG download/share, recipes, remixable damage, and contact sheets.
- Four single-photo modes: classic detail, RGB glitch, pixel dispersion, and neon noir.

## Public wall: next steps

The browser interface lets every visitor approve and hang an edit without signing in. In the static demo, an approved photo appears immediately for the current visit. A deployed, cross-visitor public wall still needs an anonymous-safe storage/API connection.

When connecting Supabase or another backend:

1. Permit anonymous submissions through a narrowly scoped server function rather than exposing privileged credentials.
2. Validate file type and size, strip metadata, rate-limit submissions, and store only processed wall images.
3. Make approved wall images publicly readable while keeping all non-public uploads inaccessible.
4. Load public wall entries into `featuredGallery` and preserve the immediate guest preview while publishing.

## Run locally

```bash
npm run serve
```

Then open <http://localhost:4173>.

## Test

```bash
npm test
```

The page also includes a browser-side before/after comparison panel that scores the rendered output against the intended reference signature: black crush, cyan shadows, blue/red separation, saturation, high-frequency sensor detail, and timestamp coverage. Mobile users can explicitly choose between their photo library and camera, while desktop users can drag and drop. Everyone can remix deterministic grain, share supported output files, apply four advanced recipes, and generate a deterministic 2×2 contact sheet.
