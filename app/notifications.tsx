import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useLayoutEffect, useState, useMemo } from 'react';
import {
    ActivityIndicator,
    FlatList,
    type FlatList as FlatListType,
    ImageBackground,
    ListRenderItemInfo,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import LoadingCenter from '../components/LoadingCenter';
import { useAppAlert } from '../hooks/useAppAlert';
import { colors } from '../theme/colors';
import { Ionicons } from '@expo/vector-icons';
import { BlurOrSolid } from '../components/BlurOrSolid';
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
import { sortVideoUrlsNewestFirst } from '../utils/videoUrls';
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
import { registerTabScrollHandler } from '../utils/tabScrollRegistry';
import {
    acceptFriendRequest,
    clearPlayerMemoryCache,
    dedupeDuplicateNotifications,
    declineFriendRequest,
    getReceivedFriendRequests,
    loadNotifications,
    markNotificationAsRead,
    syncUnreadNotificationsCountInDb,
} from '../utils/playerStorage';
import { supabase } from '../utils/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotificationContext } from '../contexts/NotificationContext';
import { useScreenContext } from '../contexts/ScreenContext';
import { useUser } from '../contexts/UserContext';
import OptimizedBackground from '../components/OptimizedBackground';
import { preloadPlayerAvatars, updateAvatarGlobally } from '../utils/AvatarCache';
import CachedBackground from '../components/CachedBackground';
import { platformCardShadow } from '../utils/androidShadow';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  extendNotificationsBadgeSuppressMs,
  setNotificationsScreenFocused,
} from '../utils/notificationsBadgeGate';

const iceBg = require('../assets/images/led.jpg');

const notificationsListStorageKey = (playerId: string) =>
  `hs_notifications_list_v1_${playerId}`;

const NOTIFICATIONS_PAGE_SIZE = 10;

// Мемоизированный компонент для элемента уведомления
const NotificationItem = React.memo(({ notification, index, isNew, onPress, onSuperAction, currentUserId, onVideoScrubActiveChange }: {
  notification: NotificationItem;
  index: number;
  isNew: boolean;
  onPress: (notification: NotificationItem) => void;
  onSuperAction: (notification: NotificationItem) => void;
  currentUserId?: string;
  onVideoScrubActiveChange?: (active: boolean) => void;
}) => {
  const { t } = useLanguage();

  const handlePress = React.useCallback(() => {
    onPress(notification);
  }, [notification, onPress]);

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
      case 'quiz_first_place':
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

  return (
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
            <PhotoAddedNotification
              playerName={notification.data.changedPlayerName || 'Игрок'}
              playerId={notification.data.changedPlayerId}
              photosCount={notification.data.addedPhotosCount || 1}
              timestamp={notification.data.timestamp || new Date(notification.timestamp).toISOString()}
              playerAvatar={notification.data.changedPlayerAvatar || notification.data.playerAvatar}
              photoUrls={notification.data.photoUrls || []}
              onHeaderPress={handlePress}
            />
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
            <VideoAddedNotification
              playerName={notification.data.changedPlayerName || 'Игрок'}
              playerId={notification.data.changedPlayerId}
              videosCount={notification.data.addedVideosCount || 1}
              timestamp={notification.data.timestamp || new Date(notification.timestamp).toISOString()}
              playerAvatar={notification.data.changedPlayerAvatar || notification.data.playerAvatar}
              videoUrls={sortVideoUrlsNewestFirst(notification.data.videoUrls || [])}
              onHeaderPress={handlePress}
              onScrubActiveChange={onVideoScrubActiveChange}
            />
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
              newAvatarUrl={notification.data.changedPlayerAvatar || notification.data.playerAvatar}
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
        ) : notification.type === 'game_first_place' || notification.type === 'quiz_first_place' ? (
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
              variant={notification.type === 'quiz_first_place' ? 'quiz' : 'game'}
              prizeAmount={notification.data?.prizeAmount}
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
            <BlurOrSolid
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
            </BlurOrSolid>
          </View>
        </TouchableOpacity>
        )}
      </AnimatedNotification>
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
  activeFilter?: string;
};

let notificationsListSessionCache: NotificationsListSessionCache | null = null;

export default function NotificationsScreen() {
  const router = useRouter();
  const { t } = useLanguage();
  const { updateNotificationCount, setUnreadNotificationsBadge } = useNotificationContext();
  const { setCurrentScreen } = useScreenContext();
  const { currentUser, isUserLoading, setCurrentUser } = useUser();
  const { showAlert, showConfirm, AlertHost } = useAppAlert();
  
  // Убираем все анимации - простое мгновенное переключение
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequestItem[]>([]);
  const [giftRequests, setGiftRequests] = useState<GiftRequestItem[]>([]);
  /** Пока false — не показываем пустой экран до завершения первой загрузки для currentUser.id */
  const [listReady, setListReady] = useState(false);
  const [listScrollEnabled, setListScrollEnabled] = useState(true);
  const videoScrubLockRef = React.useRef(0);
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
  const notificationsRef = React.useRef(notifications);
  const friendRequestsRef = React.useRef(friendRequests);
  const giftRequestsRef = React.useRef(giftRequests);
  notificationsRef.current = notifications;
  friendRequestsRef.current = friendRequests;
  giftRequestsRef.current = giftRequests;
  const listRef = React.useRef<FlatListType<NotificationItem>>(null);
  const hasUserScrolledListRef = React.useRef(false);
  const endReachedLockedRef = React.useRef(false);
  const pageLoadInFlightRef = React.useRef(false);

  /** Смена пользователя / новый заход: отменяет устаревшие ответы диска и сети. */
  const notificationsScreenEpochRef = React.useRef(0);
  const markAllNotificationsAsReadRef = React.useRef<(() => Promise<void>) | null>(null);
  /** Успешная запись списка из сети за текущий epoch — отменяет отложенный hydrate с диска. */
  const networkWroteListRef = React.useRef(false);
  const reloadDebounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationsDbOffsetRef = React.useRef(0);
  const [hasMoreNotifications, setHasMoreNotifications] = React.useState(true);
  const hasMoreNotificationsRef = React.useRef(true);
  hasMoreNotificationsRef.current = hasMoreNotifications;
  const [loadingMoreNotifications, setLoadingMoreNotifications] = React.useState(false);
  const [filterBackfilling, setFilterBackfilling] = React.useState(false);
  const filterBackfillTokenRef = React.useRef(0);
  /** Фильтры, для которых уже догружали страницы в этой сессии — не повторять при возврате на экран. */
  const filterBackfillDoneRef = React.useRef<Set<string>>(new Set());
  const activeFilterRef = React.useRef(activeFilter);
  activeFilterRef.current = activeFilter;

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
      notificationsDbOffsetRef.current = 0;
      setHasMoreNotifications(true);
      return;
    }

    if (
      notificationsListSessionCache &&
      notificationsListSessionCache.userId === id
    ) {
      const cachedList = notificationsListSessionCache.notifications;
      setNotifications(cachedList);
      setFriendRequests(notificationsListSessionCache.friendRequests);
      setGiftRequests(notificationsListSessionCache.giftRequests);
      notificationsDbOffsetRef.current = cachedList.length;
      setHasMoreNotifications(cachedList.length >= NOTIFICATIONS_PAGE_SIZE);
      if (notificationsListSessionCache.activeFilter) {
        setActiveFilter(notificationsListSessionCache.activeFilter);
      }
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
    notificationsDbOffsetRef.current = 0;
    setHasMoreNotifications(true);

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
          const hydrated = nList.map(x => ({ ...x }));
          setNotifications(hydrated);
          setFriendRequests(frList.map(x => ({ ...x })));
          setGiftRequests(grList.map(x => ({ ...x })));
          notificationsDbOffsetRef.current = hydrated.length;
          setHasMoreNotifications(hydrated.length >= NOTIFICATIONS_PAGE_SIZE);
          if (parsed.activeFilter) {
            setActiveFilter(parsed.activeFilter);
          }
          setListReady(true);
          setNewNotificationIds(new Set());
          notificationsInitialLoadDoneForUserRef.current = id;
          notificationsListSessionCache = {
            userId: id,
            notifications: nList.map(x => ({ ...x })),
            friendRequests: frList.map(x => ({ ...x })),
            giftRequests: grList.map(x => ({ ...x })),
            activeFilter: parsed.activeFilter,
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
      activeFilter: activeFilterRef.current,
    };
    notificationsListSessionCache = snap;
    void AsyncStorage.setItem(notificationsListStorageKey(id), JSON.stringify(snap)).catch(
      () => {}
    );
  }, [currentUser?.id, listReady, notifications, friendRequests, giftRequests, activeFilter]);

  // Категории фильтров и типы уведомлений, которые в них входят
  // UX: "медиа" (видео+фото) вторым после "все", как основной сценарий просмотра.
  const FILTER_TYPES: Record<string, string[]> = {
    all: [],
    media: ['video_added', 'video_liked', 'photo_added', 'photo_liked', 'avatar_changed'],
    friends: ['friend_request', 'friend_accepted', 'new_friendship'],
    gifts: ['gift_received', 'friend_gift_received', 'gift_accepted', 'gift_request', 'autograph_request', 'stick_request'],
    stats: ['stats_change', 'normative_changed', 'physical_data_changed', 'puck_speed_changed', 'achievement_added', 'achievement', 'scout_report'],
    exercises: ['exercise_completed', 'game_first_place', 'quiz_first_place'],
  };

  const FILTER_ICONS: Record<string, string> = {
    all: 'apps-outline',
    media: 'play-circle-outline',
    friends: 'people-outline',
    gifts: 'gift-outline',
    stats: 'bar-chart-outline',
    exercises: 'barbell-outline',
  };

  const countNotificationsForFilter = useCallback(
    (filter: string, list = notificationsRef.current) => {
      if (filter === 'all') return list.length;
      const allowed = FILTER_TYPES[filter] || [];
      return list.filter((n) => allowed.includes(n.type)).length;
    },
    [],
  );

  // Мемоизируем список уведомлений для предотвращения ненужных перерендеров
  const memoizedNotifications = React.useMemo(() => {
    if (activeFilter === 'all') return notifications;
    const allowed = FILTER_TYPES[activeFilter] || [];
    return notifications.filter(n => allowed.includes(n.type));
  }, [notifications, activeFilter]);
  const memoizedFriendRequests = React.useMemo(() => friendRequests, [friendRequests]);
  const memoizedGiftRequests = React.useMemo(() => giftRequests, [giftRequests]);

  const processNotificationsPage = useCallback((storedNotifications: any[]): NotificationItem[] => {
    if (!currentUser) return [];
    const mappedNotifications = storedNotifications.filter(notification => {
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
            notification.type === 'game_first_place' ||
            notification.type === 'quiz_first_place') {
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

    const userNotifications = dedupeDuplicateNotifications(mappedNotifications);
    userNotifications.sort((a, b) => b.timestamp - a.timestamp);
    return userNotifications;
  }, [currentUser]);

  // Функция загрузки уведомлений (определяем здесь для использования в useEffect)
  const loadNotificationsData = useCallback(async (
    isInitialLoad = false,
    silent = false,
    append = false,
  ): Promise<number> => {
    if (!currentUser) return 0;
    if (append && pageLoadInFlightRef.current) return 0;
    if (append) pageLoadInFlightRef.current = true;
    const loadEpoch = notificationsScreenEpochRef.current;
    let appendedCount = 0;
    try {
      const offset = append ? notificationsDbOffsetRef.current : 0;
      const storedNotifications = await loadNotifications(currentUser.id, {
        limit: NOTIFICATIONS_PAGE_SIZE,
        offset,
        updateCache: offset === 0,
      });
      const pageNotifications = processNotificationsPage(storedNotifications);
      const fetchedCount = storedNotifications.length;
      const nextOffset = offset + fetchedCount;

      if (append) {
        if (notificationsScreenEpochRef.current !== loadEpoch) return 0;
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const fresh = pageNotifications.filter((n) => !existingIds.has(n.id));
          if (fresh.length === 0) return prev;
          appendedCount = fresh.length;
          const next = [...prev, ...fresh];
          notificationsRef.current = next;
          return next;
        });
        notificationsDbOffsetRef.current = nextOffset;
        const hasMore = fetchedCount === NOTIFICATIONS_PAGE_SIZE;
        hasMoreNotificationsRef.current = hasMore;
        setHasMoreNotifications(hasMore);
        return appendedCount;
      }

      if (silent) {
        if (notificationsScreenEpochRef.current !== loadEpoch) return 0;
        networkWroteListRef.current = true;
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const fresh = pageNotifications.filter((n) => !existingIds.has(n.id));
          if (fresh.length === 0) return prev;
          const merged = dedupeDuplicateNotifications([...fresh, ...prev]);
          merged.sort((a, b) => b.timestamp - a.timestamp);
          return merged;
        });
        return 0;
      }

      notificationsDbOffsetRef.current = nextOffset;
      const hasMore = fetchedCount === NOTIFICATIONS_PAGE_SIZE;
      hasMoreNotificationsRef.current = hasMore;
      setHasMoreNotifications(hasMore);

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
      
      // Если это первая загрузка, помечаем все уведомления как "старые" (без анимации)
      if (isInitialLoad) {
        setNewNotificationIds(new Set());
      } else {
        const currentIds = new Set([
          ...notificationsRef.current.map(n => n.id),
          ...friendRequestsRef.current.map(r => r.id),
          ...giftRequestsRef.current.map(g => g.id)
        ]);
        
        const newIds = new Set([
          ...pageNotifications.map(n => n.id),
          ...friendRequestItems.map(r => r.id),
          ...giftRequestItems.map(g => g.id)
        ].filter(id => !currentIds.has(id)));
        
        setNewNotificationIds(newIds);
        
        setTimeout(() => {
          setNewNotificationIds(new Set());
        }, 1000);
      }

      if (notificationsScreenEpochRef.current !== loadEpoch) {
        return 0;
      }
      networkWroteListRef.current = true;
      setNotifications(pageNotifications);
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
      if (append) pageLoadInFlightRef.current = false;
      if (notificationsScreenEpochRef.current === loadEpoch) {
        setListReady(true);
      }
    }
    return appendedCount;
  }, [currentUser, t, processNotificationsPage]);

  const appendNotificationPagesBatch = useCallback(
    async (maxPages: number, isCancelled?: () => boolean): Promise<number> => {
      if (!currentUser || maxPages <= 0) return 0;
      if (pageLoadInFlightRef.current) return 0;
      pageLoadInFlightRef.current = true;
      const loadEpoch = notificationsScreenEpochRef.current;
      const collected: NotificationItem[] = [];
      let pagesLoaded = 0;

      try {
        while (pagesLoaded < maxPages) {
          if (isCancelled?.()) break;
          if (notificationsScreenEpochRef.current !== loadEpoch) break;
          if (!hasMoreNotificationsRef.current && pagesLoaded > 0) break;

          const offset = notificationsDbOffsetRef.current;
          const storedNotifications = await loadNotifications(currentUser.id, {
            limit: NOTIFICATIONS_PAGE_SIZE,
            offset,
            updateCache: false,
          });
          const pageNotifications = processNotificationsPage(storedNotifications);
          const fetchedCount = storedNotifications.length;
          notificationsDbOffsetRef.current = offset + fetchedCount;
          const hasMore = fetchedCount === NOTIFICATIONS_PAGE_SIZE;
          hasMoreNotificationsRef.current = hasMore;
          setHasMoreNotifications(hasMore);

          collected.push(...pageNotifications);
          pagesLoaded += 1;
          if (!hasMore) break;
        }

        if (notificationsScreenEpochRef.current !== loadEpoch || collected.length === 0) {
          return 0;
        }

        let appendedCount = 0;
        setNotifications((prev) => {
          const existingIds = new Set(prev.map((n) => n.id));
          const fresh = collected.filter((n) => !existingIds.has(n.id));
          if (fresh.length === 0) return prev;
          appendedCount = fresh.length;
          const next = [...prev, ...fresh];
          notificationsRef.current = next;
          return next;
        });
        return appendedCount;
      } finally {
        pageLoadInFlightRef.current = false;
      }
    },
    [currentUser, processNotificationsPage],
  );

  const ensureFilteredNotificationsLoaded = useCallback(
    async (
      filter: string,
      targetCount = NOTIFICATIONS_PAGE_SIZE,
      isCancelled?: () => boolean,
    ) => {
      if (filter === 'all' || !currentUser) return;
      let idleRounds = 0;
      while (idleRounds < 3) {
        if (isCancelled?.()) return;
        if (countNotificationsForFilter(filter) >= targetCount) break;
        if (!hasMoreNotificationsRef.current) break;

        const added = await appendNotificationPagesBatch(5, isCancelled);
        if (isCancelled?.()) return;
        if (added === 0) {
          idleRounds += 1;
          if (!hasMoreNotificationsRef.current) break;
        } else {
          idleRounds = 0;
        }
      }
    },
    [currentUser, countNotificationsForFilter, appendNotificationPagesBatch],
  );

  const loadMoreNotifications = useCallback(async () => {
    if (loadingMoreNotifications || !hasMoreNotifications || !currentUser || !listReady) return;
    setLoadingMoreNotifications(true);
    try {
      const filter = activeFilterRef.current;
      if (filter === 'all') {
        await appendNotificationPagesBatch(1);
        return;
      }

      const beforeCount = countNotificationsForFilter(filter);
      let attempts = 0;
      while (attempts < 4) {
        await appendNotificationPagesBatch(3);
        attempts += 1;
        if (countNotificationsForFilter(filter) > beforeCount) break;
        if (!hasMoreNotificationsRef.current) break;
      }
    } finally {
      setLoadingMoreNotifications(false);
    }
  }, [
    loadingMoreNotifications,
    hasMoreNotifications,
    currentUser,
    listReady,
    appendNotificationPagesBatch,
    countNotificationsForFilter,
  ]);

  const handleNotificationsEndReached = useCallback(() => {
    if (!hasUserScrolledListRef.current || endReachedLockedRef.current) return;
    endReachedLockedRef.current = true;
    void loadMoreNotifications();
  }, [loadMoreNotifications]);

  // При смене фильтра догружаем страницы одним батчем, без повторных перезапусков
  useEffect(() => {
    if (activeFilter === 'all' || !listReady) {
      setFilterBackfilling(false);
      return;
    }

    const filteredCount = countNotificationsForFilter(activeFilter);
    if (
      filteredCount >= NOTIFICATIONS_PAGE_SIZE ||
      !hasMoreNotificationsRef.current ||
      filterBackfillDoneRef.current.has(activeFilter)
    ) {
      setFilterBackfilling(false);
      return;
    }

    const token = ++filterBackfillTokenRef.current;
    setFilterBackfilling(true);

    void (async () => {
      try {
        await ensureFilteredNotificationsLoaded(
          activeFilter,
          NOTIFICATIONS_PAGE_SIZE,
          () => token !== filterBackfillTokenRef.current,
        );
      } finally {
        if (token === filterBackfillTokenRef.current) {
          setFilterBackfilling(false);
          filterBackfillDoneRef.current.add(activeFilter);
        }
      }
    })();

    return () => {
      filterBackfillTokenRef.current += 1;
    };
  }, [activeFilter, listReady, ensureFilteredNotificationsLoaded, countNotificationsForFilter]);

  useFocusEffect(
    useCallback(() => {
      registerTabScrollHandler('notifications', () => {
        listRef.current?.scrollToOffset({ offset: 0, animated: true });
      });
      return () => registerTabScrollHandler('notifications', null);
    }, []),
  );

  // Загрузка списка + сброс бейджа после нескольких секунд на экране
  useFocusEffect(
    useCallback(() => {
      setCurrentScreen('notifications');
      setNotificationsScreenFocused(true);
      setUnreadNotificationsBadge(0);

      let cancelled = false;
      let markReadDone = false;
      let markReadTimer: ReturnType<typeof setTimeout> | null = null;

      if (currentUser && !isUserLoading) {
        const { n, f, g } = listCountsRef.current;
        const hasCachedLists = n > 0 || f > 0 || g > 0;
        const isFirstLoadForUser =
          notificationsInitialLoadDoneForUserRef.current !== currentUser.id;
        if (isFirstLoadForUser) {
          notificationsInitialLoadDoneForUserRef.current = currentUser.id;
        }
        const needsInitialLoad = isFirstLoadForUser && !hasCachedLists;
        void loadNotificationsData(needsInitialLoad, !needsInitialLoad);
      }

      // Через ~2.5 с на экране помечаем прочитанным (бейдж уже погашен).
      markReadTimer = setTimeout(async () => {
        if (cancelled || !currentUser) return;
        extendNotificationsBadgeSuppressMs(6000);
        try {
          await markAllNotificationsAsReadRef.current?.();
          setUnreadNotificationsBadge(0);
          markReadDone = true;
        } catch {
          setUnreadNotificationsBadge(0);
        }
      }, 2500);

      return () => {
        cancelled = true;
        if (markReadTimer) clearTimeout(markReadTimer);
        setNotificationsScreenFocused(false);
        if (!markReadDone && currentUser) {
          void updateNotificationCount(currentUser);
        }
        setCurrentScreen(null);
      };
    }, [
      currentUser,
      isUserLoading,
      loadNotificationsData,
      setCurrentScreen,
      setUnreadNotificationsBadge,
      updateNotificationCount,
    ])
  );

  // Обновляем список сразу при новых уведомлениях (фото, аватар и т.д.), пока экран открыт
  useEffect(() => {
    if (!currentUser?.id) return;

    const channel = supabase
      .channel(`notifications-list-live-${currentUser.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${currentUser.id}`,
        },
        () => {
          if (reloadDebounceRef.current) {
            clearTimeout(reloadDebounceRef.current);
          }
          reloadDebounceRef.current = setTimeout(() => {
            // На фильтрованной вкладке не перезагружаем page 0 — это вызывает сортировку и мигание
            if (activeFilterRef.current !== 'all') return;
            void loadNotificationsData(false, true);
          }, 700);
        }
      )
      .subscribe();

    return () => {
      if (reloadDebounceRef.current) {
        clearTimeout(reloadDebounceRef.current);
        reloadDebounceRef.current = null;
      }
      void supabase.removeChannel(channel);
    };
  }, [currentUser?.id, loadNotificationsData]);

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
        return isActionable || n.isRead ? n : { ...n, isRead: true };
      }));
      
      // Обновляем счетчик уведомлений в таблице players
      if (currentUser) {
        try {
          const newCount = await syncUnreadNotificationsCountInDb(currentUser.id);
          console.log('✅ Счетчик уведомлений обновлен:', newCount);
        } catch (counterError) {
          console.error('❌ Ошибка обновления счетчика:', counterError);
        }
      }
      
    } catch (error) {
      console.error('❌ Ошибка в markAllNotificationsAsRead:', error);
    }
  };
  markAllNotificationsAsReadRef.current = markAllNotificationsAsRead;

  const handleClearAllNotifications = () => {
    if (!currentUser) return;
    showConfirm(
      t('common.deleteConfirm'),
      t('common.deleteAllNotificationsConfirm'),
      async () => {
        try {
          const { data: notificationIds, error: fetchError } = await supabase
            .from('notifications')
            .select('id')
            .eq('user_id', currentUser.id);

          if (fetchError) {
            console.error('❌ Ошибка получения ID уведомлений:', fetchError);
            showAlert(t('common.error'), 'Не удалось получить уведомления', 'error');
            return;
          }

          if (!notificationIds || notificationIds.length === 0) {
            setNotifications([]);
            setFriendRequests([]);
            setGiftRequests([]);
            showAlert(t('common.success'), 'Все уведомления очищены', 'success');
            return;
          }

          for (const notification of notificationIds) {
            try {
              const { error: deleteError } = await supabase
                .from('notifications')
                .delete()
                .eq('id', notification.id);
              if (deleteError) {
                console.error('❌ Ошибка удаления уведомления', notification.id, ':', deleteError);
              }
            } catch (individualError) {
              console.error('❌ Ошибка удаления уведомления', notification.id, ':', individualError);
            }
          }

          const { count: remainingCount } = await supabase
            .from('notifications')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', currentUser.id)
            .eq('is_read', false)
            .in('type', ['gift_accepted', 'friend_request', 'achievement', 'team_invite']);

          const finalCount = remainingCount || 0;

          await supabase
            .from('players')
            .update({
              unread_notifications_count: finalCount,
              notifications: JSON.stringify({
                unread_count: finalCount,
                last_updated: new Date().toISOString(),
              }),
            })
            .eq('id', currentUser.id);

          setNotifications([]);
          setFriendRequests([]);
          setGiftRequests([]);
          await loadNotificationsData();
        } catch (error) {
          console.error('❌ Ошибка очистки уведомлений:', error);
          showAlert(t('common.error'), 'Не удалось очистить уведомления', 'error');
        }
      },
      { confirmText: t('common.delete'), cancelText: t('common.cancel'), type: 'warning' },
    );
  };

  const handleNotificationPress = useCallback(async (notification: NotificationItem) => {
    
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
      } else if (notification.type === 'quiz_first_place') {
        router.push({ pathname: '/', params: { openQuizResults: 'true' } });
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
        const changedPlayerId = notification.data?.changedPlayerId;
        const changedPlayerAvatar = notification.data?.changedPlayerAvatar;
        if (changedPlayerId) {
          if (changedPlayerAvatar) {
            await updateAvatarGlobally(changedPlayerId, changedPlayerAvatar);
          }
          clearPlayerMemoryCache(changedPlayerId);
          router.push({
            pathname: `/player/${changedPlayerId}`,
            params: { returnTo: 'notifications', refreshProfile: 'true' },
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
  }, [currentUser, router]);

  const handleSuperAction = useCallback(async (notification: NotificationItem) => {
    try {
      if (!currentUser || !notification.id) {
        console.error('❌ Некорректные данные уведомления:', { currentUser: !!currentUser, notificationId: notification.id });
        showAlert(t('common.error'), 'Некорректные данные уведомления', 'error');
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
          showAlert(t('common.success'), 'Уведомление обработано!', 'success');
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
          showAlert(t('common.success'), 'Уведомление обработано!', 'success');
        }
      } else {
        // Если ничего не удалось, возвращаем уведомление обратно
        setNotifications(prev => [...prev, notification]);
        showAlert(t('common.error'), 'Не удалось обработать уведомление. Попробуйте еще раз.', 'error');
      }
      
    } catch (error) {
      console.error('❌ Ошибка обработки уведомления:', error);
      
      // В случае ошибки возвращаем уведомление обратно в список
      setNotifications(prev => [...prev, notification]);
      
      showAlert(t('common.error'), 'Не удалось обработать уведомление. Попробуйте еще раз.', 'error');
    }
  }, [currentUser, router, loadNotificationsData]);

  const notificationKeyExtractor = useCallback((item: NotificationItem) => item.id, []);

  const handleVideoScrubActiveChange = useCallback((active: boolean) => {
    videoScrubLockRef.current += active ? 1 : -1;
    if (videoScrubLockRef.current < 0) videoScrubLockRef.current = 0;
    setListScrollEnabled(videoScrubLockRef.current === 0);
  }, []);

  const renderNotificationItem = useCallback(
    ({ item, index }: ListRenderItemInfo<NotificationItem>) => (
      <NotificationItem
        notification={item}
        index={index}
        isNew={newNotificationIds.has(item.id)}
        onPress={handleNotificationPress}
        onSuperAction={handleSuperAction}
        currentUserId={currentUser?.id}
        onVideoScrubActiveChange={handleVideoScrubActiveChange}
      />
    ),
    [
      newNotificationIds,
      handleNotificationPress,
      handleSuperAction,
      currentUser?.id,
      handleVideoScrubActiveChange,
    ]
  );

  const notificationsListFooter = useMemo(() => {
    if (!loadingMoreNotifications && !filterBackfilling) return null;
    return (
      <View style={styles.listFooterLoader}>
        <ActivityIndicator size="small" color="#fa2f40" />
      </View>
    );
  }, [loadingMoreNotifications, filterBackfilling]);

  const notificationsListEmpty = useMemo(() => {
    const showInitialLoader =
      !listReady || (filterBackfilling && memoizedNotifications.length === 0);
    if (showInitialLoader) {
      return (
        <View style={[styles.emptyContainer, styles.listLoadingInline]}>
          <LoadingCenter />
        </View>
      );
    }
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyGradientShadow}>
          <View style={styles.emptyContent}>
            <Ionicons name="notifications-outline" size={64} color="#fa2f40" />
            <Text style={styles.emptyTitle}>{t('notifications.noNotifications')}</Text>
          </View>
        </View>
      </View>
    );
  }, [listReady, filterBackfilling, memoizedNotifications.length, t]);

  const handleFriendRequest = async (request: FriendRequestItem, action: 'accept' | 'decline') => {
    // ОПТИМИСТИЧНОЕ ОБНОВЛЕНИЕ: карточка исчезает сразу, сеть работает в фоне.
    // Раньше карточка «висела» до завершения всех запросов (на медленном интернете — секунды).
    setFriendRequests(prev => prev.filter(req => req.id !== request.id));
    setNotifications(prev => prev.filter(n => n.id !== request.id));

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
        showAlert(t('common.info'), 'Запрос дружбы был отменен отправителем', 'info');
        await loadNotificationsData();
        return;
      }
      
      let success: boolean;
      if (action === 'accept') {
        // receiverId - это тот, кто получает запрос (currentUser), playerId - отправитель
        // При принятии первый параметр - тот кто принимает (receiverId), второй - отправитель (playerId)
        success = await acceptFriendRequest(request.receiverId, request.playerId);
        if (success) showAlert(t('common.success'), t('notifications.friendRequestAccepted'), 'success');
      } else {
        success = await declineFriendRequest(request.receiverId, request.playerId);
        if (success) showAlert(t('common.success'), t('notifications.friendRequestDeclined'), 'success');
      }

      if (!success) {
        showAlert(t('common.error'), 'Не удалось обработать запрос в друзья', 'error');
        await loadNotificationsData(); // Возвращаем карточку, если действие не прошло
        return;
      }

      // Удаляем уведомление из базы данных
      await supabase
        .from('notifications')
        .delete()
        .eq('id', request.id);

      // Счётчик обновится автоматически через Realtime подписку в _layout.tsx
      
    } catch (error) {
      console.error('Ошибка обработки запроса в друзья:', error);
      showAlert(t('common.error'), 'Не удалось обработать запрос в друзья', 'error');
      await loadNotificationsData(); // Восстанавливаем актуальное состояние списка
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
      showAlert(t('common.error'), 'Не удалось обработать запрос', 'error');
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
        <LoadingCenter style={styles.loadingCenter} />
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
            <LoadingCenter style={styles.loadingCenter} />
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
            </View>
            <View style={styles.filterBar}>
              {Object.keys(FILTER_ICONS).map((key) => {
                const isActive = activeFilter === key;
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.filterBtn, isActive && styles.filterBtnActive]}
                    onPress={() => {
                      hasUserScrolledListRef.current = false;
                      endReachedLockedRef.current = false;
                      filterBackfillDoneRef.current.delete(key);
                      setActiveFilter(key);
                    }}
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
            ref={listRef}
            data={memoizedNotifications}
            renderItem={renderNotificationItem}
            keyExtractor={notificationKeyExtractor}
            scrollEnabled={listScrollEnabled}
            contentContainerStyle={styles.notificationsContent}
            removeClippedSubviews={false}
            decelerationRate="fast"
            initialNumToRender={8}
            maxToRenderPerBatch={6}
            windowSize={7}
            updateCellsBatchingPeriod={50}
            onScrollBeginDrag={() => {
              hasUserScrolledListRef.current = true;
            }}
            onMomentumScrollBegin={() => {
              endReachedLockedRef.current = false;
            }}
            onEndReached={handleNotificationsEndReached}
            onEndReachedThreshold={0.4}
            ListEmptyComponent={notificationsListEmpty}
            ListFooterComponent={notificationsListFooter}
          />
        </View>
        </CachedBackground>
      </View>
      <AlertHost />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.scene,
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
    ...platformCardShadow({
      shadowColor: 'rgb(1,0,0)',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.5,
      shadowRadius: 8,
      elevation: 8,
    }),
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
    ...platformCardShadow({
      shadowColor: 'rgb(1,0,0)',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 5,
      elevation: 8,
    }),
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
    ...platformCardShadow({
      shadowColor: 'rgb(1,0,0)',
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.4,
      shadowRadius: 5,
      elevation: 8,
    }),
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
    ...platformCardShadow({
      shadowColor: 'rgb(1,0,0)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    }),
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
    ...platformCardShadow({
      shadowColor: 'rgb(1,0,0)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    }),
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
    ...platformCardShadow({
      shadowColor: 'rgb(1,0,0)',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
    }),
  },
  superActionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    textAlign: 'center',
  },
  listFooterLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
});
