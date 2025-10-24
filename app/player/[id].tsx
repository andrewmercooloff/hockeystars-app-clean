import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { captureRef } from 'react-native-view-shot';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { COUNTRIES } from '../../utils/constants';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useScreenContext } from '../../contexts/ScreenContext';
import LanguageSwitcher from '../../components/LanguageSwitcher';
import {
    Alert,
    Dimensions,
    Image,
    ImageBackground,
    Linking,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { WebView } from 'react-native-webview';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Animated from 'react-native-reanimated';
import QRCode from 'react-native-qrcode-svg';
import AchievementsSection from '../../components/AchievementsSection';
import ActivityRating from '../../components/ActivityRating';
import CurrentTeamsSection from '../../components/CurrentTeamsSection';
import CustomAlert from '../../components/CustomAlert';
import { addActivityPoints } from '../../services/activityService';
import EditablePhotosSection from '../../components/EditablePhotosSection';
import SocialLinks from '../../components/SocialLinks';



import ItemRequestButtons from '../../components/ItemRequestButtons';
import NormativesSection from '../../components/NormativesSection';
import PastTeamsSection from '../../components/PastTeamsSection';
import PlayerExercisesSection from '../../components/PlayerExercisesSection';
import PlayerMuseum from '../../components/PlayerMuseum';
import StarGiftModal from '../../components/StarGiftModal';
import AdminGiftModal from '../../components/AdminGiftModal';
import VideoCarousel from '../../components/VideoCarousel';
import YouTubeVideo from '../../components/YouTubeVideo';
import { acceptFriendRequest, Achievement, calculateHockeyExperience, cancelFriendRequest, declineFriendRequest, debugFriendship, deletePlayer, getFriends, getFriendshipStatus, getPlayerById, loadCurrentUser, notifyFriendsAboutAchievements, notifyFriendsAboutAvatarChange, notifyFriendsAboutPhysicalData, notifyFriendsAboutVideos, PastTeam, Player, removeFriend, saveCurrentUser, sendFriendRequest, updatePlayer } from '../../utils/playerStorage';
import { supabase } from '../../utils/supabase';
import { createPlayerManually } from '../../utils/playerStorage';
import ChangeIndicator from '../../components/ChangeIndicator';
import { useStatsChanges } from '../../hooks/useStatsChanges';
import { useNotificationContext } from '../../contexts/NotificationContext';
import { useUser } from '../../contexts/UserContext';

const iceBg = require('../../assets/images/led.jpg');


export default function PlayerProfile() {
  const { id, scrollToMuseum } = useLocalSearchParams();
  const router = useRouter();
  const { t, language } = useLanguage();
  const { updateNotificationCount } = useNotificationContext();
  const { setCurrentScreen } = useScreenContext();
  const { currentUser: globalCurrentUser, refreshUser } = useUser();
  const scrollViewRef = useRef<ScrollView>(null);
  const museumRef = useRef<View>(null);
  const shareCardRef = useRef<View>(null);
  
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
        return '#000000'; // Черный для админов
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
  const [museumUpdateKey, setMuseumUpdateKey] = useState<number>(0);
  const [photosCache, setPhotosCache] = useState<Record<string, string[]>>({});
  const [player, setPlayer] = useState<Player | null>(null);
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [activityRefreshKey, setActivityRefreshKey] = useState<number>(0);
  const [friendshipStatus, setFriendshipStatus] = useState<'friends' | 'sent_request' | 'received_request' | 'none' | 'pending'>('none');

  // Синхронизируем локальное состояние с глобальным
  useEffect(() => {
    setCurrentUser(globalCurrentUser);
  }, [globalCurrentUser]);

  // Проверяем авторизацию при загрузке компонента
  useEffect(() => {
    const checkAuth = async () => {
      if (!globalCurrentUser) {
        // Если пользователь не авторизован, перенаправляем на главную страницу
        console.log('🔐 Пользователь не авторизован, перенаправляем на главную страницу');
        router.replace('/');
      }
    };
    
    checkAuth();
  }, [globalCurrentUser, router]);
  const [friendLoading, setFriendLoading] = useState(false);
  const [friends, setFriends] = useState<Player[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<{ url: string; timeCode?: string } | null>(null);
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
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [editData, setEditData] = useState<Partial<Player>>({});
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showPositionPicker, setShowPositionPicker] = useState(false);
  const [showGripPicker, setShowGripPicker] = useState(false);
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false);
  const [selectedBirthDate, setSelectedBirthDate] = useState(new Date());
  const [videoFields, setVideoFields] = useState<Array<{url: string, timeCode: string}>>([{ url: '', timeCode: '' }]);
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [playerTeams, setPlayerTeams] = useState<PastTeam[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [pastTeams, setPastTeams] = useState<PastTeam[]>([]);
  const [coachYears, setCoachYears] = useState<number[]>([]);
  const [individualTraining, setIndividualTraining] = useState<string[]>([]);
  const [skateServices, setSkateServices] = useState<string[]>([]);
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [showStarGiftModal, setShowStarGiftModal] = useState(false);
  
  // Массивы для селекторов
  const positions = [t('profile.center'), t('profile.winger'), t('profile.defender'), t('profile.goalie')];
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
      case 'admin': return '#000000'; // Черный для админов
      default: return '#FFFFFF'; // Белый для обычных игроков
    }
  };

  // Функция для перевода позиций
  const translatePosition = (position: string) => {
    const positionMap: { [key: string]: string } = {
      'Центральный нападающий': t('profile.positions.center'),
      'Крайний нападающий': t('profile.positions.winger'),
      'Защитник': t('profile.positions.defender'),
      'Вратарь': t('profile.positions.goalie'),
      'Center': t('profile.positions.center'),
      'Winger': t('profile.positions.winger'),
      'Defender': t('profile.positions.defender'),
      'Goalie': t('profile.positions.goalie')
    };
    return positionMap[position] || position;
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
    setIsEditing(true);
    setEditData({
      ...player
    });
  };

  useEffect(() => {
    // Проверяем кеш состояния для мгновенного переключения
    if (id && playersCache[id as string]) {
      // Мгновенно устанавливаем данные из кеша состояния
      setPlayer(playersCache[id as string]);
      setLoading(false);
      
      // Восстанавливаем друзей и статус дружбы из кеша
      if (friendsCache[id as string]) {
        setFriends(friendsCache[id as string]);
      } else {
        setFriends([]);
      }
      
      // Восстанавливаем фото из кеша
      if (photosCache[id as string]) {
        setGalleryPhotos(photosCache[id as string]);
      } else {
        setGalleryPhotos([]);
      }
      
      // Для статуса дружбы нужен currentUser, поэтому показываем 'none'
      // Статус дружбы будет загружен в loadAdditionalData
      setFriendshipStatus('none');
      
      setIsEditing(false);
      setEditData({});
    } else {
      // Если нет в кеше состояния, загружаем данные
      setLoading(true);
      setFriends([]);
      setFriendshipStatus('none');
      setIsEditing(false);
      setEditData({});
    }
    
    // Загружаем/обновляем данные игрока (используется кеш из getPlayerById)
    loadPlayerData();
  }, [id]);

  // Восстанавливаем статус дружбы из кеша после загрузки currentUser
  useEffect(() => {
    if (currentUser && player && currentUser.id !== player.id) {
      const cacheKey = `${currentUser.id}_${player.id}`;
      if (friendshipStatusCache[cacheKey]) {
        setFriendshipStatus(friendshipStatusCache[cacheKey]);
      }
    }
  }, [currentUser, player, friendshipStatusCache]);

  // Realtime подписка на изменения friend_requests для обновления кнопки
  useEffect(() => {
    if (!currentUser || !player) return;


    const friendRequestsChannel = supabase
      .channel(`friend-requests-${player.id}`)
      .on(
        'postgres_changes',
        {
          event: '*', // Слушаем все события (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'friend_requests',
          filter: `from_id=eq.${currentUser.id},to_id=eq.${player.id}` // Запросы ОТ текущего пользователя К просматриваемому
        },
        async (payload) => {
          // Перезагружаем статус дружбы
          const status = await getFriendshipStatus(currentUser.id, player.id);
          setFriendshipStatus(status);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friend_requests',
          filter: `from_id=eq.${player.id},to_id=eq.${currentUser.id}` // Запросы ОТ просматриваемого К текущему пользователю
        },
        async (payload) => {
          // Перезагружаем статус дружбы
          const status = await getFriendshipStatus(currentUser.id, player.id);
          setFriendshipStatus(status);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(friendRequestsChannel);
    };
  }, [currentUser?.id, player?.id]);

  // Отслеживаем, что мы на экране профиля
  useFocusEffect(
    useCallback(() => {
      setCurrentScreen('player');
      
      // Принудительно обновляем пользователя при фокусе на профиле
      const refreshUserOnFocus = async () => {
        try {
          await refreshUser();
        } catch (error) {
          console.error('❌ Ошибка обновления пользователя в профиле:', error);
        }
      };
      
      refreshUserOnFocus();
      
      return () => {
        setCurrentScreen(null);
      };
    }, [setCurrentScreen, refreshUser])
  );

  // Обработка прокрутки к музею
  useEffect(() => {
    if (scrollToMuseum === 'true' && player && museumRef.current) {
      // Небольшая задержка для загрузки контента
      setTimeout(() => {
        museumRef.current?.measureLayout(
          scrollViewRef.current as any,
          (x, y) => {
            scrollViewRef.current?.scrollTo({ x: 0, y: y - 100, animated: true });
          },
          () => {}
        );
      }, 500);
    }
  }, [scrollToMuseum, player]);


  // Функция для загрузки дополнительных данных в фоне
  const loadAdditionalData = async (playerData: Player, userData: Player | null) => {
    try {
        // Загружаем команды игрока
          try {
            const { getPlayerTeamsAsPastTeams } = await import('../../utils/playerStorage');
            const teams = await getPlayerTeamsAsPastTeams(playerData.id);
            
            // Разделяем команды на текущие и прошлые
            const currentTeams = teams.filter(team => team.isCurrent);
            const pastTeams = teams.filter(team => !team.isCurrent);
            
            setPlayerTeams(currentTeams);
            setPastTeams(pastTeams);
          } catch (error) {
            console.error('Ошибка загрузки команд игрока:', error);
            setPlayerTeams([]);
            setPastTeams([]);
      }

      // Инициализируем фотографии (без миграции для скорости)
      if (playerData?.photos && playerData.photos.length > 0) {
        setGalleryPhotos(playerData.photos);
        
        // Сохраняем фото в кеш состояния для мгновенного переключения
        setPhotosCache(prev => ({
          ...prev,
          [playerData.id]: playerData.photos
        }));
        
        // Миграция локальных фото происходит в фоне
        migratePhotosInBackground(playerData, userData);
      } else {
        setGalleryPhotos([]);
        
        // Сохраняем пустой массив фото в кеш состояния
        setPhotosCache(prev => ({
          ...prev,
          [playerData.id]: []
        }));
      }

      // Загружаем статус дружбы и друзей параллельно
      if (userData && playerData.id !== userData.id) {
        const [friendsStatus, friendsList] = await Promise.all([
          getFriendshipStatus(userData.id, playerData.id),
          getFriends(playerData.id)
        ]);
        
        setFriendshipStatus(friendsStatus);
        setFriends(friendsList);
        
        // Предзагружаем аватары друзей для быстрого отображения
        friendsList.forEach(friend => {
          if (friend.avatar) {
            Image.prefetch(friend.avatar).catch(() => {
              // Игнорируем ошибки предзагрузки
            });
          }
        });
        
        // Сохраняем в кеш состояния для мгновенного переключения
        setFriendshipStatusCache(prev => ({
          ...prev,
          [`${userData.id}_${playerData.id}`]: friendsStatus
        }));
        setFriendsCache(prev => ({
          ...prev,
          [playerData.id]: friendsList
        }));
      } else {
        // Для собственного профиля загружаем только друзей
        const friendsList = await getFriends(playerData.id);
        setFriends(friendsList);
        
        // Предзагружаем аватары друзей для быстрого отображения
        friendsList.forEach(friend => {
          if (friend.avatar) {
            Image.prefetch(friend.avatar).catch(() => {
              // Игнорируем ошибки предзагрузки
            });
          }
        });
        
        // Сохраняем в кеш состояния для мгновенного переключения
        setFriendsCache(prev => ({
          ...prev,
          [playerData.id]: friendsList
        }));
      }

      // Мигрируем аватар в фоне если нужно
      if (playerData?.avatar && (playerData.avatar.startsWith('file://') || playerData.avatar.startsWith('content://') || playerData.avatar.startsWith('data:'))) {
        migrateAvatarInBackground(playerData, userData);
      }
      
    } catch (error) {
      console.error('Ошибка загрузки дополнительных данных:', error);
    }
  };

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
  const migrateAvatarInBackground = async (playerData: Player, userData: Player | null) => {
    try {
      const { uploadImageToStorage } = await import('../../utils/uploadImage');
      const migratedAvatarUrl = await uploadImageToStorage(playerData.avatar!);
      if (migratedAvatarUrl) {
        const updatedPlayer = { ...playerData, avatar: migratedAvatarUrl };
        await updatePlayer(playerData.id, updatedPlayer, true); // Пропускаем очистку кеша для миграции
        setPlayer(updatedPlayer);
      }
    } catch (error) {
      console.error('Ошибка миграции аватара:', error);
    }
  };

  const loadPlayerData = async () => {
    try {
      if (id) {
        // Загружаем основные данные параллельно
        const [playerData, userData] = await Promise.all([
          getPlayerById(id as string),
          loadCurrentUser()
        ]);
        
        // Если игрок не найден, перенаправляем на главную
        if (!playerData) {
          router.replace('/');
          return;
        }
        
        // Сразу устанавливаем основные данные для быстрого отображения
        setPlayer(playerData);
        setCurrentUser(userData);
        
        // Сохраняем в кеш состояния для мгновенного переключения
        setPlayersCache(prev => ({
          ...prev,
          [id as string]: playerData
        }));
        
        // Инициализируем годы тренера если это тренер
        if (playerData?.coach_years && Array.isArray(playerData.coach_years) && playerData.coach_years.length > 0) {
          setCoachYears(playerData.coach_years);
        } else {
          setCoachYears([]); // Устанавливаем пустой массив
        }

        // Инициализируем индивидуальные тренировки если это тренер
        const individualTrainingData = (playerData as any)?.individual_training;
        if (individualTrainingData && Array.isArray(individualTrainingData)) {
          setIndividualTraining(individualTrainingData);
        } else {
          setIndividualTraining([]); // Устанавливаем пустой массив
        }

        // Инициализируем услуги заточки коньков если это заточка коньков
        const skateServicesData = (playerData as any)?.skate_services;
        if (skateServicesData && Array.isArray(skateServicesData)) {
          setSkateServices(skateServicesData);
        } else {
          setSkateServices([]); // Устанавливаем пустой массив
        }
        
        // Инициализируем видео поля сразу
        if (playerData?.favoriteGoals) {
          const goals = playerData.favoriteGoals.split('\n').filter(goal => goal.trim());
          const videoData = goals.map(goal => {
            const { url, timeCode } = parseVideoUrl(goal);
            return { url, timeCode: timeCode || '' };
          });
          setVideoFields(videoData.length > 0 ? videoData : [{ url: '', timeCode: '' }]);
        }
        
        // Инициализируем достижения сразу
        if (playerData?.achievements && Array.isArray(playerData.achievements)) {
          setAchievements(playerData.achievements);
        }
        
        // Быстро устанавливаем статус дружбы для собственного профиля
        if (userData && playerData.id === userData.id) {
          setFriendshipStatus('friends');
        }
        
        // Отмечаем основную загрузку как завершенную
        setLoading(false);
        
        // Загружаем дополнительные данные в фоне (асинхронно)
        loadAdditionalData(playerData, userData);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных игрока:', error);
      // Убираем дублирующееся сообщение об ошибке - пользователь и так попадает на главную
      router.replace('/');
    } finally {
      setLoading(false);
    }
  };

  const showCustomAlert = (title: string, message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info', onConfirm?: () => void) => {
    setAlert({
      visible: true,
      title,
      message,
      type,
      onConfirm: onConfirm || (() => setAlert({ ...alert, visible: false })),
      onCancel: () => {},
      onSecondary: () => {},
      showCancel: false,
      showSecondary: false,
      confirmText: t('common.ok'),
      cancelText: t('cancel'),
      secondaryText: t('additional')
    });
  };

  const pickImage = async () => {
    // Показываем системное окно выбора источника фото
    Alert.alert(
      'Выберите источник фото',
      'Откуда хотите загрузить фото?',
      [
        {
          text: 'Галерея',
          onPress: () => {
            pickFromGallery();
          }
        },
        {
          text: 'Камера',
          onPress: () => {
            takePhoto();
          }
        },
        {
          text: 'Отмена',
          style: 'cancel'
        }
      ]
    );
  };

  const pickFromGallery = async () => {
    try {
      // Запрашиваем разрешение на доступ к галерее
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        showCustomAlert('Ошибка', 'Нет доступа к галерее', 'error');
        return;
      }

      // Открываем галерею для выбора фото
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7, // Уменьшаем качество для экономии места
      });

      if (!result.canceled && result.assets[0]) {
        setEditData({...editData, avatar: result.assets[0].uri});
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
        setEditData({...editData, avatar: result.assets[0].uri});
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

  const handleAddFriend = async () => {
    
    if (!currentUser || !player) {
      showCustomAlert('Ошибка', 'Необходимо войти в профиль для добавления в друзья', 'error', () => router.push('/login'));
      return;
    }
    
    setFriendLoading(true);
    try {
      if (friendshipStatus === 'friends') {
        // Удаляем из друзей
        const success = await removeFriend(currentUser.id, player.id);
        if (success) {
          setFriendshipStatus('none');
          showCustomAlert(t('common.success'), t('profile.removedFromFriends', { name: player?.name || 'Player' }), 'success');
        } else {
          showCustomAlert(t('common.error'), t('profile.removeFriendError'), 'error');
        }
      } else if (friendshipStatus === 'none') {
    
        // Отправляем запрос дружбы
        const success = await sendFriendRequest(currentUser.id, player.id);

        if (success) {
          setFriendshipStatus('pending');
          const playerName = player?.name || 'Player';
          
         // Трекаем добавление в друзья
         try {
           await addActivityPoints(currentUser.id, 'FRIEND_ADD');
         } catch (error) {
           console.error('Failed to track friend add:', error);
         }
          
          showCustomAlert(t('common.success'), t('profile.friendRequestSent'), 'success');
        } else {
          showCustomAlert(t('common.error'), t('profile.friendRequestError'), 'error');
        }
      } else if (friendshipStatus === 'sent_request' || friendshipStatus === 'pending') {
        // Отменяем запрос
        const success = await cancelFriendRequest(currentUser.id, player.id);
        if (success) {
          setFriendshipStatus('none');
          showCustomAlert(t('common.success'), t('profile.friendRequestCancelled'), 'info');
        } else {
          showCustomAlert(t('common.error'), t('profile.friendRequestCancelError'), 'error');
        }
      } else if (friendshipStatus === 'received_request') {
        // Принимаем запрос
        const success = await acceptFriendRequest(currentUser.id, player.id);
        if (success) {
          setFriendshipStatus('friends');
          showCustomAlert(t('common.success'), t('profile.friendshipAccepted', { name: player?.name || 'Player' }), 'success');
        } else {
          showCustomAlert(t('common.error'), t('profile.friendRequestAcceptError'), 'error');
        }
      }
      
      // Обновляем данные игрока после изменения друзей
      await loadPlayerData();
    } catch (error) {
      console.error('❌ Ошибка управления друзьями:', error);
      showCustomAlert('Ошибка', 'Произошла ошибка при управлении друзьями', 'error');
    } finally {
      setFriendLoading(false);
    }
  };

  const handleDeclineFriend = async () => {
    if (!currentUser || !player) {
      showCustomAlert('Ошибка', 'Необходимо войти в профиль', 'error', () => router.push('/login'));
      return;
    }
    
    setFriendLoading(true);
    try {
      const success = await declineFriendRequest(currentUser.id, player.id);
      if (success) {
        setFriendshipStatus('none');
        showCustomAlert('Запрос отклонен', 'Запрос дружбы отклонен', 'info');
      } else {
        showCustomAlert('Ошибка', 'Не удалось отклонить запрос', 'error');
      }
      
      // Обновляем данные игрока после изменения друзей
      await loadPlayerData();
    } catch (error) {
      console.error('Ошибка отклонения запроса дружбы:', error);
      showCustomAlert('Ошибка', 'Произошла ошибка при отклонении запроса', 'error');
    } finally {
      setFriendLoading(false);
    }
  };

  // Функция для парсинга URL и таймкода
  const parseVideoUrl = (input: string): { url: string; timeCode?: string } => {
    // Регулярное выражение для извлечения таймкода
    const timeMatch = input.match(/\(время:\s*(\d{1,2}:\d{2})\)/);
    const timeCode = timeMatch ? timeMatch[1] : undefined;
    
    // Удаляем таймкод из строки
    const urlWithoutTimeCode = input.replace(/\s*\(время:\s*\d{1,2}:\d{2}\)/, '').trim();
    
    // Проверяем, является ли ссылка YouTube
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/live\/|m\.youtube\.com\/)/;
    
    if (youtubeRegex.test(urlWithoutTimeCode)) {
      return { url: urlWithoutTimeCode, timeCode };
    }
    
    // Если ссылка не соответствует YouTube, возвращаем пустую строку
    return { url: '', timeCode: undefined };
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
          const timeCodePart = video.timeCode.trim() ? ` (время: ${video.timeCode})` : '';
          return video.url + timeCodePart;
        })
        .join('\n');
      
      // Загружаем аватар в Storage если это локальный файл
      let avatarUrl = editData.avatar || player.avatar;
      if (avatarUrl && (avatarUrl.startsWith('file://') || avatarUrl.startsWith('content://') || avatarUrl.startsWith('data:'))) {
        console.log('📤 Загружаем аватар в Supabase Storage:', avatarUrl.substring(0, 50) + '...');
        const { uploadImageToStorage } = await import('../../utils/uploadImage');
        const uploadedUrl = await uploadImageToStorage(avatarUrl);
        if (uploadedUrl) {
          avatarUrl = uploadedUrl;
        } else {
          console.error('❌ Не удалось загрузить аватар в Storage');
        }
      }

      // Объединяем текущие данные игрока с изменениями
      const updatedPlayer = {
        ...player, 
        ...editData,
        avatar: avatarUrl, // Используем URL из Storage
        favoriteGoals: goalsText,
        photos: galleryPhotos,
        achievements: achievements,
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
          discountForFriends: editData.discountForFriends || player.discountForFriends
        } : {}),
        // Добавляем поля для заточки коньков
        ...(player.status === 'skateSharpening' ? {
          address: editData.address || player.address,
          workingHours: editData.workingHours || player.workingHours,
          email: editData.email || player.email,
          discountForFriends: editData.discountForFriends || player.discountForFriends,
          skate_services: skateServices.length > 0 ? skateServices : undefined
        } : {})
        // Убираем pastTeams, так как команды сохраняются в отдельной таблице
      };
      
      
      // Выполняем все операции параллельно для ускорения
      const [teamsSyncResult, refreshedPlayer, teams] = await Promise.all([
        // Синхронизация команд
        (async () => {
      try {
        const { syncPlayerTeams, clearOldPastTeamsData, addTeamOrderField } = await import('../../utils/playerStorage');
        
        // Добавляем поле team_order если его еще нет (выполняется один раз)
        await addTeamOrderField();
        
        // Сначала очищаем старые данные команд
        const clearSuccess = await clearOldPastTeamsData(player.id);
        if (!clearSuccess) {
          console.error('❌ Ошибка очистки старых данных команд');
              return { success: false, error: 'Не удалось очистить старые данные команд' };
        }
        
        const teamsSyncSuccess = await syncPlayerTeams(player.id, playerTeams, pastTeams);
        
        if (!teamsSyncSuccess) {
          console.error('❌ Ошибка синхронизации команд');
              return { success: false, error: 'Не удалось сохранить команды' };
        }
            
            return { success: true };
      } catch (syncError) {
        console.error('❌ Исключение при синхронизации команд:', syncError);
            return { success: false, error: 'Не удалось сохранить команды' };
      }
        })(),
        // Обновление данных игрока
        updatePlayer(player.id, updatedPlayer, true), // Пропускаем очистку кеша для миграции
        // Загрузка команд
        import('../../utils/playerStorage').then(({ getPlayerTeamsAsPastTeams }) => getPlayerTeamsAsPastTeams(player.id))
      ]);
      
      // Отладочный лог отключен
      
      // Проверяем результат синхронизации команд
      if (!teamsSyncResult.success) {
        showCustomAlert('Ошибка', teamsSyncResult.error || 'Неизвестная ошибка', 'error');
        return;
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
        
        // 5. Проверяем изменение статистики (голы/передачи)
        const statsChanges: { field: string, oldValue: number, newValue: number }[] = [];
        
        // Отладочный лог отключен
        
        const oldGoals = parseInt(player.goals) || 0;
        const newGoals = parseInt(editData.goals || player.goals) || 0;
        console.log(`⚽ Голы: ${oldGoals} → ${newGoals}`);
        if (oldGoals !== newGoals) {
          statsChanges.push({ field: 'goals', oldValue: oldGoals, newValue: newGoals });
        }
        
        const oldAssists = parseInt(player.assists) || 0;
        const newAssists = parseInt(editData.assists || player.assists) || 0;
        if (oldAssists !== newAssists) {
          statsChanges.push({ field: 'assists', oldValue: oldAssists, newValue: newAssists });
        }
        
        if (statsChanges.length > 0) {
          console.log('📊 Обнаружены изменения статистики:', statsChanges);
          console.log('🔔 Отправляем уведомления для игрока:', player.id, player.name);
          // Используем существующую функцию notifyFriendsAboutChanges
          const { notifyFriendsAboutChanges } = await import('../../utils/playerStorage');
          
          // Преобразуем формат: { field, oldValue, newValue } → { field, oldValue, newValue, change }
          const formattedStatChanges = statsChanges.map(change => ({
            field: change.field,
            oldValue: change.oldValue,
            newValue: change.newValue,
            change: change.newValue - change.oldValue  // Добавляем change для совместимости
          }));
          
          notificationPromises.push(
            notifyFriendsAboutChanges(player.id, player.name, formattedStatChanges, [])
              .catch((err) => console.error('❌ ОШИБКА отправки уведомлений о статистике:', err))
          );
        } else {
          console.log('ℹ️ Статистика НЕ изменилась, уведомления НЕ отправляются');
        }

        // Проверяем изменения нормативов
        const normativeChanges = [];
        
        // Проверяем pullUps
        const oldPullUps = parseInt(player.pullUps || '0');
        const newPullUps = parseInt(editData.pullUps || player.pullUps || '0');
        if (oldPullUps !== newPullUps) {
          console.log('🏋️ Подтягивания:', oldPullUps, '→', newPullUps);
          normativeChanges.push({ field: 'pullUps', oldValue: oldPullUps, newValue: newPullUps, change: newPullUps - oldPullUps });
        }
        
        // Проверяем pushUps
        const oldPushUps = parseInt(player.pushUps || '0');
        const newPushUps = parseInt(editData.pushUps || player.pushUps || '0');
        if (oldPushUps !== newPushUps) {
          console.log('💪 Отжимания:', oldPushUps, '→', newPushUps);
          normativeChanges.push({ field: 'pushUps', oldValue: oldPushUps, newValue: newPushUps, change: newPushUps - oldPushUps });
        }
        
        // Проверяем plankTime
        const oldPlankTime = parseInt(player.plankTime || '0');
        const newPlankTime = parseInt(editData.plankTime || player.plankTime || '0');
        if (oldPlankTime !== newPlankTime) {
          console.log('⏱️ Планка:', oldPlankTime, '→', newPlankTime);
          normativeChanges.push({ field: 'plankTime', oldValue: oldPlankTime, newValue: newPlankTime, change: newPlankTime - oldPlankTime });
        }
        
        // Проверяем sprint100m
        const oldSprint100m = parseFloat(player.sprint100m || '0');
        const newSprint100m = parseFloat(editData.sprint100m || player.sprint100m || '0');
        if (oldSprint100m !== newSprint100m) {
          console.log('🏃 Стометровка:', oldSprint100m, '→', newSprint100m);
          normativeChanges.push({ field: 'sprint100m', oldValue: oldSprint100m, newValue: newSprint100m, change: newSprint100m - oldSprint100m });
        }
        
        // Проверяем longJump
        const oldLongJump = parseFloat(player.longJump || '0');
        const newLongJump = parseFloat(editData.longJump || player.longJump || '0');
        if (oldLongJump !== newLongJump) {
          console.log('🤸 Прыжок в длину:', oldLongJump, '→', newLongJump);
          normativeChanges.push({ field: 'longJump', oldValue: oldLongJump, newValue: newLongJump, change: newLongJump - oldLongJump });
        }
        
        // Проверяем jumpRope
        const oldJumpRope = parseInt(player.jumpRope || '0');
        const newJumpRope = parseInt(editData.jumpRope || player.jumpRope || '0');
        if (oldJumpRope !== newJumpRope) {
          console.log('🪢 Скакалка:', oldJumpRope, '→', newJumpRope);
          normativeChanges.push({ field: 'jumpRope', oldValue: oldJumpRope, newValue: newJumpRope, change: newJumpRope - oldJumpRope });
        }
        
        if (normativeChanges.length > 0) {
          console.log('🏃‍♂️ Обнаружены изменения нормативов:', normativeChanges);
          console.log('🔔 Отправляем уведомления о нормативах для игрока:', player.id, player.name);
          
          notificationPromises.push(
            notifyFriendsAboutChanges(player.id, player.name, [], normativeChanges)
              .catch((err) => console.error('❌ ОШИБКА отправки уведомлений о нормативах:', err))
          );
        } else {
          console.log('ℹ️ Нормативы НЕ изменились, уведомления НЕ отправляются');
        }
        
      } catch (notifyError) {
        console.error('❌ Ошибка подготовки уведомлений (не критично):', notifyError);
      }
      
      // Обновляем состояние команд СРАЗУ после сохранения
      if (teams && Array.isArray(teams)) {
        const currentTeams = teams.filter(team => team.isCurrent);
        const pastTeams = teams.filter(team => !team.isCurrent);
        
        setPlayerTeams(currentTeams);
        setPastTeams(pastTeams);
      } else {
        console.log('❌ Команды не загружены или не являются массивом:', teams);
      }
      
      // Обновляем состояние игрока
      if (refreshedPlayer) {
        setPlayer(refreshedPlayer);
        
        // Обновляем изменения из базы данных асинхронно (не блокируем основной поток)
        setTimeout(async () => {
          try {
            await refreshChanges();
          } catch (error) {
            console.error('❌ Ошибка обновления изменений (не критично):', error);
          }
        }, 0);
        
        // Если редактируем свой собственный профиль, обновляем также currentUser в AsyncStorage
        if (currentUser.id === player.id) {
          setCurrentUser(refreshedPlayer);
          // Сохраняем обновленные данные в AsyncStorage асинхронно (не блокируем основной поток)
          setTimeout(async () => {
            try {
              await saveCurrentUser(refreshedPlayer);
            } catch (error) {
              console.error('❌ Ошибка обновления currentUser в AsyncStorage:', error);
            }
          }, 0);
        }
        
        // Принудительно обновляем все экраны, которые могут показывать данные пользователя (асинхронно)
        if (currentUser.id === player.id) {
          setTimeout(async () => {
            try {
              // Обновляем глобальное состояние пользователя
              await refreshUser(true);
              
              // Дополнительно обновляем локальное состояние для немедленного отображения
              setCurrentUser(refreshedPlayer);
            } catch (error) {
              console.error('❌ Ошибка обновления глобального состояния:', error);
            }
          }, 0);
        }
      }
      
      setIsEditing(false);
      showCustomAlert(t('common.success'), t('playerUpdated'), 'success');
      
      // Дополнительное обновление команд через небольшую задержку для надежности
      setTimeout(async () => {
        try {
          const { getPlayerTeamsAsPastTeams } = await import('../../utils/playerStorage');
          const freshTeams = await getPlayerTeamsAsPastTeams(player.id);
          if (freshTeams && Array.isArray(freshTeams)) {
            const currentTeams = freshTeams.filter(team => team.isCurrent);
            const pastTeams = freshTeams.filter(team => !team.isCurrent);
            console.log('🔄 Дополнительное обновление команд:', { 
              totalTeams: freshTeams.length,
              currentTeams: currentTeams.length, 
              pastTeams: pastTeams.length 
            });
        setPlayerTeams(currentTeams);
        setPastTeams(pastTeams);
      }
        } catch (error) {
          console.error('❌ Ошибка дополнительного обновления команд:', error);
        }
      }, 500);
      
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
          discountForFriends: editData.discountForFriends || player.discountForFriends
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
      t('deleteUser'),
      t('profile.deleteUserConfirm', { name: player.name }),
      'warning',
      async () => {
        const success = await deletePlayer(player.id);
        if (success) {
            showCustomAlert(
              t('success'), 
            t('profile.userDeleted', { name: player.name }),
              'success',
              () => router.push('/')
            );
        } else {
          showCustomAlert('Ошибка', 'Не удалось удалить пользователя', 'error');
        }
      }
    );
  };

  const handleLogout = async () => {
    showCustomAlert(
      t('logoutConfirm'),
      t('logoutConfirmMessage'),
      'warning',
      async () => {
        try {
          // Очищаем данные текущего пользователя
          const { logoutUser } = await import('../../utils/playerStorage');
          await logoutUser();
          
          // Очищаем кеш пользователя
          const { dataCache, CACHE_KEYS } = await import('../../utils/DataCache');
          await dataCache.remove(CACHE_KEYS.USER_PROFILE);
          
          // Принудительно обновляем глобальное состояние пользователя
          await refreshUser();
          
          // Переходим на главную страницу
          router.replace('/');
        } catch (error) {
          console.error('❌ Ошибка при выходе:', error);
          // Даже если произошла ошибка, все равно переходим на главную
          await refreshUser();
          router.replace('/');
        }
      }
    );
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
          id: Date.now().toString(),
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
        Alert.alert('Успех', `Пользователь ${createdPlayer.name} создан`);
        
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
      } else {
        Alert.alert('Ошибка', 'Не удалось создать пользователя');
      }
    } catch (error) {
      console.error('Ошибка создания пользователя:', error);
      Alert.alert('Ошибка', 'Не удалось создать пользователя');
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ImageBackground source={iceBg} style={styles.background} resizeMode="cover">
          <View style={styles.overlay}>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>
                {t('profile.loadingProfile') === 'profile.loadingProfile' ? 'Loading profile...' : t('profile.loadingProfile')}
              </Text>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }

  if (!player) {
    return (
      <View style={styles.container}>
        <ImageBackground source={iceBg} style={styles.background} resizeMode="cover">
          <View style={styles.overlay}>
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>
                {t('profile.playerNotFound') === 'profile.playerNotFound' ? 'Player not found' : t('profile.playerNotFound')}
              </Text>
            </View>
          </View>
        </ImageBackground>
      </View>
    );
  }



  return (
    <View style={styles.container}>
      <ImageBackground source={iceBg} style={styles.background} resizeMode="cover">
        <View style={styles.overlay}>
          <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContainer}>
            


            {/* Фото и основная информация */}
            <View style={styles.profileSection}>
              <View style={styles.avatarContainer}>
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
                    <Image 
                      source={{ 
                        uri: imageSource,
                        cache: 'force-cache',
                        headers: {
                          'Cache-Control': 'max-age=3600'
                        }
                      }}
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
                  <View style={[styles.editOverlay, { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', borderRadius: 60 }]}>
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
                          <Image 
                            source={{ 
                              uri: imageSource, 
                              cache: 'reload', 
                              headers: { 
                                'Cache-Control': 'no-cache' 
                              } 
                            }}
                            style={styles.avatarImage}
                            onError={(error) => {
                              console.error('❌ Ошибка загрузки аватара в профиле игрока:', error);
                            }}
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
                    onChangeText={(text) => {
                      // Фильтруем только латинские буквы, пробелы и дефисы
                      const latinOnly = text.replace(/[^a-zA-Z\s\-]/g, '');
                      // Преобразуем в верхний регистр
                      const upperCaseText = latinOnly.toUpperCase();
                      setEditData({...editData, name: upperCaseText});
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
                
                {/* Номер игрока - не показываем для магазинов и заточки коньков */}
                {player.status !== 'shop' && player.status !== 'skateSharpening' && (
                  isEditing ? (
                  <TextInput
                    style={[styles.editInput, { 
                      width: 60, 
                      marginLeft: 10, 
                      marginTop: -4,
                      fontSize: 28,
                      fontFamily: 'Gilroy-Bold',
                      textAlign: 'center'
                    }]}
                    value={editData.number !== undefined ? editData.number : (player.number || '')}
                    onChangeText={(text) => setEditData({...editData, number: text})}
                    placeholder="#"
                    keyboardType="numeric"
                    maxLength={2}
                  />
                ) : player.number ? (
                  <View style={styles.numberBadge}>
                    <Text style={styles.numberText}>#{player.number}</Text>
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
              
              <View style={styles.statusContainer}>
                <Text style={styles.playerStatus}>
                  {player.status === 'player' ? t('profile.player') : 
                   player.status === 'coach' ? t('profile.coach') : 
                   player.status === 'scout' ? t('profile.scout') : 
                   player.status === 'admin' ? t('profile.admin') : 
                   player.status === 'shop' ? t('profile.shop') : 
                   player.status === 'skateSharpening' ? t('profile.skateSharpening') : t('profile.star')}
                </Text>
              </View>
              {playerTeams.length > 0 && (
                <View style={styles.playerTeamsContainer}>
                  {playerTeams.map((team, index) => (
                    <Text key={index} style={styles.playerTeam}>
                      {(() => {
                        const translationKey = `teams.${team.teamName}`;
                        return t(translationKey, { defaultValue: team.teamName });
                      })()}{index < playerTeams.length - 1 ? ', ' : ''}
                    </Text>
                  ))}
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



            {/* Кнопка добавления пользователя для администратора */}
            {currentUser && currentUser.status === 'admin' && currentUser.id === player?.id && (
              <View style={styles.section}>
                <TouchableOpacity 
                  style={[styles.friendRequestButton, styles.adminAddUserButton]} 
                  onPress={() => router.push('/admin/create-user')}
                >
                  <Ionicons name="person-add-outline" size={20} color="#fff" />
                  <Text style={styles.friendRequestButtonText}>
                    {t('admin.addUser')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}


            {/* Статистика текущего сезона - только для обычных игроков с данными */}
            {player && player.status !== 'star' && player.status !== 'shop' && player.status !== 'skateSharpening' && (() => {
              const goalsNum = parseInt(player.goals || '0') || 0;
              const assistsNum = parseInt(player.assists || '0') || 0;
              const gamesNum = parseInt(player.games || '0') || 0;
              const pointsNum = goalsNum + assistsNum;
              const effectiveness = gamesNum > 0 ? (pointsNum / gamesNum).toFixed(1) : '0.0';
              

              
              // Показываем статистику только если есть хотя бы одно ненулевое значение
              const hasStats = pointsNum > 0 || goalsNum > 0 || assistsNum > 0 || gamesNum > 0;
              
              return (hasStats || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id))) ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('profile.statistics')}</Text>
                  {isEditing ? (
                    <View style={styles.statsGrid}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>{t('profile.gamesCount')}</Text>
                        <TextInput
                          style={styles.editInput}
                          value={editData.games !== undefined ? editData.games : (player.games || '')}
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
                          onChangeText={(text) => setEditData({...editData, assists: text})}
                          placeholder="0"
                          placeholderTextColor="#888"
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                  ) : (
                  <View style={styles.statsGrid}>
                    {pointsNum > 0 && (
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
                    {assistsNum > 0 && (
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
                    {goalsNum > 0 && (
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
                    {gamesNum > 0 && (
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
                    {pointsNum > 0 && gamesNum > 0 && (
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
                </View>
              ) : null;
            })(            )}

            {/* Основная информация */}
            <View style={styles.section}>
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

                {/* Номер телефона - только для админов */}
                {currentUser?.status === 'admin' && (player.phone || isEditing) && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('profile.phone')}</Text>
                    {isEditing ? (
                      <TextInput
                        style={styles.editInput}
                        value={editData.phone !== undefined ? editData.phone : (player.phone || '')}
                        onChangeText={(text) => setEditData({...editData, phone: text})}
                        placeholder={t('profile.phone')}
                        placeholderTextColor="#888"
                        keyboardType="phone-pad"
                      />
                    ) : (
                      <Text style={styles.infoValue}>{player.phone || t('profile.notSpecified')}</Text>
                    )}
                  </View>
                )}

                {/* Адрес - только для магазинов */}
                {player.status === 'shop' && (player.address || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id))) && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('profile.address')}</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TextInput
                        style={styles.editInput}
                        value={editData.address !== undefined ? editData.address : (player.address || '')}
                        onChangeText={(text) => setEditData({...editData, address: text})}
                        placeholder={t('profile.address')}
                      />
                    ) : (
                      <Text style={styles.infoValue}>{player.address}</Text>
                    )}
                  </View>
                )}


                {/* Часы работы - только для магазинов */}
                {player.status === 'shop' && (player.workingHours || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id))) && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('profile.workingHours')}</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TextInput
                        style={styles.editInput}
                        value={editData.workingHours !== undefined ? editData.workingHours : (player.workingHours || '')}
                        onChangeText={(text) => setEditData({...editData, workingHours: text})}
                        placeholder={t('profile.workingHours')}
                      />
                    ) : (
                      <Text style={styles.infoValue}>{player.workingHours}</Text>
                    )}
                  </View>
                )}

                {/* Email - только для магазинов */}
                {player.status === 'shop' && (player.email || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id))) && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Email</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TextInput
                        style={styles.editInput}
                        value={editData.email !== undefined ? editData.email : (player.email || '')}
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
                {player.status === 'skateSharpening' && (player.address || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id))) && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('profile.address')}</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TextInput
                        style={styles.editInput}
                        value={editData.address !== undefined ? editData.address : (player.address || '')}
                        onChangeText={(text) => setEditData({...editData, address: text})}
                        placeholder={t('profile.address')}
                      />
                    ) : (
                      <Text style={styles.infoValue}>{player.address}</Text>
                    )}
                  </View>
                )}

                {/* Часы работы - для заточки коньков */}
                {player.status === 'skateSharpening' && (player.workingHours || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id))) && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('profile.workingHours')}</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TextInput
                        style={styles.editInput}
                        value={editData.workingHours !== undefined ? editData.workingHours : (player.workingHours || '')}
                        onChangeText={(text) => setEditData({...editData, workingHours: text})}
                        placeholder={t('profile.workingHours')}
                      />
                    ) : (
                      <Text style={styles.infoValue}>{player.workingHours}</Text>
                    )}
                  </View>
                )}

                {/* Email - для заточки коньков */}
                {player.status === 'skateSharpening' && (player.email || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id))) && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Email</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TextInput
                        style={styles.editInput}
                        value={editData.email !== undefined ? editData.email : (player.email || '')}
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
                {player.status === 'skateSharpening' && (player.discountForFriends || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id))) && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('profile.discountForFriends')}</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TextInput
                        style={styles.editInput}
                        value={editData.discountForFriends !== undefined ? editData.discountForFriends : (player.discountForFriends || '')}
                        onChangeText={(text) => setEditData({...editData, discountForFriends: text})}
                        placeholder={t('profile.discountForFriends')}
                      />
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
                          {editData.position ? translatePosition(editData.position) : translatePosition(player.position)}
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
                  {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={showBirthDatePickerModal}
                    >
                      <Text style={styles.pickerButtonText}>
                        {editData.birthDate || player.birthDate || 'Выберите дату'}
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
                    <TextInput
                      style={styles.editInput}
                        value={editData.hockeyStartDate !== undefined ? editData.hockeyStartDate : (player.hockeyStartDate || '')}
                        onChangeText={(text) => setEditData({...editData, hockeyStartDate: text})}
                        placeholder={t('birthDatePlaceholder')}
                    />
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
                          {editData.grip ? translateGrip(editData.grip) : translateGrip(player.grip || '')}
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
            </View>

            {/* Карта - только для магазинов */}
            {player.status === 'shop' && player.address && (
              <View style={styles.section}>
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
            </View>
            )}

            {/* Скидка для друзей - только для магазинов */}
            {player.status === 'shop' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('profile.discountForFriends')}</Text>
                <Text style={styles.discountExplanation}>
                  {t('profile.discountForFriendsHint')}
                </Text>
                {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                  <View style={styles.discountEditContainer}>
                    <TextInput
                      style={styles.discountEditInput}
                      value={editData.discountForFriends !== undefined ? editData.discountForFriends : (player.discountForFriends || '')}
                      onChangeText={(text) => {
                        const numbersOnly = text.replace(/[^0-9]/g, '');
                        const withPercent = numbersOnly ? `${numbersOnly}%` : '';
                        setEditData({...editData, discountForFriends: withPercent});
                      }}
                      placeholder="10%"
                      keyboardType="numeric"
                      placeholderTextColor="#FFFFFF"
                    />
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
                  </View>
                )}

            {/* Услуги заточки коньков - только для заточки коньков */}
            {player.status === 'skateSharpening' && (
              <View style={styles.section}>
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
              </View>
            )}

            {/* Карта - для заточки коньков */}
            {player.status === 'skateSharpening' && player.address && (
              <View style={styles.section}>
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
            </View>
            )}

            {/* Скидка для друзей - для заточки коньков */}
            {player.status === 'skateSharpening' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('profile.discountForFriends')}</Text>
                <Text style={styles.discountExplanation}>
                  {t('profile.discountForFriendsHint')}
                </Text>
                {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                  <View style={styles.discountEditContainer}>
                    <TextInput
                      style={styles.discountEditInput}
                      value={editData.discountForFriends !== undefined ? editData.discountForFriends : (player.discountForFriends || '')}
                      onChangeText={(text) => {
                        const numbersOnly = text.replace(/[^0-9]/g, '');
                        const withPercent = numbersOnly ? `${numbersOnly}%` : '';
                        setEditData({...editData, discountForFriends: withPercent});
                      }}
                      placeholder="10%"
                      keyboardType="numeric"
                      placeholderTextColor="#FFFFFF"
                    />
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
                  </View>
                )}

            {/* Социальные сети */}
            {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) && (
              <View style={styles.section}>
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
                      onChangeText={(text) => setEditData({...editData, tiktok: text})}
                      placeholder={t('socialLinks.tiktokPlaceholder')}
                      placeholderTextColor="#888"
                    />
            </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('socialLinks.vk')}</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editData.vk !== undefined ? editData.vk : (player.vk || '')}
                      onChangeText={(text) => setEditData({...editData, vk: text})}
                      placeholder={t('socialLinks.vkPlaceholder')}
                      placeholderTextColor="#888"
                    />
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('socialLinks.website')}</Text>
                    <TextInput
                      style={styles.editInput}
                      value={editData.website !== undefined ? editData.website : (player.website || '')}
                      onChangeText={(text) => setEditData({...editData, website: text})}
                      placeholder={t('socialLinks.websitePlaceholder')}
                      placeholderTextColor="#888"
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Секция команд - не показываем для магазинов и заточки коньков */}
            {player.status !== 'shop' && player.status !== 'skateSharpening' && (playerTeams.length > 0 || pastTeams.length > 0 || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id))) && (
              <View style={styles.teamsSection}>
                <Text style={styles.teamsSectionTitle}>{t('profile.teams')}</Text>
                
                {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
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
                    {playerTeams.length > 0 && (
                      <>
                        <Text style={styles.subsectionTitle}>{t('profile.currentTeams')}</Text>
                        <View style={styles.teamsListContainer}>
                          {playerTeams.map((team, index) => (
                            <View key={`current-${team.id}-${index}`} style={styles.teamItem}>
                              <Animated.View style={styles.rotatedStar}>
                                <Ionicons name="star" size={16} color="#fa2f40" />
                              </Animated.View>
                              <Text style={styles.teamsListText}>
                                {(() => {
                        const translationKey = `teams.${team.teamName}`;
                        return t(translationKey, { defaultValue: team.teamName });
                      })()} ({team.startYear} - {t('profile.настоящее время')})
                              </Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}
                    
                    {/* Прошлые команды */}
                    {pastTeams.length > 0 && (
                      <>
                        <Text style={styles.subsectionTitle}>{t('profile.pastTeams')}</Text>
                        <View style={styles.teamsListContainer}>
                          {pastTeams.map((team, index) => (
                            <View key={`past-${team.id}-${index}`} style={styles.teamItem}>
                              <Animated.View style={styles.rotatedStar}>
                                <Ionicons name="star" size={16} color="#888" />
                              </Animated.View>
                              <Text style={styles.teamsListText}>
                                {(() => {
                        const translationKey = `teams.${team.teamName}`;
                        return t(translationKey, { defaultValue: team.teamName });
                      })()} ({team.startYear}{team.endYear && team.endYear !== team.startYear ? ` - ${team.endYear}` : ''})
                              </Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}
                  </>
                )}
              </View>
            )}

            {/* Индивидуальные тренировки - только для тренеров */}
            {player.status === 'coach' && (
              <View style={styles.section}>
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
              </View>
            )}

            {/* Физические данные - только для игроков (не тренеры) */}
            {player.status === 'player' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('profile.physicalData')}</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('profile.height')}</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TextInput
                        style={styles.editInput}
                        value={editData.height !== undefined ? editData.height : (player.height || '')}
                        onChangeText={(text) => setEditData({...editData, height: text})}
                        placeholder={`${t('profile.height')} (${t('profile.cm')})`}
                        placeholderTextColor="#888"
                        keyboardType="numeric"
                      />
                    ) : (
                      <Text style={styles.infoValue}>{player.height ? `${player.height} ${t('profile.cm')}` : t('profile.notSpecified')}</Text>
                    )}
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>{t('profile.weight')}</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TextInput
                        style={styles.editInput}
                        value={editData.weight !== undefined ? editData.weight : (player.weight || '')}
                        onChangeText={(text) => setEditData({...editData, weight: text})}
                        placeholder={`${t('profile.weight')} (${t('profile.kg')})`}
                        placeholderTextColor="#888"
                        keyboardType="numeric"
                      />
                    ) : (
                      <Text style={styles.infoValue}>{player.weight ? `${player.weight} ${t('profile.kg')}` : t('profile.notSpecified')}</Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Видео моментов - только для игроков (не тренеры) */}
            {player.status === 'player' && ((currentUser && currentUser.id === player.id && isEditing) || (player.favoriteGoals && player.favoriteGoals.trim() !== '' && player.favoriteGoals.trim() !== 'null') || (isEditing && currentUser?.status === 'admin')) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>{t('profile.videoMoments')}</Text>
                {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                  <View>
                    <Text style={styles.sectionSubtitle}>
                      {t('addVideoLink')}{'\n'}
                      {t('supportedPlatforms')}
                    </Text>
                    <View>
                      {videoFields.map((video, index) => (
                        <View key={index} style={styles.videoFieldContainer}>
                          <TextInput
                            style={styles.videoUrlInput}
                            value={video.url}
                            onChangeText={(text) => {
                              const newVideoFields = [...videoFields];
                              newVideoFields[index] = { ...newVideoFields[index], url: text };
                              setVideoFields(newVideoFields);
                            }}
                            placeholder={t('videoUrlPlaceholder')}
                            placeholderTextColor="#888"
                          />
                          <TextInput
                            style={styles.timeCodeInput}
                            value={video.timeCode}
                            onChangeText={(text) => {
                              // Валидация формата времени (минуты:секунды)
                              const timeRegex = /^(\d{0,2}):?(\d{0,2})$/;
                              const match = text.match(timeRegex);
                              
                              if (match) {
                                let formattedText = text;
                                // Автоматически добавляем двоеточие если его нет и есть цифры
                                if (!text.includes(':') && text.length > 0) {
                                  if (text.length <= 2) {
                                    formattedText = text;
                                  } else {
                                    formattedText = text.slice(0, 2) + ':' + text.slice(2);
                                  }
                                }
                                
                                // Ограничиваем минуты до 59, секунды до 59
                                const parts = formattedText.split(':');
                                if (parts.length === 2) {
                                  const minutes = parseInt(parts[0]) || 0;
                                  const seconds = parseInt(parts[1]) || 0;
                                  if (minutes > 59) formattedText = '59:' + parts[1];
                                  if (seconds > 59) formattedText = parts[0] + ':59';
                                }
                                
                                const newVideoFields = [...videoFields];
                                newVideoFields[index] = { ...newVideoFields[index], timeCode: formattedText };
                                setVideoFields(newVideoFields);
                              } else if (text === '' || text === ':') {
                                // Разрешаем пустую строку и двоеточие
                                const newVideoFields = [...videoFields];
                                newVideoFields[index] = { ...newVideoFields[index], timeCode: text };
                                setVideoFields(newVideoFields);
                              }
                            }}
                            placeholder={t('timeCodePlaceholder')}
                            placeholderTextColor="#888"
                            keyboardType="default"
                            maxLength={5}
                          />
                          {videoFields.length > 1 && (
                            <TouchableOpacity
                              style={styles.removeVideoButton}
                              onPress={() => {
                                const newVideoFields = videoFields.filter((_, i) => i !== index);
                                setVideoFields(newVideoFields.length > 0 ? newVideoFields : [{ url: '', timeCode: '' }]);
                              }}
                            >
                              <Ionicons name="close-circle" size={20} color="#fa2f40" />
                            </TouchableOpacity>
                          )}
                        </View>
                      ))}
                      <TouchableOpacity
                        style={styles.addMoreButton}
                        onPress={() => {
                          setVideoFields([...videoFields, { url: '', timeCode: '' }]);
                        }}
                      >
                        <Ionicons name="add-circle" size={24} color="#fff" />
                        <Text style={styles.addMoreButtonText}>{t('addMoreVideo')}</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : player.favoriteGoals ? (
                  (() => {
                    const videoUrls = player.favoriteGoals.split('\n').filter(goal => goal.trim());
                    const parsedVideos = videoUrls.map(goal => parseVideoUrl(goal.trim()));
                    
                    return (
                  <VideoCarousel
                        videos={parsedVideos}
                    onVideoPress={(video) => setSelectedVideo(video)}
                  />
                    );
                  })()
                ) : null}
              </View>
            )}

            {/* Фотографии - не показываем для звезд, для магазинов доступны всем */}
            {player.status !== 'star' && (
              player.status === 'shop' ? (
                // Для магазинов фото доступны всем
            <EditablePhotosSection
              photos={galleryPhotos}
              isEditing={isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id)}
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
              isShopProfile={true}
            />
              ) : (
                // Для остальных - только друзьям
                (currentUser && currentUser.id === player.id) || 
                (currentUser?.status === 'admin') ||
                friendshipStatus === 'friends' ? (
                <EditablePhotosSection
                  photos={galleryPhotos}
                  isEditing={isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id)}
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
                />
                ) : (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>
                      {(player.status === 'shop' || player.status === 'skateSharpening') ? t('profile.photos') : t('profile.hockeyPhotos')}
                    </Text>
                    <View style={styles.lockedSectionContainer}>
                      <Ionicons name="lock-closed" size={48} color="#fa2f40" />
                      <Text style={styles.lockedSectionTitle}>{t('profile.addToFriends')}</Text>
                      <Text style={styles.lockedSectionText}>
                        {t('profile.addToFriendsToSeePhotos', { name: player.name })}
                      </Text>
                    </View>
                  </View>
                )
              )
            )}

            {/* Нормативы - показываем только игрокам (не тренерам) */}
            {player && player.status === 'player' ? (
              (currentUser && currentUser.id === player.id) || 
              friendshipStatus === 'friends' || 
              currentUser?.status === 'coach' || 
              currentUser?.status === 'scout' ||
              currentUser?.status === 'admin' ? (
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
                    <View style={styles.section}>
                      <Text style={styles.sectionTitle}>{t('profile.standards')}</Text>
                      <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>{t('profile.pullUps')}</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editData.pullUps !== undefined ? editData.pullUps : (player.pullUps || '')}
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
                            onChangeText={(text) => setEditData({...editData, plankTime: text})}
                            placeholder={t('timePlaceholder')}
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>100 метров</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editData.sprint100m !== undefined ? editData.sprint100m : (player.sprint100m || '')}
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
                            onChangeText={(text) => setEditData({...editData, jumpRope: text})}
                            placeholder={t('countPlaceholder')}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                    </View>
                  ) : (
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
                    />
                  )
                ) : null // Не показываем секцию, если данных нет
              ) : (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('profile.standards')}</Text>
                  <View style={styles.lockedSectionContainer}>
                    <Ionicons name="lock-closed" size={48} color="#fa2f40" />
                    <Text style={styles.lockedSectionTitle}>{t('profile.addToFriends')}</Text>
                    <Text style={styles.lockedSectionText}>
                      {t('profile.addToFriendsToSeeStandards', { name: player.name })}
                    </Text>
                  </View>
                </View>
              )
            ) : null}

            {/* Секция упражнений */}
            {player && (
              <PlayerExercisesSection 
                player={player} 
                isOwnProfile={currentUser?.id === player.id}
              />
            )}

            {/* Достижения - не показываем для магазинов и заточки коньков */}
            {player.status !== 'shop' && player.status !== 'skateSharpening' && (
            <AchievementsSection 
              achievements={achievements}
              isEditing={isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id)}
              onAchievementsChange={setAchievements}
            />
            )}

            {/* Музей игрока - полученные предметы */}
            {/* Показываем музей только для обычных игроков, у звезд, тренеров, скаутов его быть не должно */}
            {player && player.status === 'player' && (
              (currentUser && currentUser.id === player.id) || 
              (currentUser?.status === 'admin') ||
              (currentUser?.status === 'star') ||
              friendshipStatus === 'friends' ? (
                // Показываем контейнер музея если:
                // 1. Есть подарки
                // 2. Это админ или звезда (для кнопки "Отправить подарок")
                // 3. Это админ в режиме редактирования
                // 4. Это друг (даже если нет подарков)
                (museumItemsCount[player.id] && museumItemsCount[player.id] > 0) || 
                (currentUser?.status === 'admin') ||
                (currentUser?.status === 'star') ||
                (friendshipStatus === 'friends') ? (
                  <View style={styles.section} ref={museumRef}>
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
                    <View style={styles.giftButtonContainer}>
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
                </View>
                ) : null
              ) : (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>{t('profile.museum')}</Text>
                  <View style={styles.lockedSectionContainer}>
                    <Ionicons name="lock-closed" size={48} color="#fa2f40" />
                    <Text style={styles.lockedSectionTitle}>{t('profile.addToFriends')}</Text>
                    <Text style={styles.lockedSectionText}>
                      {t('profile.addToFriendsToSeeMuseum', { name: player.name })}
                    </Text>
                  </View>
                </View>
              )
            )}

            {/* Друзья - не показываем для скаутов */}
            {player.status !== 'scout' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {t('profile.friends')} ({friends.length})
              </Text>
              {friends.length > 0 ? (
                <View style={styles.friendsGrid}>
                  {friends.map((friend) => (
                    <TouchableOpacity
                      key={friend.id}
                      style={styles.friendItem}
                      onPress={() => router.push(`/player/${friend.id}`)}
                    >
                      <Image 
                        source={{ 
                          uri: friend.avatar || 'https://via.placeholder.com/60/333/fff?text=Player',
                          cache: 'force-cache' // Кешируем аватары
                        }} 
                        style={styles.friendAvatar}
                        defaultSource={{ uri: 'https://via.placeholder.com/60/333/fff?text=Player' }}
                        loadingIndicatorSource={{ uri: 'https://via.placeholder.com/60/333/fff?text=...' }}
                        // Оптимизация для медленного интернета
                        fadeDuration={200}
                      />
                      <Text style={styles.friendName} numberOfLines={2}>
                        {friend.name?.toUpperCase()}
                      </Text>
                      {friend.team && (
                        <Text style={styles.friendTeam} numberOfLines={1}>
                          {(() => {
                            const team = friend.team;
                            if (team === 'Minsk Region Team') return t('teams.Сборная Минской области');
                            if (team === 'Piranhas') return t('teams.Пираньи');
                            return t(`teams.${team}`, { defaultValue: team });
                          })()}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.friendsContainer}>
                  <Text style={styles.noDataText}>{t('profile.noFriendsYet', {name: player.name})}</Text>
                  <Text style={styles.noDataSubtext}>
                    {t('profile.beFirstToAdd', {name: player.name})}
                  </Text>
                </View>
              )}
            </View>
            )}

            {/* Кнопка управления дружбой - для не-звезд и не-скаутов показываем здесь */}
            {player.status !== 'star' && player.status !== 'scout' && currentUser && currentUser.id !== player.id && (
              <>
                {friendshipStatus === 'received_request' ? (
                  // Запрос дружбы получен
                  <View style={{ gap: 10, marginTop: 10, marginBottom: 20 }}>
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
                  // Уже друзья
                  <View style={{ marginTop: 10, marginBottom: 20 }}>
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: '#fa2f40' }]} 
                      onPress={handleAddFriend}
                      disabled={friendLoading}
                    >
                      <Ionicons name="person-remove-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>
                        {friendLoading ? t('common.loading') : t('profile.removeFromFriends')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (friendshipStatus === 'sent_request' || friendshipStatus === 'pending') ? (
                  // Запрос дружбы отправлен
                  <View style={{ marginTop: 10, marginBottom: 20 }}>
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: '#FF9800' }]} 
                      onPress={handleAddFriend}
                      disabled={friendLoading}
                    >
                      <Ionicons name="close-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>
                        {friendLoading ? t('common.loading') : t('profile.cancelRequest')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // Нет дружбы - можно добавить
                  <View style={{ marginTop: 10, marginBottom: 20 }}>
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: '#fa2f40' }]} 
                      onPress={handleAddFriend}
                      disabled={friendLoading}
                    >
                      <Ionicons name="person-add-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>
                        {friendLoading ? t('common.loading') : t('profile.addFriend')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

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
                            style={[styles.actionButton, { backgroundColor: '#000000', borderWidth: 1, borderColor: '#fa2f40' }]} 
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

            {/* Секция запроса подарков у звезды - только для игроков */}
            {player.status === 'star' && currentUser && currentUser.id !== player.id && currentUser.status === 'player' && (
              <View style={styles.section}>
                <ItemRequestButtons
                  starId={player.id}
                  playerId={currentUser.id}
                  onRequestSent={() => {
                    // Можно добавить логику после отправки запроса
                  }}
                />
              </View>
            )}

            {/* Кнопка управления дружбой для звезд - в самом низу профиля */}
            {player.status === 'star' && currentUser && currentUser.id !== player.id && (
              <>
                {friendshipStatus === 'received_request' ? (
                  // Запрос дружбы получен
                  <View style={{ gap: 10 }}>
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
                  // Уже друзья
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: '#fa2f40' }]} 
                      onPress={handleAddFriend}
                      disabled={friendLoading}
                    >
                      <Ionicons name="person-remove-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>
                        {friendLoading ? t('common.loading') : t('profile.removeFromFriends')}
                      </Text>
                    </TouchableOpacity>
                ) : (friendshipStatus === 'sent_request' || friendshipStatus === 'pending') ? (
                  // Запрос дружбы отправлен
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: '#FF9800' }]} 
                      onPress={handleAddFriend}
                      disabled={friendLoading}
                    >
                      <Ionicons name="close-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>
                        {friendLoading ? t('common.loading') : t('profile.cancelRequest')}
                      </Text>
                    </TouchableOpacity>
                ) : (
                  // Нет дружбы - можно добавить
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: '#fa2f40' }]} 
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
                      style={[styles.actionButton, { backgroundColor: '#000000', borderWidth: 1, borderColor: '#fa2f40' }]} 
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
                      <View style={styles.section}>
                        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
                        <LanguageSwitcher />
                      </View>
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
                      style={[styles.actionButton, { backgroundColor: '#000000' }]} 
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
                style={styles.loginAsUserButton}
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
            {currentUser?.status === 'admin' && player && (
              <View style={styles.adminButtonsContainer}>
                <TouchableOpacity 
                  style={[styles.adminButton, styles.editButton]} 
                  onPress={() => {
                    setEditData(player);
                    setIsEditing(true);
                  }}
                >
                  <Ionicons name="create-outline" size={20} color="#000" />
                  <Text style={[styles.adminButtonText, styles.editButtonText]}>{t('profile.edit')}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.adminButton, styles.deleteButton]} 
                  onPress={handleDeletePlayer}
                >
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text style={styles.adminButtonText}>{t('profile.deleteUser')}</Text>
                </TouchableOpacity>
              </View>
            )}


            {/* Кнопка написать сообщение - под кнопками дружбы */}
            {currentUser && currentUser.id !== player.id && (
              <View style={{ marginTop: 20, marginBottom: 20 }}>
                <TouchableOpacity 
                  style={[styles.actionButton, { backgroundColor: '#fff' }]} 
                  onPress={() => {
                    router.push({ 
                      pathname: '/chat/[id]', 
                      params: { id: player.id } 
                    });
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#000" />
                  <Text style={[styles.actionButtonText, { color: '#000' }]}>
                    {t('profile.sendMessage')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* QR-код профиля */}
            {player && (
              <View style={styles.qrCodeSection}>
                <View style={styles.qrCodeContainer}>
                  <QRCode
                    value={`hockeystars://player/${player.id}`}
                    size={Dimensions.get('window').width - 80}
                    color="#fff"
                    backgroundColor="#000"
                    logo={player.avatar ? { uri: player.avatar } : require('../../assets/icon.png')}
                    logoSize={80}
                    logoBackgroundColor="#fff"
                    logoBorderRadius={40}
                  />
                </View>
              </View>
            )}

            {/* Кнопка "Поделиться" */}
            {player && (
              <View style={{ marginTop: 10, marginBottom: 10, paddingHorizontal: 20 }}>
                <TouchableOpacity 
                  style={styles.shareButton} 
                  onPress={shareProfile}
                >
                  <Ionicons name="share-outline" size={20} color="#fff" />
                  <Text style={styles.shareButtonText}>
                    {t('profile.shareProfile') || 'Поделиться профилем'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

          </ScrollView>
        </View>
      </ImageBackground>

      {/* Скрытая карточка для шеринга */}
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
                {/* Аватар */}
                <View style={styles.shareCardAvatarContainer}>
                  {player.avatar ? (
                    <Image 
                      source={{ 
                        uri: player.avatar,
                        cache: 'force-cache',
                        headers: {
                          'Cache-Control': 'max-age=3600'
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
                  <Text style={styles.shareCardInfoLine}>
                    {player.position && (
                      <>
                        <Ionicons name="ribbon" size={14} color="#fa2f40" /> {translatePosition(player.position)}
                      </>
                    )}
                    {player.position && player.country && ' | '}
                    {player.country && (
                      <>
                        <Ionicons name="flag" size={14} color="#fa2f40" /> {t(`profile.countries.${player.country}`)}
                      </>
                    )}
                    {(player.position || player.country) && player.grip && ' | '}
                    {player.grip && (
                      <>
                        <Ionicons name="hand-left" size={14} color="#fa2f40" /> {translateGrip(player.grip)}
                      </>
                    )}
                  </Text>
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
                {(player.goals || player.assists || player.games) && (
                  <>
                    <Text style={styles.shareCardStatsTitle}>
                      {t('profile.currentSeasonStats') || 'Статистика текущего сезона'}
                    </Text>
                    <View style={styles.shareCardStatsRow}>
                      {player.games && (
                        <View style={styles.shareCardMiniStat}>
                          <Text style={styles.shareCardMiniStatValue}>{player.games}</Text>
                          <Text style={styles.shareCardMiniStatLabel}>{t('profile.games')}</Text>
                        </View>
                      )}
                      {player.goals && (
                        <View style={styles.shareCardMiniStat}>
                          <Text style={styles.shareCardMiniStatValue}>{player.goals}</Text>
                          <Text style={styles.shareCardMiniStatLabel}>{t('profile.goals')}</Text>
                        </View>
                      )}
                      {player.assists && (
                        <View style={styles.shareCardMiniStat}>
                          <Text style={styles.shareCardMiniStatValue}>{player.assists}</Text>
                          <Text style={styles.shareCardMiniStatLabel}>{t('profile.assists')}</Text>
                        </View>
                      )}
                      {(player.goals || player.assists) && (
                        <View style={styles.shareCardMiniStat}>
                          <Text style={styles.shareCardMiniStatValue}>
                            {(parseInt(player.goals || '0') + parseInt(player.assists || '0'))}
                          </Text>
                          <Text style={styles.shareCardMiniStatLabel}>{t('profile.points') || 'Очки'}</Text>
                        </View>
                      )}
                    </View>
                  </>
                )}

                {/* QR-код */}
                <View style={styles.shareCardQRContainer}>
                  <QRCode
                    value={`hockeystars://player/${player.id}`}
                    size={180}
                    color="#fff"
                    backgroundColor="#000"
                    logo={player.avatar ? { uri: player.avatar } : require('../../assets/icon.png')}
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
      
      {/* Модальное окно для видео */}
      <Modal
        visible={selectedVideo !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSelectedVideo(null)}
      >
        <View style={styles.videoModalOverlay}>
          <View style={styles.videoModalContainer}>
            <TouchableOpacity
              style={styles.videoModalCloseButton}
              onPress={() => setSelectedVideo(null)}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
            {selectedVideo && (
              <YouTubeVideo 
                url={selectedVideo.url}
                title={t('myMoment')}
                timeCode={selectedVideo.timeCode}
                onClose={() => setSelectedVideo(null)}
              />
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
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{t('selectCountry')}</Text>
            <ScrollView style={styles.modalScroll}>
              {COUNTRIES.map((country) => (
                <TouchableOpacity
                  key={country}
                  style={styles.modalOption}
                  onPress={() => {
                    setEditData({...editData, country: country});
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{t(`profile.countries.${country}`)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowCountryPicker(false)}
            >
              <Text style={styles.modalCancelButtonText}>{t('profile.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Модальное окно выбора позиции */}
      {showPositionPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{t('selectPosition')}</Text>
            <ScrollView style={styles.modalScroll}>
              {positions.map((position) => (
                <TouchableOpacity
                  key={position}
                  style={styles.modalOption}
                  onPress={() => {
                    setEditData({...editData, position: position});
                    setShowPositionPicker(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{position}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowPositionPicker(false)}
            >
              <Text style={styles.modalCancelButtonText}>{t('profile.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Модальное окно выбора хвата */}
      {showGripPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>{t('profile.selectGrip')}</Text>
            <ScrollView style={styles.modalScroll}>
              {grips.map((grip) => (
                <TouchableOpacity
                  key={grip}
                  style={styles.modalOption}
                  onPress={() => {
                    setEditData({...editData, grip: grip});
                    setShowGripPicker(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{t(`profile.grips.${grip}`)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowGripPicker(false)}
            >
              <Text style={styles.modalCancelButtonText}>{t('profile.cancel')}</Text>
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
    backgroundColor: '#000',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingTop: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
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
    marginLeft: 10,
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
  },
  errorText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: 'Gilroy-Regular',
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
    marginTop: 20,
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
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
    backgroundColor: '#000000', // Черный фон как у шайбы
    ...Platform.select({
      ios: {
        shadowColor: '#000',
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
        boxShadow: '0 3px 4px rgba(0, 0, 0, 0.8)',
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
  },
  playerName: {
    fontSize: 28,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginRight: 10,
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
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#000000',
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

  section: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)', 
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)', 
    ...Platform.select({
      ios: {
    shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
      },
      android: {
    elevation: 5,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)',
      },
    }),
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginTop: 2,
  },
  statLabelSmall: {
    fontSize: 10,
    fontFamily: 'Gilroy-Regular',
  },
  statLabelContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 2,
    position: 'relative',
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
  friendTeam: {
    fontSize: 10,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    textAlign: 'center',
  },
  friendsContainer: {
    alignItems: 'center',
    padding: 20,
  },
  // Стили для секции запроса дружбы
  friendRequestSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#fa2f40',
    ...Platform.select({
      ios: {
    shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
      },
      android: {
    elevation: 5,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)',
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
    shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
      },
      android: {
    elevation: 5,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)',
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

  videoModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoModalContainer: {
    width: '90%',
    height: '80%',
    borderRadius: 12,
    overflow: 'hidden',
  },
  videoModalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
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
    shadowColor: '#000',
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
    shadowColor: '#000',
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
    shadowColor: '#000',
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
    shadowColor: '#000',
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
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
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: '#1a1a1a',
    borderRadius: 15,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 20,
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalOption: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  modalOptionText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    textAlign: 'center',
  },
  teamsSection: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)', 
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(250, 47, 64, 0.3)', 
    ...Platform.select({
      ios: {
    shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
      },
      android: {
    elevation: 5,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)',
      },
    }),
  },
  modalCancelButton: {
    marginTop: 20,
    paddingVertical: 15,
    backgroundColor: '#fa2f40',
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
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
    backgroundColor: 'rgba(0,0,0,0.5)',
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
    backgroundColor: '#000',
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
    backgroundColor: '#000000',
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
  modalCloseButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 1,
  },
  modalContent: {
    padding: 20,
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
    backgroundColor: '#FF1493',
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
  },
  adminButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginLeft: 8,
  },
  editButtonText: {
    color: '#000',
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
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
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
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
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
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
        shadowRadius: 3.84,
      },
      android: {
    elevation: 5,
      },
      web: {
        boxShadow: '0 2px 4px rgba(0, 0, 0, 0.25)',
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
    backgroundColor: '#000',
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
    backgroundColor: '#000',
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
  shareCardQRContainer: {
    backgroundColor: '#000',
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


}); 