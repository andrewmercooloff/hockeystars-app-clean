import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Tabs, useRouter, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { LogBox, Platform, Text, TextInput, TouchableOpacity, View, Animated, StatusBar } from 'react-native';
import { Asset } from 'expo-asset';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LogoHeader from '../components/LogoHeader';
import { UserProvider, useUser } from '../contexts/UserContext';
import { CountryFilterProvider, useCountryFilter } from '../utils/CountryFilterContext';
import { YearFilterProvider } from '../utils/YearFilterContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { ScreenProvider } from '../contexts/ScreenContext';
import { initializeStorage, loadCurrentUser, markNotificationAsRead, Player } from '../utils/playerStorage';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../utils/supabase';
import * as SplashScreen from 'expo-splash-screen';
import { addActivityPoints } from '../services/activityService';
import { initializePushNotifications } from '../utils/notificationService';
import * as Notifications from 'expo-notifications';
import { configureSystemUI } from '../utils/systemUI';
import { scaleSize, scaleFont } from '../utils/fontUtils';
import { forceGilroyFont } from '../utils/forceGilroyFont';
import { initializeSounds } from '../utils/soundService';
import { realtimeManager } from '../utils/RealtimeManager';

// Исправляем импорт с учетом регистра
import { dataCache, CACHE_KEYS } from '../utils/DataCache';
import { safeHideSplashScreen } from '../utils/splashScreenUtils';

// Предотвращаем автоматическое скрытие заставки
SplashScreen.preventAutoHideAsync();

// Устанавливаем черный фон для веб-версии
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.body.style.backgroundColor = '#050008';
  document.documentElement.style.backgroundColor = '#050008';
}

const GLOBAL_PRELOAD_ASSETS = [
  require('../assets/images/led.jpg'),
];

// В режиме разработки показываем предупреждения для отладки
// В production отключаем логи, но можно включить через EXPO_PUBLIC_ENABLE_LOGS=true для TestFlight
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
const enableLogsInProd = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_ENABLE_LOGS === 'true';
if (!isDev && !enableLogsInProd) {
  LogBox.ignoreAllLogs();
  // In production, silence runtime logs to avoid noisy output
  // @ts-ignore
  (console as any).log = () => {};
  // @ts-ignore
  (console as any).info = () => {};
  // @ts-ignore
  (console as any).debug = () => {};
  // @ts-ignore
  (console as any).warn = () => {};
  // @ts-ignore
  (console as any).error = () => {};
}









export default function RootLayout() {
  const lastUserLoadTime = React.useRef<number>(0);
  const loginTracked = React.useRef<boolean>(false); // Флаг для отслеживания логина в сессии
  // Условный импорт AppState только для мобильных платформ
  const getAppState = () => {
    if (Platform.OS === 'web') {
      return 'active'; // На веб всегда активен
    }
    try {
      // Безопасная проверка доступности модуля
      if (typeof require !== 'undefined') {
        const ReactNative = require('react-native');
        const AppStateModule = ReactNative?.AppState;
        return AppStateModule?.currentState || 'active';
      }
    } catch {
      // Игнорируем ошибки
    }
    return 'active';
  };

  const [appState, setAppState] = React.useState<string>(getAppState());
  const [showSplash, setShowSplash] = React.useState<boolean>(true);
  const [appReady, setAppReady] = React.useState<boolean>(false);
  const [userLoaded, setUserLoaded] = React.useState<boolean>(false);
  const splashOpacity = React.useRef(new Animated.Value(1)).current;
  const splashStartTime = React.useRef<number>(Date.now());
  
  React.useEffect(() => {
    // AppState только для мобильных платформ
    if (Platform.OS === 'web') {
      return; // На веб не используем AppState
    }
    
    let subscription: { remove: () => void } | null = null;
    try {
      // Безопасная проверка доступности модуля
      if (typeof require !== 'undefined') {
        const ReactNative = require('react-native');
        const AppStateModule = ReactNative?.AppState;
        if (AppStateModule) {
          subscription = AppStateModule.addEventListener('change', (nextAppState: string) => {
            setAppState(nextAppState);
          });
        }
      }
    } catch (e) {
      // AppState недоступен
    }
    
    return () => subscription?.remove();
  }, []);
  const router = useRouter();
  const [loaded, error] = useFonts({
    'Gilroy-Regular': require('../assets/fonts/gilroy-regular.ttf'),
    'Gilroy-Bold': require('../assets/fonts/gilroy-bold.ttf'),
    'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
    'DigifaceRegular': require('../assets/images/DigifaceRegular.ttf'),
  });

  // Скрываем нативный splash screen сразу при монтировании компонента для iOS
  // Это позволяет избежать двойного показа (нативный + кастомный)
  React.useEffect(() => {
    if (Platform.OS === 'ios') {
      // Скрываем нативный splash screen немедленно, чтобы показывался только наш кастомный
      safeHideSplashScreen();
    }
  }, []); // Выполняется один раз при монтировании

  // Принудительно загружаем Ionicons и устанавливаем глобальный шрифт
  React.useEffect(() => {
    if (loaded) {
      // Импортируем Ionicons для принудительной загрузки
      import('@expo/vector-icons/Ionicons');
      
      // Принудительно применяем шрифт Gilroy
      forceGilroyFont();
    }
  }, [loaded]);

  // Компонент для фильтра стран вынесен и мемоизирован внутри функции, чтобы снизить лишние рендеры
  const CountryFilterToggle = React.memo(({ size }: { size: number }) => {
    const { showCountryFilter, setShowCountryFilter } = useCountryFilter();
    return (
      <TouchableOpacity 
        onPress={() => setShowCountryFilter(!showCountryFilter)}
        style={{ 
          marginLeft: 8,
          justifyContent: 'center',
          alignItems: 'center',
          width: size + 4,
          height: size + 4,
          backgroundColor: '#050008',
          borderRadius: 20,
          padding: 2,
        }}
      >
        <Ionicons 
          name="globe-outline" 
          size={size - 2} 
          color="#fa2f40" 
        />
      </TouchableOpacity>
    );
  });



  const [currentUser, setCurrentUser] = React.useState<Player | null>(null);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = React.useState<number>(0);
  const [unreadMessagesCount, setUnreadMessagesCount] = React.useState<number>(0);
  const lastNotificationCountRef = React.useRef<number>(0);
  const lastMessagesCountRef = React.useRef<number>(0);
  const unreadNotificationsStateRef = React.useRef<number>(unreadNotificationsCount);
  React.useEffect(() => {
    unreadNotificationsStateRef.current = unreadNotificationsCount;
  }, [unreadNotificationsCount]);

  // Внутренний компонент для синхронизации с UserContext
  const UserSync = () => {
    const { currentUser: globalUser, setCurrentUser: setGlobalUser, refreshUser, isUserLoading } = useUser();
    const params = useLocalSearchParams();
    
    // Синхронизируем ГЛОБАЛЬНОЕ состояние с ЛОКАЛЬНЫМ (context -> layout)
    React.useEffect(() => {
      setCurrentUser(globalUser);
      // Синхронизируем счетчик из globalUser
      if (globalUser && globalUser.unreadMessagesCount !== undefined) {
        // Обновляем только счетчик, не трогая currentUser целиком
      }
    }, [globalUser]);
    
    // Обрабатываем параметр refresh из URL
    React.useEffect(() => {
      if (params.refresh === 'true') {
        // Очищаем кеш пользователя для принудительной перезагрузки
        const clearUserCache = async () => {
          try {
            await dataCache.remove(CACHE_KEYS.USER_PROFILE);
          } catch (error) {
            console.error('❌ Ошибка очистки кеша:', error);
          }
        };
        
        clearUserCache().then(() => {
          // Очищаем кеш и принудительно загружаем пользователя
          loadUser();
          // Также обновляем UserContext
          refreshUser(true);
        });
      }
    }, [params.refresh]);
    
    // Скрываем splash screen когда приложение готово и пользователь загружен
    React.useEffect(() => {
      // Принудительное скрытие splash screen через 2 секунды максимум
      const maxSplashTime = 2000; // 2 секунды максимум
      const forceHideSplashTimeout = setTimeout(() => {
        Animated.timing(splashOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowSplash(false);
        });
      }, maxSplashTime);

      if (appReady && !isUserLoading && userLoaded) {
        // Плавно скрываем наш кастомный splash screen когда все загружено
        clearTimeout(forceHideSplashTimeout);
        
        // Вычисляем оставшееся время до максимума (2 секунды)
        const elapsed = Date.now() - splashStartTime.current;
        const remainingTime = Math.max(0, maxSplashTime - elapsed);
        
        // Если уже прошло достаточно времени, скрываем сразу
        // Если нет, ждем минимальное время для плавности
        const hideDelay = remainingTime > 100 ? 100 : 0;
        
        setTimeout(() => {
          Animated.timing(splashOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setShowSplash(false);
          });
        }, hideDelay);
      }

      return () => {
        clearTimeout(forceHideSplashTimeout);
      };
    }, [appReady, isUserLoading, userLoaded, showSplash]);
    
    return null;
  };
  
  // Функция для загрузки счетчика уведомлений из БД
  const loadNotificationCount = React.useCallback(async (userId: string, skipUpdateIfSame: boolean = false) => {
    try {
      // Пересчитываем реальное количество непрочитанных уведомлений
      // Исключаем типы уведомлений, которые не должны учитываться в счетчике
      const { count } = await supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('is_read', false)
        .not('type', 'in', '(gift_accepted,friend_request,achievement,team_invite,new_friendship)');
      
      const realCount = count || 0;
      
      // Если счетчик не изменился и мы не хотим обновлять UI, пропускаем
      if (skipUpdateIfSame && realCount === unreadNotificationsCount) {
        return;
      }
      
      // Обновляем счетчик в БД только если он изменился
      if (realCount !== lastNotificationCountRef.current) {
        await supabase
          .from('players')
          .update({ 
            unread_notifications_count: realCount,
            notifications: JSON.stringify({
              unread_count: realCount,
              last_updated: new Date().toISOString()
            })
          })
          .eq('id', userId);
        
        lastNotificationCountRef.current = realCount;
      }
      
      // Обновляем UI только если значение действительно изменилось
      if (realCount !== unreadNotificationsCount) {
        setUnreadNotificationsCount(realCount);
        lastNotificationCountRef.current = realCount;
        console.log('✅ Счетчик уведомлений пересчитан и обновлен:', realCount);
      } else {
        // Обновляем ref даже если значение не изменилось, чтобы избежать повторных обновлений
        lastNotificationCountRef.current = realCount;
      }
    } catch (error) {
      // Тихая обработка сетевых ошибок (отсутствие интернета)
      const isNetworkError = (error as any)?.message?.includes('Network request failed') || 
                             (error as any)?.message?.includes('network') ||
                             (error as any)?.code === 'NETWORK_ERROR';
      
      if (!isNetworkError) {
        // Логируем только не-сетевые ошибки
      console.error('❌ Ошибка загрузки счетчика:', error);
      }
      // При сетевых ошибках просто пропускаем обновление счетчика
    }
  }, [unreadNotificationsCount]);

  // Убираем useEffect, который перезаписывает счетчик
  // Счетчик обновляется только через updateNotificationCount
  // React.useEffect(() => {
  //   if (currentUser) {
  //     // Парсим счетчик из столбца notifications
  //     let unreadCount = 0;
  //     try {
  //       if (currentUser.notifications && typeof currentUser.notifications === 'string') {
  //         const notificationsData = JSON.parse(currentUser.notifications);
  //         unreadCount = notificationsData.unread_count || 0;
  //       }
  //     } catch (error) {
  //       console.error('Ошибка парсинга notifications:', error);
  //     }
  //     
  //     // Обновляем состояние уведомлений
  //     // НЕ складываем friendRequestsCount и giftRequestsCount здесь,
  //     // они складываются в NotificationsTabIcon
  //     setUnreadNotificationsCount(unreadCount);
  //   }
  // }, [currentUser?.notifications, currentUser?.friendRequestsCount, currentUser?.giftRequestsCount]);

  // Компонент для иконки уведомлений с оптимизацией
  const NotificationsTabIcon = React.useMemo(() => {
    return ({ size, focused }: { size: number; focused: boolean }) => {
      const total =
        unreadNotificationsCount +
        (currentUser?.friendRequestsCount ?? 0) +
        (currentUser?.giftRequestsCount ?? 0);
      const iconSize = Platform.OS === 'ios' ? (size - 2) * 1.1 : size - 2;
      
      return (
        <View style={{
          position: 'relative',
          justifyContent: 'center',
          alignItems: 'center',
          width: size + 4,
          height: size + 4,
        }}>
          <Ionicons name="notifications-outline" size={iconSize} color={focused ? '#eee' : '#aaa'} />
          {!currentUser || total <= 0 ? null : (
            <View style={{
              position: 'absolute',
              top: -8,
              right: -8,
              backgroundColor: '#fa2f40',
              borderRadius: 10,
              minWidth: total > 9 ? 24 : 20,
              height: 20,
              justifyContent: 'center',
              alignItems: 'center',
              paddingHorizontal: 4,
            }}>
              <Text style={{
                color: '#fff',
                fontSize: 12,
                fontFamily: 'Gilroy-Bold',
                textAlign: 'center',
              }}>
                {total > 99 ? '99+' : String(total)}
              </Text>
            </View>
          )}
        </View>
      );
    };
  }, [unreadNotificationsCount, currentUser?.friendRequestsCount, currentUser?.giftRequestsCount]);

  // Функция для обновления счетчика уведомлений (УПРОЩЕННАЯ)
  const updateNotificationCount = React.useCallback(async (user?: Player | null) => {
    const targetUser = user || currentUser;
    if (!targetUser) {
      return;
    }
    
    // Просто загружаем счетчик из БД
    // База данных управляется SQL функциями increment_unread_notifications и reset_unread_notifications
    await loadNotificationCount(targetUser.id);
  }, [currentUser, loadNotificationCount]);

  // автоопределение включено: будет использоваться в главном экране

  const loadUser = async () => {
    // Минимальный throttling только для предотвращения дублирования
    if (Date.now() - (lastUserLoadTime.current ?? 0) < 300) {
      return;
    }
    lastUserLoadTime.current = Date.now(); // Обновляем время последнего вызова
    try {
      // НЕ загружаем пользователя здесь - используем UserContext
      setUserLoaded(true);
      const user = currentUser;
      if (user) {
             // Трекаем вход в приложение ТОЛЬКО ОДИН РАЗ за всю сессию приложения
             if (!loginTracked.current) {
               try {
                 await addActivityPoints(user.id, 'LOGIN');
                 loginTracked.current = true; // Помечаем, что логин уже засчитан
               } catch (error) {
                 console.error('Failed to track login activity:', error);
               }
             }

             // Инициализируем push-уведомления для пользователя
             try {
               const pushResult = await initializePushNotifications(user.id);
             } catch (error) {
               console.error('❌ Ошибка инициализации push-уведомлений:', error);
               console.error('❌ Error details:', error.message);
               console.error('❌ Error stack:', error.stack);
             }

          // Настраиваем системный UI для скрытия панели навигации
          try {
            await configureSystemUI();
          } catch (error) {
            console.error('❌ Ошибка настройки системного UI:', error);
          }

          // Инициализируем звуки сообщений
          try {
            await initializeSounds();
          } catch (error) {
            console.error('❌ Ошибка инициализации звуков:', error);
             }
        
        // Загружаем уведомления, предназначенные для текущего пользователя (по user_id)
        try {
        const { data: notificationsData, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
            // Тихая обработка сетевых ошибок (отсутствие интернета)
            const isNetworkError = error.message?.includes('Network request failed') || 
                                   error.message?.includes('network') ||
                                   error.code === 'NETWORK_ERROR';
            
            if (!isNetworkError) {
              // Логируем только не-сетевые ошибки
          console.error('Ошибка загрузки уведомлений:', error);
            }
            // При сетевых ошибках просто пропускаем загрузку уведомлений
          return;
        }
        
        const notifications = notificationsData || [];
        
        // Помечаем все уведомления о сообщениях как прочитанные
        const messageNotifications = notifications.filter((n: any) => n.type === 'message' && !n.is_read);
        if (messageNotifications.length > 0) {
          for (const notification of messageNotifications) {
            try {
              await markNotificationAsRead(notification.id);
            } catch (error) {
                // Тихая обработка сетевых ошибок
                const isNetworkError = (error as any)?.message?.includes('Network request failed') || 
                                       (error as any)?.message?.includes('network');
                if (!isNetworkError) {
              console.error('Ошибка отметки уведомления:', error);
                }
            }
          }
        }
        
        // Фильтруем уведомления, исключая сообщения
        const filteredNotifications = notifications.filter((n: any) => {
          // Исключаем уведомления о сообщениях
          if (n.type === 'message') {
            return false;
          }
          // Включаем только нужные типы уведомлений
          return n.type === 'friend_request' || 
                 n.type === 'autograph_request' || 
                 n.type === 'stick_request' || 
                 n.type === 'gift_request' ||
                 n.type === 'gift_accepted' ||
                 n.type === 'achievement' || 
                 n.type === 'team_invite' || 
                 n.type === 'system' ||
                 n.type === 'stats_change' ||
                 n.type === 'photo_added' ||
                 n.type === 'video_liked' ||
                 n.type === 'photo_liked';
        });
        
        // Считаем только непрочитанные уведомления (запросы в друзья показываются отдельно)
        const unreadNotificationsCount = filteredNotifications.filter((n: any) => !n.is_read && n.type !== 'friend_request').length;
        
        // Загружаем непрочитанные сообщения (без логов)
        const { getUnreadMessageCount } = await import('../utils/playerStorage');
        const unreadMessagesCount = await getUnreadMessageCount(user.id);
        
        // Загружаем запросы в друзья для отдельного счетчика
        const { getReceivedFriendRequests } = await import('../utils/playerStorage');
        const receivedFriendRequests = await getReceivedFriendRequests(user.id);
        const friendRequestsCount = receivedFriendRequests.length;
        
        // Загружаем запросы на подарки (только для звезд)
        let giftRequestsCount = 0;
        if (user.status === 'star') {
          try {
            const { data: giftRequestsData, error: giftRequestsError } = await supabase
              .from('item_requests')
              .select('id')
              .eq('owner_id', user.id)
              .eq('status', 'pending');

            if (!giftRequestsError && giftRequestsData) {
              giftRequestsCount = giftRequestsData.length;
            }
          } catch (error) {
            console.error('Ошибка загрузки запросов на подарки:', error);
          }
        }
        
        const nextUser: Player = {
          ...user,
          unreadMessagesCount,
          friendRequestsCount,
          giftRequestsCount,
        };

        // НЕ перезаписываем локальный счетчик из базы!
        // Локальный счетчик обновляется только через updateNotificationCount()
        // при переходе в уведомления или явном обновлении

        // Обновляем пользователя с новыми счетчиками
        setCurrentUser(nextUser);
        
        // Сразу пересчитываем счетчик уведомлений (без задержки)
        await loadNotificationCount(nextUser.id);
        } catch (notificationError) {
          // Тихая обработка сетевых ошибок при загрузке уведомлений (отсутствие интернета)
          const isNetworkError = (notificationError as any)?.message?.includes('Network request failed') || 
                                 (notificationError as any)?.message?.includes('network') ||
                                 (notificationError as any)?.code === 'NETWORK_ERROR';
          
          if (!isNetworkError) {
            // Логируем только не-сетевые ошибки
            console.error('Ошибка загрузки уведомлений:', notificationError);
          }
          // При сетевых ошибках просто продолжаем работу без уведомлений
        }
        
      } else {
        setUserLoaded(false);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Ошибка загрузки текущего пользователя:', error);
      setUserLoaded(false);
    }
  };

  const loadUserRef = React.useRef(loadUser);
  React.useEffect(() => {
    loadUserRef.current = loadUser;
  });

  // Функция для принудительного обновления счетчиков
  const refreshCounters = async () => {
    if (currentUser) {
      await loadUser();
      // Дополнительно обновляем счетчик сообщений
      try {
        const { getUnreadMessageCount } = await import('../utils/playerStorage');
        const count = await getUnreadMessageCount(currentUser.id);
        if (count !== lastMessagesCountRef.current) {
          lastMessagesCountRef.current = count;
          setUnreadMessagesCount(count);
        }
      } catch (error) {
        console.error('❌ Ошибка обновления счетчика сообщений:', error);
      }
    }
  };

  // Функция для принудительного обновления счетчика уведомлений
  const forceRefreshNotifications = async () => {
    if (currentUser) {
      await loadUser();
    }
  };

  const refreshBadgeCounts = React.useCallback(async () => {
    if (!currentUser?.id) {
      return;
    }

    try {
      const { getUnreadMessageCount } = await import('../utils/playerStorage');
      const messageCount = await getUnreadMessageCount(currentUser.id);
      if (messageCount !== lastMessagesCountRef.current) {
        lastMessagesCountRef.current = messageCount;
        setUnreadMessagesCount(messageCount);
      }
    } catch (error) {
      console.error('❌ Ошибка обновления счетчика сообщений при возврате из фона:', error);
    }

    try {
      await loadNotificationCount(currentUser.id);
    } catch (error) {
      console.error('❌ Ошибка обновления счетчика уведомлений при возврате из фона:', error);
    }
  }, [currentUser?.id, loadNotificationCount]);

  const refreshBadgeCountsRef = React.useRef(refreshBadgeCounts);
  React.useEffect(() => {
    refreshBadgeCountsRef.current = refreshBadgeCounts;
  }, [refreshBadgeCounts]);

  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Начало инициализации приложения');

        // Нативный splash screen уже скрыт в начале файла для iOS
        // Здесь дополнительно скрываем для других платформ
        if (Platform.OS !== 'ios') {
          await safeHideSplashScreen();
        }
        
        // Инициализируем только критически важные ресурсы параллельно
        const initPromises = [
          initializeStorage(),
          Asset.loadAsync(GLOBAL_PRELOAD_ASSETS).catch(err => {
            console.warn('⚠️ Не удалось предзагрузить фон led:', err);
          }),
          // Предзагружаем данные пользователя в фоне, если он есть
          currentUser ? import('../utils/playerStorage').then(({ preloadUserData }) => 
            preloadUserData(currentUser.id).catch(err => 
              console.warn('⚠️ Предзагрузка данных пользователя не удалась:', err)
            )
          ) : Promise.resolve()
        ];
        
        console.log('🔄 Начало параллельной инициализации');
        await Promise.all(initPromises);
        console.log('✅ Параллельная инициализация завершена');
        
        
        // Счетчик уведомлений пересчитывается при загрузке через loadNotificationCount
        // НЕ восстанавливаем из AsyncStorage, чтобы избежать устаревших значений
        
        // Помечаем приложение как готовое
        setAppReady(true);
      } catch (catchError) {
        console.error('🚨 Ошибка инициализации приложения:', catchError);
        
        // При ошибке быстро скрываем Metro splash и показываем нашу заставку
        if (Platform.OS !== 'ios') {
          await safeHideSplashScreen();
        }
        
        // При ошибке сразу переходим к скрытию заставки
        
        // Помечаем приложение как готовое
        setAppReady(true);
        
        // При ошибке тоже добавляем минимальную задержку, но не больше 2 секунд
        const elapsed = Date.now() - splashStartTime.current;
        const maxSplashTime = 2000;
        const remainingTime = Math.max(0, maxSplashTime - elapsed);
        const hideDelay = remainingTime > 300 ? 300 : Math.max(0, remainingTime);
        
        setTimeout(() => {
          // При ошибке тоже плавно скрываем splash screen
          Animated.timing(splashOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }).start(() => {
            setShowSplash(false);
          });
        }, hideDelay);
      }
    };

    if (loaded) {
      initializeApp();
    }
  }, [loaded, error]);

  // Загружаем пользователя при инициализации и при возврате в приложение
  React.useEffect(() => {
    if (!loaded) return;
    // Загружаем пользователя сразу после загрузки шрифтов, не ждем appReady
    loadUser();
    
    // Периодическое обновление счетчика сообщений (каждые 5 секунд)
    // Это нужно для надежности, так как Realtime может не сработать
    const messagesInterval = setInterval(async () => {
      if (currentUser) {
        try {
          const { getUnreadMessageCount } = await import('../utils/playerStorage');
          const count = await getUnreadMessageCount(currentUser.id);
          if (count !== lastMessagesCountRef.current) {
            lastMessagesCountRef.current = count;
            setUnreadMessagesCount(count);
            // Также обновляем счетчик в БД для синхронизации
            await supabase
              .from('players')
              .update({ unread_messages_count: count })
              .eq('id', currentUser.id);
          }
        } catch (error) {
          console.error('❌ Ошибка периодического обновления счетчика сообщений:', error);
        }
      }
    }, 5000); // Каждые 5 секунд
    
    return () => {
      clearInterval(messagesInterval);
    };
  }, [loaded, currentUser?.id]);

  // Принудительно обновляем пользователя при переходе на главную страницу
  // Это нужно для корректного выхода из профиля
  const lastAppStateLoadRef = React.useRef<number>(0);
  const isUpdatingRef = React.useRef<boolean>(false);
  
  React.useEffect(() => {
    const handleFocus = () => {
      // Добавляем throttling - максимум один раз в 30 секунд
      // Увеличиваем интервал, чтобы избежать мигания индикатора
      const now = Date.now();
      if (now - lastAppStateLoadRef.current < 30000) {
        return; // Пропускаем вызов, если прошло меньше 30 секунд
      }
      
      // Предотвращаем множественные одновременные обновления
      if (isUpdatingRef.current) {
        return;
      }
      
      // Сохраняем текущее значение счетчика перед обновлением
      lastNotificationCountRef.current = unreadNotificationsStateRef.current;
      
      lastAppStateLoadRef.current = now;
      isUpdatingRef.current = true;

      refreshBadgeCountsRef.current?.();

      // Увеличиваем задержку для более плавного обновления
      // НЕ обновляем счетчик уведомлений при возврате из фона, чтобы избежать мигания
      // Счетчик обновляется через Realtime подписку автоматически
      setTimeout(() => {
        loadUserRef.current?.().finally(() => {
          isUpdatingRef.current = false;
        });
      }, 1000); // Увеличено до 1 секунды для более плавного обновления
    };

    // Добавляем слушатель для обновления при фокусе на приложении
    // AppState только для мобильных платформ
    let subscription: { remove: () => void } | null = null;
    if (Platform.OS !== 'web') {
      try {
        // Безопасная проверка доступности модуля
        if (typeof require !== 'undefined') {
          const ReactNative = require('react-native');
          const AppStateModule = ReactNative?.AppState;
          if (AppStateModule) {
            subscription = AppStateModule.addEventListener('change', (nextAppState: string) => {
              if (nextAppState === 'active') {
                handleFocus();
              }
            });
          }
        }
      } catch (e) {
        // AppState недоступен
      }
    }

    return () => subscription?.remove();
  }, []);

  // Обработчик push-уведомлений для deep links
  React.useEffect(() => {
    const notificationListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      const deepLink = data?.deepLink;
      
      if (deepLink) {
        console.log('🔗 Deep link из уведомления:', deepLink);
        
        // Небольшая задержка для завершения навигации
        setTimeout(() => {
          // Добавляем параметр для автоматической прокрутки в чат
          if (typeof deepLink === 'string' && deepLink.startsWith('/chat/')) {
            router.push(`${deepLink}?scrollToBottom=true` as any);
          } else {
            router.push(deepLink as any);
          }
        }, 500);
      }
    });

    return () => notificationListener.remove();
  }, []);

  // Дополнительная загрузка пользователя при возврате в приложение
  // ОТКЛЮЧЕНО - вызывает редиректы
  // React.useEffect(() => {
  //   if (appState === 'active' && appReady) {
  //       loadUser();
  //     }
  // }, [appState, appReady]);

  // Загружаем счетчик уведомлений при смене пользователя
  // НО не обновляем при возврате из фона, чтобы избежать мигания
  const lastUserIdRef = React.useRef<string | null>(null);
  React.useEffect(() => {
    if (currentUser?.id) {
      // Обновляем счетчик только если пользователь действительно изменился
      // (не при возврате из фона, когда currentUser остается тем же)
      if (lastUserIdRef.current !== currentUser.id) {
        lastUserIdRef.current = currentUser.id;
        loadNotificationCount(currentUser.id);
      } else {
        // Если пользователь не изменился, обновляем счетчик только если он изменился
        // Используем skipUpdateIfSame, чтобы не мигать индикатором
        loadNotificationCount(currentUser.id, true);
      }
    }
  }, [currentUser?.id, loadNotificationCount]);

  // Инициализация счетчика при загрузке пользователя
  React.useEffect(() => {
    if (currentUser) {
      if (currentUser.unreadMessagesCount !== undefined) {
        lastMessagesCountRef.current = currentUser.unreadMessagesCount;
      setUnreadMessagesCount(currentUser.unreadMessagesCount);
      } else {
        // Если счетчик не загружен, загружаем его
        (async () => {
          try {
            const { getUnreadMessageCount } = await import('../utils/playerStorage');
            const count = await getUnreadMessageCount(currentUser.id);
            lastMessagesCountRef.current = count;
            setUnreadMessagesCount(count);
          } catch (error) {
            console.error('❌ Ошибка загрузки счетчика сообщений:', error);
          }
        })();
      }
    }
  }, [currentUser?.id]);

  // Realtime подписка на изменения счетчиков
  React.useEffect(() => {
    if (!currentUser) {
      return;
    }

    // Устанавливаем callback для обновления счетчика уведомлений
    // Добавляем проверку, чтобы избежать мигания индикатора
    realtimeManager.setNotificationCountCallback((count: number) => {
      // Обновляем UI только если значение действительно изменилось
      // Используем ref для проверки, чтобы не зависеть от состояния в зависимостях
      if (count !== lastNotificationCountRef.current) {
        lastNotificationCountRef.current = count;
        setUnreadNotificationsCount(count);
      }
    });

    // Обновляем ТОЛЬКО отдельный счетчик, НЕ трогаем currentUser
    realtimeManager.setMessagesCountCallback((count: number) => {
      if (count !== lastMessagesCountRef.current) {
        lastMessagesCountRef.current = count;
      setUnreadMessagesCount(count);
      }
    });

    // Инициализируем последние значения счетчиков в RealtimeManager
    // для предотвращения ложных срабатываний при первой настройке подписок
    lastMessagesCountRef.current = unreadMessagesCount;
    realtimeManager.initializeCounts(
      lastNotificationCountRef.current,
      unreadMessagesCount
    );

    // Используем централизованный менеджер подписок
    realtimeManager.setupSubscriptions(currentUser.id);

    return () => {
      // Отключаем подписки при размонтировании
      realtimeManager.disconnect();
    };
  }, [currentUser?.id, unreadMessagesCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // Обновляем счетчики при фокусе на экране сообщений
  React.useEffect(() => {
    // Главный экран получил фокус
    refreshCounters();
  }, []);

  // Принудительно обновляем счетчик уведомлений при фокусе на главном экране
  React.useEffect(() => {
    // При фокусе на главном экране обновляем счетчик уведомлений
    if (currentUser) {
      // Убираем loadUser() чтобы не вызывать updateNotificationCount
      // loadUser();
      
      // Добавляем дополнительную задержку для надежности обновления счетчика
      // setTimeout(() => {
      //   if (currentUser) {
      //     loadUser();
      //   }
      // }, 1000);
    }
  }, [currentUser]);

  // Обработчик события для обновления счетчика уведомлений
  React.useEffect(() => {
    // Просто обновляем счетчики каждые 3 секунды
    // Это уже реализовано в основном useEffect выше
  }, []);

  // Условный импорт Image только для мобильных платформ
  const Image = Platform.OS === 'web' 
    ? require('react-native-web').Image 
    : (() => {
        try {
          if (typeof require !== 'undefined') {
            const ReactNative = require('react-native');
            return ReactNative?.Image;
          }
        } catch {
          // Игнорируем ошибки
        }
        // Fallback на react-native-web если react-native недоступен
        return require('react-native-web').Image;
      })();
  
  return (
    <LanguageProvider>
      <CountryFilterProvider>
        <YearFilterProvider>
          <ScreenProvider>
            <UserProvider>
              <UserSync />
              <NotificationProvider updateNotificationCount={updateNotificationCount}>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <StatusBar 
                barStyle="light-content" 
                backgroundColor="#050008" 
                translucent={false}
                hidden={false}
              />
              
              {/* Глобальный хедер - не перерендеривается при переходах */}
              <LogoHeader />
              
              <Tabs
            screenOptions={{
              headerShown: false, // Убираем встроенные хедеры
              tabBarStyle: { 
                backgroundColor: '#050008', 
                borderTopWidth: 0,
                height: 80,
                paddingBottom: Platform.OS === 'android' ? 0 : 10, // Убираем отступ снизу для Android
                paddingTop: 10
              },
              tabBarActiveTintColor: '#fff',
              tabBarInactiveTintColor: '#888',
              tabBarShowLabel: false,
              // Анимации отключены для лучшей производительности
              animationEnabled: false,
            }}
          >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ size }) => {
              const iconSize = Platform.OS === 'ios' ? (size - 2) * 1.1 : size - 2;
              return (
              <View style={{
                backgroundColor: '#fa2f40',
                borderRadius: 20,
                width: 40,
                height: 40,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                  <Ionicons name="home" size={iconSize} color="#fff" />
              </View>
              );
            },
          }}
        />
        <Tabs.Screen
          name="messages"
          listeners={{
            tabPress: (e: any) => {
              if (!currentUser) {
                e.preventDefault();
                router.replace('/login');
              }
            },
          }}
          options={{
            lazy: false,
            tabBarIcon: ({ size, focused }) => {
              const iconSize = Platform.OS === 'ios' ? (size - 2) * 1.1 : size - 2;
              return (
                <View style={{
                  position: 'relative',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: size + 4,
                  height: size + 4,
                }}>
                  <Ionicons name="chatbubble-outline" size={iconSize} color={focused ? '#eee' : '#aaa'} />
                  {unreadMessagesCount > 0 && (
                    <View style={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      backgroundColor: '#fa2f40',
                      borderRadius: 10,
                      width: 20,
                      height: 20,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}>
                      <Text style={{
                        color: '#fff',
                        fontSize: 12,
                        fontFamily: 'Gilroy-Bold',
                      }}>
                        {String(unreadMessagesCount)}
                      </Text>
                    </View>
                  )}
                </View>
              );
            },
          }}
        />
        <Tabs.Screen
          name="notifications"
          listeners={{
            tabPress: (e: any) => {
              if (!currentUser) {
                e.preventDefault();
                router.replace('/login');
              }
            },
          }}
          options={{
            lazy: false,
            tabBarIcon: NotificationsTabIcon,
          }}
        />

        <Tabs.Screen
          name="search"
          listeners={{
            tabPress: (e: any) => {
              if (!currentUser) {
                e.preventDefault();
                router.replace('/login');
              }
            },
          }}
          options={{
            lazy: false,
            tabBarIcon: ({ size, focused }) => {
              const iconSize = Platform.OS === 'ios' ? (size - 2) * 1.1 : size - 2;
              return <Ionicons name="search-outline" size={iconSize} color={focused ? '#eee' : '#aaa'} />;
            },
          }}
        />

        <Tabs.Screen
          name="exercises"
          listeners={{
            tabPress: (e: any) => {
              if (!currentUser) {
                e.preventDefault();
                router.replace('/login');
              }
            },
          }}
          options={{
            lazy: false,
            tabBarIcon: ({ size, focused }) => {
              const iconSize = Platform.OS === 'ios' ? (size - 2) * 1.1 : size - 2;
              return <Ionicons name="barbell-outline" size={iconSize} color={focused ? '#eee' : '#aaa'} />;
            },
          }}
        />

        <Tabs.Screen
          name="exercise-details"
          options={{
            href: null,
          }}
        />

        <Tabs.Screen
          name="login"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="register"
          options={{
            href: null,
          }}
              />


        <Tabs.Screen
          name="chat/[id]"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="player/[id]"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="admin"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="admin/create-user"
          options={{
            href: null,
          }}
        />

        
        {/* <Tabs.Screen
          name="(tabs)"
          options={{
            href: null,
            headerTitle: () => <LogoHeader />,
          }}
        /> */}
        <Tabs.Screen
          name="+not-found"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="messages/mass"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="components/Puck"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="puck-speed-sound"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="puck-test"
          options={{
            href: null,
          }}
        />

          </Tabs>
          
          {/* Splash screen поверх всего интерфейса */}
          {(!loaded || showSplash || !appReady) && (
            <Animated.View style={{ 
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: '#050008',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 9999,
              elevation: 9999,
              opacity: splashOpacity,
            }}>
              <Image 
                source={require('../assets/images/splash-icon.png')} 
                style={{ 
                  width: 200, // Оптимизированный размер для лучшего соответствия нативному splash
                  height: 200
                }}
                resizeMode="contain"
              />
            </Animated.View>
          )}
          </GestureHandlerRootView>
              </NotificationProvider>
            </UserProvider>
          </ScreenProvider>
        </YearFilterProvider>
      </CountryFilterProvider>
    </LanguageProvider>
  );
}

