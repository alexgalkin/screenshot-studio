/**
 * Copy same-origin binaries into public/ before `next build`.
 * Reads node_modules and the local vendor/ archive. Does not fetch the network.
 */
import { closeSync, cpSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, rmSync, writeFileSync, writeSync } from "node:fs";
import path from "node:path";
import { backgroundCategories } from "../lib/r2-backgrounds";
import { demoImagePaths } from "../lib/r2-demo-images";
import { OVERLAY_PATHS } from "../lib/r2-overlays";
import { llmsFullTxt, llmsTxt } from "../lib/agents/llms";
import { openApiSpec } from "../lib/api/openapi";

const root = process.cwd();
const missing: string[] = [];

function noteMissing(relativePath: string): void {
  missing.push(relativePath);
}

function packageDir(name: string): string {
  return path.join(root, "node_modules", name);
}

function copyFile(from: string, to: string): void {
  mkdirSync(path.dirname(to), { recursive: true });
  cpSync(from, to);
}

function resetDir(relativePath: string): string {
  const absolute = path.join(root, relativePath);
  rmSync(absolute, { recursive: true, force: true });
  mkdirSync(absolute, { recursive: true });
  return absolute;
}

function copyFfmpeg(): void {
  const single = path.join(packageDir("@ffmpeg/core"), "dist/esm");
  const multi = path.join(packageDir("@ffmpeg/core-mt"), "dist/esm");
  const singleOut = resetDir("public/ffmpeg/core");
  const multiOut = resetDir("public/ffmpeg/core-mt");
  for (const file of ["ffmpeg-core.js", "ffmpeg-core.wasm"]) {
    copyFile(path.join(single, file), path.join(singleOut, file));
  }
  for (const file of ["ffmpeg-core.js", "ffmpeg-core.wasm", "ffmpeg-core.worker.js"]) {
    copyFile(path.join(multi, file), path.join(multiOut, file));
  }
}

function copyOnnx(): void {
  const dist = path.join(packageDir("onnxruntime-web"), "dist");
  const out = resetDir("public/onnx");
  for (const file of readdirSync(dist)) {
    if (file.startsWith("ort-wasm")) {
      copyFile(path.join(dist, file), path.join(out, file));
    }
  }
}

function concatParts(parts: string[], destination: string): void {
  const out = openSync(destination, "w");
  try {
    for (const part of parts) writeSync(out, readFileSync(part));
  } finally {
    closeSync(out);
  }
}

function ensureOnnx(directory: string, filename: string): boolean {
  const whole = path.join(directory, filename);
  if (existsSync(whole)) return true;
  if (!existsSync(directory)) return false;
  const parts = readdirSync(directory)
    .filter((name) => name.startsWith(`${filename}.part-`))
    .sort()
    .map((name) => path.join(directory, name));
  if (parts.length === 0) return false;
  concatParts(parts, whole);
  return true;
}

function copyModels(): void {
  const source = path.join(root, "vendor/models/studioludens/birefnet-lite-512");
  const onnxDir = path.join(source, "onnx");
  const relative = "vendor/models/studioludens/birefnet-lite-512";
  for (const name of ["config.json", "preprocessor_config.json"]) {
    if (!existsSync(path.join(source, name))) noteMissing(`${relative}/${name}`);
  }
  for (const name of ["model.onnx", "model_fp16.onnx"]) {
    if (!ensureOnnx(onnxDir, name)) noteMissing(`${relative}/onnx/${name}`);
  }
  if (missing.length > 0) return;
  const out = resetDir("public/models/studioludens/birefnet-lite-512");
  for (const name of ["config.json", "preprocessor_config.json"]) {
    copyFile(path.join(source, name), path.join(out, name));
  }
  for (const name of ["model.onnx", "model_fp16.onnx"]) {
    copyFile(path.join(onnxDir, name), path.join(out, "onnx", name));
  }
}

function mediaKeys(): string[] {
  const keys = new Set<string>();
  for (const paths of Object.values(backgroundCategories)) {
    for (const key of paths) keys.add(key);
  }
  for (const key of demoImagePaths) keys.add(key);
  for (const key of OVERLAY_PATHS) keys.add(key);
  return [...keys];
}

function copyMedia(): void {
  const keys = mediaKeys();
  for (const key of keys) {
    const relativePath = path.join("vendor/media", key);
    if (!existsSync(path.join(root, relativePath))) noteMissing(relativePath);
  }
  if (missing.length > 0) return;
  const out = resetDir("public/media");
  for (const key of keys) {
    copyFile(path.join(root, "vendor/media", key), path.join(out, key));
  }
}

function copyCodeFonts(): void {
  const faces: Array<{ pkg: string; file: string; family: string; weight: string }> = [
    {
      pkg: "@fontsource-variable/jetbrains-mono",
      file: "files/jetbrains-mono-latin-wght-normal.woff2",
      family: "JetBrains Mono",
      weight: "100 900",
    },
    {
      pkg: "@fontsource-variable/fira-code",
      file: "files/fira-code-latin-wght-normal.woff2",
      family: "Fira Code",
      weight: "300 700",
    },
    {
      pkg: "@fontsource/source-code-pro",
      file: "files/source-code-pro-latin-400-normal.woff2",
      family: "Source Code Pro",
      weight: "400",
    },
    {
      pkg: "@fontsource/ibm-plex-mono",
      file: "files/ibm-plex-mono-latin-400-normal.woff2",
      family: "IBM Plex Mono",
      weight: "400",
    },
    {
      pkg: "@fontsource/space-mono",
      file: "files/space-mono-latin-400-normal.woff2",
      family: "Space Mono",
      weight: "400",
    },
    {
      pkg: "@fontsource/roboto-mono",
      file: "files/roboto-mono-latin-400-normal.woff2",
      family: "Roboto Mono",
      weight: "400",
    },
    {
      pkg: "@fontsource/ubuntu-mono",
      file: "files/ubuntu-mono-latin-400-normal.woff2",
      family: "Ubuntu Mono",
      weight: "400",
    },
    {
      pkg: "@fontsource/inconsolata",
      file: "files/inconsolata-latin-400-normal.woff2",
      family: "Inconsolata",
      weight: "400",
    },
    {
      pkg: "@fontsource/anonymous-pro",
      file: "files/anonymous-pro-latin-400-normal.woff2",
      family: "Anonymous Pro",
      weight: "400",
    },
    {
      pkg: "@fontsource/cousine",
      file: "files/cousine-latin-400-normal.woff2",
      family: "Cousine",
      weight: "400",
    },
  ];

  const out = resetDir("public/fonts/code");
  const rules: string[] = [];
  for (const face of faces) {
    const source = path.join(packageDir(face.pkg), face.file);
    if (!existsSync(source)) {
      noteMissing(`${face.pkg}/${face.file}`);
      continue;
    }
    const filename = path.basename(face.file);
    copyFile(source, path.join(out, filename));
    rules.push(`@font-face {
  font-family: "${face.family}";
  font-style: normal;
  font-weight: ${face.weight};
  font-display: swap;
  src: url("./${filename}") format("woff2");
}`);
  }
  writeFileSync(path.join(out, "code-fonts.css"), `${rules.join("\n\n")}\n`);
}

function writeAgentFiles(): void {
  writeFileSync(path.join(root, "public/llms.txt"), `${llmsTxt.trim()}\n`);
  writeFileSync(path.join(root, "public/llms-full.txt"), `${llmsFullTxt.trim()}\n`);
  writeFileSync(path.join(root, "public/openapi.json"), `${JSON.stringify(openApiSpec, null, 2)}\n`);
}

copyFfmpeg();
copyOnnx();
copyModels();
copyMedia();
copyCodeFonts();
writeAgentFiles();

if (missing.length > 0) {
  console.error("Missing required static assets:");
  for (const relativePath of missing) console.error(`  ${relativePath}`);
  process.exit(1);
}

console.log("Vendored static assets into public/");
