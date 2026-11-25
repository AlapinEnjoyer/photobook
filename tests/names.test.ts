import { describe, expect, it } from "vitest";
import {
  assertValidBook,
  assertValidCollection,
  frames,
  humanise,
  photoId,
  sortByName,
} from "../src/core/names";

describe("names", () => {
  it("humanises file and folder names", () => {
    expect(humanise("01-morning-tide.jpg")).toBe("Morning tide");
    expect(humanise("vol.2")).toBe("Vol.2");
    expect(humanise("")).toBe("");
  });

  it("sorts numerically", () => {
    expect(["10-a", "2-a"].sort(sortByName)).toEqual(["2-a", "10-a"]);
  });

  it("derives photo ids with and without a collection", () => {
    expect(photoId("", "a.b.jpg")).toBe("a.b");
    expect(photoId("vol.2", "a.jpg")).toBe("vol.2/a");
  });

  it("pluralises frames", () => {
    expect(frames(1)).toBe("1 frame");
    expect(frames(0)).toBe("0 frames");
  });

  it("rejects nested and reserved collections", () => {
    expect(() => assertValidCollection("vol.2")).not.toThrow();
    expect(() => assertValidCollection("a/b")).toThrow(/nested/);
    expect(() => assertValidCollection("about")).toThrow(/reserved/);
  });

  it("rejects two photos with the same id", () => {
    const photo = { collection: "c", file: "a.jpg" };
    expect(() => assertValidBook([photo, { collection: "", file: "a.jpg" }])).not.toThrow();
    expect(() => assertValidBook([photo, { collection: "c", file: "a.png" }])).toThrow(
      /c\/a\.jpg.*c\/a\.png/,
    );
  });
});
