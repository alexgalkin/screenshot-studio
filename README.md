# Screenshot Studio

<a href="https://vercel.com/oss"><img alt="Vercel OSS Program" src="https://vercel.com/oss/program-badge.svg" /></a>

![Screenshot Studio editor preview](https://github.com/user-attachments/assets/2c27aef0-b5d0-41a0-98b3-d2008ad9c232)

A free, open-source editor for screenshots, mockups, and social graphics. No signup or watermarks.

[Open the editor](https://www.screenshot-studio.com/editor) · [Image tools](https://www.screenshot-studio.com/tools) · [Code to image](https://www.screenshot-studio.com/code) · [App Store screenshots](https://www.screenshot-studio.com/store-screenshots)

## What you can make

- **Screenshot designs:** backgrounds, browser and device frames, shadows, and 3D perspective.
- **Text-only graphics:** start without an image; choose Inter, Geist, or other fonts, then drag or center your text.
- **Layered compositions:** text, images, annotations, and blur regions.
- **Store and social assets:** ready-made layouts and exact export sizes, including Chrome Web Store screenshots.
- **Images and motion:** PNG, JPEG, WebP, batch ZIP, MP4, WebM, and GIF exports.
- **Quick edits:** resize, crop, convert, compress, and remove image backgrounds.

## Run locally

Requires Node.js 20.9+ and npm.

```bash
git clone https://github.com/opennookorg/screenshot-studio.git
cd screenshot-studio
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). `npm run build` writes a static site to `out/` (`output: 'export'`). `npm start` serves that folder on port 3000. Any other static file server can host it too. There is no database, no API, and no `.env`.

Stock images, fonts, FFmpeg, and the background-removal model live in `vendor/` or `node_modules` and are copied into `public/` by `scripts/vendor-static-assets.ts` before dev and build. The ONNX weights are stored as `*.onnx.part-*` files so they stay under GitHub's file size limit. The script joins those parts and does not download them.

Hosts that honor `public/_headers` send the cross-origin isolation headers the multi-thread FFmpeg and ONNX builds need. Other servers use the single-thread builds. `public/_redirects` maps removed URLs such as `/docs` and `/tweet`. See [ARCHITECTURE.md](./ARCHITECTURE.md).

## Contribute

Read [CONTRIBUTING.md](./CONTRIBUTING.md) for the workflow and checks. Built with Next.js, React, TypeScript, Tailwind CSS, and Zustand.

[Apache 2.0 license](./LICENSE) · Supported by the [Vercel OSS Program](https://vercel.com/oss)
