/**
 * Merges notifications.profileViewsDigest from the Edge Function strings.json into locales/*.json
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const stringsPath = path.join(
  root,
  'supabase/functions/profile-views-daily-digest/strings.json',
);
const STRINGS = JSON.parse(fs.readFileSync(stringsPath, 'utf8'));
const langs = ['en', 'ru', 'lt', 'lv', 'pl', 'sv', 'cs', 'sk', 'fi', 'it', 'de', 'fr'];

for (const lang of langs) {
  const fp = path.join(root, 'locales', `${lang}.json`);
  const j = JSON.parse(fs.readFileSync(fp, 'utf8'));
  j.notifications = j.notifications || {};
  j.notifications.profileViewsDigest = STRINGS[lang] || STRINGS.en;
  fs.writeFileSync(fp, JSON.stringify(j, null, 2) + '\n', 'utf8');
}

console.log('Merged profileViewsDigest into', langs.length, 'locale files');
