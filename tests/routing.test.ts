import { describe, expect, it } from "vitest";
import {
  catalogPath,
  categoryView,
  collectionPath,
  parsePath,
  photoPath,
  poolView,
  publicPath,
  viewPath,
  viewTitle,
} from "../src/core/routes";
import type { Collection, Photo } from "../src/core/types";

describe("path builders", () => {
  it("builds the app's URLs with trailing slashes", () => {
    expect(collectionPath("low-tide")).toBe("/collections/low-tide/");
    expect(catalogPath()).toBe("/catalog.json");
  });

  it("keeps the slash between a photo's collection and file, encoding each segment", () => {
    expect(photoPath("northbound/01-lenticular")).toBe("/photos/northbound/01-lenticular/");
    expect(photoPath("a b/c&d")).toBe("/photos/a%20b/c%26d/");
  });

  it("leaves absolute URLs alone and roots everything else", () => {
    expect(publicPath("https://cdn.example.com/a.mp4")).toBe("https://cdn.example.com/a.mp4");
    expect(publicPath("//cdn.example.com/a.mp4")).toBe("//cdn.example.com/a.mp4");
    expect(publicPath("video/a.mp4")).toBe("/video/a.mp4");
    expect(publicPath("/video/a.mp4")).toBe("/video/a.mp4");
  });
});

describe("parsePath", () => {
  it.each([
    ["/", { kind: "root" }],
    ["/collections/", { kind: "collections" }],
    ["/collections/low-tide/", { kind: "collection", key: "low-tide" }],
    ["/about/", { kind: "about" }],
    ["/featured/", { kind: "featured" }],
    ["/photos/northbound/01-lenticular/", { kind: "photo", id: "northbound/01-lenticular" }],
    ["/photos/blue-hour/", { kind: "photo", id: "blue-hour" }],
    ["/photos/", { kind: "unknown" }],
    ["/collections/low-tide/extra/", { kind: "unknown" }],
    ["/nope/", { kind: "unknown" }],
    ["/about/extra/", { kind: "unknown" }],
    ["/%E0%A4%A/", { kind: "unknown" }],
  ])("%s", (path, view) => {
    expect(parsePath(path)).toEqual(view);
  });

  it("round-trips ids that need encoding", () => {
    expect(parsePath(photoPath("a b/c&d"))).toEqual({ kind: "photo", id: "a b/c&d" });
  });

  it("enforces subpath base boundaries", () => {
    expect(parsePath("/repo", "/repo")).toEqual({ kind: "root" });
    expect(parsePath("/repo/", "/repo")).toEqual({ kind: "root" });
    expect(parsePath("/repo/collections/north/", "/repo")).toEqual({ kind: "collection", key: "north" });
    expect(parsePath("/about/", "/repo")).toEqual({ kind: "unknown" });
    expect(parsePath("/repo-other/", "/repo")).toEqual({ kind: "unknown" });
  });
});

describe("viewTitle", () => {
  const collections = [{ key: "north", name: "northbound" }] as Collection[];
  const photos = [
    { id: "loose", collection: "", title: "Loose" },
    { id: "north/01-tide", collection: "north", title: "Tide" },
  ] as Photo[];

  it("matches server-rendered page titles", () => {
    expect(viewTitle({ kind: "root" }, "Photobook", collections, photos)).toBe("Photobook");
    expect(viewTitle({ kind: "featured" }, "Photobook", collections, photos)).toBe("Featured | Photobook");
    expect(viewTitle({ kind: "collections" }, "Photobook", collections, photos)).toBe(
      "Collections | Photobook",
    );
    expect(viewTitle({ kind: "about" }, "Photobook", collections, photos)).toBe("About | Photobook");
    expect(viewTitle({ kind: "collection", key: "north" }, "Photobook", collections, photos)).toBe(
      "northbound | Photobook",
    );
    expect(viewTitle({ kind: "photo", id: "north/01-tide" }, "Photobook", collections, photos)).toBe(
      "Tide | northbound | Photobook",
    );
    expect(viewTitle({ kind: "photo", id: "loose" }, "Photobook", collections, photos)).toBe(
      "Loose | Photobook",
    );
  });
});

describe("views", () => {
  it.each([
    ["/", { kind: "root" }],
    ["/featured/", { kind: "featured" }],
    ["/collections/", { kind: "collections" }],
    ["/collections/a/", { kind: "collection", key: "a" }],
    ["/about/", { kind: "about" }],
    ["/photos/a/1/", { kind: "photo", id: "a/1" }],
  ] as const)("%s round-trips through parsePath", (path, view) => {
    expect(viewPath(view)).toBe(path);
    expect(parsePath(path)).toEqual(view);
  });

  it("maps pool keys back to their grid", () => {
    expect(poolView("all")).toEqual({ kind: "root" });
    expect(poolView("featured")).toEqual({ kind: "featured" });
    expect(poolView("north")).toEqual({ kind: "collection", key: "north" });
  });

  it("sends menu entries to their screen or their grid", () => {
    expect(categoryView("all")).toEqual({ kind: "root" });
    expect(categoryView("featured")).toEqual({ kind: "featured" });
    expect(categoryView("collections")).toEqual({ kind: "collections" });
    expect(categoryView("about")).toEqual({ kind: "about" });
  });
});
