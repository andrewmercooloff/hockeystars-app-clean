import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface LanguageContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Простые переводы
const translations: { [key: string]: { [key: string]: string } } = {
  ru: {
    'profile.loadingProfile': 'Загрузка профиля...',
    'profile.cancel': 'Отмена',
    'profile.additional': 'Дополнительно',
    'profile.points': 'очков',
    'profile.assists': 'передач',
    'profile.goals': 'голов',
    'profile.games': 'игр',
    'profile.pullUps': 'подтягиваний',
    'profile.pushUps': 'отжиманий',
    'profile.plankTime': 'планки',
    'profile.sprint100m': 'стометровки',
    'profile.longJump': 'прыжка в длину',
    'profile.jumpRope': 'скакалки',
    'profile.times': 'раз'
  },
  en: {
    'profile.loadingProfile': 'Loading profile...',
    'profile.cancel': 'Cancel',
    'profile.additional': 'Additional',
    'profile.points': 'points',
    'profile.assists': 'assists',
    'profile.goals': 'goals',
    'profile.games': 'games',
    'profile.pullUps': 'pull-ups',
    'profile.pushUps': 'push-ups',
    'profile.plankTime': 'plank',
    'profile.sprint100m': '100m sprint',
    'profile.longJump': 'long jump',
    'profile.jumpRope': 'jump rope',
    'profile.times': 'times'
  }
};

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState('ru');

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLanguage = await AsyncStorage.getItem('language');
      if (savedLanguage) {
        setLanguageState(savedLanguage);
      }
    } catch (error) {
      console.error('Error loading language:', error);
    }
  };

  const setLanguage = async (lang: string) => {
    try {
      setLanguageState(lang);
      await AsyncStorage.setItem('language', lang);
    } catch (error) {
      console.error('Error saving language:', error);
    }
  };

  const t = (key: string): string => {
    return translations[language]?.[key] || key;
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