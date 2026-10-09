import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, '../client/public');
const iconPath = path.join(publicDir, 'logo-icon.png');

async function makeFavicons() {
  const iconBuffer = await sharp(iconPath)
    .resize(128, 128, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp(iconBuffer).resize(32, 32).toFile(path.join(publicDir, 'favicon-32x32.png'));
  await sharp(iconBuffer).resize(48, 48).toFile(path.join(publicDir, 'favicon-48x48.png'));
  await sharp(iconBuffer)
    .resize(192, 192, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(path.join(publicDir, 'favicon.png'));
  await sharp(iconBuffer)
    .resize(180, 180, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  fs.copyFileSync(path.join(publicDir, 'favicon-48x48.png'), path.join(publicDir, 'favicon.ico'));

  const base64Png = iconBuffer.toString('base64');
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
  <image href="data:image/png;base64,${base64Png}" width="128" height="128" />
</svg>
`;
  fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent, 'utf-8');

  console.log('Favicons generated successfully!');
}

makeFavicons().catch((err) => console.error(err));
