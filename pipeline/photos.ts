import { createHash } from "node:crypto";
import { access, mkdir, readdir, readFile, rm, rmdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, relative, sep } from "node:path";
import {
  type ManifestEntry,
  SOCIAL,
  socialKey,
  sortEntries,
  thumbWidth,
  widthKey,
  widthsFor,
} from "../src/core/images.ts";
import { assertValidBook, sourceKey } from "../src/core/names.ts";
import type { PhotobookConfig } from "../src/core/types.ts";

export const SRC_DIR = "src/photos";
export const OUT_DIR = "dist-photos";
export const MANIFEST = "photos.manifest.json";

const IMAGE_RE = /\.(jpe?g|png|webp|avif)$/i;
const ROTATED_ORIENTATIONS = new Set([5, 6, 7, 8]);
const CONCURRENCY = 4;

export interface PipelineOptions {
  root: string;
  images: Pick<PhotobookConfig["images"], "widths" | "format" | "quality">;
  credit: PhotobookConfig["credit"];
  log?: (message: string) => void;
}

type Source = { collection: string; file: string };

export async function scan(srcDir: string): Promise<Source[]> {
  const found: Source[] = [];
  for (const entry of await readdir(srcDir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (entry.isFile() && IMAGE_RE.test(entry.name)) found.push({ collection: "", file: entry.name });
    if (!entry.isDirectory()) continue;

    for (const inner of await readdir(join(srcDir, entry.name), { withFileTypes: true })) {
      if (inner.isDirectory()) {
        throw new Error(
          `[photobook] nested photo folders are not supported: ${SRC_DIR}/${entry.name}/${inner.name}/`,
        );
      }
      if (inner.isFile() && IMAGE_RE.test(inner.name))
        found.push({ collection: entry.name, file: inner.name });
    }
  }
  assertValidBook(found);
  return sortEntries(found);
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await walk(path)));
    else out.push(path);
  }
  return out;
}

async function inPool<T>(items: T[], run: (item: T) => Promise<void>): Promise<void> {
  const queue = items.values();
  const worker = async () => {
    for (const item of queue) await run(item);
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
}

export async function runPipeline(options: PipelineOptions): Promise<ManifestEntry[]> {
  const { root, images, credit, log = () => {} } = options;
  const sharp = createRequire(import.meta.url)("sharp") as typeof import("sharp").default;

  const srcDir = join(root, SRC_DIR);
  const outDir = join(root, OUT_DIR);
  const sources = await scan(srcDir);

  const exif = credit
    ? { IFD0: { Artist: credit.artist, ...(credit.copyright ? { Copyright: credit.copyright } : {}) } }
    : null;
  const settings = JSON.stringify([images.format, images.quality, SOCIAL, credit]);

  const manifest: ManifestEntry[] = [];
  const keep = new Set<string>();
  let written = 0;

  const write = async (key: string, encode: (path: string) => Promise<unknown>) => {
    const path = join(outDir, key);
    keep.add(path);
    if (await exists(path)) return;
    await mkdir(dirname(path), { recursive: true });
    await encode(path);
    written++;
  };

  await inPool(sources, async ({ collection, file }) => {
    const label = sourceKey(collection, file);
    const input = await readFile(join(srcDir, label));
    const metadata = await sharp(input).metadata();
    let { width = 0, height = 0 } = metadata;
    if (!width || !height) throw new Error(`[photobook] could not read dimensions for ${SRC_DIR}/${label}`);
    if (ROTATED_ORIENTATIONS.has(metadata.orientation ?? 1)) [width, height] = [height, width];

    const hash = createHash("sha256").update(settings).update(input).digest("hex").slice(0, 8);
    const entry: ManifestEntry = { collection, file, width, height, hash };
    manifest.push(entry);

    let base: ReturnType<typeof sharp> | null = null;
    const clone = () => {
      if (!base) {
        const image = sharp(input).rotate();
        base = exif ? image.withExif(exif) : image;
      }
      return base.clone();
    };

    for (const w of new Set([...widthsFor(width, images.widths), thumbWidth(entry)])) {
      await write(widthKey(entry, w, images.format), (path) =>
        clone().resize({ width: w }).toFormat(images.format, { quality: images.quality }).toFile(path),
      );
    }
    await write(socialKey(entry), (path) =>
      clone()
        .resize({ width: SOCIAL.width, height: SOCIAL.height, fit: "cover", position: "attention" })
        .jpeg({ quality: SOCIAL.quality, mozjpeg: true })
        .toFile(path),
    );
  });

  let removed = 0;
  for (const path of await walk(outDir)) {
    if (keep.has(path)) continue;
    await rm(path);
    removed++;
    await rmdir(dirname(path)).catch(() => {});
  }

  const sorted = sortEntries(manifest);
  const body = `${JSON.stringify(sorted, null, 2)}\n`;
  const manifestPath = join(root, MANIFEST);
  const previous = await readFile(manifestPath, "utf8").catch(() => null);
  // we avoid to reload needlessly.
  if (previous !== body) await writeFile(manifestPath, body);

  log(
    `${sorted.length} photos, ${written} variants written, ${removed} removed (${relative(root, outDir).split(sep).join("/")}/)`,
  );
  return sorted;
}
