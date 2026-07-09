/**
 * Translates quiz i18n from en.json into all other app languages.
 * Uses a string cache so repeated options are translated once.
 *
 * Run after: node scripts/generateHockeyQuizQuestions.js
 * Usage:
 *   node scripts/translateQuizI18n.js           — all target langs
 *   node scripts/translateQuizI18n.js de fr     — only selected langs
 *   node scripts/translateQuizI18n.js --dry-run  — count strings only
 */
const fs = require('fs');
const path = require('path');

const I18N_DIR = path.join(__dirname, '..', 'data', 'hockeyQuiz', 'i18n');
const CACHE_PATH = path.join(I18N_DIR, '_translationCache.json');
const EN_PATH = path.join(I18N_DIR, 'en.json');

const ALL_TARGET_LANGS = ['lt', 'lv', 'pl', 'sv', 'cs', 'sk', 'fi', 'it', 'de', 'fr'];
const DELAY_MS = 200;
const MAX_RETRIES = 6;
const SAVE_EVERY = 10;

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

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; HockeyStarsQuiz/1.0)' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const translated = (data[0] || []).map((part) => part[0]).join('');
      if (translated) return translated;
      throw new Error('Empty translation');
    } catch (err) {
      const wait = Math.min(8000, 800 * (attempt + 1));
      if (attempt === MAX_RETRIES - 1) {
        console.warn(`  [${targetLang}] fallback EN after ${MAX_RETRIES} tries: ${text.slice(0, 60)}…`);
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

function collectUniqueStrings(enBundle) {
  const set = new Set();
  for (const entry of Object.values(enBundle)) {
    if (entry.question) set.add(entry.question);
    for (const opt of entry.options || []) {
      if (opt) set.add(opt);
    }
  }
  return [...set];
}

function writeLangBundle(enBundle, lang, cache) {
  const bundle = {};
  for (const [id, entry] of Object.entries(enBundle)) {
    bundle[id] = {
      question: cache[entry.question]?.[lang] || entry.question,
      options: entry.options.map((opt) => cache[opt]?.[lang] || opt),
    };
  }
  const outPath = path.join(I18N_DIR, `${lang}.json`);
  fs.writeFileSync(outPath, JSON.stringify(bundle, null, 2), 'utf8');
  return outPath;
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const dryRun = process.argv.includes('--dry-run');
  const langs = args.length ? args.filter((l) => ALL_TARGET_LANGS.includes(l)) : ALL_TARGET_LANGS;

  if (!fs.existsSync(EN_PATH)) {
    console.error('Missing en.json — run: node scripts/generateHockeyQuizQuestions.js');
    process.exit(1);
  }

  const enBundle = JSON.parse(fs.readFileSync(EN_PATH, 'utf8'));
  const unique = collectUniqueStrings(enBundle);
  console.log(`Questions: ${Object.keys(enBundle).length}, unique strings: ${unique.length}`);

  if (dryRun) {
    console.log('Target languages:', langs.join(', '));
    return;
  }

  const cache = loadCache();
  let cacheDirty = false;

  for (const lang of langs) {
    console.log(`\n=== Translating -> ${lang} ===`);
    const missing = unique.filter((s) => !cache[s]?.[lang]);
    console.log(`Cache hits: ${unique.length - missing.length}, to translate: ${missing.length}`);

    for (let i = 0; i < missing.length; i++) {
      const text = missing[i];
      try {
        await translateString(text, lang, cache);
      } catch (err) {
        console.warn(`  skip (${err.message}): ${text.slice(0, 50)}…`);
        cache[text][lang] = text;
      }
      cacheDirty = true;
      if ((i + 1) % SAVE_EVERY === 0) {
        saveCache(cache);
        console.log(`  strings ${i + 1}/${missing.length}`);
      }
    }

    saveCache(cache);
    cacheDirty = false;

    const outPath = writeLangBundle(enBundle, lang, cache);
    const done = unique.filter((s) => cache[s]?.[lang]).length;
    console.log(`Wrote ${outPath} (${done}/${unique.length} strings)`);
  }

  console.log('\nDone. Quiz strings are ready for all languages.');
}

main().catch((err) => {
  console.error(err);
  try {
    saveCache(loadCache());
  } catch {
    /* ignore */
  }
  process.exit(1);
});
