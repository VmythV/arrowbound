import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { VISUAL_ASSETS } from "../game/config/asset-manifest";

describe("visual asset manifest", () => {
  it("points only to standalone, safe SVG files with view boxes", () => {
    for (const asset of VISUAL_ASSETS) {
      expect(asset.path.endsWith(".svg"), asset.key).toBe(true);
      const file = resolve(process.cwd(), "public", asset.path.replace(/^\//, ""));
      const svg = readFileSync(file, "utf8");
      expect(svg, asset.key).toMatch(/^<svg[^>]+viewBox=/);
      expect(svg, asset.key).not.toMatch(/<script|<image|(?:href|src)=["'](?:data:|https?:\/\/)/i);
    }
  });

  it("uses unique keys and paths", () => {
    expect(new Set(VISUAL_ASSETS.map((asset) => asset.key)).size).toBe(VISUAL_ASSETS.length);
    expect(new Set(VISUAL_ASSETS.map((asset) => asset.path)).size).toBe(VISUAL_ASSETS.length);
  });
});
