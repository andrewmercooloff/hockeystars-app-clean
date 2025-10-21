import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Animated as RNAnimated,
    Image,
    ImageBackground,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import Animated, { FadeIn, FadeOut, useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import StatsChangeNotification from '../components/StatsChangeNotification';
import PhotoAddedNotification from '../components/PhotoAddedNotification';
import FriendshipNotification from '../components/FriendshipNotification';
import ExerciseNotification from '../components/ExerciseNotification';
import GiftReceivedNotification from '../components/GiftReceivedNotification';
import FriendRequestNotification from '../components/FriendRequestNotification';
import GiftRequestNotification from '../components/GiftRequestNotification';
import GiftAcceptedNotification from '../components/GiftAcceptedNotification';
import VideoAddedNotification from '../components/VideoAddedNotification';
import AvatarChangedNotification from '../components/AvatarChangedNotification';
import AchievementAddedNotification from '../components/AchievementAddedNotification';
import PhysicalDataChangedNotification from '../components/PhysicalDataChangedNotification';
import FriendAcceptedNotification from '../components/FriendAcceptedNotification';
import {
    acceptFriendRequest,
    declineFriendRequest,
    getReceivedFriendRequests,
    loadNotifications,
    markNotificationAsRead,
    Player
} from '../utils/playerStorage';
import { supabase } from '../utils/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotificationContext } from '../contexts/NotificationContext';
import { useScreenContext } from '../contexts/ScreenContext';
import { useUser } from '../contexts/UserContext';

const iceBg = require('../assets/images/led.jpg');

// Компонент с анимацией для уведомлений
const AnimatedNotification = ({ children, index }: { children: React.ReactNode; index: number }) => {
  const animatedValue = React.useRef(new RNAnimated.Value(0)).current;
  
  React.useEffect(() => {
    RNAnimated.timing(animatedValue, {
      toValue: 1,
      duration: 300,
      delay: index * 50, // Задержка для каждого уведомления
      useNativeDriver: true,
    }).start();
  }, [animatedValue, index]);
  
  return (
    <RNAnimated.View
      style={{
        opacity: animatedValue,
        transform: [{
          translateY: animatedValue.interpolate({
            inputRange: [0, 1],
            outputRange: [20, 0],
          })
        }]
      }}
    >
      {children}
    </RNAnimated.View>
  );
};

// Вспомогательная функция для получения названия типа предмета
const getItemTypeName = (type: string) => {
  switch (type) {
    case 'autograph': return 'автограф';
    case 'stick': return 'клюшку';
    case 'puck': return 'шайбу';
    case 'jersey': return 'джерси';
    default: return type;
  }
};

interface NotificationItem {
  id: string;
  type: 'friend_request' | 'friend_accepted' | 'autograph_request' | 'stick_request' | 'gift_request' | 'gift_accepted' | 'system' | 'achievement' | 'team_invite' | 'stats_change' | 'photo_added' | 'new_friendship' | 'exercise_completed' | 'gift_received' | 'video_added' | 'avatar_changed' | 'achievement_added' | 'physical_data_changed';
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  playerId?: string;
  playerName?: string;
  playerAvatar?: string;
  receiverId?: string;
  data?: any; // Добавляем поле для хранения дополнительных данных
  isActionable?: boolean; // Добавляем поле для уведомлений, к которым можно применить действие
}

interface FriendRequestItem {
  id: string;
  type: 'friend_request';
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  receiverId: string;
}

interface GiftRequestItem {
  id: string;
  type: 'gift_request';
  title: string;
  message: string;
  timestamp: number;
  isRead: boolean;
  playerId: string;
  playerName: string;
  playerAvatar?: string;
  receiverId: string;
  itemType: 'autograph' | 'stick' | 'puck' | 'jersey' | 'custom';
  requestMessage: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { updateNotificationCount } = useNotificationContext();
  const { setCurrentScreen } = useScreenContext();
  const { currentUser } = useUser();
  
  // Анимация для плавного появления экрана
  const fadeAnim = useSharedValue(0);
  
  // Анимированный стиль
  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: fadeAnim.value,
    };
  });
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequestItem[]>([]);
  const [giftRequests, setGiftRequests] = useState<GiftRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Функция загрузки уведомлений (определяем здесь для использования в useEffect)
  const loadNotificationsData = useCallback(async () => {
    try {
      // Убираем setLoading(true) чтобы не показывать индикатор загрузки при каждом обновлении
      if (!currentUser) return;

      // Загружаем все уведомления из хранилища
      const storedNotifications = await loadNotifications(currentUser.id);
      
      // Фильтруем уведомления, которые относятся к текущему пользователю (поддерживаем обе структуры)
      const userNotifications = storedNotifications.filter(notification => {
        // Уведомления о запросах дружбы показываем только если они предназначены для этого пользователя
        if (notification.type === 'friend_request') {
          return notification.receiver_id === currentUser.id || notification.receiverId === currentUser.id;
        }
        
        // Уведомления о подарках и других действиях
        if (notification.type === 'friend_accepted' ||
            notification.type === 'gift_accepted' || 
            notification.type === 'autograph_request' || 
            notification.type === 'stick_request' ||
            notification.type === 'achievement' || 
            notification.type === 'team_invite' || 
            notification.type === 'system' ||
            notification.type === 'stats_change' ||
            notification.type === 'photo_added' ||
            notification.type === 'new_friendship' ||
            notification.type === 'exercise_completed' ||
            notification.type === 'gift_received' ||
            notification.type === 'video_added' ||
            notification.type === 'avatar_changed' ||
            notification.type === 'achievement_added' ||
            notification.type === 'physical_data_changed') {
          return notification.user_id === currentUser.id || notification.playerId === currentUser.id;
        }
        
        return false; // Исключаем все остальные типы
      }).map(notification => {
        // Преобразуем timestamp в правильный формат
        let timestamp: number;
        if (notification.created_at) {
          timestamp = new Date(notification.created_at).getTime();
        } else if (notification.timestamp) {
          timestamp = typeof notification.timestamp === 'string' 
            ? new Date(notification.timestamp).getTime() 
            : notification.timestamp;
        } else {
          timestamp = Date.now();
        }
        
        // Правильно маппим поля из Supabase (поддерживаем обе структуры)
        const mappedNotification = {
          ...notification,
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          timestamp,
          isRead: notification.is_read || notification.isRead || false,
          playerId: notification.player_id || notification.playerId,
          playerName: notification.player_name || notification.playerName,
          playerAvatar: notification.player_avatar || notification.playerAvatar,
          receiverId: notification.receiver_id || notification.receiverId,
          // Помечаем уведомления как actionable, если они требуют действия
          isActionable: notification.type === 'gift_accepted' || 
                       notification.type === 'friend_request' ||
                       notification.type === 'achievement' ||
                       notification.type === 'team_invite'
        };
        
        return mappedNotification;
      });
      
      // Сортируем по времени (новые сверху)
      userNotifications.sort((a, b) => b.timestamp - a.timestamp);
      
      // Загружаем запросы в друзья
      const receivedFriendRequests = await getReceivedFriendRequests(currentUser.id);
      const friendRequestItems: FriendRequestItem[] = receivedFriendRequests.map(player => ({
        id: `friend_request_${player.id}`,
        type: 'friend_request',
        title: t('notifications.friendRequest'),
        message: t('notifications.wantsToAddYou', { name: player.name }),
        timestamp: Date.now(),
        isRead: false,
        playerId: player.id,
        playerName: player.name,
        playerAvatar: player.avatar,
        receiverId: currentUser.id
      }));
      
      // Загружаем запросы на подарки (только для звезд) - делаем это асинхронно чтобы не блокировать UI
      let giftRequestItems: GiftRequestItem[] = [];
      if (currentUser.status === 'star') {
        // Загружаем запросы на подарки в фоне, не блокируя основной UI
        supabase
            .from('item_requests')
            .select(`
              *,
              requester:players!item_requests_requester_id_fkey(
                name,
                avatar
              )
            `)
            .eq('owner_id', currentUser.id)
            .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .then(({ data: giftRequestsData, error: giftRequestsError }) => {
          if (giftRequestsError) {
            console.error('Ошибка загрузки запросов на подарки:', giftRequestsError);
          } else if (giftRequestsData) {
              const newGiftRequestItems: GiftRequestItem[] = giftRequestsData.map(request => ({
              id: `gift_request_${request.id}`,
                type: 'gift_request' as const,
              title: t('notifications.giftRequest'),
              message: t('notifications.giftRequestMessage', { 
                playerName: request.requester?.name || t('notifications.player'), 
                itemType: getItemTypeName(request.item_type) 
              }),
              timestamp: new Date(request.created_at).getTime(),
              isRead: false,
              playerId: request.requester_id,
              playerName: request.requester?.name || t('notifications.unknownPlayer'),
              playerAvatar: request.requester?.avatar,
              receiverId: currentUser.id,
              itemType: request.item_type,
              requestMessage: request.message
            }));
              setGiftRequests(newGiftRequestItems);
          }
          });
        // Обрабатываем ошибки отдельно, так как .then() возвращает Promise<void>
      }
      
      setNotifications(userNotifications);
      setFriendRequests(friendRequestItems);
      // giftRequestItems загружаются асинхронно выше
      
    } catch (error) {
      console.error('❌ Ошибка загрузки уведомлений:', error);
      // Не показываем Alert при ошибке, чтобы не мешать работе с кешированными данными
    }
  }, [currentUser, t]);

  // Проверяем авторизацию пользователя
  useEffect(() => {
    if (!currentUser) {
      router.replace('/login');
      return;
    }
    setLoading(false);
  }, [currentUser, router]);

  // Загружаем уведомления когда пользователь загружен
  useEffect(() => {
    if (currentUser) {
      loadNotificationsData();
    }
  }, [currentUser, loadNotificationsData]);

  // Обновляем данные при фокусе на экран (только если пользователь авторизован)
  useFocusEffect(
    useCallback(() => {
      setCurrentScreen('notifications');
      console.log('🔔 УВЕДОМЛЕНИЯ: Устанавливаем currentScreen = notifications');
      
      // Запускаем анимацию появления
      fadeAnim.value = withTiming(1, { duration: 300 });
      
      if (currentUser) {
        // Обновляем данные только если пользователь уже загружен
        loadNotificationsData();
      }
      return () => {
        setCurrentScreen(null);
        console.log('🔔 УВЕДОМЛЕНИЯ: Устанавливаем currentScreen = null');
        // Анимация исчезновения
        fadeAnim.value = withTiming(0, { duration: 200 });
      };
    }, [currentUser, setCurrentScreen, fadeAnim])
  );

  // Автоматически отмечаем все уведомления как прочитанные через 5 секунд после входа в экран
  useEffect(() => {
    if (currentUser && notifications.length > 0) {
      const timer = setTimeout(async () => {
        await markAllNotificationsAsRead();
        // Обновляем счетчик уведомлений через контекст
        await updateNotificationCount(currentUser);
      }, 5000); // Уменьшаем до 5 секунд
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [currentUser, notifications.length]);

  // Обновляем уведомления при фокусе на экран
  useFocusEffect(
    useCallback(() => {
      loadNotificationsData();
      // Убрали автоматическую отметку - она уже есть в useEffect
    }, [currentUser])
  );

  // Обновляем счетчик уведомлений при уходе с экрана
  useFocusEffect(
    useCallback(() => {
      return () => {
        // При уходе с экрана обновляем данные пользователя
        // Это обновит счетчик в _layout.tsx
        if (currentUser) {
          // Обновляем данные только один раз для избежания дерганья
          loadNotificationsData();
          // Убираем принудительное обновление счетчика - он уже обновлен в notifyFriendsAboutGiftReceived
          // updateNotificationCount();
        }
      };
    }, [currentUser])
  );

  // Realtime подписка на новые уведомления
  useEffect(() => {
    if (!currentUser) return;

    // Подписки уже настроены в главном layout через realtimeManager
    // Здесь только загружаем данные при фокусе на экране
    loadNotificationsData();

    return () => {
      // Ничего не отключаем - подписки управляются централизованно
    };
  }, [currentUser, loadNotificationsData]);

  // Отмечаем все уведомления как прочитанные
  const markAllNotificationsAsRead = async () => {
    try {
      if (!currentUser) {
        return;
      }
      
      // Получаем все ID уведомлений пользователя, исключая actionable уведомления
      // Сначала пытаемся с новой структурой (user_id, is_read)
      let { data: notificationIds, error: fetchError } = await supabase
        .from('notifications')
        .select('id, type')
        .eq('user_id', currentUser.id)
        .eq('is_read', false);
      
      // Если не получилось, пытаемся со старой структурой (playerId, isRead)
      if (fetchError) {
        const altResult = await supabase
          .from('notifications')
          .select('id, type')
          .eq('playerId', currentUser.id)
          .eq('isRead', false);
        
        if (altResult.error) {
          console.error('❌ Ошибка получения ID уведомлений (обе структуры):', fetchError, altResult.error);
          return;
        }
        
        notificationIds = altResult.data;
        fetchError = null;
      }
      
      if (fetchError) {
        console.error('❌ Ошибка получения ID уведомлений:', fetchError);
        return;
      }
      
      if (!notificationIds || notificationIds.length === 0) {
        return;
      }
      
      // Фильтруем уведомления, исключая actionable уведомления
      const nonActionableNotifications = notificationIds.filter(notification => {
        const type = notification.type;
        return !(type === 'gift_accepted' || 
                type === 'friend_request' ||
                type === 'achievement' ||
                type === 'team_invite');
      });
      
      if (nonActionableNotifications.length === 0) {
        return;
      }
      
      // Обновляем каждое уведомление по отдельности
      let successCount = 0;
      for (const notification of nonActionableNotifications) {
        try {
          const success = await markNotificationAsRead(notification.id);
          
          if (success) {
            successCount++;
          }
        } catch (individualError) {
          console.error('❌ Ошибка обновления уведомления', notification.id, ':', individualError);
        }
      }
      
      // Обновляем локальное состояние только для non-actionable уведомлений
      setNotifications(prev => prev.map(n => {
        const type = n.type;
        const isActionable = type === 'gift_accepted' || 
                           type === 'friend_request' ||
                           type === 'achievement' ||
                           type === 'team_invite';
        
        // Отмечаем как прочитанные только non-actionable уведомления
        return isActionable ? n : { ...n, isRead: true };
      }));
      
      // Обнуляем счетчик уведомлений в таблице players (УПРОЩЕННАЯ ЛОГИКА)
      if (currentUser) {
        try {
          const { error: updateCounterError } = await supabase
            .rpc('reset_unread_notifications', { user_id: currentUser.id });

          if (updateCounterError) {
            console.error('❌ Ошибка обнуления счетчика уведомлений:', updateCounterError);
          } else {
            console.log('✅ Счетчик уведомлений обнулен после прочтения');
          }
        } catch (counterError) {
          console.error('❌ Ошибка обнуления счетчика:', counterError);
        }
      }
      
    } catch (error) {
      console.error('❌ Ошибка в markAllNotificationsAsRead:', error);
    }
  };

  // Удаление одного уведомления
  const handleDeleteNotification = async (notificationId: string) => {
    try {
      // Сначала удаляем из UI для плавной анимации
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Убираем обновление счетчика - он уже обновлен в notifyFriendsAboutGiftReceived
      // updateNotificationCount();
      
      // Затем удаляем из базы данных в фоне
      setTimeout(async () => {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('id', notificationId);

        if (error) {
          console.error('Ошибка удаления уведомления:', error);
        }
      }, 300); // Задержка для плавной анимации
    } catch (error) {
      console.error('Ошибка удаления уведомления:', error);
    }
  };

  // Рендер правой кнопки удаления при свайпе
  const renderRightActions = () => {
    return (
      <View style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={32} color="#fa2f40" />
      </View>
    );
  };

  const handleClearAllNotifications = async () => {
    try {
        // Используем Alert.alert для всех платформ
        const confirmed = await new Promise<boolean>((resolve) => {
          Alert.alert(
            t('common.deleteConfirm'),
            t('common.deleteAllNotificationsConfirm'),
            [
              { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
              { text: t('common.delete'), style: 'destructive', onPress: () => resolve(true) }
            ]
          );
        });
      
      if (!confirmed) return;
      
      if (!currentUser) return;
      
      try {
        // Получаем все ID уведомлений пользователя
        const { data: notificationIds, error: fetchError } = await supabase
          .from('notifications')
          .select('id')
          .eq('user_id', currentUser.id);
        
              if (fetchError) {
                console.error('❌ Ошибка получения ID уведомлений:', fetchError);
                Alert.alert('Ошибка', 'Не удалось получить уведомления');
                return;
              }
        
        if (!notificationIds || notificationIds.length === 0) {
          setNotifications([]);
          setFriendRequests([]);
          setGiftRequests([]);
          Alert.alert('Успех', 'Все уведомления очищены');
          return;
        }
        
        // Удаляем каждое уведомление по отдельности
        let successCount = 0;
        for (const notification of notificationIds) {
          try {
            const { error: deleteError } = await supabase
              .from('notifications')
              .delete()
              .eq('id', notification.id);
            
            if (deleteError) {
              console.error('❌ Ошибка удаления уведомления', notification.id, ':', deleteError);
            } else {
              successCount++;
            }
          } catch (individualError) {
            console.error('❌ Ошибка удаления уведомления', notification.id, ':', individualError);
          }
        }
        
        // Обнуляем счетчик непрочитанных уведомлений
        await supabase.rpc('reset_unread_notifications', { user_id: currentUser.id });
        console.log('✅ Счетчик уведомлений обнулен после удаления всех уведомлений');
        
        // Обновляем локальное состояние
        setNotifications([]);
        setFriendRequests([]);
        setGiftRequests([]);
        
        // Обновляем данные только один раз для синхронизации счетчика
        await loadNotificationsData();
        
        // Уведомление убрано - и так видно что уведомления удалились
        } catch (error) {
          console.error('❌ Ошибка очистки уведомлений:', error);
          Alert.alert('Ошибка', 'Не удалось очистить уведомления');
        }
    } catch (error) {
      console.error('❌ Ошибка очистки уведомлений:', error);
    }
  };

  const handleNotificationPress = async (notification: NotificationItem) => {
    
    try {
      // Для actionable уведомлений не выполняем автоматическую отметку как прочитанное
      // так как для них есть кнопка "Супер"
      if (notification.isActionable) {
        // Просто обрабатываем нажатие без изменения статуса
        return;
      }
      
      // Отмечаем уведомление как прочитанное, если оно еще не прочитано
      if (notification.isRead === false) {
        
        // Отмечаем как прочитанное в базе данных
        const success = await markNotificationAsRead(notification.id);
        
        if (success) {
          // Обновляем локальное состояние после успешного обновления в БД
          setNotifications(prev => prev.map(n => 
            n.id === notification.id ? { ...n, isRead: true } : n
          ));
          
          // Убираем обновление счетчика - он уже обновлен в notifyFriendsAboutGiftReceived
          // await updateNotificationCount();
        } else {
          console.error('❌ Не удалось отметить уведомление как прочитанное');
        }
      }
      
      // Обработка нажатия на уведомление
      if (notification.type === 'friend_request') {
        // Для запросов в друзья показываем профиль игрока
        if (notification.playerId) {
          router.push(`/player/${notification.playerId}`);
        }
      } else if (notification.type === 'friend_accepted') {
        // Для уведомлений о принятом запросе показываем профиль игрока, который принял
        if (notification.data && notification.data.acceptor_id) {
          router.push(`/player/${notification.data.acceptor_id}`);
        }
      } else if (notification.type === 'autograph_request' || notification.type === 'stick_request') {
        // Для запросов автографов и клюшек показываем профиль игрока
        if (notification.playerId) {
          router.push(`/player/${notification.playerId}`);
        }
      } else if (notification.type === 'gift_accepted') {
        // Для уведомлений о принятых подарках переходим в свой профиль
        if (currentUser) {
          router.push(`/player/${currentUser.id}`);
        }
      } else if (notification.type === 'stats_change') {
        // Для уведомлений о изменениях статистики показываем профиль игрока
        if (notification.data && notification.data.changedPlayerId) {
          router.push(`/player/${notification.data.changedPlayerId}`);
        }
      } else if (notification.type === 'photo_added') {
        // Для уведомлений о добавленных фото показываем профиль игрока
        if (notification.data && notification.data.changedPlayerId) {
          router.push(`/player/${notification.data.changedPlayerId}`);
        }
      } else if (notification.type === 'new_friendship') {
        // Для уведомлений о новой дружбе показываем профиль того, кто подтвердил дружбу
        if (notification.data && notification.data.confirmedBy) {
          router.push(`/player/${notification.data.confirmedBy}`);
        }
      } else if (notification.type === 'gift_received') {
        // Для уведомлений о полученных подарках переходим в музей того, кто получил подарок
        if (notification.data && notification.data.playerId) {
          router.push(`/player/${notification.data.playerId}?scrollToMuseum=true`);
        } else if (currentUser) {
          // Fallback на текущего пользователя, если playerId не найден
          router.push(`/player/${currentUser.id}?scrollToMuseum=true`);
        }
      } else if (notification.type === 'video_added') {
        // Для уведомлений о добавленных видео показываем профиль игрока
        if (notification.data && notification.data.changedPlayerId) {
          router.push(`/player/${notification.data.changedPlayerId}`);
        }
      } else if (notification.type === 'avatar_changed') {
        // Для уведомлений об изменении аватара показываем профиль игрока
        if (notification.data && notification.data.changedPlayerId) {
          router.push(`/player/${notification.data.changedPlayerId}`);
        }
      } else if (notification.type === 'achievement_added') {
        // Для уведомлений о новых достижениях показываем профиль игрока
        if (notification.data && notification.data.changedPlayerId) {
          router.push(`/player/${notification.data.changedPlayerId}`);
        }
      } else if (notification.type === 'physical_data_changed') {
        // Для уведомлений об изменении роста/веса показываем профиль игрока
        if (notification.data && notification.data.changedPlayerId) {
          router.push(`/player/${notification.data.changedPlayerId}`);
        }
      }
      
    } catch (error) {
      console.error('❌ Ошибка обработки уведомления:', error);
    }
  };

  const handleSuperAction = async (notification: NotificationItem) => {
    try {
      if (!currentUser || !notification.id) {
        console.error('❌ Некорректные данные уведомления:', { currentUser: !!currentUser, notificationId: notification.id });
        Alert.alert('Ошибка', 'Некорректные данные уведомления');
        return;
      }
      
      
      // Проверяем, что уведомление существует в базе данных
      let notificationExists = false;
      try {
        const { data: existingNotification, error: checkError } = await supabase
          .from('notifications')
          .select('id, is_read')
          .eq('id', notification.id)
          .single();
        
        if (!checkError && existingNotification) {
          notificationExists = true;
        } else {
        }
      } catch (checkError) {
      }
      
      // Если уведомление не существует в БД, просто обновляем данные без дерганья
      if (!notificationExists) {
        // Обновляем данные только один раз, без множественных вызовов
        await loadNotificationsData();
        
        // Если это уведомление о принятом подарке, переходим в музей
        if (notification.type === 'gift_accepted') {
          router.push(`/player/${currentUser.id}?scrollToMuseum=true`);
        } else {
          Alert.alert('Успех', 'Уведомление обработано!');
        }
        return;
      }
      
      // Пытаемся удалить уведомление из базы данных
      let success = false;
      
      try {
        const { error: deleteError } = await supabase
          .from('notifications')
          .delete()
          .eq('id', notification.id);
        
        if (!deleteError) {
          success = true;
        } else {
        }
      } catch (dbError) {
      }
      
      // Если удаление не удалось, пытаемся отметить как прочитанное
      if (!success) {
        try {
          const markSuccess = await markNotificationAsRead(notification.id);
          
          if (markSuccess) {
            success = true;
          }
        } catch (markError) {
          console.error('❌ Ошибка отметки уведомления:', markError);
        }
      }
      
      // Убираем обновление счетчика - он уже обновлен в notifyFriendsAboutGiftReceived
      if (success) {
        // try {
        //   await updateNotificationCount();
        // } catch (updateError) {
        // }
        
        // Если это уведомление о принятом подарке, переходим в музей
        if (notification.type === 'gift_accepted') {
          router.push(`/player/${currentUser.id}?scrollToMuseum=true`);
        } else {
          Alert.alert('Успех', 'Уведомление обработано!');
        }
      } else {
        // Если ничего не удалось, возвращаем уведомление обратно
        setNotifications(prev => [...prev, notification]);
        Alert.alert('Ошибка', 'Не удалось обработать уведомление. Попробуйте еще раз.');
      }
      
    } catch (error) {
      console.error('❌ Ошибка обработки уведомления:', error);
      
      // В случае ошибки возвращаем уведомление обратно в список
      setNotifications(prev => [...prev, notification]);
      
      Alert.alert('Ошибка', 'Не удалось обработать уведомление. Попробуйте еще раз.');
    }
  };

  const handleFriendRequest = async (request: FriendRequestItem, action: 'accept' | 'decline') => {
    try {
      // Проверяем, существует ли ещё запрос в БД
      const { data: existingRequest } = await supabase
        .from('friend_requests')
        .select('id, status')
        .or(`and(from_id.eq.${request.playerId},to_id.eq.${request.receiverId}),and(from_id.eq.${request.receiverId},to_id.eq.${request.playerId})`)
        .eq('status', 'pending')
        .single();
      
      if (!existingRequest) {
        // Запрос был отменен или удален
        Alert.alert(t('common.info'), 'Запрос дружбы был отменен отправителем');
        
        // Удаляем уведомление локально
        setFriendRequests(prev => prev.filter(req => req.id !== request.id));
        await loadNotificationsData();
        return;
      }
      
      if (action === 'accept') {
        // receiverId - это тот, кто получает запрос (currentUser), playerId - отправитель
        // При принятии первый параметр - тот кто принимает (receiverId), второй - отправитель (playerId)
        await acceptFriendRequest(request.receiverId, request.playerId);
        Alert.alert(t('common.success'), t('notifications.friendRequestAccepted'));
      } else {
        await declineFriendRequest(request.receiverId, request.playerId);
        Alert.alert(t('common.success'), t('notifications.friendRequestDeclined'));
      }
      
      // Обновляем список запросов
      setFriendRequests(prev => prev.filter(req => req.id !== request.id));
      
      // Обновляем данные только один раз для синхронизации счетчика
      await loadNotificationsData();
      
    } catch (error) {
      console.error('Ошибка обработки запроса в друзья:', error);
      Alert.alert('Ошибка', 'Не удалось обработать запрос в друзья');
    }
  };

  const handleGiftRequest = async (request: GiftRequestItem, action: 'accept' | 'decline') => {
    try {
      const requestId = request.id.replace('gift_request_', '');
      
      if (action === 'accept') {
        // В новой системе просто переходим на профиль игрока с прокруткой к музею
        router.push({
          pathname: '/player/[id]',
          params: { 
            id: request.playerId,
            scrollToMuseum: 'true'
          }
        });
        
        // Обновляем статус запроса на "принят" (но подарок еще не отправлен)
        const { error: updateError } = await supabase
          .from('item_requests')
          .update({ status: 'accepted' })
          .eq('id', requestId);

        if (updateError) {
          console.error('❌ Ошибка обновления статуса запроса:', updateError);
        }
        
        // Удаляем уведомление из списка
        setGiftRequests(prev => prev.filter(req => req.id !== request.id));
      }
    } catch (error) {
      console.error('❌ Ошибка обработки запроса на подарок:', error);
      Alert.alert('Ошибка', 'Не удалось обработать запрос');
    }
  };

  const formatTime = (timestamp: number | string) => {
    let date: Date;
    
    // Обрабатываем разные форматы timestamp
    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      date = new Date(timestamp);
    }
    
    // Проверяем, что дата валидна
    if (isNaN(date.getTime())) {
      return 'Недавно';
    }
    
    const now = new Date();
    const diffInMinutes = (now.getTime() - date.getTime()) / (1000 * 60);
    
    if (diffInMinutes < 1) {
      return 'Только что';
    } else if (diffInMinutes < 60) {
      return `${Math.floor(diffInMinutes)} мин назад`;
    } else if (diffInMinutes < 1440) {
      return `${Math.floor(diffInMinutes / 60)} ч назад`;
    } else {
      return date.toLocaleDateString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'friend_request':
        return 'person-add';
      case 'gift_request':
        return 'gift';
      case 'gift_accepted':
        return 'gift';
      case 'autograph_request':
        return 'create';
      case 'stick_request':
        return 'key';
      case 'achievement':
        return 'trophy';
      case 'team_invite':
        return 'people';
      case 'stats_change':
        return 'trending-up';
      case 'system':
        return 'information-circle';
      default:
        return 'notifications';
    }
  };

  if (loading && notifications.length === 0 && friendRequests.length === 0 && giftRequests.length === 0) {
    return (
      <View style={styles.container}>
        <ImageBackground source={iceBg} style={styles.background} resizeMode="cover">
          <View style={styles.overlay}>
            <View style={styles.pageHeader}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.pageTitle}>{t('notifications.title')}</Text>
            </View>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>{t('notifications.loading')}</Text>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  // Если пользователь не авторизован, не показываем пустое состояние — скрываем контент
  if (!currentUser) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Animated.View 
        style={[styles.container, animatedStyle]}
      >
        <ImageBackground source={iceBg} style={styles.background} resizeMode="cover">
        <View style={styles.overlay}>
          {/* Заголовок страницы */}
          <View style={styles.pageHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>{t('notifications.title')}</Text>
            <TouchableOpacity onPress={handleClearAllNotifications} style={styles.clearAllButton}>
              <Ionicons name="trash-outline" size={24} color="#fa2f40" />
            </TouchableOpacity>
          </View>
          
          {/* Список уведомлений */}
          <ScrollView 
            style={styles.notificationsContainer}
            contentContainerStyle={styles.notificationsContent}
            removeClippedSubviews={true}
            decelerationRate="fast"
          >
            {friendRequests.map((request) => (
              <View key={request.id} style={styles.friendRequestWrapper}>
                <FriendRequestNotification
                  playerName={request.playerName}
                  timestamp={new Date(request.timestamp).toISOString()}
                  playerAvatar={request.playerAvatar}
                  onAccept={() => handleFriendRequest(request, 'accept')}
                  onDecline={() => handleFriendRequest(request, 'decline')}
                />
              </View>
            ))}

            {/* Запросы на подарки */}
            {giftRequests.map((request) => (
              <View key={request.id}>
                <GiftRequestNotification
                  playerName={request.playerName}
                  timestamp={new Date(request.timestamp).toISOString()}
                  playerAvatar={request.playerAvatar}
                  itemType={request.itemType}
                  requestMessage={request.requestMessage}
                  onGift={() => handleGiftRequest(request, 'accept')}
                />
              </View>
            ))}
            

            
            {notifications.map((notification, index) => (
              <Swipeable
                key={notification.id}
                renderRightActions={renderRightActions}
                onSwipeableOpen={() => handleDeleteNotification(notification.id)}
                overshootRight={false}
                friction={2}
                rightThreshold={40}
              >
                <AnimatedNotification key={notification.id} index={index}>
                  {notification.type === 'stats_change' && notification.data && notification.data.changes ? (
                <TouchableOpacity
                  onPress={() => {
                    handleNotificationPress(notification);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <StatsChangeNotification
                    changes={notification.data.changes}
                    playerName={notification.data.changedPlayerName || 'Игрок'}
                    timestamp={notification.timestamp}
                    playerAvatar={notification.data.changedPlayerAvatar}
                  />
                </TouchableOpacity>
              ) : notification.type === 'photo_added' ? (
                <TouchableOpacity
                  onPress={() => {
                    handleNotificationPress(notification);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <PhotoAddedNotification
                    playerName={notification.data.changedPlayerName || 'Игрок'}
                    photosCount={notification.data.addedPhotosCount || 1}
                    timestamp={notification.data.timestamp || new Date(notification.timestamp).toISOString()}
                    playerAvatar={notification.data.changedPlayerAvatar}
                  />
                </TouchableOpacity>
              ) : notification.type === 'new_friendship' ? (
                <FriendshipNotification
                  friend1Name={notification.data.friend1Name || 'Игрок 1'}
                  friend2Name={notification.data.friend2Name || 'Игрок 2'}
                  timestamp={notification.data.timestamp || new Date(notification.timestamp).toISOString()}
                  friend1Avatar={notification.data.friend1Avatar}
                  friend2Avatar={notification.data.friend2Avatar}
                  confirmedBy={notification.data.confirmedBy}
                  onPress={() => {
                    // Используем confirmedBy если есть, иначе fallback на friend1Id
                    const confirmedBy = notification.data?.confirmedBy || notification.data?.friend1Id;
                    
                    if (confirmedBy) {
                      // Временно обновляем данные уведомления для передачи в handleNotificationPress
                      const updatedNotification = {
                        ...notification,
                        data: {
                          ...notification.data,
                          confirmedBy: confirmedBy
                        }
                      };
                      handleNotificationPress(updatedNotification);
                    }
                  }}
                />
              ) : notification.type === 'exercise_completed' ? (
                <TouchableOpacity
                  onPress={() => {
                    handleNotificationPress(notification);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <ExerciseNotification
                    playerName={notification.data.playerName || 'Игрок'}
                    exerciseId={notification.data.exerciseId || 'unknown'}
                    timestamp={notification.data.timestamp || new Date(notification.timestamp).toISOString()}
                    playerAvatar={notification.data.playerAvatar}
                  />
                </TouchableOpacity>
              ) : notification.type === 'gift_received' ? (
                <TouchableOpacity
                  onPress={() => {
                    handleNotificationPress(notification);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <GiftReceivedNotification
                    playerName={notification.data.playerName || 'Игрок'}
                    starName={notification.data.starName || 'Звезда'}
                    giftName={notification.data.giftName || 'Подарок'}
                    giftType={notification.data.giftType || 'gift'}
                    timestamp={notification.data.timestamp || new Date(notification.timestamp).toISOString()}
                    playerAvatar={notification.data.playerAvatar}
                  />
                </TouchableOpacity>
              ) : notification.type === 'friend_accepted' ? (
                <TouchableOpacity
                  onPress={() => {
                    console.log('🔍 Friend Accepted Notification Data:', {
                      data: notification.data,
                      acceptor_name: notification.data?.acceptor_name,
                      acceptor_avatar: notification.data?.acceptor_avatar
                    });
                    handleNotificationPress(notification);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <FriendAcceptedNotification
                    playerName={notification.data?.acceptor_name || 'Игрок'}
                    message={notification.message}
                    timestamp={notification.timestamp}
                    playerAvatar={notification.data?.acceptor_avatar}
                  />
                </TouchableOpacity>
              ) : notification.type === 'gift_accepted' ? (
                <GiftAcceptedNotification
                  starName={notification.data?.from_star || t('notifications.star')}
                  starAvatar={notification.data?.star_avatar}
                  itemTypeName={getItemTypeName(notification.data?.item_type || 'gift')}
                  message={notification.message}
                  formattedTime={formatTime(notification.timestamp)}
                  acknowledgeButtonText={t('common.super')}
                  onAcknowledge={() => handleSuperAction(notification)}
                />
              ) : notification.type === 'video_added' ? (
                <TouchableOpacity
                  onPress={() => {
                    handleNotificationPress(notification);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <VideoAddedNotification
                    playerName={notification.data.changedPlayerName || 'Игрок'}
                    videosCount={notification.data.addedVideosCount || 1}
                    timestamp={notification.data.timestamp || new Date(notification.timestamp).toISOString()}
                    playerAvatar={notification.data.changedPlayerAvatar}
                  />
                </TouchableOpacity>
              ) : notification.type === 'avatar_changed' ? (
                <TouchableOpacity
                  onPress={() => {
                    handleNotificationPress(notification);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <AvatarChangedNotification
                    playerName={notification.data.changedPlayerName || 'Игрок'}
                    timestamp={notification.data.timestamp || new Date(notification.timestamp).toISOString()}
                    playerAvatar={notification.data.changedPlayerAvatar}
                  />
                </TouchableOpacity>
              ) : notification.type === 'achievement_added' ? (
                <TouchableOpacity
                  onPress={() => {
                    handleNotificationPress(notification);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <AchievementAddedNotification
                    playerName={notification.data.changedPlayerName || 'Игрок'}
                    achievementsCount={notification.data.addedAchievementsCount || 1}
                    timestamp={notification.data.timestamp || new Date(notification.timestamp).toISOString()}
                    playerAvatar={notification.data.changedPlayerAvatar}
                  />
                </TouchableOpacity>
              ) : notification.type === 'physical_data_changed' ? (
                <TouchableOpacity
                  onPress={() => {
                    handleNotificationPress(notification);
                  }}
                  activeOpacity={0.7}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <PhysicalDataChangedNotification
                    playerName={notification.data.changedPlayerName || 'Игрок'}
                    changes={notification.data.changes || []}
                    timestamp={notification.data.timestamp || new Date(notification.timestamp).toISOString()}
                    playerAvatar={notification.data.changedPlayerAvatar}
                  />
                </TouchableOpacity>
              ) : (
              <TouchableOpacity
                key={notification.id}
                style={styles.notificationItem}
                onPress={() => {
                  handleNotificationPress(notification);
                }}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <View style={styles.notificationIcon}>
                  <Ionicons 
                    name={getNotificationIcon(notification.type) as any} 
                    size={24} 
                    color="#fa2f40" 
                  />
                </View>
                
                <View style={styles.notificationContent}>
                  <View style={styles.notificationHeader}>
                    <Text style={styles.notificationTitle} numberOfLines={2}>
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {formatTime(notification.timestamp)}
                    </Text>
                  </View>
                  
                  <Text style={styles.notificationMessage}>
                    {notification.message}
                  </Text>
                  
                  {notification.playerAvatar && (
                    <View style={styles.playerInfo}>
                      <Image 
                        source={{ uri: notification.playerAvatar }} 
                        style={styles.playerAvatar}
                        defaultSource={require('../assets/images/default-avatar.png')}
                        onError={() => {
                          console.log('Ошибка загрузки аватарки для:', notification.playerName);
                        }}
                      />
                      <Text style={styles.playerName} numberOfLines={1} ellipsizeMode="tail">
                        {notification.playerName}
                      </Text>
                    </View>
                  )}
                  
                  {/* Кнопка "Супер" для actionable уведомлений */}
                  {notification.isActionable && (
                    <View style={styles.superActionContainer}>
                      <TouchableOpacity
                        style={styles.superActionButton}
                        onPress={() => handleSuperAction(notification)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.superActionButtonText}>Супер!</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
              )}
                </AnimatedNotification>
              </Swipeable>
            ))}
            


            {/* Показываем пустое состояние только если нет ни уведомлений, ни запросов в друзья, ни запросов на подарки И не идет загрузка */}
            {notifications.length === 0 && friendRequests.length === 0 && giftRequests.length === 0 && !loading && (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyContent}>
                  <Ionicons name="notifications-outline" size={64} color="#fa2f40" />
                  <Text style={styles.emptyTitle}>{t('notifications.noNotifications')}</Text>
                  <Text style={styles.emptySubtitle}>
                    {t('notifications.noNotificationsSubtitle')}
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </ImageBackground>
      </Animated.View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000', // Черный фон для предотвращения белого экрана при загрузке
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    color: '#fa2f40',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
  },
  notificationsContainer: {
    flex: 1,
  },
  notificationsContent: {
    paddingTop: 68, // Отступ для фиксированного заголовка
    paddingBottom: 8,
  },
  pageHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
  },
  pageTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
    flex: 1,
    textAlign: 'left',
  },
  clearAllButton: {
    // Убираем фон и отступы для компактности
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyContent: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 15,
    padding: 20, // Точно такой же padding как в сообщениях
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    marginHorizontal: 16, // Такая же ширина как у элементов чатов
  },
  emptyTitle: {
    color: '#FFFFFF', // Изменили с #fff на #FFFFFF (белый)
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    color: '#FFFFFF', // Изменили с #fa2f40 на #FFFFFF (белый)
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
    paddingHorizontal: 20, // Точно такой же paddingHorizontal как в сообщениях
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    minHeight: 80,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(250, 47, 64, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    flexShrink: 0,
  },
  notificationContent: {
    flex: 1,
    justifyContent: 'flex-start',
    minHeight: 60,
    flexShrink: 1,
    flexDirection: 'column',
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    flex: 1,
    marginRight: 8,
    flexShrink: 1,
  },
  notificationTime: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    flexShrink: 0,
    textAlign: 'right',
    minWidth: 80,
  },
  notificationMessage: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    lineHeight: 22,
    marginBottom: 8,
    flexShrink: 1,
    flex: 1,
  },
  playerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    flexShrink: 1,
  },
  playerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
    flexShrink: 0,
  },
  playerName: {
    color: '#fa2f40',
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    flexShrink: 1,
    flex: 1,
  },
  unreadDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#fa2f40',
    marginLeft: 12,
    marginTop: 4,
    flexShrink: 0,
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(250, 47, 64, 0.2)',
    borderWidth: 1,
    borderColor: '#fa2f40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(250, 47, 64, 0.3)',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
  },
  friendRequestWrapper: {
    marginVertical: 8,
  },
  friendRequestItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  friendRequestActions: {
    flexDirection: 'row',
    marginTop: 8,
    marginHorizontal: 20,
    justifyContent: 'flex-end',
    gap: 10,
  },
  actionButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginRight: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: '#4CAF50',
    borderWidth: 1,
    borderColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  acceptButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
  },
  declineButton: {
    backgroundColor: '#fa2f40',
    borderWidth: 1,
    borderColor: '#fa2f40',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  declineButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
  },
  // Новые стили для запросов в друзья
  friendRequestContent: {
    flex: 1,
    flexDirection: 'column',
    paddingRight: 16,
  },
  friendRequestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  friendRequestTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    flex: 1,
    marginRight: 8,
    flexShrink: 1,
  },
  friendRequestTime: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    flexShrink: 0,
    textAlign: 'right',
    minWidth: 80,
  },
  friendRequestMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    flexWrap: 'nowrap',
  },
  friendRequestAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    flexShrink: 0,
  },
  friendRequestMessage: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    flex: 1,
    flexShrink: 1,
  },
  superActionContainer: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  superActionButton: {
    backgroundColor: '#fa2f40',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#fa2f40',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  superActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
  },
  deleteButton: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 60,
    height: '100%',
  },
});
