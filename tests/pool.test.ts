import { describe, expect, it } from "vitest";
import { embedPool, GRID_BATCH, gridLimitFor, poolFor, stepDirection } from "../src/core/pool";
import type { Photo } from "../src/core/types";

const photo = (id: string, collection: string, featured = false) => ({ id, collection, featured }) as Photo;

const book = [photo("loose", ""), photo("a/1", "a", true), photo("a/2", "a"), photo("b/1", "b")];

describe("poolFor", () => {
  it("returns the whole book for all and for an empty key", () => {
    expect(poolFor(book, "all")).toBe(book);
    expect(poolFor(book, "")).toBe(book);
  });

  it("filters to a collection", () => {
    expect(poolFor(book, "a").map((p) => p.id)).toEqual(["a/1", "a/2"]);
  });

  it("filters to featured, staying empty rather than falling back", () => {
    expect(poolFor(book, "featured").map((p) => p.id)).toEqual(["a/1"]);
    expect(poolFor([photo("x", "")], "featured")).toEqual([]);
  });

  it("degrades an unknown collection to the full book", () => {
    expect(poolFor(book, "renamed")).toBe(book);
  });
});

describe("gridLimitFor", () => {
  it("rounds up to whole batches that include the open photo", () => {
    expect(gridLimitFor(null)).toBe(48);
    expect(gridLimitFor(0)).toBe(48);
    expect(gridLimitFor(47)).toBe(48);
    expect(gridLimitFor(48)).toBe(96);
  });
});

describe("embedPool", () => {
  const big = Array.from({ length: 200 }, (_, i) => photo(`p${i}`, ""));

  it("keeps a small pool whole", () => {
    expect(embedPool(book)).toEqual(book);
  });

  it("caps a large pool at one batch", () => {
    expect(embedPool(big)).toEqual(big.slice(0, GRID_BATCH));
  });

  it("adds the open photo and its neighbours, in pool order", () => {
    const ids = embedPool(big, "p100").map((p) => p.id);
    expect(ids).toHaveLength(GRID_BATCH + 5);
    expect(ids.slice(-5)).toEqual(["p98", "p99", "p100", "p101", "p102"]);
  });

  it("wraps neighbours round the ends", () => {
    const ids = embedPool(big, "p199").map((p) => p.id);
    expect(ids).toContain("p197");
    expect(ids).toContain("p198");
    expect(ids).toContain("p199");
  });

  it("ignores an id outside the pool", () => {
    expect(embedPool(big, "nope")).toHaveLength(GRID_BATCH);
  });
});

describe("stepDirection", () => {
  it("reads adjacent moves, including the wrap, as single steps", () => {
    expect(stepDirection(3, 4, 10)).toBe(1);
    expect(stepDirection(4, 3, 10)).toBe(-1);
    expect(stepDirection(9, 0, 10)).toBe(1);
    expect(stepDirection(0, 9, 10)).toBe(-1);
  });

  it("reads jumps by position", () => {
    expect(stepDirection(2, 7, 10)).toBe(1);
    expect(stepDirection(7, 2, 10)).toBe(-1);
  });
});
