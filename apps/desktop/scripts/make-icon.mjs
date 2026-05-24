import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const assetsDir = path.join(__dirname, "..", "assets");
const sourcePath = path.join(assetsDir, "icon.png");
const squarePath = path.join(assetsDir, "icon-square.png");
const icoPath = path.join(assetsDir, "icon.ico");

const meta = await sharp(sourcePath).metadata();
const size = Math.max(meta.width ?? 512, meta.height ?? 512, 512);

await sharp(sourcePath)
  .resize(size, size, { fit: "contain", background: { r: 30, g: 64, b: 175, alpha: 1 } })
  .png()
  .toFile(squarePath);

const ico = await pngToIco(squarePath);
fs.writeFileSync(icoPath, ico);
console.log(`Created ${icoPath} (${ico.length} bytes)`);
