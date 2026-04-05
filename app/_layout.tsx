import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Tabs, useRouter, useLocalSearchParams, usePathname } from 'expo-router';
import * as React from 'react';
import { LogBox, Platform, Text, TextInput, TouchableOpacity, View, Animated, StatusBar, Linking, InteractionManager } from 'react-native';
import { Asset } from 'expo-asset';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import LogoHeader from '../components/LogoHeader';
import { UserProvider, useUser, updateGlobalUserCache } from '../contexts/UserContext';
import { CountryFilterProvider, useCountryFilter } from '../utils/CountryFilterContext';
import { YearFilterProvider } from '../utils/YearFilterContext';
import { LanguageProvider } from '../contexts/LanguageContext';
import { NotificationProvider } from '../contexts/NotificationContext';
import { ScreenProvider } from '../contexts/ScreenContext';
import { initializeStorage, loadCurrentUser, markNotificationAsRead, Player, updateOnlineStatus } from '../utils/playerStorage';
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
import * as Clipboard from 'expo-clipboard';
import * as Application from 'expo-application';

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
// Для отключения логов в development: установите DISABLE_LOGS = true
const isDev = typeof __DEV__ !== 'undefined' ? __DEV__ : false;
const enableLogsInProd = typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_ENABLE_LOGS === 'true';

// ============================================
// 🔇 ПЕРЕКЛЮЧАТЕЛЬ ЛОГОВ - измените на true чтобы отключить все логи в терминале
const DISABLE_LOGS = false; // Включено для отладки push-уведомлений
// ============================================

if (DISABLE_LOGS || (!isDev && !enableLogsInProd)) {
  LogBox.ignoreAllLogs();
  
  // Отключаем console.log/warn/error для чистого терминала
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const noop = () => {};
  console.log = noop;
  console.warn = noop;
  // Оставляем console.error для критических ошибок
  // console.error = noop;
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









  // Внутренний компонент для синхронизации с UserContext
// Вынесен из RootLayout чтобы избежать пересоздания компонента при каждом рендере
const UserSync = React.memo(({
  setCurrentUser,
  countersDataRef,
  lastRealtimeFriendRequestsUpdate,
  lastRealtimeFriendRequestsCount,
  showSplash,
  setShowSplash,
  splashOpacity,
  splashStartTime,
  appReady,
  userLoaded,
  loadUser,
}: {
  setCurrentUser: React.Dispatch<React.SetStateAction<Player | null>>;
  countersDataRef: React.MutableRefObject<{
    friendRequestsCount: number;
    giftRequestsCount: number;
    unreadMessagesCount: number;
    loaded: boolean;
  }>;
  lastRealtimeFriendRequestsUpdate: React.MutableRefObject<number>;
  lastRealtimeFriendRequestsCount: React.MutableRefObject<number | null>;
  showSplash: boolean;
  setShowSplash: React.Dispatch<React.SetStateAction<boolean>>;
  splashOpacity: any; // Animated.Value
  splashStartTime: React.MutableRefObject<number>;
  appReady: boolean;
  userLoaded: boolean;
  loadUser: () => Promise<void>;
}) => {
    const { currentUser: globalUser, setCurrentUser: setGlobalUser, refreshUser, isUserLoading } = useUser();
    const params = useLocalSearchParams();
    const globalUserRef = React.useRef<Player | null>(globalUser);
    
    React.useEffect(() => {
      globalUserRef.current = globalUser;
    }, [globalUser]);
    
    // ИСПРАВЛЕНО: adjustFriendRequestsCount отключена
    // Запросы в друзья теперь управляются через уведомления (friend_request)
    // Счетчик обновляется автоматически через unreadNotificationsCount
    // Это устраняет двойной подсчет и проблемы с badge
    const adjustFriendRequestsCount = React.useCallback((delta: number) => {
      // ОТКЛЮЧЕНО: friendRequestsCount больше не используется для badge
      // Все запросы в друзья учитываются через уведомления friend_request
      // Счетчик обновляется через unreadNotificationsCount автоматически
      console.log('⚠️ adjustFriendRequestsCount отключена - запросы в друзья управляются через уведомления');
    }, []);
    
    React.useEffect(() => {
      if (!globalUser?.id) {
        return;
      }
      
      // ВАЖНО: Используем простые фильтры, так как сложные OR фильтры могут не работать в Supabase Realtime
      const channel = supabase
        .channel(`friend-requests-indicator-${globalUser.id}`)
        // INSERT: новый входящий запрос
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'friend_requests',
            filter: `to_id=eq.${globalUser.id}`,
          },
          (payload) => {
            // ИСПРАВЛЕНО: Не обновляем friendRequestsCount при создании запроса
            // Запросы в друзья теперь управляются через уведомления (friend_request)
            // Счетчик обновляется автоматически через unreadNotificationsCount
            // Это устраняет двойной подсчет
            const newRequest = payload.new as { status?: string } | null;
            if (newRequest?.status === 'pending') {
              // ОТКЛЮЧЕНО: adjustFriendRequestsCount(1);
              // Счетчик обновится через уведомление friend_request
            }
          }
        )
        // ИСПРАВЛЕНО: Отключены подписки на UPDATE и DELETE для friend_requests
        // Теперь запросы в друзья управляются через уведомления (friend_request)
        // Счетчик обновляется автоматически через unreadNotificationsCount
        // Это устраняет двойной подсчет (friendRequestsCount + unreadNotificationsCount)
        
        // UPDATE где мы получатель: статус изменился (принят/отклонён)
        // ОТКЛЮЧЕНО - теперь управляется через уведомления
        // .on(...)
        
        // DELETE где мы получатель: запрос удалён (отменён отправителем)
        // ОТКЛЮЧЕНО - теперь управляется через уведомления
        // .on(...)
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }, [globalUser?.id, adjustFriendRequestsCount]);
    
    // Синхронизируем ГЛОБАЛЬНОЕ состояние с ЛОКАЛЬНЫМ (context -> layout)
  // ВАЖНО: Сохраняем локально загруженные счётчики, но позволяем уменьшать их через UserContext
    React.useEffect(() => {
    if (!globalUser) {
      setCurrentUser(null);
      return;
    }
    
    // Если счётчики уже были загружены
    if (countersDataRef.current.loaded) {
      setCurrentUser(prev => {
        // Если пользователь сменился - берем нового целиком и сбрасываем счётчики
        if (!prev || prev.id !== globalUser.id) {
          countersDataRef.current = {
            friendRequestsCount: 0,
            giftRequestsCount: 0,
            unreadMessagesCount: 0,
            loaded: false
          };
          return globalUser;
        }
        
        // ИСПРАВЛЕНО: friendRequestsCount всегда равен 0, так как запросы в друзья учитываются через уведомления
        // Синхронизация friendRequestsCount больше не нужна - он всегда 0
        countersDataRef.current.friendRequestsCount = 0;
        
        // Если пользователь тот же, используем сохраненные в ref счётчики
        // ИСПРАВЛЕНО: friendRequestsCount всегда равен 0, так как запросы в друзья учитываются через уведомления
        return {
          ...globalUser,
          friendRequestsCount: 0, // Всегда 0 - запросы в друзья учитываются через unreadNotificationsCount
          giftRequestsCount: countersDataRef.current.giftRequestsCount,
          unreadMessagesCount: countersDataRef.current.unreadMessagesCount,
        };
      });
    } else {
      // Если счётчики еще не загружены, просто берем данные из контекста
      setCurrentUser(globalUser);
      }
  }, [globalUser, setCurrentUser, countersDataRef]);
    
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
  }, [params.refresh, loadUser, refreshUser]);
    
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
  }, [appReady, isUserLoading, userLoaded, showSplash, setShowSplash, splashOpacity, splashStartTime]);
    
    return null;
});

export default function RootLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const lastUserLoadTime = React.useRef<number>(0);
  const lastRealtimeFriendRequestsUpdate = React.useRef<number>(0); // Время последнего обновления счётчика через Realtime
  const lastRealtimeFriendRequestsCount = React.useRef<number | null>(null); // Последнее значение от Realtime
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
            
            // Обновляем онлайн-статус пользователя в базе данных
            if (nextAppState === 'active') {
              if (Platform.OS === 'android') {
                void configureSystemUI();
              }
              updateOnlineStatus(true);
            } else if (nextAppState === 'background' || nextAppState === 'inactive') {
              updateOnlineStatus(false);
            }
          });
        }
      }
    } catch (e) {
      // AppState недоступен
    }
    
    return () => subscription?.remove();
  }, []);
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

  // Android: чёрная навигационная панель сразу при запуске (раньше вызывалось только после loadUser)
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      void configureSystemUI();
    }
  }, []);

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

  // ==========================================================
  // 🎟️ Referral / Deferred deep links (via Universal Links + Linking API)
  // - iOS: Universal Links через hockey-stars.com/player/{id}
  // - Android: App Links через intentFilters в app.json
  // - Обработка происходит ниже в useEffect с Linking.getInitialURL
  // ==========================================================
  const PENDING_INVITE_KEY = 'pending_invited_by';
  const savePendingInvite = React.useCallback(async (inviterId: string) => {
    try {
      if (currentUser?.id) return; // don't overwrite for logged-in users
      if (!inviterId || inviterId.length < 8) return;
      await AsyncStorage.setItem(PENDING_INVITE_KEY, JSON.stringify({ inviterId, ts: Date.now() }));
      console.log('🎟️ [REFERRAL] Pending invite saved:', inviterId);
    } catch (e) {
      console.warn('⚠️ [REFERRAL] Failed to save pending invite:', e);
    }
  }, [currentUser?.id]);

  // 🎟️ Android Install Referrer: читаем referrer из Google Play при первом запуске
  // Сайт player.php передает inviterId через параметр referrer в Google Play URL
  // Формат: https://play.google.com/store/apps/details?id=by.hockeystars.app&referrer=inviterId={id}&deeplink_path=player/{id}
  const INSTALL_REFERRER_CHECKED_KEY = 'install_referrer_checked_once';
  const installReferrerCheckedRef = React.useRef(false);
  React.useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (currentUser?.id) return; // Уже авторизован
    if (installReferrerCheckedRef.current) return; // Уже проверяли в этой сессии
    
    (async () => {
      try {
        // Проверяем, проверяли ли мы Install Referrer ранее
        const wasChecked = await AsyncStorage.getItem(INSTALL_REFERRER_CHECKED_KEY);
        if (wasChecked === 'true') {
          installReferrerCheckedRef.current = true;
          return; // Уже проверяли при первом запуске
        }
        
        installReferrerCheckedRef.current = true;
        
        // Проверяем, есть ли уже сохранённый invite
        const existing = await AsyncStorage.getItem(PENDING_INVITE_KEY);
        if (existing) {
          // Уже есть invite, помечаем что проверили Install Referrer
          await AsyncStorage.setItem(INSTALL_REFERRER_CHECKED_KEY, 'true');
          return;
        }
        
        // Читаем Install Referrer только один раз при первом запуске
        try {
          const referrerUrl = await Application.getInstallReferrerAsync();
          
          // Помечаем, что проверили Install Referrer (даже если он был пуст)
          await AsyncStorage.setItem(INSTALL_REFERRER_CHECKED_KEY, 'true');
          
          if (!referrerUrl) return;
          
          console.log('🎟️ [REFERRAL] Install Referrer URL:', referrerUrl);
          
          // Парсим referrer URL: формат "inviterId={id}&deeplink_path=player/{id}"
          // Или может быть просто "inviterId={id}"
          const inviterIdMatch = referrerUrl.match(/inviterId=([a-zA-Z0-9\-_]+)/);
          if (inviterIdMatch && inviterIdMatch[1]) {
            const inviterId = inviterIdMatch[1];
            console.log('🎟️ [REFERRAL] Found inviter in Install Referrer:', inviterId);
            await savePendingInvite(inviterId);
          }
        } catch (referrerError: any) {
          // Install Referrer может быть недоступен (старая версия Play Store, эмулятор и т.д.)
          // Это нормально, просто помечаем что проверили
          await AsyncStorage.setItem(INSTALL_REFERRER_CHECKED_KEY, 'true');
          console.log('🎟️ [REFERRAL] Install Referrer unavailable:', referrerError?.code || referrerError?.message);
        }
      } catch (e) {
        // Общая ошибка - помечаем что проверили
        try {
          await AsyncStorage.setItem(INSTALL_REFERRER_CHECKED_KEY, 'true');
        } catch {}
        console.log('🎟️ [REFERRAL] Install Referrer check failed:', e);
      }
    })();
  }, [currentUser?.id, savePendingInvite]);

  // 🎟️ iOS Deferred Deep Link: читаем clipboard при первом запуске
  // Сайт player.php копирует URL в clipboard при нажатии кнопки "Установить"
  // ВАЖНО: Сохраняем флаг в AsyncStorage, чтобы проверять clipboard только ОДИН РАЗ при первом запуске
  // Это позволяет избежать постоянных запросов разрешения iOS
  const CLIPBOARD_CHECKED_KEY = 'clipboard_checked_once';
  const clipboardCheckedRef = React.useRef(false);
  React.useEffect(() => {
    if (Platform.OS !== 'ios') return;
    if (currentUser?.id) return; // Уже авторизован
    if (clipboardCheckedRef.current) return; // Уже проверяли в этой сессии
    
    (async () => {
      try {
        // Проверяем, проверяли ли мы clipboard ранее (сохраняется между запусками)
        const wasChecked = await AsyncStorage.getItem(CLIPBOARD_CHECKED_KEY);
        if (wasChecked === 'true') {
          clipboardCheckedRef.current = true;
          return; // Уже проверяли при первом запуске, больше не проверяем
        }
        
        clipboardCheckedRef.current = true;
        
        // Проверяем, есть ли уже сохранённый invite
        const existing = await AsyncStorage.getItem(PENDING_INVITE_KEY);
        if (existing) {
          // Уже есть invite, помечаем что проверили clipboard
          await AsyncStorage.setItem(CLIPBOARD_CHECKED_KEY, 'true');
          return;
        }
        
        // Читаем clipboard только один раз при первом запуске
        const clipboardText = await Clipboard.getStringAsync();
        
        // Помечаем, что проверили clipboard (даже если он был пуст)
        // Это важно - чтобы не спрашивать разрешение снова
        await AsyncStorage.setItem(CLIPBOARD_CHECKED_KEY, 'true');
        
        if (!clipboardText) return;
        
        // Проверяем, содержит ли URL реферальную ссылку
        const match = clipboardText.match(/hockey-stars\.com\/player\/([a-zA-Z0-9\-_]+)/);
        if (match && match[1]) {
          const inviterId = match[1];
          console.log('🎟️ [REFERRAL] Found inviter in clipboard:', inviterId);
          await savePendingInvite(inviterId);
          
          // Очищаем clipboard после использования (опционально)
          // await Clipboard.setStringAsync('');
        }
      } catch (e) {
        // iOS может заблокировать доступ к clipboard - это нормально
        // Помечаем что проверили, чтобы не спрашивать снова
        try {
          await AsyncStorage.setItem(CLIPBOARD_CHECKED_KEY, 'true');
        } catch {}
        console.log('🎟️ [REFERRAL] Clipboard read skipped:', e);
      }
    })();
  }, [currentUser?.id, savePendingInvite]);

  const lastNotificationCountRef = React.useRef<number>(0);
  const lastMessagesCountRef = React.useRef<number>(0);
  const unreadNotificationsStateRef = React.useRef<number>(unreadNotificationsCount);
  // Ref для хранения актуальных значений счётчиков
  // Это позволяет избежать проблем с асинхронностью React state и потерей данных при слиянии
  const countersDataRef = React.useRef<{
    friendRequestsCount: number;
    giftRequestsCount: number;
    unreadMessagesCount: number;
    loaded: boolean;
  }>({
    friendRequestsCount: 0,
    giftRequestsCount: 0,
    unreadMessagesCount: 0,
    loaded: false
  });
  React.useEffect(() => {
    unreadNotificationsStateRef.current = unreadNotificationsCount;
  }, [unreadNotificationsCount]);

  // Обновление badge на иконке приложения iOS
  React.useEffect(() => {
    if (Platform.OS !== 'ios') {
      return; // Badge работает только на iOS
    }

    const updateAppIconBadge = async () => {
      try {
        // ИСПРАВЛЕНО: friendRequestsCount НЕ добавляем, так как friend_request уже включены в unreadNotificationsCount
        // giftRequestsCount добавляем отдельно, так как это запросы на подарки (не уведомления)
        // Вычисляем общий счетчик для badge на иконке
        const totalBadgeCount = 
          unreadNotificationsCount +
          (currentUser?.giftRequestsCount ?? 0) +
          unreadMessagesCount;

        // Обновляем badge на иконке приложения
        await Notifications.setBadgeCountAsync(totalBadgeCount);
      } catch (error) {
        // Игнорируем ошибки обновления badge (может быть недоступно в некоторых случаях)
        console.warn('⚠️ Не удалось обновить badge на иконке:', error);
      }
    };

    // Обновляем badge только если счетчики загружены
    if (countersDataRef.current.loaded && currentUser) {
      updateAppIconBadge();
    } else if (!currentUser) {
      // Если пользователь не залогинен, очищаем badge
      Notifications.setBadgeCountAsync(0).catch(() => {});
    }
  }, [unreadNotificationsCount, unreadMessagesCount, currentUser?.giftRequestsCount, currentUser]);

  // Внутренний компонент UserSync вынесен наружу
  // const UserSync = () => { ... }
  
  // Функция для загрузки счетчика уведомлений из БД
  const loadNotificationCount = React.useCallback(async (userId: string, skipUpdateIfSame: boolean = false) => {
    try {
      // ВАЖНО: Только читаем счетчик из БД, НЕ обновляем его
      // Счетчик в БД обновляется только через SQL функции (increment_unread_notifications)
      // или через Realtime подписку на изменения в таблице players
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('unread_notifications_count')
        .eq('id', userId)
        .single();
      
      if (playerError) {
        console.error('❌ Ошибка загрузки счетчика из players:', playerError);
        return;
      }
      
      const realCount = playerData?.unread_notifications_count || 0;
      
      // Если счетчик не изменился и мы не хотим обновлять UI, пропускаем
      if (skipUpdateIfSame && realCount === unreadNotificationsCount) {
        return;
      }
      
      // Обновляем ref и синхронизируем RealtimeManager
      lastNotificationCountRef.current = realCount;
      realtimeManager.initializeCounts(realCount, lastMessagesCountRef.current);
      
      // ВАЖНО: Обновляем UI всегда, чтобы синхронизировать с БД
      // Это нужно для случаев, когда счетчик обновляется через SQL функцию
      // и нужно синхронизировать оптимистичное обновление с реальным значением из БД
      if (realCount !== unreadNotificationsCount) {
        console.log('🔔 loadNotificationCount: Обновление счетчика в UI:', unreadNotificationsCount, '→', realCount);
        setUnreadNotificationsCount(realCount);
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
  // Важно: показываем индикатор ТОЛЬКО после того, как счётчики были загружены
  // Это предотвращает мигание индикатора при загрузке приложения
  const NotificationsTabIcon = React.useMemo(() => {
    return ({ size, focused }: { size: number; focused: boolean }) => {
      // ИСПРАВЛЕНО: friendRequestsCount НЕ добавляем, так как friend_request уже включены в unreadNotificationsCount
      // giftRequestsCount добавляем отдельно, так как это запросы на подарки (не уведомления)
      const total =
        unreadNotificationsCount +
        (currentUser?.giftRequestsCount ?? 0);
      const iconSize = Platform.OS === 'ios' ? (size - 2) * 1.1 : size - 2;
      
      // Проверяем, были ли загружены счётчики
      // Если нет - не показываем индикатор, чтобы избежать мигания
      const shouldShowBadge = countersDataRef.current.loaded && currentUser && total > 0;
      
      return (
        <View style={{
          position: 'relative',
          justifyContent: 'center',
          alignItems: 'center',
          width: size + 4,
          height: size + 4,
        }}>
          <Ionicons name="notifications-outline" size={iconSize} color={focused ? '#eee' : '#aaa'} />
          {!shouldShowBadge ? null : (
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
  }, [unreadNotificationsCount, currentUser?.giftRequestsCount]);

  // Функция для обновления счетчика уведомлений (УПРОЩЕННАЯ)
  const updateNotificationCount = React.useCallback(async (user?: Player | null) => {
    const targetUser = user || currentUser;
    if (!targetUser) {
      return;
    }
    
    // ВАЖНО: Загружаем счетчик из БД для получения актуального значения
    // База данных управляется SQL функциями increment_unread_notifications и reset_unread_notifications
    await loadNotificationCount(targetUser.id, false); // false = всегда обновляем UI
  }, [currentUser, loadNotificationCount]);

  // автоопределение включено: будет использоваться в главном экране

  const loadUser = async () => {
    // Используем currentUser из замыкания
      const user = currentUser;
    
    // Пропускаем если пользователь не авторизован
    if (!user) {
      setUserLoaded(true);
      return;
    }
    
    // Минимальный throttling только для предотвращения дублирования
    // НО: пропускаем throttling если это первая загрузка для данного пользователя
    const isFirstLoadForUser = lastUserIdRef.current !== user.id;
    if (!isFirstLoadForUser && Date.now() - (lastUserLoadTime.current ?? 0) < 300) {
      return;
    }
    lastUserLoadTime.current = Date.now(); // Обновляем время последнего вызова
    lastUserIdRef.current = user.id; // Обновляем ID пользователя
    
    try {
      setUserLoaded(true);
      // Загружаем счётчики для пользователя
      {
        // ПРИОРИТЕТ: Сначала загружаем счётчики для мгновенного отображения индикаторов
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
        
        // Бейдж: все непрочитанные, кроме type message (чаты — отдельный счётчик)
        const filteredNotifications = notifications.filter((n: any) => n.type !== 'message');
        const unreadNotificationsCount = filteredNotifications.filter((n: any) => !n.is_read).length;
        // friendRequestsCount больше не используется для badge - friend requests включены в unreadNotificationsCount
        const friendRequestsCount = 0; // Обнуляем, чтобы избежать двойного подсчёта
        console.log('🔔 Счётчик непрочитанных уведомлений (включая friend_request):', unreadNotificationsCount);
        
        // Загружаем непрочитанные сообщения (без логов)
        const { getUnreadMessageCount } = await import('../utils/playerStorage');
        const unreadMessagesCount = await getUnreadMessageCount(user.id);
        
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
        
        // УПРОЩЕНО: friendRequestsCount теперь основан на непрочитанных friend_request уведомлениях
        // Realtime обновления больше не нужны - счётчик обновится автоматически при следующей загрузке
        const nextUser: Player = {
          ...user,
          unreadMessagesCount,
          friendRequestsCount,
          giftRequestsCount,
        };

        // СРАЗУ устанавливаем счётчики в UI (до setCurrentUser)
        // Это обеспечит мгновенное отображение индикаторов
        console.log('📊 Устанавливаем счётчики:', { 
          unreadNotificationsCount, 
          unreadMessagesCount,
          friendRequestsCount
        });
        lastMessagesCountRef.current = unreadMessagesCount;
        lastNotificationCountRef.current = unreadNotificationsCount;
        
        // ОПТИМИЗАЦИЯ: Объединяем обновления состояния в одну батч операцию
        // Вместо трёх отдельных setState, используем один для обновления обоих счётчиков
        // React автоматически батчит их в одну операцию
        setUnreadMessagesCount(unreadMessagesCount);
        setUnreadNotificationsCount(unreadNotificationsCount);
        
        // Инициализируем реалтайм после обновления состояния
        // но БЕЗ блокировки - используем setTimeout(0) чтобы это запустилось после рендера
        Promise.resolve().then(() => {
          realtimeManager.initializeCounts(unreadNotificationsCount, unreadMessagesCount);
        });
        
        // Помечаем, что счётчики успешно загружены и сохраняем их значения
        // ИСПРАВЛЕНО: friendRequestsCount всегда равен 0, так как запросы в друзья учитываются через уведомления
        countersDataRef.current = {
          friendRequestsCount: 0, // Всегда 0 - запросы в друзья учитываются через unreadNotificationsCount
          giftRequestsCount,
          unreadMessagesCount,
          loaded: true
        };

        // ОПТИМИЗАЦИЯ: Объединяем обновления в одну батч операцию
        // setCurrentUser и updateGlobalUserCache вызываются синхронно для минимальной задержки
        setCurrentUser(nextUser);
        
        // ВАЖНО: Также обновляем глобальный кеш UserContext
        // Это нужно чтобы adjustFriendRequestsCount в других компонентах работал с актуальными данными
        updateGlobalUserCache(nextUser);
        
        // ФОНОВЫЕ ОПЕРАЦИИ: запускаем без await, чтобы не блокировать UI и анимацию шайб
        // Используем setTimeout(0) для вынесения из текущего цикла рендеринга
        setTimeout(async () => {
          // Трекаем вход в приложение ТОЛЬКО ОДИН РАЗ за всю сессию приложения
          if (!loginTracked.current) {
            try {
              await addActivityPoints(user.id, 'LOGIN');
              loginTracked.current = true;
            } catch (error) {
              console.error('Failed to track login activity:', error);
            }
          }

          // Инициализируем push-уведомления для пользователя
          try {
            await initializePushNotifications(user.id, true);
          } catch (error) {
            console.error('❌ Ошибка инициализации push-уведомлений:', error);
          }

          // Устанавливаем онлайн-статус при старте приложения
          try {
            await updateOnlineStatus(true);
          } catch (error) {
            // Не критично
          }

          // Настраиваем системный UI
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
        }, 0);
        
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

        // Не сбрасываем badge в ноль при старте — это давало вспышку до loadUser()

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
    
    // ОПТИМИЗАЦИЯ: Периодическое обновление счетчика сообщений (каждые 30 секунд вместо 5)
    // Realtime подписка обеспечивает мгновенные обновления, polling только для надежности
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
    }, 120000); // Realtime ведёт счётчик; опрос раз в 2 мин как страховка и для синка БД
    
    return () => {
      clearInterval(messagesInterval);
    };
  }, [loaded, currentUser?.id]);

  // Принудительно обновляем пользователя при переходе на главную страницу
  // Это нужно для корректного выхода из профиля
  const lastAppStateLoadRef = React.useRef<number>(0);
  const isUpdatingRef = React.useRef<boolean>(false);
  // Флаг для предотвращения конфликта между push notification и focus handler
  const isNavigatingFromPushRef = React.useRef<boolean>(false);
  
  React.useEffect(() => {
    const handleFocus = () => {
      // ИСПРАВЛЕНО: Пропускаем обновление если идет навигация из push notification
      // Это предотвращает конфликт между deep link навигацией и focus handler
      if (isNavigatingFromPushRef.current) {
        console.log('⏭️ Пропускаем handleFocus - идет навигация из push notification');
        return;
      }
      
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

      refreshBadgeCountsRef.current?.().finally(() => {
        isUpdatingRef.current = false;
      });

      // Полный loadUser() убран: второй волной перезаписывал счётчики и давал мигание бейджей.
      // refreshBadgeCounts уже подтягивает сообщения + unread_notifications_count из БД.
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
  // ВАЖНО: Этот обработчик срабатывает ТОЛЬКО когда пользователь нажимает на уведомление
  React.useEffect(() => {
    const notificationListener = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      const deepLink = data?.deepLink;
      
      if (deepLink) {
        console.log('🔗 Deep link из уведомления:', deepLink);
        console.log('📍 Текущий путь:', pathname);
        
        // ИСПРАВЛЕНО: Устанавливаем флаг чтобы предотвратить конфликт с focus handler
        isNavigatingFromPushRef.current = true;
        
        // Проверяем, не находимся ли мы уже в этом чате
        let shouldNavigate = true;
        
        if (typeof deepLink === 'string' && deepLink.startsWith('/chat/')) {
          // Извлекаем ID чата из deepLink (формат: /chat/[id] или /chat/[id]?scrollToBottom=true)
          const chatIdFromLink = deepLink.split('/chat/')[1]?.split('?')[0]?.split('/')[0];
          const currentPath = pathname || '';
          
          console.log('💬 ID чата из deepLink:', chatIdFromLink);
          console.log('💬 Текущий путь:', currentPath);
          
          // Если мы уже в этом чате, не делаем навигацию
          if (currentPath.startsWith('/chat/')) {
            const currentChatId = currentPath.split('/chat/')[1]?.split('?')[0]?.split('/')[0];
            if (currentChatId === chatIdFromLink) {
              console.log('✅ Уже в этом чате, навигация не требуется');
              shouldNavigate = false;
            }
          }
          
          // Если пользователь НЕ в чате, переходим в нужный чат
          if (shouldNavigate) {
            console.log('➡️ Переход в чат:', chatIdFromLink);
          }
        }
        
        // Выполняем навигацию только если нужно
        if (shouldNavigate) {
          // После анимаций запуска навигации — короче фиксированная задержка, чем раньше 800ms
          InteractionManager.runAfterInteractions(() => {
            setTimeout(() => {
              try {
                if (typeof deepLink === 'string' && deepLink.startsWith('/chat/')) {
                  const cleanDeepLink = deepLink.split('?')[0];
                  router.replace(`${cleanDeepLink}?scrollToBottom=true` as any);
                } else {
                  router.replace(deepLink as any);
                }
              } catch (error) {
                console.error('❌ Ошибка навигации по deep link:', error);
              }
              setTimeout(() => {
                isNavigatingFromPushRef.current = false;
              }, 1200);
            }, 200);
          });
        } else {
          // Если навигация не требуется, сразу сбрасываем флаг
          setTimeout(() => {
            isNavigatingFromPushRef.current = false;
          }, 1000);
        }
      }
    });

    return () => notificationListener.remove();
  }, [router, pathname]);

  // Обработка входящих URL (Universal Links и Deep Links)
  React.useEffect(() => {
    if (Platform.OS === 'web') {
      return; // На веб не обрабатываем
    }

    // Обработка URL при открытии приложения
    const handleInitialURL = async () => {
      try {
        const initialUrl = await Linking.getInitialURL();
        if (initialUrl) {
          handleIncomingURL(initialUrl);
        }
      } catch (error) {
        console.error('Ошибка получения initial URL:', error);
      }
    };

    // Обработка URL когда приложение уже открыто
    const handleURL = (event: { url: string }) => {
      handleIncomingURL(event.url);
    };

    // Функция для обработки входящего URL
    const handleIncomingURL = (url: string) => {
      if (!url) return;

      try {
        // Обрабатываем Universal Links: https://hockey-stars.com/player/{id}
        if (url.includes('hockey-stars.com/player/')) {
          const match = url.match(/\/player\/([^\/\?]+)/);
          if (match && match[1]) {
            const playerId = match[1];
            savePendingInvite(playerId);
            router.push(`/player/${playerId}` as any);
            return;
          }
        }

        // Обрабатываем custom scheme: hockeystars://player/{id}
        if (url.startsWith('hockeystars://player/')) {
          const playerId = url.replace('hockeystars://player/', '').split('?')[0];
          if (playerId) {
            savePendingInvite(playerId);
            router.push(`/player/${playerId}` as any);
            return;
          }
        }
      } catch (error) {
        console.error('Ошибка обработки URL:', error);
      }
    };

    // Проверяем initial URL при загрузке
    handleInitialURL();

    // Подписываемся на входящие URL
    const subscription = Linking.addEventListener('url', handleURL);

    return () => {
      subscription.remove();
    };
  }, [router, savePendingInvite]);

  // Дополнительная загрузка пользователя при возврате в приложение
  // ОТКЛЮЧЕНО - вызывает редиректы
  // React.useEffect(() => {
  //   if (appState === 'active' && appReady) {
  //       loadUser();
  //     }
  // }, [appState, appReady]);

  // Ref для отслеживания ID пользователя (используется в других местах)
  const lastUserIdRef = React.useRef<string | null>(null);
  
  // Обновляем ref при смене пользователя (счётчик уведомлений загружается в loadUser)
  React.useEffect(() => {
    if (currentUser?.id) {
      if (lastUserIdRef.current !== currentUser.id) {
        lastUserIdRef.current = currentUser.id;
      }
      } else {
      // Сбрасываем ref при выходе
      lastUserIdRef.current = null;
      }
  }, [currentUser?.id]);

  // Ref для отслеживания предыдущего пользователя (для определения logout)
  const previousUserIdRef = React.useRef<string | null | undefined>(currentUser?.id);
  
  // Инициализация счетчика при загрузке пользователя или сброс при выходе
  React.useEffect(() => {
    const previousUserId = previousUserIdRef.current;
    const currentUserId = currentUser?.id;
    
    // Обновляем ref
    previousUserIdRef.current = currentUserId;
    
    if (currentUser) {
      // Синхронизация счётчика сообщений из currentUser
      // Но только если значение отличается от текущего (избегаем лишних ререндеров)
      if (currentUser.unreadMessagesCount !== undefined) {
        if (currentUser.unreadMessagesCount !== lastMessagesCountRef.current) {
        lastMessagesCountRef.current = currentUser.unreadMessagesCount;
      setUnreadMessagesCount(currentUser.unreadMessagesCount);
        }
      }
      // НЕ загружаем счётчик повторно - он уже загружен в loadUser
    } else if (previousUserId && !currentUserId) {
      // Сбрасываем счётчики ТОЛЬКО при явном выходе из аккаунта
      // (когда был пользователь, и теперь его нет)
      lastMessagesCountRef.current = 0;
      lastNotificationCountRef.current = 0;
      lastRealtimeFriendRequestsCount.current = null;
      lastRealtimeFriendRequestsUpdate.current = 0;
      // Сбрасываем данные счётчиков
      countersDataRef.current = {
        friendRequestsCount: 0,
        giftRequestsCount: 0,
        unreadMessagesCount: 0,
        loaded: false
      };
      setUnreadMessagesCount(0);
      setUnreadNotificationsCount(0);
      realtimeManager.initializeCounts(0, 0);
    }
  }, [currentUser?.id, currentUser?.unreadMessagesCount]);

  // Realtime подписка на изменения счетчиков
  React.useEffect(() => {
    if (!currentUser) {
      return;
    }

    // Устанавливаем callback для обновления счетчика уведомлений
    // Добавляем проверку, чтобы избежать мигания индикатора
    realtimeManager.setNotificationCountCallback((count: number) => {
      // ВАЖНО: Обновляем UI только если значение действительно изменилось
      // Используем ref для проверки, чтобы не зависеть от состояния в зависимостях
      if (count !== lastNotificationCountRef.current) {
        console.log('🔔 Realtime: Обновление счетчика уведомлений:', lastNotificationCountRef.current, '→', count);
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

    // ВАЖНО: Устанавливаем callback для загрузки счетчика из БД
    // Используется для синхронизации после оптимистичного обновления
    realtimeManager.setLoadNotificationCountCallback(async (userId: string) => {
      console.log('🔔 Realtime: Вызов loadNotificationCount для пользователя:', userId);
      await loadNotificationCount(userId, false); // false = всегда обновляем UI для синхронизации
    });

    // Используем централизованный менеджер подписок
    realtimeManager.setupSubscriptions(currentUser.id);

    return () => {
      // Отключаем подписки при размонтировании
      realtimeManager.disconnect();
    };
  }, [currentUser?.id, unreadMessagesCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // ВАЖНО: Обработчик push-уведомлений для обновления счетчика в реальном времени
  // ИСПРАВЛЕНО: Убрано оптимистичное обновление, так как счетчик уже обновляется через:
  // 1. SQL функцию increment_unread_notifications при создании уведомления
  // 2. Realtime подписку на изменения в таблице players
  // Оптимистичное обновление приводило к двойному увеличению счетчика
  React.useEffect(() => {
    if (!currentUser) return;

    const subscription = Notifications.addNotificationReceivedListener(async (notification) => {
      const notificationType = notification.request.content.data?.type;
      console.log('🔔 Push уведомление получено:', notificationType);
      
      // ВАЖНО: Сообщения (type: 'message') НЕ должны обновлять счетчик уведомлений
      // Счетчик уведомлений обновляется только для типов: stats_change, photo_added, gift_received, friend_request и т.д.
      if (notificationType === 'message') {
        console.log('🔔 Push: Это сообщение, не обновляем счетчик уведомлений');
        return; // Не обновляем счетчик уведомлений для сообщений
      }
      
      // ИСПРАВЛЕНО: НЕ делаем оптимистичное обновление, так как:
      // - Счетчик уже увеличен через SQL функцию при создании уведомления
      // - Realtime подписка уже обновит счетчик автоматически
      // - Оптимистичное обновление приводило к двойному увеличению (1 → 2 → 3)
      
      // ОПТИМИЗАЦИЯ: Уменьшена задержка с 1000ms до 200ms для быстрого обновления индикатора
      // Просто загружаем актуальный счетчик из БД для синхронизации
      setTimeout(() => {
        loadNotificationCount(currentUser.id, false).catch(error => {
          console.error('❌ Ошибка загрузки счетчика после push уведомления:', error);
        });
      }, 200);
    });

    return () => {
      subscription.remove();
    };
  }, [currentUser, loadNotificationCount]);

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
              <UserSync 
                setCurrentUser={setCurrentUser}
                countersDataRef={countersDataRef}
                lastRealtimeFriendRequestsUpdate={lastRealtimeFriendRequestsUpdate}
                lastRealtimeFriendRequestsCount={lastRealtimeFriendRequestsCount}
                showSplash={showSplash}
                setShowSplash={setShowSplash}
                splashOpacity={splashOpacity}
                splashStartTime={splashStartTime}
                appReady={appReady}
                userLoaded={userLoaded}
                loadUser={loadUser}
              />
              <NotificationProvider updateNotificationCount={updateNotificationCount}>
            <GestureHandlerRootView
              style={{
                flex: 1,
                ...(Platform.OS === 'android' ? { backgroundColor: '#87A3B1' } : {}),
              }}
            >
              <StatusBar 
                barStyle="light-content" 
                backgroundColor="#050008" 
                translucent={Platform.OS === 'android'}
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
                // Теперь navigation bar скрыт, используем стандартные размеры
                height: 80,
                paddingBottom: 10,
                paddingTop: 10
              },
              tabBarActiveTintColor: '#fff',
              tabBarInactiveTintColor: '#888',
              tabBarShowLabel: false,
              ...(Platform.OS === 'android'
                ? {
                    sceneContainerStyle: { backgroundColor: '#87A3B1', flex: 1 },
                  }
                : {}),
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
              // Показываем индикатор только после загрузки счётчиков
              const showMessagesBadge = countersDataRef.current.loaded && unreadMessagesCount > 0;
              return (
                <View style={{
                  position: 'relative',
                  justifyContent: 'center',
                  alignItems: 'center',
                  width: size + 4,
                  height: size + 4,
                }}>
                  <Ionicons name="chatbubble-outline" size={iconSize} color={focused ? '#eee' : '#aaa'} />
                  {showMessagesBadge && (
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
        <Tabs.Screen
          name="admin/users"
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

