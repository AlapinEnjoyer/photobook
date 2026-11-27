#!/usr/bin/env node
// Usage: node scripts/import-videos.mjs <file-or-dir> [collection] [--seconds n] [--height px] [--poster s] [--start s]
import { execFile } from "node:child_process";
import { mkdir, readdir, stat } from "node:fs/promises";
import { basename, extname, join, resolve } from "node:path";
import { promisify } from "node:util";
import { RESERVED_COLLECTIONS } from "../src/core/names.ts";

const run = promisify(execFile);
const EXTS = new Set([".mp4", ".mov", ".webm", ".m4v", ".avi", ".mkv", ".ogv"]);

function parseArgs(argv) {
  const positional = [];
  const opts = { seconds: 5, height: 720, poster: 1.5, start: 0 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      if (!(key in opts)) throw new Error(`Unknown option: ${a}`);
      opts[key] = Number(argv[++i]);
    } else positional.push(a);
  }
  return { positional, opts };
}

const { positional, opts } = parseArgs(process.argv.slice(2));
const [source, collection] = positional;

if (!source) {
  console.error(
    "Usage: node scripts/import-videos.mjs <file-or-dir> [collection] [--seconds n] [--height px] [--poster s] [--start s]",
  );
  process.exit(1);
}
if (collection && !/^[a-z0-9-]+$/.test(collection)) {
  console.error(`Collection must be a lowercase slug (got "${collection}").`);
  process.exit(1);
}
if (collection && RESERVED_COLLECTIONS.has(collection)) {
  console.error(`Collection "${collection}" is reserved for the app menu. Choose another slug.`);
  process.exit(1);
}

try {
  await run("ffmpeg", ["-version"]);
} catch {
  console.error("ffmpeg not found on PATH. Install it and retry.");
  process.exit(1);
}

const src = resolve(source);
const files = (await stat(src)).isDirectory()
  ? (await readdir(src))
      .filter((f) => EXTS.has(extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
      .map((f) => join(src, f))
  : [src];

if (!files.length) {
  console.error(`No video files found in ${source}`);
  process.exit(1);
}

const photoDir = resolve("src/photos", collection ?? "");
const videoDir = resolve("public/video");
await mkdir(photoDir, { recursive: true });
await mkdir(videoDir, { recursive: true });

let next =
  (await readdir(photoDir))
    .map((f) => Number.parseInt(f, 10))
    .filter((n) => Number.isFinite(n))
    .reduce((a, b) => Math.max(a, b), 0) + 1;

const snippets = [];

for (const file of files) {
  const stem = basename(file, extname(file))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const videoName = `${[collection, stem].filter(Boolean).join("-")}.mp4`;
  const stillName = `${String(next).padStart(2, "0")}-${stem}.jpg`;
  next++;

  // Even dimensions required by h264.
  const scale = `scale=-2:${opts.height}`;

  await run("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-ss",
    String(opts.start),
    "-i",
    file,
    "-map",
    "0:v:0",
    "-map_metadata",
    "-1",
    "-map_chapters",
    "-1",
    "-t",
    String(opts.seconds),
    "-vf",
    scale,
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "28",
    "-pix_fmt",
    "yuv420p",
    "-movflags",
    "+faststart",
    join(videoDir, videoName),
  ]);

  // Extract poster from encoded clip so dimensions and framing match.
  await run("ffmpeg", [
    "-v",
    "error",
    "-y",
    "-ss",
    String(opts.poster),
    "-i",
    join(videoDir, videoName),
    "-map",
    "0:v:0",
    "-map_metadata",
    "-1",
    "-map_chapters",
    "-1",
    "-frames:v",
    "1",
    "-q:v",
    "3",
    join(photoDir, stillName),
  ]);

  const { size } = await stat(join(videoDir, videoName));
  console.log(`  ${videoName}  ${(size / 1024 / 1024).toFixed(2)} MB  → still ${stillName}`);

  snippets.push(
    `  - file: "${stillName}"\n` +
      `    alt: ""\n` +
      `    video: "video/${videoName}"\n` +
      `    poster: ${opts.poster}`,
  );
}

const target = collection ? `src/content/collections/${collection}.md` : "src/content/photos.md";
console.log(`\nAdd to ${target} under photos:\n`);
console.log(snippets.join("\n"));
