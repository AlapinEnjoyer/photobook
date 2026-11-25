import type { ImageFormat, ManifestEntry } from "../core/images";
import {
  assetUrl,
  fallbackIndex,
  IMAGE_ROUTE,
  socialKey,
  thumbWidth,
  widthKey,
  widthsFor,
} from "../core/images";
import { assertValidBook, assertValidCollection, frames, humanise, photoId, sourceKey } from "../core/names";
import { publicPath } from "../core/routes";
import type { Collection, Photo, PhotobookConfig } from "../core/types";

const COVER_SIZES = "(max-width: 700px) 100vw, 62vw";

export interface PhotoOverride {
  file: string;
  alt?: string;
  caption?: string;
  featured?: boolean;
  video?: string;
  poster?: number;
}

export interface Meta {
  title?: string;
  year?: string;
  order: number;
  cover?: string;
  photos: PhotoOverride[];
}

export interface AssembleOptions {
  imageBase: string;
  images: { widths: number[]; format: ImageFormat };
  warn?: (message: string) => void;
}

export interface Book {
  photos: Photo[];
  collections: Collection[];
  social: { photos: Map<string, string>; collections: Map<string, string> };
}

export function imageBase(source: PhotobookConfig["source"]): string {
  if (source.kind === "local") return publicPath(IMAGE_ROUTE);
  if (!source.base) {
    throw new Error(
      "source.base is empty — set PHOTO_CDN_BASE (see .env.example) or switch source.kind back to 'local'.",
    );
  }
  return source.base;
}

function warnDanglingMeta(
  entries: readonly ManifestEntry[],
  meta: Map<string, Meta>,
  warn: (m: string) => void,
) {
  for (const [slug, m] of meta) {
    const describes = slug ? `${slug}.md` : "photos.md";
    const where = (file: string) => `src/photos/${sourceKey(slug, file)}`;
    const have = new Set(entries.filter((e) => e.collection === slug).map((e) => e.file));

    for (const { file } of m.photos) {
      if (!have.has(file)) {
        warn(
          `[photobook] ${describes} lists photos[].file "${file}", but ${where(file)} does not exist — that override is being ignored.`,
        );
      }
    }
    if (m.cover && !have.has(m.cover)) {
      warn(
        `[photobook] ${describes} sets cover "${m.cover}", but ${where(m.cover)} does not exist — falling back to the first photo.`,
      );
    }
  }
}

export function assemble(
  entries: readonly ManifestEntry[],
  meta: Map<string, Meta>,
  options: AssembleOptions,
): Book {
  const { imageBase: base, images, warn = console.warn } = options;

  assertValidBook(entries);
  for (const key of meta.keys()) if (key) assertValidCollection(key);
  warnDanglingMeta(entries, meta, warn);

  const url = (key: string) => assetUrl(base, key);
  const social = { photos: new Map<string, string>(), collections: new Map<string, string>() };
  const overridesByCollection = new Map<string, Map<string, PhotoOverride>>(
    [...meta].map(([slug, m]) => [slug, new Map(m.photos.map((p) => [p.file, p]))]),
  );

  const photos = entries.map((entry): Photo => {
    const { collection, file, width, height } = entry;
    const override = overridesByCollection.get(collection)?.get(file);
    const fit = widthsFor(width, images.widths);
    const sized = (w: number) => url(widthKey(entry, w, images.format));
    const id = photoId(collection, file);
    const name = humanise(file);
    social.photos.set(id, url(socialKey(entry)));

    return {
      id,
      collection,
      width,
      height,
      alt: override?.alt ?? name,
      title: name,
      caption: override?.caption,
      featured: override?.featured === true,
      kind: override?.video ? "video" : "photo",
      src: sized(fit[fallbackIndex(fit.length)] ?? width),
      srcSet: fit.map((w) => `${sized(w)} ${w}w`).join(", "),
      full: sized(fit.at(-1) ?? width),
      thumb: sized(thumbWidth(entry)),
      ...(override?.video ? { video: publicPath(override.video), poster: override.poster ?? 0 } : {}),
    };
  });

  const slugs = [...new Set(photos.map((p) => p.collection))].filter(Boolean);

  const collections = slugs
    .map((slug) => {
      const m = meta.get(slug);
      const own = photos.filter((p) => p.collection === slug);
      const coverFile = m?.cover;
      const chosen = coverFile ? own.find((p) => p.id === photoId(slug, coverFile)) : undefined;
      const cover = chosen ?? own[0];
      const card = cover && social.photos.get(cover.id);
      if (card) social.collections.set(slug, card);
      return {
        order: m?.order ?? 0,
        collection: {
          key: slug,
          name: m?.title ?? humanise(slug),
          year: m?.year ?? "",
          countLabel: frames(own.length),
          cover: cover ? { src: cover.src, srcSet: cover.srcSet, sizes: COVER_SIZES } : null,
        } satisfies Collection,
      };
    })
    .sort((a, b) => a.order - b.order || a.collection.name.localeCompare(b.collection.name))
    .map((o) => o.collection);

  const rank = new Map(collections.map((c, i) => [c.key, i]));
  photos.sort(
    (a, b) =>
      (rank.get(a.collection) ?? -1) - (rank.get(b.collection) ?? -1) ||
      a.id.localeCompare(b.id, undefined, { numeric: true }),
  );

  return { photos, collections, social };
}
