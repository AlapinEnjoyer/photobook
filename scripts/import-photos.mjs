#!/usr/bin/env node
// Usage: node scripts/import-photos.mjs <source-dir> [collection] [--max px] [--quality n]
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import sharp from "sharp";
import { RESERVED_COLLECTIONS } from "../src/core/names.ts";

const EXTS = new Set([".jpg", ".jpeg", ".png", ".tif", ".tiff", ".webp", ".heic"]);

function parseArgs(argv) {
  const positional = [];
  const opts = { max: 3840, quality: 82 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--max") opts.max = Number(argv[++i]);
    else if (a === "--quality") opts.quality = Number(argv[++i]);
    else if (a.startsWith("--")) throw new Error(`Unknown option: ${a}`);
    else positional.push(a);
  }
  return { positional, opts };
}

const { positional, opts } = parseArgs(process.argv.slice(2));
const [sourceDir, collection] = positional;

if (!sourceDir) {
  console.error("Usage: node scripts/import-photos.mjs <source-dir> [collection] [--max px] [--quality n]");
  process.exit(1);
}
if (collection && !/^[a-z0-9-]+$/.test(collection)) {
  console.error(
    `Collection must be a lowercase slug (got "${collection}") — it becomes the folder name and the URL.`,
  );
  process.exit(1);
}
if (collection && RESERVED_COLLECTIONS.has(collection)) {
  console.error(`Collection "${collection}" is reserved for the app menu. Choose another slug.`);
  process.exit(1);
}

const outDir = resolve("src/photos", collection ?? "");
await mkdir(outDir, { recursive: true });

const files = (await readdir(resolve(sourceDir)))
  .filter((f) => EXTS.has(extname(f).toLowerCase()))
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

if (!files.length) {
  console.error(`No images found in ${sourceDir}`);
  process.exit(1);
}

let bytesIn = 0;
let bytesOut = 0;

let next =
  (await readdir(outDir))
    .map((f) => Number.parseInt(f, 10))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0) + 1;

for (const file of files) {
  const stem = basename(file, extname(file))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const outName = `${String(next).padStart(2, "0")}-${stem}.jpg`;
  next++;

  const sourcePath = resolve(sourceDir, file);
  bytesIn += (await stat(sourcePath)).size;

  const output = await sharp(sourcePath)
    // Bake EXIF orientation before metadata is stripped.
    .rotate()
    .resize({ width: opts.max, height: opts.max, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: opts.quality, mozjpeg: true })
    .toBuffer();

  await writeFile(join(outDir, outName), output);
  bytesOut += output.length;

  const meta = await sharp(output).metadata();
  console.log(`  ${outName}  ${meta.width}×${meta.height}  ${(output.length / 1024).toFixed(0)} KB`);
}

const mb = (n) => (n / 1024 / 1024).toFixed(1);
console.log(
  `\n${files.length} photos → src/photos/${collection ? `${collection}/` : ""}  (${mb(bytesIn)} MB → ${mb(bytesOut)} MB)`,
);
console.log(
  collection
    ? `Add a title and year in src/content/collections/${collection}.md`
    : "Add alt text and captions in src/content/photos.md",
);
