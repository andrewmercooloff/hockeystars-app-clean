/**
 * Patch locale files with season-related profile keys.
 */
const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', 'locales');
const files = fs.readdirSync(localesDir).filter((f) => f.endsWith('.json'));

const patches = {
  ru: {
    statistics: 'Статистика',
    previousSeason: 'Прошлый сезон',
    currentSeasonStats: 'Статистика · {season}',
  },
  en: {
    statistics: 'Statistics',
    previousSeason: 'Previous season',
    currentSeasonStats: 'Statistics · {season}',
  },
};

const fallback = patches.en;

for (const file of files) {
  const lang = file.replace('.json', '');
  const filePath = path.join(localesDir, file);
  let json;
  try {
    json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    console.warn('Skip', file, e.message);
    continue;
  }
  if (!json.profile) json.profile = {};
  const p = patches[lang] || fallback;
  Object.assign(json.profile, p);
  fs.writeFileSync(filePath, JSON.stringify(json, null, 2) + '\n', 'utf8');
  console.log('patched', file);
}
