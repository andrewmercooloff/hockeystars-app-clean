const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pathToFileURL, fileURLToPath } = require('url');

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
      // Logos usually sit on an oversized transparent page: trim to the artwork plus a small margin.
      'from PIL import Image',
      'im = Image.frombytes("RGBA", (pix.width, pix.height), pix.samples)',
      'box = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()',
      'if box:',
      '    pad = max(2, round(max(box[2] - box[0], box[3] - box[1]) * 0.02))',
      '    im = im.crop((max(0, box[0] - pad), max(0, box[1] - pad), min(im.width, box[2] + pad), min(im.height, box[3] + pad)))',
      'im.save(sys.argv[2], "PNG")',
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

// width / height of a prepared image (file:// URL or path); null when unknown.
async function imageAspect(urlOrPath) {
  if (!sharp || !urlOrPath) return null;
  try {
    const p = urlOrPath.startsWith('file://') ? fileURLToPath(urlOrPath) : urlOrPath;
    const m = await sharp(p).metadata();
    const swap = m.orientation >= 5;
    return swap ? m.height / m.width : m.width / m.height;
  } catch {
    return null;
  }
}

// Close-up for the card back: top `cropFrac` of the photo, alpha fade baked into the pixels (left / right / bottom)
// so no CSS masks or blend modes are needed — those get dropped by some PDF viewers (iOS Preview).
async function backCloseup(srcPath, cacheDir, cropFrac = 1, widthPx = 900, sideFade = true) {
  if (!sharp) return null;
  const stat = fs.statSync(srcPath);
  const key = crypto.createHash('md5').update(`${srcPath}|${stat.size}|${stat.mtimeMs}|back3|${cropFrac}|${widthPx}|${sideFade}`).digest('hex').slice(0, 12);
  const outPath = path.join(cacheDir, `${path.basename(srcPath, path.extname(srcPath))}-${key}-back.png`);
  if (!fs.existsSync(outPath)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    const base = sharp(srcPath).rotate();
    const m = await base.metadata();
    const swap = m.orientation >= 5;
    const W = swap ? m.height : m.width;
    const H = swap ? m.width : m.height;
    const cropH = Math.max(1, Math.round(Math.min(H, W * 1.15) * cropFrac));
    const outH = Math.round((cropH / W) * widthPx);
    const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${outH}">
      <defs>
        <linearGradient id="x" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="${sideFade ? 0 : 1}"/><stop offset=".18" stop-color="#fff" stop-opacity="1"/><stop offset=".82" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="${sideFade ? 0 : 1}"/></linearGradient>
        <linearGradient id="y" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".06" stop-color="#fff" stop-opacity="1"/><stop offset="1" stop-color="#fff" stop-opacity="1"/></linearGradient>
        <mask id="m"><rect width="100%" height="100%" fill="url(#y)"/></mask>
      </defs>
      <rect width="100%" height="100%" fill="url(#x)" mask="url(#m)"/></svg>`);
    await base
      .extract({ left: 0, top: 0, width: W, height: cropH })
      .resize({ width: widthPx, height: outH })
      .ensureAlpha()
      .composite([{ input: mask, blend: 'dest-in' }])
      .png({ compressionLevel: 9 })
      .toFile(outPath);
  }
  return fileUrl(outPath);
}

module.exports = { prepareImage, fileUrl, dataUri, imageAspect, backCloseup };
