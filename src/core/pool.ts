import type { View } from "./routes";
import type { Photo } from "./types";

export const GRID_BATCH = 48;

export function poolKey({ view, scope }: { view: View; scope: string }): string | null {
  switch (view.kind) {
    case "root":
      return "all";
    case "featured":
      return "featured";
    case "collection":
      return view.key;
    case "photo":
      return scope;
    default:
      return null;
  }
}

// Fowler–Noll–Vo, pretty cool!
function mixKey(id: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function mixed(photos: Photo[]): Photo[] {
  return photos
    .map((p) => ({ p, k: mixKey(p.id) }))
    .sort((a, b) => a.k - b.k || a.p.id.localeCompare(b.p.id))
    .map(({ p }) => p);
}

export function poolFor(photos: Photo[], cat: string): Photo[] {
  if (!cat || cat === "all") return mixed(photos);
  if (cat === "featured") return mixed(photos.filter((p) => p.featured));

  const own = photos.filter((p) => p.collection === cat);
  return own.length ? own : photos;
}

export function gridLimitFor(index: number | null): number {
  return index == null ? GRID_BATCH : Math.max(GRID_BATCH, Math.ceil((index + 1) / GRID_BATCH) * GRID_BATCH);
}

export function embedPool(pool: Photo[], openId?: string): Photo[] {
  const open = openId ? pool.findIndex((p) => p.id === openId) : -1;
  const keep = new Set(pool.slice(0, GRID_BATCH));
  if (open >= 0) {
    for (let i = open - 2; i <= open + 2; i++) {
      const photo = pool[(i + pool.length) % pool.length];
      if (photo) keep.add(photo);
    }
  }
  return pool.filter((p) => keep.has(p));
}

export function stepDirection(from: number, to: number, length: number): 1 | -1 {
  if (to === (from + 1) % length) return 1;
  if (to === (from - 1 + length) % length) return -1;
  return to < from ? -1 : 1;
}
