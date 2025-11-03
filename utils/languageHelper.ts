import { supabase } from './supabase';

/**
 * Получает предпочитаемый язык пользователя из базы данных
 * @param userId - ID пользователя
 * @returns Код языка (ru, en, lt, lv, pl, sv, cs, sk, fi, it, de, fr) или 'en' по умолчанию
 */
export async function getUserLanguage(userId: string): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('language')
      .eq('id', userId)
      .single();
    
    if (error) {
      console.warn(`⚠️ Ошибка получения языка пользователя ${userId}:`, error);
      return 'en'; // По умолчанию английский
    }
    
    const language = data?.language;
    const supportedLanguages = ['ru', 'en', 'lt', 'lv', 'pl', 'sv', 'cs', 'sk', 'fi', 'it', 'de', 'fr'];
    
    if (language && supportedLanguages.includes(language)) {
      return language;
    }
    
    return 'en'; // По умолчанию английский
  } catch (error) {
    console.error('❌ Ошибка получения языка пользователя:', error);
    return 'en';
  }
}

/**
 * Загружает переводы для указанного языка
 * @param language - Код языка
 * @returns Объект переводов или null
 */
export function loadTranslations(language: string): any {
  try {
    const translationsMap: any = {
      ru: require('../locales/ru.json'),
      en: require('../locales/en.json'),
      lt: require('../locales/lt.json'),
      lv: require('../locales/lv.json'),
      pl: require('../locales/pl.json'),
      sv: require('../locales/sv.json'),
      cs: require('../locales/cs.json'),
      sk: require('../locales/sk.json'),
      fi: require('../locales/fi.json'),
      it: require('../locales/it.json'),
      de: require('../locales/de.json'),
      fr: require('../locales/fr.json'),
    };
    
    return translationsMap[language] || translationsMap.en;
  } catch (error) {
    console.error('❌ Ошибка загрузки переводов:', error);
    return null;
  }
}

/**
 * Получает языки для нескольких пользователей за один запрос (оптимизация)
 * @param userIds - Массив ID пользователей
 * @returns Map с userId -> language
 */
export async function getUserLanguages(userIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  
  if (userIds.length === 0) {
    return result;
  }
  
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id, language')
      .in('id', userIds);
    
    if (error) {
      console.warn('⚠️ Ошибка получения языков пользователей:', error);
      // Возвращаем английский для всех
      userIds.forEach(id => result.set(id, 'en'));
      return result;
    }
    
    const supportedLanguages = ['ru', 'en', 'lt', 'lv', 'pl', 'sv', 'cs', 'sk', 'fi', 'it', 'de', 'fr'];
    
    // Заполняем Map
    data?.forEach(player => {
      const language = player.language && supportedLanguages.includes(player.language) 
        ? player.language 
        : 'en';
      result.set(player.id, language);
    });
    
    // Для пользователей, которых нет в результате, устанавливаем английский
    userIds.forEach(id => {
      if (!result.has(id)) {
        result.set(id, 'en');
      }
    });
    
    return result;
  } catch (error) {
    console.error('❌ Ошибка получения языков пользователей:', error);
    // Возвращаем английский для всех
    userIds.forEach(id => result.set(id, 'en'));
    return result;
  }
}


