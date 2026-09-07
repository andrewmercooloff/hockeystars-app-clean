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

const { execFileSync } = require('child_process');

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.svg': 'image/svg+xml' };
const HEIC_EXT = new Set(['.heic', '.heif']);

// iPhone HEIC files: sharp's bundled libheif has no HEVC decoder, so convert via pillow-heif
// (`pip install pillow pillow-heif`) into a cached JPEG first.
function heicToJpeg(srcPath, cacheDir) {
  const stat = fs.statSync(srcPath);
  const key = crypto.createHash('md5').update(`${srcPath}|${stat.size}|${stat.mtimeMs}`).digest('hex').slice(0, 12);
  const outPath = path.join(cacheDir, `${path.basename(srcPath, path.extname(srcPath))}-${key}-heic.jpg`);
  if (!fs.existsSync(outPath)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    const script = [
      'import sys',
      'from PIL import Image, ImageOps',
      'import pillow_heif',
      'pillow_heif.register_heif_opener()',
      'im = ImageOps.exif_transpose(Image.open(sys.argv[1])).convert("RGB")',
      'im.save(sys.argv[2], "JPEG", quality=95)',
    ].join('\n');
    try {
      execFileSync('python3', ['-c', script, srcPath, outPath], { stdio: 'pipe' });
    } catch (e) {
      throw new Error(`Не удалось прочитать HEIC ${srcPath}. Установите: pip install pillow pillow-heif\n${e.stderr?.toString() || e.message}`);
    }
  }
  return outPath;
}

function fileUrl(p) {
  return pathToFileURL(p).href;
}

function dataUri(filePath) {
  const mime = MIME[path.extname(filePath).toLowerCase()] || 'application/octet-stream';
  return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`;
}

// Vector logos usually arrive as PDF: rasterize page 1 with transparency at high resolution (PyMuPDF).
function pdfToPng(srcPath, cacheDir, maxPx) {
  const stat = fs.statSync(srcPath);
  const key = crypto.createHash('md5').update(`${srcPath}|${stat.size}|${stat.mtimeMs}|${maxPx}`).digest('hex').slice(0, 12);
  const outPath = path.join(cacheDir, `${path.basename(srcPath, '.pdf')}-${key}-pdf.png`);
  if (!fs.existsSync(outPath)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    const script = [
      'import sys, pymupdf',
      'doc = pymupdf.open(sys.argv[1]); page = doc[0]',
      'rect = page.rect; scale = float(sys.argv[3]) / max(rect.width, rect.height)',
      'pix = page.get_pixmap(matrix=pymupdf.Matrix(scale, scale), alpha=True)',
      'pix.save(sys.argv[2])',
    ].join('\n');
    try {
      execFileSync('python3', ['-c', script, srcPath, outPath, String(maxPx)], { stdio: 'pipe' });
    } catch (e) {
      throw new Error(`Не удалось растеризовать PDF ${srcPath}. Установите: pip install pymupdf\n${e.stderr?.toString() || e.message}`);
    }
  }
  return outPath;
}

/**
 * Downscale an image for print (default 1600 px on the long side ≈ 500 dpi for a 77 mm card)
 * and cache the result. Returns a file:// URL that Chrome can load directly.
 * PNG/SVG keep their format (transparency); everything else becomes high-quality JPEG.
 */
async function prepareImage(srcPath, cacheDir, maxPx = 1600) {
  let ext = path.extname(srcPath).toLowerCase();
  if (HEIC_EXT.has(ext)) {
    srcPath = heicToJpeg(srcPath, cacheDir);
    ext = '.jpg';
  } else if (ext === '.pdf') {
    srcPath = pdfToPng(srcPath, cacheDir, Math.max(maxPx, 2000));
    ext = '.png';
  }
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
