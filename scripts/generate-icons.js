/* Generates app icons and notification icon from IsotipoVector.svg.
 * Run: node scripts/generate-icons.js
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');
const SVG_PATH = path.join(ASSETS, 'IsotipoVector.svg');
const rawSvg = fs.readFileSync(SVG_PATH, 'utf8');

const BRAND_BLUE = '#2563EB';
const BG_LIGHT = '#F0F6FF';

function svgWithFill(fill) {
  return rawSvg.replace(/fill="#[A-Fa-f0-9]+"/g, `fill="${fill}"`);
}

async function buildSquareIcon(svgFill, bgColor, outFile, size, logoFraction) {
  const svg = svgWithFill(svgFill);
  const logoSize = Math.round(size * logoFraction);

  const renderedLogo = await sharp(Buffer.from(svg))
    .resize({ width: logoSize, height: logoSize, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bgColor,
    },
  })
    .composite([{ input: renderedLogo, gravity: 'center' }])
    .png()
    .toFile(outFile);

  console.log(`✔ ${path.relative(ASSETS, outFile)}`);
}

async function buildNotificationIcon(outFile, size) {
  // Android notification icon: white silhouette on transparent.
  const svg = svgWithFill('#ffffff');

  await sharp(Buffer.from(svg))
    .resize({ width: size, height: size, fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(outFile);

  console.log(`✔ ${path.relative(ASSETS, outFile)}`);
}

(async () => {
  await buildSquareIcon(BRAND_BLUE, BG_LIGHT, path.join(ASSETS, 'icon.png'), 1024, 0.6);
  await buildSquareIcon(BRAND_BLUE, BG_LIGHT, path.join(ASSETS, 'adaptive-icon.png'), 1024, 0.55);
  await buildSquareIcon(BRAND_BLUE, BG_LIGHT, path.join(ASSETS, 'splash-icon.png'), 1024, 0.45);
  await buildSquareIcon(BRAND_BLUE, '#ffffff', path.join(ASSETS, 'favicon.png'), 64, 0.7);
  await buildNotificationIcon(path.join(ASSETS, 'notification-icon.png'), 96);
  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
