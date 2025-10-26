import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Tabs, useRouter, useLocalSearchParams } from 'expo-router';
import * as React from 'react';
import { AppState, LogBox, Platform, Text, TextInput, TouchableOpacity, View, Animated, StatusBar } from 'react-native';
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

// Предотвращаем автоматическое скрытие заставки
SplashScreen.preventAutoHideAsync();

// Устанавливаем черный фон для веб-версии
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.body.style.backgroundColor = '#050008';
  document.documentElement.style.backgroundColor = '#050008';
}

// Отключаем все предупреждения
LogBox.ignoreAllLogs();
// In production, silence runtime logs to avoid noisy output
if (typeof __DEV__ !== 'undefined' && !__DEV__) {
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
  const [appState, setAppState] = React.useState<string>(AppState.currentState);
  const [showSplash, setShowSplash] = React.useState<boolean>(true);
  const [appReady, setAppReady] = React.useState<boolean>(false);
  const [userLoaded, setUserLoaded] = React.useState<boolean>(false);
  const splashOpacity = React.useRef(new Animated.Value(1)).current;
  
  React.useEffect(() => {
    const subscription = AppState.addEventListener('change', nextAppState => {
      setAppState(nextAppState);
    });
    return () => subscription?.remove();
  }, []);
  const router = useRouter();
  const [loaded, error] = useFonts({
    'Gilroy-Regular': require('../assets/fonts/gilroy-regular.ttf'),
    'Gilroy-Bold': require('../assets/fonts/gilroy-bold.ttf'),
    'SpaceMono': require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

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

  // Внутренний компонент для синхронизации с UserContext
  const UserSync = () => {
    const { currentUser: globalUser, setCurrentUser: setGlobalUser, refreshUser, isUserLoading } = useUser();
    const params = useLocalSearchParams();
    
    // Синхронизируем ГЛОБАЛЬНОЕ состояние с ЛОКАЛЬНЫМ (context -> layout)
    React.useEffect(() => {
      setCurrentUser(globalUser);
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
    
    // Флаг для предотвращения повторного скрытия splash screen
    const [splashScreenHidden, setSplashScreenHidden] = React.useState(false);
    
    // Скрываем splash screen когда приложение готово
    React.useEffect(() => {
      console.log(`🔍 Проверка условий скрытия splash screen: 
        appReady=${appReady}, 
        isUserLoading=${isUserLoading}, 
        showSplash=${showSplash}`);

      // Принудительное скрытие splash screen через 5 секунд, если что-то пошло не так
      const forceHideSplashTimeout = setTimeout(() => {
        if (!splashScreenHidden) {
          console.log('⏰ Принудительное скрытие splash screen по таймауту');
          Animated.timing(splashOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }).start(() => {
            console.log('🏁 Splash screen скрыт по таймауту');
            setShowSplash(false);
            setSplashScreenHidden(true);
          });
        }
      }, 5000);

      if (appReady && !splashScreenHidden) {
        // Плавно скрываем наш кастомный splash screen когда все загружено
        clearTimeout(forceHideSplashTimeout);
        
        Animated.timing(splashOpacity, {  
          toValue: 0,
          duration: 500, // 500ms плавное исчезновение
          useNativeDriver: true,
        }).start(() => {
          console.log('🏁 Splash screen скрыт по готовности приложения');
          setShowSplash(false);
          setSplashScreenHidden(true);
        });
      }

      return () => {
        clearTimeout(forceHideSplashTimeout);
      };
    }, [appReady, splashScreenHidden]);
    
    return null;
  };
  
  // Функция для загрузки счетчика уведомлений из БД
  const loadNotificationCount = React.useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('unread_notifications_count')
        .eq('id', userId)
        .single();
      
      if (error) {
        console.error('❌ Ошибка загрузки счетчика уведомлений:', error);
        return;
      }
      
      const count = data?.unread_notifications_count || 0;
      setUnreadNotificationsCount(count);
    } catch (error) {
      console.error('❌ Ошибка загрузки счетчика:', error);
    }
  }, []);

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
        const { data: notificationsData, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) {
          console.error('Ошибка загрузки уведомлений:', error);
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
              console.error('Ошибка отметки уведомления:', error);
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
                 n.type === 'gift_accepted' ||
                 n.type === 'achievement' || 
                 n.type === 'team_invite' || 
                 n.type === 'system' ||
                 n.type === 'stats_change' ||
               n.type === 'photo_added';
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
        
        // Обновляем счетчик уведомлений после установки currentUser
        setTimeout(() => {
          updateNotificationCount(nextUser);
        }, 100);
        
      } else {
        setUserLoaded(false);
        setCurrentUser(null);
      }
    } catch (error) {
      console.error('Ошибка загрузки текущего пользователя:', error);
      setUserLoaded(false);
    }
  };

  // Функция для принудительного обновления счетчиков
  const refreshCounters = async () => {
    if (currentUser) {
      await loadUser();
    }
  };

  // Функция для принудительного обновления счетчика уведомлений
  const forceRefreshNotifications = async () => {
    if (currentUser) {
      await loadUser();
    }
  };

  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Начало инициализации приложения');

        // Быстро скрываем нативный Metro splash screen
        try {
          await SplashScreen.hideAsync();
          console.log('✅ Нативный splash screen скрыт');
        } catch (splashError) {
          console.log('ℹ️ Splash screen already hidden or not registered:', splashError.message);
        }
        
        // Инициализируем только критически важные ресурсы параллельно
        const initPromises = [
          initializeStorage(),
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
        
        
        // Восстанавливаем счетчик уведомлений из AsyncStorage
        if (currentUser) {
          try {
            const savedCount = await AsyncStorage.getItem(`unreadNotificationsCount_${currentUser.id}`);
            if (savedCount !== null) {
              const parsedCount = parseInt(savedCount, 10);
              
              // Просто устанавливаем локальное состояние
              // НЕ трогаем базу данных - она управляется SQL функциями
              setUnreadNotificationsCount(parsedCount);
              console.log(`✅ Восстановлен счетчик уведомлений: ${parsedCount}`);
            }
          } catch (error) {
            console.error('❌ Ошибка восстановления счетчика уведомлений:', error);
          }
        }
        
        // Помечаем приложение как готовое
        console.log('🏁 Приложение помечено как готовое');
        setAppReady(true);
      } catch (catchError) {
        console.error('🚨 Ошибка инициализации приложения:', catchError);
        
        // При ошибке быстро скрываем Metro splash и показываем нашу заставку
        try {
          await SplashScreen.hideAsync();
        } catch (finalError) {
          console.log('ℹ️ Splash screen already hidden or not registered:', finalError.message);
        }
        
        // При ошибке сразу переходим к скрытию заставки
        
        // Помечаем приложение как готовое
        console.log('🏁 Приложение помечено как готовое после ошибки');
        setAppReady(true);
        
        // При ошибке тоже добавляем задержку для консистентности
        setTimeout(() => {
          // При ошибке тоже плавно скрываем splash screen
          Animated.timing(splashOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }).start(() => {
            console.log('🏁 Splash screen скрыт');
            setShowSplash(false);
          });
        }, 500); // Та же задержка что и в успешном случае
      }
    };

    console.log(`🔍 Проверка условий: loaded=${loaded}, error=${error}`);
    if (loaded) {
      initializeApp();
    }
  }, [loaded, error]);

  // Загружаем пользователя при инициализации и при возврате в приложение
  React.useEffect(() => {
    if (!loaded) return;
    // Загружаем пользователя сразу после загрузки шрифтов, не ждем appReady
    loadUser();
    // УБРАЛИ setInterval - теперь счетчик обновляется только через Realtime!
  }, [loaded]);

  // Принудительно обновляем пользователя при переходе на главную страницу
  // Это нужно для корректного выхода из профиля
  React.useEffect(() => {
    const handleFocus = () => {
      // Небольшая задержка для того, чтобы навигация завершилась
      setTimeout(() => {
        loadUser();
      }, 100);
    };

    // Добавляем слушатель для обновления при фокусе на приложении
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        handleFocus();
      }
    });

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
  React.useEffect(() => {
    if (appState === 'active' && appReady) {
        loadUser();
      }
  }, [appState, appReady]);

  // Загружаем счетчик уведомлений при смене пользователя
  React.useEffect(() => {
    if (currentUser?.id) {
      loadNotificationCount(currentUser.id);
    }
  }, [currentUser?.id, loadNotificationCount]);

  // Realtime подписка на изменения счетчиков
  React.useEffect(() => {
    if (!currentUser) {
      return;
    }

    // Устанавливаем callback для обновления счетчика уведомлений
    realtimeManager.setNotificationCountCallback((count: number) => {
      setUnreadNotificationsCount(count);
    });

    // Устанавливаем callback для обновления счетчика сообщений
    realtimeManager.setMessagesCountCallback((count: number) => {
      console.log('🔄 Счетчик сообщений изменен через RealtimeManager:', count);
      // Обновляем UserContext для обновления индикатора
      loadUser();
    });

    // Используем централизованный менеджер подписок
    realtimeManager.setupSubscriptions(currentUser.id);

    return () => {
      // Отключаем подписки при размонтировании
      realtimeManager.disconnect();
    };
  }, [currentUser?.id]);

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

  const Image = require('react-native').Image;
  
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
                  {currentUser && (currentUser.unreadMessagesCount || 0) > 0 && (
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
                        {String(currentUser.unreadMessagesCount || 0)}
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
          name="components/Puck"
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
                  width: 300, // Увеличено в 1.5 раза (200 * 1.5 = 300)
                  height: 300
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
