const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];
const svgPath = path.join(__dirname, '../public/icon.svg');
const outputDir = path.join(__dirname, '../public');

async function generateIcons() {
  const svgBuffer = fs.readFileSync(svgPath);
  
  console.log('🎨 Generating PWA icons from icon.svg...\n');
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}.png`);
    
    try {
      await sharp(svgBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 30, g: 58, b: 95, alpha: 1 } // nocturne-deep color
        })
        .png({ quality: 90, compressionLevel: 9 })
        .toFile(outputPath);
      
      console.log(`✅ Generated icon-${size}.png`);
    } catch (error) {
      console.error(`❌ Failed to generate icon-${size}.png:`, error.message);
    }
  }
  
  // Apple touch icon (special case)
  const appleTouchPath = path.join(outputDir, 'apple-icon-180.png');
  try {
    await sharp(svgBuffer)
      .resize(180, 180, {
        fit: 'contain',
        background: { r: 30, g: 58, b: 95, alpha: 1 }
      })
      .png({ quality: 90, compressionLevel: 9 })
      .toFile(appleTouchPath);
    
    console.log(`✅ Generated apple-icon-180.png`);
  } catch (error) {
    console.error(`❌ Failed to generate apple-icon-180.png:`, error.message);
  }
  
  console.log('\n🎉 All PWA icons generated successfully!');
  console.log('📱 Your Nocturne PWA is now ready for installation!');
}

if (require.main === module) {
  generateIcons().catch(console.error);
}

module.exports = { generateIcons };