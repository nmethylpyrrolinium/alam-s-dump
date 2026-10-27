# Alam’s Dump

Alam’s Dump is a browser-based keepsake lab for cleaning up a photo, trying a deliberate treatment, and keeping named edits together with the original. The editor is built around a local Canvas pipeline and a dark, tactile wall-and-workbench interface rather than an account-first dashboard.

## Current features

- Crop, tone, color, noise reduction, sharpening, grain, dither, optics, pixel/print, retro, glitch, and fracture controls.
- Creative and film-style recipes, an active effect stack, favorites, recent effects, and a four-look contact sheet.
- Before/after preview, zoom and pan, JPEG/PNG/WebP export, image sharing where the browser supports it, and optional timestamp artwork.
- **Memory Index:** stores an uploaded original once in browser IndexedDB and saves named branches as edit-control recipes. Branches can be selected, renamed, deleted with confirmation, or reset to the source. “Remove all local project data” clears Memory Index originals and branches in this browser.
- **Artifact Passport:** optionally pairs the selected image export with a JSON sidecar containing its dimensions, format, quality where relevant, an edit recipe, and a SHA-256 checksum when Web Crypto is available. Export time is included only when requested. The passport has no image bytes, local paths, EXIF, email, or custom stamp text/date. A checksum helps compare bytes; it does not prove provenance or authenticity. Compatible passports can be validated and their safe recipe controls applied.
- A public photo wall backed by Supabase. A photo is sent only after the visitor chooses **Approve & hang**; the existing client and server moderation checks remain in the submission path. The hidden `#admin` route uses Supabase Auth and `profiles.account_type` for moderation authorization.

Image editing runs in the browser. The page also loads the Supabase browser client for wall and moderation features and Google Fonts for typography. Public-wall submission sends the chosen edited image to the configured Supabase storage and moderation services; editing and local saves do not upload the source image.

## Repository structure

```text
.
├── index.html                    # Static page, editor controls, dialogs, script order
├── styles.css                    # Base visual system and responsive styles
├── layout-v2.css                 # Workbench layout, Memory Index and helper styles
├── cards-v2.css                  # Effect cards and active stack styles
├── app.js                        # Canvas renderer, wall, auth and moderation
├── memory-index-core.js          # Pure recipe validation and branch schema helpers
├── memory-index.js               # IndexedDB sources, versions and controls
├── passport-core.js              # Passport validation, privacy filtering and summary
├── layout.js                     # Category navigation, search, preview pan/zoom
├── effects-v2.js                 # Film/light and fracture effect registry
├── pixel-print-v2.js             # Pixel and print effect registry
├── retro-v2.js                   # Retro and CRT effect registry
├── color-v2.js                   # Color-grade controls and renderer
├── presets-v2.js                 # Curated preset definitions and UI
├── export-v2.js                  # Image export and passport import/export
├── extras-v2.js                  # Additional effects and registry entries
├── cards-v2.js                   # Effect cards, stack, favorites and recents
├── tests/
│   ├── photon-signature.test.js
│   ├── admin-moderation-wiring.test.js
│   ├── memory-index.test.js
│   └── artifact-passport.test.js
├── package.json
└── SECURITY.md
```

## Architecture and load order

This is a static page with classic deferred scripts; there is no build step or frontend framework. The browser runs the scripts in this order after parsing the HTML:

1. Supabase JS browser client from jsDelivr.
2. `app.js` — editor initialization, shared pixel helpers, render path, public wall, and admin route.
3. `memory-index-core.js`, `passport-core.js`, then `memory-index.js` — pure validation helpers are available before the local-storage UI starts.
4. `layout.js` — category navigation, search, before/after, zoom and pan.
5. `effects-v2.js`, `pixel-print-v2.js`, `retro-v2.js`, `color-v2.js`, `presets-v2.js`, `export-v2.js`, `extras-v2.js`, and `cards-v2.js`.

The main render pipeline crops and scales into a bounded working canvas, applies tone and pixel operations, noise reduction and sharpening, then applies optics/damage, creative and registered card effects, and finally the optional timestamp artwork. Effect modules add functions to the shared `window.AlamsDumpEffectDefs` registry and rerender through `window.alamsDumpRerender`; they do not create a second editor renderer. The visible public wall reads the approved-photo view. Guest submissions retain local and server-side moderation checks before upload/record creation.

## Run locally

Requirements: Node.js and Python 3. No packages need to be installed for the current tests or static page.

```sh
git clone https://github.com/nmethylpyrrolinium/alam-s-dump.git
cd alam-s-dump
npm run serve
```

Open <http://localhost:4173>. If `npm` is not available, run `python3 -m http.server 4173` from the repository root.

## Tests

```sh
npm test
```

Tests check syntax for each loaded JavaScript module, deterministic pixel processing, wall/moderation wiring, Memory Index recipe validation and migration behavior, and Artifact Passport validation and privacy filtering. The browser-only IndexedDB, Canvas, share sheet, and Supabase flows still need manual smoke testing in a browser.

## Local versions and export

After selecting an image, Memory Index saves its original bytes once in IndexedDB. Use a new name each time to make a separate branch; an existing name is never overwritten. A branch contains editor control values, active modes, effect order, and the deterministic seed needed to reproduce the render. Selecting a saved original opens its latest branch when one exists. “Return to original” keeps the current source and resets editor controls. Stored content remains in this browser until removed with the clear-data action or browser site-data controls. Browser storage can be unavailable or full; the editor reports that error and the in-memory edit remains usable.

**Export image + passport** downloads the selected image and a separate JSON sidecar. The passport records the output format actually encoded by the browser, dimensions, byte count, quality for lossy formats, recipe settings, and optional SHA-256. It excludes custom timestamp text/date and custom stamp name. The passport is a settings and byte-integrity aid, not proof of where the image came from. Import validates schema, dimensions, format, size, checksum shape, recipe fields, and values against controls available in this version before enabling recipe application. The image itself is not embedded and must be loaded separately.

The export control **Include timestamp metadata** means the visible timestamp artwork burned into the image; it does not write EXIF metadata. **Include export time in passport** is separate and off by default.

## Public wall and configuration

The app uses the existing Supabase project URL and publishable key in `app.js`. Publishable/anonymous keys are browser-visible and must be restricted by the project’s actual RLS, storage policies, and server-side moderation. Never add a service-role key or admin credential to this client. Keep the Supabase Auth redirect allowlist and moderation endpoint configured for the site origin. Guest uploads remain anonymous; the admin panel is a hidden route for convenience, while access depends on Supabase Auth and the profile’s `account_type` and is further constrained by backend policies.

The repository does not contain the live Supabase schema or deployment policies. Confirm those policies in the existing backend before changing moderation behavior. No database schema or RLS changes are included in this frontend project.

## Accessibility, performance and privacy notes

- Use the keyboard-accessible native file inputs, buttons, selects, labels, details, and dialogs. Status messages use live regions; the wall respects reduced motion.
- Editor canvases are capped to a 720-pixel long edge before effect passes to limit work on large originals. Some advanced effects still use full-canvas copies and pixel loops, so large images and long effect stacks can be slow on modest devices.
- Source photos stay in browser memory while editing and in local IndexedDB only if Memory Index saves them. Wall posting is a distinct, explicit public submission action.
- Browser storage is local to the site and device, not encrypted or synced. Anyone with access to that browser profile may access saved projects. Clearing site data also removes them.
- Web Share, SHA-256, IndexedDB and image format encoding vary by browser. Failed or unsupported exports should be retried with JPG/PNG or the quick-export control.

## Troubleshooting

- **An image will not open:** use a browser-supported JPG, PNG, WebP, or other decoded image. Very large, HEIC/RAW, corrupt, or unsupported files may need conversion or a smaller copy.
- **Memory Index cannot save:** check browser site-storage settings or clear older local project data; storage quotas vary by browser.
- **Passport recipe cannot apply:** the passport may use newer control IDs or values outside the current control ranges. Load the related image separately.
- **Wall submission fails:** check the configured Supabase endpoint, storage bucket, guest RPC signature, moderation function, and RLS/policies. The UI does not bypass server moderation.
- **Admin moderation is unavailable:** confirm the Auth session, `profiles.account_type = 'admin'`, and backend policies. The `#admin` fragment is not a security boundary.

## Roadmap

- Completed: local Canvas editor and effect modules, public moderated wall, admin moderation route, named local edit branches, and optional Artifact Passport sidecars.
- Planned: browser-level end-to-end tests for IndexedDB, export/download, upload consent, and live moderation with a safe test project; visual accessibility review across mobile browsers.

## Credits

Designed and maintained as Alam’s Dump. Typography currently loads IBM Plex Mono, Inter, and Share Tech Mono from Google Fonts.
