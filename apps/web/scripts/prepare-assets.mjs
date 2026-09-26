import { access, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const webRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceRoot = "/Users/toyguntez/Visual Studio /ETHGlobal-Tokyo/assets";
const outputRoot = path.join(webRoot, "public/assets");

const assets = [
  {
    source: "coffer_logo.png",
    output: "brand/logo-lockup-dark.webp",
    maxWidth: 1200,
  },
  {
    source: "coffer_app_icon_dark_2048.png",
    output: "brand/app-icon-dark.webp",
    maxWidth: 1200,
  },
  {
    source: "01_mountain_torii_halftone_regenerated_8K.png",
    output: "hero/hero-mountain.webp",
    maxWidth: 2880,
  },
  { source: "cards.png", output: "sections/control-cards.webp", maxWidth: 2200 },
  { source: "logo/seal logo .svg", output: "integrations/seal.webp", maxWidth: 256 },
  { source: "logo/walruslogo.png", output: "integrations/walrus.webp", maxWidth: 256 },
  {
    source: "Treasury Architecture.png",
    output: "sections/mandate.webp",
    maxWidth: 1800,
  },
  { source: "asset9.png", output: "sections/privacy.webp", maxWidth: 1800 },
  {
    source: "asset7.png",
    output: "sections/authorization.webp",
    maxWidth: 1800,
  },
  { source: "asset13.png", output: "sections/audit.webp", maxWidth: 1800 },
  {
    source: "abstract flow texture.png",
    output: "textures/flow.webp",
    maxWidth: 1800,
  },
  {
    source: "logobackground.png",
    output: "textures/closing-landscape.webp",
    maxWidth: 2400,
  },
];

for (const asset of assets) {
  const sourcePath = path.join(sourceRoot, asset.source);
  const outputPath = path.join(outputRoot, asset.output);

  try {
    await access(sourcePath);
  } catch {
    throw new Error(`Missing required Coffer source asset: ${sourcePath}`);
  }

  await mkdir(path.dirname(outputPath), { recursive: true });
  await sharp(sourcePath)
    .rotate()
    .resize({
      width: asset.maxWidth,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: 86, smartSubsample: true })
    .toFile(outputPath);

  process.stdout.write(`Prepared ${asset.output}\n`);
}
