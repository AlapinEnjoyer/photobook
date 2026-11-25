import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const photoOverride = z.object({
  file: z.string(),
  alt: z.string().optional(),
  caption: z.string().optional(),
  featured: z.boolean().optional(),
  video: z.string().optional(),
  poster: z.number().optional(),
});

const collectionMeta = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/collections" }),
  schema: z.object({
    title: z.string(),
    year: z.string().optional(),
    order: z.number().default(0),
    cover: z.string().optional(),
    photos: z.array(photoOverride).default([]),
  }),
});

const loosePhotos = defineCollection({
  loader: glob({ pattern: "photos.md", base: "./src/content" }),
  schema: z.object({
    photos: z.array(photoOverride).default([]),
  }),
});

const about = defineCollection({
  loader: glob({ pattern: "about.md", base: "./src/content" }),
  schema: z.object({
    title: z.string().optional(),
  }),
});

export const collections = { collections: collectionMeta, photos: loosePhotos, about };
