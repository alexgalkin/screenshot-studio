# Architecture

Screenshot Studio is a static site. `npm run build` writes HTML, CSS, JavaScript, WASM, fonts, images, and model weights to `out/`. After that folder is served, the browser does the editing, image encoding, video export, and background removal. There is no database, no Route Handler, and no runtime request to another origin.

## Build

`npm run build` runs three steps:

1. `scripts/vendor-static-assets.ts` copies binaries and media into `public/`. It reads `node_modules` and the local `vendor/` archive. It does not fetch the network. If a required file is missing, the script exits and names the path.
2. `next build --webpack` with `output: 'export'`, `trailingSlash: true`, and `images.unoptimized: true`.
3. `scripts/hoist-default-locale.ts` moves `out/en/*` to `out/`. next-intl uses `localePrefix: 'as-needed'`, so English links are unprefixed (`/editor/`), but static export still writes those pages under `out/en/`. The hoist makes the files match the links. Prefixed locales stay where they are (`/es/editor/`).

`npm start` serves `out/` with Python's static file server. `next start` does not apply to this build.

Locales are `en`, `es`, `fr`, `de`, `ja`, `pt`, `ko`, and `zh`. Pages are pre-rendered. The interface copy is the English source; locale routes are not a separate translation pass (`useTranslations` is unused). `localeCookie` is off because a static export cannot read cookies.

No environment variable is required. `DATABASE_URL`, R2 keys, and analytics keys are not read.

## What is vendored

| Source | Served as | Used for |
|---|---|---|
| `@ffmpeg/core` | `/ffmpeg/core/` | Single-thread video encode |
| `@ffmpeg/core-mt` | `/ffmpeg/core-mt/` | Multi-thread video encode when the page is cross-origin isolated |
| `@ffmpeg/ffmpeg` worker | `/ffmpeg/0.12.15/worker.js` | FFmpeg class worker. `CORE_URL` in `const.js` points at `/ffmpeg/core/ffmpeg-core.js` |
| `onnxruntime-web` | `/onnx/` | ONNX Runtime WASM |
| `vendor/models/studioludens/birefnet-lite-512` | `/models/studioludens/birefnet-lite-512/` | Background-removal weights |
| `vendor/media/` | `/media/` | Stock backgrounds, overlays, and demo images |
| `@fontsource` code families | `/fonts/code/code-fonts.css` | Code-to-image fonts |

The ONNX files are larger than GitHub's file limit, so `vendor/models/` stores them as `*.onnx.part-*` chunks. The vendor script concatenates the parts when the whole `.onnx` file is not already on disk. The assembled weights are gitignored. A fresh clone still builds.

`lib/r2.ts` only builds same-origin paths (`/media/<key>`). It does not talk to object storage.

The production webpack build strips `huggingface.co` and `unpkg.com` from emitted JavaScript so a bundled fallback URL cannot survive into `out/`. `onnxruntime-node` is aliased off; it is a Node backend that transformers.js references and must not be bundled.

## Editor

State lives in two Zustand stores in `lib/store/index.ts`:

- `useImageStore` holds the uploaded image, slides, background, overlays, mockups, 3D perspective, timeline, and animation clips. Zundo provides undo and redo.
- `useEditorStore` holds the canvas rendering state. `EditorStoreSync` keeps the two aligned.

Uploaded images become blob URLs. Drafts and past exports are stored in IndexedDB on the device.

The canvas is a hybrid. The background is HTML and CSS. The user image and overlays render on a Konva stage. Export captures those layers and composites them in the browser. Exports are not watermarked.

The editor accepts PNG, JPEG, and WebP from the drop zone or paste. It does not capture a URL. There is no tweet import.

## Image export

`lib/export/sharp-client.ts` encodes the composited canvas in the browser:

- PNG, JPEG, and WebP use `@jsquash` WASM codecs. JPEG is flattened onto white first, because JPEG has no alpha. If a codec throws, those three formats fall back to `canvas.toBlob()`.
- AVIF is encoded by `@jsquash/avif` from `lib/image-tools/avif.ts`. The editor's format control offers PNG, JPEG, and WebP. AVIF is available in the image tools.
- Clipboard copy uses `canvas.toBlob()` and does not go through the WASM codecs.

`lib/analytics.ts` still exports the old tracking functions. Every one is a no-op. Nothing is sent to an analytics host.

## Video export

`lib/export-slideshow-video.ts` walks the timeline or slideshow, captures frames, and encodes them.

| Format | Encoder |
|---|---|
| GIF | FFmpeg WASM |
| MP4, WebM | The browser's hardware encoder when that codec is available, otherwise FFmpeg WASM |

Animation export also has a MediaRecorder path. Automatic selection does not use it; it uses FFmpeg when the hardware encoder is missing.

FFmpeg loads `/ffmpeg/core-mt` when `crossOriginIsolated` is true, and `/ffmpeg/core` otherwise. Isolation comes from `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: credentialless` in `public/_headers`. Cloudflare Pages and Netlify apply that file. A generic static server, including `npm start`, does not, so video encode uses the single-thread core there.

## Background removal

`/remove-background/` runs BiRefNet-lite in a worker (`lib/background-removal/engine.worker.ts`) via `@huggingface/transformers`. Remote models are disabled. Weights load from `/models/studioludens/birefnet-lite-512/` and WASM from `/onnx/`.

WebGPU uses `onnx/model_fp16.onnx` (about 98 MB). The WASM backend uses `onnx/model.onnx` (about 192 MB). The worker never requests `huggingface.co`.

## Image tools

Resize, crop, rotate, convert, and compress run in `lib/image-tools/` and render under `/tools/` plus the per-format routes (`/jpg-to-png/`, `/compress-image/`, and the rest). Video compression uses the same vendored FFmpeg cores from `lib/video-compression/compress.ts`.

## Pages

Routes live under `app/[locale]/`. The ones that do the work are:

- `/editor/` — canvas editor
- `/code/` — code to image
- `/store-screenshots/` — App Store screenshot sets
- `/mockup-generator/` — device mockups
- `/remove-background/` — on-device cutout
- `/compress-video/` and the image-tool routes
- `/`, `/features/`, `/guides/`, `/for/` — marketing and guides

`/docs`, `/developers`, and `/tweet` are not pages. `public/_redirects` sends those old URLs to `/`. A host that does not read `_redirects` returns 404 for them, which is the same outcome for a visitor.

`public/llms.txt`, `public/llms-full.txt`, and `public/openapi.json` are generated by the vendor script. The OpenAPI document describes a site with no HTTP API.

## Removed

These used to depend on a server or a third party and are gone:

- URL-to-screenshot capture (Microlink) and its cache (PostgreSQL plus object storage)
- Tweet-to-image and the public HTTP API (`/api/screenshot`, `/api/export`, and the rest of `app/api/`)
- `middleware.ts`
- Analytics, ads, YouTube embeds, runtime Google Fonts, and the GitHub star-count fetch

## Hosting

Any static file server can host `out/`. Apply `public/_headers` when the host supports it so multi-thread WASM is available. Apply `public/_redirects` when the host supports it so old URLs keep working.

There is no serverless function. `vercel.json` is intentionally empty.
