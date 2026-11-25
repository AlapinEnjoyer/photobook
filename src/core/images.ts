import { sortByName, sourceKey, stem } from "./names.ts";

export type ImageFormat = "webp" | "avif" | "jpeg";

export interface ManifestEntry {
  collection: string;
  file: string;
  width: number;
  height: number;
  hash: string;
}

export const IMAGE_ROUTE = "img";
export const THUMB_WIDTH = 200;
export const SOCIAL = { width: 1200, height: 630, quality: 82 } as const;

export function widthsFor(sourceWidth: number, widths: readonly number[]): number[] {
  const fit = [...new Set(widths.filter((w) => w <= sourceWidth))];
  return fit.length ? fit : [sourceWidth];
}

// Pick a middle width for bare src fallback (crawlers, "save image as").
export function fallbackIndex(count: number): number {
  return Math.max(0, Math.floor((count - 1) / 2));
}

export const thumbWidth = (entry: ManifestEntry): number =>
  widthsFor(entry.width, [THUMB_WIDTH])[0] ?? entry.width;

function variantKey(entry: ManifestEntry, label: string, ext: string): string {
  return sourceKey(entry.collection, `${stem(entry.file)}-${entry.hash}-${label}.${ext}`);
}

export function widthKey(entry: ManifestEntry, width: number, format: ImageFormat): string {
  return variantKey(entry, `${width}w`, format === "jpeg" ? "jpg" : format);
}

export function socialKey(entry: ManifestEntry): string {
  return variantKey(entry, "og", "jpg");
}

// Encode per segment so spaces cannot split srcset entries.
export function assetUrl(base: string, key: string): string {
  return `${base.replace(/\/$/, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function sortEntries<T extends { collection: string; file: string }>(entries: readonly T[]): T[] {
  return [...entries].sort((a, b) => a.collection.localeCompare(b.collection) || sortByName(a.file, b.file));
}
