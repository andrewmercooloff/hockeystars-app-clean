import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Импортируем переводы
import ruTranslations from '../locales/ru.json';
import enTranslations from '../locales/en.json';

export type Language = 'ru' | 'en';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, any>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Объединяем все переводы
const translations = {
  ru: ruTranslations,
  en: enTranslations,
};

interface LanguageProviderProps {
  children: ReactNode;
}

export const LanguageProvider: React.FC<LanguageProviderProps> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('ru');

  // Загружаем сохраненный язык при запуске
  useEffect(() => {
    loadSavedLanguage();
  }, []);

  const loadSavedLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('selectedLanguage');
      if (savedLanguage && (savedLanguage === 'ru' || savedLanguage === 'en')) {
        setLanguageState(savedLanguage as Language);
      }
    } catch (error) {
      console.log('Error loading saved language:', error);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      setLanguageState(lang);
      await AsyncStorage.setItem('selectedLanguage', lang);
    } catch (error) {
      console.log('Error saving language:', error);
    }
  };

  // Функция для получения перевода по ключу с поддержкой интерполяции
  const t = (key: string, params?: Record<string, any>): string => {
    const keys = key.split('.');
    let value: any = translations[language];
    
    // Отладочная информация для проблемных ключей
    if (key === 'profile.Winger' || key === 'profile.Left' || key === 'exercises.all' || key === 'exercises.subtitle') {
      console.log('Debug translation lookup:', {
        key,
        language,
        exercisesSection: translations[language]?.exercises,
        allInExercises: translations[language]?.exercises?.all,
        subtitleInExercises: translations[language]?.exercises?.subtitle
      });
    }
    
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
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
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

