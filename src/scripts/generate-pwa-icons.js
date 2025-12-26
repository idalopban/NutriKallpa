/**
 * PWA Icon Generator Script
 * 
 * This script uses the sharp library to generate all PWA icon sizes
 * from a single 512x512 source image.
 * 
 * Usage:
 *   1. npm install sharp (if not installed)
 *   2. node src/scripts/generate-pwa-icons.js
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ICON_SIZES = [72, 96, 128, 144, 152, 192, 384];
const SOURCE_ICON = path.join(process.cwd(), 'public/icons/icon-512.png');
const OUTPUT_DIR = path.join(process.cwd(), 'public/icons');

async function generateIcons() {
    // Ensure output directory exists
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    console.log('📱 Generating PWA icons...\n');

    for (const size of ICON_SIZES) {
        const outputPath = path.join(OUTPUT_DIR, `icon-${size}.png`);

        try {
            await sharp(SOURCE_ICON)
                .resize(size, size, {
                    fit: 'contain',
                    background: { r: 16, g: 185, b: 129, alpha: 1 } // Emerald green
                })
                .png()
                .toFile(outputPath);

            console.log(`  ✅ Generated icon-${size}.png`);
        } catch (error) {
            console.error(`  ❌ Failed to generate icon-${size}.png:`, error.message);
        }
    }

    console.log('\n🎉 Done! Icons generated in public/icons/');
}

generateIcons().catch(console.error);
