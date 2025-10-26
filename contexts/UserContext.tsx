import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Player, loadCurrentUser } from '../utils/playerStorage';
import { dataCache, CACHE_KEYS } from '../utils/DataCache';

interface UserContextType {
  currentUser: Player | null;
  setCurrentUser: (user: Player | null) => void;
  refreshUser: (forceRefresh?: boolean) => Promise<void>;
  refreshUserAfterExercise: () => Promise<void>;
  isUserLoading: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

// Глобальный кеш для пользователя
export let globalUserCache: Player | null = null;
let lastUserLoadTime = 0;
const USER_CACHE_DURATION = 2 * 60 * 1000; // 2 минуты
let isInitializing = false;
let cacheInitPromise: Promise<void> | null = null;

// Функция для обновления глобального кеша (используется в playerStorage)
export const updateGlobalUserCache = (user: Player | null) => {
  globalUserCache = user;
};

// Немедленная инициализация кеша пользователя
const initializeUserCache = (() => {
  if (!cacheInitPromise) {
    cacheInitPromise = (async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        
        // Быстро загружаем из кеша
        const cachedData = await AsyncStorage.getItem('hockeystars_user_cache');
        
        if (cachedData) {
          const { user, timestamp } = JSON.parse(cachedData);
          const cacheAge = Date.now() - timestamp;
          
          // Используем кеш если он свежий (до 1 минуты)
          if (cacheAge < 60000) {
            globalUserCache = user;
            console.log('⚡ Пользователь загружен из кеша мгновенно:', user?.name);
            return;
          }
        }
        
        // Если кеш устарел или отсутствует, загружаем полностью
        const user = await loadCurrentUser();
        globalUserCache = user;
        console.log('✅ Пользователь загружен полностью:', user?.name || 'не авторизован');
      } catch (error) {
        console.error('Ошибка инициализации кеша пользователя:', error);
      }
    })();
  }
  return cacheInitPromise;
})();

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<Player | null>(globalUserCache);
  const [isUserLoading, setIsUserLoading] = useState(true);
  const [initialLoadComplete, setInitialLoadComplete] = useState(false);

  // Ждем завершения инициализации кеша перед первым рендером
  React.useEffect(() => {
    const waitForCache = async () => {
      await initializeUserCache;
      setCurrentUserState(globalUserCache);
      setIsUserLoading(false);
      setInitialLoadComplete(true);
      console.log('✅ Кеш пользователя инициализирован, isUserLoading=false, user:', globalUserCache?.name || 'не авторизован');
    };
    
    waitForCache();
  }, []);

  // Обновляем состояние при изменении глобального кеша
  React.useEffect(() => {
    const checkInterval = setInterval(() => {
      if (globalUserCache !== currentUser) {
        setCurrentUserState(globalUserCache);
        console.log('🔄 Синхронизация: глобальный кеш обновлен');
      }
    }, 100);

    return () => clearInterval(checkInterval);
  }, [currentUser]);

  const setCurrentUser = useCallback((user: Player | null) => {
    globalUserCache = user;
    setCurrentUserState(user);
    
    // Сохраняем в кеш
    if (user) {
      const userWithTimestamp = { ...user, lastUpdated: Date.now() };
      dataCache.set(CACHE_KEYS.USER_PROFILE, userWithTimestamp, USER_CACHE_DURATION);
    } else {
      dataCache.remove(CACHE_KEYS.USER_PROFILE);
    }
  }, []);

  const refreshUser = useCallback(async (forceRefresh = false) => {
    try {
      // Проверяем, не слишком ли часто мы загружаем пользователя
      const now = Date.now();
      if (!forceRefresh && now - lastUserLoadTime < 1000) { // Минимум 1 секунда между загрузками
        return;
      }
      lastUserLoadTime = now;

      setIsUserLoading(true);

      // Если принудительное обновление, очищаем кеш
      if (forceRefresh) {
        await dataCache.remove(CACHE_KEYS.USER_PROFILE);
        globalUserCache = null;
      }

      // Сначала проверяем кеш (только если не принудительное обновление)
      if (!forceRefresh) {
        const cachedUser = await dataCache.get<Player>(CACHE_KEYS.USER_PROFILE);
        if (cachedUser && (now - (cachedUser as any).lastUpdated || 0) < USER_CACHE_DURATION) {
          setCurrentUser(cachedUser);
          setIsUserLoading(false);
          return;
        }
      }

      // Если в кеше нет актуальных данных, загружаем из хранилища
      const user = await loadCurrentUser(forceRefresh);
      setCurrentUser(user);
      setIsUserLoading(false);
    } catch (error) {
      console.error('Ошибка загрузки пользователя:', error);
      setIsUserLoading(false);
    }
  }, [setCurrentUser]);

  const refreshUserAfterExercise = useCallback(async () => {
    try {
      console.log('💪 Принудительно обновляем пользователя после выполнения упражнения...');
      
      // Очищаем все связанные кеши
      await dataCache.remove(CACHE_KEYS.USER_PROFILE);
      await dataCache.remove(CACHE_KEYS.USER_STATS);
      await dataCache.remove(CACHE_KEYS.EXERCISE_RANKINGS);
      
      // Очищаем глобальный кеш
      globalUserCache = null;
      
      // Принудительно загружаем пользователя
      const user = await loadCurrentUser(true);
      setCurrentUser(user);
      
      console.log('✅ Пользователь обновлен после выполнения упражнения:', user?.exerciseStats);
    } catch (error) {
      console.error('❌ Ошибка обновления пользователя после упражнения:', error);
    }
  }, [setCurrentUser]);

  return (
    <UserContext.Provider value={{ 
      currentUser, 
      setCurrentUser, 
      refreshUser, 
      refreshUserAfterExercise,
      isUserLoading 
    }}>
      {children}
    </UserContext.Provider>
  );
};
