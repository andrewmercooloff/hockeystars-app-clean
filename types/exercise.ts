// Типы для упражнений из базы данных Supabase

// Интерфейс для данных из Supabase (snake_case)
export interface SupabaseExercise {
  id: number;
  exercise_id: string;
  category: string; // Основная категория (для совместимости)
  duration: string;
  difficulty: string; // Основная сложность (для совместимости)
  image_url?: string;
  
  // Мультиязычные категории, сложности и продолжительность
  category_ru?: string;
  category_en?: string;
  difficulty_ru?: string;
  difficulty_en?: string;
  duration_ru?: string;
  duration_en?: string;
  
  // Русские переводы
  title_ru: string;
  description_ru: string;
  benefits_ru: string[]; // JSON массив
  instructions_ru: string[]; // JSON массив
  tips_ru: string[]; // JSON массив
  equipment_ru?: string;
  calories_ru?: string;
  
  // Английские переводы
  title_en: string;
  description_en: string;
  benefits_en: string[]; // JSON массив
  instructions_en: string[]; // JSON массив
  tips_en: string[]; // JSON массив
  equipment_en?: string;
  calories_en?: string;
  
  // Метаданные
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Интерфейс для приложения (camelCase)
export interface Exercise {
  id: number;
  exerciseId: string;
  category: string; // Основная категория (для совместимости)
  duration: string;
  difficulty: string; // Основная сложность (для совместимости)
  imageUrl?: string;
  
  // Мультиязычные категории, сложности и продолжительность
  categoryRu?: string;
  categoryEn?: string;
  difficultyRu?: string;
  difficultyEn?: string;
  durationRu?: string;
  durationEn?: string;
  
  // Русские переводы
  titleRu: string;
  descriptionRu: string;
  benefitsRu: string[];
  instructionsRu: string[];
  tipsRu: string[];
  equipmentRu?: string;
  caloriesRu?: string;
  
  // Английские переводы
  titleEn: string;
  descriptionEn: string;
  benefitsEn: string[];
  instructionsEn: string[];
  tipsEn: string[];
  equipmentEn?: string;
  caloriesEn?: string;
  
  // Метаданные
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Интерфейс для локализованного упражнения (с переводом на текущий язык)
export interface LocalizedExercise {
  id: number;
  exerciseId: string;
  category: string;
  duration: string;
  difficulty: string;
  imageUrl?: string;
  
  // Локализованные поля
  title: string;
  description: string;
  benefits: string[];
  instructions: string[];
  tips: string[];
  equipment?: string;
  calories?: string;
  
  // Метаданные
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Тип для языка
export type Language = 'ru' | 'lt' | 'lv' | 'pl' | 'sv' | 'cs' | 'sk' | 'fi' | 'it' | 'de' | 'fr' | 'en';

// Интерфейс для фильтров упражнений
export interface ExerciseFilters {
  category?: string;
  difficulty?: string;
  isActive?: boolean;
  search?: string;
}

// Интерфейс для статистики упражнения
export interface ExerciseStats {
  exerciseId: string;
  completions: number;
  lastCompleted?: string;
  totalTime?: number; // в минутах
}

// Функция для преобразования SupabaseExercise в Exercise
export function transformSupabaseExerciseToExercise(supabaseExercise: SupabaseExercise): Exercise {
  return {
    id: supabaseExercise.id,
    exerciseId: supabaseExercise.exercise_id,
    category: supabaseExercise.category,
    duration: supabaseExercise.duration,
    difficulty: supabaseExercise.difficulty,
    imageUrl: supabaseExercise.image_url,
    
    // Мультиязычные категории, сложности и продолжительность
    categoryRu: supabaseExercise.category_ru,
    categoryEn: supabaseExercise.category_en,
    difficultyRu: supabaseExercise.difficulty_ru,
    difficultyEn: supabaseExercise.difficulty_en,
    durationRu: supabaseExercise.duration_ru,
    durationEn: supabaseExercise.duration_en,
    
    // Русские переводы
    titleRu: supabaseExercise.title_ru,
    descriptionRu: supabaseExercise.description_ru,
    benefitsRu: supabaseExercise.benefits_ru,
    instructionsRu: supabaseExercise.instructions_ru,
    tipsRu: supabaseExercise.tips_ru,
    equipmentRu: supabaseExercise.equipment_ru,
    caloriesRu: supabaseExercise.calories_ru,
    
    // Английские переводы
    titleEn: supabaseExercise.title_en,
    descriptionEn: supabaseExercise.description_en,
    benefitsEn: supabaseExercise.benefits_en,
    instructionsEn: supabaseExercise.instructions_en,
    tipsEn: supabaseExercise.tips_en,
    equipmentEn: supabaseExercise.equipment_en,
    caloriesEn: supabaseExercise.calories_en,
    
    // Метаданные
    isActive: supabaseExercise.is_active,
    createdAt: supabaseExercise.created_at,
    updatedAt: supabaseExercise.updated_at,
  };
}

// Функция для получения переводов из файлов локализации
function getExerciseTranslationFromLocales(exerciseId: string, language: Language): any {
  try {
    // Импортируем переводы из файлов локализации
    const ruTranslations = require('../locales/ru.json');
    const enTranslations = require('../locales/en.json');
    const ltTranslations = require('../locales/lt.json');
    const lvTranslations = require('../locales/lv.json');
    const plTranslations = require('../locales/pl.json');
    const svTranslations = require('../locales/sv.json');
    const csTranslations = require('../locales/cs.json');
    const skTranslations = require('../locales/sk.json');
    const fiTranslations = require('../locales/fi.json');
    const itTranslations = require('../locales/it.json');
    const deTranslations = require('../locales/de.json');
    const frTranslations = require('../locales/fr.json');
    
    let translations;
    if (language === 'ru') {
      translations = ruTranslations;
    } else if (language === 'lt') {
      translations = ltTranslations;
    } else if (language === 'lv') {
      translations = lvTranslations;
    } else if (language === 'pl') {
      translations = plTranslations;
    } else if (language === 'sv') {
      translations = svTranslations;
    } else if (language === 'cs') {
      translations = csTranslations;
    } else if (language === 'sk') {
      translations = skTranslations;
    } else if (language === 'fi') {
      translations = fiTranslations;
    } else if (language === 'it') {
      translations = itTranslations;
    } else if (language === 'de') {
      translations = deTranslations;
    } else if (language === 'fr') {
      translations = frTranslations;
    } else {
      translations = enTranslations;
    }
    
    return translations?.exercises?.items?.[exerciseId] || null;
  } catch (error) {
    console.warn('⚠️ Не удалось загрузить переводы из файлов локализации:', error);
    return null;
  }
}

// Функция для локализации упражнения
export function localizeExercise(exercise: Exercise, language: Language): LocalizedExercise {
  // Получаем переводы из файлов локализации как fallback
  const localeTranslation = getExerciseTranslationFromLocales(exercise.exerciseId, language);
  
  // Функция для получения значения с fallback на файлы локализации
  const getValueWithFallback = (dbValue: string[] | string | undefined, localeKey: string): any => {
    // Для литовского и латышского языков всегда используем локальные файлы
    if (language === 'lt' || language === 'lv' || language === 'pl' || language === 'sv' || language === 'cs' || language === 'sk' || language === 'fi' || language === 'it' || language === 'de' || language === 'fr') {
      return localeTranslation?.[localeKey] || dbValue || (Array.isArray(dbValue) ? [] : '');
    }
    
    // Для других языков: если в базе данных есть непустое значение, используем его
    if (dbValue && (Array.isArray(dbValue) ? dbValue.length > 0 : dbValue.trim() !== '')) {
      return dbValue;
    }
    
    // Иначе используем значение из файлов локализации
    return localeTranslation?.[localeKey] || dbValue || (Array.isArray(dbValue) ? [] : '');
  };

  // Для литовского и латышского используем английский как источник из БД (если нет в локальных файлах), для остальных - соответствующий язык
  const dbLanguage = (language === 'ru') ? 'ru' : 'en';
  
  return {
    id: exercise.id,
    exerciseId: exercise.exerciseId,
    category: getValueWithFallback(
      dbLanguage === 'ru' ? exercise.categoryRu : exercise.categoryEn, 
      'category'
    ) || exercise.category,
    duration: getValueWithFallback(
      dbLanguage === 'ru' ? exercise.durationRu : exercise.durationEn, 
      'duration'
    ) || exercise.duration,
    difficulty: getValueWithFallback(
      dbLanguage === 'ru' ? exercise.difficultyRu : exercise.difficultyEn, 
      'difficulty'
    ) || exercise.difficulty,
    imageUrl: exercise.imageUrl,
    
    // Локализованные поля с fallback на файлы локализации
    title: getValueWithFallback(
      dbLanguage === 'ru' ? exercise.titleRu : exercise.titleEn, 
      'title'
    ),
    description: getValueWithFallback(
      dbLanguage === 'ru' ? exercise.descriptionRu : exercise.descriptionEn, 
      'description'
    ),
    benefits: getValueWithFallback(
      dbLanguage === 'ru' ? exercise.benefitsRu : exercise.benefitsEn, 
      'benefits'
    ),
    instructions: getValueWithFallback(
      dbLanguage === 'ru' ? exercise.instructionsRu : exercise.instructionsEn, 
      'instructions'
    ),
    tips: getValueWithFallback(
      dbLanguage === 'ru' ? exercise.tipsRu : exercise.tipsEn, 
      'tips'
    ),
    equipment: getValueWithFallback(
      dbLanguage === 'ru' ? exercise.equipmentRu : exercise.equipmentEn, 
      'equipment'
    ),
    calories: getValueWithFallback(
      dbLanguage === 'ru' ? exercise.caloriesRu : exercise.caloriesEn, 
      'calories'
    ),
    
    // Метаданные
    isActive: exercise.isActive,
    createdAt: exercise.createdAt,
    updatedAt: exercise.updatedAt,
  };
}



