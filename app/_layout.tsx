import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Tabs, useRouter } from 'expo-router';
import * as React from 'react';
import { AppState, LogBox, Text, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LogoHeader from '../components/LogoHeader';
import { CountryFilterProvider, useCountryFilter } from '../utils/CountryFilterContext';
import { YearFilterProvider } from '../utils/YearFilterContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { initializeStorage, loadCurrentUser, markNotificationAsRead, Player } from '../utils/playerStorage';
import { supabase } from '../utils/supabase';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

// Предотвращаем автоматическое скрытие заставки
SplashScreen.preventAutoHideAsync();

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
  const [appState, setAppState] = React.useState<string>(AppState.currentState);
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
          color="#FF4444" 
        />
      </TouchableOpacity>
    );
  });



  const [currentUser, setCurrentUser] = React.useState<Player | null>(null);

  // автоопределение включено: будет использоваться в главном экране

  const loadUser = async () => {
    // throttle frequent loads
    if (Date.now() - (lastUserLoadTime.current ?? 0) < 1500) {
      return;
    }
    try {
      const user = await loadCurrentUser();
      if (user) {
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
                 n.type === 'system';
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
          unreadNotificationsCount,
          unreadMessagesCount,
          friendRequestsCount,
          giftRequestsCount,
        };

        // Избегаем лишних перерисовок, если значения не изменились
        setCurrentUser(prev => {
          if (
            prev &&
            prev.id === nextUser.id &&
            (prev.unreadNotificationsCount || 0) === (nextUser.unreadNotificationsCount || 0) &&
            (prev.unreadMessagesCount || 0) === (nextUser.unreadMessagesCount || 0) &&
            (prev.friendRequestsCount || 0) === (nextUser.friendRequestsCount || 0) &&
            (prev.giftRequestsCount || 0) === (nextUser.giftRequestsCount || 0)
          ) {
            return prev;
          }
          lastUserLoadTime.current = Date.now();
          return nextUser;
        });
        
      } else {
        if (currentUser !== null) {
          setCurrentUser(null);
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки текущего пользователя:', error);
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
    if (loaded) {
      // Инициализируем хранилище при загрузке приложения
      initializeStorage();
      
      // Скрываем заставку после инициализации
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Постоянный опрос счетчиков; защита от лишних перерисовок внутри loadUser
  React.useEffect(() => {
    if (!loaded || appState !== 'active') return;
    loadUser();
    const interval = setInterval(() => {
      if (appState === 'active') {
        loadUser();
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [loaded, appState]);

  // Обновляем счетчик уведомлений при фокусе
  React.useEffect(() => {
    if (currentUser) {
      loadUser();
      
      // Принудительно обновляем профиль при смене пользователя
      // Это поможет решить проблему с необновлением профиля
      setTimeout(() => {
        if (currentUser) {
          loadUser();
        }
      }, 500);
    }
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
      loadUser();
      
      // Добавляем дополнительную задержку для надежности обновления счетчика
      setTimeout(() => {
        if (currentUser) {
          loadUser();
        }
      }, 1000);
    }
  }, [currentUser]);

  // Обработчик события для обновления счетчика уведомлений
  React.useEffect(() => {
    // Просто обновляем счетчики каждые 3 секунды
    // Это уже реализовано в основном useEffect выше
  }, []);

  if (!loaded) {
    return null;
  }

  return (
    <LanguageProvider>
      <CountryFilterProvider>
        <YearFilterProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
          <Tabs
          screenOptions={{
            headerStyle: { backgroundColor: '#000', height: 128 },
            headerTitleAlign: 'center',
            tabBarStyle: { backgroundColor: '#000', borderTopWidth: 0 },
            tabBarActiveTintColor: '#fff',
            tabBarInactiveTintColor: '#888',
            tabBarShowLabel: false, // Убираем подписи к иконкам
          }}
        >
        <Tabs.Screen
          name="index"
          options={{
            headerTitle: () => <LogoHeader />,
            tabBarIcon: ({ size }) => (
              <View style={{
                backgroundColor: '#FF4444',
                borderRadius: 20,
                width: 40,
                height: 40,
                justifyContent: 'center',
                alignItems: 'center',
              }}>
                <Ionicons name="home" size={size - 2} color="#fff" />
              </View>
            ),
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
              // Рендерим иконку сообщений
              return (
                <View style={{
                  position: 'relative',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: size + 4,
                  height: size + 4,
                }}>
                  <Ionicons name="chatbubble-outline" size={size - 2} color={focused ? '#eee' : '#aaa'} />
                  {currentUser && currentUser.unreadMessagesCount && currentUser.unreadMessagesCount > 0 && (
                    <View style={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      backgroundColor: '#FF4444',
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
                        {currentUser.unreadMessagesCount}
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
            tabBarIcon: ({ size, focused }) => {
              // Рендерим только иконку уведомлений
              return (
                <View style={{
                  position: 'relative',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: size + 4,
                  height: size + 4,
                }}>
                  <Ionicons name="notifications-outline" size={size - 2} color={focused ? '#eee' : '#aaa'} />
                  {(() => {
                    const total =
                      (currentUser?.unreadNotificationsCount ?? 0) +
                      (currentUser?.friendRequestsCount ?? 0) +
                      (currentUser?.giftRequestsCount ?? 0);
                    if (!currentUser || total <= 0) return null;
                    const isDouble = total > 9;
                    return (
                    <View style={{
                      position: 'absolute',
                      top: -8,
                      right: -8,
                      backgroundColor: '#FF4444',
                      borderRadius: 10,
                      minWidth: isDouble ? 24 : 20,
                      height: 20,
                      justifyContent: 'center',
                      alignItems: 'center',
                      paddingHorizontal: 4,
                    }}>
                      <Text style={{
                        color: '#fff',
                        fontSize: isDouble ? 10 : 12,
                        fontFamily: 'Gilroy-Bold',
                      }}>
                        {total}
                      </Text>
                    </View>
                    );
                  })()}
                </View>
              );
            },
          }}
        />

        <Tabs.Screen
          name="search"
          options={{
            headerTitle: () => <LogoHeader />,
            tabBarIcon: ({ size, focused }) => (
              <Ionicons name="search-outline" size={size - 2} color={focused ? '#eee' : '#aaa'} />
            ),
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
            tabBarIcon: ({ size, focused }) => (
              <Ionicons name="barbell-outline" size={size - 2} color={focused ? '#eee' : '#aaa'} />
            ),
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
          </GestureHandlerRootView>
        </YearFilterProvider>
      </CountryFilterProvider>
    </LanguageProvider>
  );
}
