/**
 * Разовая пуш-рассылка «на льду всё изменилось» всем пользователям с push-токенами.
 * Текст локализуется по языку пользователя (players.language), по умолчанию — английский.
 *
 * Запуск:  node scripts/broadcastFeaturesPush.js            — отправка
 *          node scripts/broadcastFeaturesPush.js --dry-run  — только показать, кому и что уйдёт
 */
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://jvsypfwiajuwsyuzkyda.supabase.co';
const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

const DRY_RUN = process.argv.includes('--dry-run');

// Локализованные тексты (12 языков приложения; fallback — en)
const MESSAGES = {
  ru: {
    title: '🏒 Эй, хоккеист!',
    body: 'Давно не заглядывал в HockeyStars? Перезапусти приложение пару раз — на льду всё изменилось: скаутские отчёты, онлайн-игры и твои друзья уже там!',
  },
  en: {
    title: '🏒 Hey, hockey player!',
    body: "Been away from HockeyStars? Restart the app a couple of times — the ice has changed: scout reports, online games and your friends are already there!",
  },
  de: {
    title: '🏒 Hey, Hockeyspieler!',
    body: 'Lange nicht bei HockeyStars gewesen? Starte die App ein paar Mal neu — auf dem Eis hat sich alles geändert: Scout-Berichte, Online-Spiele und deine Freunde sind schon da!',
  },
  fr: {
    title: '🏒 Hé, hockeyeur !',
    body: "Ça fait longtemps ! Redémarre l'appli deux ou trois fois — tout a changé sur la glace : rapports de scouts, jeux en ligne et tes amis t'attendent !",
  },
  it: {
    title: '🏒 Ehi, hockeista!',
    body: "È da un po' che non apri HockeyStars? Riavvia l'app un paio di volte — sul ghiaccio è cambiato tutto: report degli scout, giochi online e i tuoi amici ti aspettano!",
  },
  cs: {
    title: '🏒 Hej, hokejisto!',
    body: 'Dlouho jsi nebyl v HockeyStars? Restartuj aplikaci párkrát — na ledě se všechno změnilo: skautské reporty, online hry a tvoji kamarádi už tam jsou!',
  },
  sk: {
    title: '🏒 Hej, hokejista!',
    body: 'Dlho si nebol v HockeyStars? Reštartuj aplikáciu párkrát — na ľade sa všetko zmenilo: skautské reporty, online hry a tvoji kamaráti už tam sú!',
  },
  pl: {
    title: '🏒 Hej, hokeisto!',
    body: 'Dawno Cię nie było w HockeyStars? Zrestartuj aplikację kilka razy — na lodzie wszystko się zmieniło: raporty skautów, gry online i Twoi znajomi już czekają!',
  },
  fi: {
    title: '🏒 Hei, kiekkoilija!',
    body: 'Pitkästä aikaa! Käynnistä sovellus pari kertaa uudelleen — jäällä kaikki on muuttunut: scout-raportit, nettipelit ja kaverisi odottavat jo!',
  },
  sv: {
    title: '🏒 Hallå, hockeyspelare!',
    body: 'Länge sedan sist på HockeyStars? Starta om appen ett par gånger — allt har förändrats på isen: scoutrapporter, onlinespel och dina vänner är redan där!',
  },
  lt: {
    title: '🏒 Ei, ledo ritulininke!',
    body: 'Seniai buvai HockeyStars? Kelis kartus perkrauk programėlę — ant ledo viskas pasikeitė: skautų ataskaitos, online žaidimai ir tavo draugai jau ten!',
  },
  lv: {
    title: '🏒 Ei, hokejist!',
    body: 'Sen neesi bijis HockeyStars? Pārstartē lietotni pāris reizes — uz ledus viss ir mainījies: skautu atskaites, tiešsaistes spēles un tavi draugi jau ir tur!',
  },
};

const chunk = (arr, size) => {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

async function main() {
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  console.log(`[${new Date().toISOString()}] Загружаем push-токены и языки пользователей...`);

  const { data: tokens, error: tokensError } = await supabase
    .from('push_tokens')
    .select('token, user_id');
  if (tokensError) {
    console.error('Ошибка загрузки push_tokens:', tokensError.message);
    process.exit(1);
  }

  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('id, language');
  if (playersError) {
    console.error('Ошибка загрузки players:', playersError.message);
    process.exit(1);
  }

  const langById = new Map(players.map((p) => [p.id, p.language]));

  // Дедупликация токенов (один токен может быть у нескольких записей)
  const seen = new Set();
  const recipients = [];
  for (const row of tokens) {
    if (!row.token || row.token.length < 10 || seen.has(row.token)) continue;
    seen.add(row.token);
    const lang = langById.get(row.user_id);
    recipients.push({ token: row.token, lang: MESSAGES[lang] ? lang : 'en' });
  }

  const byLang = {};
  recipients.forEach((r) => { byLang[r.lang] = (byLang[r.lang] || 0) + 1; });
  console.log(`Получателей: ${recipients.length} (уникальных токенов). По языкам:`, byLang);

  if (DRY_RUN) {
    console.log('--dry-run: отправка пропущена. Пример текста (ru):', MESSAGES.ru);
    return;
  }

  const messages = recipients.map(({ token, lang }) => ({
    to: token,
    sound: 'not.m4a',
    title: MESSAGES[lang].title,
    body: MESSAGES[lang].body,
    data: { type: 'feature_announcement', action: 'open_home' },
    badge: 1,
    android: {
      sound: 'not.m4a',
      priority: 'high',
      color: '#fa2f40',
      icon: 'ic_notification',
      channelId: 'default',
    },
    ios: { sound: 'not.m4a', badge: 1 },
  }));

  let sent = 0;
  let failed = 0;
  for (const batch of chunk(messages, 100)) {
    try {
      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
      });
      const result = await response.json();
      const statuses = Array.isArray(result.data) ? result.data : [];
      statuses.forEach((s) => (s.status === 'ok' ? sent++ : failed++));
      if (!response.ok) console.error('HTTP ошибка батча:', response.status);
      // Небольшая пауза между батчами, чтобы не упереться в rate limit Expo
      await new Promise((r) => setTimeout(r, 500));
    } catch (e) {
      failed += batch.length;
      console.error('Ошибка отправки батча:', e.message);
    }
  }

  console.log(`[${new Date().toISOString()}] Готово. Отправлено: ${sent}, ошибок: ${failed}`);
}

main().catch((e) => {
  console.error('Фатальная ошибка:', e);
  process.exit(1);
});
