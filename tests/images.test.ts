import { describe, expect, it } from "vitest";
import { fallbackIndex, widthsFor } from "../src/core/images";

describe("images", () => {
  it("never upscales and falls back to the source width", () => {
    expect(widthsFor(1000, [480, 800, 1200])).toEqual([480, 800]);
    expect(widthsFor(300, [480, 800])).toEqual([300]);
    expect(widthsFor(800, [480, 480, 800])).toEqual([480, 800]);
  });

  it("picks a middling fallback", () => {
    expect(fallbackIndex(1)).toBe(0);
    expect(fallbackIndex(6)).toBe(2);
    expect(fallbackIndex(0)).toBe(0);
  });
});
