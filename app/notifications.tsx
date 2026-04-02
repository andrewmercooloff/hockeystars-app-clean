import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useState, useMemo } from 'react';
import {
    Alert,
    FlatList, 
    ImageBackground,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Swipeable from 'react-native-gesture-handler/Swipeable';
// Убираем все анимации переходов
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
import PuckSpeedChangedNotification from '../components/PuckSpeedChangedNotification';
import PhysicalDataChangedNotification from '../components/PhysicalDataChangedNotification';
import FriendAcceptedNotification from '../components/FriendAcceptedNotification';
import FriendGiftReceivedNotification from '../components/FriendGiftReceivedNotification';
import ScoutReportNotification from '../components/ScoutReportNotification';
import GameFirstPlaceNotification from '../components/GameFirstPlaceNotification';
import LikeNotification from '../components/LikeNotification';
import UserReportNotification from '../components/UserReportNotification';
import CachedAvatar from '../components/CachedAvatar';
import {
    acceptFriendRequest,
    declineFriendRequest,
    getReceivedFriendRequests,
    loadNotifications,
    markNotificationAsRead
} from '../utils/playerStorage';
import { supabase } from '../utils/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotificationContext } from '../contexts/NotificationContext';
import { useScreenContext } from '../contexts/ScreenContext';
import { useUser } from '../contexts/UserContext';
import OptimizedBackground from '../components/OptimizedBackground';
import { preloadPlayerAvatars } from '../utils/AvatarCache';
import CachedBackground from '../components/CachedBackground';
import AsyncStorage from '@react-native-async-storage/async-storage';

const iceBg = require('../assets/images/led.jpg');

const notificationsListStorageKey = (playerId: string) =>
  `hs_notifications_list_v1_${playerId}`;

// Мемоизированный компонент для элемента уведомления
const NotificationItem = React.memo(({ notification, index, isNew, onPress, onSuperAction, onDelete, currentUserId }: {
  notification: NotificationItem;
  index: number;
  isNew: boolean;
  onPress: (notification: NotificationItem) => void;
  onSuperAction: (notification: NotificationItem) => void;
  onDelete: (notificationId: string) => void;
  currentUserId?: string;
}) => {
  const { t } = useLanguage();
  const swipeableRef = React.useRef<any>(null);
  const isSwipingRef = React.useRef(false);
  const lastSwipeTimeRef = React.useRef(0);
  
  // Обработчик нажатия, который предотвращает навигацию если был свайп
  const handlePress = React.useCallback(() => {
    // Предотвращаем нажатие, если недавно был свайп (в течение 300ms)
    const timeSinceSwipe = Date.now() - lastSwipeTimeRef.current;
    if (isSwipingRef.current || timeSinceSwipe < 300) {
      console.log('⏭️ Предотвращен переход при свайпе уведомления');
      return;
    }
    onPress(notification);
  }, [notification, onPress]);
  
  // Обработчик свайпа для удаления
  const handleSwipeOpen = React.useCallback(() => {
    lastSwipeTimeRef.current = Date.now();
    isSwipingRef.current = true;
    onDelete(notification.id);
    // Сбрасываем флаг после небольшой задержки
    setTimeout(() => {
      isSwipingRef.current = false;
    }, 500);
  }, [notification.id, onDelete]);
  
  // Обработчик начала свайпа
  const handleSwipeStart = React.useCallback(() => {
    isSwipingRef.current = true;
    lastSwipeTimeRef.current = Date.now();
  }, []);
  
  // Обработчик отмены свайпа
  const handleSwipeClose = React.useCallback(() => {
    // Сбрасываем флаг с небольшой задержкой
    setTimeout(() => {
      isSwipingRef.current = false;
    }, 100);
  }, []);

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
      case 'scout_report':
        return 'document-text';
      case 'game_first_place':
        return 'trophy';
      case 'system':
        return 'information-circle';
      default:
        return 'notifications';
    }
  };

  const formatTime = (timestamp: number | string) => {
    let date: Date;
    
    if (typeof timestamp === 'string') {
      date = new Date(timestamp);
    } else {
      date = new Date(timestamp);
    }
    
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

  const renderRightActions = () => {
    return (
      <View style={styles.deleteButton}>
        <Ionicons name="trash-outline" size={32} color="#fa2f40" />
      </View>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      key={notification.id}
      renderRightActions={renderRightActions}
      onSwipeableWillOpen={handleSwipeStart}
      onSwipeableOpen={handleSwipeOpen}
      onSwipeableClose={handleSwipeClose}
      overshootRight={false}
      friction={2}
      rightThreshold={40}
      enableTrackpadTwoFingerGesture={true}
      containerStyle={{ backgroundColor: 'transparent' }}
    >
      <AnimatedNotification key={notification.id} index={index} isNew={isNew}>
        {(notification.type === 'stats_change' || notification.type === 'normative_changed') && notification.data && notification.data.changes ? (
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <StatsChangeNotification
              changes={notification.data.changes}
              playerName={notification.data.changedPlayerName || 'Игрок'}
              playerId={notification.data.changedPlayerId}
              playerAvatar={notification.data.changedPlayerAvatar}
              timestamp={notification.timestamp}
            />
          </TouchableOpacity>
        ) : notification.type === 'photo_added' ? (
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <PhotoAddedNotification
              playerName={notification.data.changedPlayerName || 'Игрок'}
              playerId={notification.data.changedPlayerId}
              photosCount={notification.data.addedPhotosCount || 1}
              timestamp={notification.data.timestamp || new Date(notification.timestamp).toISOString()}
              playerAvatar={notification.data.changedPlayerAvatar || notification.data.playerAvatar}
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
              const confirmedBy = notification.data?.confirmedBy || notification.data?.friend1Id;
              
              if (confirmedBy) {
                const updatedNotification = {
                  ...notification,
                  data: {
                    ...notification.data,
                    confirmedBy: confirmedBy
                  }
                };
                onPress(updatedNotification);
              }
            }}
          />
        ) : notification.type === 'exercise_completed' ? (
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ExerciseNotification
              playerName={notification.data.playerName || 'Игрок'}
              playerId={notification.data.playerId}
              playerAvatar={notification.data.changedPlayerAvatar || notification.data.playerAvatar}
              exerciseId={notification.data.exerciseId || 'unknown'}
              timestamp={notification.data.timestamp || new Date(notification.timestamp).toISOString()}
            />
          </TouchableOpacity>
        ) : notification.type === 'gift_received' ? (
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <GiftReceivedNotification
              playerName={notification.data.playerName || 'Игрок'}
              starName={notification.data.starName || 'Звезда'}
              giftName={notification.data.giftName || 'Подарок'}
              giftType={notification.data.giftType || 'gift'}
              timestamp={notification.data.timestamp || new Date(notification.timestamp).toISOString()}
              playerId={notification.data.playerId}
              playerAvatar={notification.data.playerAvatar}
            />
          </TouchableOpacity>
        ) : notification.type === 'friend_gift_received' ? (
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FriendGiftReceivedNotification
              notification={{
                id: notification.id,
                title: notification.title,
                message: notification.message,
                createdAt: new Date(notification.timestamp).toISOString(),
                data: {
                  playerId: notification.data?.playerId || '',
                  playerName: notification.data?.playerName || 'Игрок',
                  playerAvatar: notification.data?.playerAvatar || undefined,
                  starId: notification.data?.starId || undefined,
                  starName: notification.data?.starName || 'Звезда',
                  starAvatar: notification.data?.starAvatar || undefined,
                  giftName: notification.data?.giftName || 'Подарок',
                }
              }}
              isRead={notification.isRead}
              onPress={handlePress}
            />
          </TouchableOpacity>
        ) : notification.type === 'friend_request' ? (
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FriendRequestNotification
              playerName={notification.playerName || notification.data?.sender_name || notification.data?.playerName || 'Игрок'}
              playerId={notification.playerId || notification.data?.sender_id || notification.data?.playerId}
              timestamp={notification.timestamp}
              playerAvatar={notification.playerAvatar || notification.data?.sender_avatar || notification.data?.playerAvatar}
            />
          </TouchableOpacity>
        ) : notification.type === 'friend_accepted' ? (
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <FriendAcceptedNotification
              playerName={notification.data?.acceptor_name || 'Игрок'}
              playerId={notification.data?.acceptor_id}
              message={notification.message}
              timestamp={notification.timestamp}
              playerAvatar={notification.data?.acceptor_avatar}
            />
          </TouchableOpacity>
        ) : notification.type === 'gift_accepted' ? (
          <GiftAcceptedNotification
            starName={notification.data?.from_star || t('notifications.star')}
            starId={notification.data?.star_id}
            starAvatar={notification.data?.star_avatar}
            itemTypeName={getItemTypeName(notification.data?.item_type || 'gift')}
            message={notification.message}
            formattedTime={formatTime(notification.timestamp)}
            acknowledgeButtonText={t('common.super')}
            onAcknowledge={() => onSuperAction(notification)}
          />
        ) : notification.type === 'video_added' ? (
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <VideoAddedNotification
              playerName={notification.data.changedPlayerName || 'Игрок'}
              playerId={notification.data.changedPlayerId}
              videosCount={notification.data.addedVideosCount || 1}
              timestamp={notification.data.timestamp || new Date(notification.timestamp).toISOString()}
              playerAvatar={notification.data.changedPlayerAvatar || notification.data.playerAvatar}
            />
          </TouchableOpacity>
        ) : notification.type === 'avatar_changed' ? (
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AvatarChangedNotification
              playerName={notification.data.changedPlayerName || 'Игрок'}
              playerId={notification.data.changedPlayerId}
              playerAvatar={notification.data.changedPlayerAvatar || notification.data.playerAvatar}
              timestamp={notification.data.timestamp || new Date(notification.timestamp).toISOString()}
            />
          </TouchableOpacity>
        ) : notification.type === 'achievement_added' ? (
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <AchievementAddedNotification
              playerName={notification.data.changedPlayerName || 'Игрок'}
              playerId={notification.data.changedPlayerId}
              achievementsCount={notification.data.addedAchievementsCount || 1}
              timestamp={notification.data.timestamp || new Date(notification.timestamp).toISOString()}
              playerAvatar={notification.data.changedPlayerAvatar || notification.data.playerAvatar}
            />
          </TouchableOpacity>
        ) : notification.type === 'physical_data_changed' ? (
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <PhysicalDataChangedNotification
              playerName={notification.data.changedPlayerName || 'Игрок'}
              playerId={notification.data.changedPlayerId}
              playerAvatar={notification.data.changedPlayerAvatar || notification.data.playerAvatar}
              changes={notification.data.changes || []}
              timestamp={notification.data.timestamp || new Date(notification.timestamp).toISOString()}
            />
          </TouchableOpacity>
        ) : notification.type === 'puck_speed_changed' ? (
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <PuckSpeedChangedNotification
              playerName={notification.data.changedPlayerName || 'Игрок'}
              playerId={notification.data.changedPlayerId}
              playerAvatar={notification.data.changedPlayerAvatar || notification.data.playerAvatar}
              newMaxSpeed={notification.data.newMaxSpeed || 0}
              timestamp={notification.data.timestamp || new Date(notification.timestamp).toISOString()}
            />
          </TouchableOpacity>
        ) : notification.type === 'scout_report' ? (
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ScoutReportNotification
              playerName={notification.data.changedPlayerName || notification.message?.split(' ')[0] || 'Игрок'}
              playerId={notification.data.changedPlayerId}
              playerAvatar={notification.data.changedPlayerAvatar}
              message={notification.message || ''}
              timestamp={typeof notification.timestamp === 'string' ? new Date(notification.timestamp).getTime() : (notification.timestamp || Date.now())}
            />
          </TouchableOpacity>
        ) : notification.type === 'game_first_place' ? (
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <GameFirstPlaceNotification
              playerName={notification.data.changedPlayerName || notification.message?.split(' ')[0] || 'Игрок'}
              playerId={notification.data.changedPlayerId}
              playerAvatar={notification.data.changedPlayerAvatar}
              message={notification.message || ''}
              timestamp={typeof notification.timestamp === 'string' ? new Date(notification.timestamp).getTime() : (notification.timestamp || Date.now())}
            />
          </TouchableOpacity>
        ) : notification.type === 'video_liked' || notification.type === 'photo_liked' ? (
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <LikeNotification
              likedByName={notification.data?.likedByName || notification.data?.likedByUserName || 'Игрок'}
              likedByAvatar={notification.data?.likedByAvatar}
              likedById={notification.data?.likedByUserId || notification.data?.likedByUser || ''}
              contentType={notification.type === 'video_liked' ? 'video' : 'photo'}
              timestamp={notification.timestamp || notification.created_at || Date.now()}
            />
          </TouchableOpacity>
        ) : notification.type === 'user_report' ? (
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <UserReportNotification
              reporterName={notification.data?.reporterName || notification.playerName || 'Игрок'}
              reporterId={notification.data?.reporterId}
              reporterAvatar={notification.data?.reporterAvatar || notification.playerAvatar}
              reportedName={notification.data?.reportedName || 'Игрок'}
              reportedId={notification.data?.reportedId}
              reportedAvatar={notification.data?.reportedAvatar}
              timestamp={notification.timestamp}
            />
          </TouchableOpacity>
        ) : notification.type === 'gift_request' ? (
          <TouchableOpacity
            onPress={handlePress}
            activeOpacity={0.7}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <GiftRequestNotification
              requesterName={notification.playerName || notification.data?.requesterName || 'Игрок'}
              requesterId={notification.playerId || notification.data?.requesterId}
              requesterAvatar={notification.playerAvatar || notification.data?.requesterAvatar}
              requestMessage={notification.data?.requestMessage}
              timestamp={notification.timestamp || notification.created_at || Date.now()}
            />
          </TouchableOpacity>
        ) : (
        <TouchableOpacity
          key={notification.id}
          onPress={handlePress}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <View style={styles.notificationGradientShadow}>
            <BlurView
              intensity={20}
              tint="dark"
              style={styles.notificationItemBlur}
            >
              <View style={styles.notificationItem}>
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
                <CachedAvatar
                  playerId={notification.playerId || ''}
                  fallbackAvatarUrl={undefined} // Не используем старый аватар из уведомления
                  size={32}
                  style={styles.playerAvatar}
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
                  onPress={() => onSuperAction(notification)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.superActionButtonText}>Супер!</Text>
                </TouchableOpacity>
              </View>
            )}
            </View>
            </View>
            </BlurView>
          </View>
        </TouchableOpacity>
        )}
      </AnimatedNotification>
    </Swipeable>
  );
});

NotificationItem.displayName = 'NotificationItem';

// Компонент с анимацией для уведомлений (только для новых)
// Убрали анимацию уведомлений для улучшения производительности
const AnimatedNotification = ({ children }: { children: React.ReactNode; index: number; isNew: boolean }) => {
  return <View>{children}</View>;
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
  type: 'friend_request' | 'friend_accepted' | 'autograph_request' | 'stick_request' | 'gift_request' | 'gift_accepted' | 'system' | 'achievement' | 'team_invite' | 'stats_change' | 'photo_added' | 'new_friendship' | 'exercise_completed' | 'gift_received' | 'friend_gift_received' | 'video_added' | 'avatar_changed' | 'achievement_added' | 'physical_data_changed' | 'puck_speed_changed';
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

/** Кеш списка на время сессии JS — без задержки при повторном заходе (аналогично сообщениям с уже загруженными чатами). */
type NotificationsListSessionCache = {
  userId: string;
  notifications: NotificationItem[];
  friendRequests: FriendRequestItem[];
  giftRequests: GiftRequestItem[];
};

let notificationsListSessionCache: NotificationsListSessionCache | null = null;

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { updateNotificationCount } = useNotificationContext();
  const { setCurrentScreen } = useScreenContext();
  const { currentUser, isUserLoading, setCurrentUser } = useUser();
  
  // Убираем все анимации - простое мгновенное переключение
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequestItem[]>([]);
  const [giftRequests, setGiftRequests] = useState<GiftRequestItem[]>([]);
  /** Пока false — не показываем пустой экран до завершения первой загрузки для currentUser.id */
  const [listReady, setListReady] = useState(false);
  const [isScreenFocused, setIsScreenFocused] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  // Состояние для отслеживания новых уведомлений (для анимации)
  const [newNotificationIds, setNewNotificationIds] = useState<Set<string>>(new Set());

  /** Первый заход на экран для данного userId — isInitialLoad; повторный фокус — обновление с анимацией новых */
  const notificationsInitialLoadDoneForUserRef = React.useRef<string | null>(null);
  /** Актуальные размеры списков без лишних deps у useFocusEffect (иначе повторные запросы при каждом обновлении). */
  const listCountsRef = React.useRef({ n: 0, f: 0, g: 0 });
  listCountsRef.current = {
    n: notifications.length,
    f: friendRequests.length,
    g: giftRequests.length,
  };

  /** Смена пользователя / новый заход: отменяет устаревшие ответы диска и сети. */
  const notificationsScreenEpochRef = React.useRef(0);
  /** Успешная запись списка из сети за текущий epoch — отменяет отложенный hydrate с диска. */
  const networkWroteListRef = React.useRef(false);

  useLayoutEffect(() => {
    const id = currentUser?.id;
    if (!id) {
      notificationsScreenEpochRef.current += 1;
      networkWroteListRef.current = false;
      notificationsInitialLoadDoneForUserRef.current = null;
      notificationsListSessionCache = null;
      setListReady(false);
      setNotifications([]);
      setFriendRequests([]);
      setGiftRequests([]);
      return;
    }

    if (
      notificationsListSessionCache &&
      notificationsListSessionCache.userId === id
    ) {
      setNotifications(notificationsListSessionCache.notifications);
      setFriendRequests(notificationsListSessionCache.friendRequests);
      setGiftRequests(notificationsListSessionCache.giftRequests);
      setListReady(true);
      setNewNotificationIds(new Set());
      notificationsInitialLoadDoneForUserRef.current = id;
      return;
    }

    notificationsScreenEpochRef.current += 1;
    const epoch = notificationsScreenEpochRef.current;
    networkWroteListRef.current = false;
    notificationsInitialLoadDoneForUserRef.current = null;
    setListReady(false);
    setNotifications([]);
    setFriendRequests([]);
    setGiftRequests([]);

    let cancelled = false;
    void AsyncStorage.getItem(notificationsListStorageKey(id))
      .then(raw => {
        if (cancelled) return;
        if (notificationsScreenEpochRef.current !== epoch) return;
        if (networkWroteListRef.current) return;
        if (!raw) return;
        try {
          const parsed = JSON.parse(raw) as NotificationsListSessionCache;
          if (parsed.userId !== id) return;
          if (notificationsScreenEpochRef.current !== epoch) return;
          if (networkWroteListRef.current) return;
          const nList = parsed.notifications || [];
          const frList = parsed.friendRequests || [];
          const grList = parsed.giftRequests || [];
          setNotifications(nList.map(x => ({ ...x })));
          setFriendRequests(frList.map(x => ({ ...x })));
          setGiftRequests(grList.map(x => ({ ...x })));
          setListReady(true);
          setNewNotificationIds(new Set());
          notificationsInitialLoadDoneForUserRef.current = id;
          notificationsListSessionCache = {
            userId: id,
            notifications: nList.map(x => ({ ...x })),
            friendRequests: frList.map(x => ({ ...x })),
            giftRequests: grList.map(x => ({ ...x })),
          };
        } catch {
          /* ignore corrupt cache */
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    const id = currentUser?.id;
    if (!id) {
      notificationsListSessionCache = null;
      return;
    }
    if (!listReady) return;
    const snap = {
      userId: id,
      notifications: notifications.map(n => ({ ...n })),
      friendRequests: friendRequests.map(r => ({ ...r })),
      giftRequests: giftRequests.map(g => ({ ...g })),
    };
    notificationsListSessionCache = snap;
    void AsyncStorage.setItem(notificationsListStorageKey(id), JSON.stringify(snap)).catch(
      () => {}
    );
  }, [currentUser?.id, listReady, notifications, friendRequests, giftRequests]);

  // Категории фильтров и типы уведомлений, которые в них входят
  const FILTER_TYPES: Record<string, string[]> = {
    all: [],
    friends: ['friend_request', 'friend_accepted', 'new_friendship'],
    video: ['video_added', 'video_liked'],
    photo: ['photo_added', 'photo_liked', 'avatar_changed'],
    gifts: ['gift_received', 'friend_gift_received', 'gift_accepted', 'gift_request', 'autograph_request', 'stick_request'],
    stats: ['stats_change', 'normative_changed', 'physical_data_changed', 'puck_speed_changed', 'achievement_added', 'achievement', 'scout_report'],
    exercises: ['exercise_completed', 'game_first_place'],
  };

  const FILTER_ICONS: Record<string, string> = {
    all: 'apps-outline',
    friends: 'people-outline',
    video: 'play-circle-outline',
    photo: 'camera-outline',
    gifts: 'gift-outline',
    stats: 'bar-chart-outline',
    exercises: 'barbell-outline',
  };

  // Мемоизируем список уведомлений для предотвращения ненужных перерендеров
  const memoizedNotifications = React.useMemo(() => {
    if (activeFilter === 'all') return notifications;
    const allowed = FILTER_TYPES[activeFilter] || [];
    return notifications.filter(n => allowed.includes(n.type));
  }, [notifications, activeFilter]);
  const memoizedFriendRequests = React.useMemo(() => friendRequests, [friendRequests]);
  const memoizedGiftRequests = React.useMemo(() => giftRequests, [giftRequests]);

  // Функция загрузки уведомлений (определяем здесь для использования в useEffect)
  const loadNotificationsData = useCallback(async (isInitialLoad = false) => {
    if (!currentUser) return;
    const loadEpoch = notificationsScreenEpochRef.current;
    try {
      // Загружаем все уведомления из хранилища
      const storedNotifications = await loadNotifications(currentUser.id);
      
      // Фильтруем уведомления, которые относятся к текущему пользователю (поддерживаем обе структуры)
      const userNotifications = storedNotifications.filter(notification => {
        // Уведомления о запросах дружбы показываем только если они предназначены для этого пользователя
        // Проверяем user_id (для уведомлений из БД) или receiver_id/receiverId (для совместимости)
        if (notification.type === 'friend_request') {
          return notification.user_id === currentUser.id || 
                 notification.receiver_id === currentUser.id || 
                 notification.receiverId === currentUser.id;
        }
        
        // Уведомления о запросах на подарки показываем только если они предназначены для этого пользователя (звезды)
        if (notification.type === 'gift_request') {
          return notification.user_id === currentUser.id || 
                 notification.receiver_id === currentUser.id || 
                 notification.receiverId === currentUser.id;
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
            notification.type === 'normative_changed' ||
            notification.type === 'photo_added' ||
            notification.type === 'new_friendship' ||
            notification.type === 'exercise_completed' ||
            notification.type === 'gift_received' ||
            notification.type === 'friend_gift_received' ||
            notification.type === 'video_added' ||
            notification.type === 'avatar_changed' ||
            notification.type === 'achievement_added' ||
            notification.type === 'physical_data_changed' ||
            notification.type === 'puck_speed_changed' ||
            notification.type === 'video_liked' ||
            notification.type === 'photo_liked' ||
            notification.type === 'user_report' ||
            notification.type === 'scout_report' ||
            notification.type === 'game_first_place') {
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
          // Для gift_request используем requesterId из data, для остальных - стандартную логику
          playerId: notification.type === 'gift_request' 
            ? (notification.data?.requesterId || notification.data?.playerId || notification.player_id || notification.playerId)
            : (notification.data?.sender_id || notification.data?.playerId || notification.player_id || notification.playerId),
          playerName: notification.type === 'gift_request'
            ? (notification.data?.requesterName || notification.data?.playerName || notification.player_name || notification.playerName)
            : (notification.data?.sender_name || notification.data?.playerName || notification.player_name || notification.playerName),
          playerAvatar: notification.type === 'gift_request'
            ? (notification.data?.requesterAvatar || notification.data?.playerAvatar || notification.player_avatar || notification.playerAvatar)
            : (notification.data?.sender_avatar || notification.data?.playerAvatar || notification.player_avatar || notification.playerAvatar),
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
      
      const limitedNotifications = userNotifications;
      
      // Если это первая загрузка, помечаем все уведомления как "старые" (без анимации)
      if (isInitialLoad) {
        setNewNotificationIds(new Set());
      } else {
        // При обновлении определяем новые уведомления
        const currentIds = new Set([
          ...notifications.map(n => n.id),
          ...friendRequests.map(r => r.id),
          ...giftRequests.map(g => g.id)
        ]);
        
        const newIds = new Set([
          ...limitedNotifications.map(n => n.id),
          ...friendRequestItems.map(r => r.id),
          ...giftRequestItems.map(g => g.id)
        ].filter(id => !currentIds.has(id)));
        
        setNewNotificationIds(newIds);
        
        // Через 1 секунду убираем анимацию с новых уведомлений
        setTimeout(() => {
          setNewNotificationIds(new Set());
        }, 1000);
      }

      if (notificationsScreenEpochRef.current !== loadEpoch) {
        return;
      }
      networkWroteListRef.current = true;
      setNotifications(limitedNotifications);
      setFriendRequests(friendRequestItems);
      // giftRequestItems загружаются асинхронно выше
      
      // НЕ предзагружаем аватары из уведомлений - они могут быть устаревшими
      // Аватары загрузятся из кеша или через Realtime при отображении
      // Это предотвращает перезапись актуальных аватаров старыми из уведомлений
      
      // const allPlayers = [
      //   ...userNotifications.map(n => ({ id: n.playerId, avatar: n.playerAvatar })),
      //   ...friendRequestItems.map(r => ({ id: r.playerId, avatar: r.playerAvatar })),
      //   ...giftRequestItems.map(g => ({ id: g.playerId, avatar: g.playerAvatar }))
      // ].filter(p => p.id && p.avatar);
      // 
      // if (allPlayers.length > 0) {
      //   // Предзагружаем аватары в фоне, не блокируя UI
      //   preloadPlayerAvatars(allPlayers).catch(error => {
      //     console.log('Предзагрузка аватаров завершена с ошибками:', error);
      //   });
      // }
      
    } catch (error) {
      // Тихая обработка сетевых ошибок (отсутствие интернета)
      const isNetworkError = (error as any)?.message?.includes('Network request failed') || 
                             (error as any)?.message?.includes('network') ||
                             (error as any)?.code === 'NETWORK_ERROR';
      
      if (!isNetworkError) {
        // Логируем только не-сетевые ошибки
      console.error('❌ Ошибка загрузки уведомлений:', error);
      }
      // Не показываем Alert при ошибке, чтобы не мешать работе с кешированными данными
    } finally {
      if (notificationsScreenEpochRef.current === loadEpoch) {
        setListReady(true);
      }
    }
  }, [currentUser, t]);

  // Загрузка списка только при фокусе экрана (без дубля mount + focus — один запрос при открытии)
  useFocusEffect(
    useCallback(() => {
      setCurrentScreen('notifications');
      setIsScreenFocused(true);
      
      if (currentUser && !isUserLoading) {
        const { n, f, g } = listCountsRef.current;
        const hasCachedLists = n > 0 || f > 0 || g > 0;
        const isInitial =
          notificationsInitialLoadDoneForUserRef.current !== currentUser.id;
        if (isInitial) {
          notificationsInitialLoadDoneForUserRef.current = currentUser.id;
        }
        // Уже есть данные (кеш сессии) — обновляем в фоне без пустого «Загрузка»
        void loadNotificationsData(hasCachedLists ? false : isInitial);
      }
      
      return () => {
        setIsScreenFocused(false);
        setCurrentScreen(null);
      };
    }, [currentUser, isUserLoading, loadNotificationsData, setCurrentScreen])
  );

  // Автоматически отмечаем все уведомления как прочитанные через 3 секунды ТОЛЬКО когда экран в фокусе
  useEffect(() => {
    if (isScreenFocused && currentUser && (notifications.length > 0 || friendRequests.length > 0)) {
      const timer = setTimeout(async () => {
        await markAllNotificationsAsRead();
        // Обновляем счетчик уведомлений через контекст
        // Это обновит unreadNotificationsCount (который теперь включает friend_request)
        await updateNotificationCount(currentUser);
        console.log('📊 Уведомления помечены как прочитанные после 3 секунд просмотра');
      }, 3000);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [isScreenFocused, currentUser, notifications.length, friendRequests.length, updateNotificationCount]);

  // Realtime подписки настроены в главном layout через realtimeManager
  // Загрузка данных происходит через useFocusEffect

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
      // ИСПРАВЛЕНО: friend_request теперь ВКЛЮЧАЕТСЯ в список для пометки как прочитанные
      // Это позволяет индикатору badge исчезнуть после просмотра уведомлений
      // friend_request уведомления всё равно показываются в UI как pending запросы
      const nonActionableNotifications = notificationIds.filter(notification => {
        const type = notification.type;
        // friend_request уведомления теперь помечаются как прочитанные, но всё равно показываются
        return !(type === 'gift_accepted' || 
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
      // ИСПРАВЛЕНО: friend_request теперь помечается как прочитанное (для badge)
      setNotifications(prev => prev.map(n => {
        const type = n.type;
        const isActionable = type === 'gift_accepted' || 
                           type === 'achievement' ||
                           type === 'team_invite';
        
        // Отмечаем как прочитанные все кроме gift_accepted, achievement, team_invite
        // friend_request теперь тоже помечается как прочитанное
        return isActionable ? n : { ...n, isRead: true };
      }));
      
      // Обновляем счетчик уведомлений в таблице players
      if (currentUser) {
        try {
          // Подсчитываем количество непрочитанных уведомлений (exclude actionable)
          // ИСПРАВЛЕНО: friend_request теперь ВКЛЮЧАЕТСЯ в счетчик, чтобы badge исчезал после просмотра
          // Исключаем только типы уведомлений, которые не должны учитываться в счетчике
          const { count } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false)
            .not('type', 'in', '(gift_accepted,achievement,team_invite,new_friendship)');
          
          const newCount = count || 0;
          
          // Обновляем счетчик в БД
          await supabase
            .from('players')
            .update({ 
              unread_notifications_count: newCount,
              notifications: JSON.stringify({
                unread_count: newCount,
                last_updated: new Date().toISOString()
              })
            })
            .eq('id', currentUser.id);
          
          console.log('✅ Счетчик уведомлений обновлен:', newCount);
        } catch (counterError) {
          console.error('❌ Ошибка обновления счетчика:', counterError);
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
      const notification = notifications.find(n => n.id === notificationId);
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      
      // Затем удаляем из базы данных и обновляем счетчик
      setTimeout(async () => {
        const { error } = await supabase
          .from('notifications')
          .delete()
          .eq('id', notificationId);

        if (error) {
          console.error('Ошибка удаления уведомления:', error);
        }
        
        // Обновляем счетчик, если уведомление не было прочитано
        if (notification && !notification.isRead && currentUser) {
          // Подсчитываем количество оставшихся непрочитанных уведомлений
          const { count } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false)
            .not('type', 'in', '(gift_accepted,friend_request,achievement,team_invite)');
          
          const newCount = count || 0;
          
          await supabase
            .from('players')
            .update({ 
              unread_notifications_count: newCount,
              notifications: JSON.stringify({
                unread_count: newCount,
                last_updated: new Date().toISOString()
              })
            })
            .eq('id', currentUser.id);
        }
      }, 300); // Задержка для плавной анимации
    } catch (error) {
      console.error('Ошибка удаления уведомления:', error);
    }
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
        // Подсчитываем количество непрочитанных actionable уведомлений
        const { count: remainingCount } = await supabase
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', currentUser.id)
          .eq('is_read', false)
          .in('type', ['gift_accepted', 'friend_request', 'achievement', 'team_invite']);
        
        const finalCount = remainingCount || 0;
        
        // Обновляем счетчик в таблице players
        await supabase
          .from('players')
          .update({ 
            unread_notifications_count: finalCount,
            notifications: JSON.stringify({
              unread_count: finalCount,
              last_updated: new Date().toISOString()
            })
          })
          .eq('id', currentUser.id);
        
        console.log('✅ Счетчик уведомлений обновлен после удаления всех уведомлений:', finalCount);
        
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
      // Исключение: friend_request - для него нужно обрабатывать навигацию
      if (notification.isActionable && notification.type !== 'friend_request') {
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
      
      // Обработка нажатия на уведомление с правильными deep links
      if (notification.type === 'friend_request') {
        // Для запросов в друзья показываем профиль игрока БЕЗ автоматической прокрутки
        // (кнопки дружбы видны сверху профиля)
        const senderId = notification.playerId || notification.data?.sender_id || notification.data?.playerId;
        if (senderId) {
          console.log('🔗 Навигация к профилю отправителя запроса дружбы:', senderId);
          router.push({
            pathname: `/player/${senderId}`,
            params: { returnTo: 'notifications' }
          });
        } else {
          console.warn('⚠️ Не удалось определить ID отправителя запроса дружбы');
        }
      } else if (notification.type === 'friend_accepted') {
        // Для уведомлений о принятом запросе показываем профиль игрока, который принял
        if (notification.data && notification.data.acceptor_id) {
          router.push({
            pathname: `/player/${notification.data.acceptor_id}`,
            params: { returnTo: 'notifications' }
          });
        }
      } else if (notification.type === 'autograph_request' || notification.type === 'stick_request') {
        // Для запросов автографов и клюшек показываем профиль игрока
        if (notification.playerId) {
          router.push({
  pathname: `/player/${notification.playerId}`,
  params: { returnTo: 'notifications' }
});
        }
      } else if (notification.type === 'gift_accepted') {
        // Для уведомлений о принятых подарках переходим в музей
        if (currentUser) {
          router.push({
            pathname: `/player/${currentUser.id}`,
            params: { returnTo: 'notifications', scrollToMuseum: 'true' }
          });
        }
      } else if (notification.type === 'stats_change') {
        if (notification.data && notification.data.changedPlayerId) {
          router.push({
            pathname: `/player/${notification.data.changedPlayerId}`,
            params: { returnTo: 'notifications', scrollToStats: 'true' }
          });
        }
      } else if (notification.type === 'normative_changed') {
        if (notification.data && notification.data.changedPlayerId) {
          router.push({
            pathname: `/player/${notification.data.changedPlayerId}`,
            params: { returnTo: 'notifications', scrollToNormatives: 'true' }
          });
        }
      } else if (notification.type === 'scout_report') {
        if (notification.data && notification.data.changedPlayerId) {
          router.push({
            pathname: `/player/${notification.data.changedPlayerId}`,
            params: { returnTo: 'notifications', scrollToAnalysis: 'true' }
          });
        }
      } else if (notification.type === 'game_first_place') {
        router.push({ pathname: '/', params: { openGameResults: 'true' } });
      } else if (notification.type === 'photo_added') {
        // Для уведомлений о добавленных фото показываем фото игрока
        if (notification.data && notification.data.changedPlayerId) {
          router.push({
            pathname: `/player/${notification.data.changedPlayerId}`,
            params: { returnTo: 'notifications', scrollToPhotos: 'true' }
          });
        }
      } else if (notification.type === 'new_friendship') {
        // Профиль того, кто подтвердил дружбу — прокрутка к блоку «Друзья»
        if (notification.data && notification.data.confirmedBy) {
          router.push({
            pathname: `/player/${notification.data.confirmedBy}`,
            params: { returnTo: 'notifications', scrollToFriends: 'true' }
          });
        }
      } else if (notification.type === 'gift_received') {
        // Для уведомлений о полученных подарках переходим в музей того, кто получил подарок
        if (notification.data && notification.data.playerId) {
          router.push({
            pathname: `/player/${notification.data.playerId}`,
            params: { returnTo: 'notifications', scrollToMuseum: 'true' }
          });
        } else if (currentUser) {
          // Fallback на текущего пользователя, если playerId не найден
          router.push({
            pathname: `/player/${currentUser.id}`,
            params: { returnTo: 'notifications', scrollToMuseum: 'true' }
          });
        }
      } else if (notification.type === 'friend_gift_received') {
        // Для уведомлений о подарках, полученных друзьями, переходим в музей игрока
        if (notification.data && notification.data.playerId) {
          router.push({
            pathname: `/player/${notification.data.playerId}`,
            params: { returnTo: 'notifications', scrollToMuseum: 'true' }
          });
        }
      } else if (notification.type === 'video_added') {
        // Для уведомлений о добавленных видео показываем видео игрока
        if (notification.data && notification.data.changedPlayerId) {
          router.push({
            pathname: `/player/${notification.data.changedPlayerId}`,
            params: { returnTo: 'notifications', scrollToVideos: 'true' }
          });
        }
      } else if (notification.type === 'avatar_changed') {
        if (notification.data && notification.data.changedPlayerId) {
          router.push({
            pathname: `/player/${notification.data.changedPlayerId}`,
            params: { returnTo: 'notifications' },
          });
        }
      } else if (notification.type === 'achievement_added') {
        // Для уведомлений о новых достижениях показываем достижения игрока
        if (notification.data && notification.data.changedPlayerId) {
          router.push({
            pathname: `/player/${notification.data.changedPlayerId}`,
            params: { returnTo: 'notifications', scrollToAchievements: 'true' }
          });
        }
      } else if (notification.type === 'physical_data_changed') {
        // Для уведомлений об изменении роста/веса показываем статистику игрока
        if (notification.data && notification.data.changedPlayerId) {
          router.push({
            pathname: `/player/${notification.data.changedPlayerId}`,
            params: { returnTo: 'notifications', scrollToStats: 'true' }
          });
        }
      } else if (notification.type === 'puck_speed_changed') {
        // Для уведомлений об обновлении скорости шайбы показываем профиль игрока и скроллим к разделу скорости
        if (notification.data && notification.data.changedPlayerId) {
          router.push({
            pathname: `/player/${notification.data.changedPlayerId}`,
            params: { returnTo: 'notifications', scrollToSpeed: 'true' }
          });
        }
      } else if (notification.type === 'exercise_completed') {
        // Для уведомлений о выполненных упражнениях переходим в профиль игрока в раздел упражнений
        const playerId = notification.data?.playerId || notification.playerId;
        if (playerId) {
          console.log('🔗 Навигация к профилю игрока с выполненным упражнением:', playerId);
          router.push({
            pathname: `/player/${playerId}`,
            params: { returnTo: 'notifications', scrollToExercises: 'true' }
          });
        } else {
          console.warn('⚠️ Не удалось определить ID игрока для уведомления о выполненном упражнении');
        }
      } else if (notification.type === 'achievement') {
        // Для уведомлений о достижениях показываем достижения
        if (notification.data && notification.data.changedPlayerId) {
          router.push({
            pathname: `/player/${notification.data.changedPlayerId}`,
            params: { returnTo: 'notifications', scrollToAchievements: 'true' }
          });
        }
      } else if (notification.type === 'team_invite') {
        // Для уведомлений о приглашениях в команду показываем команды
        router.push('/teams');
      } else if (notification.type === 'video_liked') {
        // Для уведомлений о лайках видео переходим на профиль владельца контента с прокруткой к видео
        if (notification.data && notification.data.playerId) {
          router.push({
            pathname: `/player/${notification.data.playerId}`,
            params: { returnTo: 'notifications', scrollToVideos: 'true' }
          });
        } else if (currentUser) {
          // Fallback на текущего пользователя, если playerId не найден
          router.push(`/player/${currentUser.id}?scrollToVideos=true`);
        }
      } else if (notification.type === 'photo_liked') {
        // Для уведомлений о лайках фото переходим на профиль владельца контента с прокруткой к фото
        if (notification.data && notification.data.playerId) {
          router.push({
            pathname: `/player/${notification.data.playerId}`,
            params: { returnTo: 'notifications', scrollToPhotos: 'true' }
          });
        } else if (currentUser) {
          // Fallback на текущего пользователя, если playerId не найден
          router.push(`/player/${currentUser.id}?scrollToPhotos=true`);
        }
      } else if (notification.type === 'user_report') {
        // Для уведомлений о жалобах переходим на профиль пользователя, на которого пожаловались
        if (notification.data && notification.data.reportedId) {
          router.push({
            pathname: `/player/${notification.data.reportedId}`,
            params: { returnTo: 'notifications' }
          });
        }
      } else if (notification.type === 'gift_request') {
        // Для уведомлений о запросе подарка переходим на профиль игрока для отправки подарка
        if (notification.data && notification.data.requesterId) {
          router.push({
            pathname: `/player/${notification.data.requesterId}`,
            params: { returnTo: 'notifications', scrollToGift: 'true' }
          });
        }
      } else if (notification.type === 'system') {
        // Для системных уведомлений остаемся в разделе уведомлений
        // Ничего не делаем, пользователь уже в разделе уведомлений
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
        
        // Переходим в соответствующий раздел в зависимости от типа уведомления
        if (notification.type === 'gift_accepted') {
          router.push({
            pathname: `/player/${currentUser.id}`,
            params: { returnTo: 'notifications', scrollToMuseum: 'true' }
          });
        } else if (notification.type === 'gift_received') {
          // Переходим на профиль игрока с прокруткой к разделу подарков (музей)
          if (notification.data && notification.data.playerId) {
            router.push({
            pathname: `/player/${notification.data.playerId}`,
            params: { returnTo: 'notifications', scrollToMuseum: 'true' }
          });
          } else if (currentUser) {
            router.push({
            pathname: `/player/${currentUser.id}`,
            params: { returnTo: 'notifications', scrollToMuseum: 'true' }
          });
          }
        } else if (notification.type === 'friend_request') {
          // Для запросов в друзья показываем профиль игрока БЕЗ автоматической прокрутки
          // (кнопки дружбы видны сверху профиля)
          const senderId = notification.playerId || notification.data?.sender_id || notification.data?.playerId;
          if (senderId) {
            console.log('🔗 Навигация к профилю отправителя запроса дружбы:', senderId);
            router.push({
            pathname: `/player/${senderId}`,
            params: { returnTo: 'notifications' }
          });
          }
        } else if (notification.type === 'friend_gift_received') {
          // Переходим на профиль друга с прокруткой к разделу подарков (музей)
          if (notification.data && notification.data.playerId) {
            router.push({
            pathname: `/player/${notification.data.playerId}`,
            params: { returnTo: 'notifications', scrollToMuseum: 'true' }
          });
          } else if (notification.playerId) {
            router.push(`/player/${notification.playerId}?scrollToMuseum=true`);
          }
        } else if (notification.type === 'achievement') {
          if (notification.data && notification.data.changedPlayerId) {
            router.push({
            pathname: `/player/${notification.data.changedPlayerId}`,
            params: { returnTo: 'notifications', scrollToAchievements: 'true' }
          });
          }
        } else if (notification.type === 'team_invite') {
          router.push('/teams');
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
        
        // Переходим в соответствующий раздел в зависимости от типа уведомления
        if (notification.type === 'gift_accepted') {
          router.push({
            pathname: `/player/${currentUser.id}`,
            params: { returnTo: 'notifications', scrollToMuseum: 'true' }
          });
        } else if (notification.type === 'gift_received') {
          // Переходим на профиль игрока с прокруткой к разделу подарков (музей)
          if (notification.data && notification.data.playerId) {
            router.push({
            pathname: `/player/${notification.data.playerId}`,
            params: { returnTo: 'notifications', scrollToMuseum: 'true' }
          });
          } else if (currentUser) {
            router.push({
            pathname: `/player/${currentUser.id}`,
            params: { returnTo: 'notifications', scrollToMuseum: 'true' }
          });
          }
        } else if (notification.type === 'friend_request') {
          // Для запросов в друзья показываем профиль игрока БЕЗ автоматической прокрутки
          // (кнопки дружбы видны сверху профиля)
          const senderId = notification.playerId || notification.data?.sender_id || notification.data?.playerId;
          if (senderId) {
            console.log('🔗 Навигация к профилю отправителя запроса дружбы:', senderId);
            router.push({
            pathname: `/player/${senderId}`,
            params: { returnTo: 'notifications' }
          });
          }
        } else if (notification.type === 'friend_gift_received') {
          // Переходим на профиль друга с прокруткой к разделу подарков (музей)
          if (notification.data && notification.data.playerId) {
            router.push({
            pathname: `/player/${notification.data.playerId}`,
            params: { returnTo: 'notifications', scrollToMuseum: 'true' }
          });
          } else if (notification.playerId) {
            router.push(`/player/${notification.playerId}?scrollToMuseum=true`);
          }
        } else if (notification.type === 'achievement') {
          if (notification.data && notification.data.changedPlayerId) {
            router.push({
            pathname: `/player/${notification.data.changedPlayerId}`,
            params: { returnTo: 'notifications', scrollToAchievements: 'true' }
          });
          }
        } else if (notification.type === 'team_invite') {
          router.push('/teams');
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

      // Удаляем уведомление из базы данных
      await supabase
        .from('notifications')
        .delete()
        .eq('id', request.id);

      // Счётчик обновится автоматически через Realtime подписку в _layout.tsx

      // Удаляем из списка запросов
      setFriendRequests(prev => prev.filter(req => req.id !== request.id));

      // Удаляем из списка уведомлений, если оно там есть
      setNotifications(prev => prev.filter(n => n.id !== request.id));
      
    } catch (error) {
      console.error('Ошибка обработки запроса в друзья:', error);
      Alert.alert('Ошибка', 'Не удалось обработать запрос в друзья');
    }
  };

  const handleGiftRequest = async (request: GiftRequestItem, action: 'accept' | 'decline') => {
    try {
      // При нажатии на запрос подарка переходим на профиль игрока с прокруткой к кнопке подарка
      router.push(`/player/${request.playerId}?scrollToGift=true`);
        
      // Удаляем уведомление из списка после перехода
        setGiftRequests(prev => prev.filter(req => req.id !== request.id));
    } catch (error) {
      console.error('❌ Ошибка обработки запроса на подарок:', error);
      Alert.alert('Ошибка', 'Не удалось обработать запрос');
    }
  };



  // Редирект убран - проверка авторизации происходит в _layout.tsx

  // Если пользователь не авторизован, показываем loading
  if (currentUser === null) {
    return (
      <CachedBackground 
        source={iceBg} 
        style={styles.container}
        resizeMode="cover"
      >
        <View style={styles.loadingCenter}>
          <Text style={styles.loadingText}>{t('common.loading')}</Text>
        </View>
      </CachedBackground>
    );
  }

  // Загрузка только пока неизвестен пользователь контекста; список подгружается в фоне — как остальные разделы
  if (isUserLoading || currentUser === undefined) {
    return (
      <View style={styles.container}>
        <CachedBackground 
          source={iceBg} 
          style={styles.background} 
          resizeMode="cover"
        >
          <View style={styles.overlay}>
            <View style={styles.pageHeader}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.pageTitle}>{t('notifications.title')}</Text>
            </View>
            <View style={styles.loadingCenter}>
              <Text style={styles.loadingText}>{t('common.loading')}</Text>
            </View>
          </View>
        </CachedBackground>
      </View>
    );
  }


  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View 
        style={styles.container}
      >
        <CachedBackground source={iceBg} style={styles.background} resizeMode="cover">
        <View style={styles.overlay}>
          {/* Фиксированная шапка: заголовок + фильтры */}
          <View style={styles.stickyHeader}>
            <View style={styles.pageHeader}>
              <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.pageTitle}>{t('notifications.title')}</Text>
              <TouchableOpacity onPress={handleClearAllNotifications} style={styles.clearAllButton}>
                <Ionicons name="trash-outline" size={24} color="#fa2f40" />
              </TouchableOpacity>
            </View>
            <View style={styles.filterBar}>
              {Object.keys(FILTER_ICONS).map((key) => {
                const isActive = activeFilter === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.filterBtn, isActive && styles.filterBtnActive]}
                    onPress={() => setActiveFilter(key)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={FILTER_ICONS[key] as any}
                      size={20}
                      color={isActive ? '#ffffff' : '#888'}
                    />
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Список уведомлений */}
          <FlatList 
            data={memoizedNotifications}
            renderItem={({ item, index }) => (
              <NotificationItem
                key={item.id}
                notification={item}
                index={index}
                isNew={newNotificationIds.has(item.id)}
                onPress={handleNotificationPress}
                onSuperAction={handleSuperAction}
                onDelete={handleDeleteNotification}
                currentUserId={currentUser?.id}
              />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.notificationsContent}
            removeClippedSubviews={true}
            decelerationRate="fast"
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={10}
            updateCellsBatchingPeriod={50}
            ListEmptyComponent={
              !listReady
                ? () => (
                    <View style={[styles.emptyContainer, styles.listLoadingInline]}>
                      <Text style={styles.loadingText}>{t('common.loading')}</Text>
                    </View>
                  )
                : () => (
                    <View style={styles.emptyContainer}>
                      <View style={styles.emptyGradientShadow}>
                        <View style={styles.emptyContent}>
                          <Ionicons name="notifications-outline" size={64} color="#fa2f40" />
                          <Text style={styles.emptyTitle}>{t('notifications.noNotifications')}</Text>
                        </View>
                      </View>
                    </View>
                  )
            }
          />
        </View>
      </CachedBackground>
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#87A3B1',
  },
  background: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 0, 0, 0.2)',
  },
  overlayLoading: {
    flex: 1,
    backgroundColor: 'rgba(135, 163, 177, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingCenter: {
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
    backgroundColor: 'rgba(1, 0, 0, 0.5)',
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
    paddingTop: 96,
    paddingBottom: 8,
  },
  stickyHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  pageHeader: {
    backgroundColor: 'rgba(1, 0, 0, 0.75)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(1, 0, 0, 0.85)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  filterBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBtnActive: {
    backgroundColor: '#fa2f40',
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
  listLoadingInline: {
    paddingVertical: 80,
    minHeight: 200,
  },
  emptyContent: {
    borderRadius: 15,
    padding: 20, // Точно такой же padding как в сообщениях
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
    marginHorizontal: 16, // Такая же ширина как у элементов чатов
    backgroundColor: 'rgba(1, 0, 0, 0.8)',
  },
  emptyGradientShadow: {
    borderRadius: 15,
    shadowColor: 'rgb(1,0,0)',
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
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
  notificationItemBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
    minHeight: 80,
    backgroundColor: 'rgba(1, 0, 0, 0.75)',
  },
  notificationGradientShadow: {
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 20,
    shadowColor: 'rgb(1,0,0)',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
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
    backgroundColor: 'rgba(1, 0, 0, 0.5)',
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
    backgroundColor: 'rgba(1, 0, 0, 0.75)',
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
    shadowColor: 'rgb(1,0,0)',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 8,
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
    shadowColor: 'rgb(1,0,0)',
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
    shadowColor: 'rgb(1,0,0)',
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
    shadowColor: 'rgb(1,0,0)',
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
