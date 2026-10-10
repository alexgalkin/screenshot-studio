## Proposed Plan for FRONTEND-ONLY: Static browser-only Screenshot Studio

## Context {toggle="true"}
	Screenshot Studio is a Next.js App Router app. The editor, image tools, video export, and background removal already run in the browser, but the production build still starts Prisma, ships Route Handlers, and calls third parties at runtime (Microlink, Cloudflare R2, PostHog, AdSense, unpkg, Hugging Face, Google Fonts, the Twitter syndication API, YouTube, the GitHub REST API).
	The end state is a static export. `npm run build` writes an `out/` directory of HTML, CSS, JS, WASM, fonts, images, and model weights. Any static file server can host that directory. After the files are served, the browser must not call a database, a Route Handler, or any third-party origin. Build-time `npm ci` may download npm packages. The running site may not.
	Where a server feature has a same-origin WebAssembly or browser-API equivalent, keep the feature and vendor the binary into `out/`. Where it does not, delete the feature and the pages, copy, and tests that describe it.
	Hard requirements:
	- `next build` uses `output: 'export'` and does not run `prisma generate`.
	- The `out/` tree contains no dependency on `DATABASE_URL`, PostgreSQL, Prisma, or Cloudflare R2 credentials.
	- `app/api/` is gone. The build fails if any Route Handler remains.
	- Runtime network calls are same-origin only. Banned origins include `api.microlink.io`, `*.r2.cloudflarestorage.com`, `assets.screenshot-studio.com`, `us.i.posthog.com`, `us-assets.i.posthog.com`, `pagead2.googlesyndication.com`, `unpkg.com`, `huggingface.co`, `fonts.googleapis.com`, `fonts.gstatic.com`, `api.github.com`, `pbs.twimg.com`, `cdn.syndication.twimg.com`, and `www.youtube.com`.
	- PNG, JPEG, WebP, and AVIF export still produce a downloadable file in the browser.
	- MP4, WebM, and GIF export still encode in the browser from vendored FFmpeg WASM.
	- Background removal still runs in the browser from vendored ONNX weights.
	- Stock backgrounds, overlays, and demo images load from files inside `out/`.
	- URL-to-screenshot capture, tweet-to-image, the public HTTP API, screenshot caching, analytics, and ads are removed.
	- `middleware.ts` is removed. Locale pages are pre-rendered files.
---
## How the Current System Works {toggle="true"}
	### What already stays in the browser
	Editor state is Zustand in `/home/developer/.herdr/worktrees/screenshot-studio/feat-frontend-only/lib/store/index.ts`. Drafts are IndexedDB in `lib/draft-storage.ts`. Store-screenshot projects are IndexedDB in `lib/store-screenshots/storage.ts`. Small images and export preferences are `localStorage` in `lib/image-storage.ts` and `lib/export-storage.ts`. Custom presets are `localStorage` in `hooks/useCustomPresets.ts`.
	Image tools (resize, crop, rotate, convert, compress) run in `lib/image-tools/`. AVIF encode already uses `@jsquash/avif` from `lib/image-tools/avif.ts` because `canvas.toBlob('image/avif')` is not reliable. Slideshow and video compression use `@ffmpeg/ffmpeg` in `lib/export/ffmpeg-encoder.ts` and `lib/video-compression/compress.ts`. The FFmpeg class worker is already a same-origin file at `public/ffmpeg/0.12.15/worker.js`. The WASM core is not: `loadFFmpeg` fetches `https://unpkg.com/@ffmpeg/core-mt@0.12.6/dist/esm` or `https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm`.
	Background removal is a module worker in `lib/background-removal/engine.worker.ts` using `@huggingface/transformers`. Weights are not local. `lib/background-removal/mask.ts` sets `MODEL_BASE_URL` to `https://huggingface.co/studioludens/birefnet-lite-512/resolve/4a3c40c36c94093cc1e724d9ea428b8fa4b57dc7` (about 98 MB fp16 for WebGPU, about 192 MB fp32 for WASM).
	### Server routes
	`/home/developer/.herdr/worktrees/screenshot-studio/feat-frontend-only/app/api/screenshot/route.ts` rate-limits in memory (`lib/rate-limit.ts`), calls Microlink, and optionally caches through `lib/screenshot-cache.ts`. The UI callers are `components/controls/WebsiteScreenshotInput.tsx` and `components/controls/CleanUploadState.tsx`. Cache failures are logged and capture still proceeds, so the database is not required for a successful capture. Microlink is required. A browser cannot screenshot an arbitrary third-party URL: the target page is cross-origin, and there is no in-browser headless browser. `@sparticuz/chromium` and `playwright-core` are dependencies and are not imported by application code.
	`app/api/screenshot/invalidate/route.ts` and `app/api/cleanup-cache/route.ts` only exist to maintain that cache.
	`app/api/export/route.ts` recompresses an upload with `sharp`. `lib/export/sharp-client.ts` posts the canvas to that route from `lib/export/export-service.ts` and falls back to `canvas.toBlob()` when the route fails. Clipboard export already skips the route.
	`app/api/tweet/[id]/route.ts` calls `react-tweet/api` (`getTweet`), which hits Twitter's syndication host. `components/tweet-image/TweetImageEditor.tsx` fetches `/api/tweet/${id}`. `components/tweet-image/TweetCard.tsx` loads images through `app/api/image-proxy/route.ts`, which fetches `pbs.twimg.com`, `abs.twimg.com`, `ton.twitter.com`, and `video.twimg.com`. Tweet JSON and media cannot be read from the browser without those hosts.
	`app/api/llms/route.ts`, `app/api/llms-full/route.ts`, `app/api/md/route.ts`, and `app/api/openapi/route.ts` return strings already computed in `lib/agents/llms.ts`, `lib/agents/site-content.ts`, and `lib/api/openapi.ts`. `middleware.ts` rewrites markdown `Accept` requests to `/api/md` and runs `next-intl` locale negotiation. `app/api/indexnow/route.ts` prints `INDEXNOW_KEY`. `next.config.ts` rewrites `/llms.txt`, `/llms-full.txt`, `/openapi.json`, and `/indexnow-key.txt` onto those routes.
	### Database
	`prisma/schema.prisma` has one model, `ScreenshotCache`. `lib/db.ts` constructs a `PrismaClient`. The only caller is `lib/screenshot-cache.ts`, which stores a URL hash plus the R2 key and public URL. Image bytes go to R2 through `@aws-sdk/client-s3`. `package.json` runs `npx prisma generate` before `next dev` and `next build`. `README.md` states the editor does not need a running database, and that `DATABASE_URL` is required only because Prisma generates on startup.
	### Other third parties the page loads by itself
	`lib/r2.ts` turns bucket keys into `/r2-assets/...` when `NEXT_PUBLIC_R2_PUBLIC_URL` is set. `next.config.ts` rewrites that prefix to the R2 public host (`assets.screenshot-studio.com` is the `images.remotePatterns` host). With the env var unset, `getR2PublicUrl` maps keys onto `public/`. This worktree has no image files under `public/`, and `.gitignore` ignores `public/backgrounds`. Stock art is not in the repo.
	`getResizedImageUrl` in `lib/r2.ts` returns `/_next/image?url=...`, which is the Next image optimizer and does not exist in a static export.
	`instrumentation-client.ts` and `lib/analytics.ts` send events to PostHog. `next.config.ts` proxies `/svc/*` to `us.i.posthog.com`. `components/AdSenseScript.tsx` injects `pagead2.googlesyndication.com`, mounted from `components/landing/Footer.tsx`. `components/ui/github-star-button.tsx` fetches `https://api.github.com/repos/opennookorg/screenshot-studio`. `components/code-image/CodeImageEditor.tsx` inserts `GOOGLE_FONTS_URL` from `components/code-image/code-themes.ts`. `app/layout.tsx` and several landing components load faces with `next/font/google`, which downloads from Google at build time and then serves the files from `/_next/static/media`. `components/landing/VideoTestimonials.tsx` embeds `https://www.youtube.com/embed/...`. `components/ui/hero-video-dialog.tsx` also embeds YouTube and has no caller.
	### Static export constraints in this repo
	Locales are `en`, `es`, `fr`, `de`, `ja`, `pt`, `ko`, `zh` with `localePrefix: 'as-needed'` in `i18n/routing.ts`. `app/[locale]/layout.tsx` already calls `generateStaticParams` and `setRequestLocale`. Dynamic guides and comparisons already call `generateStaticParams` in `app/[locale]/guides/[slug]/page.tsx` and `app/[locale]/compare/[slug]/page.tsx`. `app/sitemap.ts` and `app/robots.ts` are build-time metadata routes and can stay.
	`output: 'export'` rejects Route Handlers, middleware, rewrites, `headers()`, and the image optimizer. COOP/COEP headers in `next.config.ts` (required for multi-threaded FFmpeg and ONNX WASM) will not be emitted. The single-thread FFmpeg path already runs when `crossOriginIsolated` is false. `trailingSlash` is currently unset, so Next emits `editor.html` rather than `editor/index.html`.
	### Key point for the static export
	Keep the browser pipelines. Replace the two server processing steps that have WASM equivalents (Sharp, remote FFmpeg core, remote ONNX weights). Delete URL capture, tweet import, the cache, and every automatic third-party request. Pre-render agent markdown as files in `public/`.
	### What doesn't exist today
	There is no `output: 'export'` config, no vendored FFmpeg core, no vendored ONNX weights, no stock image set in `public/`, no host-level `_headers` / `_redirects`, and no browser JPEG/WebP/PNG encoder beside `canvas.toBlob()` and the AVIF jsquash path.
---
## Implementation {toggle="true"}
	## High-Level Flows
	### Flow 0 — Production build
	- `npm run build` runs `tsx scripts/vendor-static-assets.ts`, then `next build --webpack`.
	- The vendor script copies files into `public/` from `node_modules` and from a local asset archive. It does not fetch Microlink, R2, PostHog, or Twitter.
	- FFmpeg cores come from the installed `@ffmpeg/core` and `@ffmpeg/core-mt` packages (same 0.12.6 builds `loadFFmpeg` loads from unpkg today) into `public/ffmpeg/core/` and `public/ffmpeg/core-mt/`.
	- ONNX Runtime WASM comes from `node_modules/onnxruntime-web/dist/` into `public/onnx/`.
	- BiRefNet weights are read from `vendor/models/` (the pinned revision already named in `lib/background-removal/mask.ts`: `onnx/model_fp16.onnx` and `onnx/model.onnx`) into `public/models/studioludens/birefnet-lite-512/`. Commit `vendor/models/` with Git LFS, or fail the script with the exact missing relative paths. Do not download them from `huggingface.co` during build or at runtime.
	- Stock images are read from `vendor/media/` into `public/media/`, preserving the keys in `lib/r2-backgrounds.ts`, `lib/r2-overlays.ts`, and `lib/r2-demo-images.ts` (`assets/asset-1.jpg`, `overlays/arrow/arrow-1.svg`, `backgrounds/demo/demo-1.png`, and the rest). Same rule: the archive is an input to the build, not a network call. Remove the `public/backgrounds` line from `.gitignore` only if the chosen layout writes those files there; the plan uses `public/media/` plus `vendor/media/` so ignored `public/backgrounds` can stay ignored.
	- Self-hosted font files for the code editor are copied from the installed `@fontsource` packages into `public/fonts/code/`.
	- `next build` writes `out/`. Route Handlers, middleware, and Prisma are absent, so the build does not read `DATABASE_URL`.
	### Flow 1 — Open a locale page
	- `output: 'export'` and `trailingSlash: true` in `next.config.ts`. English stays unprefixed (`/editor/` → `out/editor/index.html`). Other locales are `/es/editor/` and so on, from the existing `generateStaticParams` on `app/[locale]/layout.tsx`.
	- Delete `middleware.ts`. Accept-Language redirects stop. A visitor who opens `/` gets English. Locale links from `i18n/navigation.ts` still point at the prefixed static files.
	- `images.unoptimized: true`. Delete `getResizedImageUrl` and every caller, so nothing requests `/_next/image`.
	- Delete `headers()`, `redirects()`, and `rewrites()` from `next.config.ts`. Put the old redirects in `public/_redirects` (Netlify and Cloudflare Pages). A generic static server will not honor that file; old paths then 404, which is acceptable. Mirror the same paths in `public/_redirects`:
		- `/features/background-remover` → `/remove-background/`
		- `/home` → `/editor/`
		- `/free-screenshot-editor-online` → `/free-screenshot-editor/`
		- `/free-screenshot-studio/*` → `/free-screenshot-editor/`
		- `/blog/*` → `/guides/:splat`
		- `/docs` and `/docs/authentication` and `/developers` → `/`
	- COOP/COEP cannot be set by Next in a static export. Add `public/_headers` so Cloudflare Pages and Netlify send, for `/editor*`, `/code*`, `/store-screenshots*`, `/remove-background*`, `/compress-video*`, `/ffmpeg/*`, `/onnx/*`, and `/_next/static/*`:
		- `Cross-Origin-Opener-Policy: same-origin`
		- `Cross-Origin-Embedder-Policy: credentialless`
	- Without those headers the app still loads. `loadFFmpeg` keeps the single-thread core when `crossOriginIsolated` is false. Document that in `README.md`.
	### Flow 2 — Export a still image
	- `lib/export/export-service.ts` keeps calling `processWithSharp`.
	- Replace the body of `processWithSharp` in `lib/export/sharp-client.ts`. Remove the `fetch('/api/export')` branch and the 4 MB upload split.
	- PNG, JPEG, and WebP use `@jsquash/png`, `@jsquash/jpeg`, and `@jsquash/webp`, dynamic-imported the same way `lib/image-tools/avif.ts` imports `@jsquash/avif/encode`. Quality numbers stay the `QUALITY_PRESETS` values in `lib/export/types.ts`. JPEG flattens transparency to white on a canvas before encode, matching the current Sharp `flatten` step.
	- AVIF keeps `encodeAvif` from `lib/image-tools/avif.ts`.
	- `skipApi: true` (clipboard) keeps `canvas.toBlob()` so a copy does not load the codec WASM.
	- If a jsquash encode throws, fall back to `canvas.toBlob()` for PNG, JPEG, and WebP and surface the existing export error for AVIF. No network retry.
	### Flow 3 — Export video or compress a video
	- `loadFFmpeg` in `lib/export/ffmpeg-encoder.ts` loads `coreURL`, `wasmURL`, and `workerURL` from `/ffmpeg/core-mt/` when `crossOriginIsolated` is true, otherwise from `/ffmpeg/core/`. Keep `FFMPEG_CLASS_WORKER_PATH` at `/ffmpeg/0.12.15/worker.js`.
	- Delete both `https://unpkg.com/...` base URLs.
	### Flow 4 — Remove a background
	- In `lib/background-removal/engine.worker.ts`, configure the transformers environment before the model loads: `allowRemoteModels = false`, `allowLocalModels = true`, local model path `/models/`, and `backends.onnx.wasm.wasmPaths = '/onnx/'`.
	- Change `MODEL_BASE_URL` in `lib/background-removal/mask.ts` to the same-origin prefix `/models/studioludens/birefnet-lite-512`. Keep `MODEL_ID` and `MODEL_REVISION` as labels. The worker must not receive a `huggingface.co` URL.
	- WebGPU and WASM backends stay. Each reads its existing file from `MODEL_WEIGHTS`.
	### Flow 5 — Pick a stock background, overlay, or demo image
	- `getR2PublicUrl` in `lib/r2.ts` returns `/media/${cleanPath}` and nothing else. Delete `mapR2PathToLocal`, `getR2Config`, `isR2Configured`, the S3-shaped `R2Config` type, and `getResizedImageUrl`.
	- Callers (`lib/constants/backgrounds.ts`, `lib/r2-backgrounds.ts`, `lib/r2-overlays.ts`, `lib/r2-demo-images.ts`, overlay and editor components, `components/ui/optimized-image.tsx`) stay on `getR2PublicUrl` / `getR2ImageUrl`. Those helpers become local path builders. Rename only if a rename stays inside `lib/r2.ts` and the public function names stay, so the call sites do not churn.
	- `components/canvas/hooks/useImageLoading.ts` loads those same-origin URLs. Canvas export keeps working because the pixels are same-origin.
	### Flow 6 — Upload or start from a blank canvas
	- Delete `components/controls/WebsiteScreenshotInput.tsx`.
	- Remove its render from `components/controls/UploadDropzone.tsx`.
	- In `components/controls/CleanUploadState.tsx`, delete the URL field, the `/api/screenshot` fetch, and the copy that offers to capture a website. File upload stays.
	- User-visible empty state is the existing upload control. There is no replacement capture dialog.
	### Flow 7 — What used to be tweet-to-image
	- Delete `app/[locale]/tweet/page.tsx` and `components/tweet-image/`.
	- Remove `/tweet` from `app/sitemap.ts`, `lib/agents/llms.ts`, `lib/agents/site-content.ts`, `lib/seo/how-to-guides.ts`, and nav/footer links.
	- Remove the tweet row from `AD_FREE_ROUTES` only as part of deleting ads (Flow 9). There is no tweet page left to exempt.
	### Flow 8 — Agent and SEO files
	- Add a build step in `scripts/vendor-static-assets.ts` that writes `public/llms.txt`, `public/llms-full.txt`, and `public/openapi.json` from `llmsTxt`, `llmsFullTxt`, and `openApiSpec`.
	- Rewrite those generators so they describe a static app and do not list `POST /api/screenshot`, `POST /api/export`, `GET /api/tweet/{id}`, or `GET /api/image-proxy`. Drop the OpenAPI paths or replace the document with a short JSON object whose `info.description` says the site has no HTTP API. Prefer deleting `lib/api/openapi.ts` path entries that describe removed routes and keeping a minimal document so `/openapi.json` does not 404 for old links.
	- Delete `app/api/` including `app/api/[...unmatched]/route.ts`, `app/api/md/route.ts`, and `app/api/indexnow/route.ts`.
	- Markdown content negotiation goes away with `middleware.ts`. Agents that want markdown fetch `/llms.txt`.
	- Delete `app/[locale]/docs/page.tsx`, `app/[locale]/docs/authentication/page.tsx`, and `app/[locale]/developers/page.tsx`. Rewrite `app/[locale]/for/developers/page.tsx` so it describes editing screenshots locally in the static app, not calling an API. Update `lib/seo/json-ld.ts` so it does not point at `/docs`.
	- `app/sitemap.ts` drops `/tweet`, `/docs`, `/docs/authentication`, and `/developers`. `app/robots.ts` drops the `/api/` and `/svc/` disallow entries.
	- Delete `scripts/indexnow.ts` and the `verify:agents` script's HTTP checks, or retarget `tests/verify-agent-endpoints.ts` at the static files only.
	### Flow 9 — Remove automatic third-party calls
	- Delete the PostHog init from `instrumentation-client.ts`. Replace the body of every export in `lib/analytics.ts` with a no-op, and keep every export name that exists today (`trackEvent`, `identifyUser`, `resetUser`, `trackImageUpload`, `trackExportStart`, `trackExportComplete`, `trackExportError`, `trackCopyToClipboard`, `trackBackgroundChange`, `trackEffectApply`, `trackFrameApply`, `trackPresetApply`, `trackOverlayAdd`, `trackAspectRatioChange`, `trackAnimationClipAdd`, `trackSessionStart`, `trackEditorOpen`, `trackCTAClick`, `trackError`). Call sites stay, including `lib/store/index.ts`, `hooks/useExport.ts`, `hooks/useBatchExport.ts`, `components/editor/EditorLayout.tsx`, and the landing CTA components.
	- Remove `posthog-js`. Remove the `/svc` rewrites.
	- Delete the AdSense `<script>` from `components/AdSenseScript.tsx` and the `<AdSenseScript />` render in `components/landing/Footer.tsx`. Delete `ADSENSE_CLIENT` usage in `app/layout.tsx`. Delete `public/ads.txt`. Keep `isAdFreePath` only if a test still imports it; otherwise delete it and `tests/ad-free-routes.test.ts` and `components/AdFreeRouteLinks.tsx`'s dependency on it. Grep before deleting the helper.
	- `components/ui/github-star-button.tsx` renders the GitHub link and icon with no star count and no `fetch`.
	- `components/code-image/CodeImageEditor.tsx` loads `/fonts/code/code-fonts.css` instead of `GOOGLE_FONTS_URL`. Delete `GOOGLE_FONTS_URL`.
	- Replace `next/font/google` in `app/layout.tsx`, `components/landing/Pricing.tsx`, `components/landing/Marquee.tsx`, `components/landing/Sponsors.tsx`, and `components/landing/Testimonial.tsx` with `@fontsource` CSS imports (or `next/font/local` pointed at files those packages ship). The built CSS must not contain `fonts.googleapis.com` or `fonts.gstatic.com`.
	- Remove `<VideoTestimonials>` from `components/landing/LandingPage.tsx`. Delete `components/landing/VideoTestimonials.tsx` and `components/ui/hero-video-dialog.tsx`. YouTube aspect-ratio presets in `lib/constants/aspect-ratios.ts` stay; they are canvas sizes, not network calls.
	- Outbound links a person chooses to open (the GitHub repo, Buy Me a Coffee in `components/SponsorButton.tsx` and `components/landing/Sponsors.tsx`) stay. The app does not fetch them.
	### Flow 10 — Delete the database and the cache
	- Delete `prisma/schema.prisma`, `prisma.config.ts`, `lib/db.ts`, `lib/screenshot-cache.ts`, and `lib/rate-limit.ts`.
	- Remove `@prisma/client`, `prisma`, `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `sharp`, `react-tweet`, `posthog-js`, `@sparticuz/chromium`, and `playwright-core` from `dependencies`.
	- `dev` and `build` scripts become `next dev --webpack` and `tsx scripts/vendor-static-assets.ts && next build --webpack`.
	- Remove the `upload-to-r2`, `upload-all-to-r2`, `upload-pattern`, and `upload-demo` scripts. Those files are gitignored under `/scripts/*` except `scripts/indexnow.ts`, which is deleted in Flow 8.
	- Update `README.md` and `CONTRIBUTING.md`: no `.env`, no `DATABASE_URL`, serve `out/` with any static server. Update `app/[locale]/privacy-policy/page.tsx` so it no longer says screenshots are cached in R2 and Postgres, and no longer lists PostHog, AdSense, unpkg, or Hugging Face as runtime processors.
	## Data Model
	### Removed: `ScreenshotCache`
	Delete the Prisma model and the `screenshot_cache` table from any environment that still has it. The static app has no schema, no migrations, and no client. Fields that go away: `id`, `urlHash`, `url`, `cloudinaryPublicId`, `cloudinaryUrl`, `createdAt`, `updatedAt`.
	### Unchanged: browser storage
	IndexedDB databases `screenshotstudio-db` (drafts) and the store-screenshot database in `lib/store-screenshots/storage.ts` stay. `localStorage` keys for images, export prefs, custom presets, the GitHub star cache key, and the background-removal GPU flag stay, except the star-count code stops reading `gh-stars-v2`.
	## Backend Endpoints
	All of these are deleted. None are replaced by a new URL that runs code on a server.
	- `POST /api/screenshot` — deleted with URL capture. No status codes remain.
	- `POST /api/screenshot/invalidate` — deleted with the cache.
	- `POST /api/cleanup-cache` — deleted with the cache.
	- `POST /api/export` — deleted. Encoding moves into `processWithSharp`.
	- `GET /api/tweet/[id]` — deleted with tweet-to-image.
	- `GET /api/image-proxy` — deleted with tweet-to-image.
	- `GET /api/llms`, `GET /api/llms-full`, `GET /api/openapi`, `GET /api/md`, `GET /api/indexnow` — deleted. `llms.txt`, `llms-full.txt`, and `openapi.json` are static files written into `public/` before the export.
	## Files
	### New files
	- `/home/developer/.herdr/worktrees/screenshot-studio/feat-frontend-only/scripts/vendor-static-assets.ts` — copies FFmpeg cores, ONNX wasm, `vendor/models`, `vendor/media`, and font CSS into `public/`, and writes `public/llms.txt`, `public/llms-full.txt`, and `public/openapi.json`. Exits failure message names each missing source path.
	- `/home/developer/.herdr/worktrees/screenshot-studio/feat-frontend-only/public/_headers` — COOP/COEP for the editor, tools, ffmpeg, onnx, and `/_next/static`.
	- `/home/developer/.herdr/worktrees/screenshot-studio/feat-frontend-only/public/_redirects` — the five existing redirects plus `/docs`, `/docs/authentication`, and `/developers` to `/`.
	- `/home/developer/.herdr/worktrees/screenshot-studio/feat-frontend-only/public/fonts/code/code-fonts.css` — generated by the vendor script from `@fontsource` files for JetBrains Mono, Fira Code, Source Code Pro, IBM Plex Mono, Space Mono, Roboto Mono, Ubuntu Mono, Inconsolata, Anonymous Pro, and Cousine.
	- `/home/developer/.herdr/worktrees/screenshot-studio/feat-frontend-only/vendor/models/` and `vendor/media/` — local archives the vendor script copies. They are inputs, not runtime URLs.
	### Modified files
	- `next.config.ts` — add `output: 'export'`, `trailingSlash: true`, `images.unoptimized: true`. Remove `headers`, `redirects`, `rewrites`, and `images.remotePatterns`. Keep the webpack alias that stubs `sharp` and `onnxruntime-node` on the client until `sharp` is uninstalled; after uninstall, drop the `sharp$` alias and keep the `onnxruntime-node$` alias.
	- `package.json` — scripts and dependency removals in Flow 10. Add `@ffmpeg/core`, `@ffmpeg/core-mt`, `@jsquash/jpeg`, `@jsquash/webp`, `@jsquash/png`, and the `@fontsource` packages for every family `app/layout.tsx` currently imports from `next/font/google`, plus the code-editor families.
	- `lib/export/sharp-client.ts` — browser encode path in Flow 2.
	- `lib/export/ffmpeg-encoder.ts` — same-origin core URLs in Flow 3.
	- `lib/background-removal/mask.ts` and `lib/background-removal/engine.worker.ts` — local model and WASM paths in Flow 4.
	- `lib/r2.ts` — local `/media/` paths only.
	- `lib/analytics.ts` and `instrumentation-client.ts` — no-op tracking, no PostHog import.
	- `components/controls/UploadDropzone.tsx` and `components/controls/CleanUploadState.tsx` — upload only.
	- `components/code-image/code-themes.ts` and `components/code-image/CodeImageEditor.tsx` — local font CSS.
	- `app/layout.tsx` and the four landing components that import `next/font/google` — `@fontsource` or `next/font/local`.
	- `components/landing/LandingPage.tsx` — remove the video testimonial section.
	- `components/landing/Footer.tsx` — remove the AdSense script.
	- `components/ui/github-star-button.tsx` — link only.
	- `app/sitemap.ts`, `app/robots.ts`, `lib/agents/llms.ts`, `lib/agents/site-content.ts`, `lib/seo/how-to-guides.ts`, `lib/seo/json-ld.ts`, `app/[locale]/for/developers/page.tsx`, `app/[locale]/privacy-policy/page.tsx`, `README.md`, `CONTRIBUTING.md` — copy and URL list match the static app.
	- `.gitignore` — ignore generated `public/ffmpeg/core`, `public/ffmpeg/core-mt`, `public/onnx`, `public/models`, `public/media`, and `public/fonts/code` if the vendor script recreates them, so the archive lives in `vendor/` once. Do not ignore `public/_headers` or `public/_redirects`.
	### Deleted files
	- `middleware.ts`
	- `prisma/schema.prisma`, `prisma.config.ts`, `lib/db.ts`, `lib/screenshot-cache.ts`, `lib/rate-limit.ts`
	- `app/api/**`
	- `components/controls/WebsiteScreenshotInput.tsx`
	- `app/[locale]/tweet/page.tsx`, `components/tweet-image/**`
	- `app/[locale]/docs/page.tsx`, `app/[locale]/docs/authentication/page.tsx`, `app/[locale]/developers/page.tsx`
	- `components/landing/VideoTestimonials.tsx`, `components/ui/hero-video-dialog.tsx`
	- `scripts/indexnow.ts`, `public/ads.txt`
	- `lib/api/errors.ts` after `tests/agent-readiness.test.ts` stops importing `apiError`, `apiErrorBody`, `methodNotAllowed`, and `notFoundJson`. Those helpers are only used by Route Handlers and that test.
	## Edge Cases
	- Vendor archive missing a model or image file: `scripts/vendor-static-assets.ts` exits non-zero and names the path. `next build` does not start.
	- Static host does not apply `_headers`: video export and background removal still run, on the single-thread FFmpeg core and the WASM ONNX backend. WebGPU may be unavailable under cross-origin isolation rules; the client already falls back to WASM (`lib/background-removal/client.ts`).
	- Browser has no WebAssembly: background removal already reports unsupported from `BackgroundRemovalClient.isSupported`. Export of PNG/JPEG/WebP falls back to `canvas.toBlob()`. Video export fails with the existing FFmpeg load error, not a network error.
	- AVIF requested and `@jsquash/avif` throws: the export error stays the current AVIF failure. Do not pretend a PNG is an AVIF file.
	- JPEG export of a canvas that has transparent pixels: flatten to white before the jsquash JPEG encode.
	- Clipboard copy: does not load jsquash. Uses `canvas.toBlob()` as `skipApi: true` does today.
	- Locale URL with no prefix other than English, or a prefixed English URL: static files exist only for the `as-needed` layout. `/en/editor/` is not generated. Requesting it 404s.
	- Old `/api/*` URLs: 404 from the static host. No JSON error body, because there is no server.
	- Old `/tweet`, `/docs`, `/developers`: 404 on a generic static host. Hosts that honor `public/_redirects` send them to `/`.
	- `NEXT_PUBLIC_R2_PUBLIC_URL`, `DATABASE_URL`, `CLEANUP_SECRET`, `INDEXNOW_KEY`, `NEXT_PUBLIC_POSTHOG_KEY` set in the environment: ignored. No code reads them.
	- Two tabs exporting video: the existing `exportLock` in `lib/export/ffmpeg-encoder.ts` stays.
	- Drafts written by the current site: IndexedDB schema in `lib/draft-storage.ts` stays at `DB_VERSION` 1, so existing drafts still open.
---
## Test Cases {toggle="true"}
	FRONTEND-ONLY — MANUAL AND SCRIPT TEST PLAN
	PRE-FLIGHT SETUP (do once)
	- From a clean tree, run `npm ci` and `npm run build`.
	- Confirm the build log never prints `prisma generate`.
	- Serve the output with a static server that does not proxy anything, for example `npx serve out`.
	- In DevTools, enable "Block request domain" for `microlink.io`, `r2.cloudflarestorage.com`, `screenshot-studio.com` (the assets host, not the local server), `posthog.com`, `googlesyndication.com`, `unpkg.com`, `huggingface.co`, `googleapis.com`, `gstatic.com`, `github.com`, `twimg.com`, and `youtube.com`. `github.com` block is only to prove the star button does not fetch; the outbound link may still be visible.
	---
	SECTION 1 — Static build
	1.1 `out/index.html` and `out/editor/index.html` exist. `out/es/editor/index.html` exists. `out/en/editor/index.html` does not.
	1.2 `out/` contains no `api/` HTML routes and no `middleware` manifest that references `middleware.ts`.
	1.3 `out/llms.txt`, `out/llms-full.txt`, and `out/openapi.json` exist and do not contain `/api/screenshot`, `/api/export`, `/api/tweet`, or `/api/image-proxy`.
	1.4 `out/ffmpeg/core/ffmpeg-core.wasm` and `out/ffmpeg/core-mt/ffmpeg-core.wasm` exist. `out/onnx/` contains the wasm files copied from `onnxruntime-web`. Both `out/models/studioludens/birefnet-lite-512/onnx/model.onnx` and `out/models/studioludens/birefnet-lite-512/onnx/model_fp16.onnx` exist.
	1.5 A stock background key from `lib/r2-backgrounds.ts`, an overlay from `lib/r2-overlays.ts`, and `backgrounds/demo/demo-1.png` exist under `out/media/`.
	1.6 `grep -R "api.microlink.io\\|huggingface.co\\|unpkg.com\\|fonts.googleapis.com\\|posthog\\|pagead2\\|DATABASE_URL\\|/api/screenshot" out` prints nothing. A hit fails the test.
	---
	SECTION 2 — Editor
	2.1 Open `/editor/`. Upload a PNG. The canvas shows it. No request leaves the origin.
	2.2 The page has no URL field and no "capture website" control.
	2.3 Apply a stock background and an arrow overlay. Both images return 200 from the same host. Export PNG. A file downloads.
	2.4 Export JPEG, WebP, and AVIF. Each file's MIME type matches the choice. JPEG of a transparent PNG has a white background, not a black one.
	2.5 Copy to clipboard. The copy succeeds without a request to `/api/export`.
	2.6 Export an MP4 slideshow. The WASM file request URL starts with the page origin and `/ffmpeg/`. The video plays.
	2.7 Reload the editor. The IndexedDB draft restores the last canvas.
	---
	SECTION 3 — Tools that stay
	3.1 `/remove-background/`: drop a JPEG. The worker requests `/models/studioludens/birefnet-lite-512/onnx/model.onnx` or `model_fp16.onnx` and `/onnx/` wasm. The result has a transparent background. No request to `huggingface.co`.
	3.2 `/compress-video/`: compress a short MP4. The download is smaller or equal and plays. FFmpeg loads from `/ffmpeg/`.
	3.3 `/jpg-to-png/` and `/png-to-webp/`: convert a local file and download the result. No request to `/api/export`.
	3.4 `/code/`: the monospace faces render. The document requests `/fonts/code/code-fonts.css` and font files on the same host. It does not request `fonts.googleapis.com`.
	---
	SECTION 4 — Removed surfaces
	4.1 `/tweet` and `/tweet/` respond 404.
	4.2 `/docs`, `/docs/authentication`, and `/developers` respond 404 on `serve`. They redirect only if the host reads `_redirects`.
	4.3 The landing page does not load an iframe whose `src` contains `youtube.com`.
	4.4 The footer HTML does not contain `adsbygoogle.js`. The star control does not request `api.github.com`.
	4.5 Network log during a page view and an export contains no PostHog host.
	---
	SECTION 5 — Unit tests
	5.1 `npm test` passes.
	5.2 `tests/agent-readiness.test.ts` no longer expects `/docs` or live API paths. It asserts the generated markdown and OpenAPI text have no `/api/screenshot` route.
	5.3 `tests/indexnow.test.ts` is deleted with `scripts/indexnow.ts`.
	5.4 `tests/ad-free-routes.test.ts` is deleted or rewritten once ads are gone.
	5.5 `tests/ffmpeg-worker.test.ts` still matches `public/ffmpeg/0.12.15/worker.js` to the installed `@ffmpeg/ffmpeg` worker.
	5.6 `tests/background-removal.test.ts` still covers mask helpers. Add an assertion that `MODEL_BASE_URL` starts with `/models/`.
	---
	SIGN-OFF
	- `npm run build` exits 0 without `DATABASE_URL` and without network access except what `npm` already cached.
	- `out/` served as static files supports upload, edit, still export, video export, background removal, and image tools.
	- DevTools shows no off-origin requests during those flows.
	- URL capture, tweet import, and `/api/*` are gone.
---
## Rollout Plan {toggle="true"}
	1. Migrations to run: none. After the static site is the only deployment, drop the PostgreSQL database and the R2 screenshot-cache prefix (`screenshots/`). Stock objects in R2 must already have been copied into `vendor/media/` before this deploy. Do not point the new site at the bucket.
	2. Feature flags: none. This is not a partial toggle. Shipping the static export removes the API. Keep the old Node server deployed until `out/` has been checked with the test plan, then switch the host to the static files and retire the Node process.
	3. Config that must be set before flip: none in the app. The host should apply `public/_headers` if multi-threaded WASM is wanted. Remove `DATABASE_URL`, R2 keys, `CLEANUP_SECRET`, `INDEXNOW_KEY`, `SCREENSHOT_API_URL`, and PostHog keys from the hosting project so a rollback checkout is the only way those integrations return.
	4. Communication: the public HTTP API, tweet-to-image, and "paste a URL to capture" go away. Update the README and the privacy policy in the same change. Tell anyone using `POST /api/screenshot` or `POST /api/export` that those URLs will 404.
	5. Rollback: redeploy the previous Next.js server build. The static export does not write the database, so a rollback does not need a down migration. Drafts in each visitor's IndexedDB keep working across the rollback.
