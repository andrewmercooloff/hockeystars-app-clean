import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Tabs, useRouter } from 'expo-router';
import * as React from 'react';
import { AppState, LogBox, Platform, Text, TextInput, TouchableOpacity, View, Animated, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LogoHeader from '../components/LogoHeader';
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
import { configureSystemUI } from '../utils/systemUI';
import { scaleSize, scaleFont } from '../utils/fontUtils';
import { forceGilroyFont } from '../utils/forceGilroyFont';
import { initializeSounds } from '../utils/soundService';

// Предотвращаем автоматическое скрытие заставки
SplashScreen.preventAutoHideAsync();

// Устанавливаем черный фон для веб-версии
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  document.body.style.backgroundColor = '#000000';
  document.documentElement.style.backgroundColor = '#000000';
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
      
      // Устанавливаем Gilroy как шрифт по умолчанию для всего приложения
      const TextRender = Text.render;
      const TextInputRender = TextInput.render;
      
      // Для Text компонентов - применяем Gilroy если шрифт не указан
      Text.render = function (props: any, ref: any) {
        let hasFont = false;
        
        // Проверяем, есть ли уже fontFamily в стилях
        if (props.style) {
          if (Array.isArray(props.style)) {
            hasFont = props.style.some((s: any) => s && typeof s === 'object' && s.fontFamily);
          } else if (typeof props.style === 'object') {
            hasFont = !!props.style.fontFamily;
          }
        }
        
        const defaultProps = {
          ...props,
          style: [
            // Только добавляем Gilroy если шрифт не указан
            !hasFont && { fontFamily: 'Gilroy-Regular' },
            props.style,
          ],
        };
        return TextRender.call(this, defaultProps, ref);
      };
      
      // Для TextInput компонентов - применяем Gilroy если шрифт не указан
      TextInput.render = function (props: any, ref: any) {
        let hasFont = false;
        
        // Проверяем, есть ли уже fontFamily в стилях
        if (props.style) {
          if (Array.isArray(props.style)) {
            hasFont = props.style.some((s: any) => s && typeof s === 'object' && s.fontFamily);
          } else if (typeof props.style === 'object') {
            hasFont = !!props.style.fontFamily;
          }
        }
        
        const defaultProps = {
          ...props,
          style: [
            // Только добавляем Gilroy если шрифт не указан
            !hasFont && { fontFamily: 'Gilroy-Regular' },
            props.style,
          ],
        };
        return TextInputRender.call(this, defaultProps, ref);
      };
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
          backgroundColor: '#000',
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
  
  // Функция для загрузки счетчика уведомлений из БД
  const loadNotificationCount = React.useCallback(async (userId: string) => {
    try {
      console.log('📊 Загружаем счетчик уведомлений для пользователя:', userId);
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
      console.log('✅ Счетчик уведомлений загружен:', count);
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
      const user = await loadCurrentUser();
      setUserLoaded(true);
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
               console.log('🚀 НАЧИНАЕМ ИНИЦИАЛИЗАЦИЮ PUSH-УВЕДОМЛЕНИЙ для пользователя:', user.id);
               const pushResult = await initializePushNotifications(user.id);
               console.log('🚀 РЕЗУЛЬТАТ ИНИЦИАЛИЗАЦИИ PUSH-УВЕДОМЛЕНИЙ:', pushResult);
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
          unreadNotificationsCount: unreadNotificationsCount, // Сохраняем для истории
          unreadMessagesCount,
          friendRequestsCount,
          giftRequestsCount,
        };

        // НЕ перезаписываем локальный счетчик из базы!
        // Локальный счетчик обновляется только через updateNotificationCount()
        // при переходе в уведомления или явном обновлении

        // Избегаем лишних перерисовок, если значения не изменились
        setCurrentUser(prev => {
          if (
            prev &&
            prev.id === nextUser.id &&
            (prev.unreadMessagesCount || 0) === (nextUser.unreadMessagesCount || 0) &&
            (prev.friendRequestsCount || 0) === (nextUser.friendRequestsCount || 0) &&
            (prev.giftRequestsCount || 0) === (nextUser.giftRequestsCount || 0)
          ) {
            return prev;
          }
          lastUserLoadTime.current = Date.now();
          return nextUser;
        });
        
        // Обновляем счетчик уведомлений после установки currentUser
        setTimeout(() => {
          updateNotificationCount(nextUser);
        }, 100);
        
      } else {
        setUserLoaded(false);
        if (currentUser !== null) {
          setCurrentUser(null);
        }
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

        // Быстро скрываем нативный Metro splash screen
        await SplashScreen.hideAsync();
        
        // Инициализируем только критически важные ресурсы
        await initializeStorage();
        
        
        // Восстанавливаем счетчик уведомлений из AsyncStorage
        if (currentUser) {
          try {
            const savedCount = await AsyncStorage.getItem(`unreadNotificationsCount_${currentUser.id}`);
            if (savedCount !== null) {
              const parsedCount = parseInt(savedCount, 10);
              
              // Просто устанавливаем локальное состояние
              // НЕ трогаем базу данных - она управляется SQL функциями
              setUnreadNotificationsCount(parsedCount);
            }
          } catch (error) {
            console.error('❌ Ошибка восстановления счетчика уведомлений:', error);
          }
        }
        
        // Помечаем приложение как готовое
        setAppReady(true);
        
        
        // Дополнительные полсекунды для показа заставки
        setTimeout(() => {
          // Плавно скрываем наш кастомный splash screen
          Animated.timing(splashOpacity, {
            toValue: 0,
            duration: 500, // 500ms плавное исчезновение
            useNativeDriver: true,
          }).start(() => {
            setShowSplash(false);
          });
        }, 500); // Дополнительные полсекунды
      } catch (catchError) {
        console.error('🚨 App Initialization Error:', catchError);
        
        // При ошибке быстро скрываем Metro splash и показываем нашу заставку
        try {
          await SplashScreen.hideAsync();
        } catch (finalError) {
          console.error('🚨 Final Metro Splash Screen Hide Error:', finalError);
        }
        
        // При ошибке сразу переходим к скрытию заставки
        
        // Помечаем приложение как готовое
        setAppReady(true);
        
        // При ошибке тоже добавляем задержку для консистентности
        setTimeout(() => {
          // При ошибке тоже плавно скрываем splash screen
          Animated.timing(splashOpacity, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true,
          }).start(() => {
            setShowSplash(false);
          });
        }, 500); // Та же задержка что и в успешном случае
      }
    };

    if (loaded) {
      initializeApp();
    }
  }, [loaded, error]);

  // Загружаем пользователя при инициализации и при возврате в приложение
  React.useEffect(() => {
    if (!loaded || !appReady) return;
    loadUser();
    // УБРАЛИ setInterval - теперь счетчик обновляется только через Realtime!
  }, [loaded, appReady]);

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

  // Realtime подписка на изменения счетчика уведомлений
  React.useEffect(() => {
    if (!currentUser) {
      console.log('⚠️ Realtime подписки НЕ настроены - нет currentUser');
      return;
    }

    console.log('🔌 Настраиваем Realtime подписки для пользователя:', currentUser.id);


    const notificationsChannel = supabase
      .channel('notifications-updates')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`
        },
        (payload) => {
          console.log('🔔 Новое уведомление получено через Realtime!', payload);
          // Обновляем счетчик уведомлений из БД
          if (currentUser?.id) {
            loadNotificationCount(currentUser.id);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Статус подписки notifications-updates:', status);
      });

    // Подписываемся на изменения поля unread_notifications_count в таблице players
    const playersChannel = supabase
      .channel('players-notifications-count')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'players',
          filter: `id=eq.${currentUser.id}`
        },
        (payload) => {
          console.log('🔄 Счетчик уведомлений изменен в БД через Realtime:', payload.new.unread_notifications_count);
          // Обновляем локальный счетчик
          setUnreadNotificationsCount(payload.new.unread_notifications_count || 0);
        }
      )
      .subscribe((status) => {
        console.log('📡 Статус подписки players-notifications-count:', status);
      });

    return () => {
      console.log('🔌 Отключаем Realtime подписки');
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(playersChannel);
    };
  }, [currentUser?.id, loadNotificationCount]);

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
            <NotificationProvider updateNotificationCount={updateNotificationCount}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <StatusBar 
              barStyle="light-content" 
              backgroundColor="#000000" 
              translucent={false}
              hidden={false}
            />
          <Tabs
          screenOptions={{
            headerStyle: { backgroundColor: '#000', height: 128 },
            headerTitleAlign: 'center',
            tabBarStyle: { 
              backgroundColor: '#000', 
              borderTopWidth: 0,
              height: 80,
              paddingBottom: 10,
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
            headerTitle: () => <LogoHeader />,
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
            headerTitle: () => <LogoHeader />,
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
                  {currentUser && currentUser.unreadMessagesCount > 0 && (
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
            headerTitle: () => <LogoHeader />,
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
            headerTitle: () => <LogoHeader />,
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
            headerTitle: () => <LogoHeader />,
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
            headerTitle: () => <LogoHeader />,
          }}
        />

        <Tabs.Screen
          name="login"
          options={{
            href: null,
            headerTitle: () => <LogoHeader />,
          }}
        />
        <Tabs.Screen
          name="register"
          options={{
            href: null,
            headerTitle: () => <LogoHeader />,
          }}
              />


        <Tabs.Screen
          name="chat/[id]"
          options={{
            href: null,
            headerTitle: () => <LogoHeader />,
          }}
        />
        <Tabs.Screen
          name="player/[id]"
          options={{
            href: null,
            headerTitle: () => <LogoHeader />,
          }}
        />
        <Tabs.Screen
          name="admin"
          options={{
            href: null,
            headerTitle: () => <LogoHeader />,
          }}
        />
        <Tabs.Screen
          name="admin/create-user"
          options={{
            href: null,
            headerTitle: () => <LogoHeader />,
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
            headerTitle: () => <LogoHeader />,
          }}
        />
        <Tabs.Screen
          name="components/Puck"
          options={{
            href: null,
            headerTitle: () => <LogoHeader />,
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
              backgroundColor: '#000',
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
          </ScreenProvider>
        </YearFilterProvider>
      </CountryFilterProvider>
    </LanguageProvider>
  );
}
