const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const SVG_PATH = path.join(__dirname, '..', 'public', 'logo', 'bb-icon.svg');
const RES_DIR = path.join(__dirname, '..', 'android', 'app', 'src', 'main', 'res');

const ICON_SIZES = {
  'mipmap-mdpi': { launcher: 48, foreground: 48, round: 72 },
  'mipmap-hdpi': { launcher: 72, foreground: 72, round: 108 },
  'mipmap-xhdpi': { launcher: 96, foreground: 96, round: 144 },
  'mipmap-xxhdpi': { launcher: 144, foreground: 144, round: 216 },
  'mipmap-xxxhdpi': { launcher: 192, foreground: 192, round: 288 },
};

// Adaptive icon foreground padding (Android requires 72dp safe zone in 108dp canvas)
const FOREGROUND_SIZES = {
  'mipmap-mdpi': 108,
  'mipmap-hdpi': 162,
  'mipmap-xhdpi': 216,
  'mipmap-xxhdpi': 324,
  'mipmap-xxxhdpi': 432,
};

async function generateIcons() {
  const svgBuffer = fs.readFileSync(SVG_PATH);

  for (const [folder, sizes] of Object.entries(ICON_SIZES)) {
    const dir = path.join(RES_DIR, folder);
    fs.mkdirSync(dir, { recursive: true });

    // ic_launcher.png — square icon
    await sharp(svgBuffer)
      .resize(sizes.launcher, sizes.launcher, { fit: 'contain', background: { r: 37, g: 99, b: 235, alpha: 1 } })
      .png()
      .toFile(path.join(dir, 'ic_launcher.png'));
    console.log(`${folder}/ic_launcher.png (${sizes.launcher}x${sizes.launcher})`);

    // ic_launcher_round.png — circular icon
    const roundSize = sizes.round;
    const innerSize = Math.round(roundSize * 0.72);
    const padding = Math.round((roundSize - innerSize) / 2);

    const resizedIcon = await sharp(svgBuffer)
      .resize(innerSize, innerSize, { fit: 'contain', background: { r: 37, g: 99, b: 235, alpha: 1 } })
      .toBuffer();

    // Create round icon: blue circle background + icon
    const roundCanvas = sharp({
      create: {
        width: roundSize,
        height: roundSize,
        channels: 4,
        background: { r: 37, g: 99, b: 235, alpha: 1 },
      },
    });

    await roundCanvas
      .composite([{ input: resizedIcon, top: padding, left: padding }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_round.png'));
    console.log(`${folder}/ic_launcher_round.png (${roundSize}x${roundSize})`);

    // ic_launcher_foreground.png — adaptive icon foreground (with safe zone padding)
    const fgSize = FOREGROUND_SIZES[folder];
    const fgIconSize = Math.round(fgSize * 0.72);
    const fgPadding = Math.round((fgSize - fgIconSize) / 2);

    const fgIcon = await sharp(svgBuffer)
      .resize(fgIconSize, fgIconSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();

    await sharp({
      create: {
        width: fgSize,
        height: fgSize,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite([{ input: fgIcon, top: fgPadding, left: fgPadding }])
      .png()
      .toFile(path.join(dir, 'ic_launcher_foreground.png'));
    console.log(`${folder}/ic_launcher_foreground.png (${fgSize}x${fgSize})`);
  }

  console.log('\nAll Android icons generated!');
}

generateIcons().catch(console.error);
