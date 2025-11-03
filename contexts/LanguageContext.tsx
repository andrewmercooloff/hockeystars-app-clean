import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';

// Импортируем переводы
import ruTranslations from '../locales/ru.json';
import enTranslations from '../locales/en.json';
import ltTranslations from '../locales/lt.json';
import lvTranslations from '../locales/lv.json';
import plTranslations from '../locales/pl.json';
import svTranslations from '../locales/sv.json';
import csTranslations from '../locales/cs.json';
import skTranslations from '../locales/sk.json';
import fiTranslations from '../locales/fi.json';
import itTranslations from '../locales/it.json';
import deTranslations from '../locales/de.json';
import frTranslations from '../locales/fr.json';

export type Language = 'ru' | 'lt' | 'lv' | 'pl' | 'sv' | 'cs' | 'sk' | 'fi' | 'it' | 'de' | 'fr' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  resetToDeviceLanguage: () => Promise<void>;
  t: (key: string, params?: Record<string, any>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Объединяем все переводы
const translations = {
  ru: ruTranslations,
  en: enTranslations,
  lt: ltTranslations,
  lv: lvTranslations,
  pl: plTranslations,
  sv: svTranslations,
  cs: csTranslations,
  sk: skTranslations,
  fi: fiTranslations,
  it: itTranslations,
  de: deTranslations,
  fr: frTranslations,
};

// Список поддерживаемых языков
const supportedLanguages: Language[] = ['ru', 'en', 'lt', 'lv', 'pl', 'sv', 'cs', 'sk', 'fi', 'it', 'de', 'fr'];

// Функция для определения языка устройства
const getDeviceLanguage = (): Language => {
  try {
    // Получаем локаль устройства (например, 'ru-RU', 'en-US', 'lt-LT')
    const deviceLocale = Localization.locale;
    
    // Проверяем, что локаль не undefined (баг в Expo Go)
    if (!deviceLocale) {
      // Пробуем альтернативный метод через getLocales()
      const locales = Localization.getLocales();
      
      if (locales && locales.length > 0 && locales[0].languageCode) {
        const languageCode = locales[0].languageCode.toLowerCase();
        
        if (supportedLanguages.includes(languageCode as Language)) {
          return languageCode as Language;
        }
      }
      
      console.warn('⚠️ Не удалось определить язык устройства, используем английский');
      return 'en';
    }
    
    // Извлекаем код языка (первые 2 символа)
    const languageCode = deviceLocale.split('-')[0].toLowerCase();
    
    // Проверяем, поддерживается ли этот язык
    if (supportedLanguages.includes(languageCode as Language)) {
      return languageCode as Language;
    }
    
    // Если язык не поддерживается, возвращаем английский по умолчанию
    return 'en';
  } catch (error) {
    console.warn('❌ Ошибка определения языка устройства:', error);
    return 'en'; // Fallback на английский
  }
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en'); // Начинаем с английского как fallback

  // Загружаем язык при запуске
  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      // Сначала проверяем, есть ли сохраненный язык
      const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
      
      if (savedLanguage && supportedLanguages.includes(savedLanguage as Language)) {
        // Если есть сохраненный язык, используем его
        setLanguageState(savedLanguage as Language);
      } else {
        // Если нет сохраненного языка, определяем язык устройства
        const deviceLanguage = getDeviceLanguage();
        setLanguageState(deviceLanguage);
        
        // Сохраняем определенный язык для будущих запусков
        await AsyncStorage.setItem('selectedLanguage', deviceLanguage);
      }
    } catch (error) {
      console.warn('❌ Ошибка загрузки языка:', error);
      // В случае ошибки используем английский
      setLanguageState('en');
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      setLanguageState(lang);
      await AsyncStorage.setItem('selectedLanguage', lang);
      
      // ВАЖНО: Сохраняем язык в БД для правильной локализации уведомлений
      // Получаем текущего пользователя и обновляем его язык
      try {
        const { loadCurrentUser } = await import('../utils/playerStorage');
        const currentUser = await loadCurrentUser();
        
        if (currentUser?.id) {
          const { supabase } = await import('../utils/supabase');
          const { error } = await supabase
            .from('players')
            .update({ language: lang })
            .eq('id', currentUser.id);
          
          if (error) {
            console.error('❌ Ошибка сохранения языка в БД:', error);
          } else {
            console.log('✅ Язык сохранен в БД:', lang);
          }
        }
      } catch (dbError) {
        console.warn('⚠️ Не удалось сохранить язык в БД:', dbError);
      }
    } catch (error) {
      console.warn('Ошибка сохранения языка:', error);
    }
  };

  // Функция для сброса языка на автоматическое определение устройства
  const resetToDeviceLanguage = async () => {
    try {
      const deviceLanguage = getDeviceLanguage();
      setLanguageState(deviceLanguage);
      await AsyncStorage.setItem('selectedLanguage', deviceLanguage);
    } catch (error) {
      console.warn('Ошибка сброса языка:', error);
    }
  };

  // Функция для получения перевода по ключу с поддержкой интерполяции
  const t = (key: string, params?: Record<string, any>): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Если перевод не найден, возвращаем ключ
        console.warn(`Translation missing for key: ${key} in language: ${language}`);
        return key;
      }
    }
    
    if (typeof value !== 'string') {
      return key;
    }
    
    // Интерполяция переменных
    if (params) {
      return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
        return params[paramKey] !== undefined ? params[paramKey] : match;
      });
    }
    
    return value;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, resetToDeviceLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};