import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";

const sourceRoot = "/Users/toyguntez/Visual Studio /ETHGlobal-Tokyo/assets";
const publicRoot = path.resolve(process.cwd(), "public/assets");

const assets = [
  { output: "brand/logo-lockup-dark.webp", source: "coffer_logo.png", minWidth: 256 },
  {
    output: "brand/app-icon-dark.webp",
    source: "coffer_app_icon_dark_2048.png",
    minWidth: 256,
  },
  { output: "hero/hero-fuji.webp", source: "asset2.png", minWidth: 900 },
  {
    output: "sections/mandate.webp",
    source: "Treasury Architecture.png",
    minWidth: 900,
  },
  { output: "sections/privacy.webp", source: "asset9.png", minWidth: 900 },
  {
    output: "sections/authorization.webp",
    source: "asset7.png",
    minWidth: 900,
  },
  { output: "sections/audit.webp", source: "asset13.png", minWidth: 900 },
  {
    output: "textures/flow.webp",
    source: "abstract flow texture.png",
    minWidth: 900,
  },
  {
    output: "textures/closing-landscape.webp",
    source: "cards-full.png",
    minWidth: 900,
  },
] as const;

describe("normalized Coffer assets", () => {
  for (const asset of assets) {
    it(`${asset.output} is an optimized WebP with sufficient resolution`, async () => {
      const outputPath = path.join(publicRoot, asset.output);
      const sourcePath = path.join(sourceRoot, asset.source);
      const [header, outputStats, sourceStats, metadata] = await Promise.all([
        readFile(outputPath).then((data) => data.subarray(0, 12)),
        stat(outputPath),
        stat(sourcePath),
        sharp(outputPath).metadata(),
      ]);

      expect(header.subarray(0, 4).toString("ascii")).toBe("RIFF");
      expect(header.subarray(8, 12).toString("ascii")).toBe("WEBP");
      expect(metadata.format).toBe("webp");
      expect(metadata.width).toBeGreaterThanOrEqual(asset.minWidth);
      expect(outputStats.size).toBeLessThan(sourceStats.size);
    });
  }
});
