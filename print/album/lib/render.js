const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');
const puppeteer = require('puppeteer-core');

const CHROME_CANDIDATES = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  process.env.CHROME_PATH,
  '/usr/local/bin/google-chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google/Chrome/Application/chrome.exe') : null,
];

function findChrome() {
  for (const p of CHROME_CANDIDATES) if (p && fs.existsSync(p)) return p;
  throw new Error('Chrome/Chromium не найден. Установите Google Chrome или задайте переменную PUPPETEER_EXECUTABLE_PATH.');
}

async function withBrowser(fn) {
  const browser = await puppeteer.launch({
    executablePath: findChrome(),
    headless: true,
    args: ['--no-sandbox', '--disable-gpu', '--font-render-hinting=none'],
  });
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}

// The HTML is written next to the PDF and opened via file:// so that Chrome can stream
// fonts and photos from disk instead of receiving a multi-hundred-megabyte inline document.
async function htmlToPdf(browser, html, outFile) {
  const htmlFile = outFile.replace(/\.pdf$/i, '.html');
  fs.writeFileSync(htmlFile, html);
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load', timeout: 180000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => Promise.all(Array.from(document.images).filter((i) => !i.complete).map((i) => new Promise((r) => (i.onload = i.onerror = r)))));
  await page.pdf({ path: outFile, printBackground: true, preferCSSPageSize: true, timeout: 600000, margin: { top: 0, right: 0, bottom: 0, left: 0 } });
  await page.close();
  return htmlFile;
}

function hasPdftoppm() {
  try {
    execFileSync('pdftoppm', ['-v'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

async function exportShareCards(browser, htmlFile, pagesDir, cardCount) {
  fs.mkdirSync(pagesDir, { recursive: true });
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load', timeout: 180000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() =>
    Promise.all(
      Array.from(document.images)
        .filter((i) => !i.complete)
        .map((i) => new Promise((r) => (i.onload = i.onerror = r)))
    )
  );
  const isSingle = (await page.$('.page.single')) !== null;
  if (isSingle) {
    const els = await page.$$('.page.single');
    for (let i = 0; i < cardCount; i++) {
      const n = String(i + 1).padStart(2, '0');
      if (els[i * 2]) {
        await els[i * 2].screenshot({ path: path.join(pagesDir, `card-${n}-front.jpg`), type: 'jpeg', quality: 88 });
      }
      if (els[i * 2 + 1]) {
        await els[i * 2 + 1].screenshot({ path: path.join(pagesDir, `card-${n}-back.jpg`), type: 'jpeg', quality: 88 });
      }
    }
  } else {
    const sheets = await page.$$('.page.sheet');
    let idx = 0;
    for (let s = 0; s < sheets.length && idx < cardCount; s += 2) {
      const frontSlots = await sheets[s].$$('.slot');
      const backSlots = sheets[s + 1] ? await sheets[s + 1].$$('.slot') : [];
      for (let j = 0; j < frontSlots.length && idx < cardCount; j++, idx++) {
        const n = String(idx + 1).padStart(2, '0');
        await frontSlots[j].screenshot({ path: path.join(pagesDir, `card-${n}-front.jpg`), type: 'jpeg', quality: 88 });
        if (backSlots[j]) {
          await backSlots[j].screenshot({ path: path.join(pagesDir, `card-${n}-back.jpg`), type: 'jpeg', quality: 88 });
        }
      }
    }
  }
  await page.close();
}

async function pdfPreviews(browser, pdfFile, htmlFile, previewDir, prefix, dpi = 60) {
  fs.mkdirSync(previewDir, { recursive: true });
  if (hasPdftoppm()) {
    execFileSync('pdftoppm', ['-r', String(dpi), '-png', pdfFile, path.join(previewDir, prefix)]);
    return;
  }
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlFile).href, { waitUntil: 'load', timeout: 180000 });
  const count = await page.$$eval('.page', (els) => els.length);
  for (let i = 0; i < count; i++) {
    const el = (await page.$$('.page'))[i];
    await el.screenshot({ path: path.join(previewDir, `${prefix}-${String(i + 1).padStart(2, '0')}.png`) });
  }
  await page.close();
}

module.exports = { withBrowser, htmlToPdf, pdfPreviews, exportShareCards };
