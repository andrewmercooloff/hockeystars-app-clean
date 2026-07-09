// Одноразовый скрипт: добавляет ключи search.newcomers / search.topByPoints
// во все локали, вставляя строки после search.noPlayersFound без переформатирования.
const fs = require('fs');
const path = require('path');

const translations = {
  en: ['Newcomers', 'TOP by points'],
  ru: ['Новички', 'TOP по очкам'],
  de: ['Neuzugänge', 'TOP nach Punkten'],
  fr: ['Nouveaux', 'TOP aux points'],
  it: ['Nuovi arrivati', 'TOP per punti'],
  cs: ['Nováčci', 'TOP podle bodů'],
  sk: ['Nováčikovia', 'TOP podľa bodov'],
  pl: ['Nowicjusze', 'TOP według punktów'],
  fi: ['Tulokkaat', 'TOP pisteissä'],
  sv: ['Nykomlingar', 'TOP efter poäng'],
  lt: ['Naujokai', 'TOP pagal taškus'],
  lv: ['Jaunpienācēji', 'TOP pēc punktiem'],
};

const localesDir = path.join(__dirname, '..', 'locales');
let ok = 0;
for (const [lang, [newcomers, topByPoints]] of Object.entries(translations)) {
  const file = path.join(localesDir, `${lang}.json`);
  let text = fs.readFileSync(file, 'utf8');

  if (text.includes('"topByPoints"')) {
    console.log(`${lang}: уже добавлено, пропуск`);
    continue;
  }

  const anchorRe = /^(\s*)"noPlayersFound":\s*".*?",?\s*$/m;
  const match = text.match(anchorRe);
  if (!match) {
    console.error(`${lang}: не найден якорь noPlayersFound!`);
    process.exitCode = 1;
    continue;
  }
  const indent = match[1];
  const anchorLine = match[0];
  const anchorHadComma = anchorLine.trimEnd().endsWith(',');
  const finalInsertion = anchorHadComma
    ? `${anchorLine.trimEnd()}\n${indent}"newcomers": ${JSON.stringify(newcomers)},\n${indent}"topByPoints": ${JSON.stringify(topByPoints)},`
    : `${anchorLine.trimEnd()},\n${indent}"newcomers": ${JSON.stringify(newcomers)},\n${indent}"topByPoints": ${JSON.stringify(topByPoints)}`;

  text = text.replace(anchorRe, finalInsertion);
  JSON.parse(text); // валидация до записи
  fs.writeFileSync(file, text, 'utf8');
  ok++;
  console.log(`${lang}: ok`);
}
console.log(`Готово: ${ok} файлов обновлено`);
