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

async function loadTeam(teamDir, cacheDir) {
  const team = JSON.parse(fs.readFileSync(path.join(teamDir, 'team.json'), 'utf8'));
  const photosDir = path.join(teamDir, 'photos');
  const assetsDir = path.join(teamDir, 'assets');
  const rows = parseCsv(fs.readFileSync(path.join(teamDir, 'players.csv'), 'utf8'));

  const colors = Object.assign(
    { primary: '#0b2a5b', secondary: '#c8102e', accent: '#f2b632', dark: '#071a3a', ice: '#eef3f9' },
    team.colors || {}
  );

  const photoCache = path.join(cacheDir, 'photos');
  const missingPhotos = [];
  const cards = [];
  for (const [index, row] of rows.entries()) {
    const number = (row.number || row['номер'] || '').replace(/^#/, '');
    const surname = row.surname || row['фамилия'] || '';
    const name = row.name || row['имя'] || '';
    const type = (row.type || row['тип'] || 'player').toLowerCase();
    const position = normalizePosition(row.position || row['амплуа'] || (type === 'coach' ? 'Тренер' : ''));
    const photoPath = findPhoto(photosDir, { ...row, number, surname, name });
    if (!photoPath) missingPhotos.push(`${number ? '#' + number + ' ' : ''}${surname} ${name}`.trim());
    cards.push({
      index: index + 1,
      number,
      surname,
      name,
      type,
      position,
      height: row.height || row['рост'] || '',
      weight: row.weight || row['вес'] || '',
      grip: row.grip || row['хват'] || '',
      birthdate: row.birthdate || row['дата рождения'] || row['дата_рождения'] || '',
      // К / A — captain / alternate captain, printed after the jersey number like on real cards
      role: (row.role || row['роль'] || '').trim().toUpperCase().replace('A', 'А').replace('K', 'К'),
      ribbon: row.ribbon || row['метка'] || (type === 'coach' ? 'Тренерский штаб' : type === 'team' ? 'Команда' : type === 'club' ? 'Клуб' : type === 'legend' ? 'Легенда' : ''),
      photo: photoPath ? await prepareImage(photoPath, photoCache, 1600) : placeholderPhoto(number, colors.primary),
      // low-res copy for the faded "paste here" ghosts in the album
      photoSmall: photoPath ? await prepareImage(photoPath, photoCache, 500) : placeholderPhoto(number, colors.primary),
      // optional second photo for the back (column photo2 / оборот); people get the faded close-up of the main photo
      photoBack: (row.photo2 || row['оборот'])
        ? await backCloseup(findPhoto(photosDir, { photo: row.photo2 || row['оборот'] }), photoCache)
        : photoPath && (type === 'player' || type === 'coach' || type === 'legend') ? await backCloseup(photoPath, photoCache) : null,
      hasPhoto: Boolean(photoPath),
      photo2Aspect: (row.photo2 || row['оборот']) ? await imageAspect(findPhoto(photosDir, { photo: row.photo2 || row['оборот'] })) : null,
      photoAspect: photoPath ? await imageAspect(photoPath) : 0.75,
      // horizontal position of the face in the photo (0–100 %), used to place the close-up on the card back
      focus: Number(String(row.focus || row['фокус'] || '50').replace('%', '')) || 50,
      // relative size of the close-up on the back (1 = default); <1 for photos that are already tightly cropped
      zoom: Number(row.zoom || row['масштаб'] || 1) || 1,
    });
  }

  const asset = async (names, maxPx) => {
    const p = findAsset(assetsDir, names);
    return p ? prepareImage(p, path.join(cacheDir, 'assets'), maxPx) : null;
  };
  const assets = {
    logo: await asset(['logo'], 1500),
    cover: await asset(['cover', 'team'], 3200),
    teamPhoto: await asset(['team', 'cover'], 3200),
    back: await asset(['back', 'arena'], 3200),
    qr: await asset(['qr'], 1200),
    history: await asset(['history'], 1600),
    history2: await asset(['history2'], 1600),
    puck: await asset(['puck'], 1200),
    teamCutout: await asset(['team-cutout', 'cutout'], 3000),
    gallery: [],
  };
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

  // {count} / {team} / {season} / {year} placeholders inside free texts
  const vars = { count: String(cards.length), team: team.name, season: team.season || '', year: team.year || '' };
  const fill = (v) => (typeof v === 'string' ? v.replace(/\{(count|team|season|year)\}/g, (_, k) => vars[k]) : Array.isArray(v) ? v.map(fill) : v);
  if (team.texts) for (const k of Object.keys(team.texts)) team.texts[k] = fill(team.texts[k]);
  if (team.history) {
    for (const it of team.history.items || []) for (const k of ['years', 'title', 'text']) if (it[k]) it[k] = fill(it[k]);
    for (const f of team.history.facts || []) for (const k of ['value', 'label']) if (f[k]) f[k] = fill(f[k]);
  }

  return { team, colors, cards, assets, brand, missingPhotos, teamDir, cardSize };
}

module.exports = { loadTeam };
