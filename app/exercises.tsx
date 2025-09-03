import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    ImageBackground,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { getExerciseCompletionCount, getExerciseRankings, loadCurrentUser } from '../utils/playerStorage';

const { width } = Dimensions.get('window');

// Типы для упражнений
interface Exercise {
  id: string;
  title: string;
  description: string;
  category: string;
  duration: string;
  difficulty: 'Начинающий' | 'Средний' | 'Продвинутый';
  image?: string;
}

// Данные упражнений
const exercisesData: Exercise[] = [
  // Выносливость
  {
    id: '1',
    title: 'Интервальный бег',
    description: 'Чередование быстрого бега (30 сек) и медленного (30 сек) в течение 20 минут. Отлично развивает кардио-выносливость для хоккея.',
    category: 'Выносливость',
    duration: '20-30 мин',
    difficulty: 'Средний',
  },
  {
    id: '2',
    title: 'Берпи с прыжком',
    description: 'Комплексное упражнение: присед → планка → отжимание → присед → прыжок. Выполнять 3 подхода по 10-15 повторений.',
    category: 'Выносливость',
    duration: '15-20 мин',
    difficulty: 'Продвинутый',
  },
  {
    id: '3',
    title: 'Велосипед',
    description: 'Интенсивная езда на велосипеде или велотренажере с интервалами высокой нагрузки. 5 минут разминки, 20 минут интервалов.',
    category: 'Выносливость',
    duration: '25-30 мин',
    difficulty: 'Средний',
  },
  {
    id: '16',
    title: 'Гребля на тренажере',
    description: 'Интервальная гребля: 2 минуты высокой интенсивности, 1 минута отдыха. 8-10 циклов для развития выносливости.',
    category: 'Выносливость',
    duration: '25-30 мин',
    difficulty: 'Средний',
  },
  {
    id: '17',
    title: 'Скакалка с интервалами',
    description: 'Чередование быстрых прыжков (30 сек) и медленных (30 сек). 20 минут для развития кардио-выносливости.',
    category: 'Выносливость',
    duration: '20 мин',
    difficulty: 'Средний',
  },
  {
    id: '18',
    title: 'Бег по лестнице',
    description: 'Бег вверх по лестнице с максимальной скоростью, спуск шагом. 10-15 подъемов для развития выносливости ног.',
    category: 'Выносливость',
    duration: '20-25 мин',
    difficulty: 'Продвинутый',
  },
  {
    id: '19',
    title: 'Планка с движениями',
    description: 'Удержание планки с поочередным подъемом рук и ног. 3 подхода по 45-60 секунд для укрепления кора.',
    category: 'Выносливость',
    duration: '15 мин',
    difficulty: 'Средний',
  },
  {
    id: '20',
    title: 'Бег с высоким подниманием колен',
    description: 'Бег на месте с максимальным подниманием коленей к груди. 5 подходов по 2 минуты с отдыхом 1 минута.',
    category: 'Выносливость',
    duration: '15 мин',
    difficulty: 'Начинающий',
  },

  // Взрывная скорость
  {
    id: '4',
    title: 'Плиометрические прыжки',
    description: 'Прыжки на месте с максимальной высотой, приземление на полусогнутые ноги. 3 подхода по 15-20 прыжков.',
    category: 'Взрывная скорость',
    duration: '10-15 мин',
    difficulty: 'Средний',
  },
  {
    id: '5',
    title: 'Спринты на короткие дистанции',
    description: 'Бег на максимальной скорости на дистанции 20-30 метров с отдыхом 30 секунд между забегами. 8-10 забегов.',
    category: 'Взрывная скорость',
    duration: '15-20 мин',
    difficulty: 'Начинающий',
  },
  {
    id: '6',
    title: 'Броски мяча в стену',
    description: 'Броски медицинского мяча в стену с максимальной силой, ловля и повторный бросок. 3 подхода по 20 бросков.',
    category: 'Взрывная скорость',
    duration: '15 мин',
    difficulty: 'Средний',
  },
  {
    id: '21',
    title: 'Прыжки в длину с места',
    description: 'Прыжки вперед с максимальной дальностью, приземление на обе ноги. 5 подходов по 8-10 прыжков.',
    category: 'Взрывная скорость',
    duration: '12 мин',
    difficulty: 'Средний',
  },
  {
    id: '22',
    title: 'Быстрые отжимания',
    description: 'Отжимания с максимальной скоростью, касание грудью пола. 4 подхода по 15-20 повторений.',
    category: 'Взрывная скорость',
    duration: '15 мин',
    difficulty: 'Продвинутый',
  },
  {
    id: '23',
    title: 'Прыжки через препятствия',
    description: 'Прыжки через конусы или барьеры высотой 30-40 см. 3 прохода по 10 препятствий.',
    category: 'Взрывная скорость',
    duration: '15 мин',
    difficulty: 'Продвинутый',
  },
  {
    id: '24',
    title: 'Быстрые приседания',
    description: 'Приседания с максимальной скоростью, бедра параллельно полу. 4 подхода по 20-25 повторений.',
    category: 'Взрывная скорость',
    duration: '12 мин',
    difficulty: 'Средний',
  },
  {
    id: '25',
    title: 'Броски набивного мяча',
    description: 'Броски тяжелого мяча (5-8 кг) от груди с максимальной силой. 3 подхода по 15 бросков.',
    category: 'Взрывная скорость',
    duration: '15 мин',
    difficulty: 'Продвинутый',
  },

  // Разминка
  {
    id: '7',
    title: 'Динамическая растяжка ног',
    description: 'Махи ногами вперед, назад и в стороны, круговые движения в тазобедренных суставах. 10-15 повторений каждой ногой.',
    category: 'Разминка',
    duration: '10 мин',
    difficulty: 'Начинающий',
  },
  {
    id: '8',
    title: 'Разминка верхней части тела',
    description: 'Круговые движения руками, наклоны туловища, повороты. Разогрев плечевых суставов и спины.',
    category: 'Разминка',
    duration: '8-10 мин',
    difficulty: 'Начинающий',
  },
  {
    id: '9',
    title: 'Легкий бег на месте',
    description: 'Бег на месте с высоким подниманием коленей, постепенное увеличение темпа. 5-7 минут.',
    category: 'Разминка',
    duration: '5-7 мин',
    difficulty: 'Начинающий',
  },
  {
    id: '26',
    title: 'Разминка голеностопа',
    description: 'Круговые движения стопами, сгибание-разгибание пальцев ног. 2-3 минуты для каждой ноги.',
    category: 'Разминка',
    duration: '5 мин',
    difficulty: 'Начинающий',
  },
  {
    id: '27',
    title: 'Разминка шеи',
    description: 'Плавные повороты головы, наклоны вперед-назад, круговые движения. 2-3 минуты.',
    category: 'Разминка',
    duration: '3 мин',
    difficulty: 'Начинающий',
  },
  {
    id: '28',
    title: 'Разминка запястий',
    description: 'Круговые движения кистями, сгибание-разгибание пальцев. 2-3 минуты для каждой руки.',
    category: 'Разминка',
    duration: '5 мин',
    difficulty: 'Начинающий',
  },
  {
    id: '29',
    title: 'Разминка коленей',
    description: 'Полуприседания, круговые движения коленями, легкие прыжки на месте. 3-4 минуты.',
    category: 'Разминка',
    duration: '4 мин',
    difficulty: 'Начинающий',
  },
  {
    id: '30',
    title: 'Разминка тазобедренных суставов',
    description: 'Круговые движения бедрами, махи ногами в стороны, легкие выпады. 4-5 минут.',
    category: 'Разминка',
    duration: '5 мин',
    difficulty: 'Начинающий',
  },

  // Растяжка
  {
    id: '10',
    title: 'Статическая растяжка мышц ног',
    description: 'Удержание позиций растяжки для квадрицепсов, икроножных мышц и приводящих мышц. 30 секунд на каждую группу.',
    category: 'Растяжка',
    duration: '15 мин',
    difficulty: 'Начинающий',
  },
  {
    id: '11',
    title: 'Растяжка спины и плеч',
    description: 'Наклоны вперед, растяжка грудных мышц, растяжка трицепсов. Удержание каждой позиции 20-30 секунд.',
    category: 'Растяжка',
    duration: '12-15 мин',
    difficulty: 'Начинающий',
  },
  {
    id: '12',
    title: 'Йога для хоккеистов',
    description: 'Комплекс асан для развития гибкости и баланса: поза воина, поза дерева, поза собаки мордой вниз.',
    category: 'Растяжка',
    duration: '20 мин',
    difficulty: 'Средний',
  },
  {
    id: '31',
    title: 'Растяжка паха',
    description: 'Бабочка - сидя на полу, соединить стопы и наклониться вперед. Удержание 30-45 секунд.',
    category: 'Растяжка',
    duration: '10 мин',
    difficulty: 'Начинающий',
  },
  {
    id: '32',
    title: 'Растяжка подколенных сухожилий',
    description: 'Наклоны вперед к прямым ногам, удержание 30 секунд. 3 подхода по 15 секунд.',
    category: 'Растяжка',
    duration: '8 мин',
    difficulty: 'Начинающий',
  },
  {
    id: '33',
    title: 'Растяжка икроножных мышц',
    description: 'Выпады с упором на стену, растяжка задней поверхности голени. 20 секунд на каждую ногу.',
    category: 'Растяжка',
    duration: '8 мин',
    difficulty: 'Начинающий',
  },
  {
    id: '34',
    title: 'Растяжка грудных мышц',
    description: 'Растяжка у стены с отведением рук назад. Удержание 30 секунд, 3 подхода.',
    category: 'Растяжка',
    duration: '10 мин',
    difficulty: 'Начинающий',
  },
  {
    id: '35',
    title: 'Растяжка трицепсов',
    description: 'Заведение руки за голову, растяжка задней поверхности плеча. 20 секунд на каждую руку.',
    category: 'Растяжка',
    duration: '8 мин',
    difficulty: 'Начинающий',
  },

  // Ловкость
  {
    id: '13',
    title: 'Лестница координации',
    description: 'Быстрые движения ногами через лестницу: боковые шаги, скрестные шаги, прыжки. 3 прохода каждого типа.',
    category: 'Ловкость',
    duration: '15 мин',
    difficulty: 'Средний',
  },
  {
    id: '14',
    title: 'Жонглирование мячами',
    description: 'Жонглирование 2-3 теннисными мячами для развития координации рук и глаз. Начинать с 1 мяча.',
    category: 'Ловкость',
    duration: '10-15 мин',
    difficulty: 'Средний',
  },
  {
    id: '15',
    title: 'Быстрые касания конусов',
    description: 'Расставить 5-6 конусов и быстро касаться их рукой в случайном порядке. 3 подхода по 30 секунд.',
    category: 'Ловкость',
    duration: '12 мин',
    difficulty: 'Продвинутый',
  },
  {
    id: '36',
    title: 'Змейка между конусами',
    description: 'Бег змейкой между конусами, расставленными в линию. 5 проходов с максимальной скоростью.',
    category: 'Ловкость',
    duration: '15 мин',
    difficulty: 'Средний',
  },
  {
    id: '37',
    title: 'Быстрые касания ногами',
    description: 'Быстрые касания конусов ногами в случайном порядке. 3 подхода по 45 секунд.',
    category: 'Ловкость',
    duration: '15 мин',
    difficulty: 'Продвинутый',
  },
  {
    id: '38',
    title: 'Прыжки с поворотами',
    description: 'Прыжки на месте с поворотами на 90-180 градусов. 3 подхода по 20 прыжков.',
    category: 'Ловкость',
    duration: '12 мин',
    difficulty: 'Средний',
  },
  {
    id: '39',
    title: 'Быстрые передачи мяча',
    description: 'Передачи теннисного мяча между руками с максимальной скоростью. 3 подхода по 1 минуте.',
    category: 'Ловкость',
    duration: '10 мин',
    difficulty: 'Средний',
  },
  {
    id: '40',
    title: 'Бег спиной вперед',
    description: 'Бег спиной вперед с быстрыми поворотами по сигналу. 5 подходов по 30 секунд.',
    category: 'Ловкость',
    duration: '15 мин',
    difficulty: 'Продвинутый',
  },

  // Сила
  {
    id: '41',
    title: 'Приседания с весом',
    description: 'Приседания с гантелями или штангой, бедра параллельно полу. 4 подхода по 12-15 повторений.',
    category: 'Сила',
    duration: '20 мин',
    difficulty: 'Продвинутый',
  },
  {
    id: '42',
    title: 'Становая тяга',
    description: 'Подъем штанги с пола до уровня бедер с прямой спиной. 3 подхода по 8-10 повторений.',
    category: 'Сила',
    duration: '25 мин',
    difficulty: 'Продвинутый',
  },
  {
    id: '43',
    title: 'Жим лежа',
    description: 'Жим штанги от груди лежа на скамье. 4 подхода по 8-12 повторений.',
    category: 'Сила',
    duration: '20 мин',
    difficulty: 'Продвинутый',
  },
  {
    id: '44',
    title: 'Подтягивания',
    description: 'Подтягивания на перекладине до касания подбородком. 3 подхода по 8-12 повторений.',
    category: 'Сила',
    duration: '15 мин',
    difficulty: 'Продвинутый',
  },
  {
    id: '45',
    title: 'Отжимания на брусьях',
    description: 'Отжимания на параллельных брусьях с опусканием до угла 90 градусов. 3 подхода по 10-15 повторений.',
    category: 'Сила',
    duration: '15 мин',
    difficulty: 'Продвинутый',
  },

  // Баланс и стабильность
  {
    id: '46',
    title: 'Стойка на одной ноге',
    description: 'Удержание равновесия на одной ноге с закрытыми глазами. 3 подхода по 30 секунд на каждую ногу.',
    category: 'Баланс',
    duration: '10 мин',
    difficulty: 'Средний',
  },
  {
    id: '47',
    title: 'Планка на одной ноге',
    description: 'Удержание планки с подъемом одной ноги. 3 подхода по 30 секунд на каждую ногу.',
    category: 'Баланс',
    duration: '12 мин',
    difficulty: 'Средний',
  },
  {
    id: '48',
    title: 'Приседания на одной ноге',
    description: 'Приседания на одной ноге с вытянутой вперед другой ногой. 3 подхода по 8-10 повторений на каждую ногу.',
    category: 'Баланс',
    duration: '15 мин',
    difficulty: 'Продвинутый',
  },
  {
    id: '49',
    title: 'Босу-мяч упражнения',
    description: 'Упражнения на нестабильной поверхности для развития баланса. 15-20 минут различных движений.',
    category: 'Баланс',
    duration: '20 мин',
    difficulty: 'Средний',
  },
  {
    id: '50',
    title: 'Йога-баланс',
    description: 'Поза дерева, поза воина III, поза орла для развития баланса. Удержание каждой позы 30-60 секунд.',
    category: 'Баланс',
    duration: '15 мин',
    difficulty: 'Средний',
  },
  {
    id: '51',
    title: 'Ходьба по бревну',
    description: 'Ходьба по узкому бревну или доске для развития равновесия. 5 проходов туда-обратно.',
    category: 'Баланс',
    duration: '10 мин',
    difficulty: 'Продвинутый',
  },
  {
    id: '52',
    title: 'Стойка на руках у стены',
    description: 'Стойка на руках с опорой на стену для развития баланса верхней части тела. 3 подхода по 20 секунд.',
    category: 'Баланс',
    duration: '12 мин',
    difficulty: 'Продвинутый',
  },

  // Скоростная выносливость
  {
    id: '53',
    title: 'Фартлек',
    description: 'Бег с переменной интенсивностью: быстрый бег 2 минуты, медленный 1 минута. 30 минут общей работы.',
    category: 'Скоростная выносливость',
    duration: '30 мин',
    difficulty: 'Продвинутый',
  },
  {
    id: '54',
    title: 'Повторные спринты',
    description: 'Спринты на 100 метров с отдыхом 2-3 минуты. 6-8 повторений для развития скоростной выносливости.',
    category: 'Скоростная выносливость',
    duration: '25 мин',
    difficulty: 'Продвинутый',
  },
  {
    id: '55',
    title: 'Интервалы на велосипеде',
    description: '30 секунд максимальной нагрузки, 90 секунд восстановления. 20 циклов для развития скоростной выносливости.',
    category: 'Скоростная выносливость',
    duration: '25 мин',
    difficulty: 'Средний',
  },
  {
    id: '56',
    title: 'Бег по холмам',
    description: 'Бег вверх по холму с максимальной скоростью, спуск трусцой. 8-10 подъемов.',
    category: 'Скоростная выносливость',
    duration: '30 мин',
    difficulty: 'Продвинутый',
  },
  {
    id: '57',
    title: 'Плиометрические круги',
    description: 'Круг из 5-6 плиометрических упражнений без отдыха. 4-5 кругов с отдыхом 2 минуты между ними.',
    category: 'Скоростная выносливость',
    duration: '20 мин',
    difficulty: 'Продвинутый',
  },

  // Восстановление
  {
    id: '58',
    title: 'Легкая растяжка',
    description: 'Мягкая растяжка всех основных групп мышц после тренировки. 15-20 минут для ускорения восстановления.',
    category: 'Восстановление',
    duration: '20 мин',
    difficulty: 'Начинающий',
  },
  {
    id: '59',
    title: 'Фоам-роллинг',
    description: 'Массаж мышц с помощью ролика для снятия напряжения. 10-15 минут на основные группы мышц.',
    category: 'Восстановление',
    duration: '15 мин',
    difficulty: 'Средний',
  },
  {
    id: '60',
    title: 'Легкий бег',
    description: 'Бег трусцой в низком темпе для активного восстановления. 15-20 минут.',
    category: 'Восстановление',
    duration: '20 мин',
    difficulty: 'Начинающий',
  },
  {
    id: '61',
    title: 'Плавание',
    description: 'Легкое плавание в бассейне для расслабления мышц и восстановления. 20-30 минут.',
    category: 'Восстановление',
    duration: '30 мин',
    difficulty: 'Средний',
  },
  {
    id: '62',
    title: 'Велосипед восстановления',
    description: 'Легкая езда на велосипеде в низком темпе для активного восстановления. 20-25 минут.',
    category: 'Восстановление',
    duration: '25 мин',
    difficulty: 'Начинающий',
  },
  {
    id: '63',
    title: 'Йога восстановления',
    description: 'Мягкие асаны для расслабления мышц и ускорения восстановления. 20 минут.',
    category: 'Восстановление',
    duration: '20 мин',
    difficulty: 'Начинающий',
  },
  {
    id: '64',
    title: 'Массаж',
    description: 'Самомассаж основных групп мышц для снятия напряжения и ускорения восстановления. 15 минут.',
    category: 'Восстановление',
    duration: '15 мин',
    difficulty: 'Начинающий',
  },
  {
    id: '65',
    title: 'Контрастный душ',
    description: 'Чередование горячей и холодной воды для улучшения кровообращения и восстановления. 5-7 минут.',
    category: 'Восстановление',
    duration: '7 мин',
    difficulty: 'Средний',
  }
];

const categories = ['Выносливость', 'Взрывная скорость', 'Разминка', 'Растяжка', 'Ловкость', 'Сила', 'Баланс', 'Скоростная выносливость', 'Восстановление'];

export default function ExercisesScreen() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exerciseRankings, setExerciseRankings] = useState<{ exerciseId: string; totalCompletions: number }[]>([]);
  const [userCompletions, setUserCompletions] = useState<Record<string, number>>({});
  const router = useRouter();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const user = await loadCurrentUser();
        if (user) {
          setCurrentUser(user);
          // Загружаем рейтинг упражнений
          loadExerciseRankings();
          // Загружаем личные выполнения для игроков
          if (user.status === 'player') {
            loadUserCompletions(user.id);
          }
        } else {
          // Убираем дублирующееся сообщение об ошибке - пользователь и так попадает на вход
          router.replace('/login');
          return;
        }
      } catch (error) {
        console.error('Ошибка проверки авторизации:', error);
        router.replace('/login');
        return;
      } finally {
        setLoading(false);
      }
    };
    
    checkAuth();
  }, [router]);

  const loadExerciseRankings = async () => {
    try {
      const rankings = await getExerciseRankings();
      setExerciseRankings(rankings);
    } catch (error) {
      console.error('Ошибка загрузки рейтинга упражнений:', error);
    }
  };

  const loadUserCompletions = async (userId: string) => {
    try {
      const completions: Record<string, number> = {};
      // Загружаем количество выполнений для каждого упражнения
      for (const exercise of exercisesData) {
        const count = await getExerciseCompletionCount(userId, exercise.id);
        if (count > 0) {
          completions[exercise.id] = count;
        }
      }
      setUserCompletions(completions);
    } catch (error) {
      console.error('Ошибка загрузки личных выполнений:', error);
    }
  };

  // Дополнительная проверка при фокусе на экран
  useFocusEffect(
    React.useCallback(() => {
      let isActive = true;
      const verifyAuthOnFocus = async () => {
        try {
          const user = await loadCurrentUser();
          if (!user) {
            if (isActive) {
              setCurrentUser(null);
              router.replace('/login');
            }
            return;
          }
          if (isActive) {
            setCurrentUser(user);
          }
        } catch (e) {
          if (isActive) {
            setCurrentUser(null);
            router.replace('/login');
          }
        }
      };
      verifyAuthOnFocus();
      return () => { isActive = false; };
    }, [router])
  );

  // Показываем загрузку пока проверяем авторизацию
  if (loading) {
    return (
      <View style={styles.container}>
        <ImageBackground
          source={require('../assets/images/led.jpg')}
          style={styles.backgroundImage}
          resizeMode="cover"
        >
          <View style={styles.overlay}>
            <View style={styles.pageHeader}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.pageTitle}>Упражнения</Text>
            </View>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Проверка авторизации...</Text>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  // Если пользователь не авторизован, не показываем контент
  if (!currentUser) {
    return null;
  }

  // Получаем отфильтрованные упражнения и сортируем их по популярности
  const filteredExercises = selectedCategory
    ? exercisesData.filter(exercise => exercise.category === selectedCategory)
    : exercisesData;

  // Сортируем упражнения по количеству выполнений (популярности)
  const sortedExercises = [...filteredExercises].sort((a, b) => {
    const aRanking = exerciseRankings.find(r => r.exerciseId === a.id);
    const bRanking = exerciseRankings.find(r => r.exerciseId === b.id);
    const aCount = aRanking ? aRanking.totalCompletions : 0;
    const bCount = bRanking ? bRanking.totalCompletions : 0;
    return bCount - aCount; // Сортировка по убыванию
  });

  // Функция для получения количества выполнений упражнения
  const getExerciseCompletions = (exerciseId: string): number => {
    const ranking = exerciseRankings.find(r => r.exerciseId === exerciseId);
    return ranking ? ranking.totalCompletions : 0;
  };

  const handleExercisePress = (exercise: Exercise) => {
    // Переходим на страницу с подробным описанием упражнения
    router.push({
      pathname: '/exercise-details',
      params: { exerciseId: exercise.id }
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Начинающий': return '#4CAF50';
      case 'Средний': return '#FF9800';
      case 'Продвинутый': return '#F44336';
      default: return '#888';
    }
  };

  return (
    <View style={styles.container}>
      <ImageBackground
        source={require('../assets/images/led.jpg')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        <View style={styles.overlay}>
          {/* Заголовок страницы */}
          <View style={styles.pageHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>Упражнения</Text>
          </View>
          
          {/* Фильтры по категориям */}
          <View style={styles.categoriesContainer}>
            <View style={styles.categoriesContent}>
              {categories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={[
                    styles.categoryButton,
                    selectedCategory === category && styles.categoryButtonActive
                  ]}
                  onPress={() => setSelectedCategory(
                    selectedCategory === category ? null : category
                  )}
                >
                  <Text style={[
                    styles.categoryText,
                    selectedCategory === category && styles.categoryTextActive
                  ]}>
                    {category}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Список упражнений */}
          <ScrollView style={styles.exercisesContainer}>
                        {sortedExercises.map((exercise) => {
              const userCompletionCount = userCompletions[exercise.id] || 0;
              return (
              <TouchableOpacity
                key={exercise.id}
                style={styles.exerciseCard}
                onPress={() => handleExercisePress(exercise)}
              >
                <View style={styles.exerciseHeader}>
                  <View style={styles.exerciseTitleContainer}>
                  <Text style={styles.exerciseTitle}>{exercise.title}</Text>
                    <View style={styles.badgesContainer}>
                      {userCompletionCount > 0 && (
                        <View style={styles.userCompletionsBadge}>
                          <Text style={styles.userCompletionsText}>{userCompletionCount}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={[
                    styles.difficultyBadge,
                    { backgroundColor: getDifficultyColor(exercise.difficulty) }
                  ]}>
                    <Text style={styles.difficultyText}>{exercise.difficulty}</Text>
                  </View>
                </View>
                
                <Text style={styles.exerciseDescription} numberOfLines={2}>
                  {exercise.description}
                </Text>
                
                <View style={styles.exerciseFooter}>
                  <View style={styles.exerciseInfo}>
                    <Ionicons name="time-outline" size={16} color="#888" />
                    <Text style={styles.exerciseInfoText}>{exercise.duration}</Text>
                  </View>
                  
                  <View style={styles.exerciseInfo}>
                    <Ionicons name="fitness-outline" size={16} color="#888" />
                    <Text style={styles.exerciseInfoText}>{exercise.category}</Text>
                  </View>
                </View>
                
                {/* Убираем красную стрелочку */}
              </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  backgroundImage: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 68, 68, 0.3)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
    marginBottom: 4,
  },
  pageHeader: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 68, 68, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  pageTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
    flex: 1,
  },
  categoriesContainer: {
    marginTop: 10, // Уменьшаем отступ сверху
    marginBottom: 8, // Уменьшаем отступ снизу
  },
  categoriesContent: {
    paddingHorizontal: 20,
    paddingBottom: 4, // Уменьшаем отступ снизу
    flexDirection: 'row', // Горизонтальное расположение
    flexWrap: 'wrap', // Перенос на новую строку если не помещается
    gap: 6, // Уменьшаем отступы между кнопками
  },
  categoryButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)', // Полупрозрачный черный фон
    paddingHorizontal: 12, // Уменьшаем горизонтальные отступы
    paddingVertical: 4, // Уменьшаем вертикальный отступ
    height: 28, // Уменьшаем высоту для компактности
    borderRadius: 6, // Уменьшаем радиус скругления
    marginRight: 0, // Убираем marginRight так как используем gap
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)', // Более заметная граница
    justifyContent: 'center', // Центрируем текст по вертикали
    alignItems: 'center', // Центрируем текст по горизонтали
  },
  categoryButtonActive: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  categoryText: {
    color: '#fff',
    fontSize: 14, // Уменьшаем размер шрифта для компактности
    fontFamily: 'Gilroy-Regular',
  },
  categoryTextActive: {
    color: '#fff',
    fontFamily: 'Gilroy-Bold',
  },
  exercisesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  exerciseCard: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)', // Полупрозрачный черный фон для лучшей читаемости
    borderRadius: 15,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  exerciseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  exerciseTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  exerciseTitle: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    flex: 1,
    marginRight: 12,
  },
  badgesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginRight: 16,
  },
  userCompletionsBadge: {
    backgroundColor: '#FF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userCompletionsText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
  },

  difficultyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  difficultyText: {
    color: '#fff',
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
  },
  exerciseDescription: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    lineHeight: 20,
    marginBottom: 16,
  },
  exerciseFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  exerciseInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  exerciseInfoText: {
    color: '#888',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    marginLeft: 6,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 10,
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
  },
  // Убираем неиспользуемые стили для стрелочки
});
