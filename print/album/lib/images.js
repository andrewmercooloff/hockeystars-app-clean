const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL } = require('url');

let sharp = null;
try {
  sharp = require('sharp');
} catch {
  // sharp is optional: without it images are embedded as-is (large PDFs, but still correct).
}

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };

function fileUrl(p) {
  return pathToFileURL(p).href;
}

function dataUri(filePath) {
  const mime = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`;
}

/**
 * Downscale an image for print (default 1600 px on the long side ≈ 500 dpi for a 77 mm card)
 * and cache the result. Returns a file:// URL that Chrome can load directly.
 * PNG/SVG keep their format (transparency); everything else becomes high-quality JPEG.
 */
async function prepareImage(srcPath, cacheDir, maxPx = 1600) {
  const ext = path.extname(srcPath).toLowerCase();
  if (ext === '.svg' || !sharp) return fileUrl(srcPath);

  const stat = fs.statSync(srcPath);
  const key = crypto.createHash('md5').update(`${srcPath}|${stat.size}|${stat.mtimeMs}|${maxPx}`).digest('hex').slice(0, 12);
  const outExt = ext === '.png' ? '.png' : '.jpg';
  const outPath = path.join(cacheDir, `${path.basename(srcPath, ext)}-${key}${outExt}`);
  if (!fs.existsSync(outPath)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    let img = sharp(srcPath).rotate().resize({ width: maxPx, height: maxPx, fit: 'inside', withoutEnlargement: true });
    img = outExt === '.png' ? img.png({ compressionLevel: 9 }) : img.jpeg({ quality: 90, chromaSubsampling: '4:4:4' });
    await img.toFile(outPath);
  }
  return fileUrl(outPath);
}

module.exports = { prepareImage, fileUrl, dataUri };
