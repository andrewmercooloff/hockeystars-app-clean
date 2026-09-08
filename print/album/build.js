#!/usr/bin/env node
// Usage: node build.js <team-folder> [--sheet A4|A3|SRA3] [--layout sheet|single] [--preview] [--keep-html]
const fs = require('fs');
const path = require('path');
const { loadTeam } = require('./lib/data');
const { albumHtml, PAGE } = require('./lib/album');
const { execFileSync } = require('child_process');
const { cardsHtml } = require('./lib/cards');
const { withBrowser, htmlToPdf, pdfPreviews } = require('./lib/render');

function parseArgs(argv) {
  const args = { team: null, sheet: null, layout: null, preview: false, keepHtml: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--sheet') args.sheet = argv[++i];
    else if (a === '--layout') args.layout = argv[++i];
    else if (a === '--preview') args.preview = true;
    else if (a === '--keep-html') args.keepHtml = true;
    else if (!a.startsWith('--')) args.team = a;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.team) {
    const teams = fs.readdirSync(path.join(__dirname, 'teams')).filter((d) => fs.existsSync(path.join(__dirname, 'teams', d, 'team.json')));
    console.error(`Укажите команду: node build.js <команда>\nДоступные: ${teams.join(', ')}`);
    process.exit(1);
  }
  const teamDir = path.isAbsolute(args.team) ? args.team : path.join(__dirname, 'teams', args.team);
  const slug = path.basename(teamDir);
  const outDir = path.join(__dirname, 'out', slug);
  fs.mkdirSync(outDir, { recursive: true });

  const data = await loadTeam(teamDir, path.join(outDir, 'cache'));
  console.log(`Команда: ${data.team.name} (${data.team.season}) — ${data.cards.length} карточек`);
  if (data.missingPhotos.length) {
    console.log(`Нет фото (подставлена заглушка) — ${data.missingPhotos.length}:\n  ${data.missingPhotos.join('\n  ')}`);
  }

  const album = albumHtml(data);
  const cards = cardsHtml(data, { sheet: args.sheet, layout: args.layout });

  const albumPdf = path.join(outDir, `${slug}-album.pdf`);
  const cardsPdf = path.join(outDir, `${slug}-cards.pdf`);
  await withBrowser(async (browser) => {
    const albumHtmlFile = await htmlToPdf(browser, album, albumPdf);
    console.log(`✔ ${path.relative(process.cwd(), albumPdf)}`);
    const cardsHtmlFile = await htmlToPdf(browser, cards, cardsPdf);
    console.log(`✔ ${path.relative(process.cwd(), cardsPdf)}`);
    if (args.preview) {
      const previewDir = path.join(outDir, 'preview');
      fs.rmSync(previewDir, { recursive: true, force: true });
      await pdfPreviews(browser, albumPdf, albumHtmlFile, previewDir, 'album');
      await pdfPreviews(browser, cardsPdf, cardsHtmlFile, previewDir, 'cards');
      console.log(`✔ превью: ${path.relative(process.cwd(), previewDir)}/`);
    }
    if (!args.keepHtml) {
      fs.rmSync(albumHtmlFile, { force: true });
      fs.rmSync(cardsHtmlFile, { force: true });
    }
  });

  // Finishing (PyMuPDF): smaller files, A3 saddle-stitch spreads of the album, light copies for phones.
  const post = (cmd, src, dst, extra = []) => {
    try {
      execFileSync('python3', [path.join(__dirname, 'lib', 'postprocess.py'), cmd, src, dst, ...extra], { stdio: 'pipe' });
      console.log(`✔ ${path.relative(process.cwd(), dst)}`);
    } catch (e) {
      console.warn(`⚠ ${cmd}: ${e.stderr?.toString().trim().split('\n').pop() || e.message} (pip install pymupdf)`);
    }
  };
  for (const f of [albumPdf, cardsPdf]) {
    const tmp = f + '.tmp';
    post('optimize', f, tmp);
    if (fs.existsSync(tmp)) fs.renameSync(tmp, f);
  }
  post('impose', albumPdf, path.join(outDir, `${slug}-album-A3-spreads.pdf`), [String(PAGE.bleed)]);
  post('light', albumPdf, path.join(outDir, `${slug}-album-preview.pdf`));
  post('light', cardsPdf, path.join(outDir, `${slug}-cards-preview.pdf`));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
