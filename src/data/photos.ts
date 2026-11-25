import { getCollection } from "astro:content";
import config from "../../photobook.config";
import manifest from "../../photos.manifest.json";
import { frames } from "../core/names";
import type { Category, Collection, Photo } from "../core/types";
import { assemble, type Book, imageBase, type Meta } from "./assemble";

async function loadMeta(): Promise<Map<string, Meta>> {
  const [entries, loose] = await Promise.all([getCollection("collections"), getCollection("photos")]);
  const meta = new Map<string, Meta>();
  for (const entry of entries) {
    if (entry.id.includes("/")) {
      throw new Error(
        `[photobook] collection metadata must be one level deep: src/content/collections/${entry.id}.md`,
      );
    }
    meta.set(entry.id, entry.data);
  }
  for (const entry of loose) meta.set("", { order: 0, photos: entry.data.photos });
  return meta;
}

let book: Promise<Book> | null = null;

async function buildBook(): Promise<Book> {
  const meta = await loadMeta();
  return assemble(manifest, meta, { imageBase: imageBase(config.source), images: config.images });
}

function load(): Promise<Book> {
  // Only cache across pages during static production builds so dev content edits reload immediately.
  if (!import.meta.env.PROD) return buildBook();
  book ??= buildBook().catch((err) => {
    book = null;
    throw err;
  });
  return book;
}

export async function getPhotos(): Promise<Photo[]> {
  return (await load()).photos;
}

export async function getCollections(): Promise<Collection[]> {
  return (await load()).collections;
}

export async function getSocialImages(): Promise<Book["social"]> {
  return (await load()).social;
}

export async function getCategories(): Promise<Category[]> {
  const { photos, collections } = await load();

  const entries: Category[] = [{ key: "all", label: "all", countLabel: frames(photos.length) }];

  const featured = photos.filter((p) => p.featured).length;
  if (featured) entries.push({ key: "featured", label: "featured", countLabel: frames(featured) });

  if (collections.length) {
    entries.push({
      key: "collections",
      label: "collections",
      countLabel: `${collections.length} ${collections.length === 1 ? "collection" : "collections"}`,
    });
  }

  if ((await getCollection("about")).length) entries.push({ key: "about", label: "about" });

  return entries;
}
