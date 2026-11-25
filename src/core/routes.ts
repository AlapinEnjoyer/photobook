import type { Collection, Photo } from "./types";

export type View =
  | { kind: "root" }
  | { kind: "featured" }
  | { kind: "collections" }
  | { kind: "collection"; key: string }
  | { kind: "about" }
  | { kind: "photo"; id: string }
  | { kind: "unknown" };

function normalizeBase(base: string): string {
  const trimmed = base.replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}/` : "/";
}

const BASE = normalizeBase(import.meta.env?.BASE_URL ?? "/");
const ABSOLUTE_URL = /^(?:[a-z][a-z\d+.-]*:)?\/\//i;

export function collectionPath(key: string): string {
  return `${BASE}collections/${encodeURIComponent(key)}/`;
}

export function photoPath(id: string): string {
  return `${BASE}photos/${id.split("/").map(encodeURIComponent).join("/")}/`;
}

export function catalogPath(): string {
  return `${BASE}catalog.json`;
}

export function publicPath(path: string): string {
  if (ABSOLUTE_URL.test(path)) return path;
  return `${BASE}${path.replace(/^\/+/, "")}`;
}

export function parsePath(pathname: string, base: string = BASE): View {
  const normBase = normalizeBase(base);
  let withoutBase: string;
  if (normBase === "/") {
    withoutBase = pathname;
  } else if (pathname === normBase.slice(0, -1)) {
    withoutBase = "";
  } else if (pathname.startsWith(normBase)) {
    withoutBase = pathname.slice(normBase.length);
  } else {
    return { kind: "unknown" };
  }

  let parts: string[];
  try {
    parts = withoutBase
      .split("/")
      .filter(Boolean)
      .map((part) => decodeURIComponent(part));
  } catch {
    return { kind: "unknown" };
  }

  if (parts.length === 0) return { kind: "root" };

  if (parts[0] === "photos") {
    const id = parts.slice(1).join("/");
    return id ? { kind: "photo", id } : { kind: "unknown" };
  }

  if (parts[0] === "collections") {
    const key = parts[1];
    if (parts.length === 1) return { kind: "collections" };
    if (parts.length === 2 && key) return { kind: "collection", key };
    return { kind: "unknown" };
  }

  if (parts[0] === "about" && parts.length === 1) return { kind: "about" };
  if (parts[0] === "featured" && parts.length === 1) return { kind: "featured" };

  return { kind: "unknown" };
}

export function viewPath(view: View): string {
  switch (view.kind) {
    case "featured":
    case "collections":
    case "about":
      return `${BASE}${view.kind}/`;
    case "collection":
      return collectionPath(view.key);
    case "photo":
      return photoPath(view.id);
    default:
      return BASE;
  }
}

export function viewTitle(
  view: View,
  siteTitle: string,
  collections: readonly Collection[],
  photos: readonly Photo[],
): string {
  switch (view.kind) {
    case "featured":
      return `Featured | ${siteTitle}`;
    case "collections":
      return `Collections | ${siteTitle}`;
    case "about":
      return `About | ${siteTitle}`;
    case "collection": {
      const col = collections.find((c) => c.key === view.key);
      return col ? `${col.name} | ${siteTitle}` : siteTitle;
    }
    case "photo": {
      const photo = photos.find((p) => p.id === view.id);
      if (!photo) return siteTitle;
      const col = collections.find((c) => c.key === photo.collection);
      return [photo.title, col?.name, siteTitle].filter(Boolean).join(" | ");
    }
    default:
      return siteTitle;
  }
}

export function poolView(key: string): View {
  if (key === "all") return { kind: "root" };
  if (key === "featured") return { kind: "featured" };
  return { kind: "collection", key };
}

export function categoryView(key: string): View {
  if (key === "collections" || key === "about") return { kind: key };
  return poolView(key);
}
