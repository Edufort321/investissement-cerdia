const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function convertSvgToPng() {
  console.log('🔄 Converting SVG assets to PNG...\n');

  // Ensure resources directory exists
  const resourcesDir = path.join(__dirname, 'resources');
  if (!fs.existsSync(resourcesDir)) {
    fs.mkdirSync(resourcesDir, { recursive: true });
  }

  try {
    // Convert icon.svg to icon.png (1024x1024)
    console.log('Converting icon.svg to icon.png (1024x1024px)...');
    await sharp(path.join(__dirname, 'public', 'icon.svg'))
      .resize(1024, 1024)
      .png()
      .toFile(path.join(resourcesDir, 'icon.png'));
    console.log('✅ icon.png created successfully\n');

    // Convert splash.svg to splash.png (2732x2732)
    console.log('Converting splash.svg to splash.png (2732x2732px)...');
    await sharp(path.join(__dirname, 'public', 'splash.svg'))
      .resize(2732, 2732)
      .png()
      .toFile(path.join(resourcesDir, 'splash.png'));
    console.log('✅ splash.png created successfully\n');

    console.log('✅ All assets converted successfully!');
    console.log('\nNext step: Run asset generation command:');
    console.log('npx @capacitor/assets generate --iconBackgroundColor \'#6366f1\' --splashBackgroundColor \'#6366f1\'');

  } catch (error) {
    console.error('❌ Error converting assets:', error);
    process.exit(1);
  }
}

convertSvgToPng();
