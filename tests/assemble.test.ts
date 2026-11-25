import { describe, expect, it, vi } from "vitest";
import type { ManifestEntry } from "../src/core/images";
import { assemble, imageBase, type Meta } from "../src/data/assemble";

const entry = (collection: string, file: string, width = 2000, height = 1000): ManifestEntry => ({
  collection,
  file,
  width,
  height,
  hash: "abcd1234",
});

const images = { widths: [480, 1200, 3840], format: "webp" as const };
const build = (entries: ManifestEntry[], meta = new Map<string, Meta>(), warn = vi.fn()) =>
  assemble(entries, meta, { imageBase: "/img", images, warn });

describe("assemble", () => {
  it("builds variant URLs from the manifest, never past the source width", () => {
    const [photo] = build([entry("north", "01-tide.jpg")]).photos;
    expect(photo).toMatchObject({
      id: "north/01-tide",
      title: "Tide",
      alt: "Tide",
      kind: "photo",
      src: "/img/north/01-tide-abcd1234-480w.webp",
      full: "/img/north/01-tide-abcd1234-1200w.webp",
      thumb: "/img/north/01-tide-abcd1234-200w.webp",
    });
    expect(photo?.srcSet).toBe(
      "/img/north/01-tide-abcd1234-480w.webp 480w, /img/north/01-tide-abcd1234-1200w.webp 1200w",
    );
  });

  it("encodes URL segments so a space can't split a srcset", () => {
    const [photo] = build([entry("", "blue hour.jpg")]).photos;
    expect(photo?.src).toBe("/img/blue%20hour-abcd1234-480w.webp");
  });

  it("layers overrides, including video", () => {
    const meta = new Map<string, Meta>([
      [
        "north",
        {
          order: 0,
          photos: [
            { file: "a.jpg", alt: "Alt", featured: true, caption: "Cap", video: "video/a.mp4", poster: 2 },
          ],
        },
      ],
    ]);
    expect(build([entry("north", "a.jpg")], meta).photos[0]).toMatchObject({
      alt: "Alt",
      featured: true,
      caption: "Cap",
      kind: "video",
      video: "/video/a.mp4",
      poster: 2,
    });
  });

  it("orders loose photos first, then collections by order then name", () => {
    const meta = new Map<string, Meta>([
      ["b", { order: 1, photos: [] }],
      ["c", { order: 2, photos: [] }],
    ]);
    const { photos, collections } = build(
      [
        entry("c", "1.jpg"),
        entry("", "z.jpg"),
        entry("b", "10.jpg"),
        entry("b", "2.jpg"),
        entry("a", "1.jpg"),
      ],
      meta,
    );
    expect(collections.map((c) => c.key)).toEqual(["a", "b", "c"]);
    expect(photos.map((p) => p.id)).toEqual(["z", "a/1", "b/2", "b/10", "c/1"]);
  });

  it("uses the named cover, and falls back with a warning when it's gone", () => {
    const warn = vi.fn();
    const meta = new Map<string, Meta>([["a", { order: 0, cover: "2.jpg", photos: [] }]]);
    const entries = [entry("a", "1.jpg"), entry("a", "2.jpg")];
    expect(build(entries, meta, warn).collections[0]?.cover?.src).toContain("/a/2-");
    expect(warn).not.toHaveBeenCalled();

    const missing = new Map<string, Meta>([["a", { order: 0, cover: "9.jpg", photos: [{ file: "8.jpg" }] }]]);
    expect(build(entries, missing, warn).collections[0]?.cover?.src).toContain("/a/1-");
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("keeps a link card per photo and collection cover", () => {
    const { social } = build([entry("a", "1.jpg")]);
    expect(social.photos.get("a/1")).toBe("/img/a/1-abcd1234-og.jpg");
    expect(social.collections.get("a")).toBe("/img/a/1-abcd1234-og.jpg");
  });

  it("rejects reserved names and ids that collide", () => {
    expect(() => build([entry("about", "1.jpg")])).toThrow(/reserved/);
    expect(() => build([entry("", "a.jpg"), entry("", "a.png")])).toThrow(/both claim/);
    expect(() => build([], new Map([["featured", { order: 0, photos: [] }]]))).toThrow(/reserved/);
  });
});

describe("imageBase", () => {
  it("uses the site route locally and the bucket remotely", () => {
    expect(imageBase({ kind: "local" })).toBe("/img");
    expect(imageBase({ kind: "remote", base: "https://cdn.example.com" })).toBe("https://cdn.example.com");
  });

  it("refuses an empty bucket", () => {
    expect(() => imageBase({ kind: "remote", base: "" })).toThrow(/source.base is empty/);
  });
});
