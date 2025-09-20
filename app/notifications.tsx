import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Image,
    ImageBackground,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import {
    acceptFriendRequest,
    declineFriendRequest,
    getReceivedFriendRequests,
    loadCurrentUser,
    loadNotifications,
    markNotificationAsRead,
    Player
} from '../utils/playerStorage';
import { supabase } from '../utils/supabase';

const iceBg = require('../assets/images/led.jpg');

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

// Функция для получения иконки уведомления
const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'stats_change': return 'trending-up';
    case 'normative_change': return 'fitness';
    case 'photo_added': return 'camera';
    case 'video_added': return 'videocam';
    case 'gift_received': return 'gift';
    case 'exercise_completed': return 'checkmark-circle';
    case 'friend_request': return 'person-add';
    case 'message': return 'chatbubble';
    case 'gift_request': return 'gift-outline';
    default: return 'notifications';
  }
};

interface NotificationItem {
  id: string;
  type: 'friend_request' | 'autograph_request' | 'stick_request' | 'gift_request' | 'gift_accepted' | 'system' | 'achievement' | 'team_invite' | 'stats_change' | 'normative_change' | 'photo_added' | 'video_added' | 'gift_received' | 'exercise_completed' | 'message';
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
  itemType: 'autograph' | 'stick' | 'puck' | 'jersey';
  requestMessage: string;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequestItem[]>([]);
  const [giftRequests, setGiftRequests] = useState<GiftRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const user = await loadCurrentUser();
        if (user) {
          setCurrentUser(user);
        } else {
          router.replace('/login');
          return;
        }
        
        // Загружаем уведомления только если пользователь авторизован
        if (user) {
          await loadNotificationsData();
        }
      } catch (error) {
        console.error('Ошибка загрузки пользователя:', error);
        router.replace('/login');
        return;
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
  }, [router]);

  // Дополнительная проверка авторизации при фокусе на экран
  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      const verifyAuthOnFocus = async () => {
        try {
          const user = await loadCurrentUser();
          if (!user) {
            if (isActive) {
              setCurrentUser(null);
              router.replace('/login');
            }
            return;
          }
          if (isActive) {
            setCurrentUser(user);
          }
        } catch (e) {
          if (isActive) {
            setCurrentUser(null);
            router.replace('/login');
          }
        }
      };
      verifyAuthOnFocus();
      return () => {
        isActive = false;
      };
    }, [router])
  );

  // Автоматически отмечаем все уведомления как прочитанные при входе в экран
  useEffect(() => {
    if (currentUser && notifications.length > 0) {
      markAllNotificationsAsRead();
    }
  }, [currentUser]); // Убрал notifications.length из зависимостей

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
        }
      };
    }, [currentUser])
  );

  const loadNotificationsData = async () => {
    try {
      setLoading(true);
      if (!currentUser) return;

      // Загружаем все уведомления из хранилища
      const storedNotifications = await loadNotifications(currentUser.id);
      
      // Фильтруем уведомления, которые относятся к текущему пользователю
      const userNotifications = storedNotifications.filter(notification => {
        // Уведомления о запросах дружбы показываем только если они предназначены для этого пользователя
        if (notification.type === 'friend_request') {
          return notification.receiver_id === currentUser.id;
        }
        
        // Уведомления о подарках и других действиях
        if (notification.type === 'gift_accepted' || 
            notification.type === 'autograph_request' || 
            notification.type === 'stick_request' ||
            notification.type === 'achievement' || 
            notification.type === 'team_invite' || 
            notification.type === 'system') {
          return notification.user_id === currentUser.id;
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
        
        // Правильно маппим поля из Supabase
        const mappedNotification = {
          ...notification,
          id: notification.id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          timestamp,
          isRead: notification.is_read || false,
          playerId: notification.player_id,
          playerName: notification.player_name,
          playerAvatar: notification.player_avatar,
          receiverId: notification.receiver_id,
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
        title: 'Запрос в друзья',
        message: `${player.name} хочет добавить вас в друзья`,
        timestamp: Date.now(),
        isRead: false,
        playerId: player.id,
        playerName: player.name,
        playerAvatar: player.avatar,
        receiverId: currentUser.id
      }));
      
      // Загружаем запросы на подарки (только для звезд)
      let giftRequestItems: GiftRequestItem[] = [];
      if (currentUser.status === 'star') {
        try {
          const { data: giftRequestsData, error: giftRequestsError } = await supabase
            .from('item_requests')
            .select(`
              *,
              requester:players!item_requests_requester_id_fkey(
                name,
                avatar_url
              )
            `)
            .eq('owner_id', currentUser.id)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

          if (giftRequestsError) {
            console.error('Ошибка загрузки запросов на подарки:', giftRequestsError);
          } else if (giftRequestsData) {
            giftRequestItems = giftRequestsData.map(request => ({
              id: `gift_request_${request.id}`,
              type: 'gift_request',
              title: 'Запрос на подарок',
              message: `${request.requester?.name || 'Игрок'} просит ${getItemTypeName(request.item_type)}`,
              timestamp: new Date(request.created_at).getTime(),
              isRead: false,
              playerId: request.requester_id,
              playerName: request.requester?.name || 'Неизвестный игрок',
              playerAvatar: request.requester?.avatar_url,
              receiverId: currentUser.id,
              itemType: request.item_type,
              requestMessage: request.message
            }));
          }
        } catch (error) {
          console.error('Ошибка загрузки запросов на подарки:', error);
        }
      }
      
      setNotifications(userNotifications);
      setFriendRequests(friendRequestItems);
      setGiftRequests(giftRequestItems);
      
    } catch (error) {
      console.error('❌ Ошибка загрузки уведомлений:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить уведомления');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadNotificationsData();
    setRefreshing(false);
  };

  // Отмечаем все уведомления как прочитанные
  const markAllNotificationsAsRead = async () => {
    try {
      if (!currentUser) return;
      
      // Получаем все ID уведомлений пользователя, исключая actionable уведомления
      const { data: notificationIds, error: fetchError } = await supabase
        .from('notifications')
        .select('id, type')
        .eq('user_id', currentUser.id)
        .eq('is_read', false);
      
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
          const { error: updateError } = await supabase
            .from('notifications')
            .update({ is_read: true })
            .eq('id', notification.id);
          
          if (updateError) {
            console.error('❌ Ошибка обновления уведомления', notification.id, ':', updateError);
          } else {
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
      
      // Обновляем данные только один раз для синхронизации счетчика
      await loadNotificationsData();
      
    } catch (error) {
      console.error('❌ Ошибка в markAllNotificationsAsRead:', error);
    }
  };

  const handleClearAllNotifications = async () => {
    try {
      Alert.alert(
        'Очистить все уведомления',
        'Вы уверены, что хотите удалить все уведомления?',
        [
          { text: 'Отмена', style: 'cancel' },
          {
            text: 'Очистить',
            style: 'destructive',
            onPress: async () => {
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
                
                // Обновляем локальное состояние
                setNotifications([]);
                setFriendRequests([]);
                setGiftRequests([]);
                
                // Обновляем данные только один раз для синхронизации счетчика
                await loadNotificationsData();
                
                Alert.alert('Успех', `Удалено ${successCount} уведомлений`);
              } catch (error) {
                console.error('❌ Ошибка очистки уведомлений:', error);
                Alert.alert('Ошибка', 'Не удалось очистить уведомления');
              }
            }
          }
        ]
      );
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
          
          // Обновляем данные только один раз для синхронизации счетчика
          await loadNotificationsData();
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
      
      console.log('🔔 Обрабатываем уведомление:', { id: notification.id, type: notification.type, title: notification.title });
      
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
          console.log('✅ Уведомление найдено в БД:', { id: existingNotification.id, isRead: existingNotification.is_read });
        } else {
          console.log('⚠️ Уведомление не найдено в БД или уже обработано');
        }
      } catch (checkError) {
        console.log('⚠️ Ошибка при проверке уведомления в БД:', checkError);
      }
      
      // Если уведомление не существует в БД, просто обновляем данные без дерганья
      if (!notificationExists) {
        console.log('ℹ️ Уведомление уже обработано, обновляем данные');
        // Обновляем данные только один раз, без множественных вызовов
        await loadNotificationsData();
        Alert.alert('Успех', 'Уведомление обработано!');
        return;
      }
      
      // Пытаемся удалить уведомление из базы данных
      let success = false;
      
      try {
        console.log('🗑️ Пытаемся удалить уведомление из БД:', notification.id);
        const { error: deleteError } = await supabase
          .from('notifications')
          .delete()
          .eq('id', notification.id);
        
        if (!deleteError) {
          success = true;
          console.log('✅ Уведомление успешно удалено из БД');
        } else {
          console.log('⚠️ Не удалось удалить уведомление из БД:', deleteError);
        }
      } catch (dbError) {
        console.log('⚠️ Ошибка при удалении из БД:', dbError);
      }
      
      // Если удаление не удалось, пытаемся отметить как прочитанное
      if (!success) {
        try {
          console.log('📝 Пытаемся отметить уведомление как прочитанное:', notification.id);
          const markSuccess = await markNotificationAsRead(notification.id);
          if (markSuccess) {
            success = true;
            console.log('✅ Уведомление отмечено как прочитанное');
          } else {
            console.log('⚠️ Не удалось отметить уведомление как прочитанное');
          }
        } catch (markError) {
          console.log('⚠️ Ошибка при отметке как прочитанное:', markError);
        }
      }
      
      // Обновляем данные только один раз для синхронизации счетчика
      if (success) {
        try {
          await loadNotificationsData();
          console.log('🔄 Данные уведомлений обновлены');
        } catch (updateError) {
          console.log('⚠️ Ошибка при обновлении данных:', updateError);
        }
        Alert.alert('Успех', 'Уведомление обработано!');
      } else {
        // Если ничего не удалось, возвращаем уведомление обратно
        console.log('⚠️ Возвращаем уведомление обратно в список');
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
      if (action === 'accept') {
        await acceptFriendRequest(request.playerId, request.receiverId);
        Alert.alert('Успех', 'Запрос в друзья принят!');
      } else {
        await declineFriendRequest(request.playerId, request.receiverId);
        Alert.alert('Успех', 'Запрос в друзья отклонен');
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
        
        // Принимаем запрос на подарок
        const { error: updateError } = await supabase
          .from('item_requests')
          .update({ status: 'accepted' })
          .eq('id', requestId);

        if (updateError) {
          throw updateError;
        }
        
        // Получаем данные о запросе для создания подарка
        const { data: requestData, error: requestError } = await supabase
          .from('item_requests')
          .select('*')
          .eq('id', requestId)
          .single();

        if (requestError || !requestData) {
          throw new Error('Не удалось получить данные о запросе');
        }

        // Сначала проверяем, есть ли у звезды готовый подарок такого типа
        const { data: existingItems, error: searchError } = await supabase
          .from('items')
          .select('*')
          .eq('owner_id', requestData.owner_id) // У звезды
          .eq('item_type', requestData.item_type)
          .eq('is_available', true)
          .limit(1);

        if (searchError) {
          console.error('❌ Ошибка поиска существующих подарков:', searchError);
        }

        let newItem;
        if (existingItems && existingItems.length > 0) {
          // Используем существующий подарок звезды
          newItem = existingItems[0];
          
          // Помечаем подарок как недоступный
          const { error: updateError } = await supabase
            .from('items')
            .update({ is_available: false })
            .eq('id', newItem.id);
            
          if (updateError) {
            console.error('❌ Ошибка обновления доступности подарка:', updateError);
          }
        } else {
          // Создаем новый подарок
          const { data: createdItem, error: itemError } = await supabase
            .from('items')
            .insert([{
              owner_id: requestData.requester_id, // Владелец - игрок, который просил
              item_type: requestData.item_type,
              name: `${getItemTypeName(requestData.item_type)} от ${currentUser?.name || 'Звезды'}`,
              description: `Подарок, полученный по запросу: ${requestData.message}`,
              image_url: null, // Пока без изображения
              is_available: false // Подарок больше не доступен для запросов
            }])
            .select()
            .single();

          if (itemError || !createdItem) {
            console.error('❌ Ошибка создания подарка:', itemError);
            throw new Error('Не удалось создать подарок');
          }
          
          newItem = createdItem;
        }

        // Добавляем подарок в музей игрока
        const { error: museumError } = await supabase
          .from('player_museum')
          .insert([{
            player_id: requestData.requester_id, // Игрок, который получил подарок
            item_id: newItem.id, // ID созданного подарка
            received_from: requestData.owner_id // От кого получен (звезда)
          }]);

        if (museumError) {
          console.error('❌ Ошибка добавления в музей:', museumError);
          throw new Error('Не удалось добавить подарок в музей');
        }
        
        // Создаем уведомление для игрока о том, что его запрос одобрен
        try {
          await supabase
            .from('notifications')
            .insert([{
              user_id: requestData.requester_id,
              type: 'gift_accepted',
              title: 'Запрос на подарок одобрен!',
              message: `Ваш запрос на ${getItemTypeName(requestData.item_type)} от ${currentUser?.name || 'Звезды'} был одобрен! Подарок добавлен в ваш музей.`,
              is_read: false,
              data: { 
                item_id: newItem.id, 
                item_type: requestData.item_type,
                from_star: currentUser?.name 
              }
            }]);
        } catch (notificationError) {
          console.error('❌ Ошибка создания уведомления:', notificationError);
          // Не прерываем выполнение, если уведомление не создалось
        }

        Alert.alert('Успех', 'Запрос на подарок принят! Подарок добавлен в музей игрока.');
      } else {
        // Отклоняем запрос на подарок
        const { error: updateError } = await supabase
          .from('item_requests')
          .update({ status: 'rejected' })
          .eq('id', requestId);

        if (updateError) {
          throw updateError;
        }

        Alert.alert('Успех', 'Запрос на подарок отклонен');
      }
      
      // Обновляем список запросов
      setGiftRequests(prev => prev.filter(req => req.id !== request.id));
      
      // Обновляем данные только один раз для синхронизации счетчика
      await loadNotificationsData();
      
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
      case 'system':
        return 'information-circle';
      default:
        return 'notifications';
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ImageBackground source={iceBg} style={styles.background} resizeMode="cover">
          <View style={styles.overlay}>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Загрузка уведомлений...</Text>
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
    <View style={styles.container}>
      <ImageBackground source={iceBg} style={styles.background} resizeMode="cover">
        <View style={styles.overlay}>
          {/* Заголовок страницы */}
          <View style={styles.pageHeader}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.pageTitle}>Уведомления</Text>
            <TouchableOpacity onPress={handleClearAllNotifications} style={styles.clearAllButton}>
              <Ionicons name="trash-outline" size={24} color="#FF4444" />
            </TouchableOpacity>
          </View>
          
          {/* Список уведомлений */}
          <ScrollView 
            style={styles.notificationsContainer}
            contentContainerStyle={styles.notificationsContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor="#FF4444"
                colors={["#FF4444"]}
              />
            }
          >
            {friendRequests.map((request) => (
              <View key={request.id} style={styles.friendRequestItem}>
                <View style={styles.notificationIcon}>
                  <Ionicons name="people" size={24} color="#FF4444" />
                </View>
                
                <View style={styles.friendRequestContent}>
                  <View style={styles.friendRequestHeader}>
                    <Text style={styles.friendRequestTitle}>
                      {request.title}
                    </Text>
                    <Text style={styles.friendRequestTime}>
                      {formatTime(request.timestamp)}
                    </Text>
                  </View>
                  
                  <View style={styles.friendRequestMessageRow}>
                    {request.playerAvatar && (
                      <Image 
                        source={{ uri: request.playerAvatar }} 
                        style={styles.friendRequestAvatar}
                      />
                    )}
                    <Text style={styles.friendRequestMessage}>
                      {request.message}
                    </Text>
                  </View>
                  
                  <View style={styles.friendRequestActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleFriendRequest(request, 'accept')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.acceptButtonText}>Принять</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.declineButton]}
                      onPress={() => handleFriendRequest(request, 'decline')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.declineButtonText}>Отклонить</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {/* Запросы на подарки */}
            {giftRequests.map((request) => (
              <View key={request.id} style={styles.giftRequestItem}>
                <View style={styles.notificationIcon}>
                  <Ionicons name="gift" size={24} color="#ff4444" />
                </View>
                
                <View style={styles.giftRequestContent}>
                  <View style={styles.giftRequestHeader}>
                    <Text style={styles.giftRequestTitle} numberOfLines={1} ellipsizeMode="tail">
                      {request.title}
                    </Text>
                    <Text style={styles.giftRequestTime}>
                      {formatTime(request.timestamp)}
                    </Text>
                  </View>
                  
                  <View style={styles.giftRequestMessageRow}>
                    {request.playerAvatar && (
                      <Image 
                        source={{ uri: request.playerAvatar }} 
                        style={styles.giftRequestAvatar}
                      />
                    )}
                    <Text style={styles.giftRequestMessage}>
                      {request.message}
                    </Text>
                  </View>
                  
                  <Text style={styles.giftRequestDetails}>
                    Сообщение: {request.requestMessage}
                  </Text>
                  
                  <View style={styles.giftRequestActions}>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.acceptButton]}
                      onPress={() => handleGiftRequest(request, 'accept')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.acceptButtonText}>Принять</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={[styles.actionButton, styles.declineButton]}
                      onPress={() => handleGiftRequest(request, 'decline')}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.declineButtonText}>Отклонить</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}
            

            
            {notifications.map((notification) => (
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
                    color="#FF4444" 
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
            ))}
            


            {/* Показываем пустое состояние только если нет ни уведомлений, ни запросов в друзья, ни запросов на подарки */}
            {notifications.length === 0 && friendRequests.length === 0 && giftRequests.length === 0 && (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyContent}>
                  <Ionicons name="notifications-outline" size={64} color="#FF4444" />
                  <Text style={styles.emptyTitle}>Нет уведомлений</Text>
                  <Text style={styles.emptySubtitle}>
                    У вас пока нет уведомлений о дружбе, подарках или других действиях
                  </Text>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </ImageBackground>
    </View>
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
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Gilroy-Regular',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 68, 68, 0.3)',
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
    color: '#FF4444',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
  },
  notificationsContainer: {
    flex: 1,
  },
  notificationsContent: {
    paddingVertical: 8,
  },
  pageHeader: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 68, 68, 0.3)',
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
    textAlign: 'center',
  },
  clearAllButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 68, 68, 0.1)',
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
    borderColor: 'rgba(255, 68, 68, 0.3)',
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
    color: '#FFFFFF', // Изменили с #FF4444 на #FFFFFF (белый)
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
    borderColor: 'rgba(255, 68, 68, 0.3)',
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
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
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
    color: '#FF4444',
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    flexShrink: 1,
    flex: 1,
  },
  unreadDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FF4444',
    marginLeft: 12,
    marginTop: 4,
    flexShrink: 0,
  },
  clearButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#FF4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 68, 68, 0.3)',
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
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
    borderColor: 'rgba(255, 68, 68, 0.3)',
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
    justifyContent: 'flex-end',
    alignSelf: 'stretch',
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
    backgroundColor: '#FF4444',
    borderWidth: 1,
    borderColor: '#FF4444',
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
  // Стили для запросов на подарки
  giftRequestItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  giftRequestContent: {
    flex: 1,
    flexDirection: 'column',
  },
  giftRequestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  giftRequestTitle: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    flex: 1,
    marginRight: 8,
    flexShrink: 1,
  },
  giftRequestTime: {
    color: '#666',
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    flexShrink: 0,
    textAlign: 'right',
    minWidth: 80,
  },
  giftRequestMessageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    flexWrap: 'nowrap',
  },
  giftRequestAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    flexShrink: 0,
  },
  giftRequestMessage: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    flex: 1,
    flexShrink: 1,
  },
  giftRequestDetails: {
    color: '#ccc',
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  giftRequestActions: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'flex-end',
    alignSelf: 'stretch',
  },
  superActionContainer: {
    marginTop: 12,
    alignSelf: 'flex-start',
  },
  superActionButton: {
    backgroundColor: '#FF4444',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#FF4444',
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
}); 