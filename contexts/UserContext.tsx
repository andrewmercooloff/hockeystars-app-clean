import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';
import { Player, loadCurrentUser } from '../utils/playerStorage';
import { dataCache, CACHE_KEYS } from '../utils/DataCache';
import { router } from 'expo-router';
import { avatarCache, updateAvatarGlobally } from '../utils/AvatarCache';

interface UserContextType {
  currentUser: Player | null;
  setCurrentUser: (user: Player | null) => void;
  refreshUser: (forceRefresh?: boolean) => Promise<void>;
  refreshUserAfterExercise: () => Promise<void>;
  adjustFriendRequestsCount: (delta: number) => void;
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
        const storedUserRaw = await AsyncStorage.getItem('hockeystars_current_user');
        const storedUser = storedUserRaw ? (() => { try { return JSON.parse(storedUserRaw); } catch { return null; } })() : null;
        
        // Быстро загружаем из кеша (и используем как fallback при проблемах сети)
        const cachedData = await AsyncStorage.getItem('hockeystars_user_cache');
        
        const mergeStoredUser = (base: Player | null): Player | null => {
          if (!base && !(storedUser && storedUser.id)) return base;
          const fromStored = storedUser && storedUser.id ? storedUser : null;
          if (!fromStored) return base;
          if (!base) return fromStored;
          return {
            ...base,
            ...fromStored,
            avatar: fromStored.avatar || base.avatar,
            name: fromStored.name || base.name,
          };
        };

        if (cachedData) {
          const { user, timestamp } = JSON.parse(cachedData);
          const cacheAge = Date.now() - timestamp;
          
          globalUserCache = mergeStoredUser((storedUser && storedUser.id ? storedUser : user) ?? null);
          console.log('⚡ Пользователь поднят из кеша (fallback):', globalUserCache?.name);
          
          if (cacheAge < 60000) {
            console.log('⚡ Пользователь загружен из кеша мгновенно:', globalUserCache?.name);
            return;
          }
        }

        if (storedUser && storedUser.id) {
          globalUserCache = mergeStoredUser(storedUser);
        }
        
        // Если кеш устарел или отсутствует, загружаем полностью
        try {
          const user = await loadCurrentUser();
          globalUserCache = user;
          console.log('✅ Пользователь загружен полностью:', user?.name || 'не авторизован');
        } catch (e) {
          // Если сети нет — остаемся на кеше (если был)
          console.warn('⚠️ loadCurrentUser failed during init, keep cached user');
        }
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
      if (globalUserCache?.avatar && globalUserCache.id) {
        void avatarCache.setAvatar(globalUserCache.id, globalUserCache.avatar);
      }
      setIsUserLoading(false);
      setInitialLoadComplete(true);
      console.log('✅ Кеш пользователя инициализирован, isUserLoading=false, user:', globalUserCache?.name || 'не авторизован');
    };
    
    waitForCache();
  }, []);

  const setCurrentUser = useCallback((user: Player | null) => {
    setCurrentUserState((prev) => {
      if (!user) {
        globalUserCache = null;
        dataCache.remove(CACHE_KEYS.USER_PROFILE);
        return null;
      }

      const avatar = user.avatar || prev?.avatar || globalUserCache?.avatar;
      const name = user.name || prev?.name || globalUserCache?.name;
      const nextUser =
        (avatar && avatar !== user.avatar) || (name && name !== user.name)
          ? { ...user, avatar: avatar || user.avatar, name: name || user.name }
          : user;
      globalUserCache = nextUser;

      if (nextUser.avatar && nextUser.id) {
        const prevAvatar = prev?.avatar || globalUserCache?.avatar;
        if (!prevAvatar || prevAvatar !== nextUser.avatar) {
          void updateAvatarGlobally(nextUser.id, nextUser.avatar);
        }
      }

      const userWithTimestamp = { ...nextUser, lastUpdated: Date.now() };
      dataCache.set(CACHE_KEYS.USER_PROFILE, userWithTimestamp, USER_CACHE_DURATION);
      return nextUser;
    });
  }, []);

  const refreshUser = useCallback(async (forceRefresh = false) => {
    try {
      const previousUser = currentUser ?? globalUserCache;
      const now = Date.now();
      if (!forceRefresh && now - lastUserLoadTime < 1000) {
        return;
      }
      lastUserLoadTime = now;

      if (forceRefresh) {
        await dataCache.remove(CACHE_KEYS.USER_PROFILE);
      }

      if (!forceRefresh) {
        const cachedUser = await dataCache.get<Player>(CACHE_KEYS.USER_PROFILE);
        if (cachedUser && (now - (cachedUser as any).lastUpdated || 0) < USER_CACHE_DURATION) {
          const merged =
            previousUser?.id === cachedUser.id
              ? {
                  ...cachedUser,
                  avatar: cachedUser.avatar || previousUser.avatar,
                  name: cachedUser.name || previousUser.name,
                }
              : cachedUser;
          setCurrentUser(merged);
          return;
        }
      }

      const user = await loadCurrentUser(forceRefresh);

      if (user) {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        let storedAvatar: string | undefined;
        try {
          const rawStored = await AsyncStorage.getItem('hockeystars_current_user');
          if (rawStored) {
            storedAvatar = JSON.parse(rawStored)?.avatar;
          }
        } catch {
          /* ignore */
        }

        const mergedAvatar =
          user.avatar || previousUser?.avatar || storedAvatar || globalUserCache?.avatar;
        const mergedName =
          user.name || previousUser?.name || globalUserCache?.name;
        const merged = {
          ...user,
          avatar: mergedAvatar || user.avatar,
          name: mergedName || user.name,
        };
        setCurrentUser(merged);
        return;
      }

      // user === null: either logout, or network blip.
      // Source of truth — hockeystars_current_user in AsyncStorage: logoutUser clears it.
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const storedUser = await AsyncStorage.getItem('hockeystars_current_user');
      if (!storedUser) {
        setCurrentUser(null);
        return;
      }

      if (previousUser) {
        console.warn('⚠️ refreshUser: сеть недоступна, сохраняем предыдущего пользователя');
        setCurrentUser(previousUser);
      } else {
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Ошибка загрузки пользователя:', error);
    }
  }, [currentUser, setCurrentUser]);

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

  // Функция для изменения счётчика запросов дружбы
  // ВАЖНО: Эта функция устарела! Счётчик теперь управляется через Realtime подписку в _layout.tsx
  // Оставлена для совместимости интерфейса
  const adjustFriendRequestsCount = useCallback((delta: number) => {
    console.log('⚠️ adjustFriendRequestsCount устарела, используйте Realtime подписку');
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      setCurrentUser,
      refreshUser,
      refreshUserAfterExercise,
      adjustFriendRequestsCount,
      isUserLoading,
    }),
    [
      currentUser,
      setCurrentUser,
      refreshUser,
      refreshUserAfterExercise,
      adjustFriendRequestsCount,
      isUserLoading,
    ]
  );

  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
