#!/usr/bin/env node
// Usage: node build.js <team-folder> [--sheet A4|A3|SRA3] [--layout sheet|single] [--preview] [--keep-html]
const fs = require('fs');
const path = require('path');
const { loadTeam } = require('./lib/data');
const { albumHtml, pageOf } = require('./lib/album');
const { stickerAlbumHtml } = require('./lib/album-stickers');
const { execFileSync } = require('child_process');
const { cardsHtml } = require('./lib/cards');
const { stickersHtml } = require('./lib/stickers');
const { withBrowser, htmlToPdf, pdfPreviews, exportShareCards } = require('./lib/render');
const { printSpecHtml } = require('./lib/print-spec');

function syncSharePages(slug, outDir) {
  const previewDir = path.join(outDir, 'preview');
  const pagesDir = path.join(__dirname, 'print-ready', slug, 'pages');
  if (!fs.existsSync(previewDir)) return;
  fs.mkdirSync(pagesDir, { recursive: true });
  try {
    execFileSync(
      'python3',
      [
        path.join(__dirname, 'lib', 'export-share-pages.py'),
        previewDir,
        pagesDir,
        path.join(outDir, `${slug}-album-spreads.pdf`),
      ],
      { stdio: 'pipe' }
    );
    console.log(`✔ share pages → ${path.relative(process.cwd(), pagesDir)}/`);
  } catch (e) {
    console.warn(`⚠ share pages: ${e.stderr?.toString().trim().split('\n').pop() || e.message}`);
  }
}

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
  const productLabel = data.isStickers ? 'наклеек' : 'карточек';
  const rosterCount = data.isStickers ? Object.values(data.years || {}).reduce((n, a) => n + a.length, 0) : data.cards.length;
  console.log(`Команда: ${data.team.name} (${data.team.season}) — ${rosterCount} ${productLabel}`);
  if (data.missingPhotos.length) {
    console.log(`Нет фото (подставлена заглушка) — ${data.missingPhotos.length}:\n  ${data.missingPhotos.slice(0, 15).join('\n  ')}${data.missingPhotos.length > 15 ? `\n  … и ещё ${data.missingPhotos.length - 15}` : ''}`);
  }

  const album = data.isStickers ? stickerAlbumHtml(data) : albumHtml(data);
  const productHtml = data.isStickers
    ? stickersHtml(data, { sheet: args.sheet, layout: args.layout })
    : cardsHtml(data, { sheet: args.sheet, layout: args.layout });

  const albumPdf = path.join(outDir, `${slug}-album.pdf`);
  const productPdf = path.join(outDir, `${slug}-${data.isStickers ? 'stickers' : 'cards'}.pdf`);
  const specPdf = path.join(outDir, `${slug}-ТЗ-печать.pdf`);
  const page = pageOf(data);
  const spreadsName = `${slug}-album-spreads.pdf`;

  await withBrowser(async (browser) => {
    const albumHtmlFile = await htmlToPdf(browser, album, albumPdf);
    console.log(`✔ ${path.relative(process.cwd(), albumPdf)}`);
    const productHtmlFile = await htmlToPdf(browser, productHtml, productPdf);
    console.log(`✔ ${path.relative(process.cwd(), productPdf)}`);
    if (!data.isStickers) {
      const specHtmlFile = await htmlToPdf(browser, printSpecHtml(data), specPdf);
      console.log(`✔ ${path.relative(process.cwd(), specPdf)}`);
      if (!args.keepHtml) fs.rmSync(specHtmlFile, { force: true });
    }
    if (args.preview) {
      const previewDir = path.join(outDir, 'preview');
      fs.rmSync(previewDir, { recursive: true, force: true });
      await pdfPreviews(browser, albumPdf, albumHtmlFile, previewDir, 'album');
      await pdfPreviews(browser, productPdf, productHtmlFile, previewDir, data.isStickers ? 'stickers' : 'cards');
      if (!data.isStickers) {
        const sharePagesDir = path.join(__dirname, 'print-ready', slug, 'pages');
        await exportShareCards(browser, productHtmlFile, sharePagesDir, data.cards.length);
        console.log(`✔ карточки для share → ${path.relative(process.cwd(), sharePagesDir)}/card-*.jpg`);
      }
      console.log(`✔ превью: ${path.relative(process.cwd(), previewDir)}/`);
    }
    if (!args.keepHtml) {
      fs.rmSync(albumHtmlFile, { force: true });
      fs.rmSync(productHtmlFile, { force: true });
    }
  });

  const post = (cmd, src, dst, extra = []) => {
    try {
      execFileSync('python3', [path.join(__dirname, 'lib', 'postprocess.py'), cmd, src, dst, ...extra], { stdio: 'pipe' });
      console.log(`✔ ${path.relative(process.cwd(), dst)}`);
    } catch (e) {
      console.warn(`⚠ ${cmd}: ${e.stderr?.toString().trim().split('\n').pop() || e.message} (pip install pymupdf)`);
    }
  };
  for (const f of [albumPdf, productPdf]) {
    const tmp = f + '.tmp';
    post('optimize', f, tmp);
    if (fs.existsSync(tmp)) fs.renameSync(tmp, f);
  }
  post('impose', albumPdf, path.join(outDir, spreadsName), [String(page.bleed)]);
  post('light', albumPdf, path.join(outDir, `${slug}-album-preview.pdf`));
  post('light', productPdf, path.join(outDir, `${slug}-${data.isStickers ? 'stickers' : 'cards'}-preview.pdf`));

  if (args.preview) {
    syncSharePages(slug, outDir);
  }

  const printReady = path.join(__dirname, 'print-ready', slug);
  fs.mkdirSync(printReady, { recursive: true });
  const copyNames = [
    `${slug}-album.pdf`,
    spreadsName,
    `${slug}-${data.isStickers ? 'stickers' : 'cards'}.pdf`,
    `${slug}-album-preview.pdf`,
    `${slug}-${data.isStickers ? 'stickers' : 'cards'}-preview.pdf`,
  ];
  if (!data.isStickers) copyNames.push(`${slug}-ТЗ-печать.pdf`);
  for (const name of copyNames) {
    const src = path.join(outDir, name);
    if (fs.existsSync(src)) fs.copyFileSync(src, path.join(printReady, name));
  }

  const shareHtml = path.join(__dirname, 'share', slug, 'index.html');
  if (fs.existsSync(shareHtml)) {
    try {
      const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' }).trim();
      const remote = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf8' }).trim();
      const m = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
      if (m) {
        const [owner, repo] = m[1].split('/');
        const rel = path.relative(path.join(__dirname, '..', '..'), shareHtml).split(path.sep).join('/');
        const raw = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${rel}`;
        console.log(`\n🔗 Ссылка для клиента (перелистывание, работает сразу):\n   https://htmlpreview.github.io/?${raw}`);
        console.log(`\n   Красивая ссылка (после включения GitHub Pages → GitHub Actions):\n   https://${owner}.github.io/${repo}/${slug}/`);
      }
    } catch (_) { /* not a git repo — skip */ }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
