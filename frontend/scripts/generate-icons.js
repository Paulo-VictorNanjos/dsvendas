const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [16, 32, 48, 64, 192, 512];
const inputSvg = path.join(__dirname, '../public/images/logo.svg');
const outputDir = path.join(__dirname, '../public');

async function generateIcons() {
  try {
    // Lê o arquivo SVG existente
    const svgBuffer = fs.readFileSync(inputSvg);

    // Gera PNG para cada tamanho
    for (const size of sizes) {
      await sharp(svgBuffer)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(path.join(outputDir, `logo${size}.png`));
      
      console.log(`Generated ${size}x${size} icon`);
    }

    // Gera o favicon.ico (usando o PNG de 16x16)
    await sharp(svgBuffer)
      .resize(16, 16, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(path.join(outputDir, 'favicon.png'));

    // Renomeia o arquivo para .ico
    fs.renameSync(
      path.join(outputDir, 'favicon.png'),
      path.join(outputDir, 'favicon.ico')
    );

    console.log('Generated favicon.ico');
    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
  }
}

generateIcons(); 