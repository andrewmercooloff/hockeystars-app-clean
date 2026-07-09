/**
 * 50 hockey exercises (66–115), Russian + English source texts.
 */
function ex(id, category, categoryEn, difficulty, difficultyEn, duration, durationEn, ru, en) {
  return {
    id,
    category,
    categoryEn,
    difficulty,
    difficultyEn,
    duration,
    durationEn,
    ru,
    en,
  };
}

module.exports = [
  ex('66', 'Сила', 'Strength', 'Средний', 'Intermediate', '15 мин', '15 min', {
    title: 'Боковая планка с вращением корпуса',
    description: 'Укрепляет косые мышцы и стабилизаторы корпуса — важно для силы удара и устойчивости в силовых дуэлях.',
    benefits: ['Стабилизирует корпус при силовой борьбе', 'Улучшает ротационную силу удара', 'Снижает риск травм поясницы', 'Развивает выносливость кора'],
    instructions: ['Примите боковую планку на предплечье', 'Вытяните свободную руку вверх', 'Медленно проведите руку под корпусом и верните', 'Держите таз стабильным без провисания', 'Выполните 8–10 повторов на каждую сторону'],
    tips: ['Не торопитесь с вращением', 'Дышите ровно', 'Начните с коленей при необходимости', '2–3 подхода на сторону'],
    equipment: 'Коврик',
    calories: '120–180 ккал',
  }, {
    title: 'Side plank with torso rotation',
    description: 'Builds obliques and core stabilizers for shot power and body checking stability.',
    benefits: ['Stabilizes core in contact', 'Improves rotational shot power', 'Reduces lower-back injury risk', 'Builds core endurance'],
    instructions: ['Set up a forearm side plank', 'Reach top arm toward the ceiling', 'Sweep arm under torso and return', 'Keep hips level without sagging', 'Do 8–10 reps per side'],
    tips: ['Rotate slowly with control', 'Breathe steadily', 'Drop to knees if needed', '2–3 sets per side'],
    equipment: 'Exercise mat',
    calories: '120–180 kcal',
  }),

  ex('67', 'Сила', 'Strength', 'Продвинутый', 'Advanced', '20 мин', '20 min', {
    title: 'Румынская тяга с гантелями',
    description: 'Развивает заднюю цепь — ключевую для мощного катания и стартового ускорения.',
    benefits: ['Укрепляет бицепс бедра и ягодицы', 'Улучшает механику наклона вперёд в skating', 'Повышает силу хвата', 'Помогает профилактике травм hamstring'],
    instructions: ['Встаньте с гантелями перед бёдрами', 'Слегка согните колени', 'Отводите таз назад, опуская гантели по ногам', 'До середины голени или лёгкого натяжения', 'Вернитесь, толкая таз вперёд'],
    tips: ['Спина прямая на всём протяжении', 'Гантели близко к ногам', 'Не округляйте поясницу', '3–4 подхода по 8–12 повторов'],
    equipment: 'Гантели',
    calories: '200–280 ккал',
  }, {
    title: 'Dumbbell Romanian deadlift',
    description: 'Develops the posterior chain for powerful skating and first-step acceleration.',
    benefits: ['Strengthens hamstrings and glutes', 'Improves forward lean mechanics', 'Builds grip strength', 'Supports hamstring injury prevention'],
    instructions: ['Stand holding dumbbells at thighs', 'Keep a slight knee bend', 'Hinge hips back, lowering bells along legs', 'Stop at mid-shin or mild stretch', 'Drive hips forward to stand'],
    tips: ['Keep a neutral spine', 'Weights stay close to legs', 'Avoid rounding lower back', '3–4 sets of 8–12 reps'],
    equipment: 'Dumbbells',
    calories: '200–280 kcal',
  }),

  ex('68', 'Сила', 'Strength', 'Средний', 'Intermediate', '15 мин', '15 min', {
    title: 'Гоблет-присед',
    description: 'Безопасный присед для хоккеистов — укрепляет ноги и кор, улучшает глубину посадки.',
    benefits: ['Развивает силу квадрицепсов', 'Учит держать корпус вертикально', 'Улучшает мобильность голеностопа', 'Подходит для off-ice в сезон'],
    instructions: ['Держите гантель или kettlebell у груди', 'Ноги на ширине плеч, носки слегка наружу', 'Приседайте до параллели или ниже', 'Колени следуют за носками', '3–4 подхода по 10–15 повторов'],
    tips: ['Локти внутрь коленей в нижней точке', 'Пятки на полу', 'Не отрывайте пятки', 'Контролируйте темп вниз'],
    equipment: 'Гантель или kettlebell',
    calories: '180–250 ккал',
  }, {
    title: 'Goblet squat',
    description: 'A hockey-friendly squat pattern for leg and core strength with upright posture.',
    benefits: ['Builds quad strength', 'Teaches vertical torso position', 'Improves ankle mobility', 'Good in-season off-ice option'],
    instructions: ['Hold a dumbbell or kettlebell at chest', 'Feet shoulder-width, toes slightly out', 'Squat to parallel or below', 'Knees track over toes', '3–4 sets of 10–15 reps'],
    tips: ['Elbows inside knees at bottom', 'Heels stay down', 'Control the descent', 'Stay tall through chest'],
    equipment: 'Dumbbell or kettlebell',
    calories: '180–250 kcal',
  }),

  ex('69', 'Сила', 'Strength', 'Средний', 'Intermediate', '12 мин', '12 min', {
    title: 'Ротационная тяга резиной',
    description: 'Имитирует ротацию при броске и пасе — развивает силу корпуса в хоккейной плоскости.',
    benefits: ['Усиливает бросок и пас', 'Тренирует анти-ротационную стабильность', 'Безопасная нагрузка для плеч', 'Можно выполнять дома'],
    instructions: ['Закрепите резину на уровне груди', 'Встаньте боком к точке крепления', 'Держите клюшку или рукоятку двумя руками', 'Выполняйте контролируемую ротацию от бедра', '12–15 повторов на каждую сторону'],
    tips: ['Работайте из ног, не только руками', 'Не перекручивайте поясницу', 'Сохраняйте стойку как на льду', '2–3 подхода'],
    equipment: 'Резиновый амортизатор',
    calories: '100–150 ккал',
  }, {
    title: 'Band rotational chop',
    description: 'Mimics shot and pass rotation to build power in the hockey movement plane.',
    benefits: ['Improves shot and pass power', 'Trains anti-rotation stability', 'Shoulder-friendly loading', 'Can be done at home'],
    instructions: ['Anchor band at chest height', 'Stand sideways to anchor', 'Hold stick or handle with both hands', 'Rotate from hips with control', '12–15 reps each side'],
    tips: ['Power comes from hips', 'Protect lower back from over-rotation', 'Use athletic hockey stance', '2–3 sets'],
    equipment: 'Resistance band',
    calories: '100–150 kcal',
  }),

  ex('70', 'Сила', 'Strength', 'Средний', 'Intermediate', '12 мин', '12 min', {
    title: 'Ягодичный мост на одной ноге',
    description: 'Активирует ягодицы и стабилизаторы таза — важно для мощного отталкивания на коньках.',
    benefits: ['Укрепляет ягодичные', 'Стабилизирует таз при катании', 'Улучшает симметрию ног', 'Помогает профилактике травм колена'],
    instructions: ['Лягте на спину, одна нога согнута', 'Вторая нога вытянута или согнута в воздухе', 'Поднимайте таз до линии бёдер-корпус', 'Пауза 1 сек вверху', '10–12 повторов на ногу'],
    tips: ['Не прогибайте поясницу', 'Колено опорной ноги не заваливается внутрь', 'Сжимайте ягодицу вверху', '2–3 подхода'],
    equipment: 'Коврик',
    calories: '90–130 ккал',
  }, {
    title: 'Single-leg glute bridge',
    description: 'Activates glutes and hip stabilizers for powerful push-off on skates.',
    benefits: ['Strengthens glutes', 'Stabilizes pelvis while skating', 'Improves leg symmetry', 'Supports knee injury prevention'],
    instructions: ['Lie on back, one foot planted', 'Other leg extended or bent in air', 'Drive hips up to straight line', 'Pause 1 second at top', '10–12 reps per leg'],
    tips: ['Avoid lumbar hyperextension', 'Keep working knee aligned', 'Squeeze glute at top', '2–3 sets'],
    equipment: 'Exercise mat',
    calories: '90–130 kcal',
  }),

  ex('71', 'Сила', 'Strength', 'Начинающий', 'Beginner', '10 мин', '10 min', {
    title: 'Подъёмы на носки стоя',
    description: 'Укрепляет икроножные и стопы — выносливость ног в конце смены и стабильность конька.',
    benefits: ['Улучшает силу икр', 'Снижает усталость голени в матче', 'Укрепляет стопу', 'Быстрое упражнение в раздевалке'],
    instructions: ['Встаньте на возвышение носками', 'Медленно опуститесь ниже уровня платформы', 'Поднимитесь на максимум', 'Пауза вверху', '15–20 повторов, 3 подхода'],
    tips: ['Держитесь за стену для баланса', 'Полная амплитуда', 'Не пружиньте резко', 'Можно с лёгким весом'],
    equipment: 'Ступенька или платформа',
    calories: '60–90 ккал',
  }, {
    title: 'Standing calf raises',
    description: 'Builds calves and feet for late-shift leg endurance and skate stability.',
    benefits: ['Improves calf strength', 'Reduces lower-leg fatigue in games', 'Strengthens feet', 'Quick locker-room option'],
    instructions: ['Stand on edge of step on balls of feet', 'Lower heels below step level', 'Rise as high as possible', 'Pause at top', '15–20 reps, 3 sets'],
    tips: ['Use wall for balance if needed', 'Full range of motion', 'Avoid bouncing', 'Add light weight when ready'],
    equipment: 'Step or platform',
    calories: '60–90 kcal',
  }),

  ex('72', 'Сила', 'Strength', 'Средний', 'Intermediate', '12 мин', '12 min', {
    title: 'Планка с касанием плеч',
    description: 'Анти-ротационная работа кора — устойчивость при силовых контактах и в стойке вратаря.',
    benefits: ['Тренирует стабильность корпуса', 'Улучшает контроль при контакте', 'Развивает выносливость кора', 'Подходит всем позициям'],
    instructions: ['Примите планку на прямых руках', 'Перенесите вес, коснитесь противоположного плеча', 'Вернитесь, смените руку', 'Таз не качается из стороны в сторону', '16–20 касаний всего'],
    tips: ['Ширина ног чуть больше плеч для стабильности', 'Не поднимайте таз', 'Дышите спокойно', '2–3 подхода'],
    equipment: 'Коврик',
    calories: '80–120 ккал',
  }, {
    title: 'Plank shoulder taps',
    description: 'Anti-rotation core work for contact stability and athletic posture.',
    benefits: ['Builds core stability', 'Improves balance under contact', 'Develops core endurance', 'Works for all positions'],
    instructions: ['Start in high plank', 'Shift weight and tap opposite shoulder', 'Return and alternate arms', 'Keep hips square', '16–20 total taps'],
    tips: ['Widen feet for stability', 'Do not pike hips up', 'Breathe steadily', '2–3 sets'],
    equipment: 'Exercise mat',
    calories: '80–120 kcal',
  }),
];
