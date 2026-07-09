/**
 * Translates exercises 66–115 from EN to all locale langs via Google Translate API.
 * Run after: node scripts/buildExercises66_115.js
 * Usage: node scripts/translateExercises66_115.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const LOCALES_DIR = path.join(ROOT, 'locales');
const CACHE_PATH = path.join(__dirname, 'data', 'exercises66-115-translation-cache.json');
const TARGET_LANGS = ['lt', 'lv', 'pl', 'sv', 'cs', 'sk', 'fi', 'it', 'de', 'fr'];
const IDS = Array.from({ length: 50 }, (_, i) => String(66 + i));
const DELAY_MS = 180;

const STRING_FIELDS = ['title', 'description', 'equipment', 'calories'];
const ARRAY_FIELDS = ['benefits', 'instructions', 'tips'];

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function loadCache() {
  if (!fs.existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), 'utf8');
}

async function translateGoogle(text, targetLang) {
  if (!text || !text.trim()) return text;
  const url =
    'https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=' +
    encodeURIComponent(targetLang) +
    '&dt=t&q=' +
    encodeURIComponent(text);

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HockeyStarsExercises/1.0)' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const translated = (data[0] || []).map((part) => part[0]).join('');
      if (translated) return translated;
      throw new Error('Empty translation');
    } catch (err) {
      const wait = Math.min(8000, 800 * (attempt + 1));
      if (attempt === 5) {
        console.warn(`  [${targetLang}] fallback EN: ${text.slice(0, 50)}…`);
        return text;
      }
      await sleep(wait);
    }
  }
  return text;
}

async function translateString(text, lang, cache) {
  if (!cache[text]) cache[text] = {};
  if (cache[text][lang]) return cache[text][lang];
  const result = await translateGoogle(text, lang);
  cache[text][lang] = result;
  await sleep(DELAY_MS);
  return result;
}

async function main() {
  const en = JSON.parse(fs.readFileSync(path.join(LOCALES_DIR, 'en.json'), 'utf8'));
  const cache = loadCache();
  let translated = 0;

  for (const lang of TARGET_LANGS) {
    const filePath = path.join(LOCALES_DIR, `${lang}.json`);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    if (!data.exercises?.items) continue;

    for (const id of IDS) {
      const source = en.exercises.items[id];
      if (!source) continue;
      const target = { ...source };

      for (const field of STRING_FIELDS) {
        if (source[field]) {
          target[field] = await translateString(source[field], lang, cache);
          translated++;
        }
      }
      for (const field of ARRAY_FIELDS) {
        if (Array.isArray(source[field])) {
          target[field] = [];
          for (const item of source[field]) {
            target[field].push(await translateString(item, lang, cache));
            translated++;
          }
        }
      }

      data.exercises.items[id] = target;
      if (translated % 20 === 0) {
        saveCache(cache);
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
        console.log(`… ${lang} id ${id} (${translated} strings)`);
      }
    }

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
    console.log(`✅ locales/${lang}.json translated for 66–115`);
  }

  saveCache(cache);
  console.log(`Done. ${translated} strings translated.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
