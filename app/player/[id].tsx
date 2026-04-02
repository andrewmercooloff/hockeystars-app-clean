import React, { forwardRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { useFocusEffect, useLocalSearchParams, useRouter, useSegments, usePathname } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { COUNTRIES } from '../../utils/constants';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useScreenContext } from '../../contexts/ScreenContext';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    ImageBackground,
    InteractionManager,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
    Modal,
    PanResponder,
    Platform,
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    ViewStyle
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurOrSolid } from '../../components/BlurOrSolid';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import Animated from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import AchievementsSection from '../../components/AchievementsSection';
import ActivityRating from '../../components/ActivityRating';
import CurrentTeamsSection from '../../components/CurrentTeamsSection';
import CustomAlert from '../../components/CustomAlert';
import { addActivityPoints } from '../../services/activityService';
import EditablePhotosSection from '../../components/EditablePhotosSection';
import SocialLinks from '../../components/SocialLinks';



import NormativesSection from '../../components/NormativesSection';
import PastTeamsSection from '../../components/PastTeamsSection';
import PlayerExercisesSection from '../../components/PlayerExercisesSection';
import PlayerMuseum from '../../components/PlayerMuseum';
import StarGiftModal from '../../components/StarGiftModal';
import AdminGiftModal from '../../components/AdminGiftModal';
import CachedAvatar from '../../components/CachedAvatar';
import CachedBackground from '../../components/CachedBackground';
import { useAvatarCache } from '../../utils/AvatarCache';
import AIAnalysisCard, { AIAnalysis } from '../../components/AIAnalysisCard';
import VideoCarousel from '../../components/VideoCarousel';
import VideoPlayer from '../../components/VideoPlayer';
import LikeButton from '../../components/LikeButton';
import { generateVideoContentId } from '../../utils/likesService';
import { acceptFriendRequest, Achievement, calculateHockeyExperience, cancelFriendRequest, clearPlayerCache, clearAllPlayersCache, declineFriendRequest, debugFriendship, deletePlayer, deletePuckSpeedRecord, getFriends, getFriendshipStatus, getPlayerById, getPlayerTeamsAsPastTeams, isGoalkeeperPosition, loadCurrentUser, logoutUser, notifyFriendsAboutAchievements, notifyFriendsAboutAvatarChange, notifyFriendsAboutChanges, notifyFriendsAboutPhysicalData, notifyFriendsAboutPhotos, notifyFriendsAboutVideos, notifyFriendsAboutScoutReport, PastTeam, Player, removeFriend, saveCurrentUser, sendFriendRequest, updatePlayer, blockUser, unblockUser, isUserBlocked } from '../../utils/playerStorage';
import { dataCache, CACHE_KEYS } from '../../utils/DataCache';
import { supabase } from '../../utils/supabase';
import { createPlayerManually } from '../../utils/playerStorage';
import ChangeIndicator from '../../components/ChangeIndicator';
import { useStatsChanges } from '../../hooks/useStatsChanges';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { useUser } from '../../contexts/UserContext';

const iceBg = require('../../assets/images/led.jpg');

// Build a referral-capable link:
// - If Branch deferred deep links are configured, use Branch long link.
// - Otherwise fall back to our website profile link (works only when app is already installed).
const buildInviteLink = (playerId: string) => {
  const branchDomain =
    (Constants.expoConfig as any)?.extra?.branchAppDomain ||
    (process.env.EXPO_PUBLIC_BRANCH_APP_DOMAIN as string | undefined) ||
    '';

  if (branchDomain) {
    const key = encodeURIComponent('$deeplink_path');
    const deepPath = encodeURIComponent(`player/${playerId}`);
    const inviterId = encodeURIComponent(playerId);
    return `https://${branchDomain}/?${key}=${deepPath}&inviterId=${inviterId}`;
  }

  return `https://hockey-stars.com/player/${playerId}`;
};

type SectionCardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  blurStyle?: StyleProp<ViewStyle>;
  wrapperStyle?: StyleProp<ViewStyle>;
};

const SectionCard = forwardRef<View, SectionCardProps>(({ children, style, blurStyle, wrapperStyle }, ref) => {
  // Не показываем секцию, если children пустой, null, false или 0
  if (children === null || children === undefined || children === false || children === 0) {
    return null;
  }
  
  // Проверяем, если children это массив
  if (Array.isArray(children)) {
    // Фильтруем пустые элементы (null, false, 0, undefined, пустые строки, строки, числа)
    const filteredChildren = children.filter(child => {
      // Отфильтровываем примитивные значения, которые не могут быть отображены напрямую
      if (child === null || child === undefined || child === false || child === 0) {
        return false;
      }
      // Отфильтровываем строки и числа (они должны быть обернуты в <Text>)
      if (typeof child === 'string' || typeof child === 'number') {
        return false;
      }
      // Проверяем, если это React элемент, который может быть null
      if (typeof child === 'object' && 'type' in child && child.type === null) {
        return false;
      }
      return true;
    });
    // Если после фильтрации массив пустой, не показываем секцию
    if (filteredChildren.length === 0) {
      return null;
    }
    // Используем отфильтрованные children
    return (
      <View style={[styles.sectionWrapper, wrapperStyle]}>
        <BlurOrSolid intensity={20} tint="dark" style={[styles.sectionBlur, blurStyle]}>
          <View ref={ref} style={[styles.section, style]}>
            {filteredChildren}
          </View>
        </BlurOrSolid>
      </View>
    );
  }
  
  // Проверяем, если children это строка или число - не показываем (должны быть обернуты в <Text>)
  if (typeof children === 'string' || typeof children === 'number') {
    return null;
  }
  
  // Проверяем, если children это React элемент, который может быть null
  if (typeof children === 'object' && children !== null && 'type' in children && children.type === null) {
    return null;
  }
  
  return (
    <View style={[styles.sectionWrapper, wrapperStyle]}>
      <BlurOrSolid intensity={20} tint="dark" style={[styles.sectionBlur, blurStyle]}>
        <View ref={ref} style={[styles.section, style]}>
          {children}
        </View>
      </BlurOrSolid>
    </View>
  );
});

SectionCard.displayName = 'SectionCard';


export default function PlayerProfile() {
  const { id, scrollToMuseum, scrollToStats, scrollToPhotos, scrollToVideos, scrollToAchievements, scrollToExercises, scrollToNormatives, scrollToFriends, scrollToGift, scrollToSpeed, scrollToAnalysis, returnTo, chatId, returnToPlayerId } = useLocalSearchParams();
  const router = useRouter();
  const navigation = useNavigation();
  const segments = useSegments();
  const { t, language } = useLanguage();
  const { updateNotificationCount } = useNotificationContext();
  const { setCurrentScreen } = useScreenContext();
  const { currentUser: globalCurrentUser, refreshUser, setCurrentUser: setGlobalCurrentUser } = useUser();
  const scrollViewRef = useRef<ScrollView>(null);
  /** Пока timestamp в будущем — не восстанавливать scroll после Realtime (иначе откат с позиции из уведомления scrollTo*). */
  const suppressProfileScrollRestoreUntilRef = useRef(0);
  const previousScreenRef = useRef<string | null>(null);
  const aiSectionRef = useRef<View>(null);
  const museumRef = useRef<View>(null);
  const statsRef = useRef<View>(null);
  const photosRef = useRef<View>(null);
  const videosRef = useRef<View>(null);
  const achievementsRef = useRef<View>(null);
  const normativesRef = useRef<View>(null);
  const shareCardRef = useRef<View>(null);
  const friendsRef = useRef<View>(null);
  const giftButtonRef = useRef<View>(null);
  const puckSpeedRef = useRef<View>(null);
  const profileMenuButtonRef = useRef<View>(null);
  const friendRequestRef = useRef<View>(null); // Ref для секции с кнопками дружбы
  
  // Ref для предотвращения повторных запросов статуса дружбы при переходе из уведомления
  const friendshipFetchedForRef = useRef<string | null>(null);
  
  // Функция для определения цвета контура аватара (перенесена внутрь компонента)
  const getAvatarBorderColorInside = (status?: string) => {
    switch (status) {
      case 'star': 
        return '#FFD700'; // Золотистый для звезд
      case 'coach': 
        return '#fa2f40'; // Красный для тренеров
      case 'scout': 
        return '#8B5CF6'; // Фиолетовый для скаутов
      case 'admin': 
        return 'rgb(1,0,0)'; // Глубокий темно-фиолетовый для админов
      case 'shop': 
        return '#4CAF50'; // Приглушенный зеленый для магазинов
      case 'skateSharpening': 
        return '#0066CC'; // Синий для заточки коньков
      default: 
        return '#FFFFFF'; // Белый для обычных игроков
    }
  };
  
  // Кеш состояния игроков для мгновенного переключения между профилями
  const [playersCache, setPlayersCache] = useState<Record<string, Player>>({});
  const [friendsCache, setFriendsCache] = useState<Record<string, Player[]>>({});
  const [friendshipStatusCache, setFriendshipStatusCache] = useState<Record<string, 'friends' | 'sent_request' | 'received_request' | 'none' | 'pending'>>({});
  const [museumCache, setMuseumCache] = useState<Record<string, any[]>>({});
  const [museumItemsCount, setMuseumItemsCount] = useState<Record<string, number>>({});
  
  // Ref для отслеживания текущего запрошенного ID, чтобы отменять устаревшие загрузки
  const currentLoadingIdRef = useRef<string | null>(null);
  const [museumUpdateKey, setMuseumUpdateKey] = useState<number>(0);
  const [photosCache, setPhotosCache] = useState<Record<string, string[]>>({});
  const [player, setPlayer] = useState<Player | null>(null);
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const currentUserLoadRef = useRef<Player | null>(null);
  currentUserLoadRef.current = currentUser;
  const [loading, setLoading] = useState(true);
  // Счётчики просмотров — отдельный state, не зависящий от кэша player
  const [profileViews, setProfileViews] = useState<{ total: number; today: number } | null>(null);
  // Ref для предотвращения двойного инкремента в рамках одного фокуса экрана
  const viewsIncrementedRef = useRef<string | null>(null);
  // Защита от гонок: применяем только самый свежий ответ по счётчикам просмотров
  const profileViewsRequestRef = useRef(0);
  // Счётчик фокусов: увеличивается при каждом новом входе на экран профиля,
  // чтобы useEffect с инкрементом перезапускался даже для того же player.id.
  const [focusCounter, setFocusCounter] = useState(0);
  
  // Используем кэшированный аватар для QR-кода и других мест
  // Это гарантирует, что аватар обновится везде при изменении
  const cachedPlayerAvatar = useAvatarCache(player?.id || '', player?.avatar);
  const [playerNotFoundTimeout, setPlayerNotFoundTimeout] = useState<NodeJS.Timeout | null>(null);
  const [activityRefreshKey, setActivityRefreshKey] = useState<number>(0);
  const [friendshipStatus, setFriendshipStatus] = useState<'friends' | 'sent_request' | 'received_request' | 'none' | 'pending'>('none');
  
  // Ref для отслеживания времени последнего ручного изменения статуса
  const lastManualStatusChangeRef = useRef<number>(0);
  
  // Ref для хранения текущего кеша статуса дружбы
  const friendshipStatusCacheRef = useRef<Record<string, 'friends' | 'sent_request' | 'received_request' | 'none' | 'pending'>>({});
  
  // Синхронизируем ref с состоянием
  useEffect(() => {
    friendshipStatusCacheRef.current = friendshipStatusCache;
  }, [friendshipStatusCache]);

  // Синхронизируем локальное состояние с глобальным
  useEffect(() => {
    setCurrentUser(globalCurrentUser);
  }, [globalCurrentUser]);

  // Проверяем авторизацию при загрузке компонента
  useEffect(() => {
    const checkAuth = async () => {
      // Ждем немного, чтобы дать время UserContext загрузить данные
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // УБИРАЕМ проверку на авторизацию
      // Профиль игрока должен быть доступен для просмотра всем
      // Даже если пользователь не авторизован, он может просматривать профили
    };
    
    checkAuth();
  }, [globalCurrentUser, router]);
  const [friendLoading, setFriendLoading] = useState(false);
  const [friends, setFriends] = useState<Player[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; timeCode?: string } | null>(null);
  const [videoLikeRefreshTrigger, setVideoLikeRefreshTrigger] = useState(0);
  const [deleteSpeedRecordDate, setDeleteSpeedRecordDate] = useState<string | null>(null);
  const [isDeletingSpeedRecord, setIsDeletingSpeedRecord] = useState(false);
  const [alert, setAlert] = useState({
    visible: false,
    title: '',
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info',
    onConfirm: () => {},
    onCancel: () => {},
    onSecondary: () => {},
    showCancel: false,
    showSecondary: false,
    confirmText: t('common.ok'),
    cancelText: t('profile.cancel'),
    secondaryText: t('profile.additional')
  });
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');
  const [isEditing, setIsEditing] = useState(false);
  const isEditingRef = useRef(false);
  // Флаг для отслеживания времени последнего сохранения (чтобы игнорировать Realtime обновления сразу после сохранения)
  const lastSaveTimeRef = useRef<number>(0); // Ref для актуального значения isEditing в callback'ах
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [editData, setEditData] = useState<Partial<Player>>({});
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showPositionPicker, setShowPositionPicker] = useState(false);
  const [showGripPicker, setShowGripPicker] = useState(false);
  const [countrySearchText, setCountrySearchText] = useState('');
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [selectedBirthDate, setSelectedBirthDate] = useState(new Date());
  const [showHockeyStartDatePicker, setShowHockeyStartDatePicker] = useState(false);
  const [selectedHockeyStartDate, setSelectedHockeyStartDate] = useState(new Date());
  const [videoFields, setVideoFields] = useState<Array<{url: string, hours: string, minutes: string, seconds: string}>>([{ url: '', hours: '0', minutes: '0', seconds: '0' }]);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const initialPhotosCountRef = useRef<number>(0); // Сохраняем исходное количество фото при загрузке профиля
  const [playerTeams, setPlayerTeams] = useState<PastTeam[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const isOwner = currentUser && player && currentUser.id === player.id;
  const canShowAchievements = achievements.length > 0 || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player?.id)) || isOwner;
  const [pastTeams, setPastTeams] = useState<PastTeam[]>([]);
  const [coachYears, setCoachYears] = useState<number[]>([]);
  const [individualTraining, setIndividualTraining] = useState<string[]>([]);
  const [skateServices, setSkateServices] = useState<string[]>([]);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showStarGiftModal, setShowStarGiftModal] = useState(false);
  const [showRequestGiftModal, setShowRequestGiftModal] = useState(false);
  const [requestGiftMessage, setRequestGiftMessage] = useState('');
  const [requestGiftLoading, setRequestGiftLoading] = useState(false);
  const [profileMenuVisible, setProfileMenuVisible] = useState(false);
  const [profileMenuPosition, setProfileMenuPosition] = useState({ x: 0, y: 0 });
  const [isBlockingUser, setIsBlockingUser] = useState(false);
  const [isUserBlockedState, setIsUserBlockedState] = useState(false);

  // --- AI Analysis state ---
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [aiUsageCount, setAiUsageCount] = useState<number>(0);
  const [isGeneratingAnalysis, setIsGeneratingAnalysis] = useState(false);
  // YouTube game videos for AI analysis (editable list)
  const [gameVideoLinks, setGameVideoLinks] = useState<string[]>(['']);
  // -------------------------

  // Используем английские ключи для позиций (стандарт в базе данных)
  const positions = ['center', 'winger', 'defender', 'goalie'];
  
  // Маппинг ключей на переведенные названия для отображения
  const positionLabels: { [key: string]: string } = {
    'center': t('profile.positions.center'),
    'winger': t('profile.positions.winger'),
    'defender': t('profile.positions.defender'),
    'goalie': t('profile.positions.goalie'),
  };
  const grips = ['Левый', 'Правый'];
  const availableYears = Array.from({ length: 15 }, (_, i) => 2021 - i); // 2021 до 2007
  const availableTrainingTypes = [
    'hockeySkills',
    'skating', 
    'shooting',
    'fitness',
    'goalieTraining',
    'dryLand',
    'faceOffs'
  ];
  const availableSkateServices = [
    'skateSharpeningService',
    'skateForming',
    'skateProfiling',
    'equipmentRepair',
    'stickRepair',
    'usedEquipmentSale',
    'newEquipmentSale'
  ];

  const [newUserData, setNewUserData] = useState<Partial<Player>>({
    name: '',
    phone: '',
    status: 'player',
    birthDate: '',
    country: t('belarus'),
    team: '',
    position: '',
    avatar: undefined
  });

  // Хук для локального отслеживания изменений статистики
  const { statsChanges, getChangeForField, refreshChanges, isLoading: statsLoading } = useStatsChanges(player?.id || '');

  // Функция для получения цвета обводки в зависимости от статуса
  const getAvatarBorderColor = (status: string) => {
    switch (status) {
      case 'star': return '#FFD700'; // Золотистый для звезд
      case 'coach': return '#fa2f40'; // Красный для тренеров
      case 'scout': return '#808080'; // Серый для скаутов
      case 'admin': return 'rgb(1,0,0)'; // Глубокий темно-фиолетовый для админов
      default: return '#FFFFFF'; // Белый для обычных игроков
    }
  };

  // Функция для перевода позиций
  const translatePosition = (position: string | undefined | null) => {
    if (!position) return '';
    
    // Убираем пробелы и приводим к нижнему регистру для сравнения
    const normalizedPos = position.trim().toLowerCase();
    
    // Получаем переводы с fallback на хардкод, если перевод не найден
    const getTranslation = (key1: string, key2: string, fallbackRu: string, fallbackEn: string) => {
      // Пробуем оба варианта ключей (на верхнем уровне и в profile.positions)
      let translation = t(key1);
      if (translation === key1 || translation.includes('Translation missing')) {
        translation = t(key2);
      }
      // Если перевод не найден (вернулся ключ), используем fallback
      if (translation === key1 || translation === key2 || translation.includes('Translation missing')) {
        return language === 'ru' ? fallbackRu : fallbackEn;
      }
      return translation;
    };
    
    // Позиции теперь хранятся как английские ключи, переводим их для отображения
    const positionMap: { [key: string]: string } = {
      'center': getTranslation('profile.positions.center', 'center', 'Центральный нападающий', 'Center'),
      'winger': getTranslation('profile.positions.winger', 'winger', 'Крайний нападающий', 'Winger'),
      'defender': getTranslation('profile.positions.defender', 'defender', 'Защитник', 'Defender'),
      'goalie': getTranslation('profile.positions.goalie', 'goalie', 'Вратарь', 'Goalie'),
      // Поддержка старых значений для обратной совместимости
      'центральный нападающий': getTranslation('profile.positions.center', 'center', 'Центральный нападающий', 'Center'),
      'крайний нападающий': getTranslation('profile.positions.winger', 'winger', 'Крайний нападающий', 'Winger'),
      'защитник': getTranslation('profile.positions.defender', 'defender', 'Защитник', 'Defender'),
      'вратарь': getTranslation('profile.positions.goalie', 'goalie', 'Вратарь', 'Goalie'),
      'goalkeeper': getTranslation('profile.positions.goalie', 'goalie', 'Вратарь', 'Goalie'),
    };
    
    // Сначала проверяем нормализованное значение
    if (positionMap[normalizedPos]) {
      return positionMap[normalizedPos];
    }
    
    // Если не найдено, проверяем исходное значение (с учетом регистра)
    if (positionMap[position]) {
      return positionMap[position];
    }
    
    // Если ничего не найдено, возвращаем исходное значение
    return position;
  };

  // Функция для перевода хвата
  const translateGrip = (grip: string) => {
    const gripMap: { [key: string]: string } = {
      'Левый': t('profile.grips.Левый'),
      'Правый': t('profile.grips.Правый'),
      'Left': t('profile.grips.Левый'),
      'Right': t('profile.grips.Правый')
    };
    return gripMap[grip] || grip;
  };

  // Функция для начала редактирования и отслеживания изменений
  const handleStartEditing = () => {
    if (!player) return;
    
    // Инициализируем все поля редактирования актуальными данными игрока
    setEditData({
      ...player
    });
    
    // Инициализируем видео поля из favoriteGoals
    if (player.favoriteGoals) {
      const goals = player.favoriteGoals.split('\n').filter(goal => goal.trim());
      const videoData = goals.map(goal => {
        const { url, hours, minutes, seconds } = parseVideoUrl(goal);
        return { url, hours: hours || '0', minutes: minutes || '0', seconds: seconds || '0' };
      });
      setVideoFields(videoData.length > 0 ? videoData : [{ url: '', hours: '0', minutes: '0', seconds: '0' }]);
    } else {
      setVideoFields([{ url: '', hours: '0', minutes: '0', seconds: '0' }]);
    }
    
    // Инициализируем галерею фото
    if (player.photos && Array.isArray(player.photos)) {
      setGalleryPhotos(player.photos);
      initialPhotosCountRef.current = player.photos.length; // Сохраняем исходное количество фото
    } else {
      setGalleryPhotos([]);
      initialPhotosCountRef.current = 0;
    }
    
    // Инициализируем достижения
    if (player.achievements && Array.isArray(player.achievements)) {
      setAchievements(player.achievements);
    } else {
      setAchievements([]);
    }
    
    // Инициализируем команды (текущие и прошлые)
    // playerTeams уже загружены через loadAdditionalData
    // Прошлые команды уже установлены в pastTeams через loadAdditionalData
    // Текущие команды управляются через CurrentTeamsSection и уже установлены в playerTeams
    
    setIsEditing(true);
    isEditingRef.current = true; // Синхронизируем ref
  };

  // Синхронизируем isEditingRef с isEditing для callback'ов
  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  // Используем ref для отслеживания предыдущего id, чтобы избежать показа неправильного профиля
  const previousIdRef = useRef<string | string[] | undefined>(undefined);
  /** Последний id из маршрута — сброс stale state до paint при смене профиля */
  const lastRoutePlayerIdRef = useRef<string | undefined>(undefined);

  useLayoutEffect(() => {
    const nid = Array.isArray(id) ? id[0] : id;
    if (!nid || typeof nid !== 'string') {
      return;
    }
    const prev = lastRoutePlayerIdRef.current;
    if (prev !== undefined && prev !== nid) {
      setPlayer(null);
      setLoading(true);
      currentLoadingIdRef.current = null;
      friendshipFetchedForRef.current = null;
      setFriends([]);
      setGalleryPhotos([]);
      setFriendshipStatus('none');
      setIsEditing(false);
      setEditData({});
      setPlayerTeams([]);
      setPastTeams([]);
    }
    lastRoutePlayerIdRef.current = nid;
  }, [id]);
  
  // Функция для миграции фото в фоне
  const migratePhotosInBackground = async (playerData: Player, userData: Player | null) => {
    try {
      const migratedPhotos: string[] = [];
      for (const photo of playerData.photos || []) {
            if (photo.startsWith('file://') || photo.startsWith('content://') || photo.startsWith('data:')) {
              const { uploadGalleryPhoto } = await import('../../utils/uploadImage');
              const migratedUrl = await uploadGalleryPhoto(photo);
              if (migratedUrl) {
                migratedPhotos.push(migratedUrl);
              }
      } else {
              migratedPhotos.push(photo);
      }
          }
      
      if (migratedPhotos.length > 0) {
          setGalleryPhotos(migratedPhotos);
          
        if (migratedPhotos.length !== (playerData.photos || []).length) {
          const updatedPlayer = { ...playerData, photos: migratedPhotos };
          await updatePlayer(playerData.id, updatedPlayer, true); // Пропускаем очистку кеша для миграции
          setPlayer(updatedPlayer);
        }
      }
    } catch (error) {
      console.error('Ошибка миграции фото:', error);
    }
  };

  // Функция для миграции аватара в фоне
  // ВАЖНО: используем фиксированное имя файла avatar_{playerId}.jpg для перезаписи старых файлов
  const migrateAvatarInBackground = async (playerData: Player, userData: Player | null) => {
    try {
      const { uploadImageToStorage } = await import('../../utils/uploadImage');
      const migratedAvatarUrl = await uploadImageToStorage(playerData.avatar!, `avatar_${playerData.id}.jpg`);
      if (migratedAvatarUrl) {
        const updatedPlayer = { ...playerData, avatar: migratedAvatarUrl };
        await updatePlayer(playerData.id, updatedPlayer, true); // Пропускаем очистку кеша для миграции
        setPlayer(updatedPlayer);
      }
    } catch (error) {
      console.error('Ошибка миграции аватара:', error);
    }
  };

  // Функция для загрузки дополнительных данных в фоне
  // ОПТИМИЗИРОВАНО: Все запросы выполняются ПАРАЛЛЕЛЬНО для максимальной скорости
  const loadAdditionalData = async (playerData: Player, userData: Player | null, preloadedTeams?: PastTeam[]) => {
    try {
      // Проверяем, что ID не изменился перед загрузкой дополнительных данных
      const currentId = Array.isArray(id) ? id[0] : id;
      if (currentId !== playerData.id || currentLoadingIdRef.current !== playerData.id) {
        console.log('⚠️ ID изменился перед загрузкой дополнительных данных, отменяем:', playerData.id, '->', currentId);
        return;
      }

      // Инициализируем фотографии СРАЗУ (синхронно, без ожидания)
      if (playerData?.photos && playerData.photos.length > 0) {
        setGalleryPhotos(playerData.photos);
        initialPhotosCountRef.current = playerData.photos.length; // Обновляем исходное количество фото
        setPhotosCache(prev => ({ ...prev, [playerData.id]: playerData.photos }));
      } else {
        setGalleryPhotos([]);
        initialPhotosCountRef.current = 0;
        setPhotosCache(prev => ({ ...prev, [playerData.id]: [] }));
      }

      const teamsPromise: Promise<PastTeam[]> =
        preloadedTeams !== undefined
          ? Promise.resolve(preloadedTeams)
          : getPlayerTeamsAsPastTeams(playerData.id).catch(err => {
              console.error('Ошибка загрузки команд:', err);
              return [];
            });

      const promises: Promise<any>[] = [
        teamsPromise,
        getFriends(playerData.id).catch(err => {
          console.error('Ошибка загрузки друзей:', err);
          return [];
        })
      ];
      
      // 3. Статус дружбы (только если смотрим чужой профиль)
      if (userData && playerData.id !== userData.id) {
        promises.push(
          getFriendshipStatus(userData.id, playerData.id).catch(err => {
            console.error('Ошибка загрузки статуса дружбы:', err);
            return 'none' as const;
          })
        );
      }

      // Выполняем ВСЕ запросы ОДНОВРЕМЕННО
      const results = await Promise.all(promises);
      
      // Проверяем ID после загрузки
      const checkIdAfter = Array.isArray(id) ? id[0] : id;
      if (checkIdAfter !== playerData.id || currentLoadingIdRef.current !== playerData.id) {
        console.log('⚠️ ID изменился после загрузки данных, отменяем установку');
        return;
      }

      // Распаковываем результаты
      const teams = results[0] as PastTeam[];
      const friendsList = results[1] as Player[];
      const friendsStatus = results[2] as 'friends' | 'sent_request' | 'received_request' | 'none' | 'pending' | undefined;

      // Устанавливаем команды
      const currentTeams = teams.filter(team => team.isCurrent);
      const pastTeamsFiltered = teams.filter(team => !team.isCurrent);
      setPlayerTeams(currentTeams);
      setPastTeams(pastTeamsFiltered);

      // Устанавливаем друзей
      setFriends(friendsList);
      setFriendsCache(prev => ({ ...prev, [playerData.id]: friendsList }));

      // Устанавливаем статус дружбы
      if (friendsStatus !== undefined) {
        setFriendshipStatus(friendsStatus);
        if (userData) {
          setFriendshipStatusCache(prev => ({
            ...prev,
            [`${userData.id}_${playerData.id}`]: friendsStatus
          }));
        }
      }

      // Предзагружаем аватары друзей в фоне (не блокируем UI)
      setTimeout(() => {
        friendsList.forEach(friend => {
          if (friend.avatar) {
            Image.prefetch(friend.avatar).catch(() => {});
          }
        });
      }, 0);

      // Миграции в фоне (низкий приоритет)
      setTimeout(() => {
        if (playerData?.photos && playerData.photos.length > 0) {
          migratePhotosInBackground(playerData, userData);
        }
        if (playerData?.avatar && (playerData.avatar.startsWith('file://') || playerData.avatar.startsWith('content://') || playerData.avatar.startsWith('data:'))) {
          migrateAvatarInBackground(playerData, userData);
        }
      }, 100);
      
    } catch (error) {
      console.error('Ошибка загрузки дополнительных данных:', error);
    }
  };

  const loadPlayerData = useCallback(async () => {
    try {
      // Нормализуем id (может быть массивом из useLocalSearchParams)
      const normalizedId = Array.isArray(id) ? id[0] : id;
      
      if (!normalizedId) {
        console.log('⚠️ ID не определен, пропускаем загрузку');
        return;
      }
      
      // Проверяем, что это именно тот ID, который мы сейчас загружаем
      if (currentLoadingIdRef.current !== normalizedId) {
        console.log('⚠️ ID изменился, отменяем загрузку для старого ID:', currentLoadingIdRef.current, '->', normalizedId);
        return;
      }
      
      // Оптимизация: сначала показываем кешированные данные из состояния, если они есть
      const cachedPlayer = playersCache[normalizedId as string];
      
      if (cachedPlayer) {
        console.log('⚡ Используем кешированные данные профиля из состояния');
        setPlayer(cachedPlayer);
        setLoading(false); // Убираем индикатор загрузки для кешированных данных
        
        // Команды/друзья — сразу (не ждём loadCurrentUser — он раньше задерживал команды)
        loadAdditionalData(cachedPlayer, currentUserLoadRef.current);
        void loadCurrentUser().then(setCurrentUser);
      } else {
        // Если кешированных данных нет, показываем индикатор загрузки
        setLoading(true);
      }
      
      // Проверяем, что id не изменился во время загрузки
      const currentId = Array.isArray(id) ? id[0] : id;
      if (currentId !== normalizedId || currentLoadingIdRef.current !== normalizedId) {
        console.log('⚠️ ID изменился во время загрузки, отменяем:', normalizedId, '->', currentId, 'currentLoadingId:', currentLoadingIdRef.current);
        return;
      }
      
      // Добавляем небольшую задержку для инициализации UserContext
      // Это предотвращает race condition при первом клике
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Проверяем еще раз после задержки
      const checkId = Array.isArray(id) ? id[0] : id;
      if (checkId !== normalizedId || currentLoadingIdRef.current !== normalizedId) {
        console.log('⚠️ ID изменился после задержки, отменяем:', normalizedId, '->', checkId, 'currentLoadingId:', currentLoadingIdRef.current);
        return;
      }
      
      // Загружаем основные данные + команды параллельно (команды раньше приходили только после loadAdditionalData)
      const [playerData, userData, teamsFromNetwork] = await Promise.all([
        getPlayerById(normalizedId as string, { skipCache: true }),
        loadCurrentUser(),
        getPlayerTeamsAsPastTeams(normalizedId as string).catch(() => [] as PastTeam[])
      ]);
      
      // Проверяем еще раз после загрузки данных
      const finalCheckId = Array.isArray(id) ? id[0] : id;
      if (finalCheckId !== normalizedId || currentLoadingIdRef.current !== normalizedId) {
        console.log('⚠️ ID изменился после загрузки данных, отменяем:', normalizedId, '->', finalCheckId, 'currentLoadingId:', currentLoadingIdRef.current);
        return;
      }
      
      // Определяем финальные данные игрока (после retry если нужно)
      let finalPlayerData = playerData;
      
      // Если игрок не найден, делаем retry
      if (!finalPlayerData) {
        console.log('⏳ Игрок не найден, ждем...');
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Проверяем еще раз перед retry
        const retryCheckId = Array.isArray(id) ? id[0] : id;
        if (retryCheckId !== normalizedId || currentLoadingIdRef.current !== normalizedId) {
          console.log('⚠️ ID изменился перед retry, отменяем. currentLoadingId:', currentLoadingIdRef.current);
          return;
        }
        
        const retryPlayerData = await getPlayerById(normalizedId as string, { skipCache: true });
        
        if (!retryPlayerData) {
          console.log('❌ Игрок не найден после повторной попытки');
          // Проверяем, является ли это профилем текущего пользователя
            const { loadCurrentUser } = await import('../../utils/playerStorage');
          const currentUserData = await loadCurrentUser();
          if (currentUserData && currentUserData.id === normalizedId) {
            console.log('⚠️ Текущий пользователь не найден в базе, очищаем данные и редиректим');
            await logoutUser();
            await dataCache.remove(CACHE_KEYS.USER_PROFILE);
            setGlobalCurrentUser(null);
            router.replace('/');
            void refreshUser(true);
            return;
          }
          // ВАЖНО: НЕ редиректим на главный экран если это не профиль текущего пользователя
          // Это может быть временная проблема с загрузкой данных
          // Просто показываем ошибку загрузки
          console.log('⚠️ Игрок не найден, но не редиректим - возможно временная проблема');
          setLoading(false);
          return;
        } else {
          console.log('✅ Игрок найден после повторной попытки');
          finalPlayerData = retryPlayerData;
        }
      }
      
      // Финальная проверка перед установкой состояния - проверяем и через ref и через параметр
      const beforeSetId = Array.isArray(id) ? id[0] : id;
      if (beforeSetId !== normalizedId || currentLoadingIdRef.current !== normalizedId) {
        console.log('⚠️ ID изменился перед установкой состояния, отменяем:', normalizedId, '->', beforeSetId, 'currentLoadingId:', currentLoadingIdRef.current);
        return;
      }
      
      // Убеждаемся, что загружаем правильного игрока
      if (finalPlayerData.id !== normalizedId) {
        console.error('❌ Несоответствие ID: ожидали', normalizedId, 'получили', finalPlayerData.id);
        return;
      }
      
      // Финальная проверка перед установкой состояния через ref
      if (currentLoadingIdRef.current !== normalizedId) {
        console.log('⚠️ ID изменился в самом конце, отменяем установку состояния');
        return;
      }
      
      // Сразу устанавливаем основные данные для быстрого отображения
      setPlayer(finalPlayerData);
      setCurrentUser(userData);

      // Команды уже загружены параллельно с getPlayerById — показываем сразу, без второго round-trip
      const currentTeamsNow = teamsFromNetwork.filter(team => team.isCurrent);
      const pastTeamsNow = teamsFromNetwork.filter(team => !team.isCurrent);
      setPlayerTeams(currentTeamsNow);
      setPastTeams(pastTeamsNow);

      // Сохраняем в кеш состояния для мгновенного переключения
      setPlayersCache(prev => ({
        ...prev,
        [normalizedId as string]: finalPlayerData
      }));
        
        // Инициализируем годы тренера если это тренер
        if (finalPlayerData?.coach_years && Array.isArray(finalPlayerData.coach_years) && finalPlayerData.coach_years.length > 0) {
          setCoachYears(finalPlayerData.coach_years);
        } else {
          setCoachYears([]); // Устанавливаем пустой массив
        }

        // Инициализируем индивидуальные тренировки если это тренер
        const individualTrainingData = (finalPlayerData as any)?.individual_training;
        if (individualTrainingData && Array.isArray(individualTrainingData)) {
          setIndividualTraining(individualTrainingData);
        } else {
          setIndividualTraining([]); // Устанавливаем пустой массив
        }

        // Инициализируем услуги заточки коньков если это заточка коньков
        const skateServicesData = (finalPlayerData as any)?.skate_services;
        if (skateServicesData && Array.isArray(skateServicesData)) {
          setSkateServices(skateServicesData);
        } else {
          setSkateServices([]); // Устанавливаем пустой массив
        }
        
        // Инициализируем видео поля сразу
        if (finalPlayerData?.favoriteGoals) {
          const goals = finalPlayerData.favoriteGoals.split('\n').filter(goal => goal.trim());
          const videoData = goals.map(goal => {
            const { url, hours, minutes, seconds } = parseVideoUrl(goal);
            return { url, hours: hours || '0', minutes: minutes || '0', seconds: seconds || '0' };
          });
          setVideoFields(videoData.length > 0 ? videoData : [{ url: '', hours: '0', minutes: '0', seconds: '0' }]);
        }
        
        // Инициализируем достижения сразу
        if (finalPlayerData?.achievements && Array.isArray(finalPlayerData.achievements)) {
          setAchievements(finalPlayerData.achievements);
        }
        
        // Быстро устанавливаем статус дружбы для собственного профиля
        if (userData && finalPlayerData.id === userData.id) {
          setFriendshipStatus('friends');
        }

        // Sync AI analysis from player data
        if (finalPlayerData.aiAnalysis) {
          setAiAnalysis(finalPlayerData.aiAnalysis as AIAnalysis);
        } else {
          setAiAnalysis(null);
        }

        // Init game video links
        if (finalPlayerData.gameVideos && finalPlayerData.gameVideos.length > 0) {
          setGameVideoLinks([...finalPlayerData.gameVideos, '']);
        } else {
          setGameVideoLinks(['']);
        }

        // Load AI usage count for owner
        if (userData && finalPlayerData.id === userData.id) {
          const now = new Date();
          supabase
            .from('ai_analysis_usage')
            .select('count')
            .eq('player_id', finalPlayerData.id)
            .eq('year', now.getFullYear())
            .eq('month', now.getMonth() + 1)
            .maybeSingle()
            .then(({ data: usageRow }) => {
              setAiUsageCount(usageRow?.count || 0);
            });
        }
        
        // Финальная проверка перед завершением загрузки
        const finalVerifyId = Array.isArray(id) ? id[0] : id;
        if (finalVerifyId !== normalizedId || currentLoadingIdRef.current !== normalizedId) {
          console.log('⚠️ ID изменился перед завершением загрузки, отменяем установку:', normalizedId, '->', finalVerifyId, 'currentLoadingId:', currentLoadingIdRef.current);
          return;
        }
        
        setLoading(false);
        
        // Загружаем дополнительные данные в фоне (команды уже есть — не дублируем запрос)
        loadAdditionalData(finalPlayerData, userData, teamsFromNetwork);
    } catch (error) {
      console.error('❌ Ошибка загрузки данных игрока:', error);
      setLoading(false);
    }
  }, [id, router]);
  
  useEffect(() => {
    // Нормализуем id (может быть массивом из useLocalSearchParams)
    const normalizedId = Array.isArray(id) ? id[0] : id;
    const previousId = Array.isArray(previousIdRef.current) ? previousIdRef.current[0] : previousIdRef.current;
    
    if (!normalizedId) {
      return;
    }
    
    // Проверяем, изменился ли id
    const idChanged = normalizedId !== previousId && previousId !== undefined;
    
    // ВАЖНО: Если id изменился, сначала очищаем состояние синхронно
    if (idChanged) {
      console.log('🔄 ID изменился, очищаем состояние:', previousId, '->', normalizedId);
      // Отменяем любые текущие загрузки для старого ID
      currentLoadingIdRef.current = null;
      // Сбрасываем ref для статуса дружбы
      friendshipFetchedForRef.current = null;
      // Сбрасываем счётчик просмотров и флаг инкремента для нового профиля
      setProfileViews(null);
      viewsIncrementedRef.current = null;
      // Полностью очищаем все состояние СРАЗУ
      setPlayer(null);
      setFriends([]);
      setFriendshipStatus('none');
      setIsEditing(false);
      setEditData({});
      setGalleryPhotos([]);
      setAchievements([]);
      setCoachYears([]);
      setIndividualTraining([]);
      setSkateServices([]);
      setVideoFields([{ url: '', timeCode: '' }]);
      setPlayerTeams([]);
      setPastTeams([]);
      setLoading(true); // Показываем loading для нового профиля
      // Обновляем previousId сразу
      previousIdRef.current = normalizedId;
    }
    
    // Проверяем кеш для нового ID (после очистки состояния)
    const cachedPlayer = playersCache[normalizedId as string];
    
    // Если профиль есть в кеше для нового ID - показываем мгновенно
    if (cachedPlayer && cachedPlayer.id === normalizedId) {
      // Мгновенно показываем данные из кеша
      setPlayer(cachedPlayer);
      setLoading(false);
      
      // Восстанавливаем друзей и статус дружбы из кеша
      if (friendsCache[normalizedId as string]) {
        setFriends(friendsCache[normalizedId as string]);
      } else {
        setFriends([]);
      }
      
      // Восстанавливаем фото из кеша
      if (photosCache[normalizedId as string]) {
        setGalleryPhotos(photosCache[normalizedId as string]);
      } else {
        setGalleryPhotos([]);
      }
      
      // Для статуса дружбы нужен currentUser, поэтому показываем 'none'
      // Статус дружбы будет загружен в loadAdditionalData
      setFriendshipStatus('none');
      
      setIsEditing(false);
      setEditData({});
      // Устанавливаем текущий загружаемый ID
      currentLoadingIdRef.current = normalizedId;
      
      // Обновляем данные в фоне (без показа loading)
      loadPlayerData();
      
      // Обновляем предыдущий id (если еще не обновлен)
      if (!idChanged) {
      previousIdRef.current = normalizedId;
      }
    } else {
      // Нет в кеше - загружаем данные
      if (!idChanged && previousId === undefined) {
        // Первая загрузка - устанавливаем previousId
        previousIdRef.current = normalizedId;
      }
      
      // Устанавливаем текущий загружаемый ID
      currentLoadingIdRef.current = normalizedId;
      
      // Если состояние еще не очищено (не было смены id), показываем loading
      if (!idChanged) {
      setLoading(true);
      setFriends([]);
      setFriendshipStatus('none');
      setIsEditing(false);
      setEditData({});
      }
      
      // Загружаем данные игрока (используется кеш из getPlayerById на уровне БД)
      loadPlayerData();
    }
    // loadPlayerData обернут в useCallback и зависит от id, поэтому безопасно добавлять его в зависимости
  }, [id, loadPlayerData]);

  const refreshProfileViews = useCallback(async (playerId: string) => {
    const requestId = ++profileViewsRequestRef.current;
    const { data, error } = await supabase
      .from('players')
      .select('profile_views_total, profile_views_today')
      .eq('id', playerId)
      .single();

    if (requestId !== profileViewsRequestRef.current) return;
    if (error || !data) return;

    setProfileViews({
      total: data.profile_views_total ?? 0,
      today: data.profile_views_today ?? 0,
    });
  }, []);

  // ── Инкремент просмотров — при каждом заходе в профиль ──────────────────────
  // focusCounter увеличивается в useFocusEffect при каждом фокусе экрана,
  // а также viewsIncrementedRef сбрасывается при смене id и re-focus.
  useEffect(() => {
    if (!player?.id) return;

    if (viewsIncrementedRef.current === player.id) return;
    viewsIncrementedRef.current = player.id;

    const isOwnProfile = currentUser?.id === player.id;
    const targetId = player.id;

    if (isOwnProfile) {
      void refreshProfileViews(targetId);
      return;
    }

    supabase
      .rpc('increment_profile_views', { profile_player_id: targetId })
      .then(({ error }) => {
        if (error) {
          console.error('⚠️ increment_profile_views RPC error:', error.message);
        }
      })
      .finally(() => {
        void refreshProfileViews(targetId);
      });
  }, [player?.id, currentUser?.id, focusCounter, refreshProfileViews]);
  // ────────────────────────────────────────────────────────────────────────────

  // Инициализация статуса дружбы при загрузке профиля
  useEffect(() => {
    if (!currentUser || !player || currentUser.id === player.id) return;

    const initializeFriendshipStatus = async () => {
      // Не инициализируем статус, если он был изменен вручную менее 3 секунд назад
      const timeSinceLastManualChange = Date.now() - lastManualStatusChangeRef.current;
      if (timeSinceLastManualChange < 3000) {
        console.log('⏭️ Пропускаем инициализацию статуса (недавнее ручное изменение)');
        return;
      }

      const cacheKey = `${Math.min(currentUser.id, player.id)}_${Math.max(currentUser.id, player.id)}`;

      // ВАЖНО: Всегда загружаем актуальный статус из БД при открытии профиля
      // Кеш может быть устаревшим, особенно после отправки/принятия запросов в друзья
      try {
        // Используем skipCache=true чтобы получить актуальный статус из БД
        const status = await getFriendshipStatus(currentUser.id, player.id, true);
        setFriendshipStatus(status);

        // Обновляем кеш актуальным значением
        setFriendshipStatusCache(prev => ({
          ...prev,
          [cacheKey]: status
        }));
      } catch (error) {
        console.error('⚠️ Ошибка инициализации статуса дружбы (не критично):', error);
        // В случае ошибки используем кеш, если он есть
        if (friendshipStatusCache[cacheKey]) {
          setFriendshipStatus(friendshipStatusCache[cacheKey]);
        } else {
          setFriendshipStatus('none');
        }
      }
    };

    initializeFriendshipStatus();
  }, [currentUser?.id, player?.id]);

  // Realtime подписка для синхронизации статуса дружбы
  useEffect(() => {
    if (!currentUser || !player) return;

    let debounceTimer: NodeJS.Timeout | null = null;

    const syncFriendshipStatus = async (eventType?: string, forceUpdate: boolean = false) => {
      // ВАЖНО: Для критических событий (принятие запроса, удаление из друзей) обновляем всегда
      // Проверяем только если это наше собственное действие и это не критическое событие
      const timeSinceLastManualChange = Date.now() - lastManualStatusChangeRef.current;
      const isOurAction = timeSinceLastManualChange < 1000;
      const isCriticalEvent = eventType === 'UPDATE' || eventType === 'DELETE' || forceUpdate;
      
      // ВАЖНО: Для критических событий (принятие запроса, удаление из друзей) всегда обновляем,
      // даже если это наше действие, потому что изменение могло произойти от другого пользователя
      if (isOurAction && !isCriticalEvent) {
        // Для наших действий (кроме критических) делаем небольшую задержку
        console.log('⏭️ Пропускаем realtime синхронизацию (наше недавнее действие)');
        return;
      }
      
      // Для критических событий всегда обновляем, даже если это наше действие
      // Это гарантирует, что если другой пользователь принял запрос или удалил из друзей,
      // мы увидим изменение немедленно

      try {
        const cacheKey = `${Math.min(currentUser.id, player.id)}_${Math.max(currentUser.id, player.id)}`;
        
        // ВАЖНО: Используем skipCache=true для Realtime событий, чтобы получить актуальный статус из БД
        const currentStatus = await getFriendshipStatus(currentUser.id, player.id, true);

        // Обновляем только если статус действительно изменился
        setFriendshipStatusCache(prev => {
          const cachedStatus = prev[cacheKey];
          if (cachedStatus !== currentStatus) {
            setFriendshipStatus(currentStatus);
            return {
              ...prev,
              [cacheKey]: currentStatus
            };
          }
          return prev;
        });
      } catch (error) {
        console.error('⚠️ Ошибка синхронизации статуса дружбы через realtime (не критично):', error);
      }
    };

    const debouncedSync = (eventType?: string) => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      // Для DELETE событий (удаление из друзей) обновляем быстрее
      const delay = eventType === 'DELETE' ? 100 : 300;
      debounceTimer = setTimeout(() => syncFriendshipStatus(eventType), delay);
    };

    // Функция для проверки, относится ли запись к нашей паре пользователей
    const isRelevantRequest = (record: any): boolean => {
      if (!record) return false;
      const fromId = record.from_id;
      const toId = record.to_id;
      return (fromId === currentUser.id && toId === player.id) ||
             (fromId === player.id && toId === currentUser.id);
    };

    // Создаем канал с уникальным именем для этой пары пользователей
    const friendRequestsChannel = supabase
      .channel(`friend-requests-sync-${currentUser.id}-${player.id}`)
      // ВАЖНО: Подписываемся на ВСЕ события таблицы friend_requests БЕЗ фильтра
      // Фильтрацию делаем на клиенте для надежности
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests'
        },
        (payload) => {
          const eventType = payload.eventType;
          const newRecord = payload.new as { from_id?: string; to_id?: string; status?: string } | null;
          const oldRecord = payload.old as { from_id?: string; to_id?: string; status?: string } | null;
          
          // Проверяем, относится ли это событие к нашей паре пользователей
          const fromId = newRecord?.from_id || oldRecord?.from_id;
          const toId = newRecord?.to_id || oldRecord?.to_id;
          
          // ВАЖНО: Для DELETE событий payload.old может содержать только {id: "..."}
          // без from_id и to_id (если REPLICA IDENTITY не FULL)
          // В этом случае всё равно обновляем статус, чтобы не пропустить удаление
          if (eventType === 'DELETE') {
            if (!fromId || !toId) {
              syncFriendshipStatus('DELETE', true);
              return;
            }
          }
          
          const isOurPair = (fromId === currentUser.id && toId === player.id) ||
                           (fromId === player.id && toId === currentUser.id);
          
          if (!isOurPair) {
            return;
          }
          
          // Для DELETE всегда обновляем статус
          if (eventType === 'DELETE') {
            syncFriendshipStatus('DELETE', true);
            return;
          }
          
          const oldStatus = oldRecord?.status;
          const newStatus = newRecord?.status;
          
          if (eventType === 'UPDATE' && oldStatus === 'pending' && newStatus === 'accepted') {
            syncFriendshipStatus('UPDATE', true);
          } else if (eventType === 'INSERT') {
            debouncedSync(eventType);
          } else {
            debouncedSync(eventType);
          }
        }
      )
      .subscribe();

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      supabase.removeChannel(friendRequestsChannel);
    };
  }, [currentUser?.id, player?.id]);

  // Realtime подписка на изменения friend_requests для обновления списка друзей
  useEffect(() => {
    if (!player) return;

    const reloadFriendsList = async () => {
      // Сохраняем текущую позицию прокрутки ПЕРЕД любыми изменениями
      const currentScrollPosition = savedScrollPositionRef.current;
      
      // Перезагружаем список друзей
      const friendsList = await getFriends(player.id);
      
      // Проверяем, что ID не изменился
      const checkId = Array.isArray(id) ? id[0] : id;
      if (checkId === player.id && currentLoadingIdRef.current === player.id) {
        setFriends(friendsList);
        // Обновляем кеш
        setFriendsCache(prev => ({
          ...prev,
          [player.id]: friendsList
        }));
        
        // Восстанавливаем позицию прокрутки после обновления
        // НО НЕ восстанавливаем, если позиция была сброшена (например, после принятия дружбы)
        // И пропускаем после перехода из уведомления с scrollTo* (тайминг совпадает с 300ms Realtime)
        if (Date.now() < suppressProfileScrollRestoreUntilRef.current) {
          // не трогаем ScrollView
        } else if (currentScrollPosition !== null && savedScrollPositionRef.current !== null && scrollViewRef.current) {
          const restoreScroll = () => {
            scrollViewRef.current?.scrollTo({ 
              y: currentScrollPosition, 
              animated: false 
            });
          };
          setTimeout(restoreScroll, 50);
          setTimeout(restoreScroll, 150);
          setTimeout(restoreScroll, 300);
        } else if (savedScrollPositionRef.current === null) {
          // Если позиция была сброшена, прокручиваем наверх
          setTimeout(() => {
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
          }, 100);
          console.log('✅ Прокрутка наверх после обновления друзей (позиция была сброшена)');
        }
      }
    };

    const friendsChannel = supabase
      .channel(`friends-list-${player.id}`)
      // Слушаем INSERT где from_id = player.id
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_requests',
          filter: `from_id=eq.${player.id}`
        },
        async (payload) => {
          // Проверяем, что статус 'accepted'
          if (payload.new && (payload.new as any).status === 'accepted') {
            await reloadFriendsList();
          }
        }
      )
      // Слушаем INSERT где to_id = player.id
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'friend_requests',
          filter: `to_id=eq.${player.id}`
        },
        async (payload) => {
          // Проверяем, что статус 'accepted'
          if (payload.new && (payload.new as any).status === 'accepted') {
            await reloadFriendsList();
          }
        }
      )
      // Слушаем UPDATE где from_id = player.id
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'friend_requests',
          filter: `from_id=eq.${player.id}`
        },
        async (payload) => {
          // Проверяем, что статус изменился на 'accepted'
          if (payload.new && (payload.new as any).status === 'accepted' && 
              payload.old && (payload.old as any).status !== 'accepted') {
            await reloadFriendsList();
          }
        }
      )
      // Слушаем UPDATE где to_id = player.id
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'friend_requests',
          filter: `to_id=eq.${player.id}`
        },
        async (payload) => {
          // Проверяем, что статус изменился на 'accepted'
          if (payload.new && (payload.new as any).status === 'accepted' && 
              payload.old && (payload.old as any).status !== 'accepted') {
            await reloadFriendsList();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(friendsChannel);
    };
  }, [player?.id, id]);

  // Ref для сохранения позиции прокрутки при обновлении через Realtime
  const savedScrollPositionRef = useRef<number | null>(null);
  
  // Realtime подписка на обновления профиля игрока
  useEffect(() => {
    if (!player?.id) return;

    const reloadPlayerProfile = async (payload?: any) => {
      console.log('🔄 Realtime: Обновление профиля игрока', player.id);
      
      // Проверяем, что ID не изменился
      const checkId = Array.isArray(id) ? id[0] : id;
      if (checkId !== player.id) {
        console.log('⚠️ ID изменился, пропускаем обновление профиля');
        return;
      }
      
      // ОПТИМИЗАЦИЯ: Пропускаем перезагрузку если изменились только счётчики уведомлений/сообщений
      // Это предотвращает нежелательную прокрутку при отправке запроса в друзья
      if (payload?.new && payload?.old) {
        const newData = payload.new;
        const oldData = payload.old;
        
        // Проверяем, изменилось ли что-то кроме счётчиков
        const relevantFieldsChanged = Object.keys(newData).some(key => {
          // Игнорируем поля счётчиков и timestamps
          if (key === 'unread_notifications_count' || 
              key === 'unread_messages_count' || 
              key === 'notifications' ||
              key === 'updated_at' ||
              key === 'last_seen' ||
              key === 'is_online') {
            return false;
          }
          // Сравниваем значения
          return JSON.stringify(newData[key]) !== JSON.stringify(oldData[key]);
        });
        
        if (!relevantFieldsChanged) {
          console.log('⏭️ Пропускаем перезагрузку профиля - изменились только счётчики/timestamps');
          // ВАЖНО: Даже если пропускаем перезагрузку, обновляем статус дружбы если нужно
          // Это нужно чтобы кнопки дружбы обновились после принятия/отклонения запроса
          if (currentUser && currentUser.id !== player.id) {
            const cacheKey = `${Math.min(currentUser.id, player.id)}_${Math.max(currentUser.id, player.id)}`;
            // Сбрасываем кеш статуса дружбы чтобы он перезагрузился
            setFriendshipStatusCache(prev => {
              const newCache = { ...prev };
              delete newCache[cacheKey];
              return newCache;
            });
            // Загружаем актуальный статус дружбы в фоне
            getFriendshipStatus(currentUser.id, player.id, true).then(status => {
              console.log('🔄 Статус дружбы обновлен через Realtime (без перезагрузки профиля):', status);
              setFriendshipStatus(status);
              setFriendshipStatusCache(prev => ({ ...prev, [cacheKey]: status }));
            }).catch(() => {
              // Игнорируем ошибки
            });
          }
          return;
        }
      }

      // ВАЖНО: Игнорируем Realtime обновления, которые приходят сразу после сохранения (в течение 3 секунд)
      // Это предотвращает перезапись только что сохраненных данных старыми данными из Realtime
      const timeSinceLastSave = Date.now() - lastSaveTimeRef.current;
      if (timeSinceLastSave < 3000) {
        console.log(`⏭️ Пропускаем Realtime обновление - прошло только ${timeSinceLastSave}ms после сохранения (защита от перезаписи)`);
        return;
      }
      
      // ВАЖНО: Сохраняем позицию прокрутки ПЕРЕД любыми изменениями состояния
      const scrollPositionBeforeUpdate = savedScrollPositionRef.current;

      try {
        // Загружаем свежие данные профиля
        const { getPlayerById, clearPlayerMemoryCache } = await import('../../utils/playerStorage');
        
        // ВАЖНО: Очищаем memory cache перед загрузкой, чтобы получить свежие данные из БД
        // Это предотвращает загрузку старых данных из кеша
        clearPlayerMemoryCache(player.id);
        
        // Загружаем свежие данные из БД (не из кеша)
        const updatedPlayer = await getPlayerById(player.id);
        
        // Проверяем еще раз после загрузки
        const finalCheckId = Array.isArray(id) ? id[0] : id;
        if (finalCheckId !== player.id) {
          console.log('⚠️ ID изменился после загрузки, пропускаем обновление');
          return;
        }
        
        if (updatedPlayer) {
          // ВАЖНО: Проверяем, что данные из Realtime новее текущих (по timestamp из кеша)
          // Если текущие данные новее, не обновляем (защита от перезаписи свежих данных)
          // Используем сравнение по времени последнего сохранения
          const timeSinceLastSave = Date.now() - lastSaveTimeRef.current;
          if (timeSinceLastSave < 5000) {
            // Если прошло меньше 5 секунд с момента сохранения, данные из Realtime могут быть старыми
            // Сравниваем ключевые поля, чтобы убедиться, что данные действительно изменились
            const keyFields = ['grip', 'position', 'number', 'height', 'weight', 'name'];
            const fieldsChanged = keyFields.some(field => {
              const currentValue = (player as any)[field];
              const realtimeValue = (updatedPlayer as any)[field];
              return JSON.stringify(currentValue) !== JSON.stringify(realtimeValue);
            });
            
            if (!fieldsChanged) {
              console.log('⏭️ Пропускаем Realtime обновление - данные не изменились (защита от перезаписи)');
              return;
            }
          }
          
          console.log('✅ Профиль обновлен через Realtime');
          setPlayer(updatedPlayer);
          
          // Обновляем кеш состояния
          setPlayersCache(prev => ({
            ...prev,
            [player.id]: updatedPlayer
          }));
          
          // ВАЖНО: НЕ обновляем дополнительные данные (команды, друзей) если идёт редактирование!
          // Иначе локальные изменения команд будут перезаписаны данными из БД (где их ещё нет)
          // Используем isEditingRef.current чтобы получить актуальное значение в callback
          if (currentUser && !isEditingRef.current) {
            loadAdditionalData(updatedPlayer, currentUser);
          } else if (isEditingRef.current) {
            console.log('⚠️ Пропускаем loadAdditionalData - идёт редактирование профиля');
          }
          
          // Восстанавливаем позицию прокрутки после обновления (если была сохранена)
          // Не затираем целевую прокрутку из уведомления: Realtime приходит ~300ms, scrollTo — позже
          if (
            scrollPositionBeforeUpdate !== null &&
            scrollViewRef.current &&
            Date.now() >= suppressProfileScrollRestoreUntilRef.current
          ) {
            const restoreScroll = () => {
              scrollViewRef.current?.scrollTo({ 
                y: scrollPositionBeforeUpdate, 
                animated: false 
              });
            };
            setTimeout(restoreScroll, 50);
            setTimeout(restoreScroll, 150);
            setTimeout(restoreScroll, 300);
          }
        }
      } catch (error) {
        console.error('❌ Ошибка обновления профиля через Realtime:', error);
      }
    };

    const profileChannel = supabase
      .channel(`player-profile-updates-${player.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'players',
          filter: `id=eq.${player.id}`
        },
        async (payload) => {
          console.log('📨 Realtime: Получено обновление профиля', payload.new);
          // Передаём payload для проверки что изменилось
          // Небольшая задержка для дебаунсинга множественных обновлений
          setTimeout(() => {
            reloadPlayerProfile(payload);
          }, 300);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(profileChannel);
    };
  }, [player?.id, id, currentUser?.id]);

  // Ref для отслеживания последнего обновления
  const lastRefreshTime = useRef<number>(0);
  
  // Ref-ы для доступа к актуальным значениям внутри useFocusEffect без лишних зависимостей
  const playerRef = useRef(player);
  const currentUserRef = useRef(currentUser);
  const loadingRef = useRef(loading);
  playerRef.current = player;
  currentUserRef.current = currentUser;
  loadingRef.current = loading;

  // Отслеживаем, что мы на экране профиля
  useFocusEffect(
    useCallback(() => {
      setCurrentScreen('player');

      if (scrollToFriends === 'true') {
        savedScrollPositionRef.current = null;
      }

      // Сбрасываем флаг инкремента и поднимаем счётчик фокуса,
      // чтобы useEffect перезапустил инкремент при повторном заходе.
      viewsIncrementedRef.current = null;
      setFocusCounter(c => c + 1);
      console.log('👁️ useFocusEffect: фокус получен, viewsIncrementedRef сброшен, id =', id);

      const now = Date.now();
      const p = playerRef.current;
      const cu = currentUserRef.current;
      const normalizedId = Array.isArray(id) ? id[0] : id;

      if (p && p.id && normalizedId && !loadingRef.current) {
        if (now - lastRefreshTime.current > 2000) {
          lastRefreshTime.current = now;
          loadPlayerData();
          if (cu && cu.id !== p.id) {
            getFriendshipStatus(cu.id, p.id).then(status => {
              setFriendshipStatus(status);
            });
          }
        }
      }

      return () => {
        setCurrentScreen(null);
      };
    }, [id])
  );

  // Обработка прокрутки к разным разделам
  useEffect(() => {
    if (!player) return;

    const hasDeepLinkScroll =
      scrollToMuseum === 'true' ||
      scrollToStats === 'true' ||
      scrollToPhotos === 'true' ||
      scrollToVideos === 'true' ||
      scrollToAchievements === 'true' ||
      scrollToFriends === 'true' ||
      scrollToNormatives === 'true' ||
      scrollToExercises === 'true' ||
      scrollToGift === 'true' ||
      scrollToSpeed === 'true' ||
      scrollToAnalysis === 'true';

    if (hasDeepLinkScroll) {
      suppressProfileScrollRestoreUntilRef.current = Date.now() + 5000;
    }

    /** Повторы measureLayout: после Realtime layout меняется; одна задержка 500ms давала сдвиг «через мгновение». */
    const scrollToSection = (ref: React.RefObject<View>, offset: number = 100) => {
      const scrollOnce = (attempt: number) => {
        const delay = attempt === 0 ? 80 : 300;
        setTimeout(() => {
          InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => {
              const target = ref.current;
              const scrollParent = scrollViewRef.current;
              if (!target || !scrollParent) {
                if (attempt < 5) scrollOnce(attempt + 1);
                return;
              }
              target.measureLayout(
                scrollParent as any,
                (_x, y) => {
                  scrollParent.scrollTo({ x: 0, y: Math.max(0, y - offset), animated: true });
                },
                () => {
                  if (attempt < 5) scrollOnce(attempt + 1);
                }
              );
            });
          });
        }, delay);
      };
      scrollOnce(0);
    };

    if (scrollToMuseum === 'true') {
      scrollToSection(museumRef);
    } else if (scrollToStats === 'true') {
      scrollToSection(statsRef);
    } else if (scrollToPhotos === 'true') {
      scrollToSection(photosRef);
    } else if (scrollToVideos === 'true') {
      scrollToSection(videosRef);
    } else if (scrollToAchievements === 'true') {
      scrollToSection(achievementsRef);
    } else if (scrollToFriends === 'true') {
      // Выше нормативов/«упражнений» в цепочке: уведомление о дружбе не уезжает на старый scrollToExercises
      scrollToSection(friendsRef);
      const cu = currentUserRef.current;
      const pl = playerRef.current;
      if (cu && pl && cu.id !== pl.id) {
        const cacheKey = `${Math.min(cu.id, pl.id)}_${Math.max(cu.id, pl.id)}`;
        if (friendshipFetchedForRef.current !== cacheKey) {
          friendshipFetchedForRef.current = cacheKey;
          setFriendshipStatusCache(prev => {
            const newCache = { ...prev };
            delete newCache[cacheKey];
            return newCache;
          });
          getFriendshipStatus(cu.id, pl.id, true).then(status => {
            console.log('📥 Статус дружбы при переходе из уведомления:', status);
            setFriendshipStatus(status);
            setFriendshipStatusCache(prev => ({ ...prev, [cacheKey]: status }));
          });
        }
      }
    } else if (scrollToNormatives === 'true' || scrollToExercises === 'true') {
      // Нормативы ниже по экрану — после фото; ждём отрисовку, при необходимости повторяем measureLayout
      const offset = 100;
      const scrollNormativesSection = (attempt: number) => {
        const delay = attempt === 0 ? 0 : 320;
        setTimeout(() => {
          InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => {
              const target = normativesRef.current;
              const scrollParent = scrollViewRef.current;
              if (!target || !scrollParent) {
                if (attempt < 3) scrollNormativesSection(attempt + 1);
                return;
              }
              target.measureLayout(
                scrollParent as any,
                (x, y) => {
                  scrollParent.scrollTo({ x: 0, y: Math.max(0, y - offset), animated: true });
                },
                () => {
                  if (attempt < 3) scrollNormativesSection(attempt + 1);
                }
              );
            });
          });
        }, delay);
      };
      scrollNormativesSection(0);
    } else if (scrollToGift === 'true') {
      scrollToSection(giftButtonRef);
    } else if (scrollToSpeed === 'true') {
      const scrollSpeed = (attempt: number) => {
        const delay = attempt === 0 ? 80 : 280;
        setTimeout(() => {
          InteractionManager.runAfterInteractions(() => {
            requestAnimationFrame(() => {
              if (puckSpeedRef.current && scrollViewRef.current) {
                puckSpeedRef.current.measureLayout(
                  scrollViewRef.current as any,
                  (_x, y) => {
                    scrollViewRef.current?.scrollTo({ x: 0, y: Math.max(0, y - 50), animated: false });
                  },
                  () => {
                    if (attempt < 4) scrollSpeed(attempt + 1);
                  }
                );
              } else if (attempt < 4) {
                scrollSpeed(attempt + 1);
              }
            });
          });
        }, delay);
      };
      scrollSpeed(0);
    } else if (scrollToAnalysis === 'true') {
      scrollToSection(aiSectionRef, 100);
    }
  }, [scrollToMuseum, scrollToStats, scrollToPhotos, scrollToVideos, scrollToAchievements, scrollToExercises, scrollToNormatives, scrollToFriends, scrollToGift, scrollToSpeed, scrollToAnalysis, player?.id]);


  // Ref для активного поля ввода
  const activeInputRef = useRef<TextInput | null>(null);
  // Refs для полей роста и веса
  const heightInputRef = useRef<TextInput | null>(null);
  const weightInputRef = useRef<TextInput | null>(null);

  // Глобальный слушатель клавиатуры для прокрутки к активному полю
  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        const keyboardHeight = e.endCoordinates?.height || 0;
        setTimeout(() => {
          if (activeInputRef.current && scrollViewRef.current) {
            // Используем measureLayout для получения позиции относительно ScrollView
            activeInputRef.current.measureLayout(
              scrollViewRef.current as any,
              (x, y, width, height) => {
                // y уже относительно ScrollView, получаем размеры экрана
                const screenHeight = Dimensions.get('window').height;
                const visibleArea = screenHeight - keyboardHeight;
                // Вычисляем позицию низа поля относительно ScrollView
                const inputBottom = y + height;
                // Вычисляем, насколько нужно прокрутить, чтобы поле было видно
                // visibleArea - это видимая область над клавиатурой
                // Нужно прокрутить так, чтобы низ поля был на visibleArea - 150px от верха
                const targetY = inputBottom - visibleArea + 130; // 130px отступ сверху (увеличено еще на 3px)
                
                if (targetY > 0) {
                  scrollViewRef.current?.scrollTo({ 
                    y: targetY, 
                    animated: true 
                  });
                }
              },
              () => {
                // Fallback: используем measure если measureLayout не работает
                activeInputRef.current?.measure((x, y, width, height, pageX, pageY) => {
                  const screenHeight = Dimensions.get('window').height;
                  const visibleArea = screenHeight - keyboardHeight;
                  const inputBottom = pageY + height;
                  const scrollOffset = inputBottom - visibleArea + 130; // 130px отступ сверху (увеличено еще на 3px)
                  
                  if (scrollOffset > 0) {
                    scrollViewRef.current?.scrollTo({ 
                      y: scrollOffset, 
                      animated: true 
                    });
                  }
                });
              }
            );
          }
        }, Platform.OS === 'ios' ? 100 : 300);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
    };
  }, []);

  // Обработчик фокуса для всех полей ввода
  const handleInputFocus = (e: any) => {
    // Сохраняем ref активного поля через event
    const target = e?.target as any;
    if (target && target.measure) {
      activeInputRef.current = target;
    }
  };

  // Обработчик фокуса для полей роста и веса
  const handleHeightFocus = () => {
    if (heightInputRef.current) {
      activeInputRef.current = heightInputRef.current;
    }
  };

  const handleWeightFocus = () => {
    if (weightInputRef.current) {
      activeInputRef.current = weightInputRef.current;
    }
  };

  const showCustomAlert = (
    title: string, 
    message: string, 
    type: 'success' | 'error' | 'warning' | 'info' = 'info', 
    onConfirm?: () => void,
    showCancel?: boolean,
    onCancel?: () => void
  ) => {
    setAlert({
      visible: true,
      title,
      message,
      type,
      onConfirm: onConfirm || (() => setAlert(prev => ({ ...prev, visible: false }))),
      onCancel: onCancel || (() => setAlert(prev => ({ ...prev, visible: false }))),
      onSecondary: () => {},
      showCancel: showCancel || false,
      showSecondary: false,
      confirmText: t('common.ok'),
      cancelText: t('profile.cancel') || t('common.cancel'),
      secondaryText: t('profile.additional')
    });
  };

  const pickImage = async () => {
    // Показываем системное окно выбора источника фото
    Alert.alert(
      t('selectPhotoSource'),
      t('selectPhotoMessage') || t('selectPhotoSource'),
      [
        {
          text: t('gallery'),
          onPress: () => {
            pickFromGallery();
          }
        },
        {
          text: t('camera'),
          onPress: () => {
            takePhoto();
          }
        },
        {
          text: t('cancel'),
          style: 'cancel'
        }
      ]
    );
  };

  const pickFromGallery = async () => {
    try {
      // На Android 13+ (API 33+) используем Photo Picker без разрешений
      // На старых версиях Android запрашиваем разрешения
      let result;
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        // Android 13+ использует Photo Picker автоматически, разрешения не нужны
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7, // Уменьшаем качество для экономии места
        });
      } else {
        // Для старых версий Android запрашиваем разрешения
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (status !== 'granted') {
          showCustomAlert('Ошибка', 'Нет доступа к галерее', 'error');
          return;
        }

        // Открываем галерею для выбора фото
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.7, // Уменьшаем качество для экономии места
        });
      }

      if (!result.canceled && result.assets[0]) {
        const newAvatarUri = result.assets[0].uri;
        // Очищаем кеш аватара для немедленного обновления
        const { avatarCache } = await import('../../utils/AvatarCache');
        avatarCache.clearAvatar(player.id);
        setEditData({...editData, avatar: newAvatarUri});
      }
    } catch (error) {
      console.error('❌ Ошибка выбора фото из галереи:', error);
      showCustomAlert('Ошибка', 'Ошибка выбора фото', 'error');
    }
  };

  const takePhoto = async () => {
    try {
      // Запрашиваем разрешение на доступ к камере
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        showCustomAlert('Ошибка', 'Нет доступа к камере', 'error');
        return;
      }

      // Открываем камеру для съемки фото
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7, // Уменьшаем качество для экономии места
      });

      if (!result.canceled && result.assets[0]) {
        const newAvatarUri = result.assets[0].uri;
        // Очищаем кеш аватара для немедленного обновления
        const { avatarCache } = await import('../../utils/AvatarCache');
        avatarCache.clearAvatar(player.id);
        setEditData({...editData, avatar: newAvatarUri});
      }
    } catch (error) {
      console.error('❌ Ошибка при съемке фото:', error);
      showCustomAlert('Ошибка', 'Ошибка съемки фото', 'error');
    }
  };

  const shareProfile = async () => {
    try {
      if (!shareCardRef.current || !player) {
        return;
      }

      // Захватываем изображение карточки профиля
      const uri = await captureRef(shareCardRef, {
        format: 'png',
        quality: 1.0,
        result: 'tmpfile',
      });

      console.log('📸 Изображение создано:', uri);

      // Проверяем доступность шеринга
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        // Открываем меню шеринга
        await Sharing.shareAsync(uri, {
          mimeType: 'image/png',
          dialogTitle: t('profile.shareProfile') || 'Поделиться профилем',
        });
      } else {
        // Если шеринг недоступен, сохраняем в галерею
        const { status } = await MediaLibrary.requestPermissionsAsync();
        
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(uri);
          showCustomAlert(
            t('common.success') || 'Успешно',
            t('profile.savedToGallery') || 'Сохранено в галерею',
            'success'
          );
        } else {
          showCustomAlert(
            t('common.error') || 'Ошибка',
            t('profile.noPermission') || 'Нет доступа к галерее',
            'error'
          );
        }
      }
    } catch (error) {
      console.error('❌ Ошибка при создании/отправке изображения:', error);
      showCustomAlert(
        t('common.error') || 'Ошибка',
        t('profile.shareError') || 'Ошибка при создании изображения',
        'error'
      );
    }
  };

  // --- AI Analysis helpers ---

  /** Returns true if the player profile has enough data for analysis */
  const checkProfileCompleteness = (
    p: Player,
    teams: { current: PastTeam[]; past: PastTeam[] }
  ): { complete: boolean; missing: string[] } => {
    const missing: string[] = [];
    if (!p.avatar) missing.push('Profile photo');
    if (!p.position) missing.push('Position');
    if (!p.country) missing.push('Country');
    if (!p.birthDate) missing.push('Date of birth');
    if (!p.height || p.height === '0') missing.push('Height');
    if (!p.weight || p.weight === '0') missing.push('Weight');
    if (!p.grip) missing.push('Stick grip');
    const hasTeams = (teams.current?.length || 0) + (teams.past?.length || 0) > 0;
    if (!hasTeams) missing.push(t('profile.teams') || 'Team');
    const isGoalie = p.position === 'goalie';
    if (isGoalie) {
      if (!p.games && !p.minutes && !p.shots) missing.push('Season stats (games/shots/saves)');
    } else {
      if (!p.goals && !p.assists && !p.games) missing.push('Season stats (goals/assists/games)');
    }
    return { complete: missing.length === 0, missing };
  };

  const handleGenerateAnalysis = async () => {
    if (!player || !currentUser || currentUser.id !== player.id) return;
    if (isGeneratingAnalysis) return;

    setIsGeneratingAnalysis(true);
    try {
      const functionUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co/functions/v1/generate-ai-analysis';
      const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          player_id: player.id,
          language,
          game_videos: gameVideoLinks.filter(v => v.trim() !== ''),
        }),
      });

      const data = await response.json();

      if (response.status === 429) {
        showCustomAlert('Limit Reached', data.message || 'You have used all 5 analyses for this month.', 'info');
        return;
      }

      if (!response.ok || data.error) {
        showCustomAlert('Error', data.error || 'Failed to generate analysis', 'error');
        return;
      }

      const newAnalysis: AIAnalysis = {
        text: data.analysis,
        generated_at: new Date().toISOString(),
        is_public: aiAnalysis?.is_public ?? true,
        translations: {},
        generation_language: language,
        has_video_analysis: !!data.has_video_analysis,
      };
      setAiAnalysis(newAnalysis);
      setAiUsageCount(data.count || aiUsageCount + 1);

      const vids = gameVideoLinks.filter(v => v.trim() !== '');
      if (vids.length > 0) {
        await supabase.from('players').update({ game_videos: JSON.stringify(vids) }).eq('id', player.id);
      }

      // Update local player state
      setPlayer(prev =>
        prev
          ? { ...prev, aiAnalysis: newAnalysis, gameVideos: vids.length > 0 ? vids : prev.gameVideos }
          : prev
      );
      setPlayersCache(prev => {
        const pid = player.id;
        const row = prev[pid];
        if (!row) return prev;
        return {
          ...prev,
          [pid]: {
            ...row,
            aiAnalysis: newAnalysis,
            gameVideos: vids.length > 0 ? vids : row.gameVideos,
          },
        };
      });

      // Уведомляем друзей о скаутском отчёте
      notifyFriendsAboutScoutReport(player.id, player.name || 'Player').catch(() => {});
    } catch (err: any) {
      showCustomAlert('Error', err.message || 'Network error', 'error');
    } finally {
      setIsGeneratingAnalysis(false);
    }
  };

  const handleTranslateAnalysis = async (lang: string): Promise<string> => {
    if (!player) return '';

    const functionUrl = 'https://jvsypfwiajuwsyuzkyda.supabase.co/functions/v1/generate-ai-analysis';
    const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2c3lwZndpYWp1d3N5dXpreWRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM5OTczNTcsImV4cCI6MjA2OTU3MzM1N30.8d8k7HK7lFgIirdHzackMYRn6gGgD5OyqgOUq2rk2RM';

    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${anonKey}`,
        'apikey': anonKey,
      },
      body: JSON.stringify({ player_id: player.id, action: 'translate', target_lang: lang }),
    });

    const data = await response.json();
    if (!response.ok || data.error) throw new Error(data.error || 'Translation failed');

    const translated = data.translation;
    if (!translated || typeof translated !== 'string') {
      throw new Error('Invalid translation response');
    }
    // Update local cache
    setAiAnalysis(prev => prev ? {
      ...prev,
      translations: { ...(prev.translations || {}), [lang]: translated },
    } : prev);
    return translated;
  };

  const handleToggleAnalysisPublic = async (isPublic: boolean) => {
    if (!player || !aiAnalysis) return;
    const updated: AIAnalysis = { ...aiAnalysis, is_public: isPublic };
    setAiAnalysis(updated);
    await supabase.from('players').update({ ai_analysis: updated }).eq('id', player.id);
  };

  const handleDeleteAnalysis = async () => {
    if (!player || !currentUser || currentUser.id !== player.id) return;
    if (!aiAnalysis) return;
    const { error } = await supabase.from('players').update({ ai_analysis: null }).eq('id', player.id);
    if (error) {
      showCustomAlert('Error', error.message || 'Failed to delete report', 'error');
      return;
    }
    setAiAnalysis(null);
    setPlayer(prev => (prev ? { ...prev, aiAnalysis: undefined } : prev));
    setPlayersCache(prev => {
      const pid = player.id;
      const row = prev[pid];
      if (!row) return prev;
      return { ...prev, [pid]: { ...row, aiAnalysis: undefined } };
    });
  };

  // ---------------------------

  const showBirthDatePickerModal = () => {
    // Устанавливаем текущую дату рождения или сегодняшнюю дату
    if (editData.birthDate || player?.birthDate) {
      const dateStr = editData.birthDate || player?.birthDate || '';
      const parts = dateStr.split('.');
      if (parts.length === 3) {
        const day = parseInt(parts[0]);
        const month = parseInt(parts[1]) - 1; // Месяцы в JS начинаются с 0
        const year = parseInt(parts[2]);
        setSelectedBirthDate(new Date(year, month, day));
      } else {
        setSelectedBirthDate(new Date());
      }
    } else {
      setSelectedBirthDate(new Date());
    }
    setShowBirthDatePicker(true);
  };

  const onBirthDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'ios') {
      // На iOS календарь не закрывается автоматически
      if (date) {
        setSelectedBirthDate(date);
      }
    } else {
      // На Android календарь закрывается только при полном выборе
      if (event.type === 'set' && date) {
        setShowBirthDatePicker(false);
        setSelectedBirthDate(date);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString();
        const formattedDate = `${day}.${month}.${year}`;
        setEditData({...editData, birthDate: formattedDate});
      } else if (event.type === 'dismissed') {
        setShowBirthDatePicker(false);
      }
    }
  };

  // Функция для показа календаря выбора месяца и года начала хоккея
  const showHockeyStartDatePickerModal = () => {
    // Устанавливаем текущую дату начала хоккея или сегодняшнюю дату
    if (editData.hockeyStartDate || player?.hockeyStartDate) {
      const dateStr = editData.hockeyStartDate || player?.hockeyStartDate || '';
      // Формат может быть MM.YYYY или YYYY-MM-DD
      if (dateStr.includes('.')) {
        const parts = dateStr.split('.');
        if (parts.length === 2) {
          // Формат MM.YYYY
          const month = parseInt(parts[0]) - 1; // Месяцы в JS начинаются с 0
          const year = parseInt(parts[1]);
          setSelectedHockeyStartDate(new Date(year, month, 1));
        } else if (parts.length === 3) {
          // Формат DD.MM.YYYY
          const month = parseInt(parts[1]) - 1;
          const year = parseInt(parts[2]);
          setSelectedHockeyStartDate(new Date(year, month, 1));
        } else {
          setSelectedHockeyStartDate(new Date());
        }
      } else if (dateStr.includes('-')) {
        // Формат YYYY-MM-DD
        const [yearStr, monthStr] = dateStr.split('-');
        const year = parseInt(yearStr);
        const month = parseInt(monthStr) - 1;
        setSelectedHockeyStartDate(new Date(year, month, 1));
      } else {
        setSelectedHockeyStartDate(new Date());
      }
    } else {
      setSelectedHockeyStartDate(new Date());
    }
    setShowHockeyStartDatePicker(true);
  };

  // Функция для обработки выбора месяца и года начала хоккея
  const onHockeyStartDateChange = (event: any, date?: Date) => {
    if (Platform.OS === 'ios') {
      // На iOS календарь не закрывается автоматически
      if (date) {
        setSelectedHockeyStartDate(date);
      }
    } else {
      // На Android календарь закрывается только при полном выборе
      if (event.type === 'set' && date) {
        setShowHockeyStartDatePicker(false);
        setSelectedHockeyStartDate(date);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear().toString();
        const formattedDate = `${month}.${year}`;
        setEditData({...editData, hockeyStartDate: formattedDate});
      } else if (event.type === 'dismissed') {
        setShowHockeyStartDatePicker(false);
      }
    }
  };

  // Функция для форматирования даты в читаемый вид
  const formatBirthDate = (dateString: string, language: string = 'ru'): string => {
    if (!dateString) return t('profile.notSpecified');
    
    try {
      let day, month, year;
      
      // Проверяем формат YYYY-MM-DD (из базы данных)
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        const [yearStr, monthStr, dayStr] = dateString.split('-');
        year = parseInt(yearStr);
        month = parseInt(monthStr);
        day = parseInt(dayStr);
      }
      // Проверяем формат DD.MM.YYYY (старый формат)
      else if (dateString.includes('.')) {
        [day, month, year] = dateString.split('.').map(Number);
      }
      else {
        return t('profile.notSpecified');
      }
      
      if (!day || !month || !year) {
        return t('profile.notSpecified');
      }
      
      // Форматируем в нужный формат DD.MM.YYYY
      const formattedDay = day.toString().padStart(2, '0');
      const formattedMonth = month.toString().padStart(2, '0');
      return `${formattedDay}.${formattedMonth}.${year}`;
    } catch (error) {
      console.error('❌ Ошибка форматирования даты:', error);
      return t('profile.notSpecified');
    }
  };

  const handleSendMessage = () => {
    if (!currentUser) {
      showCustomAlert('Ошибка', 'Необходимо войти в профиль для отправки сообщений', 'error', () => router.push('/login'));
      return;
    }
    
    // Открываем чат с игроком
    router.push({ pathname: '/chat/[id]', params: { id: player!.id } });
  };

  const reportUser = React.useCallback(async () => {
    if (!currentUser || !player || currentUser.id === player.id) {
      return;
    }

    try {
      const { data: admins, error: adminsError } = await supabase
        .from('players')
        .select('id, name')
        .eq('status', 'admin');

      if (adminsError) {
        console.error('❌ Ошибка получения списка админов:', adminsError);
        showCustomAlert(t('common.error'), t('admin.error') || 'Ошибка', 'error');
        return;
      }

      if (!admins || admins.length === 0) {
        console.log('ℹ️ Админы не найдены');
      }

      const adminIds = admins.map(admin => admin.id);
      const { data: pushTokens, error: tokensError } = await supabase
        .from('push_tokens')
        .select('user_id, token')
        .in('user_id', adminIds);

      if (tokensError) {
        console.error('❌ Ошибка получения push токенов:', tokensError);
      }

      const tokensMap = new Map<string, string[]>();
      if (pushTokens) {
        pushTokens.forEach(pt => {
          if (!tokensMap.has(pt.user_id)) {
            tokensMap.set(pt.user_id, []);
          }
          tokensMap.get(pt.user_id)!.push(pt.token);
        });
      }

      const generateUUID = (): string => {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = Math.random() * 16 | 0;
          const v = c === 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });
      };

      const { getUserLanguages, localizedAdminReportText } = await import('../../utils/languageHelper');
      const adminLangMap = await getUserLanguages(adminIds);

      const notifications = admins.map(admin => {
        const adminLang = adminLangMap.get(admin.id) || 'en';
        const reportText = localizedAdminReportText(adminLang, 'reportNotification', {
          reporterName: currentUser.name,
          reportedName: player.name,
        });
        return {
        id: generateUUID(),
        user_id: admin.id,
        type: 'user_report',
        title: reportText,
        message: reportText,
        data: {
          reporterId: currentUser.id,
          reporterName: currentUser.name,
          reporterAvatar: currentUser.avatar,
          reportedId: player.id,
          reportedName: player.name,
          reportedAvatar: player.avatar,
          timestamp: new Date().toISOString()
        },
        created_at: new Date().toISOString(),
        is_read: false
      };
      });

      if (notifications.length > 0) {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert(notifications);

        if (notificationError) {
          console.error('❌ Ошибка создания уведомлений о жалобе:', notificationError);
        } else {
          for (const admin of admins) {
            const adminTokens = tokensMap.get(admin.id);
            if (adminTokens && adminTokens.length > 0) {
              try {
                const { sendNotificationToUser } = await import('../../utils/notificationService');
                const adminLang = adminLangMap.get(admin.id) || 'en';
                const pushText = localizedAdminReportText(adminLang, 'reportNotification', {
                  reporterName: currentUser.name,
                  reportedName: player.name,
                });
                await sendNotificationToUser(
                  admin.id,
                  pushText,
                  '',
                  {
                    type: 'user_report',
                    reporterId: currentUser.id,
                    reportedId: player.id
                  }
                );
              } catch (error) {
                console.warn(`Не удалось отправить push-уведомление админу ${admin.name}:`, error);
              }
            }
          }
        }
      }

      showCustomAlert(
        t('admin.reportUserTitle') || 'Жалоба отправлена',
        t('admin.reportUserMessage') || 'Жалоба отправлена администратору. Мы свяжемся с Вами, если нужны будут подробности.',
        'success'
      );
    } catch (error) {
      console.error('❌ Ошибка отправки жалобы:', error);
      showCustomAlert(t('common.error'), t('admin.error') || 'Ошибка', 'error');
    }
  }, [currentUser, player, showCustomAlert, t]);

  const handleReportUser = React.useCallback(() => {
    // Нельзя пожаловаться на админа или быть админом и жаловаться на кого-то
    if (!currentUser || !player || currentUser.id === player.id || 
        player.status === 'admin' || currentUser.status === 'admin') {
      return;
    }

    Alert.alert(
      t('admin.reportUser') || t('profile.reportUser') || 'Пожаловаться',
      t('admin.reportUserConfirm', { name: player.name }) || `Вы уверены, что хотите пожаловаться на ${player.name}?`,
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        { text: t('common.confirm') || 'OK', onPress: () => reportUser() }
      ]
    );
  }, [currentUser, player, reportUser, t]);

  // Проверка блокировки пользователя
  useEffect(() => {
    const checkBlockedStatus = async () => {
      if (!currentUser || !player || currentUser.id === player.id) {
        return;
      }
      const blocked = await isUserBlocked(currentUser.id, player.id);
      setIsUserBlockedState(blocked);
    };
    checkBlockedStatus();
  }, [currentUser, player]);

  // Обработчик открытия меню профиля
  const handleOpenProfileMenu = (event: any) => {
    if (!currentUser || !player) {
      return;
    }
    // Используем координаты из события, если доступны
    if (event?.nativeEvent) {
      const { pageX, pageY } = event.nativeEvent;
      if (profileMenuButtonRef.current) {
        profileMenuButtonRef.current.measure((x, y, width, height, measuredPageX, measuredPageY) => {
          setProfileMenuPosition({ x: measuredPageX + width, y: measuredPageY + height });
          setProfileMenuVisible(true);
        });
      } else {
        // Fallback: используем координаты из события
        setProfileMenuPosition({ x: pageX || 0, y: (pageY || 0) + 30 });
        setProfileMenuVisible(true);
      }
    } else if (profileMenuButtonRef.current) {
      profileMenuButtonRef.current.measure((x, y, width, height, pageX, pageY) => {
        setProfileMenuPosition({ x: pageX + width, y: pageY + height });
        setProfileMenuVisible(true);
      });
    }
  };

  // Обработчик закрытия меню профиля
  const handleCloseProfileMenu = () => {
    setProfileMenuVisible(false);
  };

  // Обработчик блокировки пользователя
  const handleBlockUser = React.useCallback(async () => {
    // Нельзя блокировать админа или быть админом и блокировать кого-то
    if (!currentUser || !player || currentUser.id === player.id || isBlockingUser || 
        player.status === 'admin' || currentUser.status === 'admin') {
      return;
    }

    handleCloseProfileMenu();

    Alert.alert(
      t('profile.blockUser') || 'Заблокировать пользователя',
      t('profile.blockUserConfirm', { name: player.name }) || `Вы уверены, что хотите заблокировать ${player.name}?`,
      [
        { text: t('common.cancel') || 'Отмена', style: 'cancel' },
        { 
          text: t('profile.block') || 'Заблокировать', 
          style: 'destructive',
          onPress: async () => {
            setIsBlockingUser(true);
            try {
              const success = await blockUser(currentUser.id, player.id);
              if (success) {
                setIsUserBlockedState(true);
                showCustomAlert(
                  t('profile.blockUserTitle') || 'Пользователь заблокирован',
                  t('profile.blockUserMessage', { name: player.name }) || `${player.name} был заблокирован. Он не увидит Ваш профиль, не сможет написать Вам и не получит уведомления о том, что был заблокирован Вами.`,
                  'success'
                );
              } else {
                showCustomAlert(t('common.error') || 'Ошибка', t('profile.blockUserError') || 'Не удалось заблокировать пользователя', 'error');
              }
            } catch (error) {
              console.error('❌ Ошибка блокировки пользователя:', error);
              showCustomAlert(t('common.error') || 'Ошибка', t('profile.blockUserError') || 'Не удалось заблокировать пользователя', 'error');
            } finally {
              setIsBlockingUser(false);
            }
          }
        }
      ]
    );
  }, [currentUser, player, isBlockingUser, t]);

  // Обработчик разблокировки пользователя
  const handleUnblockUser = React.useCallback(async () => {
    // Нельзя разблокировать админа или быть админом и разблокировать кого-то
    if (!currentUser || !player || currentUser.id === player.id || isBlockingUser || 
        player.status === 'admin' || currentUser.status === 'admin') {
      return;
    }

    handleCloseProfileMenu();

    Alert.alert(
      t('profile.unblockUser') || 'Разблокировать пользователя',
      t('profile.unblockUserConfirm', { name: player.name }) || `Вы уверены, что хотите разблокировать ${player.name}?`,
      [
        { text: t('common.cancel') || 'Отмена', style: 'cancel' },
        { 
          text: t('profile.unblock') || 'Разблокировать', 
          style: 'default',
          onPress: async () => {
            setIsBlockingUser(true);
            try {
              const success = await unblockUser(currentUser.id, player.id);
              if (success) {
                setIsUserBlockedState(false);
                showCustomAlert(
                  t('profile.unblockUserTitle') || 'Пользователь разблокирован',
                  t('profile.unblockUserMessage') || 'Пользователь был разблокирован.',
                  'success'
                );
              } else {
                showCustomAlert(t('common.error') || 'Ошибка', t('profile.unblockUserError') || 'Не удалось разблокировать пользователя', 'error');
              }
            } catch (error) {
              console.error('❌ Ошибка разблокировки пользователя:', error);
              showCustomAlert(t('common.error') || 'Ошибка', t('profile.unblockUserError') || 'Не удалось разблокировать пользователя', 'error');
            } finally {
              setIsBlockingUser(false);
            }
          }
        }
      ]
    );
  }, [currentUser, player, isBlockingUser, t]);

  // Обработчик жалобы из меню
  const handleReportFromMenu = React.useCallback(() => {
    handleCloseProfileMenu();
    handleReportUser();
  }, [handleReportUser]);

  const handleHideProfile = async () => {
    if (!currentUser || currentUser.status !== 'admin' || !player) {
      return;
    }

    try {
      // Проверяем, существует ли колонка is_hidden
      // Если нет - показываем сообщение о необходимости добавить колонку
      const { error } = await supabase
        .from('players')
        .update({ is_hidden: true })
        .eq('id', player.id);

      if (error) {
        console.error('❌ Ошибка скрытия профиля:', error);
        // Если колонка не существует, показываем специальное сообщение
        if (error.code === 'PGRST204' || error.message?.includes('is_hidden')) {
          showCustomAlert(
            t('common.error') || 'Ошибка',
            'Колонка is_hidden не найдена в базе данных. Пожалуйста, выполните SQL скрипт database/add_is_hidden_column.sql',
            'error'
          );
        } else {
          showCustomAlert(t('common.error'), t('admin.error') || 'Ошибка', 'error');
        }
      } else {
        // Очищаем кеш для этого игрока
        await clearPlayerCache(player.id);
        
        // Очищаем кеш всех игроков для главного экрана, чтобы изменения отображались сразу
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.removeItem('all_players');
        
        // Сразу обновляем состояние с новым значением is_hidden
        setPlayer({ ...player, is_hidden: true });
        
        showCustomAlert(
          t('common.success') || 'Успешно',
          t('admin.hideProfileSuccess', { name: player.name }) || `Профиль ${player.name} скрыт`,
          'success'
        );
      }
    } catch (error) {
      console.error('❌ Ошибка скрытия профиля:', error);
      showCustomAlert(t('common.error'), t('admin.error') || 'Ошибка', 'error');
    }
  };

  const handleUnhideProfile = async () => {
    if (!currentUser || currentUser.status !== 'admin' || !player) {
      return;
    }

    try {
      const { error } = await supabase
        .from('players')
        .update({ is_hidden: false })
        .eq('id', player.id);

      if (error) {
        console.error('❌ Ошибка показа профиля:', error);
        // Если колонка не существует, показываем специальное сообщение
        if (error.code === 'PGRST204' || error.message?.includes('is_hidden')) {
          showCustomAlert(
            t('common.error') || 'Ошибка',
            'Колонка is_hidden не найдена в базе данных. Пожалуйста, выполните SQL скрипт database/add_is_hidden_column.sql',
            'error'
          );
        } else {
          showCustomAlert(t('common.error'), t('admin.error') || 'Ошибка', 'error');
        }
      } else {
        // Очищаем кеш для этого игрока
        await clearPlayerCache(player.id);
        
        // Очищаем кеш всех игроков для главного экрана, чтобы изменения отображались сразу
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.removeItem('all_players');
        
        // Сразу обновляем состояние с новым значением is_hidden
        setPlayer({ ...player, is_hidden: false });
        
        showCustomAlert(
          t('common.success') || 'Успешно',
          t('admin.unhideProfileSuccess', { name: player.name }) || `Профиль ${player.name} показан`,
          'success'
        );
      }
    } catch (error) {
      console.error('❌ Ошибка показа профиля:', error);
      showCustomAlert(t('common.error'), t('admin.error') || 'Ошибка', 'error');
    }
  };

  const handleAddFriend = async () => {
    console.log('🔘 handleAddFriend вызван:', {
      friendLoading,
      friendshipStatus,
      currentUserId: currentUser?.id,
      playerId: player?.id,
      playerName: player?.name
    });

    // Защита от повторных вызовов
    if (friendLoading) {
      return;
    }

    if (!currentUser || !player) {
      showCustomAlert('Ошибка', 'Необходимо войти в профиль для добавления в друзья', 'error', () => router.push('/login'));
      return;
    }

      const cacheKey = `${Math.min(currentUser.id, player.id)}_${Math.max(currentUser.id, player.id)}`;
    const previousStatus = friendshipStatus;
    
    // ОПТИМИСТИЧНОЕ ОБНОВЛЕНИЕ - сразу меняем UI, запрос в фоне
    setFriendLoading(true);
          lastManualStatusChangeRef.current = Date.now();

    const releaseFriendLoading = () => setFriendLoading(false);
    const loadingGuard = setTimeout(releaseFriendLoading, 28000);
    const doneFriendAction = () => {
      clearTimeout(loadingGuard);
      releaseFriendLoading();
    };
          
    if (friendshipStatus === 'friends') {
      // Удаляем из друзей - сразу показываем "добавить"
          setFriendshipStatus('none');
      setFriendshipStatusCache(prev => ({ ...prev, [cacheKey]: 'none' }));
      
      removeFriend(currentUser.id, player.id).then(success => {
        if (!success) {
          // Откатываем при ошибке
          setFriendshipStatus(previousStatus);
          setFriendshipStatusCache(prev => ({ ...prev, [cacheKey]: previousStatus }));
          showCustomAlert(t('common.error'), t('profile.removeFriendError'), 'error');
        }
      }).catch(error => {
        setFriendshipStatus(previousStatus);
        setFriendshipStatusCache(prev => ({ ...prev, [cacheKey]: previousStatus }));
        showCustomAlert(t('common.error'), t('profile.removeFriendError'), 'error');
      }).finally(doneFriendAction);
      
      } else if (friendshipStatus === 'none') {
      // КРИТИЧЕСКАЯ ПРОВЕРКА перед отправкой запроса
      if (!currentUser?.id || !player?.id) {
        console.error('❌ [FRIEND_REQUEST] КРИТИЧЕСКАЯ ОШИБКА: currentUser.id или player.id пустые!', {
          currentUserId: currentUser?.id,
          playerId: player?.id
        });
        clearTimeout(loadingGuard);
        setFriendLoading(false);
        showCustomAlert(t('common.error'), 'Ошибка: некорректные данные пользователя', 'error');
        return;
      }
      
      if (currentUser.id === player.id) {
        console.error('❌ [FRIEND_REQUEST] КРИТИЧЕСКАЯ ОШИБКА: currentUser.id равен player.id!', {
          currentUserId: currentUser.id,
          playerId: player.id
        });
        clearTimeout(loadingGuard);
        setFriendLoading(false);
        showCustomAlert(t('common.error'), 'Нельзя отправить запрос самому себе', 'error');
        return;
      }
      
      console.log('📤 [FRIEND_REQUEST] Отправка запроса дружбы:', {
        fromId: currentUser.id,
        fromName: currentUser.name,
        toId: player.id,
        toName: player.name
      });
          
      // Отправляем запрос - сразу показываем "отменить запрос"
          setFriendshipStatus('sent_request');
      setFriendshipStatusCache(prev => ({ ...prev, [cacheKey]: 'sent_request' }));
      
      sendFriendRequest(currentUser.id, player.id).then(success => {
        if (success) {
          addActivityPoints(currentUser.id, 'FRIEND_ADD').catch(() => {});
        } else {
          // Откатываем при ошибке
          setFriendshipStatus(previousStatus);
          setFriendshipStatusCache(prev => ({ ...prev, [cacheKey]: previousStatus }));
          showCustomAlert(t('common.error'), t('profile.friendRequestError') || 'Не удалось отправить запрос дружбы', 'error');
        }
      }).catch(error => {
        // Откатываем при ошибке
        setFriendshipStatus(previousStatus);
        setFriendshipStatusCache(prev => ({ ...prev, [cacheKey]: previousStatus }));
        showCustomAlert(t('common.error'), t('profile.friendRequestError') || 'Не удалось отправить запрос дружбы', 'error');
      }).finally(doneFriendAction);
      
    } else if (friendshipStatus === 'sent_request' || friendshipStatus === 'pending') {
      // Отменяем запрос - сразу показываем "добавить"
          setFriendshipStatus('none');
      setFriendshipStatusCache(prev => ({ ...prev, [cacheKey]: 'none' }));
      
      cancelFriendRequest(currentUser.id, player.id).then(success => {
        if (!success) {
          // Откатываем при ошибке
          setFriendshipStatus(previousStatus);
          setFriendshipStatusCache(prev => ({ ...prev, [cacheKey]: previousStatus }));
          showCustomAlert(t('common.error'), t('profile.friendRequestCancelError'), 'error');
        }
      }).catch(error => {
        setFriendshipStatus(previousStatus);
        setFriendshipStatusCache(prev => ({ ...prev, [cacheKey]: previousStatus }));
        showCustomAlert(t('common.error'), t('profile.friendRequestCancelError'), 'error');
      }).finally(doneFriendAction);
      
    } else if (friendshipStatus === 'received_request') {
      // Принимаем запрос - сразу показываем "друзья"
          setFriendshipStatus('friends');
      setFriendshipStatusCache(prev => ({ ...prev, [cacheKey]: 'friends' }));
      
      // Счётчик обновится автоматически через Realtime подписку в _layout.tsx

      acceptFriendRequest(currentUser.id, player.id).then(success => {
        if (success) {
          // Пользователь остаётся на том же месте - не меняем позицию прокрутки
          console.log('✅ Запрос дружбы принят');
          
          // Кеш будет очищен автоматически через Realtime обновления
          // Не вызываем clearPlayerCache чтобы избежать нежелательных редиректов
        } else {
          // Откатываем при ошибке
          setFriendshipStatus(previousStatus);
          setFriendshipStatusCache(prev => ({ ...prev, [cacheKey]: previousStatus }));
          showCustomAlert(t('common.error'), t('profile.friendRequestAcceptError'), 'error');
        }
      }).catch(error => {
        // Откатываем при ошибке
        setFriendshipStatus(previousStatus);
        setFriendshipStatusCache(prev => ({ ...prev, [cacheKey]: previousStatus }));
        showCustomAlert(t('common.error'), t('profile.friendRequestAcceptError'), 'error');
      }).finally(doneFriendAction);
    } else {
      clearTimeout(loadingGuard);
      setFriendLoading(false);
    }
  };

  const handleRequestGift = async () => {
    if (!requestGiftMessage.trim()) {
      Alert.alert(t('common.error'), t('gifts.pleaseWriteMessage') || 'Пожалуйста, напишите сообщение');
      return;
    }

    if (!currentUser || !player) return;

    try {
      setRequestGiftLoading(true);
      
      const { error } = await supabase
        .from('item_requests')
        .insert([{
          requester_id: currentUser.id,
          owner_id: player.id,
          item_type: 'jersey', // Используем 'jersey' как универсальный тип (так как 'custom' не поддерживается в БД)
          message: requestGiftMessage.trim(),
          status: 'pending'
        }]);

      if (error) {
        console.error('Ошибка создания запроса:', error);
        Alert.alert(t('common.error'), t('gifts.failedToSendRequest') || 'Не удалось отправить запрос');
        return;
      }

      // Создаем уведомление для звезды
      try {
        const { getUserLanguage, loadTranslations } = await import('../../utils/languageHelper');
        const { getUserPushTokens, sendPushNotification } = await import('../../utils/notificationService');
        
        // Функция для генерации UUID v4
        const generateUUID = (): string => {
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };
        
        const starLanguage = await getUserLanguage(player.id);
        const starTranslations = loadTranslations(starLanguage);
        
        const notificationTitle = starTranslations?.notifications?.giftRequest || (starLanguage === 'ru' ? 'Запрос на подарок' : 'Gift request');
        const notificationMessage = starTranslations?.notifications?.giftRequestMessage 
          ? starTranslations.notifications.giftRequestMessage.replace('{playerName}', currentUser.name || 'Игрок')
          : starLanguage === 'ru'
            ? `${currentUser.name || 'Игрок'} просит подарок`
            : `${currentUser.name || 'Player'} requests a gift`;

        // Создаем in-app уведомление
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert([{
            id: generateUUID(),
            user_id: player.id,
            type: 'gift_request',
            title: notificationTitle,
            message: notificationMessage,
            is_read: false,
            data: {
              requesterId: currentUser.id,
              requesterName: currentUser.name,
              requesterAvatar: currentUser.avatar,
              requestMessage: requestGiftMessage.trim(),
              itemType: 'jersey',
              timestamp: new Date().toISOString()
            }
          }]);

        if (notificationError) {
          console.error('Ошибка создания уведомления:', notificationError);
        } else {
          // Обновляем счетчик уведомлений
          const { data: playerData } = await supabase
            .from('players')
            .select('unread_notifications_count')
            .eq('id', player.id)
            .single();

          const currentCount = playerData?.unread_notifications_count || 0;
          const newCount = currentCount + 1;

          await supabase
            .from('players')
            .update({ unread_notifications_count: newCount })
            .eq('id', player.id);

          // Отправляем push-уведомление
          try {
            const pushTokens = await getUserPushTokens(player.id);
            if (pushTokens && pushTokens.length > 0) {
              await sendPushNotification(
                pushTokens,
                notificationTitle,
                notificationMessage,
                { sound: 'not.m4a' }
              );
            }
          } catch (pushError) {
            console.error('Ошибка отправки push-уведомления:', pushError);
          }
        }
      } catch (notificationError) {
        console.error('Ошибка создания уведомления:', notificationError);
        // Не прерываем выполнение, если уведомление не создалось
      }

      setShowRequestGiftModal(false);
      setRequestGiftMessage('');
      Alert.alert(
        t('gifts.requestSent') || 'Запрос отправлен', 
        t('gifts.requestSentMessage', { itemType: t('gifts.customGift') || 'подарок' }) || 'Ваш запрос отправлен звезде'
      );
    } catch (error) {
      console.error('Ошибка создания запроса:', error);
      Alert.alert(t('common.error'), t('gifts.failedToSendRequest') || 'Не удалось отправить запрос');
    } finally {
      setRequestGiftLoading(false);
    }
  };

  const handleDeclineFriend = async () => {
    if (!currentUser || !player) {
      showCustomAlert('Ошибка', 'Необходимо войти в профиль', 'error', () => router.push('/login'));
      return;
    }
    
    // Защита от повторных вызовов
    if (friendLoading) {
      return;
    }
    
    const cacheKey = `${Math.min(currentUser.id, player.id)}_${Math.max(currentUser.id, player.id)}`;
    const previousStatus = friendshipStatus;
    
    // ОПТИМИСТИЧНОЕ ОБНОВЛЕНИЕ - сразу меняем UI
    setFriendLoading(true);
    lastManualStatusChangeRef.current = Date.now();
        setFriendshipStatus('none');
    setFriendshipStatusCache(prev => ({ ...prev, [cacheKey]: 'none' }));
    
    declineFriendRequest(currentUser.id, player.id).then(success => {
      setFriendLoading(false);
      if (!success) {
        // Откатываем при ошибке
        setFriendshipStatus(previousStatus);
        setFriendshipStatusCache(prev => ({ ...prev, [cacheKey]: previousStatus }));
        showCustomAlert('Ошибка', 'Не удалось отклонить запрос', 'error');
      }
    });
  };

  // Функция для парсинга URL и таймкода
  const parseVideoUrl = (input: string): { url: string; timeCode?: string; hours?: string; minutes?: string; seconds?: string } => {
    if (!input || typeof input !== 'string') {
      return { url: '', hours: '0', minutes: '0', seconds: '0' };
    }
    
    // Регулярное выражение для извлечения таймкода (поддерживаем форматы ЧЧ:ММ:СС и ММ:СС)
    const timeMatchHHMMSS = input.match(/\(время:\s*(\d{1,2}):(\d{1,2}):(\d{1,2})\)/);
    const timeMatchMMSS = input.match(/\(время:\s*(\d{1,2}):(\d{1,2})\)/);
    
    let hours = '0';
    let minutes = '0';
    let seconds = '0';
    let timeCode: string | undefined;
    
    if (timeMatchHHMMSS) {
      // Формат ЧЧ:ММ:СС
      hours = timeMatchHHMMSS[1];
      minutes = timeMatchHHMMSS[2];
      seconds = timeMatchHHMMSS[3];
      timeCode = `${hours}:${minutes}:${seconds}`;
    } else if (timeMatchMMSS) {
      // Формат ММ:СС (для обратной совместимости)
      hours = '0';
      minutes = timeMatchMMSS[1];
      seconds = timeMatchMMSS[2];
      timeCode = `${minutes}:${seconds}`;
    }
    
    // Удаляем таймкод из строки и очищаем пробелы (обрабатываем оба формата)
    let urlWithoutTimeCode = input.replace(/\s*\(время:\s*\d{1,2}:\d{1,2}:\d{1,2}\)/, '').replace(/\s*\(время:\s*\d{1,2}:\d{1,2}\)/, '').trim();
    
    // Убираем пробелы в начале и конце
    urlWithoutTimeCode = urlWithoutTimeCode.trim();
    
    // Если нет протокола, добавляем https://
    if (urlWithoutTimeCode && !urlWithoutTimeCode.startsWith('http://') && !urlWithoutTimeCode.startsWith('https://')) {
      urlWithoutTimeCode = 'https://' + urlWithoutTimeCode;
    }
    
    // Проверяем, является ли ссылка YouTube с помощью более строгих паттернов
    const youtubePatterns = [
      /^https?:\/\/(www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/i,
      /^https?:\/\/youtu\.be\/([a-zA-Z0-9_-]+)/i,
      /^https?:\/\/(www\.)?youtube\.com\/embed\/([a-zA-Z0-9_-]+)/i,
      /^https?:\/\/(www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/i,
      /^https?:\/\/(www\.)?youtube\.com\/live\/([a-zA-Z0-9_-]+)/i,
      /^https?:\/\/m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/i
    ];
    
    // Проверяем, является ли ссылка VK
    // Поддерживаем форматы: vk.com/video, vk.com/clip, vkvideo.ru/video
    const vkPatterns = [
      /^https?:\/\/(www\.)?vk\.com\/video(-?\d+_\d+)/i,
      /^https?:\/\/(www\.)?vk\.com\/clip(-?\d+_\d+)/i,
      /^https?:\/\/m\.vk\.com\/video(-?\d+_\d+)/i,
      /^https?:\/\/m\.vk\.com\/clip(-?\d+_\d+)/i,
      /^https?:\/\/(www\.)?vkvideo\.ru\/video(-?\d+_\d+)/i
    ];
    
    // Проверяем URL на соответствие YouTube
    const isValidYouTubeUrl = youtubePatterns.some(pattern => pattern.test(urlWithoutTimeCode));
    
    if (isValidYouTubeUrl) {
      // Конвертируем обычные YouTube URL в embed формат для автоматического запуска
      let embedUrl = urlWithoutTimeCode;
      
      // Извлекаем ID видео из разных форматов
      let videoId: string | null = null;
      
      // youtube.com/watch?v=...
      const watchMatch = urlWithoutTimeCode.match(/youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/i);
      if (watchMatch && watchMatch[1]) {
        videoId = watchMatch[1];
      }
      
      // youtu.be/...
      if (!videoId) {
        const shortMatch = urlWithoutTimeCode.match(/youtu\.be\/([a-zA-Z0-9_-]+)/i);
        if (shortMatch && shortMatch[1]) {
          videoId = shortMatch[1];
        }
      }
      
      // m.youtube.com/watch?v=...
      if (!videoId) {
        const mobileMatch = urlWithoutTimeCode.match(/m\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]+)/i);
        if (mobileMatch && mobileMatch[1]) {
          videoId = mobileMatch[1];
        }
      }
      
      // youtube.com/shorts/...
      if (!videoId) {
        const shortsMatch = urlWithoutTimeCode.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]+)/i);
        if (shortsMatch && shortsMatch[1]) {
          videoId = shortsMatch[1];
        }
      }
      
      // youtube.com/live/...
      if (!videoId) {
        const liveMatch = urlWithoutTimeCode.match(/youtube\.com\/live\/([a-zA-Z0-9_-]+)/i);
        if (liveMatch && liveMatch[1]) {
          videoId = liveMatch[1];
        }
      }
      
      // Если нашли ID и URL еще не в embed формате, конвертируем
      if (videoId && !urlWithoutTimeCode.includes('/embed/')) {
        embedUrl = `https://www.youtube.com/embed/${videoId}`;
      }
      
      return { url: embedUrl, timeCode, hours, minutes, seconds };
    }
    
    // Проверяем URL на соответствие VK
    const isValidVkUrl = vkPatterns.some(pattern => pattern.test(urlWithoutTimeCode));
    
    if (isValidVkUrl) {
      // Извлекаем ID видео VK (формат: ownerId_videoId, например: -123456_789012)
      let vkVideoId: string | null = null;
      
      // vk.com/video-123456_789012 или vk.com/video123456_789012
      let videoMatch = urlWithoutTimeCode.match(/vk\.com\/(?:video|clip)(-?\d+_\d+)/i);
      if (videoMatch && videoMatch[1]) {
        vkVideoId = videoMatch[1];
      }
      
      // vkvideo.ru/video-123456_789012
      if (!vkVideoId) {
        videoMatch = urlWithoutTimeCode.match(/vkvideo\.ru\/video(-?\d+_\d+)/i);
        if (videoMatch && videoMatch[1]) {
          vkVideoId = videoMatch[1];
        }
      }
      
      if (vkVideoId) {
        // Конвертируем vkvideo.ru в vk.com для единообразия
        let normalizedUrl = urlWithoutTimeCode;
        if (urlWithoutTimeCode.includes('vkvideo.ru')) {
          normalizedUrl = urlWithoutTimeCode.replace(/vkvideo\.ru/i, 'vk.com');
        }
        // Возвращаем нормализованный URL VK (будет обработан компонентом VKVideo)
        return { url: normalizedUrl, timeCode, hours, minutes, seconds };
      }
    }
    
    console.warn('Неверный формат видео URL (поддерживаются только YouTube и VK):', urlWithoutTimeCode);
    // Если ссылка не соответствует YouTube или VK, возвращаем пустую строку
    return { url: '', hours: '0', minutes: '0', seconds: '0' };
  };

  const openVideoLink = (url: string) => {
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Ошибка', 'Не удалось открыть ссылку');
      });
    }
  };





  const handleCurrentTeamChange = async (teams: PastTeam[]) => {
    try {
      setPlayerTeams(teams);
    } catch (error) {
      console.error('Ошибка при изменении текущих команд:', error);
    }
  };

  const handleSave = async () => {
    if (!player || !currentUser) {
      console.error('❌ handleSave: player или currentUser не найдены');
      showCustomAlert('Ошибка', 'Данные не найдены', 'error');
      return;
    }

    // Проверяем права доступа
    if (currentUser.status !== 'admin' && currentUser.id !== player.id) {
      console.error('❌ handleSave: нет прав доступа', { currentUserStatus: currentUser.status, currentUserId: currentUser.id, playerId: player.id });
      showCustomAlert('Ошибка', 'У вас нет прав для редактирования этого профиля', 'error');
      return;
    }

    try {
      // Объединяем поля видео в одну строку
      const goalsText = videoFields
        .filter(video => video.url.trim())
        .map(video => {
          // Конвертируем URL в embed формат перед сохранением
          const parsed = parseVideoUrl(video.url);
          const embedUrl = parsed.url || video.url;
          
          const hours = parseInt(video.hours || '0');
          const minutes = parseInt(video.minutes || '0');
          const seconds = parseInt(video.seconds || '0');
          // Формируем таймкод в формате ЧЧ:ММ:СС с ведущими нулями, но если все поля 0, то не добавляем таймкод
          const timeCode = (hours > 0 || minutes > 0 || seconds > 0) 
            ? ` (время: ${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')})` 
            : '';
          return embedUrl + timeCode;
        })
        .join('\n');
      
      // Загружаем аватар в Storage если это локальный файл
      // ВАЖНО: используем фиксированное имя файла avatar_{playerId}.jpg для перезаписи старых файлов
      let avatarUrl = editData.avatar || player.avatar;
      let avatarWasUpdated = false;
      if (avatarUrl && (avatarUrl.startsWith('file://') || avatarUrl.startsWith('content://') || avatarUrl.startsWith('data:'))) {
        console.log('📤 Загружаем аватар в Supabase Storage:', avatarUrl.substring(0, 50) + '...');
        const { uploadImageToStorage } = await import('../../utils/uploadImage');
        const uploadedUrl = await uploadImageToStorage(avatarUrl, `avatar_${player.id}.jpg`);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
          avatarWasUpdated = true;
          
          // КРИТИЧНО: Обновляем аватар ГЛОБАЛЬНО во всех компонентах
          // forceNotify=true гарантирует перезагрузку даже если URL тот же (файл перезаписан)
          const { updateAvatarGlobally } = await import('../../utils/AvatarCache');
          await updateAvatarGlobally(player.id, uploadedUrl);
          console.log('✅ Аватар обновлён глобально через updateAvatarGlobally');
        } else {
          console.error('❌ Не удалось загрузить аватар в Storage');
        }
      }

      // Объединяем текущие данные игрока с изменениями
      // ВАЖНО: Сначала берем все поля из player, затем перезаписываем editData
      const updatedPlayer = {
        ...player, 
        ...editData,
        // Явно сохраняем все важные поля, чтобы они не потерялись
        name: editData.name !== undefined ? editData.name : player.name,
        position: editData.position !== undefined ? editData.position : player.position,
        team: editData.team !== undefined ? editData.team : player.team,
        city: editData.city !== undefined ? editData.city : player.city,
        birthDate: editData.birthDate !== undefined ? editData.birthDate : player.birthDate,
        country: editData.country !== undefined ? editData.country : player.country,
        grip: editData.grip !== undefined ? editData.grip : player.grip,
        height: editData.height !== undefined ? editData.height : player.height,
        weight: editData.weight !== undefined ? editData.weight : player.weight,
        number: editData.number !== undefined ? editData.number : player.number,
        instagram: editData.instagram !== undefined ? editData.instagram : player.instagram,
        tiktok: editData.tiktok !== undefined ? editData.tiktok.toLowerCase() : (player.tiktok ? player.tiktok.toLowerCase() : player.tiktok),
        vk: editData.vk !== undefined ? editData.vk : player.vk,
        website: editData.website !== undefined ? editData.website.trim().replace(/^https?:\/\//i, (match) => match.toLowerCase()) : (player.website ? player.website.trim().replace(/^https?:\/\//i, (match) => match.toLowerCase()) : player.website),
        experience: editData.experience !== undefined ? editData.experience : player.experience,
        hockeyStartDate: editData.hockeyStartDate !== undefined ? editData.hockeyStartDate : player.hockeyStartDate,
        goals: editData.goals !== undefined ? editData.goals : player.goals,
        assists: editData.assists !== undefined ? editData.assists : player.assists,
        games: editData.games !== undefined ? editData.games : player.games,
        minutes: editData.minutes !== undefined ? editData.minutes : player.minutes,
        shots: editData.shots !== undefined ? editData.shots : player.shots,
        saves: editData.saves !== undefined ? editData.saves : player.saves,
        pullUps: editData.pullUps !== undefined ? editData.pullUps : player.pullUps,
        pushUps: editData.pushUps !== undefined ? editData.pushUps : player.pushUps,
        plankTime: editData.plankTime !== undefined ? editData.plankTime : player.plankTime,
        sprint100m: editData.sprint100m !== undefined ? editData.sprint100m : player.sprint100m,
        longJump: editData.longJump !== undefined ? editData.longJump : player.longJump,
        jumpRope: editData.jumpRope !== undefined ? editData.jumpRope : player.jumpRope,
        avatar: avatarUrl, // Используем URL из Storage
        favoriteGoals: goalsText,
        photos: galleryPhotos,
        achievements: achievements,
        // Save game video links for AI analysis
        gameVideos: gameVideoLinks.filter(url => url.trim() !== ''),
        // Добавляем годы тренера если это тренер
        ...(player.status === 'coach' ? {
          coach_years: coachYears.length > 0 ? coachYears : undefined,
          individual_training: individualTraining.length > 0 ? individualTraining : undefined
        } : {}),
        // Явно добавляем поля для магазина
        ...(player.status === 'shop' ? {
          address: editData.address || player.address,
          workingHours: editData.workingHours || player.workingHours,
          email: editData.email || player.email,
          discountForFriends:
            editData.discountForFriends === ''
              ? null
              : (editData.discountForFriends
                  ? (String(editData.discountForFriends).includes('%')
                      ? editData.discountForFriends
                      : `${editData.discountForFriends}%`)
                  : player.discountForFriends)
        } : {}),
        // Добавляем поля для заточки коньков
        ...(player.status === 'skateSharpening' ? {
          address: editData.address || player.address,
          workingHours: editData.workingHours || player.workingHours,
          email: editData.email || player.email,
          discountForFriends:
            editData.discountForFriends === ''
              ? null
              : (editData.discountForFriends
                  ? (String(editData.discountForFriends).includes('%')
                      ? editData.discountForFriends
                      : `${editData.discountForFriends}%`)
                  : player.discountForFriends),
          skate_services: skateServices.length > 0 ? skateServices : undefined
        } : {})
        // Убираем pastTeams, так как команды сохраняются в отдельной таблице
      };
      
      
      // Проверяем, изменились ли команды, чтобы не перезаписывать их без необходимости
      let teamsChanged = false;
      try {
        const { getPlayerTeamsAsPastTeams } = await import('../../utils/playerStorage');
        const savedTeams = await getPlayerTeamsAsPastTeams(player.id);
        
        // Преобразуем сохраненные команды в формат для сравнения
        const savedCurrentTeams = savedTeams.filter(t => t.isCurrent).map(t => ({
          id: t.id,
          teamName: t.teamName,
          startYear: t.startYear,
          endYear: t.endYear,
          isCurrent: true
        }));
        const savedPastTeams = savedTeams.filter(t => !t.isCurrent).map(t => ({
          id: t.id,
          teamName: t.teamName,
          startYear: t.startYear,
          endYear: t.endYear,
          isCurrent: false
        }));
        
        // Сравниваем текущие команды
        const currentTeamsForCompare = playerTeams.map(t => ({
          id: t.id,
          teamName: t.teamName,
          startYear: t.startYear,
          endYear: t.endYear,
          isCurrent: true
        }));
        
        // Сравниваем прошлые команды
        const pastTeamsForCompare = pastTeams.filter(t => !t.isCurrent).map(t => ({
          id: t.id,
          teamName: t.teamName,
          startYear: t.startYear,
          endYear: t.endYear,
          isCurrent: false
        }));
        
        // Проверяем изменились ли команды
        const currentTeamsEqual = JSON.stringify(savedCurrentTeams.sort((a, b) => a.id.localeCompare(b.id))) === 
                                   JSON.stringify(currentTeamsForCompare.sort((a, b) => a.id.localeCompare(b.id)));
        const pastTeamsEqual = JSON.stringify(savedPastTeams.sort((a, b) => a.id.localeCompare(b.id))) === 
                               JSON.stringify(pastTeamsForCompare.sort((a, b) => a.id.localeCompare(b.id)));
        
        teamsChanged = !currentTeamsEqual || !pastTeamsEqual;
        
        console.log('📋 Проверка изменения команд:', {
          teamsChanged,
          currentChanged: !currentTeamsEqual,
          pastChanged: !pastTeamsEqual,
          savedCurrentCount: savedCurrentTeams.length,
          newCurrentCount: currentTeamsForCompare.length,
          savedPastCount: savedPastTeams.length,
          newPastCount: pastTeamsForCompare.length,
          // Добавляем детали для отладки
          playerTeamsLength: playerTeams.length,
          playerTeamsNames: playerTeams.map(t => t.teamName),
          pastTeamsLength: pastTeams.length,
          pastTeamsNames: pastTeams.map(t => t.teamName)
        });
      } catch (error) {
        console.error('❌ Ошибка проверки изменения команд:', error);
        teamsChanged = true; // На всякий случай считаем, что команды могли измениться
      }
      
      // СНАЧАЛА синхронизируем команды (если изменились)
      let teamsSyncResult = { success: true, error: undefined as string | undefined };
      if (teamsChanged) {
        try {
          console.log('🔄 Команды изменились, выполняем синхронизацию...');
          
          const { syncPlayerTeams, clearOldPastTeamsData, addTeamOrderField } = await import('../../utils/playerStorage');
          
          // Добавляем поле team_order если его еще нет (выполняется один раз)
          await addTeamOrderField();
          
          // Сначала очищаем старые данные команд
          const clearSuccess = await clearOldPastTeamsData(player.id);
          if (!clearSuccess) {
            console.error('❌ Ошибка очистки старых данных команд');
            teamsSyncResult = { success: false, error: 'Не удалось очистить старые данные команд' };
          } else {
            const teamsSyncSuccess = await syncPlayerTeams(player.id, playerTeams, pastTeams);
            
            if (!teamsSyncSuccess) {
              console.error('❌ Ошибка синхронизации команд');
              teamsSyncResult = { success: false, error: 'Не удалось сохранить команды' };
            }
          }
        } catch (syncError) {
          console.error('❌ Исключение при синхронизации команд:', syncError);
          teamsSyncResult = { success: false, error: 'Не удалось сохранить команды' };
        }
      } else {
        console.log('✅ Команды не изменились, пропускаем синхронизацию');
      }
      
      // ПОСЛЕ синхронизации команд - обновляем игрока и загружаем команды параллельно
      const [refreshedPlayer, teams] = await Promise.all([
        // Обновление данных игрока
        // ВАЖНО: НЕ пропускаем очистку кеша, чтобы при следующей загрузке загрузились свежие данные
        updatePlayer(player.id, updatedPlayer, false), // Очищаем кеш для загрузки свежих данных
        // Загрузка команд ПОСЛЕ синхронизации
        import('../../utils/playerStorage').then(({ getPlayerTeamsAsPastTeams }) => getPlayerTeamsAsPastTeams(player.id))
      ]);
      
      // Отладочный лог отключен
      
      // Проверяем результат синхронизации команд
      // ВАЖНО: Не прерываем сохранение остальных данных при ошибке команд
      if (!teamsSyncResult.success) {
        console.error('❌ Ошибка синхронизации команд:', teamsSyncResult.error);
        // Показываем предупреждение, но продолжаем сохранение остальных данных
        showCustomAlert(
          'Предупреждение', 
          'Команды не удалось сохранить: ' + (teamsSyncResult.error || 'Неизвестная ошибка') + '. Остальные данные сохранены.',
          'warning'
        );
        // НЕ возвращаемся - продолжаем сохранение остальных данных
      }
      
      
      // Отправляем уведомления друзьям об изменениях ПЕРЕД обновлением состояния
      // Используем старые данные из player для сравнения
      const notificationPromises: Promise<void>[] = [];
      
      try {
        // 1. Проверяем изменение видео моментов
        const oldVideosCount = player.favoriteGoals ? player.favoriteGoals.split('\n').filter(v => v.trim()).length : 0;
        const newVideosCount = goalsText ? goalsText.split('\n').filter(v => v.trim()).length : 0;
        if (newVideosCount > oldVideosCount) {
          const addedVideos = newVideosCount - oldVideosCount;
          // Начисляем 1 звездочку за каждое добавленное видео
          for (let i = 0; i < addedVideos; i++) {
            try {
              await addActivityPoints(player.id, 'VIDEO_UPLOAD');
            } catch (error) {
              console.error('❌ Ошибка начисления очков активности за видео (не критично):', error);
            }
          }
          notificationPromises.push(
            notifyFriendsAboutVideos(player.id, player.name, addedVideos, {
              videoNotification: {
                added: t('videoNotification.added'),
                oneVideo: t('videoNotification.oneVideo'),
                multipleVideos: t('videoNotification.multipleVideos')
              }
            })
          );
        }
        
        // 2. Проверяем изменение аватара
        const oldAvatar = player.avatar || '';
        const newAvatar = editData.avatar || player.avatar || '';
        if (newAvatar && oldAvatar !== newAvatar) {
          // Используем refreshedPlayer.avatar если доступен, иначе player.avatar из БД
          const avatarUrl = refreshedPlayer?.avatar || player.avatar || '';
          notificationPromises.push(
            notifyFriendsAboutAvatarChange(player.id, player.name, avatarUrl, {
              avatarNotification: {
                changed: t('avatarNotification.changed')
              }
            })
          );
        }
        
        // 3. Проверяем добавление достижений
        const oldAchievementsCount = player.achievements ? player.achievements.length : 0;
        const newAchievementsCount = achievements ? achievements.length : 0;
        console.log('🏆 Проверка достижений:', { 
          oldCount: oldAchievementsCount, 
          newCount: newAchievementsCount,
          oldAchievements: player.achievements,
          newAchievements: achievements
        });
        if (newAchievementsCount > oldAchievementsCount) {
          const addedAchievements = newAchievementsCount - oldAchievementsCount;
          notificationPromises.push(
            notifyFriendsAboutAchievements(player.id, player.name, addedAchievements, {
              achievementNotification: {
                added: t('achievementNotification.added'),
                received: t('achievementNotification.received'),
                oneAchievement: t('achievementNotification.oneAchievement'),
                multipleAchievements: t('achievementNotification.multipleAchievements')
              }
            })
          );
        } else {
          console.log('ℹ️ Достижения не изменились или уменьшились, уведомления не отправляются');
        }
        
        // 4. Проверяем изменение роста/веса
        const physicalChanges: { field: 'height' | 'weight', oldValue: number, newValue: number }[] = [];
        
        const oldHeight = parseInt(player.height) || 0;
        const newHeight = parseInt(editData.height || player.height) || 0;
        if (oldHeight > 0 && newHeight > 0 && oldHeight !== newHeight) {
          physicalChanges.push({ field: 'height', oldValue: oldHeight, newValue: newHeight });
        }
        
        const oldWeight = parseInt(player.weight) || 0;
        const newWeight = parseInt(editData.weight || player.weight) || 0;
        if (oldWeight > 0 && newWeight > 0 && oldWeight !== newWeight) {
          physicalChanges.push({ field: 'weight', oldValue: oldWeight, newValue: newWeight });
        }
        
        if (physicalChanges.length > 0) {
          notificationPromises.push(
            notifyFriendsAboutPhysicalData(player.id, player.name, physicalChanges, {
              statsNotification: {
                updated: t('statsNotification.updated'),
                physicalData: t('statsNotification.physicalData')
              },
              height: t('height'),
              weight: t('weight'),
              cm: t('cm'),
              kg: t('kg')
            })
          );
        }
        
        // 5. Проверяем изменение статистики (голы/передачи для полевых игроков, минуты/броски/сэйвы для вратарей)
        const statsChanges: { field: string, oldValue: number, newValue: number }[] = [];
        
        // Определяем, является ли игрок вратарем (используем функцию нормализации)
        const currentPosition = editData.position || player.position;
        const isGoalkeeper = isGoalkeeperPosition(currentPosition);
        
        if (isGoalkeeper) {
          // Отслеживаем изменения статистики для вратарей
          const oldGames = parseInt(player.games || '0') || 0;
          const newGames = parseInt(editData.games !== undefined ? editData.games : (player.games || '0')) || 0;
          if (oldGames !== newGames) {
            statsChanges.push({ field: 'games', oldValue: oldGames, newValue: newGames });
          }
          
          const oldMinutes = parseInt(player.minutes || '0') || 0;
          const newMinutes = parseInt(editData.minutes !== undefined ? editData.minutes : (player.minutes || '0')) || 0;
          if (oldMinutes !== newMinutes) {
            statsChanges.push({ field: 'minutes', oldValue: oldMinutes, newValue: newMinutes });
          }
          
          const oldShots = parseInt(player.shots || '0') || 0;
          const newShots = parseInt(editData.shots !== undefined ? editData.shots : (player.shots || '0')) || 0;
          if (oldShots !== newShots) {
            statsChanges.push({ field: 'shots', oldValue: oldShots, newValue: newShots });
          }
          
          const oldSaves = parseInt(player.saves || '0') || 0;
          const newSaves = parseInt(editData.saves !== undefined ? editData.saves : (player.saves || '0')) || 0;
          if (oldSaves !== newSaves) {
            statsChanges.push({ field: 'saves', oldValue: oldSaves, newValue: newSaves });
          }
        } else {
          // Отслеживаем изменения статистики для полевых игроков
          const oldGoals = parseInt(player.goals || '0') || 0;
          const newGoals = parseInt(editData.goals !== undefined ? editData.goals : (player.goals || '0')) || 0;
          console.log(`⚽ Голы: ${oldGoals} → ${newGoals}`);
          if (oldGoals !== newGoals) {
            statsChanges.push({ field: 'goals', oldValue: oldGoals, newValue: newGoals });
          }
          
          const oldAssists = parseInt(player.assists || '0') || 0;
          const newAssists = parseInt(editData.assists !== undefined ? editData.assists : (player.assists || '0')) || 0;
          if (oldAssists !== newAssists) {
            statsChanges.push({ field: 'assists', oldValue: oldAssists, newValue: newAssists });
          }
          
          const oldGames = parseInt(player.games || '0') || 0;
          const newGames = parseInt(editData.games !== undefined ? editData.games : (player.games || '0')) || 0;
          if (oldGames !== newGames) {
            statsChanges.push({ field: 'games', oldValue: oldGames, newValue: newGames });
          }
        }

        // Проверяем изменения нормативов
        const normativeChanges: { field: string, oldValue: number, newValue: number, change: number }[] = [];
        
        // Вспомогательная функция для безопасного парсинга нормативов
        const parseNormative = (value: string | null | undefined, defaultValue: number = 0): number => {
          if (value === null || value === undefined || value === '') return defaultValue;
          const parsed = parseFloat(value);
          return isNaN(parsed) ? defaultValue : parsed;
        };
        
        // Проверяем pullUps
        const oldPullUps = parseNormative(player.pullUps);
        const newPullUps = editData.pullUps !== undefined ? parseNormative(editData.pullUps) : parseNormative(player.pullUps);
        if (oldPullUps !== newPullUps) {
          console.log('🏋️ Подтягивания:', oldPullUps, '→', newPullUps);
          normativeChanges.push({ field: 'pullUps', oldValue: oldPullUps, newValue: newPullUps, change: newPullUps - oldPullUps });
        }
        
        // Проверяем pushUps
        const oldPushUps = parseNormative(player.pushUps);
        const newPushUps = editData.pushUps !== undefined ? parseNormative(editData.pushUps) : parseNormative(player.pushUps);
        if (oldPushUps !== newPushUps) {
          normativeChanges.push({ field: 'pushUps', oldValue: oldPushUps, newValue: newPushUps, change: newPushUps - oldPushUps });
        }
        
        // Проверяем plankTime
        const oldPlankTime = parseNormative(player.plankTime);
        const newPlankTime = editData.plankTime !== undefined ? parseNormative(editData.plankTime) : parseNormative(player.plankTime);
        if (oldPlankTime !== newPlankTime) {
          normativeChanges.push({ field: 'plankTime', oldValue: oldPlankTime, newValue: newPlankTime, change: newPlankTime - oldPlankTime });
        }
        
        // Проверяем sprint100m
        const oldSprint100m = parseNormative(player.sprint100m);
        const newSprint100m = editData.sprint100m !== undefined ? parseNormative(editData.sprint100m) : parseNormative(player.sprint100m);
        if (oldSprint100m !== newSprint100m) {
          normativeChanges.push({ field: 'sprint100m', oldValue: oldSprint100m, newValue: newSprint100m, change: newSprint100m - oldSprint100m });
        }
        
        // Проверяем longJump
        const oldLongJump = parseNormative(player.longJump);
        const newLongJump = editData.longJump !== undefined ? parseNormative(editData.longJump) : parseNormative(player.longJump);
        if (oldLongJump !== newLongJump) {
          normativeChanges.push({ field: 'longJump', oldValue: oldLongJump, newValue: newLongJump, change: newLongJump - oldLongJump });
        }
        
        // Проверяем jumpRope
        const oldJumpRope = parseNormative(player.jumpRope);
        const newJumpRope = editData.jumpRope !== undefined ? parseNormative(editData.jumpRope) : parseNormative(player.jumpRope);
        if (oldJumpRope !== newJumpRope) {
          normativeChanges.push({ field: 'jumpRope', oldValue: oldJumpRope, newValue: newJumpRope, change: newJumpRope - oldJumpRope });
        }
        
        // Конвертируем statsChanges в формат для notifyFriendsAboutChanges
        const statChangesForNotify = statsChanges.map(change => ({
          field: change.field,
          oldValue: change.oldValue,
          newValue: change.newValue,
          change: change.newValue - change.oldValue
        }));
        
        // Отправляем уведомления о статистике и нормативах
        if (statChangesForNotify.length > 0 || normativeChanges.length > 0) {
          console.log('📊 Отправляем уведомления о статистике и нормативах:', {
            stats: statChangesForNotify.length,
            normatives: normativeChanges.length,
            normativeDetails: normativeChanges
          });
          notificationPromises.push(
            notifyFriendsAboutChanges(
              player.id,
              player.name,
              statChangesForNotify,
              normativeChanges
            )
          );
          
          // Начисляем 1 звездочку за изменение статистики
          try {
            await addActivityPoints(player.id, 'STATS_UPDATE');
          } catch (error) {
            console.error('❌ Ошибка начисления очков активности за изменение статистики (не критично):', error);
          }
        } else {
          console.log('ℹ️ Статистика и нормативы НЕ изменились, уведомления НЕ отправляются', {
            statsCount: statChangesForNotify.length,
            normativesCount: normativeChanges.length,
            playerNormatives: {
              pullUps: player.pullUps,
              pushUps: player.pushUps,
              plankTime: player.plankTime,
              sprint100m: player.sprint100m,
              longJump: player.longJump,
              jumpRope: player.jumpRope
            },
            editDataNormatives: {
              pullUps: editData.pullUps,
              pushUps: editData.pushUps,
              plankTime: editData.plankTime,
              sprint100m: editData.sprint100m,
              longJump: editData.longJump,
              jumpRope: editData.jumpRope
            }
          });
        }
        
      } catch (notifyError) {
        console.error('❌ Ошибка подготовки уведомлений (не критично):', notifyError);
      }
      
      // ВАЖНО: Проверяем, что refreshedPlayer не null
      if (!refreshedPlayer) {
        console.error('❌ handleSave: refreshedPlayer is null после updatePlayer');
        showCustomAlert(t('common.error'), t('saveError') || 'Не удалось сохранить данные', 'error');
        return;
      }
      
      // ВАЖНО: Отправляем уведомления о новых фото только при сохранении профиля
      // Сравниваем исходное количество фото (при загрузке профиля) с текущим количеством в galleryPhotos
      const oldPhotosCount = initialPhotosCountRef.current;
      const newPhotosCount = (galleryPhotos && Array.isArray(galleryPhotos)) ? galleryPhotos.length : 0;
      const addedPhotosCount = newPhotosCount - oldPhotosCount;
      
      console.log('📸 Проверка фото для уведомлений:', {
        initialCount: oldPhotosCount,
        currentCount: newPhotosCount,
        addedCount: addedPhotosCount,
        galleryPhotos: galleryPhotos,
        refreshedPlayerPhotos: refreshedPlayer.photos
      });
      
      if (addedPhotosCount > 0) {
        console.log('📸 Отправляем уведомления о новых фото при сохранении:', {
          oldCount: oldPhotosCount,
          newCount: newPhotosCount,
          addedCount: addedPhotosCount,
          playerId: player.id,
          playerName: player.name
        });
        
        try {
          await notifyFriendsAboutPhotos(
            player.id,
            player.name,
            addedPhotosCount,
            {
              photoNotification: {
                added: t('photoNotification.added'),
                onePhoto: t('photoNotification.onePhoto'),
                multiplePhotos: t('photoNotification.multiplePhotos')
              }
            }
          );
          console.log('✅ Уведомления о новых фото отправлены друзьям');
          
          // Обновляем исходное количество фото после успешной отправки уведомлений
          initialPhotosCountRef.current = newPhotosCount;
        } catch (error) {
          console.error('❌ Ошибка отправки уведомлений о фото:', error);
        }
      } else {
        console.log('ℹ️ Фото не добавились, уведомления не отправляются:', {
          oldCount: oldPhotosCount,
          newCount: newPhotosCount,
          addedCount: addedPhotosCount
        });
      }
      
      console.log('✅ handleSave: refreshedPlayer получен:', {
        id: refreshedPlayer.id,
        name: refreshedPlayer.name,
        grip: refreshedPlayer.grip,
        position: refreshedPlayer.position,
        number: refreshedPlayer.number,
        height: refreshedPlayer.height,
        weight: refreshedPlayer.weight
      });
      
      // Обновляем состояние команд СРАЗУ после сохранения (только если команды изменились)
      if (teamsChanged && teams && Array.isArray(teams)) {
        const currentTeams = teams.filter(team => team.isCurrent);
        const pastTeams = teams.filter(team => !team.isCurrent);
        
        setPlayerTeams(currentTeams);
        setPastTeams(pastTeams);
      } else if (!teamsChanged) {
        console.log('✅ Команды не изменились, пропускаем обновление состояния');
      } else {
        console.log('❌ Команды не загружены или не являются массивом:', teams);
      }
      
      // ВАЖНО: СНАЧАЛА сбрасываем editData, чтобы компонент не использовал старые данные
      setEditData({});
      console.log('✅ handleSave: editData сброшен');
      
      // ВАЖНО: Обновляем состояние СРАЗУ (синхронно), чтобы изменения отобразились немедленно
      setPlayer(refreshedPlayer);
      console.log('✅ handleSave: player обновлен через setPlayer');
      
      // ВАЖНО: Сохраняем время последнего сохранения, чтобы игнорировать Realtime обновления в течение 3 секунд
      // Это предотвращает перезапись только что сохраненных данных старыми данными из Realtime
      lastSaveTimeRef.current = Date.now();
      console.log('✅ handleSave: установлен флаг lastSaveTime для защиты от Realtime перезаписи');
      
      // ВАЖНО: Обновляем кэш состояния для немедленного отображения
      setPlayersCache(prev => ({
        ...prev,
        [player.id]: refreshedPlayer
      }));

      // ВАЖНО: Очищаем ВСЕ кеши, чтобы при следующем заходе загрузились свежие данные
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const cacheKey = `player_${player.id}`;
      await AsyncStorage.removeItem(cacheKey).catch(error => {
        console.warn('⚠️ Не удалось очистить кеш игрока:', error);
      });
      
      // ВАЖНО: Очищаем memory cache, чтобы getPlayerById загрузил свежие данные из БД
      const { clearPlayerMemoryCache } = await import('../../utils/playerStorage');
      clearPlayerMemoryCache(player.id);
      console.log('✅ handleSave: очищен memory cache для игрока');
      
      // ВАЖНО: Очищаем кеш всех игроков ОТЛОЖЕННО, чтобы не вызвать редирект
      // Делаем это после закрытия модального окна с успешным сообщением
      const allPlayersCacheKey = 'all_players';
      setTimeout(async () => {
        await AsyncStorage.removeItem(allPlayersCacheKey).catch(error => {
          console.warn('⚠️ Не удалось очистить кеш всех игроков:', error);
        });
        console.log('✅ handleSave: очищен кеш всех игроков (отложенно)');
      }, 1000); // Задержка 1 секунда, чтобы пользователь успел увидеть сообщение об успехе
      
      // Если редактируем свой собственный профиль, обновляем также currentUser
      if (currentUser.id === player.id) {
        // ВАЖНО: Обновляем локальное состояние СРАЗУ (синхронно)
        setCurrentUser(refreshedPlayer);
        // ВАЖНО: Обновляем ГЛОБАЛЬНЫЙ контекст СРАЗУ для LogoHeader и других компонентов
        setGlobalCurrentUser(refreshedPlayer);
        
        // Сохраняем обновленные данные в AsyncStorage ОТЛОЖЕННО
        // ВАЖНО: НЕ вызываем refreshUser здесь, так как он может вызвать редирект
        // Вместо этого обновляем только локальное состояние
        setTimeout(async () => {
          try {
            await saveCurrentUser(refreshedPlayer);
            // Обновляем только локальное состояние, НЕ вызываем refreshUser
            // чтобы избежать редиректа на главную страницу
            console.log('✅ handleSave: currentUser обновлен в AsyncStorage без refreshUser');
          } catch (error) {
            console.error('❌ Ошибка обновления currentUser:', error);
          }
        }, 500); // Небольшая задержка, чтобы избежать конфликтов с навигацией
      }
      
      // ВАЖНО: Выходим из режима редактирования ПОСЛЕ обновления всех состояний
      setIsEditing(false);
      
      // Показываем успешное сообщение БЕЗ редиректа
      showCustomAlert(t('common.success'), t('playerUpdated'), 'success');
      
      // Дополнительное обновление команд через небольшую задержку для надежности (только если команды изменились)
      if (teamsChanged) {
        setTimeout(async () => {
          try {
            const { getPlayerTeamsAsPastTeams } = await import('../../utils/playerStorage');
            const freshTeams = await getPlayerTeamsAsPastTeams(player.id);
            if (freshTeams && Array.isArray(freshTeams)) {
              const currentTeams = freshTeams.filter(team => team.isCurrent);
              const pastTeams = freshTeams.filter(team => !team.isCurrent);
              setPlayerTeams(currentTeams);
              setPastTeams(pastTeams);
            }
          } catch (error) {
            console.error('❌ Ошибка дополнительного обновления команд:', error);
          }
        }, 500);
      }
      
      // Отправляем все уведомления асинхронно
      if (notificationPromises.length > 0) {
        Promise.all(notificationPromises).catch(error => {
          console.error('❌ Ошибка отправки уведомлений:', error);
        });
      }
      
       // Трекаем обновление профиля
       try {
         await addActivityPoints(currentUser.id, 'PROFILE_UPDATE');
         // Обновляем рейтинг активности
         setActivityRefreshKey(prev => prev + 1);
      } catch (error) {
        console.error('Failed to track profile update:', error);
      }
      
      // Обновляем профиль магазина если это магазин
      if (player.status === 'shop') {
        await updatePlayer(player.id, {
          ...player,
          status: player.status,
          ...editData,
          address: editData.address || player.address,
          workingHours: editData.workingHours || player.workingHours,
          email: editData.email || player.email,
          discountForFriends:
            editData.discountForFriends === ''
              ? null
              : (editData.discountForFriends
                  ? (String(editData.discountForFriends).includes('%')
                      ? editData.discountForFriends
                      : `${editData.discountForFriends}%`)
                  : player.discountForFriends)
        }, true); // Пропускаем очистку кеша для миграции
      }
      
    } catch (error) {
      console.error('❌ handleSave: общая ошибка сохранения:', error);
      console.error('❌ handleSave: детали ошибки:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      showCustomAlert(t('common.error'), t('saveError'), 'error');
    }
  };

  const handleDeleteSpeedRecord = async (recordDate?: string) => {
    const dateToDelete = recordDate || deleteSpeedRecordDate;
    if (!dateToDelete || !player) {
      return;
    }

    setIsDeletingSpeedRecord(true);
    try {
      const updatedPlayer = await deletePuckSpeedRecord(player.id, dateToDelete);
      if (updatedPlayer) {
        // Используем данные, которые вернула функция удаления
        setPlayer(updatedPlayer);
        // Обновляем кеш
        setPlayersCache(prev => ({
          ...prev,
          [player.id]: updatedPlayer
        }));
        
        showCustomAlert(
          t('puckSpeed.deleteSuccess') || 'Запись удалена',
          t('puckSpeed.deleteSuccessMessage') || 'Запись успешно удалена из истории',
          'success'
        );
      } else {
        showCustomAlert(
          t('puckSpeed.deleteError') || 'Ошибка',
          t('puckSpeed.deleteErrorMessage') || 'Не удалось удалить запись',
          'error'
        );
      }
    } catch (error) {
      console.error('❌ Ошибка удаления записи скорости:', error);
      showCustomAlert(
        t('puckSpeed.deleteError') || 'Ошибка',
        t('puckSpeed.deleteErrorMessage') || 'Не удалось удалить запись',
        'error'
      );
    } finally {
      setIsDeletingSpeedRecord(false);
      setDeleteSpeedRecordDate(null);
    }
  };

  const handleDeletePlayer = async () => {
    if (!currentUser || currentUser.status !== 'admin') {
      showCustomAlert('Ошибка', 'Только администратор может удалять пользователей', 'error');
      return;
    }

    if (!player) {
      showCustomAlert('Ошибка', 'Данные игрока не найдены', 'error');
      return;
    }

    // Запрашиваем подтверждение
    showCustomAlert(
      t('profile.deleteUser') || t('deleteUser'),
      t('profile.deleteUserConfirm', { name: player.name }),
      'warning',
      async () => {
        const success = await deletePlayer(player.id);
        if (success) {
            showCustomAlert(
              t('common.success') || t('success'), 
              t('profile.userDeleted', { name: player.name }),
              'success',
              () => router.push({ pathname: '/', params: { refresh: String(Date.now()) } })
            );
        } else {
          showCustomAlert(
            t('common.error') || 'Ошибка', 
            t('profile.deleteUserError') || 'Не удалось удалить пользователя', 
            'error'
          );
        }
      },
      true, // showCancel
      () => {} // onCancel - просто закрывает диалог
    );
  };

  // Удаление собственного аккаунта
  const handleDeleteOwnAccount = async () => {
    console.log('🗑️ handleDeleteOwnAccount вызвана');
    console.log('🗑️ currentUser:', currentUser?.id, currentUser?.name);
    console.log('🗑️ player:', player?.id, player?.name);
    console.log('🗑️ currentUser.id === player.id:', currentUser?.id === player?.id);
    
    if (!currentUser || !player || currentUser.id !== player.id) {
      console.log('❌ Условие не выполнено, выходим из функции');
      return;
    }

    // Закрываем меню перед показом диалога
    handleCloseProfileMenu();
    
    // Небольшая задержка, чтобы меню успело закрыться
    setTimeout(() => {
      console.log('✅ Условие выполнено, показываем диалог подтверждения');
      
      // Запрашиваем подтверждение (используем те же переводы, что и для админа)
      showCustomAlert(
        t('profile.deleteUser') || t('deleteUser'),
        t('profile.deleteUserConfirm', { name: player.name }),
        'warning',
        async () => {
          try {
            setLoading(true);
            console.log('🗑️ Начинаем удаление собственного аккаунта:', player.id);
            
            const success = await deletePlayer(player.id, true); // true = это удаление собственного аккаунта
            
            if (success) {
              console.log('✅ Аккаунт успешно удален, выходим из системы');
              
              // Очищаем кэш всех игроков, чтобы удаленный профиль не отображался на главном экране
              await clearAllPlayersCache();
              console.log('✅ Кэш игроков очищен');
              
              // Очищаем контекст пользователя ПЕРЕД выходом
              setGlobalCurrentUser(null);
              
              // Выходим из аккаунта после удаления (пропускаем обновление статуса, так как пользователь уже удален)
              try {
                await logoutUser(true); // true = пропускаем обновление статуса
                console.log('✅ Выход из аккаунта выполнен');
              } catch (logoutError) {
                console.warn('⚠️ Ошибка при выходе из аккаунта (не критично):', logoutError);
              }
              
              setLoading(false);
              
              // Сразу перенаправляем на страницу входа без показа диалога успеха
              // так как пользователь уже удален и диалог может не показаться
              setTimeout(() => {
                router.replace('/login');
              }, 100);
            } else {
              setLoading(false);
              console.error('❌ Не удалось удалить аккаунт');
              showCustomAlert(
                t('common.error') || 'Ошибка', 
                t('profile.deleteUserError') || 'Не удалось удалить пользователя', 
                'error'
              );
            }
          } catch (error) {
            setLoading(false);
            console.error('❌ Ошибка при удалении аккаунта:', error);
            showCustomAlert(
              t('common.error') || 'Ошибка', 
              t('profile.deleteUserError') || 'Не удалось удалить пользователя', 
              'error'
            );
          }
        },
        true, // showCancel
        () => {} // onCancel - просто закрывает диалог
      );
    }, 300); // Задержка 300мс для закрытия меню
  };

  const handleLogout = async () => {
    setAlert({
      visible: true,
      title: t('logoutConfirm'),
      message: t('logoutConfirmMessage'),
      type: 'warning',
      onConfirm: async () => {
        try {
          await logoutUser();
          await dataCache.remove(CACHE_KEYS.USER_PROFILE);
          setGlobalCurrentUser(null);
          router.replace('/');
          void refreshUser(true);
        } catch (error) {
          console.error('❌ Ошибка при выходе:', error);
          setGlobalCurrentUser(null);
          router.replace('/');
          void refreshUser(true);
        }
      },
      onCancel: () => {
        setAlert({ ...alert, visible: false });
      },
      onSecondary: () => {},
      showCancel: true,
      showSecondary: false,
      confirmText: t('common.ok'),
      cancelText: t('profile.cancel'),
      secondaryText: t('profile.additional')
    });
  };

  const handleCreateUser = async () => {
    if (!currentUser || currentUser.status !== 'admin') {
      Alert.alert('Ошибка', 'Только администратор может создавать пользователей');
      return;
    }

    // Проверяем обязательные поля (только имя обязательно, телефон теперь опционален)
    if (!newUserData.name) {
      Alert.alert('Ошибка', 'Пожалуйста, заполните имя пользователя');
      return;
    }

    try {
      const createdPlayer = await createPlayerManually(
        {
          ...newUserData,
          age: 0,
          goals: '',
          assists: '',
          games: '',
          pullUps: '',
          pushUps: '',
          plankTime: '',
          sprint100m: '',
          longJump: ''
        } as Player,
        currentUser.id
      );

      if (createdPlayer) {
        // Сбрасываем форму и закрываем модальное окно
        setNewUserData({
          name: '',
          phone: '',
          status: 'player',
          birthDate: '',
          country: t('belarus'),
          team: '',
          position: '',
          avatar: undefined
        });
        setShowCreateUserModal(false);
        
        // Используем тот же паттерн, что и при удалении - showCustomAlert с callback
        showCustomAlert(
          t('success'), 
          `Пользователь ${createdPlayer.name} создан`,
          'success',
          () => {
            // Переходим на главный экран - useFocusEffect автоматически обновит данные
            // так как с момента последнего обновления прошло >2 секунд
            router.replace('/');
          }
        );
      } else {
        Alert.alert('Ошибка', 'Не удалось создать пользователя');
      }
    } catch (error) {
      console.error('Ошибка создания пользователя:', error);
      Alert.alert('Ошибка', 'Не удалось создать пользователя');
    }
  };

  // Нормализуем id для проверки
  const normalizedId = Array.isArray(id) ? id[0] : id;
  /** Загруженный профиль ещё от существующего маршрута — не показываем контент с «чужим» игроком */
  const playerRouteMismatch = Boolean(
    normalizedId && player && typeof player.id === 'string' && player.id !== normalizedId
  );
  
  // Проверяем, является ли это профилем текущего пользователя
  const isCurrentUserProfile = currentUser && normalizedId && currentUser.id === normalizedId;
  
  // Устанавливаем таймаут для автоматического редиректа, если игрок не найден
  useEffect(() => {
    if (!player && !loading && normalizedId) {
      // Если игрок не найден и загрузка завершена, устанавливаем таймаут на 5 секунд
      const timeout = setTimeout(async () => {
        console.log('⏰ Таймаут: игрок не найден, выполняем редирект');
        if (isCurrentUserProfile) {
          try {
            await logoutUser();
            await dataCache.remove(CACHE_KEYS.USER_PROFILE);
            setGlobalCurrentUser(null);
            void refreshUser(true);
          } catch (error) {
            console.error('❌ Ошибка при выходе:', error);
          }
        }
        router.replace('/');
      }, 5000);
      
      setPlayerNotFoundTimeout(timeout);
      
      return () => {
        clearTimeout(timeout);
      };
    } else {
      // Если игрок найден или идет загрузка, очищаем таймаут
      if (playerNotFoundTimeout) {
        clearTimeout(playerNotFoundTimeout);
        setPlayerNotFoundTimeout(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, loading, normalizedId, isCurrentUserProfile]);

  if (loading || playerRouteMismatch) {
    return (
      <View style={styles.container}>
        <CachedBackground source={iceBg} style={styles.background} resizeMode="cover">
          <View style={styles.overlay}>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>
                {t('profile.loadingProfile') === 'profile.loadingProfile' ? 'Loading profile...' : t('profile.loadingProfile')}
              </Text>
            </View>
          </View>
        </CachedBackground>
      </View>
    );
  }
  
  if (!player) {
    return (
      <View style={styles.container}>
        <CachedBackground source={iceBg} style={styles.background} resizeMode="cover">
          <View style={styles.overlay}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {t('profile.playerNotFound') === 'profile.playerNotFound' ? 'Игрок не найден' : t('profile.playerNotFound')}
              </Text>
              {isCurrentUserProfile && (
                <TouchableOpacity
                  style={[styles.button, { marginTop: 20, backgroundColor: '#fa2f40' }]}
                  onPress={async () => {
                    try {
                      await logoutUser();
                      await dataCache.remove(CACHE_KEYS.USER_PROFILE);
                      setGlobalCurrentUser(null);
                      router.replace('/');
                      void refreshUser(true);
                    } catch (error) {
                      console.error('❌ Ошибка при выходе:', error);
                      setGlobalCurrentUser(null);
                      router.replace('/');
                    }
                  }}
                >
                  <Text style={styles.buttonText}>Выйти из аккаунта</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.button, { marginTop: 10, backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
                onPress={() => router.replace('/')}
              >
                <Text style={styles.buttonText}>На главную</Text>
              </TouchableOpacity>
            </View>
          </View>
        </CachedBackground>
      </View>
    );
  }

  // Проверка доступа к скрытому профилю
  // Скрытый профиль доступен только владельцу и администраторам
  if (player.is_hidden && currentUser && currentUser.id !== player.id && currentUser.status !== 'admin') {
    return (
      <View style={styles.container}>
        <CachedBackground source={iceBg} style={styles.background} resizeMode="cover">
          <View style={styles.overlay}>
            <View style={styles.errorContainer}>
              <Ionicons name="eye-off-outline" size={64} color="#fa2f40" style={{ marginBottom: 20 }} />
              <Text style={styles.errorText}>
                {t('profile.playerNotFound') === 'profile.playerNotFound' ? 'Player not found' : t('profile.playerNotFound')}
              </Text>
            </View>
          </View>
        </CachedBackground>
      </View>
    );
  }



  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <CachedBackground source={iceBg} style={styles.background} resizeMode="cover">
        <View style={styles.overlay}>
          {/* Заголовок страницы с именем игрока */}
          {player && (
            <View style={styles.pageHeader}>
              <TouchableOpacity 
                onPress={() => {
                  // Проверяем параметр returnTo для явного указания, куда возвращаться
                  const returnToValue = Array.isArray(returnTo) ? returnTo[0] : returnTo;
                  const chatIdValue = Array.isArray(chatId) ? chatId[0] : chatId;
                  
                  if (returnToValue === 'chat' && chatIdValue) {
                    // Возвращаемся в конкретный чат
                    router.push(`/chat/${chatIdValue}`);
                  } else if (returnToValue === 'messages') {
                    // Возвращаемся в список сообщений
                    router.push('/messages');
                  } else if (returnToValue === 'notifications') {
                    // Возвращаемся в уведомления
                    router.push('/notifications');
                  } else if (returnToValue === 'search') {
                    // Возвращаемся в поиск
                    router.push('/search');
                  } else if (returnToValue === 'home') {
                    // Возвращаемся на главный экран
                    router.push('/');
                  } else if (returnToValue === 'player' && returnToPlayerId) {
                    // Возвращаемся в профиль другого игрока (из списка друзей)
                    const returnPlayerId = Array.isArray(returnToPlayerId) ? returnToPlayerId[0] : returnToPlayerId;
                    router.push({
                      pathname: `/player/${returnPlayerId}`,
                      params: { returnTo: returnToValue }
                    });
                  } else {
                    // Пытаемся вернуться назад через нативный стек навигации
                    try {
                      if (navigation.canGoBack()) {
                        navigation.goBack();
                      } else if (router.canGoBack()) {
                        router.back();
                      } else {
                        // Если нет истории, переходим на главный экран
                        router.replace('/');
                      }
                    } catch (error) {
                      // Если произошла ошибка, пробуем router.back()
                      console.log('⚠️ Ошибка навигации, пробуем router.back():', error);
                      if (router.canGoBack()) {
                        router.back();
                      } else {
                        router.replace('/');
                      }
                    }
                  }
                }} 
                style={styles.backButton}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.pageTitle}>{player.name}</Text>
              {profileViews !== null && (
                <View style={styles.profileViewsHeaderWrap}>
                  <Ionicons name="eye-outline" size={14} color="#888" />
                  <Text style={styles.profileViewsHeaderNum}>{profileViews.total}</Text>
                  {profileViews.today > 0 && (
                    <Text style={styles.profileViewsHeaderToday}> +{profileViews.today}</Text>
                  )}
                </View>
              )}
            </View>
          )}
          
          <ScrollView 
            ref={scrollViewRef} 
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              onScrollBeginDrag={Keyboard.dismiss}
              onScroll={(event) => {
                // Сохраняем позицию прокрутки для восстановления при Realtime обновлениях
                savedScrollPositionRef.current = event.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <View>
            {/* Фото и основная информация */}
            <View style={styles.profileSection}>
              {/* Кнопка с 3 точками в правом верхнем углу профиля */}
              {/* Для чужих профилей: показывается всегда (кроме админов) */}
              {/* Для своего профиля: показывается только в режиме редактирования */}
              {currentUser && player && 
               ((currentUser.id !== player.id && 
                 player.status !== 'admin' && 
                 currentUser.status !== 'admin') ||
                (currentUser.id === player.id && currentUser.status !== 'admin' && isEditing)) && (
                <TouchableOpacity
                  ref={profileMenuButtonRef}
                  onPress={handleOpenProfileMenu}
                  style={styles.profileMenuButton}
                  hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}
                >
                  <Ionicons name="ellipsis-vertical" size={24} color="rgba(255, 255, 255, 0.6)" />
                </TouchableOpacity>
              )}
              <View style={styles.avatarContainer}>
                <View style={styles.avatarWrapper}>
                  {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                    <TouchableOpacity 
                      style={styles.profileImage}
                      onPress={pickImage}
                    >
                      {(() => {
                        // Используем editData.avatar если есть, иначе player.avatar
                        const imageSource = editData.avatar || player.avatar;
                        const hasValidImage = imageSource && typeof imageSource === 'string' && (
                          imageSource.startsWith('data:image/') || 
                          imageSource.startsWith('http') || 
                          imageSource.startsWith('file://') || 
                          imageSource.startsWith('content://')
                        );

                        if (hasValidImage) {
                          return (
                            <View style={[styles.profileImage]}>
                              <View style={[styles.innerCircle, { borderColor: getAvatarBorderColorInside(player.status) }]}>
                                <CachedAvatar
                                  key={imageSource} // Добавляем key для принудительного перерендеринга при изменении аватара
                                  playerId={player.id}
                                  fallbackAvatarUrl={imageSource}
                                  size={100}
                                  style={styles.avatarImage}
                                />
                              </View>
                            </View>
                          );
                        } else {
                          return (
                            <View style={[styles.profileImage]}>
                              <View style={[styles.innerCircle, styles.avatarPlaceholder, { borderColor: getAvatarBorderColorInside(player.status) }]}>
                                <Ionicons name={player.status === 'shop' ? 'storefront' : player.status === 'skateSharpening' ? 'construct' : 'person'} size={48} color="#FFFFFF" />
                              </View>
                            </View>
                          );
                        }
                      })()}
                      <View style={[styles.editOverlay, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(1, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center', borderRadius: 60 }]}>
                        <Ionicons name="camera" size={24} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  ) : (
                    (() => {
                      // Отладочный лог отключен
                      const imageSource = player.avatar;
                      const hasValidImage = imageSource && typeof imageSource === 'string' && (
                        imageSource.startsWith('data:image/') || 
                        imageSource.startsWith('http') || 
                        imageSource.startsWith('file://') || 
                        imageSource.startsWith('content://')
                      );
                      // Отладочный лог отключен

                      if (hasValidImage) {
                        return (
                          <View style={[styles.profileImage]}>
                            <View style={[styles.innerCircle, { borderColor: getAvatarBorderColorInside(player.status) }]}>
                              <CachedAvatar
                                playerId={player.id}
                                fallbackAvatarUrl={imageSource}
                                size={100}
                                style={styles.avatarImage}
                                status={player.status}
                              />
                            </View>
                          </View>
                        );
                      } else {
                        return (
                          <View style={[styles.profileImage]}>
                            <View style={[styles.innerCircle, styles.avatarPlaceholder, { borderColor: getAvatarBorderColorInside(player.status) }]}>
                              {player.status === 'scout' ? (
                                <>
                                  {/* Отладочный лог отключен */}
                                  <Image 
                                    source={require('../../assets/images/scout.png')} 
                                    style={styles.avatarImage}
                                  />
                                </>
                              ) : (
                                <Ionicons name={player.status === 'shop' ? 'storefront' : player.status === 'skateSharpening' ? 'construct' : 'person'} size={48} color="#FFFFFF" />
                              )}
                            </View>
                          </View>
                        );
                      }
                    })()
                  )}
                  {player.is_hidden && (
                    <View style={styles.hiddenBadge}>
                      <Ionicons name="eye-off-outline" size={18} color="#fa2f40" />
                    </View>
                  )}
                </View>
              
                {/* Activity Rating - показывается только владельцу и администратору */}
                <ActivityRating 
                  userId={player.id}
                  currentUserId={currentUser?.id}
                  isAdmin={currentUser?.status === 'admin'}
                  refreshKey={activityRefreshKey}
                />
              </View>
              
              <View style={styles.nameRow}>
                {isEditing ? (
                  <TextInput
                    style={[styles.editInput, { fontSize: 28, fontFamily: 'Gilroy-Bold', color: '#fff', textAlign: 'center', marginBottom: 5 }]}
                    value={editData.name || player.name || ''}
                    onFocus={handleInputFocus}
                    onChangeText={(text) => {
                      const latinOnly = text.replace(/[^a-zA-Z\s\-]/g, '');
                      setEditData({...editData, name: latinOnly.toUpperCase()});
                    }}
                    placeholder="NAME SURNAME"
                    placeholderTextColor="#888"
                    autoCapitalize="characters"
                  />
                ) : player.status !== 'scout' ? (
                  <Text style={styles.playerName}>
                    {player.name?.toUpperCase()}
                  </Text>
                ) : null}
                {player.status !== 'shop' && player.status !== 'skateSharpening' && player.status !== 'coach' && player.status !== 'scout' && (
                  isEditing ? (
                    <TextInput
                      style={[styles.editInput, { width: 60, marginLeft: 10, marginTop: -4, fontSize: 28, fontFamily: 'Gilroy-Bold', textAlign: 'center' }]}
                      value={editData.number !== undefined ? editData.number : (player.number || '')}
                      onFocus={handleInputFocus}
                      onChangeText={(text) => setEditData({...editData, number: text})}
                      placeholder="#"
                      keyboardType="numeric"
                      maxLength={2}
                    />
                  ) : (player.number || (currentUser && currentUser.id === player.id)) ? (
                    <View style={styles.numberBadge}>
                      <Text style={styles.numberText}>#{player.number || '?'}</Text>
                    </View>
                  ) : null
                )}
              </View>
              
              {/* Социальные ссылки */}
              {!isEditing && (
                <SocialLinks
                  instagram={player.instagram}
                  tiktok={player.tiktok}
                  website={player.website}
                />
              )}
              
              {/* Индикатор заблокированного пользователя */}
              {isUserBlockedState && currentUser && currentUser.id !== player.id && (
                <View style={styles.blockedIndicator}>
                  <Ionicons name="ban" size={20} color="#fa2f40" />
                  <Text style={styles.blockedIndicatorText}>
                    {t('profile.profileBlocked') || 'Профиль заблокирован'}
                  </Text>
                </View>
              )}
              
              <View style={styles.statusContainer}>
                <Text style={styles.playerStatus}>
                  {player.status === 'player' ? t('profile.player') : 
                   player.status === 'coach' ? t('profile.coach') : 
                   player.status === 'scout' ? t('profile.scout') : 
                   player.status === 'admin' ? t('profile.admin') : 
                   player.status === 'shop' ? t('profile.shop') : 
                   player.status === 'skateSharpening' ? t('profile.skateSharpening') : 
                   player.status === 'star' ? t('profile.star') : t('profile.player')}
                </Text>
              </View>
              {playerTeams.length > 0 && (
                <View style={styles.playerTeamsContainer}>
                  {playerTeams.map((team, index) => {
                    const getTeamName = () => {
                        const translationKey = `teams.${team.teamName}`;
                      const translated = t(translationKey);
                      // Если функция t() вернула сам ключ, значит перевода нет - используем оригинальное название
                      if (translated === translationKey || translated.startsWith('teams.')) {
                        return team.teamName;
                      }
                      return translated;
                    };
                    return (
                      <Text key={index} style={styles.playerTeam}>
                        {getTeamName()}{index < playerTeams.length - 1 ? ', ' : ''}
                    </Text>
                    );
                  })}
                </View>
              )}
              
              {/* Опыт в хоккее */}
              {player.status === 'player' && player.hockeyStartDate && (
                <View style={styles.hockeyExperienceContainer}>
                  <Text style={styles.hockeyExperienceText}>
                  {calculateHockeyExperience(player.hockeyStartDate, language)}
                </Text>
                </View>
              )}

            </View>



            {/* Если пользователь заблокирован - показываем только основную информацию и сообщение */}
            {isUserBlockedState && currentUser && currentUser.id !== player.id ? (
              <SectionCard>
                <View style={styles.blockedProfileMessage}>
                  <Ionicons name="ban" size={48} color="#fa2f40" style={{ marginBottom: 16 }} />
                  <Text style={styles.blockedProfileTitle}>
                    {t('profile.profileBlocked') || 'Профиль заблокирован'}
                  </Text>
                  <Text style={styles.blockedProfileText}>
                    {t('profile.profileBlockedMessage') || 'Вы заблокировали этого пользователя. Большая часть информации скрыта.'}
                  </Text>
                </View>
              </SectionCard>
            ) : (
              <>
            {/* Кнопки администратора */}
            {currentUser && currentUser.status === 'admin' && currentUser.id === player?.id && (
              <SectionCard>
                <TouchableOpacity 
                  style={[styles.friendRequestButton, styles.adminAddUserButton]} 
                  onPress={() => router.push('/admin/create-user')}
                >
                  <Ionicons name="person-add-outline" size={20} color="#fff" />
                  <Text style={styles.friendRequestButtonText}>
                    {t('admin.addUser')}
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.friendRequestButton, styles.adminUsersButton]} 
                  onPress={() => router.push('/admin/users')}
                >
                  <Ionicons name="people-outline" size={20} color="#fff" />
                  <Text style={styles.friendRequestButtonText}>
                    Управление пользователями
                  </Text>
                </TouchableOpacity>
              </SectionCard>
            )}


            {/* Кнопки действий - перемещены вверх перед статистикой */}
            {currentUser && player && currentUser.id !== player.id && (
              <View ref={friendRequestRef} style={styles.actionsSectionTop}>
                {/* Кнопка управления дружбой - для звезд */}
                {player.status === 'star' && (
                  <>
                    {friendshipStatus === 'received_request' ? (
                      <View style={{ gap: 10, marginBottom: 10 }}>
                        <TouchableOpacity 
                          style={[styles.actionButton, { backgroundColor: '#4CAF50' }]} 
                          onPress={handleAddFriend}
                          disabled={friendLoading}
                        >
                          <Ionicons name="checkmark-outline" size={20} color="#fff" />
                          <Text style={styles.actionButtonText}>
                            {friendLoading ? t('common.loading') : t('notifications.accept')}
                          </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={[styles.actionButton, { backgroundColor: '#fa2f40' }]} 
                          onPress={handleDeclineFriend}
                          disabled={friendLoading}
                        >
                          <Ionicons name="close-outline" size={20} color="#fff" />
                          <Text style={styles.actionButtonText}>
                            {friendLoading ? t('common.loading') : t('notifications.decline')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : friendshipStatus === 'friends' ? (
                      <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: '#fa2f40', marginBottom: 10 }]} 
                        onPress={handleAddFriend}
                        disabled={friendLoading}
                      >
                        <Ionicons name="person-remove-outline" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>
                          {friendLoading ? t('common.loading') : t('profile.removeFromFriends')}
                        </Text>
                      </TouchableOpacity>
                    ) : (friendshipStatus === 'sent_request' || friendshipStatus === 'pending') ? (
                      <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: '#FF9800', marginBottom: 10 }]} 
                        onPress={handleAddFriend}
                        disabled={friendLoading}
                      >
                        <Ionicons name="close-outline" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>
                          {friendLoading ? t('common.loading') : t('profile.cancelRequest')}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: '#fa2f40', marginBottom: 10 }]} 
                        onPress={handleAddFriend}
                        disabled={friendLoading}
                      >
                        <Ionicons name="person-add-outline" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>
                          {friendLoading ? t('common.loading') : t('profile.addFriend')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {/* Кнопка управления дружбой - для не-звезд и не-скаутов */}
                {player.status !== 'star' && player.status !== 'scout' && (
                  <>
                    {friendshipStatus === 'received_request' ? (
                      <View style={{ gap: 10, marginBottom: 10 }}>
                        <TouchableOpacity 
                          style={[styles.actionButton, { backgroundColor: '#4CAF50' }]} 
                          onPress={handleAddFriend}
                          disabled={friendLoading}
                        >
                          <Ionicons name="checkmark-outline" size={20} color="#fff" />
                          <Text style={styles.actionButtonText}>
                            {friendLoading ? t('common.loading') : t('notifications.accept')}
                          </Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity 
                          style={[styles.actionButton, { backgroundColor: '#fa2f40' }]} 
                          onPress={handleDeclineFriend}
                          disabled={friendLoading}
                        >
                          <Ionicons name="close-outline" size={20} color="#fff" />
                          <Text style={styles.actionButtonText}>
                            {friendLoading ? t('common.loading') : t('notifications.decline')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : friendshipStatus === 'friends' ? (
                      <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: '#fa2f40', marginBottom: 10 }]} 
                        onPress={handleAddFriend}
                        disabled={friendLoading}
                      >
                        <Ionicons name="person-remove-outline" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>
                          {friendLoading ? t('common.loading') : t('profile.removeFromFriends')}
                        </Text>
                      </TouchableOpacity>
                    ) : (friendshipStatus === 'sent_request' || friendshipStatus === 'pending') ? (
                      <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: '#FF9800', marginBottom: 10 }]} 
                        onPress={handleAddFriend}
                        disabled={friendLoading}
                      >
                        <Ionicons name="close-outline" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>
                          {friendLoading ? t('common.loading') : t('profile.cancelRequest')}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity 
                        style={[styles.actionButton, { backgroundColor: '#fa2f40', marginBottom: 10 }]} 
                        onPress={handleAddFriend}
                        disabled={friendLoading}
                      >
                        <Ionicons name="person-add-outline" size={20} color="#fff" />
                        <Text style={styles.actionButtonText}>
                          {friendLoading ? t('common.loading') : t('profile.addFriend')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                )}

                {/* Кнопка написать сообщение */}
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: '#fff', marginBottom: 10 }]} 
                  onPress={() => {
                    router.push({ 
                      pathname: '/chat/[id]', 
                      params: { id: player.id } 
                    });
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="rgb(1,0,0)" />
                  <Text style={[styles.actionButtonText, { color: 'rgb(1,0,0)' }]}>
                    {t('profile.sendMessage')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Статистика текущего сезона - только для обычных игроков с данными, скрыта для скаутов, тренеров (кроме админа) и администраторов */}
            {player && player.status !== 'star' && player.status !== 'shop' && player.status !== 'skateSharpening' && player.status !== 'admin' && player.status !== 'coach' &&
             !(player.status === 'scout' && currentUser?.status !== 'admin') && (() => {
              // Определяем, является ли игрок вратарем (используем функцию нормализации)
              const currentPosition = (isEditing && editData.position) ? editData.position : player.position;
              const isGoalkeeper = isGoalkeeperPosition(currentPosition);
              
              if (isGoalkeeper) {
                // Статистика для вратарей
                const gamesNum = parseInt(player.games || '0') || 0;
                const minutesNum = parseInt(player.minutes || '0') || 0;
                const shotsNum = parseInt(player.shots || '0') || 0;
                const savesNum = parseInt(player.saves || '0') || 0;
                
                // Расчет SV (save percentage в десятичном формате, например 0.922)
                const savePercentage = shotsNum > 0 ? (savesNum / shotsNum).toFixed(3) : '0.000';
                
                // Расчет GAA (среднее количество пропущенных голов за игру)
                // GAA = (пропущенные голы * 60) / проведенные минуты
                // Пропущенные голы = броски - сэйвы
                const goalsAgainst = shotsNum - savesNum;
                const gaa = minutesNum > 0 ? ((goalsAgainst * 60) / minutesNum).toFixed(2) : '0.00';
                
                // Показываем статистику только если есть хотя бы одно ненулевое значение
                const hasStats = gamesNum > 0 || minutesNum > 0 || shotsNum > 0 || savesNum > 0;
                const isOwner = currentUser && currentUser.id === player.id;
                
                return (hasStats || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id)) || isOwner) ? (
                  <SectionCard ref={statsRef}>
                    <Text style={styles.sectionTitle}>{t('profile.statistics')}</Text>
                    {isEditing ? (
                      <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>{t('profile.gamesCount')}</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editData.games !== undefined ? editData.games : (player.games || '')}
                            onFocus={handleInputFocus}
                            onChangeText={(text) => setEditData({...editData, games: text})}
                            placeholder="0"
                            placeholderTextColor="#888"
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>{t('profile.minutes')}</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editData.minutes !== undefined ? editData.minutes : (player.minutes || '')}
                            onFocus={handleInputFocus}
                            onChangeText={(text) => setEditData({...editData, minutes: text})}
                            placeholder="0"
                            placeholderTextColor="#888"
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>{t('profile.shots')}</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editData.shots !== undefined ? editData.shots : (player.shots || '')}
                            onFocus={handleInputFocus}
                            onChangeText={(text) => setEditData({...editData, shots: text})}
                            placeholder="0"
                            placeholderTextColor="#888"
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>{t('profile.saves')}</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editData.saves !== undefined ? editData.saves : (player.saves || '')}
                            onFocus={handleInputFocus}
                            onChangeText={(text) => setEditData({...editData, saves: text})}
                            placeholder="0"
                            placeholderTextColor="#888"
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.statsGrid}>
                        {(gamesNum > 0 || isOwner) && (
                          <View style={styles.statItem}>
                            <View style={styles.statCircle}>
                              <Text style={styles.statValue}>{gamesNum.toString()}</Text>
                              <ChangeIndicator 
                                change={getChangeForField('games')} 
                                size="small" 
                              />
                            </View>
                            <View style={styles.statLabelContainer}>
                              <Text style={styles.statLabel}>
                                {t('profile.gamesCount') === 'profile.gamesCount' ? 'игры' : t('profile.gamesCount')}
                              </Text>
                            </View>
                          </View>
                        )}
                        {(minutesNum > 0 || isOwner) && (
                          <View style={styles.statItem}>
                            <View style={styles.statCircle}>
                              <Text style={styles.statValueGoalkeeperCount}>{minutesNum.toString()}</Text>
                              <ChangeIndicator 
                                change={getChangeForField('minutes')} 
                                size="small" 
                              />
                            </View>
                            <View style={styles.statLabelContainer}>
                              <Text style={styles.statLabel}>
                                {t('profile.minutes') === 'profile.minutes' ? 'минуты' : t('profile.minutes')}
                              </Text>
                            </View>
                          </View>
                        )}
                        {(shotsNum > 0 || isOwner) && (
                          <View style={styles.statItem}>
                            <View style={styles.statCircle}>
                              <Text style={styles.statValueGoalkeeperCount}>{shotsNum.toString()}</Text>
                              <ChangeIndicator 
                                change={getChangeForField('shots')} 
                                size="small" 
                              />
                            </View>
                            <View style={styles.statLabelContainer}>
                              <Text style={styles.statLabel}>
                                {t('profile.shots') === 'profile.shots' ? 'броски' : t('profile.shots')}
                              </Text>
                            </View>
                          </View>
                        )}
                        {(savesNum > 0 || isOwner) && (
                          <View style={styles.statItem}>
                            <View style={styles.statCircle}>
                              <Text style={styles.statValueGoalkeeperCount}>{savesNum.toString()}</Text>
                              <ChangeIndicator 
                                change={getChangeForField('saves')} 
                                size="small" 
                              />
                            </View>
                            <View style={styles.statLabelContainer}>
                              <Text style={styles.statLabel}>
                                {t('profile.saves') === 'profile.saves' ? 'сэйвы' : t('profile.saves')}
                              </Text>
                            </View>
                          </View>
                        )}
                        {(shotsNum > 0 || isOwner) && (
                          <View style={styles.statItem}>
                            <View style={styles.statCircle}>
                              <Text style={styles.statValueGoalkeeper}>{savePercentage}</Text>
                            </View>
                            <View style={styles.statLabelContainer}>
                              <Text style={[styles.statLabel, styles.statLabelSmall]}>
                                {t('profile.savePercentage') === 'profile.savePercentage' ? 'SV%' : t('profile.savePercentage')}
                              </Text>
                            </View>
                          </View>
                        )}
                        {(minutesNum > 0 || isOwner) && (
                          <View style={styles.statItem}>
                            <View style={styles.statCircle}>
                              <Text style={styles.statValueGoalkeeper}>{gaa}</Text>
                            </View>
                            <View style={styles.statLabelContainer}>
                              <Text style={[styles.statLabel, styles.statLabelSmall]}>
                                {t('profile.goalsAgainstAverage') === 'profile.goalsAgainstAverage' ? 'GAA' : t('profile.goalsAgainstAverage')}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                  </SectionCard>
                ) : null;
              } else {
                // Статистика для полевых игроков
                const goalsNum = parseInt(player.goals || '0') || 0;
                const assistsNum = parseInt(player.assists || '0') || 0;
                const gamesNum = parseInt(player.games || '0') || 0;
                const pointsNum = goalsNum + assistsNum;
                const effectiveness = gamesNum > 0 ? (pointsNum / gamesNum).toFixed(1) : '0.0';
                
                // Показываем статистику только если есть хотя бы одно ненулевое значение
                const hasStats = pointsNum > 0 || goalsNum > 0 || assistsNum > 0 || gamesNum > 0;
                const isOwner = currentUser && currentUser.id === player.id;
                
                return (hasStats || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id)) || isOwner) ? (
                  <SectionCard ref={statsRef}>
                    <Text style={styles.sectionTitle}>{t('profile.statistics')}</Text>
                    {isEditing ? (
                      <View style={styles.statsGrid}>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>{t('profile.gamesCount')}</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editData.games !== undefined ? editData.games : (player.games || '')}
                            onFocus={handleInputFocus}
                            onChangeText={(text) => setEditData({...editData, games: text})}
                            placeholder="0"
                            placeholderTextColor="#888"
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>{t('profile.goalsCount')}</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editData.goals !== undefined ? editData.goals : (player.goals || '')}
                            onFocus={handleInputFocus}
                            onChangeText={(text) => setEditData({...editData, goals: text})}
                            placeholder="0"
                            placeholderTextColor="#888"
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.statItem}>
                          <Text style={styles.statLabel}>{t('profile.assists')}</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editData.assists !== undefined ? editData.assists : (player.assists || '')}
                            onFocus={handleInputFocus}
                            onChangeText={(text) => setEditData({...editData, assists: text})}
                            placeholder="0"
                            placeholderTextColor="#888"
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                    ) : (
                      <View style={styles.statsGrid}>
                        {(pointsNum > 0 || isOwner) && (
                          <View style={styles.statItem}>
                            <View style={styles.statCircle}>
                              <Text style={styles.statValue}>{pointsNum.toString()}</Text>
                            </View>
                            <View style={styles.statLabelContainer}>
                              <Text style={styles.statLabel}>
                                {t('profile.points') === 'profile.points' ? 'очки' : t('profile.points')}
                              </Text>
                            </View>
                          </View>
                        )}
                        {(assistsNum > 0 || isOwner) && (
                          <View style={styles.statItem}>
                            <View style={styles.statCircle}>
                              <Text style={styles.statValue}>{assistsNum.toString()}</Text>
                              <ChangeIndicator 
                                change={getChangeForField('assists')} 
                                size="small" 
                              />
                            </View>
                            <View style={styles.statLabelContainer}>
                              <Text style={styles.statLabel}>
                                {t('profile.assists') === 'profile.assists' ? 'передачи' : t('profile.assists')}
                              </Text>
                            </View>
                          </View>
                        )}
                        {(goalsNum > 0 || isOwner) && (
                          <View style={styles.statItem}>
                            <View style={styles.statCircle}>
                              <Text style={styles.statValue}>{goalsNum.toString()}</Text>
                              <ChangeIndicator 
                                change={getChangeForField('goals')} 
                                size="small" 
                              />
                            </View>
                            <View style={styles.statLabelContainer}>
                              <Text style={styles.statLabel}>
                                {t('profile.goalsCount') === 'profile.goalsCount' ? 'голы' : t('profile.goalsCount')}
                              </Text>
                            </View>
                          </View>
                        )}
                        {(gamesNum > 0 || isOwner) && (
                          <View style={styles.statItem}>
                            <View style={styles.statCircle}>
                              <Text style={styles.statValue}>{gamesNum.toString()}</Text>
                              <ChangeIndicator 
                                change={getChangeForField('games')} 
                                size="small" 
                              />
                            </View>
                            <View style={styles.statLabelContainer}>
                              <Text style={styles.statLabel}>
                                {t('profile.gamesCount') === 'profile.gamesCount' ? 'игры' : t('profile.gamesCount')}
                              </Text>
                            </View>
                          </View>
                        )}
                        {((pointsNum > 0 && gamesNum > 0) || isOwner) && (
                          <View style={styles.statItem}>
                            <View style={styles.statCircle}>
                              <Text style={styles.statValue}>{effectiveness}</Text>
                            </View>
                            <View style={styles.statLabelContainer}>
                              <Text style={[styles.statLabel, styles.statLabelSmall]}>
                                {t('profile.effectiveness') === 'profile.effectiveness' ? 'результативность' : t('profile.effectiveness')}
                              </Text>
                            </View>
                          </View>
                        )}
                      </View>
                    )}
                  </SectionCard>
                ) : null;
              }
            })()}

            {/* Основная информация - скрыта для скаутов (кроме админа) */}
            {!(player.status === 'scout' && currentUser?.status !== 'admin') && (
            <SectionCard wrapperStyle={styles.compactSectionWrapper}>
              <Text style={styles.sectionTitle}>{t('profile.basicInfo')}</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>{t('profile.country')}</Text>
                  {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setShowCountryPicker(true)}
                    >
                      <Text style={styles.pickerButtonText}>
                        {editData.country ? t(`profile.countries.${editData.country}`) : (player.country ? t(`profile.countries.${player.country}`) : t('selectCountry'))}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#fff" />
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.infoValue}>{player.country ? t(`profile.countries.${player.country}`) : t('profile.notSpecified')}</Text>
                  )}
                </View>

                {/* Номер телефона - админ видит все телефоны, магазины и заточка видны всем, владелец при редактировании */}
                {((currentUser?.status === 'admin' || player.status === 'shop' || player.status === 'skateSharpening' || isEditing) && (player.phone || isEditing)) && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('profile.phone')}</Text>
                    {isEditing ? (
                      <TextInput
                        style={styles.editInput}
                        value={editData.phone !== undefined ? editData.phone : (player.phone || '')}
                        onFocus={handleInputFocus}
                        onChangeText={(text) => setEditData({...editData, phone: text})}
                        placeholder={t('profile.phone')}
                        placeholderTextColor="#888"
                        keyboardType="phone-pad"
                      />
                    ) : player.phone ? (
                      <TouchableOpacity 
                        onPress={() => Linking.openURL(`tel:${player.phone}`)}
                        activeOpacity={0.7}
                        style={styles.phoneButton}
                      >
                        <View style={styles.phoneIconContainer}>
                          <Ionicons name="call" size={12} color="#fff" />
                        </View>
                        <Text style={[
                          styles.phoneButtonText,
                          (player.status === 'shop' || player.status === 'skateSharpening') ? { color: '#FFFFFF' } : null
                        ]}>{player.phone}</Text>
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.infoValue}>{t('profile.notSpecified')}</Text>
                    )}
                  </View>
                )}

                {/* Адрес - только для магазинов */}
                {player.status === 'shop' && (player.address || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id)) || (currentUser && currentUser.id === player.id)) && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('profile.address')}</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TextInput
                        style={styles.editInput}
                        value={editData.address !== undefined ? editData.address : (player.address || '')}
                        onFocus={handleInputFocus}
                        onChangeText={(text) => setEditData({...editData, address: text})}
                        placeholder={t('profile.address')}
                      />
                    ) : (
                      <Text style={styles.infoValue}>{player.address}</Text>
                    )}
                  </View>
                )}


                {/* Часы работы - только для магазинов */}
                {player.status === 'shop' && (player.workingHours || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id)) || (currentUser && currentUser.id === player.id)) && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('profile.workingHours')}</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TextInput
                        style={styles.editInput}
                        value={editData.workingHours !== undefined ? editData.workingHours : (player.workingHours || '')}
                        onFocus={handleInputFocus}
                        onChangeText={(text) => setEditData({...editData, workingHours: text})}
                        placeholder={t('profile.workingHours')}
                      />
                    ) : (
                      <Text style={styles.infoValue}>{player.workingHours}</Text>
                    )}
                  </View>
                )}

                {/* Email - только для магазинов */}
                {player.status === 'shop' && (player.email || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id)) || (currentUser && currentUser.id === player.id)) && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Email</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TextInput
                        style={styles.editInput}
                        value={editData.email !== undefined ? editData.email : (player.email || '')}
                        onFocus={handleInputFocus}
                        onChangeText={(text) => setEditData({...editData, email: text})}
                        placeholder="Email"
                        keyboardType="email-address"
                      />
                    ) : (
                      <Text style={styles.infoValue}>{player.email}</Text>
                    )}
                  </View>
                )}

                {/* Поля для заточки коньков */}
                {player.status === 'skateSharpening' && (player.address || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id)) || (currentUser && currentUser.id === player.id)) && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('profile.address')}</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TextInput
                        style={styles.editInput}
                        value={editData.address !== undefined ? editData.address : (player.address || '')}
                        onFocus={handleInputFocus}
                        onChangeText={(text) => setEditData({...editData, address: text})}
                        placeholder={t('profile.address')}
                      />
                    ) : (
                      <Text style={styles.infoValue}>{player.address}</Text>
                    )}
                  </View>
                )}

                {/* Часы работы - для заточки коньков */}
                {player.status === 'skateSharpening' && (player.workingHours || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id)) || (currentUser && currentUser.id === player.id)) && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('profile.workingHours')}</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TextInput
                        style={styles.editInput}
                        value={editData.workingHours !== undefined ? editData.workingHours : (player.workingHours || '')}
                        onFocus={handleInputFocus}
                        onChangeText={(text) => setEditData({...editData, workingHours: text})}
                        placeholder={t('profile.workingHours')}
                      />
                    ) : (
                      <Text style={styles.infoValue}>{player.workingHours}</Text>
                    )}
                  </View>
                )}

                {/* Email - для заточки коньков */}
                {player.status === 'skateSharpening' && (player.email || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id)) || (currentUser && currentUser.id === player.id)) && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Email</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TextInput
                        style={styles.editInput}
                        value={editData.email !== undefined ? editData.email : (player.email || '')}
                        onFocus={handleInputFocus}
                        onChangeText={(text) => setEditData({...editData, email: text})}
                        placeholder="Email"
                        keyboardType="email-address"
                      />
                    ) : (
                      <Text style={styles.infoValue}>{player.email}</Text>
                    )}
                  </View>
                )}

                {/* Скидка для друзей - для заточки коньков */}
                {player.status === 'skateSharpening' && (player.discountForFriends || isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id)) && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('profile.discountForFriends')}</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput
                          style={styles.editInput}
                          value={
                            editData.discountForFriends !== undefined 
                              ? String(editData.discountForFriends).replace('%', '') 
                              : String(player.discountForFriends || '').replace('%', '')
                          }
                          onChangeText={(text) => {
                            const numbersOnly = text.replace(/[^0-9]/g, '');
                            setEditData({...editData, discountForFriends: numbersOnly});
                          }}
                          placeholder=""
                          keyboardType="numeric"
                        />
                        <Text style={{ color: '#fff', marginLeft: 5 }}>%</Text>
                      </View>
                    ) : (
                      <Text style={styles.infoValue}>{player.discountForFriends}</Text>
                    )}
                  </View>
                )}

                {/* Позиция - для всех статусов кроме admin, coach, shop, skateSharpening и scout */}
                {player.status !== 'admin' && player.status !== 'coach' && player.status !== 'shop' && player.status !== 'skateSharpening' && player.status !== 'scout' && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('profile.position')}</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setShowPositionPicker(true)}
                      >
                        <Text style={styles.pickerButtonText}>
                          {isEditing && editData.position ? translatePosition(editData.position) : translatePosition(player.position)}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#fff" />
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.infoValue}>
                        {player.position ? translatePosition(player.position) : t('profile.notSpecified')}
                      </Text>
                    )}
                  </View>
                )}

                {/* Дата рождения - не показываем для магазинов, заточки коньков и скаутов, и если дата не указана */}
                {player.status !== 'shop' && player.status !== 'skateSharpening' && player.status !== 'scout' && (player.birthDate || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id))) && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>
                    {t('profile.birthDate') || 'Дата рождения'}
                  </Text>
                  {isEditing && currentUser?.status === 'admin' ? (
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={showBirthDatePickerModal}
                    >
                      <Text style={styles.pickerButtonText}>
                        {editData.birthDate || player.birthDate || t('register.selectDate')}
                      </Text>
                      <Ionicons name="calendar-outline" size={16} color="#fff" />
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.infoValue}>{formatBirthDate(player.birthDate || '', language)}</Text>
                  )}
                </View>
                )}

                {/* Годы рождения игроков - только для тренеров */}
                {player.status === 'coach' && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>
                      {t('profile.coachingYears') || 'Тренирует годы'}
                    </Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <View style={{ flex: 1 }}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{flexDirection: 'row'}}>
                          {availableYears.map(year => {
                            const isSelected = coachYears.includes(year);
                            return (
                              <TouchableOpacity
                                key={year}
                                style={[
                                  styles.yearButton,
                                  isSelected && styles.yearButtonSelected
                                ]}
                                onPress={() => {
                                  if (isSelected) {
                                    setCoachYears(coachYears.filter(y => y !== year));
                                  } else {
                                    setCoachYears([...coachYears, year].sort((a, b) => b - a));
                                  }
                                }}
                              >
                                <Text style={[
                                  styles.yearButtonText,
                                  isSelected && styles.yearButtonTextSelected
                                ]}>
                                  {year}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      </View>
                    ) : (
                      <Text style={styles.infoValue}>
                        {coachYears.length > 0 ? coachYears.sort((a, b) => b - a).join(', ') : (t('profile.notSpecified') || 'Не указано')}
                      </Text>
                    )}
                  </View>
                )}

                {player.status === 'player' && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('profile.startedHockey')}</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={showHockeyStartDatePickerModal}
                      >
                        <Text style={styles.pickerButtonText}>
                          {editData.hockeyStartDate || player.hockeyStartDate || t('register.selectDate')}
                        </Text>
                        <Ionicons name="calendar-outline" size={16} color="#fff" />
                      </TouchableOpacity>
                  ) : (
                      <Text style={styles.infoValue}>
                        {player.hockeyStartDate || t('profile.notSpecified')}
                      </Text>
                  )}
                </View>
                )}
                {player.status === 'player' && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('profile.grip')}</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setShowGripPicker(true)}
                      >
                        <Text style={styles.pickerButtonText}>
                          {isEditing && editData.grip ? translateGrip(editData.grip) : translateGrip(player.grip || '')}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#fff" />
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.infoValue}>
                        {player.grip ? translateGrip(player.grip) : t('profile.notSpecified')}
                      </Text>
                    )}
                  </View>
                )}
              </View>
            </SectionCard>
            )}

            {/* Карта - только для магазинов */}
              {player.status === 'shop' && player.address && (
               <SectionCard>
                 <Text style={styles.sectionTitle}>{t('profile.map')}</Text>
                 <View style={styles.mapContainer}>
                  {Platform.OS === 'web' ? (
                    <iframe
                      srcDoc={`
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                          <style>
                            body { margin: 0; padding: 0; }
                            #map { width: 100%; height: 200px; }
                          </style>
                          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                        </head>
                        <body>
                          <div id="map"></div>
                          <script>
                            const map = L.map('map').setView([53.9, 27.6], 13);
                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                              attribution: '© OpenStreetMap contributors'
                            }).addTo(map);
                            
                            // Добавляем маркер по адресу
                            const address = '${player.address}';
                            if (address) {
                              // Простой геокодинг через Nominatim
                              fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(address) + '&limit=1')
                                .then(response => response.json())
                                .then(data => {
                                  if (data && data.length > 0) {
                                    const lat = parseFloat(data[0].lat);
                                    const lon = parseFloat(data[0].lon);
                                    map.setView([lat, lon], 15);
                                    L.marker([lat, lon]).addTo(map)
                                      .bindPopup('<b>${player.address}</b>').openPopup();
                                  }
                                })
                                .catch(err => console.error('Geocoding error:', err));
                            }
                          </script>
                        </body>
                        </html>
                      `}
                      width="100%"
                      height="200"
                      style={{ border: 0, borderRadius: 12 }}
                    />
                  ) : (
                    <WebView
                      source={{
                        html: `
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <style>
                              body { margin: 0; padding: 0; }
                              #map { width: 100%; height: 200px; }
                            </style>
                            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                          </head>
                          <body>
                            <div id="map"></div>
                            <script>
                              const map = L.map('map').setView([53.9, 27.6], 13);
                              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                attribution: '© OpenStreetMap contributors'
                              }).addTo(map);
                              
                              // Добавляем маркер по адресу
                              const address = '${player.address}';
                              if (address) {
                                // Простой геокодинг через Nominatim
                                fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(address) + '&limit=1')
                                  .then(response => response.json())
                                  .then(data => {
                                    if (data && data.length > 0) {
                                      const lat = parseFloat(data[0].lat);
                                      const lon = parseFloat(data[0].lon);
                                      map.setView([lat, lon], 15);
                                      L.marker([lat, lon]).addTo(map)
                                        .bindPopup('<b>${player.address}</b>').openPopup();
                                    }
                                  })
                                  .catch(err => console.error('Geocoding error:', err));
                              }
                            </script>
                          </body>
                          </html>
                        `
                      }}
                      style={styles.map}
                      javaScriptEnabled={true}
                      domStorageEnabled={true}
                      startInLoadingState={true}
                      scalesPageToFit={true}
                      allowsInlineMediaPlayback={true}
                      mediaPlaybackRequiresUserAction={false}
                      onError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.error('WebView error: ', nativeEvent);
                      }}
                      onHttpError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.error('WebView http error: ', nativeEvent);
                      }}
                    />
                )}
                 </View>
               </SectionCard>
            )}

            {/* Скидка для друзей - только для магазинов */}
              {player.status === 'shop' && (player.discountForFriends || isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id)) && (
               <SectionCard>
                 <Text style={styles.sectionTitle}>{t('profile.discountForFriends')}</Text>
                 <Text style={styles.discountExplanation}>
                  {t('profile.discountForFriendsHint')}
                </Text>
                {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                  <View style={[styles.discountEditContainer, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>
                    <TextInput
                      style={styles.discountEditInput}
                      value={
                        editData.discountForFriends !== undefined 
                          ? String(editData.discountForFriends).replace('%', '') 
                          : String(player.discountForFriends || '').replace('%', '')
                      }
                      onChangeText={(text) => {
                        // Разрешаем только цифры, без процента
                        const numbersOnly = text.replace(/[^0-9]/g, '');
                        setEditData({...editData, discountForFriends: numbersOnly});
                      }}
                      placeholder=""
                      keyboardType="numeric"
                      placeholderTextColor="#FFFFFF"
                    />
                    <Text style={{ fontSize: 128, fontFamily: 'Gilroy-Bold', color: '#FFFFFF', marginLeft: 10 }}>%</Text>
                  </View>
                ) : (
                  <ImageBackground 
                    source={iceBg} 
                    style={styles.discountContainer}
                    resizeMode="cover"
                  >
                    <Text style={styles.discountValue}>
                      {player.discountForFriends ? 
                        (player.discountForFriends.includes('%') ? 
                          player.discountForFriends : 
                          `${player.discountForFriends}%`
                        ) : 
                        t('profile.notSpecified')
                      }
                    </Text>
                  </ImageBackground>
                )}
               </SectionCard>
              )}

            {/* Услуги заточки коньков - только для заточки коньков */}
              {player.status === 'skateSharpening' && (
               <SectionCard>
                 <Text style={styles.sectionTitle}>
                  {t('profile.skateServices') || 'Услуги'}
                </Text>
                {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {availableSkateServices.map(service => {
                      const isSelected = skateServices.includes(service);
                      return (
                        <TouchableOpacity
                          key={service}
                          style={[
                            styles.yearButton,
                            isSelected && styles.yearButtonSelected,
                            { marginBottom: 10 }
                          ]}
                          onPress={() => {
                            if (isSelected) {
                              setSkateServices(skateServices.filter(s => s !== service));
                            } else {
                              setSkateServices([...skateServices, service]);
                            }
                          }}
                        >
                          <Text style={[
                            styles.yearButtonText,
                            isSelected && styles.yearButtonTextSelected
                          ]}>
                            {t(`profile.${service}`) || service}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {skateServices.length > 0 ? (
                      skateServices.map(service => (
                        <View key={service} style={[styles.yearButton, styles.yearButtonSelected, { marginBottom: 10 }]}>
                          <Text style={[styles.yearButtonText, styles.yearButtonTextSelected]}>
                            {t(`profile.${service}`) || service}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.infoValue}>{t('profile.notSpecified') || 'Не указано'}</Text>
                    )}
                  </View>
                )}
               </SectionCard>
              )}

            {/* Карта - для заточки коньков */}
              {player.status === 'skateSharpening' && player.address && (
               <SectionCard>
                 <Text style={styles.sectionTitle}>{t('profile.map')}</Text>
                 <View style={styles.mapContainer}>
                  {Platform.OS === 'web' ? (
                    <iframe
                      srcDoc={`
                        <!DOCTYPE html>
                        <html>
                        <head>
                          <meta name="viewport" content="width=device-width, initial-scale=1.0">
                          <style>
                            body { margin: 0; padding: 0; }
                            #map { width: 100%; height: 200px; }
                          </style>
                          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                        </head>
                        <body>
                          <div id="map"></div>
                          <script>
                            const map = L.map('map').setView([53.9, 27.6], 13);
                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                              attribution: '© OpenStreetMap contributors'
                            }).addTo(map);
                            
                            // Добавляем маркер по адресу
                            const address = '${player.address}';
                            if (address) {
                              // Простой геокодинг через Nominatim
                              fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(address) + '&limit=1')
                                .then(response => response.json())
                                .then(data => {
                                  if (data && data.length > 0) {
                                    const lat = parseFloat(data[0].lat);
                                    const lon = parseFloat(data[0].lon);
                                    map.setView([lat, lon], 15);
                                    L.marker([lat, lon]).addTo(map)
                                      .bindPopup('<b>${player.address}</b>').openPopup();
                                  }
                                })
                                .catch(err => console.error('Geocoding error:', err));
                            }
                          </script>
                        </body>
                        </html>
                      `}
                      width="100%"
                      height="200"
                      style={{ border: 'none', borderRadius: '12px' }}
                    />
                  ) : (
                    <WebView
                      source={{
                        html: `
                          <!DOCTYPE html>
                          <html>
                          <head>
                            <meta name="viewport" content="width=device-width, initial-scale=1.0">
                            <style>
                              body { margin: 0; padding: 0; }
                              #map { width: 100%; height: 200px; }
                            </style>
                            <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                            <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                          </head>
                          <body>
                            <div id="map"></div>
                            <script>
                              const map = L.map('map').setView([53.9, 27.6], 13);
                              L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                attribution: '© OpenStreetMap contributors'
                              }).addTo(map);
                              
                              // Добавляем маркер по адресу
                              const address = '${player.address}';
                              if (address) {
                                // Простой геокодинг через Nominatim
                                fetch('https://nominatim.openstreetmap.org/search?format=json&q=' + encodeURIComponent(address) + '&limit=1')
                                  .then(response => response.json())
                                  .then(data => {
                                    if (data && data.length > 0) {
                                      const lat = parseFloat(data[0].lat);
                                      const lon = parseFloat(data[0].lon);
                                      map.setView([lat, lon], 15);
                                      L.marker([lat, lon]).addTo(map)
                                        .bindPopup('<b>${player.address}</b>').openPopup();
                                    }
                                  })
                                  .catch(err => console.error('Geocoding error:', err));
                              }
                            </script>
                          </body>
                          </html>
                        `
                      }}
                      style={{ height: 200, borderRadius: 12 }}
                      onError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.error('WebView http error: ', nativeEvent);
                      }}
                      onHttpError={(syntheticEvent) => {
                        const { nativeEvent } = syntheticEvent;
                        console.error('WebView http error: ', nativeEvent);
                      }}
                    />
                )}
                </View>
               </SectionCard>
            )}

            {/* Скидка для друзей - для заточки коньков */}
              {player.status === 'skateSharpening' && (player.discountForFriends || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id))) && (
               <SectionCard>
                 <Text style={styles.sectionTitle}>{t('profile.discountForFriends')}</Text>
                 <Text style={styles.discountExplanation}>
                  {t('profile.discountForFriendsHint')}
                </Text>
                {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                  <View style={[styles.discountEditContainer, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>
                    <TextInput
                      style={styles.discountEditInput}
                      value={
                        editData.discountForFriends !== undefined 
                          ? String(editData.discountForFriends).replace('%', '') 
                          : String(player.discountForFriends || '').replace('%', '')
                      }
                      onChangeText={(text) => {
                        // Разрешаем только цифры, без процента
                        const numbersOnly = text.replace(/[^0-9]/g, '');
                        setEditData({...editData, discountForFriends: numbersOnly});
                      }}
                      placeholder=""
                      keyboardType="numeric"
                      placeholderTextColor="#FFFFFF"
                    />
                    <Text style={{ fontSize: 128, fontFamily: 'Gilroy-Bold', color: '#FFFFFF', marginLeft: 10 }}>%</Text>
                  </View>
                ) : (
                  <ImageBackground 
                    source={iceBg} 
                    style={styles.discountContainer}
                    resizeMode="cover"
                  >
                    <Text style={styles.discountValue}>
                      {player.discountForFriends ? 
                        (player.discountForFriends.includes('%') ? 
                          player.discountForFriends : 
                          `${player.discountForFriends}%`
                        ) : 
                        t('profile.notSpecified')
                      }
                    </Text>
                  </ImageBackground>
                )}
               </SectionCard>
              )}

            {/* Социальные сети */}
              {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) && (
               <SectionCard>
                 <Text style={styles.sectionTitle}>{t('editProfile.socialLinks')}</Text>
                 <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('socialLinks.instagram')}</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editData.instagram !== undefined ? editData.instagram : (player.instagram || '')}
                      onChangeText={(text) => setEditData({...editData, instagram: text})}
                      placeholder={t('socialLinks.instagramPlaceholder')}
                      placeholderTextColor="#888"
                    />
              </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('socialLinks.tiktok')}</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editData.tiktok !== undefined ? editData.tiktok : (player.tiktok || '')}
                      onChangeText={(text) => {
                        // TikTok ссылки чувствительны к регистру, преобразуем в нижний регистр
                        const normalizedText = text.toLowerCase();
                        setEditData({...editData, tiktok: normalizedText});
                      }}
                      placeholder={t('socialLinks.tiktokPlaceholder')}
                      placeholderTextColor="#888"
                    />
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('socialLinks.website')}</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editData.website !== undefined ? editData.website : (player.website || '')}
                      onChangeText={(text) => {
                        // Нормализуем website ссылку: удаляем пробелы и нормализуем протокол
                        let normalizedText = text.trim();
                        // Если есть протокол, нормализуем его регистр
                        if (normalizedText.match(/^https?:\/\//i)) {
                          normalizedText = normalizedText.replace(/^https?:\/\//i, (match) => match.toLowerCase());
                        }
                        setEditData({...editData, website: normalizedText});
                      }}
                      placeholder={t('socialLinks.websitePlaceholder')}
                      placeholderTextColor="#888"
                    />
                  </View>
                 </View>
               </SectionCard>
            )}

            {/* Секция команд - не показываем для магазинов, заточки коньков и администраторов */}
            {player.status !== 'shop' && player.status !== 'skateSharpening' && player.status !== 'admin' && (() => {
              const isOwner = currentUser && currentUser.id === player.id;
              const isEditingMode = isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id);
              const hasTeams = playerTeams.length > 0 || pastTeams.length > 0;
              
              // Показываем секцию только если:
              // - есть команды ИЛИ
              // - режим редактирования ИЛИ
              // - это владелец профиля (чтобы он мог добавить команды)
              return hasTeams || isEditingMode || isOwner;
            })() && (() => {
              const isOwner = currentUser && currentUser.id === player.id;
              const isEditingMode = isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id);
              const hasTeams = playerTeams.length > 0 || pastTeams.length > 0;
              
              // В режиме просмотра (не редактирования) показываем секцию только если есть команды или это владелец
              if (!isEditingMode && !hasTeams && !isOwner) {
                return null;
              }
              
              return (
              <SectionCard>
                <Text style={styles.teamsSectionTitle}>{t('profile.teams')}</Text>
                
                  {isEditingMode ? (
                  <>
                    {/* Текущие команды */}
                    <View style={styles.teamsSubsection}>
                      <Text style={styles.subsectionTitle}>{t('profile.currentTeams')}</Text>
                      <CurrentTeamsSection
                        currentTeams={playerTeams}
                        onCurrentTeamsChange={setPlayerTeams}
                        onMoveToPastTeams={(team) => {
                  
                          setPastTeams(prev => [...prev, team]);
                        }}
                        readOnly={false}
                        isEditing={true}
                      />
                    </View>
                    
                    {/* Прошлые команды */}
                    <View style={styles.teamsSubsection}>
                      <Text style={styles.subsectionTitle}>{t('profile.pastTeams')}</Text>
                      <PastTeamsSection
                        pastTeams={pastTeams}
                        isEditing={isEditing}
                        onPastTeamsChange={setPastTeams}
                        onMoveToCurrentTeams={(team) => {
                  
                          setPastTeams(prev => [...prev, team]);
                        }}
                        readOnly={false}
                      />
                    </View>
                  </>
                ) : (
                  <>
                    {/* Текущие команды */}
                    {playerTeams.length > 0 ? (
                      <>
                        <Text style={styles.subsectionTitle}>{t('profile.currentTeams')}</Text>
                        <View style={styles.teamsListContainer}>
                          {playerTeams.map((team, index) => (
                            <View key={`current-${team.id}-${index}`} style={styles.teamItem}>
                              <Animated.View style={styles.rotatedStar}>
                                <Ionicons name="shirt-outline" size={18} color="#fa2f40" />
                              </Animated.View>
                              <Text style={styles.teamsListText}>
                                {(() => {
                        const translationKey = `teams.${team.teamName}`;
                        const translated = t(translationKey);
                        // Если функция t() вернула сам ключ, значит перевода нет - используем оригинальное название
                        if (translated === translationKey || translated.startsWith('teams.')) {
                          return team.teamName;
                        }
                        return translated;
                      })()} ({String(team.startYear || '')} - {t('profile.настоящее время')})
                              </Text>
                            </View>
                          ))}
                        </View>
                      </>
                    ) : isOwner && (
                      <View style={styles.emptySectionContainer}>
                        <Ionicons name="shirt-outline" size={48} color="#666" />
                        <Text style={styles.emptySectionText}>{t('profile.noTeamsYet')}</Text>
                      </View>
                    )}
                    
                    {/* Прошлые команды */}
                    {pastTeams.length > 0 ? (
                      <>
                        <Text style={styles.subsectionTitle}>{t('profile.pastTeams')}</Text>
                        <View style={styles.teamsListContainer}>
                          {pastTeams.map((team, index) => (
                            <View key={`past-${team.id}-${index}`} style={styles.teamItem}>
                              <Animated.View style={styles.rotatedStar}>
                                <Ionicons name="shirt-outline" size={18} color="#888" />
                              </Animated.View>
                              <Text style={styles.teamsListText}>
                                {(() => {
                        const translationKey = `teams.${team.teamName}`;
                        const translated = t(translationKey);
                        // Если функция t() вернула сам ключ, значит перевода нет - используем оригинальное название
                        if (translated === translationKey || translated.startsWith('teams.')) {
                          return team.teamName;
                        }
                        return translated;
                      })()} ({String(team.startYear || '')}{team.endYear && team.endYear !== team.startYear ? ` - ${team.endYear}` : ''})
                              </Text>
                            </View>
                          ))}
                        </View>
                      </>
                    ) : null}
                  </>
                )}
              </SectionCard>
              );
            })()}

            {/* Индивидуальные тренировки - только для тренеров */}
              {player.status === 'coach' && (
               <SectionCard>
                 <Text style={styles.sectionTitle}>
                   {t('profile.individualTraining') || 'Индивидуальные тренировки'}
                 </Text>
                {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {availableTrainingTypes.map(trainingType => {
                      const isSelected = individualTraining.includes(trainingType);
                      return (
                        <TouchableOpacity
                          key={trainingType}
                          style={[
                            styles.yearButton,
                            isSelected && styles.yearButtonSelected,
                            { marginBottom: 10 }
                          ]}
                          onPress={() => {
                            if (isSelected) {
                              setIndividualTraining(individualTraining.filter(t => t !== trainingType));
                            } else {
                              setIndividualTraining([...individualTraining, trainingType]);
                            }
                          }}
                        >
                          <Text style={[
                            styles.yearButtonText,
                            isSelected && styles.yearButtonTextSelected
                          ]}>
                            {t(`profile.${trainingType}`) || trainingType}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {individualTraining.length > 0 ? (
                      individualTraining.map(trainingType => (
                        <View key={trainingType} style={[styles.yearButton, styles.yearButtonSelected, { marginBottom: 10 }]}>
                          <Text style={[styles.yearButtonText, styles.yearButtonTextSelected]}>
                            {t(`profile.${trainingType}`) || trainingType}
                          </Text>
                        </View>
                      ))
                    ) : (
                      <Text style={styles.infoValue}>{t('profile.notSpecified') || 'Не указано'}</Text>
                    )}
                  </View>
                )}
               </SectionCard>
            )}

            {/* Физические данные - только для игроков (не тренеры) */}
            {player.status === 'player' && (() => {
              // Проверяем, есть ли хотя бы один параметр или мы в режиме редактирования
              const hasHeight = player.height && parseInt(player.height) > 0;
              const hasWeight = player.weight && parseInt(player.weight) > 0;
              const isEditingMode = isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id);
              const isOwner = currentUser && currentUser.id === player.id;
              
              // Показываем раздел если:
              // - есть хотя бы один параметр ИЛИ
              // - мы в режиме редактирования ИЛИ
              // - это владелец профиля (чтобы стимулировать заполнение)
              if (!isEditingMode && !hasHeight && !hasWeight && !isOwner) {
                return null;
              }
              
              return (
              <SectionCard>
                <Text style={styles.sectionTitle}>{t('profile.physicalData')}</Text>
                <View style={styles.infoGrid}>
                    {/* Рост - показываем если указан, в режиме редактирования или это владелец профиля */}
                    {(hasHeight || isEditingMode || isOwner) && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('profile.height')}</Text>
                        {isEditingMode ? (
                      <TextInput
                        ref={heightInputRef}
                        style={styles.editInput}
                        value={editData.height !== undefined ? editData.height : (player.height || '')}
                        onChangeText={(text) => setEditData({...editData, height: text})}
                        onFocus={handleHeightFocus}
                        placeholder={`${t('profile.height')} (${t('profile.cm')})`}
                        placeholderTextColor="#888"
                        keyboardType="numeric"
                      />
                    ) : (
                          <Text style={styles.infoValue}>{`${player.height} ${t('profile.cm')}`}</Text>
                    )}
                  </View>
                    )}
                    {/* Вес - показываем если указан, в режиме редактирования или это владелец профиля */}
                    {(hasWeight || isEditingMode || isOwner) && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('profile.weight')}</Text>
                        {isEditingMode ? (
                      <TextInput
                        ref={weightInputRef}
                        style={styles.editInput}
                        value={editData.weight !== undefined ? editData.weight : (player.weight || '')}
                        onChangeText={(text) => setEditData({...editData, weight: text})}
                        onFocus={handleWeightFocus}
                        placeholder={`${t('profile.weight')} (${t('profile.kg')})`}
                        placeholderTextColor="#888"
                        keyboardType="numeric"
                      />
                    ) : (
                          <Text style={styles.infoValue}>{`${player.weight} ${t('profile.kg')}`}</Text>
                    )}
                  </View>
                    )}
                </View>
              </SectionCard>
              );
            })()}

            {/* Scout Report — full section (button + videos + report) */}
            {player && (isOwner || (aiAnalysis && aiAnalysis.is_public)) && (() => {
              const completeness = checkProfileCompleteness(player, { current: playerTeams, past: pastTeams });
              return (
                <View ref={aiSectionRef} collapsable={false}>
                  <SectionCard>
                    <AIAnalysisCard
                      analysis={aiAnalysis}
                      playerName={player.name}
                      playerAvatar={player.avatar || undefined}
                      profileUrl={buildInviteLink(player.id)}
                      isOwner={!!isOwner}
                      usageCount={aiUsageCount}
                      maxUsage={5}
                      onGenerate={handleGenerateAnalysis}
                      onTogglePublic={handleToggleAnalysisPublic}
                      onTranslate={handleTranslateAnalysis}
                      isGenerating={isGeneratingAnalysis}
                      canGenerate={completeness.complete}
                      missingFields={completeness.missing}
                      gameVideos={gameVideoLinks.filter(v => v.trim() !== '')}
                      onUpdateGameVideos={setGameVideoLinks}
                      isEditing={!!isEditing}
                      activeInputRef={activeInputRef}
                      onDeleteReport={isOwner ? handleDeleteAnalysis : undefined}
                      onCollapse={() => {
                        setTimeout(() => {
                          aiSectionRef.current?.measureLayout(
                            scrollViewRef.current as any,
                            (_x, y) => {
                              scrollViewRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
                            },
                            () => {}
                          );
                        }, 150);
                      }}
                    />
                  </SectionCard>
                </View>
              );
            })()}

            {/* Видео моментов - только для игроков (не тренеры и не администраторы) */}
            {player.status === 'player' && (() => {
              const isEditingMode = isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id);
              const hasVideos = player.favoriteGoals && 
                                player.favoriteGoals.trim() !== '' && 
                                player.favoriteGoals.trim() !== 'null' &&
                                player.favoriteGoals.split('\n').filter(goal => goal.trim()).length > 0;
              
              // Показываем секцию только если:
              // 1. Режим редактирования (для владельца или админа)
              // 2. Есть реальные видео
              // 3. Это владелец профиля (чтобы стимулировать заполнение)
              const isOwner = currentUser && currentUser.id === player.id;
              if (!isEditingMode && !hasVideos && !isOwner) {
                return null;
              }
              
              // Проверяем, есть ли контент для отображения
              const videoContent = isEditingMode ? (
                <View>
                  <Text style={styles.sectionSubtitle}>
                    {t('addVideoLink')}
                  </Text>
                  <View>
                    {videoFields.map((video, index) => (
                      <View key={index}>
                        <View style={styles.videoFieldContainer}>
                          <View style={styles.videoUrlRow}>
                            <TextInput
                              style={styles.videoUrlInput}
                              value={video.url}
                              onChangeText={(text) => {
                                const newVideoFields = [...videoFields];
                                newVideoFields[index] = { ...newVideoFields[index], url: text };
                                setVideoFields(newVideoFields);
                              }}
                              onFocus={(e) => {
                                activeInputRef.current = e.target as any;
                                // Прокручиваем к полю при фокусе
                                setTimeout(() => {
                                  if (scrollViewRef.current && e.target) {
                                    (e.target as any).measureLayout(
                                      scrollViewRef.current as any,
                                      (x: number, y: number, width: number, height: number) => {
                                        const screenHeight = Dimensions.get('window').height;
                                        const keyboardHeight = Platform.OS === 'ios' ? 350 : 300;
                                        const visibleArea = screenHeight - keyboardHeight;
                                        const inputBottom = y + height;
                                        const targetY = inputBottom - visibleArea + 200;
                                        if (targetY > 0) {
                                          scrollViewRef.current?.scrollTo({ 
                                            y: targetY, 
                                            animated: true 
                                          });
                                        }
                                      },
                                      () => {
                                        // Fallback если measureLayout не работает
                                        (e.target as any).measure((fx: number, fy: number, fw: number, fh: number, px: number, py: number) => {
                                          const screenHeight = Dimensions.get('window').height;
                                          const keyboardHeight = Platform.OS === 'ios' ? 350 : 300;
                                          const visibleArea = screenHeight - keyboardHeight;
                                          const inputBottom = py + fh;
                                          const scrollOffset = inputBottom - visibleArea + 200;
                                          if (scrollOffset > 0) {
                                            scrollViewRef.current?.scrollTo({ 
                                              y: scrollOffset, 
                                              animated: true 
                                            });
                                          }
                                        });
                                      }
                                    );
                                  }
                                }, 300);
                              }}
                              onBlur={() => {
                                activeInputRef.current = null;
                              }}
                              placeholder={t('videoUrlPlaceholder')}
                              placeholderTextColor="#888"
                            />
                            {videoFields.length > 1 && (
                              <TouchableOpacity
                                style={styles.removeVideoButtonInline}
                                onPress={() => {
                                  const newVideoFields = videoFields.filter((_, i) => i !== index);
                                  setVideoFields(newVideoFields.length > 0 ? newVideoFields : [{ url: '', hours: '0', minutes: '0', seconds: '0' }]);
                                }}
                              >
                                <Ionicons name="close-circle" size={20} color="#fa2f40" />
                              </TouchableOpacity>
                            )}
                          </View>
                          <View style={styles.timeInputContainer}>
                          <View style={styles.timeInputWithLabel}>
                            <Text style={styles.timeInputLabel}>{t('timeHour')}</Text>
                        <TextInput
                            style={styles.timeInputField}
                            value={video.hours}
                          onChangeText={(text) => {
                              // Разрешаем только цифры и ограничиваем до 99
                              const numericText = text.replace(/[^0-9]/g, '');
                              const value = numericText === '' ? '0' : Math.min(99, parseInt(numericText)).toString();
                              const newVideoFields = [...videoFields];
                              newVideoFields[index] = { ...newVideoFields[index], hours: value };
                              setVideoFields(newVideoFields);
                            }}
                            onFocus={(e) => {
                              activeInputRef.current = e.target as any;
                              setTimeout(() => {
                                if (scrollViewRef.current && e.target) {
                                  (e.target as any).measureLayout(
                                    scrollViewRef.current as any,
                                    (x: number, y: number, width: number, height: number) => {
                                      const screenHeight = Dimensions.get('window').height;
                                      const keyboardHeight = Platform.OS === 'ios' ? 350 : 300;
                                      const visibleArea = screenHeight - keyboardHeight;
                                      const inputBottom = y + height;
                                      const targetY = inputBottom - visibleArea + 200;
                                      if (targetY > 0) {
                                        scrollViewRef.current?.scrollTo({ 
                                          y: targetY, 
                                          animated: true 
                                        });
                                      }
                                    },
                                    () => {}
                                  );
                                }
                              }, 300);
                            }}
                            onBlur={() => {
                              activeInputRef.current = null;
                            }}
                            placeholder="0"
                            placeholderTextColor="#888"
                            keyboardType="numeric"
                            maxLength={2}
                          />
                          </View>
                          <Text style={styles.timeSeparator}>:</Text>
                          <View style={styles.timeInputWithLabel}>
                            <Text style={styles.timeInputLabel}>{t('timeMinute')}</Text>
                          <TextInput
                            style={styles.timeInputField}
                            value={video.minutes}
                          onChangeText={(text) => {
                              // Разрешаем только цифры и ограничиваем до 59
                              const numericText = text.replace(/[^0-9]/g, '');
                              const value = numericText === '' ? '0' : Math.min(59, parseInt(numericText)).toString();
                              const newVideoFields = [...videoFields];
                              newVideoFields[index] = { ...newVideoFields[index], minutes: value };
                              setVideoFields(newVideoFields);
                          }}
                            onFocus={(e) => {
                              activeInputRef.current = e.target as any;
                              setTimeout(() => {
                                if (scrollViewRef.current && e.target) {
                                  (e.target as any).measureLayout(
                                    scrollViewRef.current as any,
                                    (x: number, y: number, width: number, height: number) => {
                                      const screenHeight = Dimensions.get('window').height;
                                      const keyboardHeight = Platform.OS === 'ios' ? 350 : 300;
                                      const visibleArea = screenHeight - keyboardHeight;
                                      const inputBottom = y + height;
                                      const targetY = inputBottom - visibleArea + 200;
                                      if (targetY > 0) {
                                        scrollViewRef.current?.scrollTo({ 
                                          y: targetY, 
                                          animated: true 
                                        });
                                      }
                                    },
                                    () => {}
                                  );
                                }
                              }, 300);
                            }}
                            onBlur={() => {
                              activeInputRef.current = null;
                          }}
                            placeholder="0"
                          placeholderTextColor="#888"
                            keyboardType="numeric"
                            maxLength={2}
                          />
                          </View>
                          <Text style={styles.timeSeparator}>:</Text>
                          <View style={styles.timeInputWithLabel}>
                            <Text style={styles.timeInputLabel}>{t('timeSecond')}</Text>
                          <TextInput
                            style={styles.timeInputField}
                            value={video.seconds}
                          onChangeText={(text) => {
                              // Разрешаем только цифры и ограничиваем до 59
                              const numericText = text.replace(/[^0-9]/g, '');
                              const value = numericText === '' ? '0' : Math.min(59, parseInt(numericText)).toString();
                              const newVideoFields = [...videoFields];
                              newVideoFields[index] = { ...newVideoFields[index], seconds: value };
                              setVideoFields(newVideoFields);
                            }}
                            onFocus={(e) => {
                              activeInputRef.current = e.target as any;
                              setTimeout(() => {
                                if (scrollViewRef.current && e.target) {
                                  (e.target as any).measureLayout(
                                    scrollViewRef.current as any,
                                    (x: number, y: number, width: number, height: number) => {
                                      const screenHeight = Dimensions.get('window').height;
                                      const keyboardHeight = Platform.OS === 'ios' ? 350 : 300;
                                      const visibleArea = screenHeight - keyboardHeight;
                                      const inputBottom = y + height;
                                      const targetY = inputBottom - visibleArea + 200;
                                      if (targetY > 0) {
                                        scrollViewRef.current?.scrollTo({ 
                                          y: targetY, 
                                          animated: true 
                                        });
                                      }
                                    },
                                    () => {}
                                  );
                                }
                              }, 300);
                            }}
                            onBlur={() => {
                              activeInputRef.current = null;
                            }}
                            placeholder="0"
                          placeholderTextColor="#888"
                            keyboardType="numeric"
                            maxLength={2}
                        />
                          </View>
                        </View>
                        </View>
                        {index < videoFields.length - 1 && (
                          <View style={styles.videoSeparator} />
                        )}
                      </View>
                    ))}
                    <TouchableOpacity
                      style={styles.addMoreButton}
                      onPress={() => {
                        setVideoFields([...videoFields, { url: '', hours: '0', minutes: '0', seconds: '0' }]);
                      }}
                    >
                      <Ionicons name="add-circle" size={24} color="#fff" />
                      <Text style={styles.addMoreButtonText}>{t('addMoreVideo')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : hasVideos ? (
                (() => {
                  const videoUrls = (player.favoriteGoals || '').split('\n').filter(goal => goal.trim());
                  const parsedVideos = videoUrls.map(goal => parseVideoUrl(goal.trim())).filter(v => v !== null);
                  
                  // Если после парсинга не осталось валидных видео, показываем пустое состояние для владельца
                  if (parsedVideos.length === 0) {
                    if (isOwner) {
                      return (
                        <View style={styles.emptySectionContainer}>
                          <Ionicons name="videocam-outline" size={48} color="#666" />
                          <Text style={styles.emptySectionText}>{t('profile.noVideosYet')}</Text>
                        </View>
                      );
                    }
                    return null;
                  }
                  
                  return (
                    <VideoCarousel
                      videos={parsedVideos}
                      onVideoPress={(video) => setSelectedVideo(video)}
                      playerId={player.id}
                      externalRefreshTrigger={videoLikeRefreshTrigger}
                    />
                  );
                })()
              ) : isOwner ? (
                <View style={styles.emptySectionContainer}>
                  <Ionicons name="videocam-outline" size={48} color="#666" />
                  <Text style={styles.emptySectionText}>{t('profile.noVideosYet')}</Text>
                </View>
              ) : null;
              
              // Если нет контента, не показываем секцию
              if (!videoContent) {
                return null;
              }
              
              return (
                <SectionCard ref={videosRef}>
                  <Text style={styles.sectionTitle}>{t('profile.videoMoments')}</Text>
                  {videoContent}
                </SectionCard>
              );
            })()}

{/* Game videos are now inside AIAnalysisCard above */}

            {/* Фотографии - не показываем для звезд и администраторов, для магазинов и заточки коньков доступны всем */}
            {player.status !== 'star' && player.status !== 'admin' && (() => {
              const isShopOrSkateSharpening = player.status === 'shop' || player.status === 'skateSharpening';
              const canSeePhotos = (currentUser && currentUser.id === player.id) || 
                                   (currentUser?.status === 'admin') ||
                                   friendshipStatus === 'friends' ||
                                   isShopOrSkateSharpening;
              const isEditingPhotos = isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id);
              
              // Если нет доступа и не магазин/заточка - показываем заблокированную секцию
              if (!canSeePhotos && !isShopOrSkateSharpening) {
                return (
            <SectionCard ref={photosRef} wrapperStyle={styles.compactSectionWrapper}>
                    <Text style={styles.sectionTitle}>
                      {isShopOrSkateSharpening ? t('profile.photos') : t('profile.hockeyPhotos')}
                    </Text>
                    <View style={styles.lockedSectionContainer}>
                      <Ionicons name="lock-closed" size={48} color="#fa2f40" />
                      <Text style={styles.lockedSectionTitle}>{t('profile.addToFriends')}</Text>
                      <Text style={styles.lockedSectionText}>
                        {t('profile.addToFriendsToSeePhotos', { name: player.name })}
                      </Text>
                    </View>
                  </SectionCard>
                );
              }
              
              // Если нет фото и не режим редактирования - не показываем секцию (кроме владельца)
              const isOwner = currentUser && currentUser.id === player.id;
              if (galleryPhotos.length === 0 && !isEditingPhotos && !isOwner) {
                return null;
              }
              
              return (
                <SectionCard ref={photosRef} wrapperStyle={styles.compactSectionWrapper}>
                  <Text style={styles.sectionTitle}>
                    {isShopOrSkateSharpening ? t('profile.photos') : t('profile.hockeyPhotos')}
                  </Text>
                  {galleryPhotos.length === 0 && !isEditingPhotos && isOwner ? (
                    <View style={styles.emptySectionContainer}>
                      <Ionicons name="images-outline" size={48} color="#666" />
                      <Text style={styles.emptySectionText}>{t('profile.noPhotosYet')}</Text>
                    </View>
                  ) : (
                  <EditablePhotosSection
                    playerId={player.id}
                    photos={galleryPhotos}
                    isEditing={isEditingPhotos}
                    onPhotosChange={async (newPhotos) => {
                      setGalleryPhotos(newPhotos);
                      // Обновляем фото в базе данных
                      try {
                        const updatedPlayer = { ...player, photos: newPhotos };
                        await updatePlayer(player.id, updatedPlayer);
                        setPlayer(updatedPlayer);
                      } catch (error) {
                        console.error('Ошибка обновления фото:', error);
                      }
                    }}
                    isShopProfile={isShopOrSkateSharpening}
                    style={styles.embeddedSectionContent}
                      showTitle={false}
                  />
                  )}
                </SectionCard>
              );
            })()}

            {/* Нормативы - показываем только игрокам (не тренерам и не администраторам), видно всем */}
            {player && player.status === 'player' && player.status !== 'admin' ? (
              // Всегда показываем нормативы всем (убрана проверка дружбы)
                // Для собственного профиля показываем всегда, для других - только если есть данные
                (currentUser && currentUser.id === player.id) ||
                (player.pullUps && player.pullUps !== '0' && player.pullUps !== '' && player.pullUps !== 'null') ||
                (player.pushUps && player.pushUps !== '0' && player.pushUps !== '' && player.pushUps !== 'null') ||
                (player.plankTime && player.plankTime !== '0' && player.plankTime !== '' && player.plankTime !== 'null') ||
                (player.sprint100m && player.sprint100m !== '0' && player.sprint100m !== '' && player.sprint100m !== 'null') ||
                (player.longJump && player.longJump !== '0' && player.longJump !== '' && player.longJump !== 'null') ||
                (player.jumpRope && player.jumpRope !== '0' && player.jumpRope !== '' && player.jumpRope !== 'null') ||
                (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id)) ? (
                  isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                    // Редактируемая версия нормативов
                    <SectionCard ref={normativesRef}>
                      <Text style={styles.sectionTitle}>{t('profile.standards')}</Text>
                      <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>{t('profile.pullUps')}</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editData.pullUps !== undefined ? editData.pullUps : (player.pullUps || '')}
                          onFocus={handleInputFocus}
                            onChangeText={(text) => setEditData({...editData, pullUps: text})}
                            placeholder={t('countPlaceholder')}
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>{t('profile.pushUps')}</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editData.pushUps !== undefined ? editData.pushUps : (player.pushUps || '')}
                          onFocus={handleInputFocus}
                            onChangeText={(text) => setEditData({...editData, pushUps: text})}
                            placeholder={t('countPlaceholder')}
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>{t('profile.plank')}</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editData.plankTime !== undefined ? editData.plankTime : (player.plankTime || '')}
                          onFocus={handleInputFocus}
                            onChangeText={(text) => setEditData({...editData, plankTime: text})}
                            placeholder={t('timePlaceholder')}
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>{t('profile.sprint')}</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editData.sprint100m !== undefined ? editData.sprint100m : (player.sprint100m || '')}
                          onFocus={handleInputFocus}
                            onChangeText={(text) => setEditData({...editData, sprint100m: text})}
                            placeholder={t('timePlaceholder')}
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>{t('profile.longJump')}</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editData.longJump !== undefined ? editData.longJump : (player.longJump || '')}
                          onFocus={handleInputFocus}
                            onChangeText={(text) => setEditData({...editData, longJump: text})}
                            placeholder={t('profile.lengthInCm')}
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>{t('profile.jumpRope')}</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editData.jumpRope !== undefined ? editData.jumpRope : (player.jumpRope || '')}
                          onFocus={handleInputFocus}
                            onChangeText={(text) => setEditData({...editData, jumpRope: text})}
                            placeholder={t('countPlaceholder')}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                    </SectionCard>
                  ) : (() => {
                    // Проверяем, есть ли хотя бы один норматив
                    const hasAnyNormative = 
                      (player.pullUps && player.pullUps !== '0' && player.pullUps !== '' && player.pullUps !== 'null') ||
                      (player.pushUps && player.pushUps !== '0' && player.pushUps !== '' && player.pushUps !== 'null') ||
                      (player.plankTime && player.plankTime !== '0' && player.plankTime !== '' && player.plankTime !== 'null') ||
                      (player.sprint100m && player.sprint100m !== '0' && player.sprint100m !== '' && player.sprint100m !== 'null') ||
                      (player.longJump && player.longJump !== '0' && player.longJump !== '' && player.longJump !== 'null') ||
                      (player.jumpRope && player.jumpRope !== '0' && player.jumpRope !== '' && player.jumpRope !== 'null');
                    
                    const isOwner = currentUser && currentUser.id === player.id;
                    
                    // Не показываем секцию, если нет нормативов (кроме владельца)
                    if (!hasAnyNormative && !isOwner) {
                      return null;
                    }
                    
                    // Если нет нормативов, но это владелец - показываем пустое состояние
                    if (!hasAnyNormative && isOwner) {
                      return (
                        <SectionCard ref={normativesRef}>
                          <Text style={styles.sectionTitle}>{t('profile.standards')}</Text>
                          <View style={styles.emptySectionContainer}>
                            <Ionicons name="fitness-outline" size={48} color="#666" />
                            <Text style={styles.emptySectionText}>{t('profile.noStandardsYet')}</Text>
                          </View>
                        </SectionCard>
                      );
                    }
                    
                    return (
                      <SectionCard ref={normativesRef}>
                        <NormativesSection
                          pullUps={player.pullUps}
                          pushUps={player.pushUps}
                          plankTime={player.plankTime}
                          sprint100m={player.sprint100m}
                          longJump={player.longJump}
                          jumpRope={player.jumpRope}
                          changes={{
                            pullUps: getChangeForField('pullUps'),
                            pushUps: getChangeForField('pushUps'),
                            plankTime: getChangeForField('plankTime'),
                            sprint100m: getChangeForField('sprint100m'),
                            longJump: getChangeForField('longJump'),
                            jumpRope: getChangeForField('jumpRope'),
                          }}
                          style={styles.embeddedSectionContent}
                        />
                      </SectionCard>
                    );
                  })()
                ) : null // Не показываем секцию, если данных нет
            ) : null}

            {/* Секция измерения скорости шайбы - только для игроков, видно всем, скрыта если скорость не измерена (кроме владельца профиля) */}
{player && player.status === 'player' && (() => {
              const hasSpeed = player.puckSpeed && player.puckSpeed > 0;
              const isOwner = currentUser && currentUser.id === player.id;
              return hasSpeed || isOwner;
            })() && (
            <SectionCard ref={puckSpeedRef} wrapperStyle={[styles.compactSectionWrapper, { marginBottom: 0 }]}>
                <Text style={styles.sectionTitle}>
                  {t('puckSpeed.title') || 'Скорость шайбы'}
                </Text>
                  <View style={styles.puckSpeedContainer}>
                    {player.puckSpeed ? (
                      <View style={styles.puckSpeedDisplay}>
                        <View style={styles.puckSpeedValueContainer}>
                          <Text style={styles.puckSpeedValue}>
                          {Math.round(player.puckSpeed)}
                          </Text>
                          <Text style={styles.puckSpeedUnit}>
                            {t('puckSpeed.kmh') || 'км/ч'}
                          </Text>
                        </View>
                      {player.puckSpeedHistory && player.puckSpeedHistory.length > 0 && (() => {
                        // Сортируем по скорости (по убыванию) и берем топ-3
                        const topSpeeds = [...player.puckSpeedHistory]
                          .sort((a, b) => b.speed - a.speed)
                          .slice(0, 3);
                        
                        // Функция форматирования даты
                        const formatDate = (dateString: string) => {
                          try {
                            const date = new Date(dateString);
                            const day = date.getDate().toString().padStart(2, '0');
                            const month = (date.getMonth() + 1).toString().padStart(2, '0');
                            const year = date.getFullYear();
                            return `${day}.${month}.${year}`;
                          } catch {
                            return dateString;
                          }
                        };
                        
                        return (
                          <View style={styles.puckSpeedHistory}>
                            <Text style={styles.puckSpeedHistoryLabel}>
                              {t('puckSpeed.top3') || 'Топ 3 измерений'}
                            </Text>
                            {topSpeeds.map((record, index) => (
                              <View key={index} style={styles.puckSpeedHistoryRow}>
                              <Text style={styles.puckSpeedHistoryValue}>
                                  {Math.round(record.speed)}{' '}{t('puckSpeed.kmh') || 'км/ч'}
                              </Text>
                                <View style={styles.puckSpeedHistoryDateContainer}>
                                  <Text style={styles.puckSpeedHistoryDate}>
                                    {formatDate(record.date)}
                                      </Text>
                                  {isEditing && (currentUser?.id === player.id || currentUser?.status === 'admin') && (
                                    <TouchableOpacity
                                      style={styles.deleteSpeedRecordButton}
                                      onPress={() => {
                                        showCustomAlert(
                                          t('puckSpeed.deleteConfirm') || 'Удалить запись?',
                                          t('puckSpeed.deleteConfirmMessage') || 'Вы уверены, что хотите удалить эту запись?',
                                          'warning',
                                          () => handleDeleteSpeedRecord(record.date)
                                        );
                                      }}
                                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                                      disabled={isDeletingSpeedRecord}
                                    >
                                      <Ionicons 
                                        name="trash-outline" 
                                        size={18} 
                                        color={isDeletingSpeedRecord ? "#888" : "#fa2f40"} 
                                      />
                                    </TouchableOpacity>
                                  )}
                            </View>
                          </View>
                            ))}
                                  </View>
                                );
                            })()}
                      {currentUser && (currentUser.id === player.id || currentUser.status === 'admin') && !isEditing && (
                        <TouchableOpacity
                          style={styles.measureSpeedButton}
                          onPress={() => router.push('/puck-speed-sound')}
                        >
                          <Ionicons name="speedometer" size={24} color="#fff" />
                          <Text style={styles.measureSpeedButtonText}>
                            {player.puckSpeed ? (t('puckSpeed.measureAgain') || 'Измерить снова') : (t('puckSpeed.measure') || 'Измерить скорость')}
                          </Text>
                        </TouchableOpacity>
                      )}
                      </View>
                    ) : (
                      <View style={styles.puckSpeedEmpty}>
                        <Ionicons name="speedometer-outline" size={48} color="#666" />
                        <Text style={styles.puckSpeedEmptyText}>
                          {t('puckSpeed.noMeasurement') || 'Скорость еще не измерена'}
                        </Text>
                      {currentUser && (currentUser.id === player.id || currentUser.status === 'admin') && !isEditing && (
                        <TouchableOpacity
                          style={styles.measureSpeedButton}
                          onPress={() => {
                            // Переходим на экран измерения скорости
                            router.push('/puck-speed-sound');
                          }}
                        >
                          <Ionicons name="add-circle" size={24} color="#fff" />
                          <Text style={styles.measureSpeedButtonText}>
                            {t('puckSpeed.measure') || 'Измерить скорость'}
                          </Text>
                        </TouchableOpacity>
                      )}
                      </View>
                    )}
                 </View>
               </SectionCard>
            )}

            {/* Секция упражнений - только для игроков, скрыта если упражнения не выполнены (кроме владельца) */}
            {player && player.status === 'player' && (() => {
              const hasExercises = player.exerciseStats && player.exerciseStats.totalCompletions && player.exerciseStats.totalCompletions > 0;
              const isOwner = currentUser && currentUser.id === player.id;
              return hasExercises || isOwner;
            })() && (
              <SectionCard wrapperStyle={styles.compactSectionWrapper}>
                <PlayerExercisesSection 
                  player={player} 
                  isOwnProfile={currentUser?.id === player.id}
                  style={styles.embeddedSectionContent}
                />
              </SectionCard>
            )}

            {/* Достижения - не показываем для магазинов, заточки коньков, скаутов и администраторов */}
            {player.status !== 'shop' && player.status !== 'skateSharpening' && player.status !== 'admin' && player.status !== 'scout' && canShowAchievements && (
            <SectionCard ref={achievementsRef} wrapperStyle={styles.compactSectionWrapper}>
              <Text style={styles.sectionTitle}>{t('profile.achievements')}</Text>
              <AchievementsSection 
                achievements={achievements}
                isEditing={isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id)}
                onAchievementsChange={setAchievements}
                style={styles.embeddedSectionContent}
              />
            </SectionCard>
            )}

            {/* Музей игрока - полученные предметы */}
            {/* Показываем музей только для обычных игроков, у звезд, тренеров, скаутов и администраторов его быть не должно */}
            {player && player.status === 'player' && player.status !== 'admin' && (
              (currentUser && currentUser.id === player.id) || 
              (currentUser?.status === 'admin') ||
              (currentUser?.status === 'star') ||
              friendshipStatus === 'friends' ? (
                // Показываем контейнер музея если:
                // 1. Это владелец профиля, админ или звезда - всегда показываем
                // 2. Для друзей - только если есть подарки или данные еще не загрузились (undefined)
                // Скрываем музей для друзей, если явно известно, что он пустой (count === 0)
                (() => {
                  const hasGiftButton = (currentUser?.status === 'admin' || currentUser?.status === 'star');
                  const hasMuseumItems = museumItemsCount[player.id] === undefined || museumItemsCount[player.id] > 0;
                  const isOwner = currentUser?.id === player.id;
                  
                  // Если нет подарков, нет кнопки и это не владелец - не показываем секцию
                  if (!hasMuseumItems && !hasGiftButton && !isOwner) {
                    return false;
                  }
                  return true;
                })() ? (
                  <SectionCard ref={museumRef} wrapperStyle={styles.compactSectionWrapper}>
                  {/* Заголовок музея - показываем всегда */}
                    <Text style={styles.sectionTitle}>{t('profile.museum')}</Text>
                  
                  <PlayerMuseum 
                    playerId={player.id} 
                    currentUserId={currentUser?.id}
                    isOwner={currentUser?.id === player.id}
                    isAdmin={currentUser?.status === 'admin'}
                    isEditing={isEditing}
                    updateTrigger={museumUpdateKey}
                    cachedMuseumItems={museumCache[player.id]} // Передаем undefined если нет кеша
                    playerName={player.name} // Передаем имя игрока для сообщения о пустом музее
                    onMuseumItemsLoaded={(items) => {
                      // Сохраняем загруженные данные в кеш состояния
                      setMuseumCache(prev => ({
                        ...prev,
                        [player.id]: items
                      }));
                      // Сохраняем количество подарков для отображения заголовка
                      setMuseumItemsCount(prev => ({
                        ...prev,
                        [player.id]: items.length
                      }));
                    }}
                    onMuseumUpdated={() => {
                      // Очищаем кеш музея и перезагружаем данные
                      console.log('🎁 PROFILE: ===== onMuseumUpdated ВЫЗВАН =====');
                      console.log('🎁 PROFILE: player.id:', player.id);
                      console.log('🎁 PROFILE: Очищаем кеш музея и счетчик подарков');
                      
                      setMuseumCache(prev => {
                        const newCache = { ...prev };
                        const hadCache = !!prev[player.id];
                        delete newCache[player.id];
                        console.log('🎁 PROFILE: Кеш музея очищен. Был кеш?', hadCache);
                        return newCache;
                      });
                      
                      setMuseumItemsCount(prev => {
                        const newCount = { ...prev };
                        const hadCount = prev[player.id];
                        delete newCount[player.id];
                        console.log('🎁 PROFILE: Счетчик подарков очищен. Было:', hadCount);
                        return newCount;
                      });
                      
                      console.log('🎁 PROFILE: ===== onMuseumUpdated ЗАВЕРШЁН =====');
                    }}
                  />
                  
                  {/* Кнопка отправки подарка для звезд и администраторов */}
                  {(currentUser?.status === 'admin' || currentUser?.status === 'star') && (
                    <View ref={giftButtonRef} style={styles.giftButtonContainer}>
                      <TouchableOpacity 
                        style={styles.giftButtonFull} 
                        onPress={() => {
                          if (currentUser?.status === 'admin') {
                            setShowGiftModal(true);
                          } else if (currentUser?.status === 'star') {
                            setShowStarGiftModal(true);
                          }
                        }}
                      >
                        <Ionicons name="gift-outline" size={20} color="#fff" />
                        <Text style={styles.giftButtonText}>
                          {t('admin.sendGift')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </SectionCard>
                ) : null
              ) : (
                <SectionCard wrapperStyle={styles.compactSectionWrapper}>
                  <Text style={styles.sectionTitle}>{t('profile.museum')}</Text>
                  <View style={styles.lockedSectionContainer}>
                    <Ionicons name="lock-closed" size={48} color="#fa2f40" />
                    <Text style={styles.lockedSectionTitle}>{t('profile.addToFriends')}</Text>
                    <Text style={styles.lockedSectionText}>
                      {t('profile.addToFriendsToSeeMuseum', { name: player.name })}
                    </Text>
                  </View>
                </SectionCard>
              )
            )}

            {/* Друзья - скрыты для скаутов (кроме админа) */}
            {!(player.status === 'scout' && currentUser?.status !== 'admin') && (
            <SectionCard ref={friendsRef} wrapperStyle={styles.compactSectionWrapper}>
              <Text style={styles.sectionTitle}>
                {t('profile.friends')} ({friends.length})
              </Text>
              {friends.length > 0 ? (
                <View style={styles.friendsGrid}>
                  {friends.map((friend) => (
                    <TouchableOpacity
                      key={friend.id}
                      style={styles.friendItem}
                      onPress={() => router.push({
                        pathname: `/player/${friend.id}`,
                        params: { returnTo: 'player', returnToPlayerId: id }
                      })}
                    >
                      <CachedAvatar
                        playerId={friend.id}
                        fallbackAvatarUrl={friend.avatar || 'https://via.placeholder.com/60/333/fff?text=Player'}
                        size={50}
                        style={styles.friendAvatar}
                      />
                      <Text style={styles.friendName} numberOfLines={2}>
                        {friend.name?.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.emptySectionContainer}>
                  <Ionicons name="people-outline" size={48} color="#666" />
                  <Text style={styles.emptySectionText}>{t('profile.noFriendsYet', {name: player.name})}</Text>
                  {!(currentUser && currentUser.id === player.id) && (
                  <Text style={styles.noDataSubtext}>
                    {t('profile.beFirstToAdd', {name: player.name})}
                 </Text>
                  )}
                </View>
              )}
            </SectionCard>
            )}

            {/* Кнопка управления дружбой - для не-звезд и не-скаутов - удалена отсюда, перенесена вверх */}

            {/* Кнопки действий для взаимодействия с профилем */}
            <View style={styles.actionsSection}>
              {currentUser && currentUser.id !== player.id ? (
                // Если пользователь авторизован и смотрит чужой профиль - показываем кнопки взаимодействия
                <>
                  {/* Кнопки для администратора */}
                  {currentUser.status === 'admin' && (
                    <>
                      {isEditing ? (
                        <>
                          <TouchableOpacity 
                            style={[styles.actionButton, { backgroundColor: '#fa2f40' }]} 
                            onPress={handleSave}
                          >
                            <Ionicons name="checkmark-outline" size={20} color="#fff" />
                            <Text style={styles.actionButtonText}>{t('common.save')}</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={[styles.actionButton, { backgroundColor: 'rgb(1,0,0)', borderWidth: 1, borderColor: '#fa2f40' }]} 
                            onPress={() => {
                              setIsEditing(false);
                              setEditData({});
                            }}
                          >
                            <Ionicons name="close-outline" size={20} color="#fff" />
                            <Text style={styles.actionButtonText}>{t('common.cancel')}</Text>
                          </TouchableOpacity>
                        </>
                      ) : null}
                    </>
                  )}
                  

                </>
              ) : !currentUser ? (
                // Если пользователь не авторизован - показываем кнопку входа
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => router.push('/login')}
                >
                  <Ionicons name="log-in-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Войти для взаимодействия</Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Кнопка запроса подарка у звезды - только для игроков */}
            {player.status === 'star' && currentUser && currentUser.id !== player.id && currentUser.status === 'player' && (
              <TouchableOpacity 
                style={[styles.actionButton, { backgroundColor: '#FF8243', marginBottom: 10 }]} 
                onPress={() => setShowRequestGiftModal(true)}
              >
                <Ionicons name="gift-outline" size={20} color="#fff" />
                <Text style={styles.actionButtonText}>
                  {t('gifts.requestGift')}
                </Text>
              </TouchableOpacity>
            )}
              </>
            )}


            {/* Основные кнопки управления профилем */}
            {currentUser && currentUser.id === player.id && (
              <>
                {isEditing ? (
                  // Кнопки для режима редактирования
                  <View style={{ gap: 15, marginTop: 20, marginBottom: 20 }}>
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: '#fa2f40' }]} 
                      onPress={handleSave}
                    >
                      <Ionicons name="checkmark-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>{t('common.save')}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: 'rgb(1,0,0)', borderWidth: 1, borderColor: '#fa2f40' }]} 
                      onPress={() => {
                        setIsEditing(false);
                        setEditData({});
                      }}
                    >
                      <Ionicons name="close-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>{t('profile.cancel')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // Кнопки для обычного режима
                  <View style={{ gap: 15, marginTop: 20, marginBottom: 20 }}>
                    {/* Переключатель языка - только для собственного профиля */}
                    {currentUser && currentUser.id === player?.id && (
                      <SectionCard>
                        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
                        <LanguageSwitcher />
                      </SectionCard>
                    )}
                    
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: '#fa2f40' }]} 
                      onPress={() => {
                        setEditData(player);
                        handleStartEditing();
                      }}
                    >
                      <Ionicons name="create-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>{t('profile.editProfile')}</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: 'rgb(1,0,0)' }]} 
                      onPress={handleLogout}
                    >
                      <Ionicons name="log-out-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>{t('logout')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}



            {/* Кнопка входа в аккаунт для администратора */}
            {currentUser?.status === 'admin' && player && currentUser.id !== player.id && (
              <TouchableOpacity 
                style={[styles.loginAsUserButton, { backgroundColor: '#8B0000' }]}
                onPress={async () => {
                  Alert.alert(
                    t('admin.loginAsUser') || 'Войти в аккаунт',
                    t('admin.loginAsUserConfirm', { name: player.name }) || `Вы уверены, что хотите войти в аккаунт ${player.name}?`,
                    [
                      {
                        text: t('common.cancel') || 'Отмена',
                        style: 'cancel'
                      },
                      {
                        text: t('admin.login') || 'Войти',
                        onPress: async () => {
                          try {
                            // Удаляем push токены старого пользователя перед входом в другой аккаунт
                            if (currentUser && currentUser.id !== player.id) {
                              try {
                                const { deleteUserPushTokens } = await import('../../utils/notificationService');
                                await deleteUserPushTokens(currentUser.id);
                                console.log('✅ Push токены старого пользователя удалены при входе администратора');
                              } catch (tokenError) {
                                // Не критично, если не удалось удалить токены
                                console.warn('⚠️ Не удалось удалить push токены старого пользователя (не критично):', tokenError);
                              }
                            }
                            
                            // Сохраняем нового пользователя
                            await saveCurrentUser(player);
                            
                            // Обновляем контекст пользователя для немедленного обновления интерфейса
                            await refreshUser(true); // forceRefresh = true
                            
                            // Показываем уведомление
                            Alert.alert(
                              t('common.success') || 'Успешно',
                              t('admin.loginAsUserSuccess', { name: player.name }) || `Вы вошли как ${player.name}`,
                              [
                                {
                                  text: 'OK',
                                  onPress: () => {
                                    // Переходим на главную страницу (контекст уже обновлен)
                                    router.replace('/');
                                  }
                                }
                              ]
                            );
                          } catch (error) {
                            console.error('❌ Ошибка входа в аккаунт:', error);
                            Alert.alert(
                              t('common.error') || 'Ошибка',
                              t('admin.loginAsUserError') || 'Не удалось войти в аккаунт'
                            );
                          }
                        }
                      }
                    ]
                  );
                }}
              >
                <Ionicons name="log-in-outline" size={20} color="#fff" />
                <Text style={styles.loginAsUserButtonText}>
                  {t('admin.loginAsUser') || 'Войти в аккаунт'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Кнопки редактирования и удаления для администратора */}
            {currentUser?.status === 'admin' && player && currentUser.id !== player.id && (
             <SectionCard>
                {/* Кнопка изменения статуса */}
                <TouchableOpacity 
                  style={[styles.adminButton, { backgroundColor: '#6B5B95', marginBottom: 10, alignSelf: 'stretch' }]} 
                  onPress={() => {
                    const statuses = [
                      { key: 'player', label: '🏒 Игрок' },
                      { key: 'coach', label: '👨‍🏫 Тренер' },
                      { key: 'star', label: '⭐ Звезда' },
                      { key: 'scout', label: '🔍 Скаут' },
                      { key: 'shop', label: '🏪 Магазин' },
                      { key: 'skateSharpening', label: '⛸️ Заточка' },
                    ];
                    Alert.alert(
                      'Изменить статус',
                      `Текущий статус: ${player.status}\nВыберите новый статус:`,
                      [
                        ...statuses.map(s => ({
                          text: s.label,
                          onPress: async () => {
                            if (s.key === player.status) return;
                            try {
                              await updatePlayer(player.id, { status: s.key as any });
                              Alert.alert('✅', `Статус изменён на "${s.label}"`);
                              // Обновляем данные игрока
                              const updated = await getPlayerById(player.id);
                              if (updated) setPlayer(updated);
                            } catch (e) {
                              Alert.alert('Ошибка', 'Не удалось изменить статус');
                            }
                          }
                        })),
                        { text: 'Отмена', style: 'cancel' }
                      ]
                    );
                  }}
                >
                  <Ionicons name="person-circle-outline" size={20} color="#fff" />
                  <Text style={styles.adminButtonText}>Изменить статус ({player.status})</Text>
                </TouchableOpacity>

                {/* Кнопка редактирования - на отдельной строке */}
                <TouchableOpacity 
                  style={[styles.adminButton, styles.editButton, { marginBottom: 10, alignSelf: 'stretch' }]} 
                  onPress={handleStartEditing}
                >
                  <Ionicons name="create-outline" size={20} color="rgb(1,0,0)" />
                  <Text style={[styles.adminButtonText, styles.editButtonText]}>{t('profile.edit')}</Text>
                </TouchableOpacity>
                
                {/* Кнопки удаления и скрытия - на одной строке */}
                <View style={styles.adminButtonsContainer}>
                  <TouchableOpacity 
                    style={[styles.adminButton, styles.deleteButton]} 
                    onPress={handleDeletePlayer}
                  >
                    <Ionicons name="trash-outline" size={20} color="#fff" />
                    <Text style={styles.adminButtonText}>{t('profile.deleteUser')}</Text>
                  </TouchableOpacity>

                  {/* Кнопка скрыть/показать профиль */}
                  {player.is_hidden ? (
                    <TouchableOpacity 
                      style={[styles.adminButton, { backgroundColor: '#4CAF50' }]} 
                      onPress={() => {
                        Alert.alert(
                          t('admin.unhideProfile') || 'Показать профиль',
                          t('admin.unhideProfileConfirm', { name: player.name }) || `Вы уверены, что хотите показать профиль ${player.name}?`,
                          [
                            {
                              text: t('common.cancel') || 'Отмена',
                              style: 'cancel'
                            },
                            {
                              text: t('common.confirm') || 'Подтвердить',
                              onPress: handleUnhideProfile
                            }
                          ]
                        );
                      }}
                    >
                      <Ionicons name="eye-outline" size={20} color="#fff" />
                      <Text style={styles.adminButtonText}>{t('admin.unhideProfile') || 'Показать профиль'}</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity 
                      style={[styles.adminButton, { backgroundColor: '#000000' }]} 
                      onPress={() => {
                        Alert.alert(
                          t('admin.hideProfile') || 'Скрыть профиль',
                          t('admin.hideProfileConfirm', { name: player.name }) || `Вы уверены, что хотите скрыть профиль ${player.name}? Профиль станет невидимым для всех пользователей.`,
                          [
                            {
                              text: t('common.cancel') || 'Отмена',
                              style: 'cancel'
                            },
                            {
                              text: t('common.confirm') || 'Подтвердить',
                              onPress: handleHideProfile
                            }
                          ]
                        );
                      }}
                    >
                      <Ionicons name="eye-off-outline" size={20} color="#fff" />
                      <Text style={styles.adminButtonText}>{t('admin.hideProfile') || 'Скрыть профиль'}</Text>
                    </TouchableOpacity>
                  )}
                </View>
             </SectionCard>
            )}


            {/* Сообщение о скрытом профиле для владельца */}
            {currentUser && player && currentUser.id === player.id && player.is_hidden && (
             <View style={[styles.section, { marginTop: 20, marginBottom: 20, backgroundColor: 'rgba(250, 47, 64, 0.2)', padding: 15, borderRadius: 12, borderWidth: 1, borderColor: '#fa2f40' }]}>
                <Ionicons name="eye-off-outline" size={24} color="#fa2f40" style={{ marginBottom: 10, alignSelf: 'center' }} />
                <Text style={[styles.sectionTitle, { color: '#fa2f40', textAlign: 'center', marginBottom: 8 }]}>
                  {t('admin.profileHidden') || 'Профиль скрыт'}
                </Text>
                <Text style={[styles.sectionText, { color: '#fff', textAlign: 'center' }]}>
                  {t('admin.profileHiddenMessage') || 'Ваш профиль скрыт администратором. Обратитесь к администратору для восстановления доступа.'}
                 </Text>
             </View>
            )}


            {/* Кнопка написать сообщение - удалена отсюда, перенесена вверх */}

            {/* QR-код профиля */}
            {player && (
              <View style={styles.qrCodeSection}>
                <View style={[styles.qrCodeContainer, { borderWidth: 6, borderColor: '#fa2f40', borderRadius: 12 }]}>
                  <QRCode
                    value={buildInviteLink(player.id)}
                    size={Dimensions.get('window').width - 80}
                    color="#fff"
                    backgroundColor="rgb(1,0,0)"
                    logo={cachedPlayerAvatar ? { uri: cachedPlayerAvatar } : require('../../assets/icon.png')}
                    logoSize={80}
                    logoBackgroundColor="#fff"
                    logoBorderRadius={40}
                    logoMargin={4}
                  />
                </View>
              </View>
            )}

            {/* Кнопки "Поделиться" и "Скопировать ссылку" */}
            {player && (
              <View style={{ marginTop: 10, marginBottom: 10, paddingHorizontal: 20, gap: 10 }}>
                <TouchableOpacity 
                  style={styles.shareButton} 
                  onPress={shareProfile}
                >
                  <Ionicons name="share-outline" size={20} color="#fff" />
                  <Text style={styles.shareButtonText}>
                    {t('profile.shareProfile') || 'Поделиться профилем'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.shareButton, { backgroundColor: '#333' }]} 
                  onPress={async () => {
                    try {
                      const profileUrl = buildInviteLink(player.id);
                      const Clipboard = require('expo-clipboard');
                      await Clipboard.setStringAsync(profileUrl);
                      if (Platform.OS === 'ios') {
                        const Haptics = require('expo-haptics');
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      } else {
                        Vibration.vibrate(50);
                      }
                      showCustomAlert(
                        t('common.success') || 'Успешно',
                        t('profile.linkCopied') || 'Ссылка скопирована в буфер обмена',
                        'success'
                      );
                    } catch (error) {
                      console.error('Ошибка копирования:', error);
                    }
                  }}
                >
                  <Ionicons name="link-outline" size={20} color="#fff" />
                  <Text style={styles.shareButtonText}>
                    {t('profile.copyLink') || 'Скопировать ссылку'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

              </View>
            </TouchableWithoutFeedback>
          </ScrollView>
        </View>
      </CachedBackground>
      
      {/* Меню профиля */}
      <Modal
        visible={profileMenuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCloseProfileMenu}
      >
        <TouchableOpacity
          style={styles.profileMenuOverlay}
          activeOpacity={1}
          onPress={handleCloseProfileMenu}
        >
          <View
            style={[
              styles.profileMenu,
              {
                left: profileMenuPosition.x - 150,
                top: profileMenuPosition.y + 5,
              }
            ]}
          >
            {/* Меню для своего профиля */}
            {currentUser && player && currentUser.id === player.id ? (
              <TouchableOpacity
                style={styles.profileMenuItem}
                onPress={handleDeleteOwnAccount}
                activeOpacity={0.7}
              >
                <Ionicons name="trash-outline" size={18} color="#fa2f40" style={styles.profileMenuIcon} />
                <Text style={[styles.profileMenuText, { color: '#fa2f40' }]}>
                  {t('profile.deleteUser') || t('deleteUser') || 'Удалить аккаунт'}
                </Text>
              </TouchableOpacity>
            ) : (
              /* Меню для чужого профиля */
              <>
                {isUserBlockedState ? (
                  <>
                    <TouchableOpacity
                      style={styles.profileMenuItem}
                      onPress={handleUnblockUser}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="checkmark-circle-outline" size={18} color="#fff" style={styles.profileMenuIcon} />
                      <Text style={styles.profileMenuText}>
                        {t('profile.unblock') || 'Разблокировать'}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.profileMenuDivider} />
                  </>
                ) : (
                  <>
                    <TouchableOpacity
                      style={styles.profileMenuItem}
                      onPress={handleBlockUser}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="ban-outline" size={18} color="#fff" style={styles.profileMenuIcon} />
                      <Text style={styles.profileMenuText}>
                        {t('profile.block') || 'Заблокировать'}
                      </Text>
                    </TouchableOpacity>
                    <View style={styles.profileMenuDivider} />
                  </>
                )}
                <TouchableOpacity
                  style={styles.profileMenuItem}
                  onPress={handleReportFromMenu}
                  activeOpacity={0.7}
                >
                  <Ionicons name="flag-outline" size={18} color="#fff" style={styles.profileMenuIcon} />
                  <Text style={styles.profileMenuText}>
                    {t('profile.reportUser') || t('admin.reportUser') || 'Пожаловаться'}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
      <View style={{ position: 'absolute', left: -10000, top: 0 }}>
        <View 
          ref={shareCardRef} 
          style={styles.shareCard}
          collapsable={false}
        >
          <ImageBackground
            source={require('../../assets/images/star.png')}
            resizeMode="repeat"
            style={styles.shareCard}
            imageStyle={{ opacity: 0.3 }}
          >
            <LinearGradient
              colors={['rgba(26, 26, 26, 0.9)', 'rgba(10, 10, 10, 0.9)']}
              style={styles.shareCardGradient}
            >
            {player && (
              <>
                {/* Аватар - используем cachedPlayerAvatar для актуальности */}
                <View style={styles.shareCardAvatarContainer}>
                  {cachedPlayerAvatar ? (
                    <Image 
                      source={{ 
                        uri: cachedPlayerAvatar,
                        cache: 'reload',
                        headers: {
                          'Cache-Control': 'no-cache'
                        }
                      }} 
                      style={styles.shareCardAvatar}
                    />
                  ) : (
                    <View style={styles.shareCardAvatarPlaceholder}>
                      <Ionicons name="person" size={60} color="#666" />
                    </View>
                  )}
                </View>

                {/* Имя */}
                <Text style={styles.shareCardName}>{player.name}</Text>

                {/* Основная информация - в одну строку */}
                <View style={styles.shareCardMainInfo}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap' }}>
                    {player.position && (
                      <>
                        <Ionicons name="ribbon" size={14} color="#fa2f40" />
                        <Text style={styles.shareCardInfoLine}> {translatePosition(player.position)}</Text>
                      </>
                    )}
                    {player.position && player.country && (
                      <Text style={styles.shareCardSeparator}> | </Text>
                    )}
                    {player.country && (
                      <>
                        <Ionicons name="flag" size={14} color="#fa2f40" />
                        <Text style={styles.shareCardInfoLine}> {t(`profile.countries.${player.country}`)}</Text>
                      </>
                    )}
                    {(player.position || player.country) && player.grip && (
                      <Text style={styles.shareCardSeparator}> | </Text>
                    )}
                    {player.grip && (
                      <>
                        <Ionicons name="hand-left" size={14} color="#fa2f40" />
                        <Text style={styles.shareCardInfoLine}> {translateGrip(player.grip)}</Text>
                      </>
                    )}
                  </View>
                </View>

                {/* Опыт в хоккее - красным цветом без контейнера */}
                {player.hockeyStartDate && (
                  <Text style={styles.shareCardExperience}>
                    {calculateHockeyExperience(player.hockeyStartDate, language)}
                  </Text>
                )}

                {/* Текущая команда */}
                {player.currentTeams && player.currentTeams.length > 0 && (
                  <View style={styles.shareCardTeamContainer}>
                    <Ionicons name="trophy" size={16} color="#fa2f40" />
                    <Text style={styles.shareCardTeamText}>
                      {player.currentTeams[0].teamName}
                    </Text>
                  </View>
                )}

                {/* Статистика текущего сезона */}
                {(player.goals || player.assists || player.games) && player.status === 'player' && (
                  <>
                    <Text style={styles.shareCardStatsTitle}>
                      {t('profile.currentSeasonStats') || 'Статистика текущего сезона'}
                    </Text>
                    <View style={styles.shareCardStatsRow}>
                      {player.games && (
                        <View style={styles.shareCardMiniStat}>
                          <Text style={styles.shareCardMiniStatValue}>{player.games}</Text>
                          <Text style={styles.shareCardMiniStatLabel}>
                            {(t('profile.games') || 'Игры').toLowerCase()}
                          </Text>
                        </View>
                      )}
                      {player.goals && (
                        <View style={styles.shareCardMiniStat}>
                          <Text style={styles.shareCardMiniStatValue}>{player.goals}</Text>
                          <Text style={styles.shareCardMiniStatLabel}>
                            {(t('profile.goals') || 'Голы').toLowerCase()}
                          </Text>
                        </View>
                      )}
                      {player.assists && (
                        <View style={styles.shareCardMiniStat}>
                          <Text style={styles.shareCardMiniStatValue}>{player.assists}</Text>
                          <Text style={styles.shareCardMiniStatLabel}>
                            {(t('profile.assists') || 'Передачи').toLowerCase()}
                          </Text>
                        </View>
                      )}
                      {(player.goals || player.assists) && (
                        <View style={styles.shareCardMiniStat}>
                          <Text style={styles.shareCardMiniStatValue}>
                            {(parseInt(player.goals || '0') + parseInt(player.assists || '0'))}
                          </Text>
                          <Text style={styles.shareCardMiniStatLabel}>
                            {(t('profile.points') || 'Очки').toLowerCase()}
                          </Text>
                        </View>
                      )}
                      {(player.goals || player.assists) && player.games && (
                        <View style={styles.shareCardMiniStat}>
                          <Text style={styles.shareCardMiniStatValue}>
                            {parseInt(player.games) > 0 
                              ? ((parseInt(player.goals || '0') + parseInt(player.assists || '0')) / parseInt(player.games)).toFixed(1)
                              : '0.0'
                            }
                          </Text>
                          <Text style={styles.shareCardMiniStatLabel}>
                            {(t('profile.effectiveness') || 'PPG').toLowerCase()}
                          </Text>
                        </View>
                      )}
                    </View>
                  </>
                )}

                {/* Рекорд скорости шайбы */}
                {player.puckSpeed && player.puckSpeed > 0 && (
                  <View style={styles.shareCardPuckSpeedContainer}>
                    <Text style={styles.shareCardPuckSpeedLabel}>
                      {t('puckSpeed.speedLabel') || 'Скорость шайбы'}
                    </Text>
                    <Text style={styles.shareCardPuckSpeedValue}>
                      {player.puckSpeed} {t('puckSpeed.kmh') || 'км/ч'}
                    </Text>
                  </View>
                )}

                {/* QR-код */}
                <View style={styles.shareCardQRContainer}>
                  <QRCode
                    value={buildInviteLink(player.id)}
                    size={180}
                    color="#fff"
                    backgroundColor="rgb(1,0,0)"
                    logo={cachedPlayerAvatar ? { uri: cachedPlayerAvatar } : require('../../assets/icon.png')}
                    logoSize={50}
                    logoBackgroundColor="#fff"
                    logoBorderRadius={25}
                  />
                </View>

                {/* Логотип внизу */}
                <Image 
                  source={require('../../assets/images/logo.png')} 
                  style={styles.shareCardLogo}
                  resizeMode="contain"
                />
              </>
            )}
            </LinearGradient>
          </ImageBackground>
        </View>
      </View>

      {/* Плавающая кнопка редактирования (когда НЕ в режиме редактирования) */}
      {!isEditing && currentUser && currentUser.id === player?.id && (
        <TouchableOpacity
          style={styles.floatingEditButton}
          onPress={handleStartEditing}
          activeOpacity={0.8}
        >
          <Ionicons name="create-outline" size={28} color="#fa2f40" />
        </TouchableOpacity>
      )}

      {/* Плавающая кнопка сохранения в режиме редактирования */}
      {isEditing && currentUser && currentUser.id === player?.id && (
        <TouchableOpacity
          style={styles.floatingSaveButton}
          onPress={handleSave}
          activeOpacity={0.8}
        >
          <Ionicons name="checkmark" size={28} color="#fff" />
        </TouchableOpacity>
      )}
      
      {/* Модальное окно для видео */}
      <Modal
        visible={selectedVideo !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setSelectedVideo(null);
          setVideoLikeRefreshTrigger(prev => prev + 1);
        }}
      >
        <View style={styles.videoModalOverlay}>
          <TouchableWithoutFeedback onPress={() => {
            setSelectedVideo(null);
            setVideoLikeRefreshTrigger(prev => prev + 1);
          }}>
            <View style={styles.videoModalOverlayTouchable} />
          </TouchableWithoutFeedback>
          <View style={styles.videoModalContainer} pointerEvents="box-none">
            <TouchableOpacity
              style={styles.videoModalCloseButton}
              onPress={() => {
                setSelectedVideo(null);
                setVideoLikeRefreshTrigger(prev => prev + 1);
              }}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            {selectedVideo && (
              <View pointerEvents="box-only" style={styles.videoModalContent}>
              <VideoPlayer 
                url={selectedVideo.url}
                title={t('myMoment')}
                timeCode={selectedVideo.timeCode}
                  onClose={() => {
                    setSelectedVideo(null);
                    setVideoLikeRefreshTrigger(prev => prev + 1);
                  }}
              />
                {player && (
                  <View style={styles.videoModalLikeButton}>
                    <LikeButton
                      playerId={player.id}
                      contentId={generateVideoContentId(selectedVideo.url, selectedVideo.timeCode)}
                      contentType="video"
                    />
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Модальное окно для уведомлений */}
      <CustomAlert
        visible={alert.visible}
        title={alert.title}
        message={alert.message}
        type={alert.type}
        onConfirm={() => {
          setAlert({ ...alert, visible: false });
          if (alert.onConfirm) alert.onConfirm();
        }}
        onCancel={() => setAlert({ ...alert, visible: false })}
        confirmText={alert.confirmText}
        cancelText={alert.cancelText}
        showCancel={alert.showCancel}
      />

      {/* Модальное окно выбора страны */}
      {showCountryPicker && (
        <View style={styles.countryPickerOverlay}>
          <View style={styles.countryPickerModal}>
            <Text style={styles.countryPickerTitle}>{t('profile.selectCountry')}</Text>
            
            <TextInput
              style={styles.countrySearchInput}
              value={countrySearchText}
              onChangeText={setCountrySearchText}
              placeholder={t('profile.searchCountry') || 'Поиск страны...'}
              placeholderTextColor="#888"
            />
            
            <ScrollView style={styles.countryList} showsVerticalScrollIndicator={false}>
              {(countrySearchText 
                ? COUNTRIES.filter(country => 
                    t(`profile.countries.${country}`)?.toLowerCase().includes(countrySearchText.toLowerCase()) ||
                    country.toLowerCase().includes(countrySearchText.toLowerCase())
                  )
                : COUNTRIES
              ).map((country) => {
                const isSelected = (editData.country || player?.country) === country;
                return (
              <TouchableOpacity
                    key={country}
                    style={[
                      styles.countryOption,
                      isSelected && styles.countryOptionSelected
                    ]}
                    onPress={() => {
                      setEditData({...editData, country: country});
                      setShowCountryPicker(false);
                      setCountrySearchText('');
                    }}
              >
                    <Text style={[
                      styles.countryOptionText,
                      isSelected && styles.countryOptionTextSelected
                    ]}>
                      {t(`profile.countries.${country}`) || country}
                    </Text>
              </TouchableOpacity>
                );
              })}
            </ScrollView>
            
                <TouchableOpacity
              style={styles.countryPickerCloseButton}
                  onPress={() => {
                    setShowCountryPicker(false);
                setCountrySearchText('');
                  }}
                >
              <Text style={styles.countryPickerCloseText}>{t('common.close')}</Text>
                </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Модальное окно выбора позиции */}
      {showPositionPicker && (
        <View style={styles.countryPickerOverlay}>
          <View style={styles.countryPickerModal}>
            <Text style={styles.countryPickerTitle}>{t('profile.selectPosition') || t('selectPosition')}</Text>
            
            <View style={styles.pickerContainer}>
              {positions.map((position) => {
                const isSelected = (editData.position || player?.position) === position;
                return (
                <TouchableOpacity
                  key={position}
                    style={[
                      styles.pickerOption,
                      isSelected && styles.pickerOptionSelected
                    ]}
                  onPress={() => {
                    setEditData({...editData, position: position});
                    setShowPositionPicker(false);
                  }}
                >
                    <Text style={[
                      styles.pickerOptionText,
                      isSelected && styles.pickerOptionTextSelected
                    ]}>
                      {positionLabels[position] || position}
                    </Text>
                </TouchableOpacity>
                );
              })}
            </View>
            
            <TouchableOpacity
              style={styles.countryPickerCloseButton}
              onPress={() => setShowPositionPicker(false)}
            >
              <Text style={styles.countryPickerCloseText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Модальное окно выбора хвата */}
      {showGripPicker && (
        <View style={styles.countryPickerOverlay}>
          <View style={styles.countryPickerModal}>
              <Text style={styles.countryPickerTitle}>{t('profile.selectGrip') || t('selectGrip')}</Text>
            
            <View style={styles.pickerContainer}>
              {grips && grips.length > 0 ? grips.map((grip) => {
                const isSelected = (editData.grip || player?.grip) === grip;
                return (
                <TouchableOpacity
                  key={grip}
                    style={[
                      styles.pickerOption,
                      isSelected && styles.pickerOptionSelected
                    ]}
                  onPress={() => {
                    setEditData({...editData, grip: grip});
                    setShowGripPicker(false);
                  }}
                >
                    <Text style={[
                      styles.pickerOptionText,
                      isSelected && styles.pickerOptionTextSelected
                    ]}>
                      {t(`profile.grips.${grip}`) || grip}
                    </Text>
                </TouchableOpacity>
                );
              }) : (
                <View style={styles.pickerOption}>
                  <Text style={styles.pickerOptionText}>Список хватов недоступен</Text>
                  </View>
                )}
            </View>
            
            <TouchableOpacity
              style={styles.countryPickerCloseButton}
              onPress={() => setShowGripPicker(false)}
            >
              <Text style={styles.countryPickerCloseText}>{t('common.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Модальное окно выбора даты рождения */}
      {showBirthDatePicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <DateTimePicker
              value={selectedBirthDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onBirthDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
              textColor="#fff"
              themeVariant="dark"
            />
            {Platform.OS === 'ios' && (
              <View style={styles.datePickerButtons}>
                <TouchableOpacity 
                  style={styles.datePickerButton} 
                  onPress={() => setShowBirthDatePicker(false)}
                >
                  <Text style={styles.datePickerButtonText}>{t('profile.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.datePickerButton, styles.confirmButton]} 
                  onPress={() => {
                    const day = selectedBirthDate.getDate().toString().padStart(2, '0');
                    const month = (selectedBirthDate.getMonth() + 1).toString().padStart(2, '0');
                    const year = selectedBirthDate.getFullYear().toString();
                    const formattedDate = `${day}.${month}.${year}`;
                    setEditData({...editData, birthDate: formattedDate});
                    setShowBirthDatePicker(false);
                  }}
                >
                  <Text style={styles.datePickerButtonText}>{t('common.confirm')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Модальное окно выбора месяца и года начала хоккея */}
      {showHockeyStartDatePicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.datePickerModal}>
            <DateTimePicker
              value={selectedHockeyStartDate}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onHockeyStartDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
              textColor="#fff"
              themeVariant="dark"
            />
            {Platform.OS === 'ios' && (
              <View style={styles.datePickerButtons}>
                <TouchableOpacity 
                  style={styles.datePickerButton} 
                  onPress={() => setShowHockeyStartDatePicker(false)}
                >
                  <Text style={styles.datePickerButtonText}>{t('profile.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.datePickerButton, styles.confirmButton]} 
                  onPress={() => {
                    const month = (selectedHockeyStartDate.getMonth() + 1).toString().padStart(2, '0');
                    const year = selectedHockeyStartDate.getFullYear().toString();
                    const formattedDate = `${month}.${year}`;
                    setEditData({...editData, hockeyStartDate: formattedDate});
                    setShowHockeyStartDatePicker(false);
                  }}
                >
                  <Text style={styles.datePickerButtonText}>{t('common.confirm')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Модальное окно подарка */}
      {currentUser && currentUser.status === 'admin' && player && (
        <AdminGiftModal
          visible={showGiftModal}
          onClose={() => setShowGiftModal(false)}
          onGiftSent={async () => {
            console.log('🎁 PROFILE: ===== onGiftSent ВЫЗВАН (AdminGiftModal) =====');
            console.log('🎁 PROFILE: player.id:', player.id);
            console.log('🎁 PROFILE: player.name:', player.name);
            
            setShowGiftModal(false);
            console.log('🎁 PROFILE: showGiftModal = false');
            
            // Очищаем кеш музея для текущего игрока
            console.log('🎁 PROFILE: Очищаем кеш музея (state + AsyncStorage) для', player.id);
            
            // Очищаем state кеш
            setMuseumCache(prev => {
              const newCache = { ...prev };
              const hadCache = !!prev[player.id];
              delete newCache[player.id];
              console.log('🎁 PROFILE: State кеш музея очищен. Был кеш?', hadCache);
              return newCache;
            });
            
            // Очищаем AsyncStorage кеш
            try {
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              const cacheKey = `museum_${player.id}`;
              await AsyncStorage.removeItem(cacheKey);
              console.log('🎁 PROFILE: AsyncStorage кеш музея очищен');
            } catch (error) {
              console.error('🎁 PROFILE: ❌ Ошибка очистки AsyncStorage кеша:', error);
            }
            
            // НЕ удаляем museumItemsCount, чтобы контейнер музея оставался видимым
            // Количество обновится автоматически через onMuseumItemsLoaded
            
            console.log('🎁 PROFILE: Запускаем таймер для обновления museumUpdateKey...');
            // Принудительно обновляем музей через небольшую задержку
            setTimeout(() => {
              // Триггерим обновление музея через изменение ключа
              console.log('🎁 PROFILE: Обновляем museumUpdateKey для принудительного обновления');
              setMuseumUpdateKey(prev => {
                console.log('🎁 PROFILE: museumUpdateKey:', prev, '->', prev + 1);
                return prev + 1;
              });
            }, 100);
            console.log('🎁 PROFILE: ===== onGiftSent ЗАВЕРШЁН =====');
          }}
          adminId={currentUser.id}
          playerId={player.id}
          playerName={player.name}
          updateNotificationCount={updateNotificationCount}
        />
      )}

      {/* Модальное окно подарка для звезд */}
      {currentUser && currentUser.status === 'star' && player && (
        <StarGiftModal
          visible={showStarGiftModal}
          onClose={() => setShowStarGiftModal(false)}
          onGiftSent={async () => {
            console.log('🎁 PROFILE: ===== onGiftSent ВЫЗВАН (StarGiftModal) =====');
            console.log('🎁 PROFILE: player.id:', player.id);
            console.log('🎁 PROFILE: player.name:', player.name);
            
            setShowStarGiftModal(false);
            console.log('🎁 PROFILE: showStarGiftModal = false');
            
            // Очищаем кеш музея для текущего игрока
            console.log('🎁 PROFILE: Очищаем кеш музея (state + AsyncStorage) для', player.id);
            
            // Очищаем state кеш
            setMuseumCache(prev => {
              const newCache = { ...prev };
              const hadCache = !!prev[player.id];
              delete newCache[player.id];
              console.log('🎁 PROFILE: State кеш музея очищен. Был кеш?', hadCache);
              return newCache;
            });
            
            // Очищаем AsyncStorage кеш
            try {
              const AsyncStorage = require('@react-native-async-storage/async-storage').default;
              const cacheKey = `museum_${player.id}`;
              await AsyncStorage.removeItem(cacheKey);
              console.log('🎁 PROFILE: AsyncStorage кеш музея очищен');
            } catch (error) {
              console.error('🎁 PROFILE: ❌ Ошибка очистки AsyncStorage кеша:', error);
            }
            
            // НЕ удаляем museumItemsCount, чтобы контейнер музея оставался видимым
            // Количество обновится автоматически через onMuseumItemsLoaded
            
            console.log('🎁 PROFILE: Запускаем таймер для обновления museumUpdateKey...');
            // Принудительно обновляем музей через небольшую задержку
            setTimeout(() => {
              // Триггерим обновление музея через изменение ключа
              console.log('🎁 PROFILE: Обновляем museumUpdateKey для принудительного обновления');
              setMuseumUpdateKey(prev => {
                console.log('🎁 PROFILE: museumUpdateKey:', prev, '->', prev + 1);
                return prev + 1;
              });
            }, 100);
            console.log('🎁 PROFILE: ===== onGiftSent ЗАВЕРШЁН =====');
          }}
          starId={currentUser.id}
          playerId={player.id}
          playerName={player.name}
          updateNotificationCount={updateNotificationCount}
        />
      )}

      {/* Модал для запроса подарка у звезды */}
      {player.status === 'star' && currentUser && currentUser.id !== player.id && currentUser.status === 'player' && (
        <Modal
          visible={showRequestGiftModal}
          animationType="fade"
          transparent={true}
          onRequestClose={() => setShowRequestGiftModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {t('gifts.requestGift')}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowRequestGiftModal(false)}
                  style={styles.closeButton}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
              </View>

              <ScrollView 
                style={styles.modalContent}
                contentContainerStyle={styles.modalContentContainer}
                keyboardShouldPersistTaps="handled"
              >
              <View style={styles.formGroup}>
                <Text style={styles.label}>{t('gifts.requestMessage')} *</Text>
                <Text style={styles.helperText}>
                  {t('gifts.requestMessageHelper') || 'Напишите сообщение звезде, какой подарок вы хотели бы получить'}
                </Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={requestGiftMessage}
                  onChangeText={setRequestGiftMessage}
                  placeholder={t('gifts.requestMessagePlaceholder') || 'Напишите ваше сообщение...'}
                  placeholderTextColor="#666"
                  multiline
                  numberOfLines={6}
                  maxLength={500}
                />
                <Text style={styles.characterCount}>
                  {requestGiftMessage.length}/500 {t('gifts.characters') || 'символов'}
                </Text>
              </View>

              <View style={styles.formGroup}>
                <TouchableOpacity
                  style={[styles.submitButton, requestGiftLoading && styles.submitButtonDisabled]}
                  onPress={handleRequestGift}
                  disabled={requestGiftLoading}
                >
                  <Text style={styles.submitButtonText}>
                    {requestGiftLoading ? (t('gifts.sending') || 'Отправка...') : (t('gifts.sendRequest') || 'Отправить запрос')}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.infoBox}>
                <Ionicons name="information-circle" size={18} color="#FF8243" />
                <Text style={styles.infoText}>
                  {t('gifts.requestInfo') || 'Звезда получит ваше сообщение и сможет выбрать подарок для вас'}
                </Text>
              </View>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgb(1,0,0)',
  },
  background: {
    flex: 1,
    backgroundColor: 'rgb(1,0,0)',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 0, 0, 0.8)',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingTop: 48, // Отступ для фиксированного заголовка
    paddingHorizontal: 20,
    paddingBottom: 50, // Уменьшено для устранения большого отступа внизу
  },
  editButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 40,
    paddingTop: 20,
    paddingBottom: 10,
  },
  editButton: {
    padding: 12,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
  },
  giftButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#45a049',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#fa2f40',
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 200,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
    position: 'relative',
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  profileBackButton: {
    position: 'absolute',
    top: 0,
    left: 20,
    padding: 8,
    zIndex: 10,
  },
  profileMenuButton: {
    position: 'absolute',
    top: 0,
    right: 20,
    padding: 8,
    zIndex: 10,
  },
  avatarWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hiddenBadge: {
    position: 'absolute',
    top: -2,
    right: -32,
    backgroundColor: 'rgba(1, 0, 0, 0.8)',
    borderRadius: 16,
    padding: 6,
    borderWidth: 1,
    borderColor: '#fa2f40',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: 'rgb(1,0,0)', // Черный фон как у шайбы
    ...Platform.select({
      ios: {
        shadowColor: 'rgb(1,0,0)',
        shadowOffset: {
          width: 0,
          height: 3,
        },
        shadowOpacity: 0.8,
        shadowRadius: 4,
      },
      android: {
        elevation: 8,
      },
      web: {
        boxShadow: '0 3px 4px rgba(1, 0, 0, 0.8)',
      },
    }),
    borderWidth: 4,
    borderColor: '#333333',
  },
  innerCircle: {
    width: 104, // Немного меньше profileImage
    height: 104,
    borderRadius: 52,
    borderWidth: 2, // Тонкая цветная обводка
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center', // Центрируем без position absolute
    position: 'absolute', // Добавляем абсолютное позиционирование
    top: '50%', // Центрируем по вертикали
    left: '50%', // Центрируем по горизонтали
    transform: [{ translateX: -52 }, { translateY: -52 }], // Смещаем на половину своего размера
  },
  avatarImage: {
    width: 100, // Заполняет внутренний круг (104 - 4 для обводки)
    height: 100,
    borderRadius: 50,
  },
  avatarPlaceholder: {
    backgroundColor: '#2C3E50', // Темно-синий фон как у шайбы
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  profileViewsHeaderWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minWidth: 40,
    justifyContent: 'flex-end',
  },
  profileViewsHeaderNum: {
    fontFamily: 'Gilroy-Bold',
    fontSize: 12,
    color: '#aaa',
  },
  profileViewsHeaderToday: {
    fontFamily: 'Gilroy-Regular',
    fontSize: 11,
    color: '#666',
  },
  playerName: {
    fontSize: 28,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginRight: 10,
    flexShrink: 1,
    textAlign: 'center',
  },
  numberBadge: {
    backgroundColor: '#fa2f40',
    borderRadius: 19.5, // Увеличили на 30% с 15
    paddingHorizontal: 10.4, // Увеличили на 30% с 8
    paddingVertical: 2.6, // Увеличили на 30% с 2
  },
  numberText: {
    fontSize: 18.2, // Увеличили на 30% с 14
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  statusContainer: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginBottom: 5,
    alignSelf: 'center',
  },
  playerStatus: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
  },
  playerTeam: {
    fontSize: 18,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
  },
  playerTeamsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
  },
  hockeyExperienceContainer: {
    marginTop: 5,
    alignItems: 'center',
  },
  hockeyExperienceText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fa2f40',
  },
  hockeyExperience: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fa2f40',
    marginTop: 4,
  },
  actionsSectionTop: {
    marginTop: 10,
    marginBottom: 20,
    paddingHorizontal: 20,
    gap: 10,
  },
  actionsSection: {
    gap: 15,
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: '#fa2f40',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  addFriendButton: {
    backgroundColor: 'rgb(1,0,0)',
    borderWidth: 1,
    borderColor: 'rgb(1,0,0)',
  },
  removeFriendButton: {
    backgroundColor: 'rgba(250, 47, 64, 0.3)',
    borderWidth: 1,
    borderColor: '#fa2f40',
  },
  cancelRequestButton: {
    backgroundColor: 'rgba(250, 47, 64, 0.3)',
    borderWidth: 1,
    borderColor: '#fa2f40',
  },
  acceptRequestButton: {
    backgroundColor: '#fa2f40',
    borderWidth: 1,
    borderColor: '#fa2f40',
  },
  declineRequestButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FFFFFF',
  },

  actionButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginLeft: 8,
  },

  sectionWrapper: {
    marginHorizontal: 0,
    marginBottom: 20,
  },
  compactSectionWrapper: {
    marginTop: 12,
    marginBottom: 12,
  },
  sectionBlur: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  section: {
    backgroundColor: 'rgba(1, 0, 0, 0.4)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 2,
    borderColor: 'rgba(250, 47, 64, 0.2)',
    ...Platform.select({
      ios: {
        shadowColor: 'rgb(1,0,0)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
        // elevation внутри BlurView с overflow:hidden на старых Android даёт «грязные» тени; контур уже есть
        elevation: 0,
        borderColor: 'rgba(250, 47, 64, 0.38)',
      },
      web: {
        boxShadow: '0 2px 4px rgba(1, 0, 0, 0.25)',
      },
    }),
  },
  embeddedSectionContent: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
    padding: 0,
    paddingHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    shadowColor: 'transparent',
    elevation: 0,
  },

  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    marginBottom: 15,
  },
  lockedSectionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(1, 0, 0, 0.4)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
  },
  lockedSectionTitle: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    marginTop: 15,
    marginBottom: 8,
    textAlign: 'center',
  },
  lockedSectionText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    marginBottom: 10,
    lineHeight: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(250, 47, 64, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
    paddingHorizontal: 2,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  /** Броски/сэйвы вратаря в узком круге — на 20% меньше statValue */
  statValueGoalkeeperCount: {
    fontSize: 14.4,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  statValueSmall: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  statValueGoalkeeper: {
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -1.0,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginTop: 2,
    textAlign: 'center',
  },
  statLabelSmall: {
    fontSize: 10,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
  },
  statLabelContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
    position: 'relative',
    minHeight: 16,
  },
  statLabelContainerOffset: {
    marginTop: 4,
  },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  infoItem: {
    flex: 1,
    minWidth: '45%',
  },
  infoLabel: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginBottom: 5,
  },
  infoValue: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  goalsContainer: {
    gap: 10,
  },
  goalLink: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  goalLinkText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginLeft: 10,
    flex: 1,
  },
  friendsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
  },
  friendItem: {
    width: '30%',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  friendAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 8,
  },
  friendName: {
    fontSize: 12,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 2,
  },
  friendsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  // Стили для секции запроса дружбы
  friendRequestSection: {
    backgroundColor: 'rgba(1, 0, 0, 0.8)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fa2f40',
    ...Platform.select({
      ios: {
    shadowColor: 'rgb(1,0,0)',
        shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
      },
      android: {
    elevation: 5,
      },
      web: {
        boxShadow: '0 2px 4px rgba(1, 0, 0, 0.25)',
      },
    }),
  },
  friendRequestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  friendRequestTitle: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#FFD700',
    marginLeft: 10,
  },
  friendRequestMessage: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginBottom: 15,
    textAlign: 'center',
  },
  friendRequestButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  friendRequestButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 2,
    ...Platform.select({
      ios: {
    shadowColor: 'rgb(1,0,0)',
        shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
      },
      android: {
    elevation: 5,
      },
      web: {
        boxShadow: '0 2px 4px rgba(1, 0, 0, 0.25)',
      },
    }),
  },
  friendRequestButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginLeft: 8,
  },
  adminAddUserButton: {
    backgroundColor: 'transparent',
    borderColor: '#fa2f40',
    borderWidth: 2,
    borderRadius: 8,
  },
  adminUsersButton: {
    backgroundColor: 'transparent',
    borderColor: '#8A2BE2',
    borderWidth: 2,
    borderRadius: 8,
    marginTop: 10,
  },
  noDataText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#888',
    textAlign: 'center',
  },
  noDataSubtext: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#666',
    textAlign: 'center',
    marginTop: 5,
  },
  emptySectionContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    paddingHorizontal: 20,
    minHeight: 80,
  },
  emptySectionText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#888',
    textAlign: 'center',
    marginTop: 12,
  },
  puckSpeedContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 0,
  },
  puckSpeedDisplay: {
    alignItems: 'center',
  },
  puckSpeedValueContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 15,
  },
  puckSpeedValue: {
    fontSize: 48,
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
  },
  puckSpeedUnit: {
    fontSize: 24,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginLeft: 8,
  },
  puckSpeedHistory: {
    marginBottom: 0,
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    width: '100%',
    gap: 10,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
  },
  puckSpeedHistoryLabel: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginBottom: 8,
  },
  puckSpeedHistoryValue: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    flex: 1,
  },
  puckSpeedHistoryDate: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
  },
  puckSpeedHistoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  puckSpeedHistoryDateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deleteSpeedRecordButton: {
    padding: 4,
  },
  speedImprovement: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  speedImprovementText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#4CAF50',
    marginLeft: 4,
  },
  puckSpeedEmpty: {
    alignItems: 'center',
    paddingVertical: 30,
  },
  puckSpeedEmptyText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#888',
    marginTop: 15,
    marginBottom: 20,
    textAlign: 'center',
  },
  navigateToProfileButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(250, 47, 64, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  measureSpeedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fa2f40',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    gap: 10,
    marginTop: 15,
  },
  measureSpeedButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },

  videoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(1, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  videoModalOverlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  videoModalContainer: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
    zIndex: 1,
  },
  videoModalContent: {
    width: '100%',
    position: 'relative',
  },
  videoModalLikeButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    zIndex: 1000,
  },
  videoModalCloseButton: {
    position: 'absolute',
    top: 30,
    right: 20,
    zIndex: 1001,
    backgroundColor: 'rgba(1, 0, 0, 0.7)',
    borderRadius: 20,
    padding: 8,
  },
  floatingEditButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  floatingSaveButton: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fa2f40',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  editInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    minHeight: 40,
    shadowColor: 'rgb(1,0,0)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pickerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 40,
    paddingRight: 20, // Добавляем отступ справа для стрелочки
    shadowColor: 'rgb(1,0,0)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  pickerButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
  },
  yearButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    alignSelf: 'flex-start', // Убираем растягивание по вертикали
    shadowColor: 'rgb(1,0,0)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  yearButtonSelected: {
    backgroundColor: '#fa2f40',
    borderColor: '#fa2f40',
  },
  yearButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
  },
  yearButtonTextSelected: {
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 40,
    shadowColor: 'rgb(1,0,0)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  dateInput: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
  },
  dateInputIcon: {
    marginLeft: 8,
  },
  videoFieldContainer: {
    flexDirection: 'column',
    marginBottom: 10,
    gap: 12,
  },
  videoUrlRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  videoUrlInput: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    minHeight: 40,
    shadowColor: 'rgb(1,0,0)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  removeVideoButtonInline: {
    padding: 4,
  },
  videoSeparator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 15,
    marginHorizontal: 0,
  },
  timeCodeInput: {
    width: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    minHeight: 40,
    textAlign: 'center',
    shadowColor: 'rgb(1,0,0)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  timeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInputField: {
    width: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    minHeight: 40,
    textAlign: 'center',
    shadowColor: 'rgb(1,0,0)',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  timeSeparator: {
    fontSize: 18,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    fontWeight: 'bold',
    marginTop: 18, // Выравниваем с полями ввода, которые теперь имеют label сверху
  },
  timeInputWithLabel: {
    alignItems: 'center',
  },
  timeInputLabel: {
    fontSize: 11,
    fontFamily: 'Gilroy-Regular',
    color: '#888',
    marginBottom: 4,
    textTransform: 'lowercase',
  },
  removeVideoButton: {
    padding: 4,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    marginTop: 10,
    backgroundColor: '#fa2f40',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  addMoreButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginLeft: 8,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    marginBottom: 15,
    backgroundColor: '#fa2f40',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  addPhotoButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginLeft: 8,
  },
  galleryContainer: {
    marginTop: 15,
  },
  galleryTitle: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginBottom: 10,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  galleryItem: {
    position: 'relative',
    width: 80,
    height: 80,
    borderWidth: 2,
    borderColor: '#fa2f40',
    borderRadius: 8,
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    backgroundColor: 'rgba(1, 0, 0, 0.3)',
  },
  removePhotoButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fff',
    borderRadius: 12,
  },
  giftButtonContainer: {
    marginTop: 0,
    marginBottom: 10,
  },
  giftButtonFull: {
    backgroundColor: '#7E0F45',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  giftButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginLeft: 8,
  },
  giftButton: {
    backgroundColor: '#4CAF50',
    borderColor: '#45a049',
  },
  deleteButton: {
    backgroundColor: '#fa2f40',
    borderColor: '#CC0000',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(1, 0, 0, 0.85)',
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.select({
      ios: 70,
      android: 40,
      default: 50,
    }),
    zIndex: 1000,
  },
  countryPickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(5, 0, 8, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  countryPickerModal: {
    backgroundColor: 'rgba(1, 0, 0, 0.9)',
    borderRadius: 15,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    alignItems: 'center',
  },
  countryPickerTitle: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    marginBottom: 15,
  },
  countrySearchInput: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    borderWidth: 1,
    borderColor: 'rgba(255,68,68,0.3)',
    width: '100%',
    marginBottom: 15,
  },
  countryList: {
    maxHeight: 300,
    width: '100%',
  },
  countryOption: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  countryOptionSelected: {
    backgroundColor: 'rgba(255,68,68,0.2)',
  },
  countryOptionText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
  },
  countryOptionTextSelected: {
    color: '#FF4444',
    fontFamily: 'Gilroy-Bold',
  },
  countryPickerCloseButton: {
    backgroundColor: '#FF4444',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginTop: 15,
  },
  countryPickerCloseText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
  },
  pickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    width: '100%',
    justifyContent: 'center',
  },
  pickerOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  pickerOptionSelected: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  pickerOptionText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
  },
  pickerOptionTextSelected: {
    color: '#fff',
    fontFamily: 'Gilroy-Bold',
  },
  modalOverlayTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 40,
  },
  modalContainer: {
    width: '100%',
    maxWidth: 600,
    height: Dimensions.get('window').height * 0.6,
    maxHeight: Dimensions.get('window').height * 0.8,
    backgroundColor: '#08010d',
    borderRadius: 20,
    overflow: 'hidden',
    padding: 0,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    borderWidth: 1,
    borderColor: '#fa2f40',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  pickerModalContainer: {
    width: '100%',
    maxWidth: 420,
    maxHeight: Dimensions.get('window').height * 0.9,
    backgroundColor: '#050008',
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    padding: 0,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    borderWidth: 1,
    borderColor: '#fa2f40',
  },
  countryModalContainer: {
    minHeight: Dimensions.get('window').height * 0.6,
  },
  modalHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.15)',
    backgroundColor: '#fa2f40',
  },
  modalTitleWrapper: {
    flex: 1,
    alignItems: 'center',
  },
  pickerModalCloseButton: {
    padding: 6,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#1a1a1a',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    textAlign: 'center',
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalContentContainer: {
    paddingBottom: 20,
  },
  pickerModalContent: {
    width: '100%',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  pickerModalContentLarge: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: Dimensions.get('window').height * 0.6,
  },
  pickerModalScroll: {
    width: '100%',
    maxHeight: Dimensions.get('window').height * 0.65,
  },
  pickerModalScrollContent: {
    paddingBottom: 20,
    flexGrow: 0,
  },
  pickerModalOption: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 50,
    justifyContent: 'center',
  },
  pickerModalOptionCompact: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    minHeight: 44,
    justifyContent: 'center',
  },
  pickerModalOptionText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    textAlign: 'left',
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginBottom: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
    lineHeight: 16,
    fontFamily: 'Gilroy-Regular',
  },
  input: {
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#fff',
    fontFamily: 'Gilroy-Regular',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  textArea: {
    height: 120,
    textAlignVertical: 'top',
  },
  characterCount: {
    fontSize: 11,
    color: '#999',
    textAlign: 'right',
    marginTop: 4,
    fontFamily: 'Gilroy-Regular',
  },
  submitButton: {
    backgroundColor: '#FF8243',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#666',
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#1a1a1a',
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  infoText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    color: '#fff',
    lineHeight: 16,
    fontFamily: 'Gilroy-Regular',
  },
  subsectionTitle: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginBottom: 8,
    marginTop: 8,
  },
  // Стили для контейнеров команд в режиме редактирования
  teamsSubsection: {
    marginBottom: 15,
  },
  teamsListContainer: {
    marginBottom: 10,
  },
  teamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  rotatedStar: {
    transform: [{ rotate: '20deg' }],
  },
  teamsListText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    lineHeight: 18,
    marginLeft: 8,
  },
  teamsSectionTitle: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    marginBottom: 5,
  },
  editOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(1, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 60,
  },
  addTeamButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    marginTop: 10,
    marginBottom: 15,
    backgroundColor: '#fa2f40',
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  addTeamButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginLeft: 8,
  },
  datePickerModal: {
    backgroundColor: 'rgb(1,0,0)',
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minWidth: 300,
  },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    gap: 10,
  },
  datePickerButton: {
    flex: 1,
    backgroundColor: 'rgb(1,0,0)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#fa2f40',
  },
  confirmButton: {
    backgroundColor: '#fa2f40',
    borderColor: '#fa2f40',
  },
  datePickerButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  modalSectionTitle: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    marginBottom: 15,
  },
  modalInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 40,
    marginBottom: 10,
  },
  modalInputHint: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    marginBottom: 10,
  },
  modalStatusSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  modalStatusOption: {
    flex: 1,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: '#fa2f40',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalStatusOptionSelected: {
    backgroundColor: '#fa2f40',
  },
  modalStatusOptionText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  modalStatusOptionTextSelected: {
    color: '#fff',
  },
  modalCreateButton: {
    backgroundColor: '#fa2f40',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 20,
  },
  modalCreateButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  loginAsUserButton: {
    borderRadius: 8,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 10,
    gap: 10,
  },
  loginAsUserButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  adminButtonsContainer: {
    flexDirection: 'row',
    gap: 15,
    marginTop: 20,
    marginBottom: 20,
    paddingHorizontal: 0,
    alignItems: 'stretch',
  },
  adminButton: {
    flex: 1,
    backgroundColor: '#fa2f40',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    height: 44,
    width: '100%',
  },
  adminButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginLeft: 8,
  },
  editButtonText: {
    color: 'rgb(1,0,0)',
  },
  compactButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    minHeight: 36,
  },
  compactButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginLeft: 6,
  },
  discountContainer: {
    alignItems: 'center',
    paddingVertical: 30,
    borderRadius: 12,
    borderWidth: 0,
    backgroundColor: 'transparent',
    overflow: 'hidden',
  },
  discountValue: {
    fontSize: 128,
    fontFamily: 'Gilroy-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    textShadowColor: 'rgba(1, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  discountEditContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  discountEditInput: {
    fontSize: 128,
    fontFamily: 'Gilroy-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 15,
    minWidth: 200,
    textShadowColor: 'rgba(1, 0, 0, 0.8)',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 4,
  },
  discountExplanation: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  discountOverlay: {
    backgroundColor: 'rgba(255, 255, 255, 1)',
    alignItems: 'center',
    paddingVertical: 30,
    borderRadius: 12,
  },
  mapContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
    marginTop: 10,
    ...Platform.select({
      ios: {
    shadowColor: 'rgb(1,0,0)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
    elevation: 5,
      },
      web: {
        boxShadow: '0 2px 4px rgba(1, 0, 0, 0.25)',
      },
    }),
  },
  map: {
    flex: 1,
  },
  qrCodeSection: {
    marginTop: 20,
    marginBottom: 20,
    marginHorizontal: 20,
    alignItems: 'center',
  },
  qrCodeContainer: {
    backgroundColor: 'rgb(1,0,0)',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#fa2f40',
    alignItems: 'center',
  },
  shareButton: {
    backgroundColor: '#fa2f40',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    gap: 10,
  },
  shareButtonText: {
    fontFamily: 'Gilroy-Bold',
    fontSize: 16,
    color: '#fff',
  },
  shareCard: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    backgroundColor: 'rgb(1,0,0)',
  },
  shareCardGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  shareCardAvatarContainer: {
    marginBottom: 30,
  },
  shareCardAvatar: {
    width: 150,
    height: 150,
    borderRadius: 75,
    borderWidth: 3,
    borderColor: '#fa2f40',
  },
  shareCardAvatarPlaceholder: {
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: '#333',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fa2f40',
  },
  shareCardName: {
    fontFamily: 'Gilroy-Bold',
    fontSize: 28,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  shareCardMainInfo: {
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  shareCardInfoLine: {
    fontFamily: 'Gilroy-Regular',
    fontSize: 14,
    color: '#fff',
    textAlign: 'center',
  },
  shareCardSeparator: {
    color: '#fff',
  },
  shareCardExperience: {
    fontFamily: 'Gilroy-Bold',
    fontSize: 16,
    color: '#fa2f40',
    textAlign: 'center',
    marginBottom: 15,
  },
  shareCardTeamContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  shareCardTeamText: {
    fontFamily: 'Gilroy-Bold',
    fontSize: 14,
    color: '#fff',
  },
  shareCardStatsTitle: {
    fontFamily: 'Gilroy-Bold',
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  shareCardStatsRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 20,
  },
  shareCardMiniStat: {
    alignItems: 'center',
  },
  shareCardMiniStatValue: {
    fontFamily: 'Gilroy-Bold',
    fontSize: 24,
    color: '#fa2f40',
  },
  shareCardMiniStatLabel: {
    fontFamily: 'Gilroy-Regular',
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  shareCardPuckSpeedContainer: {
    marginTop: 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  shareCardPuckSpeedLabel: {
    fontFamily: 'Gilroy-Regular',
    fontSize: 14,
    color: '#fff',
    marginBottom: 5,
  },
  shareCardPuckSpeedValue: {
    fontFamily: 'Gilroy-Bold',
    fontSize: 24,
    color: '#fa2f40',
  },
  shareCardQRContainer: {
    backgroundColor: 'rgb(1,0,0)',
    padding: 15,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#fa2f40',
    marginBottom: 20,
  },
  shareCardLogo: {
    width: 150,
    height: 50,
  },
  phoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  phoneIconContainer: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fa2f40',
    justifyContent: 'center',
    alignItems: 'center',
  },
  phoneButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    marginLeft: 4,
  },
  profileMenuOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  profileMenu: {
    position: 'absolute',
    backgroundColor: 'rgba(1, 0, 0, 0.95)',
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)',
  },
  profileMenuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  profileMenuIcon: {
    marginRight: 12,
  },
  profileMenuText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Gilroy-Regular',
    flex: 1,
  },
  profileMenuDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 2,
  },
  blockedIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(250, 47, 64, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#fa2f40',
  },
  blockedIndicatorText: {
    color: '#fa2f40',
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    marginLeft: 8,
  },
  blockedProfileMessage: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  blockedProfileTitle: {
    color: '#fa2f40',
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  blockedProfileText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
    lineHeight: 24,
  },
  pageHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(1, 0, 0, 0.6)',
    paddingHorizontal: 20,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 16,
    width: 24,
  },
  pageTitle: {
    color: '#fff',
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
    flex: 1,
    textAlign: 'left',
  },


}); 