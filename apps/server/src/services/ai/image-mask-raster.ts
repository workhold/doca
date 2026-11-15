import sharp from "sharp";
import type { EditRegions } from "./image-edit-regions.js";

/** Preserve the existing mask recipe's SVG alpha >= 128 raster rule. */
export async function rasterizeMaskRegions(
  input: EditRegions | [],
  width: number,
  height: number,
) {
  if (!input.length) return Buffer.alloc(width * height);
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${input.map((region) => `<polygon fill="white" points="${region.points.map(([x, y]) => `${x * width},${y * height}`).join(" ")}"/>`).join("")}</svg>`,
  );
  const alpha = await sharp(svg, { limitInputPixels: 25_000_000 })
    .ensureAlpha()
    .extractChannel(3)
    .raw()
    .toBuffer();
  for (let i = 0; i < alpha.length; i++) alpha[i] = alpha[i]! >= 128 ? 255 : 0;
  return alpha;
}
