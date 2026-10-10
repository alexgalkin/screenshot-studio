/**
 * `localePrefix: 'as-needed'` keeps English unprefixed, but static export
 * still writes those pages under out/en. Move them to the site root so
 * / and /editor/ match the links in the HTML.
 */
import { readdirSync, renameSync, rmSync, statSync } from "node:fs";
import path from "node:path";

const root = path.join(process.cwd(), "out");
const english = path.join(root, "en");

if (!statSync(english, { throwIfNoEntry: false })?.isDirectory()) {
  console.log("No out/en directory to hoist");
  process.exit(0);
}

for (const name of readdirSync(english)) {
  const from = path.join(english, name);
  const to = path.join(root, name);
  if (statSync(to, { throwIfNoEntry: false })) {
    throw new Error(`Refusing to overwrite ${path.relative(process.cwd(), to)}`);
  }
  renameSync(from, to);
}

rmSync(english, { recursive: true, force: true });
console.log("Hoisted English pages from out/en to out/");
