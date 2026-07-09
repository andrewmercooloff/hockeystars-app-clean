// Одноразовый скрипт: добавляет ключи profile.inviteYourTeam / profile.inviteTeamMessage
// во все локали, вставляя строки после "noFriendsYet" без переформатирования файлов.
const fs = require('fs');
const path = require('path');

const translations = {
  en: ['Invite your team', "I'm on HockeyStars — the app for hockey players. Join me:"],
  ru: ['Позови свою команду', 'Я в HockeyStars — приложении для хоккеистов. Присоединяйся:'],
  de: ['Lade dein Team ein', 'Ich bin bei HockeyStars – der App für Eishockeyspieler. Mach mit:'],
  fr: ['Invite ton équipe', "Je suis sur HockeyStars, l'appli des hockeyeurs. Rejoins-moi :"],
  it: ['Invita la tua squadra', "Sono su HockeyStars, l'app per giocatori di hockey. Unisciti a me:"],
  cs: ['Pozvi svůj tým', 'Jsem na HockeyStars – aplikaci pro hokejisty. Přidej se ke mně:'],
  sk: ['Pozvi svoj tím', 'Som na HockeyStars – aplikácii pre hokejistov. Pridaj sa ku mne:'],
  pl: ['Zaproś swoją drużynę', 'Jestem na HockeyStars – aplikacji dla hokeistów. Dołącz do mnie:'],
  fi: ['Kutsu joukkueesi', 'Olen HockeyStarsissa – jääkiekkoilijoiden sovelluksessa. Liity mukaan:'],
  sv: ['Bjud in ditt lag', 'Jag är på HockeyStars – appen för hockeyspelare. Häng med:'],
  lt: ['Pakviesk savo komandą', 'Aš esu HockeyStars – programėlėje ledo ritulininkams. Prisijunk:'],
  lv: ['Uzaicini savu komandu', 'Es esmu HockeyStars – lietotnē hokejistiem. Pievienojies:'],
};

const localesDir = path.join(__dirname, '..', 'locales');
let ok = 0;
for (const [lang, [invite, message]] of Object.entries(translations)) {
  const file = path.join(localesDir, `${lang}.json`);
  let text = fs.readFileSync(file, 'utf8');

  if (text.includes('"inviteYourTeam"')) {
    console.log(`${lang}: уже добавлено, пропуск`);
    continue;
  }

  const anchorRe = /^(\s*)"noFriendsYet":\s*".*?",?\s*$/m;
  const match = text.match(anchorRe);
  if (!match) {
    console.error(`${lang}: не найден якорь noFriendsYet!`);
    process.exitCode = 1;
    continue;
  }
  const indent = match[1];
  const anchorLine = match[0];
  const needsComma = anchorLine.trimEnd().endsWith(',') ? '' : ',';
  // Если якорь заканчивался запятой — за ним есть ключи, последняя вставленная строка тоже с запятой.
  // Если запятой не было (последний ключ) — добавляем её якорю, а вставку завершаем без запятой.
  const anchorHadComma = anchorLine.trimEnd().endsWith(',');
  const finalInsertion = anchorHadComma
    ? `${anchorLine.trimEnd()}\n${indent}"inviteYourTeam": ${JSON.stringify(invite)},\n${indent}"inviteTeamMessage": ${JSON.stringify(message)},`
    : `${anchorLine.trimEnd()},\n${indent}"inviteYourTeam": ${JSON.stringify(invite)},\n${indent}"inviteTeamMessage": ${JSON.stringify(message)}`;

  text = text.replace(anchorRe, finalInsertion);
  // Валидация результата
  JSON.parse(text);
  fs.writeFileSync(file, text, 'utf8');
  ok++;
  console.log(`${lang}: ok`);
}
console.log(`Готово: ${ok} файлов обновлено`);
