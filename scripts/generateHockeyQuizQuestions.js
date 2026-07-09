/**
 * Generates data/hockeyQuiz/questions.ts
 * Run: node scripts/generateHockeyQuizQuestions.js
 */
const fs = require('fs');
const path = require('path');
const HOCKEY_IQ_100 = require('./hockeyIQ100Questions');

const LANGS = ['en', 'ru', 'lt', 'lv', 'pl', 'sv', 'cs', 'sk', 'fi', 'it', 'de', 'fr'];

function expandQ(en, ru) {
  const q = { en, ru };
  for (const lang of LANGS) {
    if (!q[lang]) q[lang] = lang === 'ru' ? ru : en;
  }
  return q;
}

function localOpt(en, ru) {
  const o = { en, ru: ru || en };
  for (const lang of LANGS) {
    if (!o[lang]) o[lang] = lang === 'ru' ? o.ru : en;
  }
  return o;
}

/** Universal: numbers, names, team names */
function isUniversalOpt(s) {
  if (/^\d/.test(s)) return true;
  if (/^(Wayne Gretzky|Alex Ovechkin|Sidney Crosby|Connor McDavid|Jaromir Jagr|Mario Lemieux|Gordie Howe|NHL|KHL|AHL|IIHF)/.test(s)) return true;
  if (/^(Pittsburgh|Edmonton|Toronto|Montreal|Boston|Chicago|Detroit|New York|Washington|Colorado|Tampa|New Jersey|Calgary|Vancouver|Ottawa|Winnipeg|Minnesota|Dallas|Nashville|St\. Louis|Florida|Anaheim|Los Angeles|San Jose|Buffalo|Columbus|Carolina|Philadelphia|Seattle|Utah|Arizona)/.test(s)) return true;
  if (/^(USA|Canada|Russia|Sweden|Finland|Czechia|Czechoslovakia|USSR|Soviet Union)/.test(s)) return true;
  if (/^\d+(\s*(ft|min|th|century))?$/i.test(s)) return true;
  if (/^(2|3|4|5|6|7|8|10|12|15|18|20|30|85|100|150|200|250|300|500|1000|1500|2000|2857|3500)$/.test(s)) return true;
  return false;
}

function mkOpts(options) {
  return options.map((item) => {
    if (Array.isArray(item)) return localOpt(item[0], item[1]);
    if (typeof item === 'string') return localOpt(item, RU[item] || item);
    return item;
  });
}

function optRu(o) {
  if (typeof o === 'string') return RU[o] || o;
  return o.ru || o.en || '';
}

function optEn(o) {
  if (typeof o === 'string') return o;
  return o.en || '';
}

function norm(s) {
  return s.trim().toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ');
}

function areSynonymousRu(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (na === nb) return true;
  const groups = [
    ['центральн', 'нападающ'],
    ['лев', 'крайн', 'нападающ'],
    ['прав', 'крайн', 'нападающ'],
  ];
  for (const keys of groups) {
    const aHit = keys.every((k) => na.includes(k));
    const bHit = keys.every((k) => nb.includes(k));
    if (aHit && bHit) return true;
  }
  if ((na === 'центральный' || na === 'center') && nb.includes('центральн') && nb.includes('нападающ')) return true;
  if ((nb === 'центральный' || nb === 'center') && na.includes('центральн') && na.includes('нападающ')) return true;
  return false;
}

function validateQuestion(q) {
  const opts = q.o;
  if (opts.length !== 4) throw new Error(`${q.id}: need 4 options, got ${opts.length}`);
  if (q.correct < 0 || q.correct > 3) throw new Error(`${q.id}: invalid correctIndex ${q.correct}`);

  const ruTexts = opts.map(optRu);
  const enTexts = opts.map(optEn);

  for (let i = 0; i < 4; i++) {
    for (let j = i + 1; j < 4; j++) {
      if (norm(ruTexts[i]) === norm(ruTexts[j])) {
        throw new Error(`${q.id}: duplicate RU "${ruTexts[i]}" / "${ruTexts[j]}"`);
      }
      if (areSynonymousRu(ruTexts[i], ruTexts[j])) {
        throw new Error(`${q.id}: synonymous RU "${ruTexts[i]}" / "${ruTexts[j]}"`);
      }
      if (norm(enTexts[i]) === norm(enTexts[j])) {
        throw new Error(`${q.id}: duplicate EN "${enTexts[i]}" / "${enTexts[j]}"`);
      }
    }
  }
}

function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededShuffle(indices, seed) {
  const arr = [...indices];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Spread correct answers across A–D in the bank (stable per question id). */
function shuffleOptsForQuestion(id, opts, correctIdx) {
  const order = seededShuffle([0, 1, 2, 3], hashStr(id));
  return {
    opts: order.map((i) => opts[i]),
    correct: order.indexOf(correctIdx),
  };
}

function mkQ(id, category, difficulty, correct, qEn, qRu, opts) {
  const built = mkOpts(opts);
  const { opts: shuffled, correct: newCorrect } = shuffleOptsForQuestion(id, built, correct);
  const q = { id, category, difficulty, correct: newCorrect, q: expandQ(qEn, qRu), o: shuffled };
  validateQuestion(q);
  return q;
}

const RU = {
  'The puck': 'Шайба',
  'The goalie': 'Вратарь',
  'The referee': 'Судья',
  'The center line': 'Центральная линия',
  Center: 'Центральный нападающий',
  'Left winger': 'Левый крайний нападающий',
  'Right winger': 'Правый крайний нападающий',
  Defenseman: 'Защитник',
  Goalie: 'Вратарь',
  'False — only from defensive zone': 'Неверно — только из зоны защиты',
  'False — never in NHL': 'Неверно — в NHL не бывает',
  True: 'Верно',
  'True — only in overtime': 'Верно — только в овертайме',
  'Three assists in one game': 'Три передачи в одном матче',
  'Three saves in a row': 'Три сейва подряд',
  'Three goals by one player in one game': 'Три гола одного игрока в матче',
  'Three penalties': 'Три удаления',
  'One team has more skaters due to a penalty': 'У одной команды больше игроков из-за удаления',
  'The goalie is pulled': 'Вратарь снят с площадки',
  'Overtime starts': 'Начинается овертайм',
  'A fight breaks out': 'Начинается драка',
  Plastic: 'Пластик',
  'Vulcanized rubber': 'Вулканизированная резина',
  Wood: 'Дерево',
  Aluminum: 'Алюминий',
  Faceoff: 'Вбрасывание',
  'Penalty shot': 'Буллит',
  'Icing call': 'Айсинг',
  'Power break': 'Перерыв на большинство',
  Shootout: 'Серия буллитов',
  'Second overtime': 'Второй овертайм',
  'Draw stands': 'Ничья сохраняется',
  'Playoff period': 'Плей-офф период',
  'Yes always': 'Да, всегда',
  'No — goal may be disallowed': 'Нет — гол могут не засчитать',
  'Only in playoffs': 'Только в плей-офф',
  'Only last minute': 'Только в последнюю минуту',
  Waist: 'Пояс',
  Shoulders: 'Плечи',
  Crossbar: 'Перекладина',
  'Helmet only': 'Только шлем',
  Offside: 'Офсайд',
  'Empty-net goal against': 'Гол в пустые ворота',
  'Icing only': 'Только айсинг',
  'Any time': 'В любой момент',
  'Clear breakaway': 'Чистый выход один на один',
  'Only overtime': 'Только в овертайме',
  'Only playoffs': 'Только в плей-офф',
  'The captain': 'Капитан',
  'The goalie (usually)': 'Вратарь (обычно)',
  'A forward': 'Нападающий',
  'A defenseman': 'Защитник',
  'Saucer pass': 'Пас «блюдцем»',
  'Slap dump': 'Сильный сброс',
  'Board pass': 'Пас от борта',
  'Crease pass': 'Пас на площадку вратаря',
  'Tapping the puck lightly': 'Лёгкое касание шайбы',
  'Winding up and striking the ice first': 'Замах и удар по льду',
  'Backhand only': 'Только с неудобной руки',
  'One hand on stick': 'Одной рукой на клюшке',
  'A defensive block': 'Блок в защите',
  'A fake move to beat a defender': 'Обманное движение для обхода защитника',
  'A type of penalty': 'Вид штрафа',
  'A line change': 'Смена звена',
  'Two players fight': 'Двое игроков дерутся',
  'A skater goes in alone on the goalie': 'Игрок выходит один на вратаря',
  'The puck is iced': 'Шайба отправлена в айсинг',
  'A line change occurs': 'Происходит смена',
  'Shots on goal': 'Броски в створ',
  'Goal differential while player is on ice at even strength': 'Разница голов при равных составах на льду',
  'Penalty minutes': 'Штрафные минуты',
  'Faceoff wins only': 'Только выигранные вбрасывания',
  'Scores the goal': 'Забивает гол',
  'Last touched puck before scorer': 'Последний коснулся шайбы перед голом',
  'Won the faceoff': 'Выиграл вбрасывание',
  'Got a penalty': 'Получил штраф',
  'Goalie saves it': 'Вратарь отбивает',
  'Skater stops puck with body/stick before goal': 'Игрок блокирует шайбу телом/клюшкой',
  'Puck hits post': 'Шайба попадает в штангу',
  'Shot misses net': 'Бросок мимо ворот',
  'Defending your blue line': 'Защита своей синей линии',
  'Pressuring opponents in their zone to regain puck': 'Давление в зоне соперника для отбора шайбы',
  'Pulling the goalie': 'Снятие вратаря',
  'Line change strategy only': 'Только тактика смен',
  'Skating back to help defense': 'Откат назад в защиту',
  'Shooting from the point': 'Бросок с синей линии',
  'Winning faceoff': 'Выигрыш вбрасывания',
  'Goalie save': 'Сейв вратаря',
  'Shooting immediately off a pass': 'Бросок сразу после паса',
  'Waiting then shooting': 'Ожидание и бросок',
  'A penalty': 'Штраф',
  'Goalie move': 'Приём вратаря',
  'Hook opponent': 'Подсечка соперника',
  'Knock puck away from opponent': 'Выбить шайбу у соперника',
  'Lift puck over stick': 'Поднять шайбу над клюшкой',
  'Cross-check': 'Подножка клюшкой',
  'Five-hole': '«Пятая дырка»',
  'Upper part of the net': 'Верхняя часть ворот',
  'From center ice only': 'Только с центра поля',
  'On empty net only': 'Только в пустые ворота',
  'Arm and body': 'Рука и тело',
  Legs: 'Ноги',
  'Stick and glove': 'Клюшка и ловушка',
  'Mask and chest': 'Маска и грудь',
  'Goal scoring': 'Забивание голов',
  'Physical protection and fighting': 'Физическая защита и драки',
  'Faceoffs only': 'Только вбрасывания',
  Coaching: 'Тренерство',
  'Only at intermission': 'Только в перерыве',
  'On the fly during play': 'На ходу во время игры',
  'Only after goals': 'Только после голов',
  'Only on penalties': 'Только при удалениях',
  'Dark/colored': 'Тёмная/цветная',
  'White/light': 'Белая/светлая',
  'No jerseys': 'Без формы',
  'Goalie only': 'Только вратарь',
  '5 min': '5 мин',
  '15-18 min': '15–18 мин',
  '30 min': '30 мин',
  '1 hour': '1 час',
  'Always best of 5': 'Всегда до 3 побед',
  'Final only': 'Только финал',
  'Rare exceptions — mostly best of 7': 'Редкие исключения — обычно до 4 побед',
  Never: 'Никогда',
  'Sharpen skates': 'Заточка коньков',
  'Resurface ice': 'Заливка льда',
  'Measure speed': 'Измерение скорости',
  'Store pucks': 'Хранение шайб',
  'Team jerseys': 'Форма команд',
  'Black and white stripes': 'Чёрно-белая полоска',
  'Goalie gear': 'Экипировка вратаря',
  Suits: 'Костюмы',
  'Head': 'Голову',
  'Lower legs': 'Голени',
  'Hands only': 'Только кисти',
  Shoulders: 'Плечи',
  'Upper body and shoulders': 'Верх тела и плечи',
  Knees: 'Колени',
  Skates: 'Коньки',
  Stick: 'Клюшку',
  'Icing calls': 'Айсинг',
  'Offside at center': 'Офсайд на центре',
  'Faceoffs only': 'Только вбрасывания',
  'Penalty box': 'Скамейка штрафников',
  'Skating speed': 'Скорость катания',
  'Lifting and controlling puck': 'Подъём и контроль шайбы',
  'Goalie saves': 'Сейвы вратаря',
  Fighting: 'Драки',
  'Stick flex': 'Жёсткость клюшки',
  'Grip on ice and turns': 'Сцепление со льдом и повороты',
  'Helmet fit': 'Посадка шлема',
  'Jersey size': 'Размер свитера',
  'Czech legend': 'Чешская легенда',
  'Chicago Blackhawks legend': 'Легенда Chicago Blackhawks',
  'Stay between attacker and net': 'Держаться между соперником и воротами',
  'Skate to the bench immediately': 'Сразу кататься на скамейку',
  'Chase behind the net only': 'Гнаться только за воротами',
  'Leave the slot open': 'Оставить слот открытым',
  'Take the puck carrier and angle him wide': 'Взять владельца шайбы и увести его на край',
  'Both rush the puck carrier together': 'Оба броситься на шайбу одновременно',
  'Both stay at the blue line': 'Оба стоять на синей линии',
  'Clear the puck out of the zone': 'Выбросить шайбу из зоны',
  'Skate with puck up the middle alone': 'Кататься с шайбой через центр в одиночку',
  'Change lines on the fly first': 'Сначала смениться на ходу',
  'Watch the puck only and ignore players': 'Смотреть только на шайбу, игнорируя соперников',
  'Cover the weak-side (backdoor) threat': 'Закрыть угрозу с «слабой» стороны (backdoor)',
  'Pinch aggressively every time': 'Каждый раз агрессивно подключаться в атаку',
  'Always pass through the middle under pressure': 'Всегда пасовать через центр под прессингом',
  'First pass to low support or safe outlet': 'Первый пас на низкую поддержку или безопасный выход',
  'Rim blindly around the boards': 'Слепо отправить шайбу вдоль бортов',
  'Hold the blue line and keep puck in zone': 'Держать синюю линию и оставить шайбу в зоне',
  'Skate back to neutral zone': 'Откатиться в нейтральную зону',
  'Turn and chase through the middle to the net': 'Развернуться и преследовать через центр к воротам',
  'Stop and argue with the referee': 'Остановиться и спорить с судьёй',
  'Gap control': 'Контроль дистанции (gap)',
  'Hat trick count': 'Подсчёт хет-триков',
  'Faceoff percentage only': 'Только процент вбрасываний',
  'Jersey number rules': 'Правила номеров на свитере',
  'Man-on-man coverage on the puck carrier': 'Персональная опека владельца шайбы',
  'Ignore the far-side attacker': 'Игнорировать дальнего нападающего',
  'Skate to the hash marks and stop': 'Кататься к faceoff-кругам и остановиться',
  'Communicate and switch if needed': 'Общаться и при необходимости переключаться',
  'Never block shots': 'Никогда не блокировать броски',
  'Block shots and sacrifice body when needed': 'Блокировать броски и закрывать тело при необходимости',
  'Always shoot from the point first': 'Всегда сначала бросать с синей линии',
  'Read forecheck and use quick first pass': 'Читать форчекинг и быстро отдать первый пас',
  'Stick-check from behind on a breakaway': 'Подрезать клюшкой сзади на выходе один на один',
  'Legal angling and stick on puck side': 'Легальное уведение и клюшка со стороны шайбы',
  'Hook and pull opponent down': 'Зацепить и повалить соперника',
  'Lift opponent stick in the slot illegally': 'Нелегально поднять клюшку в слоте',
  'Go to the net for rebounds and tips': 'Выходить к воротам на отскоки и подставления',
  'Skate to the red line alone always': 'Всегда один кататься к красной линии',
  'Ignore the puck on line change': 'Игнорировать шайбу при смене',
  'Chase the puck deep without support': 'Гнаться за шайбой глубоко без поддержки',
  'Freeze the puck to stop play': 'Прижать шайбу и остановить игру',
  'Skate to center ice and celebrate': 'Кататься на центр и праздновать',
  'Leave the net for a line change': 'Покинуть ворота для смены',
  'Point to center ice': 'Указать на центр площадки',
  'Delayed penalty (play continues)': 'Отложенный штраф (игра продолжается)',
  'Goal scored': 'Забит гол',
  'Icing call completed': 'Завершённый айсинг',
  'Timeout requested': 'Запрошен тайм-аут',
  'Minor penalty': 'Малый штраф',
  'Offside violation': 'Офсайд',
  'Hand pass violation': 'Пас рукой',
  'Too many men on the ice': 'Лишний игрок на льду',
  'High-sticking penalty': 'Штраф за высокую клюшку',
  'Cross-checking penalty': 'Штраф за подножку клюшкой',
  'Wash out / no icing': 'Отмена / нет айсинга',
  'Head-man the puck (pass ahead)': 'Отдать шайбу вперёд партнёру',
  'Skate backward to own bench only': 'Кататься назад только к своей скамейке',
  'Cycle low to create space': 'Крутить шайбу низом для создания пространства',
  'Track the puck through traffic': 'Следить за шайбой сквозь трафик',
  'Challenge the shooter early always': 'Всегда рано выходить на бросок',
  'Second forward supports high in zone': 'Второй нападающий прикрывает «высоко» в зоне',
  'Win the draw to a winger or D-man spot': 'Выиграть вбрасывание на точку партнёра',
  'All three forwards deep in the corner': 'Все трое нападающих в углу',
  'Cover the point on penalty kill': 'Закрыть игрока с синей линии в меньшинстве',
  'Take the net-front on power play': 'Работать перед воротами на большинстве',
  'Every player helps on defense': 'Каждый игрок помогает в защите',
  'Change only on the attacking side always': 'Меняться только на стороне атаки',
  'Communicate before switching marks': 'Общаться перед переключением опеки',
  'Rebound control to safe area': 'Контроль отскока в безопасную зону',
  'Play puck only in the trapezoid behind net': 'Играть клюшкой только в трапеции за воротами',
  'F1 pressures, F2 takes away pass lane': 'F1 давит, F2 закрывает линию паса',
  'Post-to-post movement on lateral passes': 'Движение от штанги к штанге при пасах',
  'Open palm toward penalty box': 'Открытая ладонь в сторону скамейки штрафников',
  'Both arms straight up': 'Обе руки подняты вверх',
  'Chopping motion parallel to the ice': 'Рубящее движение параллельно льду',
  'Closed fist pumping motion': 'Движение сжатого кулака',
  'Hands form a T': 'Руки образуют букву T',
  'Six fingers shown': 'Показать шесть пальцев',
  'Palm to own face/jaw area': 'Ладонь к своему лицу/челюсти',
  'Both fists pushing forward': 'Оба кулака толкают вперёд',
  'Arm across chest (linesman)': 'Рука через грудь (линейный судья)',
  'Match speed and support the puck carrier': 'Подстроить скорость и поддержать владельца шайбы',
  'Stay high as third man on the rush': 'Держаться «высоко» третьим на контратаке',
  'Angle cut to reduce net visibility': 'Сократить угол, закрывая обзор ворот',
  'Dump and chase without forechecking plan': 'Dump-and-chase без плана форчекинга',
  'Skate to opponent bench for change': 'Кататься к скамейке соперника для смены',
  'Screen the goalie on PP': 'Загораживать вратаря на большинстве',
  'Leave the slot open on defense': 'Оставлять слот открытым в защите',
  'Read the forecheck before first pass': 'Прочитать форчекинг перед первым пасом',
  'Always deke on a penalty shot': 'Всегда обводить на буллите',
  'Protect the house (slot area)': 'Защищать «дом» (зону слота)',
  'Rim the puck around without looking': 'Отправить шайбу вдоль борта не глядя',
  'Stop behind the net outside trapezoid': 'Остановиться за воротами вне трапеции',
  'Signal for offside at blue line': 'Сигнал офсайда на синей линии',
  'Signal a delayed penalty': 'Сигнал отложенного штрафа',
  'Signal icing is waived off': 'Сигнал отмены айсинга',
  'Boarding penalty signal (arms pushing)': 'Сигнал штрафа за бросок в борт',
  'Tripping signal (leg sweep motion)': 'Сигнал подножки (движение ногой)',
  'Hooking signal (pulling motion)': 'Сигнал зацепа (движение «подтягивания»)',
  'Fighting major (both arms crossed)': 'Драка — большой штраф (руки скрещены)',
  'Penalty shot awarded signal': 'Сигнал назначения буллита',
  'Goal disallowed signal (cross arms then wave off)': 'Сигнал отмены гола',
  'Drop puck at faceoff dot': 'Бросить шайбу на точку вбрасывания',
  'Whistle only with no signal': 'Только свисток без жеста',
  'Center supports low, wing stays high': 'Центр поддерживает низ, крайний держится «высоко»',
  'Winger drives wide with speed on rush': 'Крайний с скоростью идёт по флангу на контратаке',
  'Goalie talks on odd-man rushes': 'Вратарь подсказывает при нечётных контратаках',
  'Forward backchecks through the middle': 'Нападающий откатывается через центр',
  'Strong-side forward below puck, weak-side high': 'Сильная сторона ниже шайбы, слабая «высоко»',
  'Delay of game (referee pats imaginary glass)': 'Задержка игры (похлопывание по «стеклу»)',
  'Match penalty / game misconduct signal': 'Матч-штраф / удаление до конца матча',
  'Double minor (two fingers)': 'Двойной малый штраф (два пальца)',
  'Stand at the hash marks for faceoff': 'Встать на метки для вбрасывания',
  'Enter faceoff circle early always': 'Всегда рано входить в круг вбрасывания',
  'Goalie leaves crease to play puck in trapezoid': 'Вратарь выходит из площадки играть клюшкой в трапеции',
  'All forwards change at once blindly': 'Все нападающие сменяются разом «вслепую»',
  'Support from the weak side on D-zone exit': 'Поддержка со слабой стороны при выходе из зоны',
  'One-timer setup: pass to open shooter': 'One-timer: пас на открытого бросающего',
  'Crash the net after shot from point': 'Выходить к воротам после броска с синей',
  'Stay onside by delaying zone entry': 'Не создавать офсайд, задержав вход в зону',
  'Poke check only from front legally': 'Пок-чек только спереди легально',
  'Hold the post on short-side wrap': 'Держать штангу на короткой стороне при обводке',
  'Referee both arms extended sideways': 'Судья: обе руки в стороны',
  'Linesman both arms up (offside)': 'Линейный: обе руки вверх (офсайд)',
  'Points to center ice for penalty shot': 'Указывает на центр / назначает буллит',
  'Find the puck through traffic or adjust position': 'Найти шайбу сквозь трафик или сдвинуться',
  'Match the shooter and read the release': 'Подстроиться под бросающего и читать бросок',
  'Stops or plays the puck legally behind the net': 'Останавливает или играет клюшкой легально',
  'Delay of game penalty': 'Штраф за задержку игры',
  'Block passing lanes and receive passes': 'Закрыть линии паса и принять шайбу',
  'On the fly when play allows': 'На ходу, когда это безопасно',
  'Anticipate where puck and opponents go next': 'Предвидеть, куда пойдёт шайба и соперники',
  'Four in a box, one pressuring the puck': 'Четверо «коробкой», один давит на шайбу',
  'Timing the drop to win the puck early': 'Подстроиться под сброс, чтобы выиграть раньше',
  'Manage puck and avoid unnecessary penalties': 'Контролируют шайбу и избегают лишних штрафов',
  'Get favorable player-vs-player situations': 'Получить выгодные пары «игрок на игрока»',
  'Movement opens lanes and stretches the PK': 'Движение открывает линии и растягивает меньшинство',
  'Side where puck is vs opposite side': 'Сторона, где шайба, и противоположная',
  'Cause too many men or bad timing': 'Привести к лишнему игроку или плохому таймингу',
  'Backcheck and help defensively': 'Откатываться и помогать в защите',
  'Create space for shot or pass': 'Создать пространство для броска/паса',
  'Legal play always': 'Всегда разрешено',
  'Automatic goal': 'Автоматический гол',
  'Icing call': 'Айсинг',
};

const ALL = [];

ALL.push(
  mkQ('rules_players_ice', 'rules', 1, 2,
    'How many skaters per team are on the ice during even strength (excluding goalies)?',
    'Сколько полевых игроков одной команды на льду в равных составах (без вратарей)?',
    ['4', '5', '6', '7']),
  mkQ('rules_periods', 'rules', 1, 1,
    'How many regulation periods are in a standard NHL game?',
    'Сколько периодов в стандартном матче NHL?',
    ['2', '3', '4', '5']),
  mkQ('rules_offside', 'rules', 2, 0,
    'Offside is called when an attacking player enters the offensive zone before what?',
    'Офсайд — если атакующий вошёл в зону соперника раньше чего?',
    [['The puck', 'Шайба'], ['The goalie', 'Вратарь'], ['The referee', 'Судья'], ['The center line', 'Центральная линия']]),
  mkQ('rules_icing', 'rules', 2, 2,
    'Icing is shooting the puck from behind the center line past the opponent goal line without touch. True?',
    'Айсинг — бросок из-за центра за линию ворот соперника без касания. Верно?',
    [['False — only from defensive zone', 'Неверно — только из зоны защиты'], ['False — never in NHL', 'Неверно — в NHL не бывает'], ['True', 'Верно'], ['True — only in overtime', 'Верно — только в овертайме']]),
  mkQ('players_gretzky_goals', 'players', 1, 0,
    'Who holds the NHL record for most career goals?',
    'У кого рекорд NHL по голам за карьеру?',
    ['Wayne Gretzky', 'Alex Ovechkin', 'Jaromir Jagr', 'Gordie Howe']),
  mkQ('players_ovechkin_pos', 'players', 1, 0,
    'Alex Ovechkin is famous as a left winger wearing number 8 for which team city?',
    'Александр Овечкин — левый крайний под №8. За какой город он играет?',
    [['Washington', 'Вашингтон'], ['Pittsburgh', 'Питтсбург'], ['Boston', 'Бостон'], ['Toronto', 'Торонто']]),
  mkQ('terms_hat_trick', 'terms', 1, 2,
    'What is a hat trick in hockey?',
    'Что такое хет-трик в хоккее?',
    [['Three assists in one game', 'Три передачи в одном матче'], ['Three saves in a row', 'Три сейва подряд'], ['Three goals by one player in one game', 'Три гола одного игрока в матче'], ['Three penalties', 'Три удаления']]),
  mkQ('terms_power_play', 'terms', 2, 0,
    'A power play occurs when:',
    'Большинство возникает, когда:',
    [['One team has more skaters due to a penalty', 'У одной команды больше игроков из-за удаления'], ['The goalie is pulled', 'Вратарь снят'], ['Overtime starts', 'Начинается овертайм'], ['A fight breaks out', 'Начинается драка']]),
  mkQ('history_stanley_cup', 'history', 1, 3,
    'The Stanley Cup is the championship trophy of which league?',
    'Кубок Стэнли — трофей какой лиги?',
    ['KHL', 'IIHF World Championship', 'AHL', 'NHL']),
  mkQ('general_puck_material', 'general', 1, 1,
    'What is a standard hockey puck made of?',
    'Из чего сделана стандартная хоккейная шайба?',
    [['Plastic', 'Пластик'], ['Vulcanized rubber', 'Вулканизированная резина'], ['Wood', 'Дерево'], ['Aluminum', 'Алюминий']])
);

const ruleQuestions = [
  [1, 'rules_penalty_minor', 'How many minutes is a standard minor penalty?', 'Сколько минут длится малый штраф?', ['2', '4', '5', '10'], 0],
  [2, 'rules_penalty_major', 'How many minutes is a standard major penalty?', 'Сколько минут длится большой штраф?', ['2', '5', '10', '20'], 1],
  [1, 'rules_faceoff', 'Play starts with a:', 'Игра начинается с:', ['Faceoff', 'Penalty shot', 'Icing call', 'Power break'], 0],
  [2, 'rules_shootout_reg', 'If an NHL regular-season game is tied after overtime, what happens?', 'Если после овертайма ничья в регулярке NHL, что дальше?', ['Shootout', 'Second overtime', 'Draw stands', 'Playoff period'], 0],
  [2, 'rules_crease', 'Can an attacker stand in the goalie crease without consequences?', 'Может ли атакующий стоять на площадке вратаря без последствий?', ['Yes always', 'No — goal may be disallowed', 'Only in playoffs', 'Only last minute'], 1],
  [2, 'rules_high_stick', 'High-sticking is when the stick hits an opponent above the:', 'Высокая клюшка — удар выше:', ['Waist', 'Shoulders', 'Crossbar', 'Helmet only'], 1],
  [2, 'rules_empty_net', 'Pulling the goalie risks:', 'Снятие вратаря рискует:', ['Offside', 'Empty-net goal against', 'Penalty shot', 'Icing only'], 1],
  [3, 'rules_breakaway_penalty', 'A penalty shot is often awarded for fouling a:', 'Буллит часто назначают за фол на:', ['Any time', 'Clear breakaway', 'Only overtime', 'Only playoffs'], 1],
  [3, 'rules_bench_minor', 'A bench minor is served by any player except:', 'Скамейный штраф отбывает любой, кроме:', ['The captain', 'The goalie (usually)', 'A forward', 'A defenseman'], 1],
  [2, 'rules_ot_3on3', 'NHL regular-season OT is played with how many skaters per side?', 'Овертайм NHL в регулярке — сколько полевых с каждой стороны?', ['3', '4', '5', '6'], 0],
  [1, 'rules_players_total', 'How many players (including goalie) can a team have on ice?', 'Сколько игроков (с вратарём) команда может иметь на льду?', ['5', '6', '7', '8'], 1],
  [1, 'rules_goal_value', 'How many points is a goal worth on the scoreboard?', 'Сколько очков на табло даёт гол?', ['1', '2', '3', '5'], 0],
  [2, 'rules_delayed_penalty', 'On a delayed penalty, the non-offending team often:', 'При отложенном штрафе команда без нарушения часто:', [['Pulls the goalie', 'Снимает вратаря'], ['Ices the puck', 'Отправляет шайбу в айсинг'], ['Calls timeout', 'Берёт тайм-аут'], ['Stops play', 'Останавливает игру']], 0],
  [3, 'rules_trapezoid', 'Goalies can only play the puck behind the net in the:', 'Вратарь может играть клюшкой за воротами только в:', [['Trapezoid area', 'Трапеции'], ['Full zone', 'Всей зоне'], ['Center circle', 'Центральном круге'], ['Neutral zone', 'Нейтральной зоне']], 0],
  [2, 'rules_fighting_major', 'Fighting typically results in a:', 'Драка обычно приводит к:', [['Minor penalty', 'Малому штрафу'], ['Major penalty', 'Большому штрафу'], ['No penalty', 'Без штрафа'], ['Game misconduct only', 'Только удалению до конца']], 1],
];

ruleQuestions.forEach(([diff, id, en, ru, opts, correct]) => {
  ALL.push(mkQ(id, 'rules', diff, correct, en, ru, opts));
});

const termQuestions = [
  [1, 'terms_puck', 'The hard rubber object players shoot is called a:', 'Твёрдый резиновый предмет, который бросают, называют:', [['Puck', 'Шайба'], ['Ball', 'Мяч'], ['Discus', 'Диск'], ['Stone', 'Камень']], 0],
  [2, 'terms_saucer', 'A pass that lifts the puck is called a:', 'Пас, при котором шайба летит над льдом, называют:', ['Saucer pass', 'Slap dump', 'Board pass', 'Crease pass'], 0],
  [2, 'terms_slap_shot', 'A slap shot involves:', 'Щелчок выполняют так:', ['Tapping the puck lightly', 'Winding up and striking the ice first', 'Backhand only', 'One hand on stick'], 1],
  [2, 'terms_deke', 'A deke is:', 'Дек — это:', ['A defensive block', 'A fake move to beat a defender', 'A type of penalty', 'A line change'], 1],
  [2, 'terms_breakaway', 'A breakaway is when:', 'Выход один на один — это когда:', ['Two players fight', 'A skater goes in alone on the goalie', 'The puck is iced', 'A line change occurs'], 1],
  [3, 'terms_plus_minus', 'Plus/minus tracks:', 'Показатель +/- учитывает:', ['Shots on goal', 'Goal differential while player is on ice at even strength', 'Penalty minutes', 'Faceoff wins only'], 1],
  [2, 'terms_assist', 'A primary assist goes to the player who:', 'Первая передача — игроку, который:', ['Scores the goal', 'Last touched puck before scorer', 'Won the faceoff', 'Got a penalty'], 1],
  [2, 'terms_block', 'A blocked shot is when:', 'Заблокированный бросок — когда:', ['Goalie saves it', 'Skater stops puck with body/stick before goal', 'Puck hits post', 'Shot misses net'], 1],
  [2, 'terms_forecheck', 'Forechecking means:', 'Форчекинг — это:', ['Defending your blue line', 'Pressuring opponents in their zone to regain puck', 'Pulling the goalie', 'Line change strategy only'], 1],
  [2, 'terms_backcheck', 'Backchecking means:', 'Бэкчекинг — это:', ['Skating back to help defense', 'Shooting from the point', 'Winning faceoff', 'Goalie save'], 0],
  [2, 'terms_one_timer', 'A one-timer is:', 'One-timer — это:', ['Shooting immediately off a pass', 'Waiting then shooting', 'A penalty', 'Goalie move'], 0],
  [3, 'terms_poke_check', 'A poke check:', 'Пок-чек — это:', ['Hook opponent', 'Knock puck away from opponent', 'Lift puck over stick', 'Cross-check'], 1],
  [2, 'terms_top_shelf', 'Top shelf means scoring in the:', '«Верхняя полка» — забить в:', ['Five-hole', 'Upper part of the net', 'From center ice only', 'On empty net only'], 1],
  [2, 'terms_five_hole', 'Five-hole is between the goalie\'s:', '«Пятая дырка» — между:', ['Arm and body', 'Legs', 'Stick and glove', 'Mask and chest'], 1],
  [3, 'terms_enforcer', 'An enforcer provides:', 'Enforcer в команде:', ['Goal scoring', 'Physical protection and fighting', 'Faceoffs only', 'Coaching'], 1],
  [2, 'terms_line_change', 'Line changes usually happen:', 'Смена звена обычно происходит:', ['Only at intermission', 'On the fly during play', 'Only after goals', 'Only on penalties'], 1],
  [1, 'terms_rink', 'The playing surface in hockey is called:', 'Игровая поверхность в хоккее называется:', [['Ice rink', 'Каток'], ['Field', 'Поле'], ['Court', 'Корт'], ['Track', 'Трек']], 0],
  [1, 'terms_goal', 'The net players shoot at is called:', 'Сетка, в которую бросают, называется:', [['Goal', 'Ворота'], ['Basket', 'Корзина'], ['Target', 'Мишень'], ['Zone', 'Зона']], 0],
  [2, 'terms_short_handed', 'Playing short-handed means:', 'Игра в меньшинстве означает:', [['Fewer skaters due to penalty', 'Меньше игроков из-за штрафа'], ['Goalie pulled', 'Вратарь снят'], ['Overtime', 'Овертайм'], ['Empty net', 'Пустые ворота']], 0],
  [3, 'terms_golden_goal', 'Sudden-death overtime means:', 'Овертайм «золотой гол» означает:', [['First goal wins', 'Первый гол решает'], ['Full period', 'Полный период'], ['Shootout only', 'Только буллиты'], ['No winner', 'Без победителя']], 0],
];

termQuestions.forEach(([diff, id, en, ru, opts, correct]) => {
  ALL.push(mkQ(id, 'terms', diff, correct, en, ru, opts));
});

const historyQuestions = [
  [1, 'hist_original_six', 'How many teams in the NHL Original Six era?', 'Сколько команд в эпоху Original Six?', ['4', '6', '8', '12'], 1],
  [1, 'hist_canada', 'Modern ice hockey developed most in:', 'Современный хоккей сильнее всего развился в:', ['USA', 'Canada', 'Russia', 'Sweden'], 1],
  [2, 'hist_miracle_ice', 'Miracle on Ice: USA beat whom in 1980?', 'Чудо на льду: США победили кого в 1980?', ['Canada', 'Soviet Union', 'Sweden', 'Czechoslovakia'], 1],
  [3, 'hist_gretzky_points', 'Wayne Gretzky\'s career points record is over:', 'Рекорд Гретцки по очкам за карьеру — более:', ['1500', '2000', '2857', '3500'], 2],
  [2, 'hist_hof_city', 'The Hockey Hall of Fame is in:', 'Зал хоккейной славы находится в:', ['New York', 'Toronto', 'Montreal', 'Boston'], 1],
  [2, 'hist_khl', 'The KHL is based primarily in:', 'КХЛ базируется преимущественно в:', ['Canada', 'Russia', 'USA', 'Finland'], 1],
  [3, 'hist_1972', 'The 1972 Summit Series: Canada vs:', 'Серия-1972: Канада против:', ['USA', 'USSR', 'Sweden', 'Czechia'], 1],
  [2, 'hist_nhl_century', 'The NHL was founded in the:', 'NHL основана в:', ['18th century', '19th century', '20th century', '21st century'], 2],
  [3, 'hist_crosby_draft', 'Sidney Crosby was drafted 1st overall in:', 'Сидни Кросби — первый на драфте:', ['2003', '2005', '2007', '2010'], 1],
  [3, 'hist_mcdavid_draft', 'Connor McDavid was drafted 1st overall in:', 'Коннор Макдэвид — первый на драфте:', ['2013', '2015', '2017', '2019'], 1],
  [2, 'hist_first_stanley_year', 'The Stanley Cup was first awarded in the:', 'Кубок Стэнли впервые вручили в:', [['19th century', 'XIX веке'], ['20th century', 'XX веке'], ['18th century', 'XVIII веке'], ['21st century', 'XXI веке']], 0],
  [3, 'hist_jagr_points', 'Jaromir Jagr ranks among all-time NHL leaders in:', 'Яромир Ягр среди лидеров NHL по:', [['Points', 'Очкам'], ['Goalie wins', 'Победам вратарей'], ['Penalty minutes only', 'Только штрафным'], ['Coaching', 'Тренерству']], 0],
  [2, 'hist_ovi_capitals', 'Alex Ovechkin spent his NHL career mainly with the:', 'Овечкин провёл карьеру в NHL в основном в:', [['Washington Capitals', 'Вашингтон Кэпиталз'], ['Pittsburgh Penguins', 'Питтсбург Пингвинз'], ['New York Rangers', 'Нью-Йорк Рейнджерс'], ['Boston Bruins', 'Бостон Брюинз']], 0],
  [3, 'hist_lemieux_pens', 'Mario Lemieux won Stanley Cups with:', 'Марио Лемьё выиграл Кубок Стэнли с:', ['Pittsburgh Penguins', 'Edmonton Oilers', 'Detroit Red Wings', 'Montreal Canadiens'], 0],
];

historyQuestions.forEach(([diff, id, en, ru, opts, correct]) => {
  ALL.push(mkQ(id, 'history', diff, correct, en, ru, opts));
});

const generalQuestions = [
  [1, 'gen_rink_length', 'An NHL rink is about how long?', 'Длина площадки NHL примерно:', ['150 ft', '200 ft', '250 ft', '300 ft'], 1],
  [1, 'gen_rink_width', 'An NHL rink is about how wide?', 'Ширина площадки NHL примерно:', ['85 ft', '100 ft', '120 ft', '150 ft'], 0],
  [1, 'gen_zones', 'Blue lines divide the rink into how many zones?', 'Синие линии делят площадку на сколько зон?', ['2', '3', '4', '5'], 1],
  [2, 'gen_red_line', 'The center red line is used for:', 'Красная центральная линия нужна для:', ['Icing calls', 'Offside at center', 'Faceoffs only', 'Penalty box'], 0],
  [2, 'gen_stick_curve', 'Stick blade curve helps with:', 'Изгиб крюка помогает:', ['Skating speed', 'Lifting and controlling puck', 'Goalie saves', 'Fighting'], 1],
  [2, 'gen_skate_hollow', 'Skate hollow affects:', 'Радиус заточки конька влияет на:', ['Stick flex', 'Grip on ice and turns', 'Helmet fit', 'Jersey size'], 1],
  [1, 'gen_shin_guards', 'Shin guards protect the:', 'Щитки защищают:', ['Head', 'Lower legs', 'Hands only', 'Shoulders'], 1],
  [1, 'gen_captain', 'The captain wears letter:', 'Капитан носит букву:', ['A', 'C', 'G', 'W'], 1],
  [1, 'gen_alternate', 'Alternate captains wear:', 'Альтернативные капитаны носят:', ['C', 'A', 'P', 'S'], 1],
  [2, 'gen_home_jersey', 'Home team typically wears:', 'Домашняя команда обычно в:', ['Dark/colored', 'White/light', 'No jerseys', 'Goalie only'], 0],
  [2, 'gen_intermission', 'Intermission between periods is about:', 'Перерыв между периодами около:', ['5 min', '15-18 min', '30 min', '1 hour'], 1],
  [3, 'gen_playoffs', 'NHL playoff series are mostly:', 'Серии плей-офф NHL в основном:', ['Always best of 5', 'Final only', 'Rare exceptions — mostly best of 7', 'Never'], 2],
  [1, 'gen_zamboni', 'A Zamboni is used to:', 'Zamboni используют для:', ['Sharpen skates', 'Resurface ice', 'Measure speed', 'Store pucks'], 1],
  [1, 'gen_ref_stripes', 'On-ice officials wear:', 'Судьи на льду носят:', ['Team jerseys', 'Black and white stripes', 'Goalie gear', 'Suits'], 1],
  [1, 'gen_skates', 'Hockey players move on:', 'Хоккеисты передвигаются на:', [['Ice skates', 'Коньках'], ['Roller skates', 'Роликах'], ['Skis', 'Лыжах'], ['Bare feet', 'Босиком']], 0],
  [1, 'gen_stick', 'Players control the puck with a:', 'Игроки контролируют шайбу с помощью:', [['Stick', 'Клюшки'], ['Hands only', 'Только рук'], ['Net', 'Сетки'], ['Helmet', 'Шлема']], 0],
];

generalQuestions.forEach(([diff, id, en, ru, opts, correct]) => {
  ALL.push(mkQ(id, 'general', diff, correct, en, ru, opts));
});

const players = [
  ['Sidney Crosby', 'Pittsburgh Penguins', 'Center', 1],
  ['Connor McDavid', 'Edmonton Oilers', 'Center', 1],
  ['Nathan MacKinnon', 'Colorado Avalanche', 'Center', 2],
  ['Victor Hedman', 'Tampa Bay Lightning', 'Defenseman', 2],
  ['Carey Price', 'Montreal Canadiens', 'Goalie', 2],
  ['Jaromir Jagr', 'Pittsburgh Penguins', 'Right winger', 2],
  ['Mario Lemieux', 'Pittsburgh Penguins', 'Center', 2],
  ['Patrick Kane', 'Chicago Blackhawks', 'Right winger', 2],
  ['Nicklas Lidstrom', 'Detroit Red Wings', 'Defenseman', 3],
  ['Martin Brodeur', 'New Jersey Devils', 'Goalie', 2],
  ['Steven Stamkos', 'Tampa Bay Lightning', 'Center', 2],
  ['Auston Matthews', 'Toronto Maple Leafs', 'Center', 2],
  ['Leon Draisaitl', 'Edmonton Oilers', 'Center', 2],
  ['Erik Karlsson', 'San Jose Sharks', 'Defenseman', 3],
  ['Pavel Datsyuk', 'Detroit Red Wings', 'Center', 3],
  ['Henrik Lundqvist', 'New York Rangers', 'Goalie', 2],
  ['Evgeni Malkin', 'Pittsburgh Penguins', 'Center', 2],
  ['Artemi Panarin', 'New York Rangers', 'Left winger', 2],
  ['Nikita Kucherov', 'Tampa Bay Lightning', 'Right winger', 2],
  ['Brad Marchand', 'Boston Bruins', 'Left winger', 2],
  ['David Pastrnak', 'Boston Bruins', 'Right winger', 2],
  ['Shea Weber', 'Montreal Canadiens', 'Defenseman', 3],
  ['Sergei Bobrovsky', 'Florida Panthers', 'Goalie', 2],
  ['Jonathan Toews', 'Chicago Blackhawks', 'Center', 2],
  ['Anze Kopitar', 'Los Angeles Kings', 'Center', 2],
  ['Mark Messier', 'Edmonton Oilers', 'Center', 3],
  ['Ray Bourque', 'Boston Bruins', 'Defenseman', 3],
  ['Dominik Hasek', 'Buffalo Sabres', 'Goalie', 3],
  ['Teemu Selanne', 'Anaheim Ducks', 'Right winger', 3],
  ['Pavel Bure', 'Vancouver Canucks', 'Right winger', 3],
  ['Alexander Mogilny', 'Buffalo Sabres', 'Right winger', 3],
  ['Peter Forsberg', 'Colorado Avalanche', 'Center', 3],
  ['Joe Sakic', 'Colorado Avalanche', 'Center', 3],
  ['Steve Yzerman', 'Detroit Red Wings', 'Center', 3],
  ['Bobby Orr', 'Boston Bruins', 'Defenseman', 3],
  ['Gordie Howe', 'Detroit Red Wings', 'Right winger', 1],
  ['Wayne Gretzky', 'Edmonton Oilers', 'Center', 1],
  ['Valeri Kharlamov', 'CSKA Moscow', 'Left winger', 3],
  ['Vladislav Tretiak', 'CSKA Moscow', 'Goalie', 3],
  ['Bobby Hull', 'Chicago Blackhawks', 'Left winger', 3],
  ['Maurice Richard', 'Montreal Canadiens', 'Right winger', 3],
  ['Guy Lafleur', 'Montreal Canadiens', 'Right winger', 3],
  ['Patrick Roy', 'Montreal Canadiens', 'Goalie', 2],
  ['Roberto Luongo', 'Vancouver Canucks', 'Goalie', 2],
  ['Ilya Kovalchuk', 'New Jersey Devils', 'Left winger', 2],
  ['Pavel Bure', 'Florida Panthers', 'Right winger', 3],
  ['Alexei Kovalev', 'Montreal Canadiens', 'Right winger', 3],
  ['Sergei Gonchar', 'Pittsburgh Penguins', 'Defenseman', 3],
  ['Viacheslav Fetisov', 'New Jersey Devils', 'Defenseman', 3],
  ['Chris Chelios', 'Detroit Red Wings', 'Defenseman', 3],
  ['Scott Stevens', 'New Jersey Devils', 'Defenseman', 3],
  ['Paul Coffey', 'Edmonton Oilers', 'Defenseman', 3],
  ['Grant Fuhr', 'Edmonton Oilers', 'Goalie', 3],
  ['Mike Bossy', 'New York Islanders', 'Right winger', 3],
  ['Bryan Trottier', 'New York Islanders', 'Center', 3],
  ['Denis Potvin', 'New York Islanders', 'Defenseman', 3],
  ['Cam Neely', 'Boston Bruins', 'Right winger', 3],
  ['Adam Oates', 'Washington Capitals', 'Center', 3],
  ['Doug Gilmour', 'Toronto Maple Leafs', 'Center', 3],
];

const POSITION_LABELS = {
  Center: ['Center', 'Центральный нападающий'],
  Defenseman: ['Defenseman', 'Защитник'],
  Goalie: ['Goalie', 'Вратарь'],
  'Left winger': ['Left winger', 'Левый крайний нападающий'],
  'Right winger': ['Right winger', 'Правый крайний нападающий'],
};

const WRONG_POSITIONS = {
  Center: [
    ['Left winger', 'Левый крайний нападающий'],
    ['Right winger', 'Правый крайний нападающий'],
    ['Defenseman', 'Защитник'],
  ],
  Defenseman: [
    ['Center', 'Центральный нападающий'],
    ['Left winger', 'Левый крайний нападающий'],
    ['Goalie', 'Вратарь'],
  ],
  Goalie: [
    ['Defenseman', 'Защитник'],
    ['Center', 'Центральный нападающий'],
    ['Right winger', 'Правый крайний нападающий'],
  ],
  'Left winger': [
    ['Right winger', 'Правый крайний нападающий'],
    ['Center', 'Центральный нападающий'],
    ['Defenseman', 'Защитник'],
  ],
  'Right winger': [
    ['Left winger', 'Левый крайний нападающий'],
    ['Center', 'Центральный нападающий'],
    ['Goalie', 'Вратарь'],
  ],
};

const WRONG_TEAMS_POOL = [
  'Toronto Maple Leafs', 'Boston Bruins', 'New York Rangers', 'Montreal Canadiens',
  'Chicago Blackhawks', 'Detroit Red Wings', 'Edmonton Oilers', 'Pittsburgh Penguins',
  'Calgary Flames', 'Vancouver Canucks', 'Ottawa Senators', 'Los Angeles Kings',
];

players.forEach(([name, team, pos, diff], i) => {
  const wrongTeams = WRONG_TEAMS_POOL.filter((t) => t !== team).slice(0, 3);
  ALL.push(mkQ(`pl_team_${i}`, 'players', diff, 0,
    `Which team is ${name} most associated with?`,
    `С какой командой больше всего ассоциируют ${name}?`,
    [team, ...wrongTeams]));
  const correctPos = POSITION_LABELS[pos];
  const wrongPos = WRONG_POSITIONS[pos];
  ALL.push(mkQ(`pl_pos_${i}`, 'players', diff, 0,
    `What position did ${name} primarily play?`,
    `На какой позиции в основном играл ${name}?`,
    [correctPos, ...wrongPos]));
});

// KHL & international
const intl = [
  [2, 'intl_khl_full', 'What does KHL stand for?', 'Как расшифровывается КХЛ?', [['Kontinental Hockey League', 'Континентальная хоккейная лига'], ['King Hockey League', 'Королевская хоккейная лига'], ['Korean Hockey League', 'Корейская хоккейная лига'], ['Kazakh Hockey League', 'Казахстанская хоккейная лига']], 0],
  [2, 'intl_iihf', 'The IIHF organizes:', 'ИИХФ организует:', [['World Championship', 'Чемпионат мира'], ['Stanley Cup', 'Кубок Стэнли'], ['KHL playoffs', 'Плей-офф КХЛ'], ['NHL draft', 'Драфт NHL']], 0],
  [1, 'intl_olympic_surface', 'Olympic hockey is played on:', 'Олимпийский хоккей играют на:', [['Ice', 'Льду'], ['Grass', 'Траве'], ['Sand', 'Песке'], ['Concrete', 'Бетоне']], 0],
  [2, 'intl_czech_gold', 'Which country won many world titles with Jagr and Hašek era stars?', 'Какая страна выигрывала много чемпионатов мира с Ягром и Гашеком?', ['Czechia', 'Canada', 'USA', 'Finland'], 0],
  [2, 'intl_sweden_nhl', 'Many NHL stars come from:', 'Много звёзд NHL приходят из:', [['Sweden', 'Швеции'], ['Brazil', 'Бразилии'], ['Spain', 'Испании'], ['India', 'Индии']], 0],
  [2, 'intl_finland_goalies', 'Finland is known for producing great:', 'Финляндия славится великими:', [['Goalies', 'Вратарями'], ['Referees', 'Судьями'], ['Coaches only', 'Только тренерами'], ['Zamboni drivers', 'Водителями Zamboni']], 0],
  [3, 'intl_red_machine', 'The Soviet "Red Machine" dominated in:', 'Советская «Красная машина» доминировала в:', [['1970s-80s', '1970–80-х'], ['1990s only', 'Только 1990-х'], ['2000s', '2000-х'], ['2010s', '2010-х']], 0],
  [2, 'intl_nhl_draft', 'NHL teams select new players at the:', 'Команды NHL выбирают новичков на:', [['Entry Draft', 'Драфте'], ['Trade deadline', 'Дедлайне обменов'], ['All-Star Game', 'Матче всех звёзд'], ['World Cup', 'Кубке мира']], 0],
  [3, 'intl_three_stars', 'Three stars of the game are awarded:', 'Три звезды матча вручают:', [['After each game', 'После каждого матча'], ['Once a season', 'Раз в сезон'], ['Only in playoffs', 'Только в плей-офф'], ['Never in NHL', 'Никогда в NHL']], 0],
  [2, 'intl_womens_hockey', 'Women\'s hockey is an Olympic sport since:', 'Женский хоккей в Олимпиаде с:', [['1998', '1998'], ['1980', '1980'], ['2010', '2010'], ['Never', 'Никогда']], 0],
];

intl.forEach(([diff, id, en, ru, opts, correct]) => {
  ALL.push(mkQ(id, 'general', diff, correct, en, ru, opts));
});

// Variant questions (_v2) — reworded for variety
const variants = [
  [1, 'rules_skaters_v2', 'In even strength, each team has how many skaters (no goalies)?', 'В равных составах у каждой команды сколько полевых (без вратарей)?', ['4', '5', '6', '7'], 2, 'rules'],
  [1, 'rules_period_len_v2', 'One NHL period lasts how many minutes?', 'Один период NHL длится сколько минут?', ['10', '15', '20', '25'], 2, 'rules'],
  [2, 'terms_pp_v2', 'Your team is on power play when opponent is:', 'Вы на большинстве, когда соперник:', [['Shorthanded from penalty', 'В меньшинстве из-за штрафа'], ['Pulling goalie', 'Снимает вратаря'], ['Icing puck', 'Отправляет в айсинг'], ['Winning faceoff', 'Выигрывает вбрасывание']], 0, 'terms'],
  [2, 'terms_pk_v2', 'Penalty kill means:', 'Игра в меньшинстве означает:', [['Defending while short-handed', 'Защиту в меньшинстве'], ['Extra attacker', 'Лишнего нападающего'], ['Goalie fight', 'Драку вратарей'], ['Overtime', 'Овертайм']], 0, 'terms'],
  [1, 'gen_ice_v2', 'Professional hockey is played on:', 'Профессиональный хоккей играют на:', [['Ice', 'Льду'], ['Grass', 'Траве'], ['Dirt', 'Грунте'], ['Water', 'Воде']], 0, 'general'],
  [2, 'hist_cup_name_v2', 'The NHL championship trophy is the:', 'Трофей чемпиона NHL — это:', [['Stanley Cup', 'Кубок Стэнли'], ['World Cup', 'Кубок мира'], ['Gretzky Cup', 'Кубок Гретцки'], ['Olympic Cup', 'Олимпийский кубок']], 0, 'history'],
  [3, 'hist_most_cups_player', 'Henri Richard won the most Stanley Cups as a player with:', 'Анри Ришар выиграл больше всего Кубков Стэнли с:', ['Montreal Canadiens', 'Toronto Maple Leafs', 'Detroit Red Wings', 'Boston Bruins'], 0, 'history'],
  [3, 'hist_99_gretzky', 'Wayne Gretzky\'s famous jersey number was:', 'Знаменитый номер Уэйна Гретцки:', ['99', '66', '87', '97'], 0, 'players'],
  [2, 'hist_66_lemieux', 'Mario Lemieux wore number:', 'Марио Лемьё носил номер:', ['66', '99', '88', '97'], 0, 'players'],
  [2, 'hist_87_crosby', 'Sidney Crosby wears number:', 'Сидни Кросби носит номер:', ['87', '97', '99', '66'], 0, 'players'],
  [2, 'hist_97_mcdavid', 'Connor McDavid wears number:', 'Коннор Макдэвид носит номер:', ['97', '87', '99', '66'], 0, 'players'],
];

variants.forEach(([diff, id, en, ru, opts, correct, cat]) => {
  ALL.push(mkQ(id, cat, diff, correct, en, ru, opts));
});

// Generate numeric/stat variants for hard questions
const statQs = [
  ['How many teams are in the NHL (approx.)?', 'Сколько команд в NHL (примерно)?', ['32', '28', '24', '40'], 0],
  ['A standard hockey bench has how many players dressed?', 'Сколько игроков обычно заявлено на матч?', ['18-20', '10-12', '25-30', '8-10'], 0],
  ['Regulation time in NHL is how many minutes?', 'Регламент NHL — сколько минут?', ['60', '45', '90', '30'], 0],
  ['How many officials typically on ice in NHL?', 'Сколько судей обычно на льду в NHL?', ['4', '2', '6', '1'], 0],
  ['Maximum players on roster (approx.)?', 'Максимум игроков в заявке (примерно)?', ['23', '15', '30', '10'], 0],
];

statQs.forEach(([en, ru, opts, correct], i) => {
  ALL.push(mkQ(`stat_hard_${i}`, 'rules', 3, correct, en, ru, opts));
  ALL.push(mkQ(`stat_hard_v2_${i}`, 'general', 3, correct,
    en.replace('?', '? (advanced)'),
    ru.replace('?', '? (сложный)'),
    opts));
});

// Professional theory & tactics — especially defense (difficulty 1=easy, 2=medium, 3=hard)
const theoryQuestions = [
  // Easy — basics every player must know
  [1, 'theory_d_primary', 'A defenseman\'s main job in the defensive zone is to:', 'Главная задача защитника в зоне защиты —', [['Protect the net and slot', 'Защищать ворота и слот'], ['Score goals first', 'Сначала забивать голы'], ['Win faceoffs', 'Выигрывать вбрасывания'], ['Change lines quickly', 'Быстро меняться']], 0],
  [1, 'theory_d_body_pos', 'In one-on-one defense, the defender should:', 'В игре один на один защитник должен:', [['Stay between attacker and net', 'Держаться между соперником и воротами'], ['Skate to the bench immediately', 'Сразу кататься на скамейку'], ['Chase behind the net only', 'Гнаться только за воротами'], ['Leave the slot open', 'Оставить слот открытым']], 0],
  [1, 'theory_d_stick_ice', 'Defensive stance: stick on the ice helps to:', 'В защите клюшка на льду помогает:', [['Block passing lanes', 'Закрыть линии паса'], ['Trip teammates', 'Подставить партнёров'], ['Signal timeout', 'Запросить тайм-аут'], ['Avoid hitting puck', 'Не касаться шайбы']], 0],
  [1, 'theory_d_backcheck', 'When the puck is lost in attack, a defenseman should:', 'Если шайба потеряна в атаке, защитник должен:', [['Skate back to help defense', 'Откатиться назад в защиту'], ['Stay at red line', 'Остаться на красной линии'], ['Argue with referee', 'Спорить с судьёй'], ['Pull goalie', 'Снять вратаря']], 0],
  [1, 'theory_d_block', 'A defenseman should block shots when:', 'Защитник должен блокировать бросок, когда:', [['The lane to the net is open', 'Путь к воротам открыт'], ['Puck is in neutral zone only', 'Шайба только в нейтральной зоне'], ['Team is on power play', 'Команда на большинстве'], ['Intermission starts', 'Начинается перерыв']], 0],

  // Medium — situational play
  [2, 'theory_d_2on1', 'On a 2-on-1 against, the defenseman usually should:', 'При игре 2 на 1 в меньшинстве защитник обычно должен:', [['Take the puck carrier and angle him wide', 'Взять владельца шайбы и увести его на край'], ['Both rush the puck carrier together', 'Оба броситься на шайбу одновременно'], ['Both stay at the blue line', 'Оба стоять на синей линии'], ['Skate to the bench', 'Кататься на скамейку']], 0],
  [2, 'theory_d_pk_clear', 'On penalty kill, the priority is often to:', 'В меньшинстве приоритет часто —', [['Clear the puck out of the zone', 'Выбросить шайбу из зоны'], ['Skate with puck up the middle alone', 'Кататься с шайбой через центр в одиночку'], ['Change lines on the fly first', 'Сначала смениться на ходу'], ['Hold puck in corner forever', 'Бесконечно держать шайбу в углу']], 0],
  [2, 'theory_d_gap', 'Good gap control means the defender:', 'Хороший gap control — это когда защитник:', [['Matches speed and distance to the attacker', 'Подстраивает скорость и дистанцию к нападающему'], ['Stays at center ice always', 'Всегда стоит на центре поля'], ['Never backs up', 'Никогда не отступает'], ['Only hits from behind', 'Бьёт только сзади']], 0],
  [2, 'theory_d_net_front', 'In front of the net, a defenseman must:', 'Перед воротами защитник обязан:', [['Box out and tie up opponents', 'Закрывать соперников и не давать свободы'], ['Watch the puck only and ignore players', 'Смотреть только на шайбу, игнорируя соперников'], ['Skate to the point', 'Уехать на синюю линию'], ['Call for offside', 'Требовать офсайд']], 0],
  [2, 'theory_d_breakout', 'Under forecheck pressure, a defenseman\'s first look should be:', 'Под прессингом первый выбор защитника —', [['First pass to low support or safe outlet', 'Первый пас на низкую поддержку или безопасный выход'], ['Always pass through the middle under pressure', 'Всегда пасовать через центр под прессингом'], ['Rim blindly around the boards', 'Слепо отправить шайбу вдоль бортов'], ['Shoot at own net', 'Бросить в свои ворота']], 0],
  [2, 'theory_d_pp_point', 'On power play at the point, a defenseman should:', 'На большинстве с синей линии защитник должен:', [['Keep puck in the zone and create shots/passes', 'Держать шайбу в зоне и создавать броски/пасы'], ['Skate back to neutral zone', 'Откатиться в нейтральную зону'], ['Never shoot', 'Никогда не бросать'], ['Change with goalie', 'Меняться с вратарём']], 0],
  [2, 'theory_d_legal_check', 'A legal defensive play on a rush is:', 'Легальная защита на контратаке — это:', [['Legal angling and stick on puck side', 'Легальное уведение и клюшка со стороны шайбы'], ['Hook and pull opponent down', 'Зацепить и повалить соперника'], ['Stick-check from behind on a breakaway', 'Подрезать клюшкой сзади на выходе один на один'], ['Cross-check to the head', 'Подножка клюшкой в голову']], 0],
  [2, 'theory_d_shot_block', 'Professional defensemen block shots because:', 'Профессионалы блокируют броски, потому что:', [['Block shots and sacrifice body when needed', 'Блокировать броски и закрывать тело при необходимости'], ['Never block shots', 'Никогда не блокировать броски'], ['It counts as an assist', 'Это засчитывается как передача'], ['Referee stops play', 'Судья останавливает игру']], 0],
  [2, 'theory_d_switch', 'When two attackers cross in your zone, defenders should:', 'Когда двое нападающих меняются местами в вашей зоне, защитники должны:', [['Communicate and switch if needed', 'Общаться и при необходимости переключаться'], ['Ignore the far-side attacker', 'Игнорировать дальнего нападающего'], ['Both chase the puck only', 'Оба гнаться только за шайбой'], ['Leave the crease', 'Покинуть площадку вратаря']], 0],
  [2, 'theory_d_dump', 'When opponents dump the puck in, a defenseman should:', 'Если соперник отправил шайбу в зону, защитник должен:', [['Retrieve puck or pin it on the boards', 'Забрать шайбу или прижать к борту'], ['Skate to bench for change', 'Кататься на скамейку для смены'], ['Wait for whistle', 'Ждать свистка'], ['Shoot from red line', 'Бросить с красной линии']], 0],

  // Hard — advanced pro decisions (levels 11–15)
  [3, 'theory_d_3on2_back', 'On a 3-on-2 rush, the back defender should usually:', 'При контратаке 3 на 2 задний защитник обычно должен:', [['Cover the weak-side (backdoor) threat', 'Закрыть угрозу с «слабой» стороны (backdoor)'], ['Pinch aggressively every time', 'Каждый раз агрессивно подключаться в атаку'], ['Skate to the red line', 'Кататься к красной линии'], ['Change lines', 'Меняться']], 0],
  [3, 'theory_d_pinch_when', 'A defenseman may pinch at the offensive blue line when:', 'Защитник может подключиться на синей линии соперника, когда:', [['Partner covers and puck is recoverable at the boards', 'Партнёр прикрывает и шайбу можно забрать у борта'], ['Team is shorthanded', 'Команда в меньшинстве'], ['Always on first shift', 'Всегда в первой смене'], ['Goalie is pulled', 'Вратарь снят']], 0],
  [3, 'theory_d_beat_wide', 'If beaten wide on the rush, the defender should:', 'Если обыграли с фланга на контратаке, защитник должен:', [['Turn and chase through the middle to the net', 'Развернуться и преследовать через центр к воротам'], ['Stop and argue with the referee', 'Остановиться и спорить с судьёй'], ['Skate to the bench', 'Кататься на скамейку'], ['Hook from behind', 'Зацепить сзади']], 0],
  [3, 'theory_d_low_high', 'In defensive zone coverage, low defender vs high defender means:', 'В зоне защиты «низкий» и «высокий» защитник — это:', [['Low on puck, high covers slot and backdoor', 'Низкий на шайбе, высокий закрывает слот и backdoor'], ['Both at the point', 'Оба на синей линии'], ['Both in the crease', 'Оба на площадке вратаря'], ['Both in neutral zone', 'Оба в нейтральной зоне']], 0],
  [3, 'theory_d_odd_man_discipline', 'On an odd-man rush against, the key is:', 'При нечётном контрнаступлении соперника ключ —', [['Delay and force a bad angle or pass', 'Задержать и вынудить плохой угол или пас'], ['Always dive to block', 'Всегда ложиться блоком'], ['Leave the play for goalie alone', 'Оставить всё только вратарю'], ['Take a penalty every time', 'Каждый раз получать штраф']], 0],
  [3, 'theory_d_pp_one_timer', 'On penalty kill vs one-timer from the flank, the defender should:', 'В меньшинстве против one-timer с фланга защитник должен:', [['Take away the pass lane to the slot', 'Закрыть линию паса в слот'], ['Stand in goalie crease', 'Стоять на площадке вратаря'], ['Press the goalie', 'Давить на вратаря'], ['Skate to center for change', 'Кататься на центр для смены']], 0],
  [3, 'theory_d_breakout_rim', 'Why is a blind rim around the boards often bad?', 'Почему слепой «rim» вдоль бортов часто плох?', [['It gives opponents a free retrieve', 'Соперник легко забирает шайбу'], ['It always causes icing', 'Всегда даёт айсинг'], ['It is always offside', 'Всегда офсайд'], ['Referee gives penalty', 'Судья даёт штраф']], 0],
  [3, 'theory_d_fo_win_d', 'After a defensive-zone faceoff win, defensemen should:', 'После выигранного вбрасывания в зоне защиты защитники должны:', [['Read forecheck and use quick first pass', 'Читать форчекинг и быстро отдать первый пас'], ['Always shoot from the point first', 'Всегда сначала бросать с синей линии'], ['Skate to red line with puck', 'Кататься с шайбой к красной линии'], ['Wait five seconds', 'Ждать пять секунд']], 0],
  [3, 'theory_d_late_game_lead', 'Protecting a one-goal lead late, defensemen should:', 'Удерживая преимущество в один гол в концовке, защитники должны:', [['Manage puck safely and avoid unnecessary risks', 'Безопасно владеть шайбой и не рисковать'], ['Pinch every time at blue line', 'Каждый раз подключаться на синей'], ['Always shoot from center', 'Всегда бросать с центра'], ['Pull goalie early always', 'Всегда рано снимать вратаря']], 0],
  [3, 'theory_d_man_coverage', 'Man-on-man in the slot means:', 'Персональная опека в слоте означает:', [['Man-on-man coverage on the puck carrier', 'Персональная опека владельца шайбы'], ['Ignore off-puck threats', 'Игнорировать соперников без шайбы'], ['Only chase the puck', 'Гнаться только за шайбой'], ['Gap control', 'Контроль дистанции (gap)']], 0],
  [3, 'theory_d_offside_line', 'At the offensive blue line, a defenseman holding the line tries to:', 'На синей линии соперника защитник, «держa линию», пытается:', [['Hold the blue line and keep puck in zone', 'Держать синюю линию и оставить шайбу в зоне'], ['Skate back to neutral zone', 'Откатиться в нейтральную зону'], ['Cause offside intentionally always', 'Всегда специально создавать офсайд'], ['Change with forward', 'Меняться с нападающим']], 0],
  [3, 'theory_d_rebound', 'After a save with a rebound in the slot, a defenseman must:', 'После сейва и отскока в слот защитник обязан:', [['Clear the rebound or tie up the attacker', 'Выбить отскок или связать соперника'], ['Skate to the bench', 'Кататься на скамейку'], ['Celebrate with goalie', 'Праздновать с вратарём'], ['Shoot at empty net', 'Бросить в пустые ворота']], 0],
  [3, 'theory_d_timeout_breakout', 'After icing (no-touch) in defensive zone, on the faceoff:', 'После айсинга в зоне защиты на вбрасывании:', [['Set structure and win clean exit', 'Выстроить структуру и чисто выйти из зоны'], ['Always rim the puck', 'Всегда отправлять шайбу вдоль борта'], ['Pull goalie', 'Снять вратаря'], ['Take minor penalty', 'Получить малый штраф']], 0],
  [3, 'theory_d_stretch_pass', 'Against aggressive forecheck, a stretch pass is used to:', 'Против агрессивного форчекинга «stretch»-пас нужен, чтобы:', [['Beat the forecheck with a long pass', 'Обойти прессинг длинным пасом'], ['Guarantee icing', 'Гарантировать айсинг'], ['Stop play for offside always', 'Всегда остановить игру офсайдом'], ['Waste time only', 'Только тянуть время']], 0],
  [3, 'theory_d_shooting_lane', 'Closing a shooting lane means:', 'Закрытие линии броска означает:', [['Getting body/stick in the path of the shot', 'Поставить тело/клюшку на траекторию броска'], ['Standing behind the net', 'Стоять за воротами'], ['Skating to the red line', 'Кататься к красной линии'], ['Waving stick in the air only', 'Только махать клюшкой в воздухе']], 0],
  [3, 'theory_d_partner_trust', 'When your partner pinches, you must:', 'Когда партнёр подключается в атаку, вы должны:', [['Cover high as the last defender', 'Прикрыть «высоко» как последний защитник'], ['Also pinch immediately', 'Тоже сразу подключаться'], ['Skate to the bench', 'Кататься на скамейку'], ['Leave the zone open', 'Оставить зону открытой']], 0],
  [3, 'theory_d_penalty_box_exit', 'Leaving the penalty box, a defenseman should:', 'Выходя из штрафной, защитник должен:', [['Match the play and avoid being caught flat', 'Подстроиться под игру и не оказаться «плоским»'], ['Skate straight to opponent net', 'Кататься прямо к воротам соперника'], ['Ignore the rush', 'Игнорировать контратаку'], ['Always change immediately', 'Всегда сразу меняться']], 0],
  [3, 'theory_d_empty_net', 'With empty net against, defensemen in the last minute should:', 'При пустых воротах соперника в последнюю минуту защитники должны:', [['Block shots and protect the middle', 'Блокировать броски и закрывать центр'], ['All forecheck deep', 'Все глубоко форчекить'], ['Never clear the puck', 'Никогда не выбивать шайбу'], ['Pull own goalie too always', 'Всегда тоже снимать вратаря']], 0],
  [3, 'theory_d_shooting_lane_2', 'If you cannot reach the puck carrier, you should:', 'Если не успеваете к владельцу шайбы, нужно:', [['Take away time and space with good positioning', 'Отнять время и пространство правильной позицией'], ['Give up and change', 'Сдаться и меняться'], ['Hook from behind', 'Зацепить сзади'], ['Leave the slot', 'Оставить слот']], 0],
  [3, 'theory_d_zone_entry', 'Defending a controlled zone entry, the defender should:', 'Против контролируемого входа в зону защитник должен:', [['Stand up at the line or gap early', 'Встретить на линии или рано контролировать gap'], ['Always retreat to the crease', 'Всегда отступать на площадку вратаря'], ['Never touch the attacker', 'Никогда не касаться нападающего'], ['Skate backward to bench', 'Кататься назад на скамейку']], 0],
  [3, 'theory_d_hand_pass_d', 'In the defensive zone, a hand pass by a defender to a teammate is:', 'В зоне защиты пас рукой защитника партнёру — это:', [['Allowed if completed in the same zone', 'Разрешён, если выполнен в той же зоне'], ['Always a penalty shot', 'Всегда буллит'], ['Always offside', 'Всегда офсайд'], ['Always icing', 'Всегда айсинг']], 0],
];

theoryQuestions.forEach(([diff, id, en, ru, opts, correct]) => {
  ALL.push(mkQ(id, 'terms', diff, correct, en, ru, opts));
});

// Forwards — hockey IQ by position
const forwardQuestions = [
  [1, 'theory_f_support', 'When a teammate has the puck, a forward should:', 'Когда у партнёра шайба, нападающий должен:', [['Go to open ice for a pass', 'Выйти на свободное место для паса'], ['Skate to the red line alone always', 'Всегда один кататься к красной линии'], ['Stand still at the blue line', 'Стоять на синей линии'], ['Ignore the puck on line change', 'Игнорировать шайбу при смене']], 0],
  [1, 'theory_f_net', 'A winger near the net on a shot should:', 'Крайний у ворот при броске должен:', [['Go to the net for rebounds and tips', 'Выходить к воротам на отскоки и подставления'], ['Skate to the bench', 'Кататься на скамейку'], ['Wait at center ice', 'Ждать на центре'], ['Only watch from the point', 'Только смотреть с синей линии']], 0],
  [1, 'theory_f_backcheck', 'When possession is lost, forwards must:', 'При потере шайбы нападающие обязаны:', [['Backcheck and help defensively', 'Откатываться и помогать в защите'], ['Change immediately off the ice', 'Сразу уходить на смену'], ['Stay in offensive zone', 'Оставаться в зоне атаки'], ['Argue with the referee', 'Спорить с судьёй']], 0],
  [2, 'theory_f_headman', 'On a rush, "head-manning" the puck means:', 'На контратаке «head-man» означает:', [['Head-man the puck (pass ahead)', 'Отдать шайбу вперёд партнёру'], ['Skate backward to own bench only', 'Кататься назад только к своей скамейке'], ['Dump it high off the glass always', 'Всегда выбивать высоко в стекло'], ['Stop at the red line', 'Остановиться на красной линии']], 0],
  [2, 'theory_f_cycle', 'Cycling the puck low in the offensive zone helps to:', 'Кручение шайбы низом в зоне атаки помогает:', [['Create space for shot or pass', 'Создать пространство для броска/паса'], ['Waste time only', 'Только тянуть время'], ['Guarantee icing', 'Гарантировать айсинг'], ['Force offside always', 'Всегда создавать офсайд']], 0],
  [2, 'theory_f_fo_center', 'On a faceoff, the center\'s job is often to:', 'На вбрасывании центр часто должен:', [['Win the draw to a winger or D-man spot', 'Выиграть вбрасывание на точку партнёра'], ['All three forwards deep in the corner', 'Все трое в углу'], ['Shoot immediately from the dot', 'Сразу бросать с точки'], ['Leave the circle early', 'Рано покидать круг']], 0],
  [2, 'theory_f_forecheck', 'In a 2-1-2 forecheck, F1 and F2 typically:', 'При форчекинге 2-1-2 нападающие F1 и F2 обычно:', [['F1 pressures, F2 takes away pass lane', 'F1 давит, F2 закрывает линию паса'], ['Both stand at the red line', 'Оба стоят на красной линии'], ['Both chase behind the net only', 'Оба только за воротами'], ['Both change lines', 'Оба меняются']], 0],
  [2, 'theory_f_pp_net', 'On power play, a forward at the net-front should:', 'На большинстве нападающий перед воротами должен:', [['Take the net-front on power play', 'Работать перед воротами, экран и отскоки'], ['Cover the point on penalty kill', 'Закрывать синюю линию в меньшинстве'], ['Skate to neutral zone', 'Кататься в нейтральную зону'], ['Never touch the puck', 'Не касаться шайбы']], 0],
  [2, 'theory_f_third_man', 'On a 3-on-2 rush, the third forward should:', 'При контратаке 3 на 2 третий нападающий должен:', [['Stay high as third man on the rush', 'Держаться «высоко» третьим на контратаке'], ['Chase the puck deep without support', 'Гнаться за шайбой глубоко без поддержки'], ['Skate to the bench', 'Кататься на скамейку'], ['Stand in the crease', 'Стоять на площадке вратаря']], 0],
  [2, 'theory_f_winger_wide', 'On a rush, a winger with speed often should:', 'На контратаке быстрый крайний часто должен:', [['Winger drives wide with speed on rush', 'Идти с скоростью по флангу, растягивая защиту'], ['Skate through the middle always', 'Всегда кататься через центр'], ['Stop at the blue line every time', 'Каждый раз останавливаться на синей'], ['Pass backward to the goalie', 'Пасовать назад вратарю']], 0],
  [3, 'theory_f_pp_screen', 'A key power-play role for a forward is to:', 'Важная роль нападающего на большинстве —', [['Screen the goalie on PP', 'Загораживать вратаря и работать на отскоке'], ['Leave the slot open on defense', 'Оставлять слот открытым в защите'], ['Always point shot only', 'Только бросать с синей'], ['Never go to the net', 'Никогда не идти к воротам']], 0],
  [3, 'theory_f_pk_point', 'On penalty kill, a forward often covers:', 'В меньшинстве нападающий часто закрывает:', [['Cover the point on penalty kill', 'Игрока с синей линии (point)'], ['Take the net-front on power play', 'Работу перед воротами на большинстве'], ['The referee', 'Судью'], ['The Zamboni driver', 'Водителя Zamboni']], 0],
  [3, 'theory_f_offside_delay', 'To avoid an offside at the blue line, a forward can:', 'Чтобы не создать офсайд на синей, нападающий может:', [['Stay onside by delaying zone entry', 'Задержать вход в зону, дождаться шайбы'], ['Enter the zone before the puck always', 'Всегда входить раньше шайбы'], ['Skate backward into the zone', 'Кататься назад в зону'], ['Jump over the blue line', 'Перепрыгнуть синюю линию']], 0],
  [3, 'theory_f_one_timer', 'Setting up a one-timer usually requires:', 'One-timer обычно требует:', [['One-timer setup: pass to open shooter', 'Пас на открытого бросающего в темп'], ['Dump and chase without forechecking plan', 'Dump-and-chase без плана'], ['Rim the puck around without looking', 'Слепой rim вдоль борта'], ['Always deke on a penalty shot', 'Всегда обводить на буллите']], 0],
  [3, 'theory_f_crash_net', 'After a point shot on power play, forwards should:', 'После броска с синей на большинстве нападающие должны:', [['Crash the net after shot from point', 'Выходить к воротам на отскок и подставление'], ['All change lines at once', 'Все разом меняться'], ['Skate to neutral zone', 'Уехать в нейтральную зону'], ['Wave to the crowd', 'Махать трибунам']], 0],
  [3, 'theory_f_center_low', 'In offensive zone structure, the center often:', 'В зоне атаки центр часто:', [['Center supports low, wing stays high', 'Поддерживает низ, пока крайний «высоко»'], ['All three forwards deep in the corner', 'Все трое только в углу'], ['Never enters the slot', 'Никогда не заходит в слот'], ['Only covers the point', 'Только закрывает синюю']], 0],
  [3, 'theory_f_weak_side', 'On a breakout, weak-side forward support means:', 'При выходе из зоны поддержка со слабой стороны —', [['Support from the weak side on D-zone exit', 'Быть доступным для паса с «слабой» стороны'], ['Skate to opponent bench for change', 'Кататься к скамейке соперника'], ['Stand still at red line', 'Стоять на красной линии'], ['Shoot at own net', 'Бросать в свои ворота']], 0],
];

// Goalies — positioning, reads, puck play
const goalieQuestions = [
  [1, 'theory_g_track', 'A goalie should always try to:', 'Вратарь всегда должен стараться:', [['Track the puck through traffic', 'Следить за шайбой сквозь трафик'], ['Watch only the shooter\'s eyes', 'Смотреть только в глаза бросающему'], ['Stand at the red line', 'Стоять на красной линии'], ['Leave the net for a line change', 'Покинуть ворота для смены']], 0],
  [1, 'theory_g_freeze', 'When the puck is loose in the crease, the goalie should:', 'Если шайба свободна на площадке, вратарь должен:', [['Freeze the puck to stop play', 'Прижать шайбу и остановить игру'], ['Pass to the referee', 'Отдать шайбу судье'], ['Skate to center ice and celebrate', 'Кататься на центр и праздновать'], ['Shoot at the empty net', 'Бросить в пустые ворота']], 0],
  [1, 'theory_g_rebound', 'After a save, ideal rebound control is:', 'После сейва идеальный контроль отскока —', [['Rebound control to safe area', 'Направить отскок в безопасную зону/угол'], ['Rebound to the slot always', 'Всегда отскок в слот'], ['Rebound over the glass always', 'Всегда отскок за стекло'], ['Ignore the rebound', 'Игнорировать отскок']], 0],
  [2, 'theory_g_comm', 'On odd-man rushes, the goalie should:', 'При нечётных контратаках вратарь должен:', [['Goalie talks on odd-man rushes', 'Громко подсказывать защитникам'], ['Stay silent always', 'Всегда молчать'], ['Skate to the bench', 'Кататься на скамейку'], ['Watch the crowd', 'Смотреть на трибуны']], 0],
  [2, 'theory_g_trapezoid', 'In the NHL, the goalie may play the puck behind the net only in:', 'В NHL вратарь может играть клюшкой за воротами только в:', [['Play puck only in the trapezoid behind net', 'Трапеции за воротами'], ['Full defensive zone', 'Всей зоне защиты'], ['Neutral zone only', 'Только нейтральной зоне'], ['Offensive zone', 'Зоне атаки']], 0],
  [2, 'theory_g_post', 'On a lateral pass across the crease, the goalie uses:', 'При пасе через площадку вратарь использует:', [['Post-to-post movement on lateral passes', 'Движение от штанги к штанге'], ['Always stand on one post only', 'Всегда стоять только на одной штанге'], ['Skate to the blue line', 'Кататься на синюю линию'], ['Leave the net', 'Покидать ворота']], 0],
  [2, 'theory_g_angle', 'Good angle play means the goalie:', 'Хорошая работа углов означает, что вратарь:', [['Angle cut to reduce net visibility', 'Сокращает угол, закрывая обзор ворот'], ['Stands deep in the crease always', 'Всегда глубоко в воротах'], ['Challenges to the red line', 'Выходит к красной линии'], ['Turns back to the shooter', 'Поворачивается спиной к бросающему']], 0],
  [2, 'theory_g_crease', 'The goalie\'s "house" to protect is mainly:', '«Дом» вратаря, который нужно защищать —', [['Protect the house (slot area)', 'Зона слота перед воротами'], ['The penalty box', 'Скамейка штрафников'], ['Center ice circle', 'Центральный круг'], ['The Zamboni door', 'Дверь для Zamboni']], 0],
  [3, 'theory_g_breakaway', 'On a breakaway, many goalies prefer to:', 'На выходе один на один многие вратари предпочитают:', [['Match the shooter and read the release', 'Подстроиться под бросающего и читать бросок'], ['Challenge to the top of the circles always', 'Всегда выходить к верху кругов'], ['Skate toward the bench', 'Кататься к скамейке'], ['Close eyes and hope', 'Закрыть глаза и надеяться']], 0],
  [3, 'theory_g_short_side', 'On a wraparound attempt, the goalie should:', 'При обводке за воротами вратарь должен:', [['Hold the post on short-side wrap', 'Держать штангу на короткой стороне'], ['Leave the near post open', 'Оставить ближнюю штангу открытой'], ['Skate to the point', 'Кататься на синюю'], ['Play the puck in the corner', 'Играть клюшкой в углу']], 0],
  [3, 'theory_g_trapezoid_pen', 'If a goalie plays the puck behind the net OUTSIDE the trapezoid, it is:', 'Если вратарь играет клюшкой за воротами ВНЕ трапеции, это:', [['Delay of game penalty', 'Штраф за задержку игры'], ['Legal play always', 'Всегда разрешено'], ['Automatic goal', 'Автоматический гол'], ['Icing call', 'Айсинг']], 0],
  [3, 'theory_g_screen', 'When the puck is screened, the goalie should:', 'При загораживании броска вратарь должен:', [['Find the puck through traffic or adjust position', 'Найти шайбу сквозь трафик или сдвинуться'], ['Give up the short side always', 'Всегда отдавать короткую сторону'], ['Leave the crease', 'Покинуть площадку'], ['Signal offside', 'Показывать офсайд']], 0],
  [3, 'theory_g_poke', 'A goalie poke check must be:', 'Пок-чек вратаря должен быть:', [['Poke check only from front legally', 'Только спереди и легально'], ['From behind the shooter always', 'Всегда сзади бросающего'], ['With a high stick to the face', 'Высокой клюшкой в лицо'], ['While standing at center ice', 'Стоя на центре поля']], 0],
  [3, 'theory_g_lead_pass', 'On a long lead pass, the goalie often:', 'При длинном пасе в пустые ворота вратарь часто:', [['Stops or plays the puck legally behind the net', 'Останавливает или играет клюшкой легально'], ['Skates to the opponent\'s bench', 'Кататься к скамейке соперника'], ['Ignores the play', 'Игнорирует игру'], ['Shoots at the ref', 'Бросает в судью']], 0],
];

// General hockey IQ — all positions
const teamIQQuestions = [
  [1, 'theory_t_all_defense', 'Hockey intelligence means every player should:', 'Хоккейный интеллект — это когда каждый игрок:', [['Every player helps on defense', 'Помогает в защите при потере шайбы'], ['Only forwards score', 'Только нападающие забрасывают'], ['Only defensemen backcheck', 'Только защитники откатываются'], ['Only goalies talk', 'Только вратарь говорит']], 0],
  [1, 'theory_t_stick_ice', 'Keeping your stick on the ice helps you:', 'Клюшка на льду помогает:', [['Block passing lanes and receive passes', 'Закрыть линии паса и принять шайбу'], ['Trip yourself faster', 'Быстрее подставить себя'], ['Signal icing', 'Показать айсинг'], ['Avoid the puck', 'Избегать шайбы']], 0],
  [1, 'theory_t_change', 'A smart line change usually happens:', 'Умная смена обычно происходит:', [['On the fly when play allows', 'На ходу, когда это безопасно'], ['Always in the offensive zone only', 'Только в зоне атаки'], ['During a breakaway against', 'Во время контратаки соперника'], ['Never on the fly', 'Никогда на ходу']], 0],
  [2, 'theory_t_comm', 'Before switching defensive marks, players should:', 'Перед переключением опеки игроки должны:', [['Communicate before switching marks', 'Общаться («switch» / «mine»)'], ['Never talk on the ice', 'Никогда не говорить на льду'], ['Always yell at the referee', 'Всегда кричать на судью'], ['Change without looking', 'Меняться не глядя']], 0],
  [2, 'theory_t_change_side', 'Changing lines on the wrong side of the ice can:', 'Смена с «неправильной» стороны площадки может:', [['Cause too many men or bad timing', 'Привести к лишнему игроку или плохому таймингу'], ['Always help the team', 'Всегда помогать команде'], ['Guarantee a goal', 'Гарантировать гол'], ['Stop the clock', 'Остановить время']], 0],
  [2, 'theory_t_read_play', 'Reading the play means:', '«Читать игру» означает:', [['Anticipate where puck and opponents go next', 'Предвидеть, куда пойдёт шайба и соперники'], ['Watch only the puck always', 'Смотреть только на шайбу'], ['Ignore teammates', 'Игнорировать партнёров'], ['Never change structure', 'Никогда не менять структуру']], 0],
  [2, 'theory_t_support', 'Second-man support on the puck means:', 'Поддержка «вторым» у шайбы означает:', [['Match speed and support the puck carrier', 'Подстроить скорость и быть доступным для паса'], ['Skate away from the puck', 'Уехать от шайбы'], ['Stand at the red line', 'Стоять на красной линии'], ['Only watch the goalie', 'Только смотреть на вратаря']], 0],
  [2, 'theory_t_strong_weak', 'Strong-side and weak-side refer to:', 'Сильная и слабая сторона — это:', [['Side where puck is vs opposite side', 'Сторона, где шайба, и противоположная'], ['Left and right handed players only', 'Только левые и правые хват'], ['Home and away teams', 'Домашняя и гостевая команды'], ['First and second period', 'Первый и второй период']], 0],
  [3, 'theory_t_pp_structure', 'On power play, structure matters because:', 'На большинстве структура важна, потому что:', [['Movement opens lanes and stretches the PK', 'Движение открывает линии и растягивает меньшинство'], ['Standing still is best', 'Лучше стоять на месте'], ['Only one player should touch the puck', 'Шайбу должен трогать только один'], ['Offside does not matter', 'Офсайд не важен']], 0],
  [3, 'theory_t_pk_box', 'Penalty kill "box + one" often means:', 'Меньшинство «box + one» часто означает:', [['Four in a box, one pressuring the puck', 'Четверо «коробкой», один давит на шайбу'], ['All five chase the puck', 'Все пятеро гонятся за шайбой'], ['All five stand at the red line', 'Все пятеро на красной линии'], ['No structure needed', 'Структура не нужна']], 0],
  [3, 'theory_t_faceoff_cheat', 'Cheating on a faceoff (timing) means:', '«Читинг» на вбрасывании — это:', [['Timing the drop to win the puck early', 'Подстроиться под сброс, чтобы выиграть раньше'], ['Enter the circle before the puck', 'Войти в круг до шайбы'], ['Kick the opponent\'s stick', 'Ударить клюшку соперника ногой'], ['Leave the faceoff dot', 'Уйти с точки вбрасывания']], 0],
  [3, 'theory_t_late_game', 'Protecting a lead late, smart teams:', 'Удерживая лид в концовке, умные команды:', [['Manage puck and avoid unnecessary penalties', 'Контролируют шайбу и избегают лишних штрафов'], ['Take risks every shift', 'Рискуют каждую смену'], ['Always pull goalie in first period', 'Всегда снимают вратаря в первом периоде'], ['Never clear the zone', 'Никогда не выбивают из зоны']], 0],
  [3, 'theory_t_matchup', 'Coaches change lines for matchups to:', 'Тренеры меняют звенья для сочетаний, чтобы:', [['Get favorable player-vs-player situations', 'Получить выгодные пары «игрок на игрока»'], ['Waste time only', 'Только тянуть время'], ['Guarantee offside', 'Гарантировать офсайд'], ['Avoid all faceoffs', 'Избегать всех вбрасываний']], 0],
];

// Referee & linesman signals
const refSignalQuestions = [
  [1, 'ref_goal', 'When a goal is scored, the referee typically:', 'Когда забит гол, судья обычно:', [['Point to center ice', 'Указывает на центр площадки'], ['Signal icing is waived off', 'Показывает отмену айсинга'], ['Signal a delayed penalty', 'Показывает отложенный штраф'], ['Form a T with hands', 'Образует руками букву T']], 0],
  [1, 'ref_timeout', 'A timeout signal looks like:', 'Сигнал тайм-аута выглядит так:', [['Hands form a T', 'Руки образуют букву T'], ['Point to center ice', 'Указание на центр'], ['Six fingers shown', 'Показать шесть пальцев'], ['Both fists pushing forward', 'Оба кулака вперёд']], 0],
  [1, 'ref_delayed', 'A delayed penalty is shown by the referee with:', 'Отложенный штраф судья показывает так:', [['One arm raised straight up', 'Одна рука поднята вверх'], ['Goal scored signal', 'Сигнал гола'], ['Timeout T signal', 'Буква T'], ['Wash out icing signal', 'Отмена айсинга']], 0],
  [2, 'ref_minor', 'When calling a minor penalty, the referee often signals with:', 'Назначая малый штраф, судья часто показывает:', [['Open palm toward penalty box', 'Открытую ладонь в сторону скамейки штрафников'], ['Point to center ice for a goal', 'Указание на центр (гол)'], ['Hands form a T', 'Букву T'], ['Arm across chest only', 'Только руку через грудь']], 0],
  [2, 'ref_offside', 'An offside call by the referee is often signaled with:', 'Офсайд судья часто показывает так:', [['Chopping motion parallel to the ice', 'Рубящее движение параллельно льду'], ['Closed fist pumping motion', 'Движение сжатого кулака'], ['Point to center ice', 'Указание на центр'], ['Six fingers shown', 'Шесть пальцев']], 0],
  [2, 'ref_hand_pass', 'A hand pass violation signal is often:', 'Сигнал нарушения паса рукой часто —', [['Closed fist pumping motion', 'Движение сжатого кулака'], ['Open palm to penalty box', 'Открытая ладонь к скамейке'], ['Both arms crossed for fighting', 'Скрещённые руки (драка)'], ['Point to center ice', 'Указание на центр']], 0],
  [2, 'ref_high_stick', 'High-sticking penalty signal: referee often touches:', 'Сигнал высокой клюшки: судья часто касается:', [['Palm to own face/jaw area', 'Ладонью своего лица/челюсти (уровень удара)'], ['Own knee only', 'Только колена'], ['The puck', 'Шайбы'], ['The goal post', 'Штанги']], 0],
  [2, 'ref_too_many', 'Too many men on the ice is signaled by showing:', 'Лишний игрок на льду показывают так:', [['Six fingers shown', 'Шесть пальцев'], ['One arm straight up only', 'Только одну руку вверх'], ['Hands form a T', 'Букву T'], ['Point to center ice', 'Указание на центр']], 0],
  [2, 'ref_tripping', 'A tripping penalty signal often looks like:', 'Сигнал подножки часто выглядит как:', [['Tripping signal (leg sweep motion)', 'Движение ногой (подметание)'], ['Both fists pushing forward', 'Оба кулака вперёд'], ['Hands form a T', 'Букву T'], ['Point to center ice', 'Указание на центр']], 0],
  [2, 'ref_hooking', 'A hooking penalty signal often looks like:', 'Сигнал зацепа часто выглядит как:', [['Hooking signal (pulling motion)', 'Движение «подтягивания» рукой'], ['Closed fist pumping', 'Сжатый кулак'], ['Six fingers', 'Шесть пальцев'], ['Chopping parallel to ice', 'Рубящее движение']], 0],
  [3, 'ref_cross_check', 'Cross-checking signal by the referee is often:', 'Сигнал подножки клюшкой (cross-check) часто —', [['Both fists pushing forward', 'Оба кулака толкают вперёд'], ['Hands form a T', 'Букву T'], ['Point to center ice', 'Указание на центр'], ['Palm to face only', 'Только ладонь к лицу']], 0],
  [3, 'ref_fighting', 'A fighting major is often signaled with:', 'Большой штраф за драку часто показывают так:', [['Fighting major (both arms crossed)', 'Обе руки скрещены над головой'], ['One arm up for delayed penalty', 'Одна рука вверх (отложенный штраф)'], ['Open palm to box only', 'Только ладонь к скамейке'], ['Chopping offside motion', 'Рубящее движение (офсайд)']], 0],
  [3, 'ref_penalty_shot', 'When awarding a penalty shot, the referee typically:', 'При назначении буллита судья обычно:', [['Points to center ice for penalty shot', 'Указывает на центр / назначает буллит'], ['Shows timeout T', 'Показывает T (тайм-аут)'], ['Shows six fingers', 'Показывает шесть пальцев'], ['Washes out icing', 'Отменяет айсинг']], 0],
  [3, 'ref_no_goal', 'When waving off a goal, the referee may:', 'При отмене гола судья может:', [['Goal disallowed signal (cross arms then wave off)', 'Скрестить руки и отменить гол'], ['Point to center for a goal', 'Указать на центр (гол)'], ['Raise arm for delayed penalty only', 'Только поднять руку (отложенный штраф)'], ['Show timeout T', 'Показать T']], 0],
  [3, 'ref_delay_game', 'Delay of game (puck over glass) signal is often:', 'Задержка игры (шайба за стекло) часто —', [['Delay of game (referee pats imaginary glass)', 'Похлопывание по «стеклу»'], ['Tripping leg sweep', 'Подножка ногой'], ['Hooking pull motion', 'Зацеп «подтягиванием»'], ['Fighting arms crossed', 'Скрещённые руки (драка)']], 0],
  [3, 'ref_linesman_offside', 'A linesman signals offside by:', 'Линейный судья показывает офсайд так:', [['Linesman both arms up (offside)', 'Поднимает обе руки (офсайд)'], ['Point to center ice for goal', 'Указывает на центр (гол)'], ['Open palm to penalty box', 'Ладонь к скамейке'], ['Form a T for timeout', 'Буква T (тайм-аут)']], 0],
  [3, 'ref_icing_wash', 'When icing is waved off (e.g. on PK), linesman may:', 'Если айсинг отменён (напр. в меньшинстве), линейный может:', [['Signal icing is waived off', 'Показать отмену айсинга (рука вниз/«wash out»)'], ['Point to center for a goal', 'Указать на центр (гол)'], ['Show six fingers', 'Показать шесть пальцев'], ['Cross arms for fighting', 'Скрестить руки (драка)']], 0],
  [3, 'ref_double_minor', 'A double minor penalty may be shown with:', 'Двойной малый штраф могут показать так:', [['Double minor (two fingers)', 'Два пальца'], ['Six fingers for too many men', 'Шесть пальцев (лишний игрок)'], ['T for timeout', 'Буква T'], ['One arm straight up only', 'Только одна рука вверх']], 0],
  [2, 'ref_boarding', 'Boarding penalty signal often involves:', 'Сигнал бросания в борт часто включает:', [['Boarding penalty signal (arms pushing)', 'Движение рук «толкание в борт»'], ['Closed fist for hand pass', 'Кулак (пас рукой)'], ['T for timeout', 'Букву T'], ['Point to center for goal', 'Указание на центр (гол)']], 0],
  [2, 'ref_delayed_meaning', 'During a delayed penalty signal, play continues because:', 'При отложенном штрафе игра продолжается, потому что:', [['Delayed penalty (play continues)', 'Нарушившая команда ещё не коснулась шайбы'], ['Goal was scored', 'Был забит гол'], ['Timeout was called', 'Был взят тайм-аут'], ['Icing was completed', 'Айсинг завершён']], 0],
];

forwardQuestions.forEach(([diff, id, en, ru, opts, correct]) => {
  ALL.push(mkQ(id, 'terms', diff, correct, en, ru, opts));
});
goalieQuestions.forEach(([diff, id, en, ru, opts, correct]) => {
  ALL.push(mkQ(id, 'terms', diff, correct, en, ru, opts));
});
teamIQQuestions.forEach(([diff, id, en, ru, opts, correct]) => {
  ALL.push(mkQ(id, 'terms', diff, correct, en, ru, opts));
});
refSignalQuestions.forEach(([diff, id, en, ru, opts, correct]) => {
  ALL.push(mkQ(id, 'rules', diff, correct, en, ru, opts));
});

HOCKEY_IQ_100.forEach(([diff, id, en, ru, opts, correct]) => {
  ALL.push(mkQ(id, 'terms', diff, correct, en, ru, opts));
});

/** Elite pool was only iq_youth — rebalance so diff 4 matches real difficulty + variety. */
const KEEP_IQ_AT_DIFF4 = new Set([
  'iq_youth_076',
  'iq_youth_077',
  'iq_youth_088',
  'iq_youth_091',
  'iq_youth_092',
  'iq_youth_096',
  'iq_youth_097',
]);

const PROMOTE_TO_DIFF4 = new Set([
  'theory_d_3on2_back',
  'theory_d_pinch_when',
  'theory_d_odd_man_discipline',
  'theory_d_pp_one_timer',
  'theory_d_partner_trust',
  'theory_d_zone_entry',
  'theory_d_late_game_lead',
  'theory_d_stretch_pass',
  'theory_f_one_timer',
  'theory_f_offside_delay',
  'theory_g_breakaway',
  'theory_g_trapezoid_pen',
  'theory_t_matchup',
  'theory_t_faceoff_cheat',
  'rules_breakaway_penalty',
  'rules_trapezoid',
  'terms_plus_minus',
  'terms_enforcer',
  'ref_penalty_shot',
  'ref_fighting',
  'ref_no_goal',
  'ref_cross_check',
  'hist_most_cups_player',
  'hist_99_gretzky',
]);

function applyDifficultyRebalance(questions) {
  for (const q of questions) {
    if (q.id.startsWith('iq_youth_') && q.difficulty === 4 && !KEEP_IQ_AT_DIFF4.has(q.id)) {
      q.difficulty = 3;
    } else if (PROMOTE_TO_DIFF4.has(q.id) && q.difficulty === 3) {
      q.difficulty = 4;
    }
  }
}

applyDifficultyRebalance(ALL);


// Deduplicate
const seen = new Set();
const unique = ALL.filter((q) => {
  if (seen.has(q.id)) return false;
  seen.add(q.id);
  return true;
});

function serializeQuestion(q) {
  const questionBlock = LANGS.map((l) => `      ${l}: ${JSON.stringify(q.q[l])},`).join('\n');
  const opts = q.o;
  let optionsBlock;
  if (typeof opts[0] === 'string') {
    optionsBlock = `[${opts.map((s) => JSON.stringify(s)).join(', ')}]`;
  } else {
    optionsBlock = `[\n${opts.map((opt) => {
      if (typeof opt === 'string') {
        return `      ${JSON.stringify(opt)}`;
      }
      const lines = LANGS.map((l) => {
        const val = opt[l] ?? opt.en ?? opt.ru ?? '';
        return `        ${l}: ${JSON.stringify(val)},`;
      }).join('\n');
      return `      {\n${lines}\n      }`;
    }).join(',\n')}\n    ]`;
  }
  return `  {
    id: ${JSON.stringify(q.id)},
    category: ${JSON.stringify(q.category)},
    difficulty: ${q.difficulty},
    correctIndex: ${q.correct},
    question: {
${questionBlock}
    },
    options: ${optionsBlock},
  }`;
}

const out = `/* AUTO-GENERATED — run: node scripts/generateHockeyQuizQuestions.js */
import type { QuizQuestion } from './types';

export const HOCKEY_QUIZ_QUESTIONS: QuizQuestion[] = [
${unique.map(serializeQuestion).join(',\n')}
];
`;

const target = path.join(__dirname, '..', 'data', 'hockeyQuiz', 'questions.ts');
fs.writeFileSync(target, out, 'utf8');
console.log(`Generated ${unique.length} questions -> ${target}`);

const i18nDir = path.join(__dirname, '..', 'data', 'hockeyQuiz', 'i18n');
if (!fs.existsSync(i18nDir)) fs.mkdirSync(i18nDir, { recursive: true });

function buildI18nBundle(sourceLang) {
  const bundle = {};
  for (const q of unique) {
    const options = q.o.map((opt) => (typeof opt === 'string' ? opt : opt[sourceLang] || opt.en || opt.ru || ''));
    bundle[q.id] = {
      question: q.q[sourceLang] || q.q.en || q.q.ru || '',
      options,
    };
  }
  return bundle;
}

const enBundle = buildI18nBundle('en');
const ruBundle = buildI18nBundle('ru');
fs.writeFileSync(path.join(i18nDir, 'en.json'), JSON.stringify(enBundle, null, 2), 'utf8');
fs.writeFileSync(path.join(i18nDir, 'ru.json'), JSON.stringify(ruBundle, null, 2), 'utf8');
console.log(`Exported i18n/en.json and i18n/ru.json (${unique.length} questions each)`);

const TARGET_LANGS = ['lt', 'lv', 'pl', 'sv', 'cs', 'sk', 'fi', 'it', 'de', 'fr'];
for (const lang of TARGET_LANGS) {
  const langPath = path.join(i18nDir, `${lang}.json`);
  if (!fs.existsSync(langPath)) {
    fs.writeFileSync(langPath, JSON.stringify(enBundle, null, 2), 'utf8');
    console.log(`Placeholder i18n/${lang}.json (copy of EN — run translateQuizI18n.js)`);
  }
}
console.log('Run: node scripts/translateQuizI18n.js — for real lt/lv/pl/sv/cs/sk/fi/it/de/fr translations');
