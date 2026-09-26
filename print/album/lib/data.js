const fs = require('fs');
const path = require('path');
const { prepareImage, fileUrl, imageAspect, backCloseup } = require('./images');

const POSITIONS = {
  в: 'Вратарь',
  вр: 'Вратарь',
  вратарь: 'Вратарь',
  g: 'Вратарь',
  gk: 'Вратарь',
  з: 'Защитник',
  защ: 'Защитник',
  защитник: 'Защитник',
  d: 'Защитник',
  н: 'Нападающий',
  нап: 'Нападающий',
  нападающий: 'Нападающий',
  f: 'Нападающий',
  тренер: 'Тренер',
  coach: 'Тренер',
};

const IMAGE_EXT = ['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif'];

function parseCsv(text) {
  text = text.replace(/^\uFEFF/, '');
  const firstLine = text.split(/\r?\n/)[0] || '';
  const delimiter = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length ? ';' : ',';
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(field);
      field = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += ch;
    }
  }
  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }
  const header = rows.shift().map((h) => h.trim().toLowerCase());
  return rows
    .filter((r) => r.some((c) => c.trim() !== ''))
    .map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] || '').trim()])));
}

function normalizePosition(raw) {
  const key = (raw || '').trim().toLowerCase();
  return POSITIONS[key] || (raw || '').trim();
}

function resolvePhotoPath(teamDir, photosDir, row) {
  if (row.photo) {
    const rel = String(row.photo).replace(/\\/g, '/');
    const bases = [path.join(teamDir, rel), path.join(teamDir, 'rosters', rel), path.join(photosDir, path.basename(rel))];
    for (const p of bases) if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  return findPhoto(photosDir, row);
}

// Photo lookup order: explicit `photo` column → jersey number (7, 07) → "Фамилия", "Фамилия Имя", "Фамилия_Имя".
function findPhoto(photosDir, row) {
  const candidates = [];
  if (row.photo) candidates.push(row.photo);
  if (row.number) candidates.push(row.number, String(row.number).padStart(2, '0'));
  if (row.surname && row.name) candidates.push(`${row.surname} ${row.name}`, `${row.surname}_${row.name}`);
  if (row.surname) candidates.push(row.surname);
  for (const base of candidates) {
    const direct = path.join(photosDir, base);
    if (fs.existsSync(direct) && fs.statSync(direct).isFile()) return direct;
    for (const ext of IMAGE_EXT) {
      for (const variant of [base + ext, base + ext.toUpperCase()]) {
        const p = path.join(photosDir, variant);
        if (fs.existsSync(p)) return p;
      }
    }
  }
  return null;
}

function placeholderPhoto(number, color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 420">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e9eef5"/><stop offset="1" stop-color="#c9d3e0"/></linearGradient></defs>
  <rect width="300" height="420" fill="url(#g)"/>
  <g fill="${color}" opacity="0.28">
    <circle cx="150" cy="150" r="62"/>
    <path d="M40 420 C40 300 90 250 150 250 C210 250 260 300 260 420 Z"/>
  </g>
  <text x="150" y="395" text-anchor="middle" font-family="sans-serif" font-size="22" fill="#5b6b80" opacity="0.7">ФОТО ${number ? '№' + number : ''}</text>
</svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

const ASSET_EXT = ['.png', '.svg', '.pdf', '.jpg', '.jpeg', '.webp', '.heic', '.heif'];

// Assets are looked up by base name with any supported extension: logo.png / logo.pdf / logo.svg …
function findAsset(assetsDir, baseNames) {
  if (!fs.existsSync(assetsDir)) return null;
  const files = fs.readdirSync(assetsDir);
  for (const base of baseNames) {
    for (const ext of ASSET_EXT) {
      const hit = files.find((f) => f.toLowerCase() === (base + ext).toLowerCase());
      if (hit) return path.join(assetsDir, hit);
    }
  }
  return null;
}

function makeQr(url, cacheDir) {
  const key = require('crypto').createHash('md5').update(url).digest('hex').slice(0, 12);
  const out = path.join(cacheDir, `qr-${key}.png`);
  if (!fs.existsSync(out)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    const script = [
      'import sys, qrcode',
      'qr = qrcode.QRCode(error_correction=qrcode.constants.ERROR_CORRECT_M, box_size=24, border=2)',
      'qr.add_data(sys.argv[1]); qr.make(fit=True)',
      'qr.make_image(fill_color="black", back_color="white").save(sys.argv[2])',
    ].join('\n');
    try {
      require('child_process').execFileSync('python3', ['-c', script, url, out], { stdio: 'pipe' });
    } catch (e) {
      throw new Error(`Не удалось сгенерировать QR (pip install qrcode pillow): ${e.stderr?.toString() || e.message}`);
    }
  }
  return out;
}

// Optional folder with lifestyle photos for the "Жизнь команды" collage page.
function listGallery(assetsDir, name = 'gallery') {
  const dir = path.join(assetsDir, name);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => IMAGE_EXT.includes(path.extname(f).toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'ru', { numeric: true }))
    .map((f) => path.join(dir, f));
}

async function rowToPerson(row, ctx) {
  const { teamDir, photosDir, photoCache, colors, missingPhotos, meta = {} } = ctx;
  const number = (row.number || row['номер'] || '').replace(/^#/, '');
  const surname = row.surname || row['фамилия'] || '';
  const name = row.name || row['имя'] || '';
  const type = (row.type || row['тип'] || 'player').toLowerCase();
  const position = normalizePosition(row.position || row['амплуа'] || (type === 'coach' ? 'Тренер' : type === 'staff' ? row.position || 'Сотрудник' : ''));
  const photoPath = resolvePhotoPath(teamDir, photosDir, { ...row, number, surname, name });
  const label = `${meta.year ? meta.year + ' · ' : ''}${number ? '#' + number + ' ' : ''}${surname} ${name}`.trim();
  if (!photoPath && surname && !surname.startsWith('УТОЧНИТЬ')) missingPhotos.push(label);
  return {
    ...meta,
    number,
    surname,
    name,
    type,
    position,
    height: row.height || row['рост'] || '',
    weight: row.weight || row['вес'] || '',
    grip: row.grip || row['хват'] || '',
    birthdate: row.birthdate || row['дата рождения'] || row['дата_рождения'] || '',
    role: (row.role || row['роль'] || '').trim().toUpperCase().replace('A', 'А').replace('K', 'К'),
    ribbon: row.ribbon || row['метка'] || (type === 'coach' ? 'Тренерский штаб' : type === 'team' ? 'Команда' : type === 'club' ? 'Клуб' : type === 'legend' ? 'Легенда' : type === 'staff' ? 'Руководство' : ''),
    photo: photoPath ? await prepareImage(photoPath, photoCache, 1600) : placeholderPhoto(number, colors.primary),
    photoSmall: photoPath ? await prepareImage(photoPath, photoCache, 500) : placeholderPhoto(number, colors.primary),
    photoBack: (row.photo2 || row['оборот'])
      ? type === 'club' || type === 'team'
        ? await prepareImage(resolvePhotoPath(teamDir, photosDir, { photo: row.photo2 || row['оборот'] }), photoCache, 1600)
        : await backCloseup(resolvePhotoPath(teamDir, photosDir, { photo: row.photo2 || row['оборот'] }), photoCache)
      : photoPath && (type === 'player' || type === 'coach' || type === 'legend' || type === 'staff') ? await backCloseup(photoPath, photoCache) : null,
    hasPhoto: Boolean(photoPath),
    photo2Aspect: (row.photo2 || row['оборот']) ? await imageAspect(resolvePhotoPath(teamDir, photosDir, { photo: row.photo2 || row['оборот'] })) : null,
    photoAspect: photoPath ? await imageAspect(photoPath) : 0.75,
    focus: Number(String(row.focus || row['фокус'] || '50').replace('%', '')) || 50,
    logoSide: String(row.logoSide || row['лого'] || '').toLowerCase(),
    backOffset: Number(row.backOffset || row['сдвиг'] || 0) || 0,
    backFocusY: Number(row.backFocusY || row['фокус_y'] || 0) || 0,
    zoom: Number(row.zoom || row['масштаб'] || 1) || 1,
    large: String(row.large || row['крупная'] || '').toLowerCase() === '1' || String(row.large || row['крупная'] || '').toLowerCase() === 'true',
    group: (row.group || row['группа'] || '').toLowerCase(),
    text: row.text || row['текст'] || '',
    half: row.half || '',
  };
}

async function loadTeam(teamDir, cacheDir) {
  const team = JSON.parse(fs.readFileSync(path.join(teamDir, 'team.json'), 'utf8'));
  const photosDir = path.join(teamDir, 'photos');
  const assetsDir = path.join(teamDir, 'assets');
  const rostersDir = path.join(teamDir, 'rosters');
  const isStickers = team.album?.product === 'stickers' || (!fs.existsSync(path.join(teamDir, 'players.csv')) && fs.existsSync(rostersDir));

  const colors = Object.assign(
    { primary: '#0b2a5b', secondary: '#c8102e', accent: '#f2b632', dark: '#071a3a', ice: '#eef3f9' },
    team.colors || {}
  );

  const photoCache = path.join(cacheDir, 'photos');
  const missingPhotos = [];
  const ctx = { teamDir, photosDir, photoCache, colors, missingPhotos };
  const cards = [];
  const years = {};
  const teamStickers = {};
  const staff = [];
  const legends = [];

  if (isStickers) {
    // Numbering follows the album: legends → club (staff, arena, mascot…) → birth years (roster + double team photo).
    let globalIndex = 0;
    const loadList = async (csvName, photosBase, target) => {
      const csvPath = path.join(teamDir, csvName);
      if (!fs.existsSync(csvPath)) return;
      for (const row of parseCsv(fs.readFileSync(csvPath, 'utf8'))) {
        // `double=1` → two regular-size halves (left / right) of one wide photo, glued side by side in the album
        const halves = String(row.double || row['двойная'] || '') === '1' ? ['l', 'r'] : [''];
        for (const half of halves) {
          globalIndex += 1;
          const person = await rowToPerson({ ...row, half }, { ...ctx, photosDir: photosBase, meta: { index: globalIndex } });
          person.index = globalIndex;
          target.push(person);
          cards.push(person);
        }
      }
    };
    await loadList('legends.csv', path.join(assetsDir, 'legends'), legends);
    await loadList('staff.csv', assetsDir, staff);
    const yearList = team.album?.years || [];
    for (const year of yearList) {
      const csvPath = path.join(rostersDir, `${year}.csv`);
      years[year] = [];
      if (!fs.existsSync(csvPath)) continue;
      const yearPhotos = path.join(rostersDir, 'photos', year);
      const rows = parseCsv(fs.readFileSync(csvPath, 'utf8'));
      for (const row of rows) {
        globalIndex += 1;
        const person = await rowToPerson(row, { ...ctx, photosDir: yearPhotos, meta: { year, index: globalIndex } });
        person.index = globalIndex;
        years[year].push(person);
        cards.push(person);
      }
      // Double team-photo sticker: two regular-size halves (left / right) glued side by side in the album.
      const teamPhoto = ['team.jpg', 'team.png', 'team.jpeg'].map((f) => path.join(rostersDir, 'photos', year, f)).find((p) => fs.existsSync(p))
        || findAsset(assetsDir, ['team-photo', 'team']);
      teamStickers[year] = [];
      for (const half of ['l', 'r']) {
        globalIndex += 1;
        const person = await rowToPerson(
          { surname: team.shortName || team.name, name: `${year} г.р.`, position: `Командное фото · ${half === 'l' ? 'левая' : 'правая'} часть`, type: 'team', half, photo: teamPhoto ? path.relative(teamDir, teamPhoto) : '' },
          { ...ctx, photosDir: assetsDir, meta: { year, index: globalIndex } }
        );
        person.index = globalIndex;
        teamStickers[year].push(person);
        cards.push(person);
      }
    }
  } else {
    const rows = parseCsv(fs.readFileSync(path.join(teamDir, 'players.csv'), 'utf8'));
    for (const [index, row] of rows.entries()) {
      const person = await rowToPerson(row, ctx);
      person.index = index + 1;
      cards.push(person);
    }
  }

  const asset = async (names, maxPx) => {
    const p = findAsset(assetsDir, names);
    return p ? prepareImage(p, path.join(cacheDir, 'assets'), maxPx) : null;
  };
  const assets = {
    logo: await asset(['logo'], 1500),
    cover: await asset(['cover', 'team'], 3200),
    teamPhoto: await asset(['team-photo', 'team', 'cover'], 3200),
    back: await asset(['back', 'arena'], 3200),
    qr: await asset(['qr'], 1200),
    history: await asset(['history'], 1600),
    history2: await asset(['history2'], 1600),
    puck: await asset(['puck'], 1200),
    puckBlack: await asset(['puck-black', 'puck_black', 'puck'], 800),
    puckOrange: await asset(['puck-orange', 'puck_orange'], 800),
    teamCutout: await asset(['team-cutout', 'cutout'], 3000),
    // sticker-album skin (SKA Strelna CDR): full-page cover art, torn-stripe corner ornaments, wide team shot, cracked ice
    coverBg: await asset(['cover-bg'], 3200),
    ornTl: await asset(['orn-tl'], 2200),
    ornBr: await asset(['orn-br'], 2600),
    iceCracked: await asset(['ice-cracked'], 1600),
    askS: await asset(['ask-s'], 2000),
    arenaWide: await asset(['arena-wide', 'arena'], 2400),
    fans: await asset(['fans-3', 'fans'], 2400),
    gallery: [],
  };
  // assets/history/*.png → assets.<camelCase> (cup, medal, oldteam, arena-cups → arenaCups …) for the text pages
  const histDir = path.join(assetsDir, 'history');
  for (const f of fs.existsSync(histDir) ? fs.readdirSync(histDir) : []) {
    if (!IMAGE_EXT.includes(path.extname(f).toLowerCase())) continue;
    const key = path.basename(f, path.extname(f)).replace(/-(\w)/g, (_, ch) => ch.toUpperCase());
    assets[key] = await prepareImage(path.join(histDir, f), path.join(cacheDir, 'assets'), 1400);
  }
  // assets/pages/* → full-page artwork usable as "image:<file>" in album.pages
  assets.pages = {};
  const pagesArtDir = path.join(assetsDir, 'pages');
  for (const f of fs.existsSync(pagesArtDir) ? fs.readdirSync(pagesArtDir) : []) {
    if (IMAGE_EXT.includes(path.extname(f).toLowerCase())) assets.pages[f] = await prepareImage(path.join(pagesArtDir, f), path.join(cacheDir, 'pages'), 3600);
  }
  assets.bg = fs.existsSync(path.join(assetsDir, 'bg-ice.jpg')) ? await prepareImage(path.join(assetsDir, 'bg-ice.jpg'), path.join(cacheDir, 'assets'), 1600) : null;
  assets.coverAspect = await imageAspect(assets.cover);
  // No qr.png but a link in team.json → generate the QR code (python `qrcode` package).
  if (!assets.qr && team.qrUrl) assets.qr = fileUrl(makeQr(team.qrUrl, path.join(cacheDir, 'assets')));
  for (const p of listGallery(assetsDir)) assets.gallery.push({ src: await prepareImage(p, path.join(cacheDir, 'gallery'), 1800), aspect: (await imageAspect(p)) || 1.33 });
  // extra photo folders (assets/gallery-<name>/) usable as "gallery-<name>:Заголовок" in album.extraPages
  assets.galleries = {};
  for (const d of fs.existsSync(assetsDir) ? fs.readdirSync(assetsDir) : []) {
    if (!d.startsWith('gallery-') || !fs.statSync(path.join(assetsDir, d)).isDirectory()) continue;
    assets.galleries[d] = [];
    for (const p of listGallery(assetsDir, d)) assets.galleries[d].push({ src: await prepareImage(p, path.join(cacheDir, d), 1800), aspect: (await imageAspect(p)) || 1.33 });
  }

  const brand = {
    hockeystarsWhite: fileUrl(path.join(__dirname, 'brand', 'hockeystars-white.png')),
  };

  const c = team.cards || {};
  const cardSize = { w: Number(c.width) || 55, h: Number(c.height) || 77, bleed: Number(c.bleed ?? 2) };
  const p = team.page || {};
  const pageSize = { w: Number(p.width) || 210, h: Number(p.height) || 297, bleed: Number(p.bleed ?? 3) };
  const s = team.stickers || {};
  const stickerSize = {
    w: Number(s.width) || 40,
    h: Number(s.height) || 45,
    bleed: Number(s.bleed ?? 2),
  };

  const rosterCount = isStickers ? Object.values(years).reduce((n, arr) => n + arr.length, 0) : cards.length;
  const vars = {
    count: String(rosterCount || cards.length),
    team: team.name,
    season: team.season || '',
    year: team.year || '',
    yearRange: team.yearRange || '',
  };
  const fill = (v) => (typeof v === 'string' ? v.replace(/\{(count|team|season|year|yearRange)\}/g, (_, k) => vars[k]) : Array.isArray(v) ? v.map(fill) : v);
  if (team.texts) for (const k of Object.keys(team.texts)) team.texts[k] = fill(team.texts[k]);
  if (team.history) {
    for (const it of team.history.items || []) for (const k of ['years', 'title', 'text']) if (it[k]) it[k] = fill(it[k]);
    for (const f of team.history.facts || []) for (const k of ['value', 'label']) if (f[k]) f[k] = fill(f[k]);
  }
  for (const block of [team.school, team.skaHistory]) {
    if (!block) continue;
    for (const it of block.items || block.eras || []) for (const k of ['years', 'title', 'text']) if (it[k]) it[k] = fill(it[k]);
    for (const f of block.facts || []) for (const k of ['value', 'label']) if (f[k]) f[k] = fill(f[k]);
    for (const k of ['lead', 'footer']) if (block[k]) block[k] = fill(block[k]);
  }

  return {
    team,
    colors,
    cards,
    years,
    staff,
    legends,
    teamStickers,
    assets,
    brand,
    missingPhotos,
    teamDir,
    cardSize,
    pageSize,
    stickerSize,
    isStickers,
    allStickers: cards,
  };
}

module.exports = { loadTeam };
