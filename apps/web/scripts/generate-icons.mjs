import sharp from 'sharp';
import { readFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const iconsDir = join(publicDir, 'icons');

// Ensure icons directory exists
if (!existsSync(iconsDir)) {
  mkdirSync(iconsDir, { recursive: true });
}

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const svgPath = join(publicDir, 'logo_icon.svg');
const svgBuffer = readFileSync(svgPath);

console.log('Generating PWA icons from logo_icon.svg...');

for (const size of sizes) {
  const outputPath = join(iconsDir, `icon-${size}x${size}.png`);

  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outputPath);

  console.log(`  Created: icon-${size}x${size}.png`);
}

console.log('Done! All icons generated.');
