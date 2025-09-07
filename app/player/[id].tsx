import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    Alert,
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
import Animated from 'react-native-reanimated';
import AchievementsSection from '../../components/AchievementsSection';
import CurrentTeamsSection from '../../components/CurrentTeamsSection';
import CustomAlert from '../../components/CustomAlert';
import EditablePhotosSection from '../../components/EditablePhotosSection';



import ItemRequestButtons from '../../components/ItemRequestButtons';
import NormativesSection from '../../components/NormativesSection';
import PastTeamsSection from '../../components/PastTeamsSection';
import PlayerExercisesSection from '../../components/PlayerExercisesSection';
import PlayerMuseum from '../../components/PlayerMuseum';
import StarItemManager from '../../components/StarItemManager';
import VideoCarousel from '../../components/VideoCarousel';
import YouTubeVideo from '../../components/YouTubeVideo';
import { acceptFriendRequest, Achievement, calculateHockeyExperience, cancelFriendRequest, clearAllFriendRequests, createFriendRequestNotification, debugFriendRequests, declineFriendRequest, getFriends, getFriendshipStatus, getPlayerById, loadCurrentUser, PastTeam, Player, removeFriend, saveCurrentUser, sendFriendRequest, updatePlayer } from '../../utils/playerStorage';
import { supabase } from '../../utils/supabase';

const iceBg = require('../../assets/images/led.jpg');

export default function PlayerProfile() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [player, setPlayer] = useState<Player | null>(null);
  const [currentUser, setCurrentUser] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [friendshipStatus, setFriendshipStatus] = useState<'friends' | 'sent_request' | 'received_request' | 'none' | 'pending'>('none');
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
    confirmText: 'OK',
    cancelText: 'Отмена',
    secondaryText: 'Дополнительно'
  });
  const [showAlert, setShowAlert] = useState(false);
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error' | 'info'>('info');
  const [isEditing, setIsEditing] = useState(false);
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
  
  // Массивы для селекторов
  const countries = ['Беларусь', 'Россия', 'Канада', 'США', 'Финляндия', 'Швеция', 'Литва', 'Латвия', 'Польша'];
  const positions = ['Центральный нападающий', 'Крайний нападающий', 'Защитник', 'Вратарь'];
  const grips = ['Левый', 'Правый'];



  useEffect(() => {
    loadPlayerData();
  }, [id]);

  // Добавляем обновление при фокусе экрана
  useFocusEffect(
    useCallback(() => {
      // Добавляем небольшую задержку для обновления данных из базы
      setTimeout(() => {
      loadPlayerData();
      }, 100);
    }, [id])
  );

  const loadPlayerData = async () => {
    // Сбрасываем состояния редактирования при загрузке нового профиля
    setIsEditing(false);
    setEditData({});
    
    try {
      if (id) {
        const playerData = await getPlayerById(id as string);
        const userData = await loadCurrentUser();
        
        // Если игрок не найден, перенаправляем на главную
        if (!playerData) {
          router.replace('/');
          return;
        }
        
        // Загружаем команды игрока
        if (playerData) {
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
        }
        
        // Добавляем подробную отладочную информацию (закомментировано для production)
        if (playerData) {
          // console.log('🔍 Подробные данные игрока:');
          // console.log('   Имя:', playerData.name);
          // console.log('   Команда:', playerData.team);
          // console.log('   Позиция:', playerData.position);
          // console.log('   Голы:', playerData.goals);
          // console.log('   Передачи:', playerData.assists);
          // console.log('   Рост:', playerData.height);
          // console.log('   Вес:', playerData.weight);
          // console.log('   Страна:', playerData.country);
          // console.log('   Город:', playerData.city);
          // console.log('   Телефон:', playerData.phone);
          // console.log('   Достижения:', playerData.achievements);
          
          // // Добавляем отладку проблемных полей
          // console.log('🏒 Хоккейные данные:');
          // console.log('   Дата начала хоккея (hockeyStartDate):', playerData.hockeyStartDate);
          // console.log('   hockeyStartDate существует:', !!playerData.hockeyStartDate);
          // console.log('   hockeyStartDate !== "":', playerData.hockeyStartDate !== '');
          // console.log('   Рассчитанный опыт:', calculateHockeyExperience(playerData.hockeyStartDate));
          
          // console.log('📊 Нормативы:');
          // console.log('   Подтягивания (pullUps):', playerData.pullUps);
          // console.log('   Отжимания (pushUps):', playerData.pushUps);
          // console.log('   Планка (plankTime):', playerData.plankTime);
          // console.log('   Спринт 100м (sprint100m):', playerData.sprint100m);
          // console.log('   Прыжок в длину (longJump):', playerData.longJump);
          
          // console.log('🎥 Видео моментов:');
          // console.log('   favoriteGoals:', playerData.favoriteGoals);
          // console.log('   favoriteGoals.trim():', playerData.favoriteGoals ? playerData.favoriteGoals.trim() : 'null');
          // console.log('   favoriteGoals !== "":', playerData.favoriteGoals ? playerData.favoriteGoals.trim() !== '' : false);
          // if (playerData.favoriteGoals) {
          //   const videos = playerData.favoriteGoals.split('\n').filter(goal => goal.trim());
          //   console.log('   Количество видео:', videos.length);
          //   videos.forEach((video, i) => {
          //     console.log(`   Видео ${i + 1}:`, video);
          //   });
          // }
          
          // // Проверяем условия отображения
          // console.log('🔍 Условия отображения:');
          // console.log('   Статус игрока:', playerData.status);
          // console.log('   Статус игрока === "player":', playerData.status === 'player');
          // console.log('   Есть видео:', playerData.favoriteGoals && playerData.favoriteGoals.trim() !== '');
          // console.log('   Есть нормативы:', 
          //   (playerData.pullUps && playerData.pullUps !== '0' && playerData.pullUps !== '' && playerData.pullUps !== 'null') ||
          //   (playerData.pushUps && playerData.pushUps !== '0' && playerData.pushUps !== '' && playerData.pushUps !== 'null') ||
          //   (playerData.plankTime && playerData.plankTime !== '0' && playerData.plankTime !== '' && playerData.plankTime !== 'null') ||
          //   (playerData.sprint100m && playerData.sprint100m !== '0' && playerData.sprint100m !== '' && playerData.sprint100m !== 'null') ||
          //   (playerData.longJump && playerData.longJump !== '0' && playerData.longJump !== '' && playerData.longJump !== 'null')
          // );
          // console.log('   Показывать нормативы для собственного профиля:', true); // Всегда true для собственного профиля
          // console.log('   Показывать видео для собственного профиля:', true); // Всегда true для собственного профиля
        }
        
        // Мигрируем аватар в Storage, если он локальный
        let updatedPlayerData = playerData;
        if (playerData?.avatar && (playerData.avatar.startsWith('file://') || playerData.avatar.startsWith('content://') || playerData.avatar.startsWith('data:'))) {
      
          const { uploadImageToStorage } = await import('../../utils/uploadImage');
          const migratedAvatarUrl = await uploadImageToStorage(playerData.avatar);
          if (migratedAvatarUrl) {
            updatedPlayerData = { ...playerData, avatar: migratedAvatarUrl };
            await updatePlayer(playerData.id, updatedPlayerData, userData?.id);

          }
        }
        
        setPlayer(updatedPlayerData);
        setCurrentUser(userData);
        
        // Инициализируем видео поля
        if (playerData?.favoriteGoals) {
          const goals = playerData.favoriteGoals.split('\n').filter(goal => goal.trim());
          const videoData = goals.map(goal => {
            const { url, timeCode } = parseVideoUrl(goal);
            return { url, timeCode: timeCode || '' };
          });
          setVideoFields(videoData.length > 0 ? videoData : [{ url: '', timeCode: '' }]);
        }
        
        // Инициализируем фотографии и мигрируем локальные в Storage
        if (updatedPlayerData?.photos && updatedPlayerData.photos.length > 0) {
          const migratedPhotos = [];
          for (const photo of updatedPlayerData.photos) {
            // Проверяем, является ли фото локальным
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
          setGalleryPhotos(migratedPhotos);
          
          // Если были мигрированы фото, обновляем игрока
          if (migratedPhotos.length !== updatedPlayerData.photos.length) {
            const finalUpdatedPlayer = { ...updatedPlayerData, photos: migratedPhotos };
            await updatePlayer(updatedPlayerData.id, finalUpdatedPlayer, userData?.id);
            setPlayer(finalUpdatedPlayer);
          }
        } else {
          setGalleryPhotos([]);
        }

        // Инициализируем достижения
        if (playerData?.achievements && Array.isArray(playerData.achievements)) {
          setAchievements(playerData.achievements);
        }


        
        // Проверяем статус дружбы, если пользователь авторизован
        if (userData && playerData) {
          // Если пользователь смотрит свой профиль, устанавливаем статус 'friends'
          if (userData.id === playerData.id) {
    
            setFriendshipStatus('friends');
          } else {
    
            const friendsStatus = await getFriendshipStatus(userData.id, playerData.id);
            
            setFriendshipStatus(friendsStatus);
          }
        }
        
        // Загружаем список друзей игрока
        if (playerData) {
          const friendsList = await getFriends(playerData.id);
          setFriends(friendsList);
        }
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
      confirmText: 'OK',
      cancelText: 'Отмена',
      secondaryText: 'Дополнительно'
    });
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
  const formatBirthDate = (dateString: string): string => {
    if (!dateString) return 'Не указана';
    
    let day: number, month: number, year: number;
    
    // Проверяем формат ДД.ММ.ГГГГ
    if (dateString.includes('.')) {
      const parts = dateString.split('.');
      
      if (parts.length !== 3) {
        return dateString;
      }
      
      day = parseInt(parts[0]);
      month = parseInt(parts[1]);
      year = parseInt(parts[2]);
    }
    // Проверяем формат ГГГГ-ММ-ДД (ISO)
    else if (dateString.includes('-')) {
      const parts = dateString.split('-');
      
      if (parts.length !== 3) {
        return dateString;
      }
      
      year = parseInt(parts[0]);
      month = parseInt(parts[1]);
      day = parseInt(parts[2]);
    }
    // Если формат не распознан
    else {
      return dateString;
    }
    
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return dateString;
    }
    
    const months = [
      'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
      'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'
    ];
    
    return `${day} ${months[month - 1]} ${year}`;
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
          showCustomAlert('Успешно', `${player.name} удален из друзей`, 'success');
        } else {
          showCustomAlert('Ошибка', 'Не удалось удалить из друзей', 'error');
        }
      } else if (friendshipStatus === 'none') {
    
        // Отправляем запрос дружбы
        const success = await sendFriendRequest(currentUser.id, player.id);

        if (success) {
          setFriendshipStatus('pending');
          showCustomAlert('Запрос отправлен', `Запрос дружбы отправлен ${player.name}`, 'success');
        } else {
          showCustomAlert('Ошибка', 'Не удалось отправить запрос дружбы', 'error');
        }
      } else if (friendshipStatus === 'sent_request' || friendshipStatus === 'pending') {
        // Отменяем запрос
        const success = await cancelFriendRequest(currentUser.id, player.id);
        if (success) {
          setFriendshipStatus('none');
          showCustomAlert('Запрос отменен', 'Запрос дружбы отменен', 'info');
        } else {
          showCustomAlert('Ошибка', 'Не удалось отменить запрос', 'error');
        }
      } else if (friendshipStatus === 'received_request') {
        // Принимаем запрос
        const success = await acceptFriendRequest(currentUser.id, player.id);
        if (success) {
          setFriendshipStatus('friends');
          showCustomAlert('Дружба принята', `${player.name} добавлен в друзья`, 'success');
        } else {
          showCustomAlert('Ошибка', 'Не удалось принять запрос', 'error');
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
    const timeMatch = input.match(/\(время:\s*(\d{1,2}:\d{2})\)/);
    const timeCode = timeMatch ? timeMatch[1] : undefined;
    const url = input.replace(/\s*\(время:\s*\d{1,2}:\d{2}\)/, '').trim();
    return { url, timeCode };
  };

  const openYouTubeLink = (url: string) => {
    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Ошибка', 'Не удалось открыть ссылку');
      });
    }
  };



  const handleDebugFriendRequests = async () => {
    console.log('🔧 Отладка запросов дружбы...');
    await debugFriendRequests();
    showCustomAlert('Отладка', 'Проверьте консоль для информации о запросах дружбы', 'info');
  };

  const handleClearAllFriendRequests = async () => {
    await clearAllFriendRequests();
    showCustomAlert('Очистка', 'Все запросы дружбы очищены', 'info');
    // Обновляем данные после очистки
    await loadPlayerData();
  };

  const handleTestNotification = async () => {
    if (!currentUser || !player) return;
    

    await createFriendRequestNotification(player.id, currentUser.id);
    showCustomAlert('Тест', 'Тестовое уведомление создано', 'info');
  };

  const handleViewAllNotifications = async () => {
    try {
      const notificationsData = await AsyncStorage.getItem('hockeystars_notifications');
      const allNotifications = notificationsData ? JSON.parse(notificationsData) : [];

      showCustomAlert('Отладка', `Всего уведомлений: ${allNotifications.length}`, 'info');
    } catch (error) {
      console.error('❌ Ошибка просмотра уведомлений:', error);
    }
  };

  const handleSendFriendRequestFromPlayer = async () => {
    if (!currentUser || !player) return;
    

    try {
      await sendFriendRequest(player.id, currentUser.id);
      showCustomAlert('Успех', 'Запрос дружбы отправлен от имени игрока', 'success');
    } catch (error) {
      console.error('❌ Ошибка отправки запроса дружбы:', error);
      showCustomAlert('Ошибка', 'Не удалось отправить запрос дружбы', 'error');
    }
  };

  const handleTestMessage = async () => {
    if (!currentUser || !player) return;
    
            // Тестируем отправку сообщения
    try {
      const { sendMessageSimple } = await import('../../utils/playerStorage');
      const success = await sendMessageSimple(player.id, currentUser.id, 'Тестовое сообщение от игрока!');
      if (success) {
        showCustomAlert('Успех', 'Тестовое сообщение отправлено', 'success');
      } else {
        showCustomAlert('Ошибка', 'Не удалось отправить сообщение', 'error');
      }
    } catch (error) {
      console.error('❌ Ошибка отправки тестового сообщения:', error);
      showCustomAlert('Ошибка', 'Не удалось отправить сообщение', 'error');
    }
  };

  const handleViewAllMessages = async () => {
    try {
      const messagesData = await AsyncStorage.getItem('hockeystars_messages');
      const allMessages = messagesData ? JSON.parse(messagesData) : [];
              // Все сообщения в системе
      showCustomAlert('Отладка', `Всего сообщений: ${allMessages.length}`, 'info');
    } catch (error) {
      console.error('❌ Ошибка просмотра сообщений:', error);
    }
  };

  const handleRefreshCounters = async () => {
    if (!currentUser) return;
    

    try {
      const { getUnreadMessageCount } = await import('../../utils/playerStorage');
      const unreadMessagesCount = await getUnreadMessageCount(currentUser.id);
              // Обновленный счетчик непрочитанных сообщений
      showCustomAlert('Обновление', `Непрочитанных сообщений: ${unreadMessagesCount}`, 'info');
    } catch (error) {
      console.error('❌ Ошибка обновления счетчиков:', error);
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
      
      // Объединяем текущие данные игрока с изменениями
      const updatedPlayer = { 
        ...player, 
        ...editData, 
        favoriteGoals: goalsText,
        photos: galleryPhotos,
        achievements: achievements
        // Убираем pastTeams, так как команды сохраняются в отдельной таблице
      };
      
      // Синхронизируем команды с базой данных
      try {
        const { syncPlayerTeams, clearOldPastTeamsData } = await import('../../utils/playerStorage');
        
        // Сначала очищаем старые данные команд
        const clearSuccess = await clearOldPastTeamsData(player.id);
        if (!clearSuccess) {
          console.error('❌ Ошибка очистки старых данных команд');
          showCustomAlert('Ошибка', 'Не удалось очистить старые данные команд', 'error');
          return;
        }
        
        const teamsSyncSuccess = await syncPlayerTeams(player.id, playerTeams, pastTeams);
        
        if (!teamsSyncSuccess) {
          console.error('❌ Ошибка синхронизации команд');
          showCustomAlert('Ошибка', 'Не удалось сохранить команды', 'error');
          return;
        }
      } catch (syncError) {
        console.error('❌ Исключение при синхронизации команд:', syncError);
        showCustomAlert('Ошибка', 'Не удалось сохранить команды', 'error');
        return;
      }
      // Выполняем обновление данных игрока и перезагрузку команд параллельно
      const [refreshedPlayer, teams] = await Promise.all([
        updatePlayer(player.id, updatedPlayer, currentUser.id).then(() => getPlayerById(player.id)),
        import('../../utils/playerStorage').then(({ getPlayerTeamsAsPastTeams }) => getPlayerTeamsAsPastTeams(player.id))
      ]);
      
      // Обновляем состояние игрока
      if (refreshedPlayer) {
        setPlayer(refreshedPlayer);
        
        // Если редактируем свой собственный профиль, обновляем также currentUser в AsyncStorage
        if (currentUser.id === player.id) {
          setCurrentUser(refreshedPlayer);
          // Сохраняем обновленные данные в AsyncStorage
          try {
            await saveCurrentUser(refreshedPlayer);
            console.log('✅ Данные текущего пользователя обновлены в AsyncStorage');
          } catch (error) {
            console.error('❌ Ошибка обновления currentUser в AsyncStorage:', error);
          }
        }
      }
      
      // Обновляем состояние команд
      if (teams) {
        const currentTeams = teams.filter(team => team.isCurrent);
        const pastTeams = teams.filter(team => !team.isCurrent);
        
        setPlayerTeams(currentTeams);
        setPastTeams(pastTeams);
      }
      
      setIsEditing(false);
      showCustomAlert('Успешно', 'Данные игрока обновлены', 'success');
      
      // Принудительно обновляем все экраны, которые могут показывать данные пользователя
      if (currentUser.id === player.id) {
        // Перенаправляем с параметром обновления для LogoHeader
        router.replace(`/player/${player.id}?refresh=${Date.now()}`);
      }
      
    } catch (error) {
      console.error('❌ handleSave: общая ошибка сохранения:', error);
      console.error('❌ handleSave: детали ошибки:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      showCustomAlert('Ошибка', 'Не удалось сохранить изменения', 'error');
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
      'Удаление пользователя',
      `Вы уверены, что хотите удалить пользователя "${player.name}"? Это действие нельзя отменить.`,
      'warning',
      async () => {
        try {
      
          
          // Удаляем пользователя из базы данных
          const { error } = await supabase
            .from('players')
            .delete()
            .eq('id', player.id);
          
          if (error) {
            console.error('❌ Ошибка удаления пользователя:', error);
            showCustomAlert('Ошибка', 'Не удалось удалить пользователя', 'error');
          } else {

            showCustomAlert(
              'Успешно', 
              `Пользователь "${player.name}" удален`,
              'success',
              () => router.push('/')
            );
          }
        } catch (error) {
          console.error('❌ Общая ошибка удаления:', error);
          showCustomAlert('Ошибка', 'Произошла ошибка при удалении пользователя', 'error');
        }
      }
    );
  };

  const handleLogout = async () => {
    showCustomAlert(
      'Выход из профиля',
      'Вы уверены, что хотите выйти из профиля?',
      'warning',
      async () => {
        try {
          // Очищаем данные текущего пользователя
          const { logoutUser } = await import('../../utils/playerStorage');
          await logoutUser();
          
          // Переходим на главную страницу
          router.replace('/');
        } catch (error) {
          console.error('❌ Ошибка при выходе:', error);
          // Даже если произошла ошибка, все равно переходим на главную
          router.replace('/');
        }
      }
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ImageBackground source={iceBg} style={styles.background} resizeMode="cover">
          <View style={styles.overlay}>
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Загрузка профиля...</Text>
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
              <Text style={styles.errorText}>Игрок не найден</Text>
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
          <ScrollView contentContainerStyle={styles.scrollContainer}>
            


            {/* Фото и основная информация */}
            <View style={styles.profileSection}>
              {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                <TouchableOpacity 
                  style={styles.profileImage}
                  onPress={() => {
                    showCustomAlert('Редактирование фото', 'Функция редактирования фото будет добавлена позже', 'info');
                  }}
                >
              {(() => {
                const imageSource = player.avatar;
                const hasValidImage = imageSource && typeof imageSource === 'string' && (
                  imageSource.startsWith('data:image/') || 
                  imageSource.startsWith('http') || 
                  imageSource.startsWith('file://') || 
                  imageSource.startsWith('content://')
                );

                if (hasValidImage) {
                  return (
                    <Image 
                      source={{ 
                        uri: imageSource,
                            cache: 'reload',
                            headers: {
                              'Cache-Control': 'no-cache'
                            }
                          }}
                          style={styles.profileImage}
                        />
                      );
                    } else {
                      return (
                        <View style={[styles.profileImage, styles.avatarPlaceholder]}>
                          <Ionicons name="person" size={48} color="#FFFFFF" />
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
                  const imageSource = player.avatar;
                  const hasValidImage = imageSource && typeof imageSource === 'string' && (
                    imageSource.startsWith('data:image/') || 
                    imageSource.startsWith('http') || 
                    imageSource.startsWith('file://') || 
                    imageSource.startsWith('content://')
                  );

                  if (hasValidImage) {
                    return (
                      <Image 
                        source={{ 
                          uri: imageSource,
                          cache: 'reload',
                        headers: {
                          'Cache-Control': 'no-cache'
                        }
                      }}
                      style={styles.profileImage}
                      onError={(error) => {
                                console.error('❌ Ошибка загрузки аватара в профиле игрока:', error);
                      }}
                      onLoad={() => {
                
                      }}
                    />
                  );
                } else {
                  return (
                    <View style={[styles.profileImage, styles.avatarPlaceholder]}>
                      <Ionicons name="person" size={48} color="#FFFFFF" />
                    </View>
                  );
                }
                })()
              )}
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
                ) : (
                <Text style={styles.playerName}>{player.name?.toUpperCase()}</Text>
                )}
                {isEditing ? (
                  <TextInput
                    style={[styles.editInput, { width: 60, marginLeft: 10 }]}
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
                ) : null}
              </View>
              <View style={styles.statusContainer}>
                <Text style={styles.playerStatus}>
                  {player.status === 'player' ? 'Игрок' : 
                   player.status === 'coach' ? 'Тренер' : 
                   player.status === 'scout' ? 'Скаут' : 
                   player.status === 'admin' ? 'Техподдержка' : 'Звезда'}
                </Text>
              </View>
              {playerTeams.length > 0 && (
                <View style={styles.playerTeamsContainer}>
                  {playerTeams.map((team, index) => (
                    <Text key={index} style={styles.playerTeam}>
                      {team.teamName}{index < playerTeams.length - 1 ? ', ' : ''}
                    </Text>
                  ))}
                </View>
              )}
              
              {/* Опыт в хоккее */}
              {player.status === 'player' && player.hockeyStartDate && (
                <View style={styles.hockeyExperienceContainer}>
                  <Text style={styles.hockeyExperienceText}>
                  В хоккее {calculateHockeyExperience(player.hockeyStartDate)}
                </Text>
                </View>
              )}

              

              

            </View>

            {/* Секция управления дружбой - показываем для всех статусов дружбы */}
            {currentUser && currentUser.id !== player.id && (
              <View style={styles.friendRequestSection}>
                {friendshipStatus === 'received_request' ? (
                  // Запрос дружбы получен
                  <>
                    <View style={styles.friendRequestHeader}>
                      <Ionicons name="person-add-outline" size={24} color="#FF4444" />
                      <Text style={[styles.friendRequestTitle, { color: '#FF4444' }]}>Запрос дружбы</Text>
                    </View>
                    <Text style={styles.friendRequestMessage}>
                      {player.name} хочет добавить вас в друзья
                    </Text>
                    <View style={styles.friendRequestButtons}>
                      <TouchableOpacity 
                        style={[styles.friendRequestButton, styles.acceptRequestButton]} 
                        onPress={handleAddFriend}
                        disabled={friendLoading}
                      >
                        <Ionicons name="checkmark-outline" size={20} color="#fff" />
                        <Text style={styles.friendRequestButtonText}>
                          {friendLoading ? 'Загрузка...' : 'Принять'}
                        </Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity 
                        style={[styles.friendRequestButton, styles.declineRequestButton]} 
                        onPress={handleDeclineFriend}
                        disabled={friendLoading}
                      >
                        <Ionicons name="close-outline" size={20} color="#000" />
                        <Text style={[styles.friendRequestButtonText, { color: '#000', fontFamily: 'Gilroy-Bold' }]}>
                          {friendLoading ? 'Загрузка...' : 'Отклонить'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : friendshipStatus === 'friends' ? (
                  // Уже друзья
                  <>
                    <View style={styles.friendRequestHeader}>
                      <Ionicons name="people-outline" size={24} color="#FF4444" />
                      <Text style={[styles.friendRequestTitle, { color: '#FF4444' }]}>Друзья</Text>
                    </View>
                    <Text style={styles.friendRequestMessage}>
                      Вы друзья с {player.name}
                    </Text>
                    <View style={styles.friendRequestButtons}>
                      <TouchableOpacity 
                        style={[styles.friendRequestButton, { backgroundColor: 'rgba(255, 0, 0, 0.3)', borderColor: '#FF0000' }]} 
                        onPress={handleAddFriend}
                        disabled={friendLoading}
                      >
                        <Ionicons name="person-remove-outline" size={20} color="#fff" />
                        <Text style={styles.friendRequestButtonText}>
                          {friendLoading ? 'Загрузка...' : 'Удалить из друзей'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (friendshipStatus === 'sent_request' || friendshipStatus === 'pending') ? (
                  // Запрос дружбы отправлен
                  <>
                    <View style={styles.friendRequestHeader}>
                      <Ionicons name="time-outline" size={24} color="#FF4444" />
                      <Text style={[styles.friendRequestTitle, { color: '#FF4444' }]}>Запрос отправлен</Text>
                    </View>
                    <Text style={styles.friendRequestMessage}>
                      Запрос дружбы отправлен {player.name}
                    </Text>
                    <View style={styles.friendRequestButtons}>
                      <TouchableOpacity 
                        style={[styles.friendRequestButton, { backgroundColor: 'rgba(255, 255, 255, 0.3)', borderColor: '#FFFFFF' }]} 
                        onPress={handleAddFriend}
                        disabled={friendLoading}
                      >
                        <Ionicons name="close-outline" size={20} color="#fff" />
                        <Text style={[styles.friendRequestButtonText, { color: '#fff' }]}>
                          {friendLoading ? 'Загрузка...' : 'Отменить запрос'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                ) : (
                  // Нет дружбы - можно добавить
                  <>
                    <View style={styles.friendRequestHeader}>
                      <Ionicons name="person-add-outline" size={24} color="#FF4444" />
                      <Text style={[styles.friendRequestTitle, { color: '#FF4444' }]}>Добавить в друзья</Text>
                    </View>
                    <Text style={styles.friendRequestMessage}>
                      Хотите добавить {player.name} в друзья?
                    </Text>
                    <View style={styles.friendRequestButtons}>
                      <TouchableOpacity 
                        style={[styles.friendRequestButton, { backgroundColor: 'rgba(255, 68, 68, 0.3)', borderColor: '#FF4444' }]} 
                        onPress={handleAddFriend}
                        disabled={friendLoading}
                      >
                        <Ionicons name="person-add-outline" size={20} color="#fff" />
                        <Text style={styles.friendRequestButtonText}>
                          {friendLoading ? 'Загрузка...' : 'Добавить в друзья'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </>
                )}
              </View>
            )}

            {/* Кнопка отладки для администратора */}
            {currentUser && currentUser.status === 'admin' && (
              <View style={styles.section}>
                <TouchableOpacity 
                  style={[styles.friendRequestButton, { backgroundColor: 'rgba(0, 0, 255, 0.3)', borderColor: '#0000FF' }]} 
                  onPress={handleDebugFriendRequests}
                >
                  <Ionicons name="bug-outline" size={20} color="#fff" />
                  <Text style={styles.friendRequestButtonText}>
                    Отладка запросов дружбы
                  </Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[styles.friendRequestButton, { backgroundColor: 'rgba(255, 0, 0, 0.3)', borderColor: '#FF0000', marginTop: 10 }]} 
                  onPress={handleClearAllFriendRequests}
                >
                  <Ionicons name="trash-outline" size={20} color="#fff" />
                  <Text style={styles.friendRequestButtonText}>
                    Очистить все запросы дружбы
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.friendRequestButton, { backgroundColor: 'rgba(0, 255, 0, 0.3)', borderColor: '#00FF00', marginTop: 10 }]} 
                  onPress={handleTestNotification}
                >
                  <Ionicons name="notifications-outline" size={20} color="#fff" />
                  <Text style={styles.friendRequestButtonText}>
                    Тест уведомления
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.friendRequestButton, { backgroundColor: 'rgba(255, 165, 0, 0.3)', borderColor: '#FFA500', marginTop: 10 }]} 
                  onPress={handleViewAllNotifications}
                >
                  <Ionicons name="eye-outline" size={20} color="#fff" />
                  <Text style={styles.friendRequestButtonText}>
                    Просмотр всех уведомлений
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.friendRequestButton, { backgroundColor: 'rgba(128, 0, 128, 0.3)', borderColor: '#800080', marginTop: 10 }]} 
                  onPress={handleSendFriendRequestFromPlayer}
                >
                  <Ionicons name="person-add-outline" size={20} color="#fff" />
                  <Text style={styles.friendRequestButtonText}>
                    Отправить запрос от игрока
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.friendRequestButton, { backgroundColor: 'rgba(0, 128, 128, 0.3)', borderColor: '#008080', marginTop: 10 }]} 
                  onPress={handleTestMessage}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                  <Text style={styles.friendRequestButtonText}>
                    Тест сообщения
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.friendRequestButton, { backgroundColor: 'rgba(128, 128, 0, 0.3)', borderColor: '#808000', marginTop: 10 }]} 
                  onPress={handleViewAllMessages}
                >
                  <Ionicons name="eye-outline" size={20} color="#fff" />
                  <Text style={styles.friendRequestButtonText}>
                    Просмотр всех сообщений
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.friendRequestButton, { backgroundColor: 'rgba(75, 0, 130, 0.3)', borderColor: '#4B0082', marginTop: 10 }]} 
                  onPress={handleRefreshCounters}
                >
                  <Ionicons name="refresh-outline" size={20} color="#fff" />
                  <Text style={styles.friendRequestButtonText}>
                    Обновить счетчики
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Статистика текущего сезона - только для обычных игроков с данными */}
            {player && player.status !== 'star' && (() => {
              const goalsNum = parseInt(player.goals || '0') || 0;
              const assistsNum = parseInt(player.assists || '0') || 0;
              const gamesNum = parseInt(player.games || '0') || 0;
              const pointsNum = goalsNum + assistsNum;
              

              
              // Показываем статистику только если есть хотя бы одно ненулевое значение
              const hasStats = pointsNum > 0 || goalsNum > 0 || assistsNum > 0 || gamesNum > 0;
              
              return (hasStats || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id))) ? (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Статистика текущего сезона</Text>
                  {isEditing ? (
                    <View style={styles.statsGrid}>
                      <View style={styles.statItem}>
                        <Text style={styles.statLabel}>Игр</Text>
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
                        <Text style={styles.statLabel}>Голов</Text>
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
                        <Text style={styles.statLabel}>Передач</Text>
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
                        <Text style={styles.statValue}>{pointsNum.toString()}</Text>
                        <Text style={styles.statLabel}>Очков</Text>
                      </View>
                    )}
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{friends.length}</Text>
                      <Text style={styles.statLabel}>Друзей</Text>
                    </View>
                    {goalsNum > 0 && (
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{goalsNum.toString()}</Text>
                        <Text style={styles.statLabel}>Голов</Text>
                      </View>
                    )}
                    {assistsNum > 0 && (
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{assistsNum.toString()}</Text>
                        <Text style={styles.statLabel}>Передач</Text>
                      </View>
                    )}
                    {gamesNum > 0 && (
                      <View style={styles.statItem}>
                        <Text style={styles.statValue}>{gamesNum.toString()}</Text>
                        <Text style={styles.statLabel}>Игр</Text>
                      </View>
                    )}
                  </View>
                  )}
                </View>
              ) : null;
            })()}

            {/* Секция команд */}
            {(playerTeams.length > 0 || pastTeams.length > 0 || (isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id))) && (
              <View style={styles.teamsSection}>
                <Text style={styles.teamsSectionTitle}>Команды</Text>
                
                {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                  <>
                    {/* Текущие команды */}
                    <View style={styles.teamsSubsection}>
                      <Text style={styles.subsectionTitle}>Текущие команды</Text>
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
                      <Text style={styles.subsectionTitle}>Прошлые команды</Text>
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
                        <Text style={styles.subsectionTitle}>Текущие команды</Text>
                        <View style={styles.teamsListContainer}>
                          {playerTeams.map((team, index) => (
                            <View key={`current-${team.id}-${index}`} style={styles.teamItem}>
                              <Animated.View style={styles.rotatedStar}>
                                <Ionicons name="star" size={16} color="#FF4444" />
                              </Animated.View>
                              <Text style={styles.teamsListText}>
                                {team.teamName} ({team.startYear} - настоящее время)
                              </Text>
                            </View>
                          ))}
                        </View>
                      </>
                    )}
                    
                    {/* Прошлые команды */}
                    {pastTeams.length > 0 && (
                      <>
                        <Text style={styles.subsectionTitle}>Прошлые команды</Text>
                        <View style={styles.teamsListContainer}>
                          {pastTeams.map((team, index) => (
                            <View key={`past-${team.id}-${index}`} style={styles.teamItem}>
                              <Animated.View style={styles.rotatedStar}>
                                <Ionicons name="star" size={16} color="#888" />
                              </Animated.View>
                              <Text style={styles.teamsListText}>
                                {team.teamName} ({team.startYear}{team.endYear && team.endYear !== team.startYear ? ` - ${team.endYear}` : ''})
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

            {/* Информация о команде для звезд */}
            {player.status === 'star' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Информация о команде</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Команда</Text>
                    <Text style={styles.infoValue}>{player.team || 'Не указана'}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Друзей</Text>
                    <Text style={styles.infoValue}>{friends.length}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Страна</Text>
                    <Text style={styles.infoValue}>{player.country}</Text>
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Позиция</Text>
                    <Text style={styles.infoValue}>{player.position || 'Не указана'}</Text>
                  </View>
                  {player.grip && (
                    <View style={styles.infoItem}>
                      <Text style={styles.infoLabel}>Хват</Text>
                      <Text style={styles.infoValue}>{player.grip}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}


            {/* Основная информация */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Основная информация</Text>
              <View style={styles.infoGrid}>
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Страна</Text>
                  {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                    <TouchableOpacity
                      style={styles.pickerButton}
                      onPress={() => setShowCountryPicker(true)}
                    >
                      <Text style={styles.pickerButtonText}>
                        {editData.country || player.country || 'Выберите страну'}
                      </Text>
                      <Ionicons name="chevron-down" size={16} color="#fff" />
                    </TouchableOpacity>
                  ) : (
                    <Text style={styles.infoValue}>{player.country || 'Не указана'}</Text>
                  )}
                </View>

                {player.status === 'player' && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Позиция</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setShowPositionPicker(true)}
                      >
                        <Text style={styles.pickerButtonText}>
                          {editData.position || player.position || 'Выберите позицию'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#fff" />
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.infoValue}>{player.position || 'Не указана'}</Text>
                    )}
                  </View>
                )}
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Дата рождения</Text>
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
                    <Text style={styles.infoValue}>{formatBirthDate(player.birthDate || '')}</Text>
                  )}
                </View>
                {player.status === 'player' && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Начал играть в хоккей</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                    <TextInput
                      style={styles.editInput}
                        value={editData.hockeyStartDate !== undefined ? editData.hockeyStartDate : (player.hockeyStartDate || '')}
                        onChangeText={(text) => setEditData({...editData, hockeyStartDate: text})}
                        placeholder="ММ.ГГГГ (например: 12.2014)"
                    />
                  ) : (
                      <Text style={styles.infoValue}>
                        {player.hockeyStartDate ? 
                          `В хоккее ${calculateHockeyExperience(player.hockeyStartDate)}` : 
                          'Не указано'
                        }
                      </Text>
                  )}
                </View>
                )}
                {player.status === 'player' && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Хват</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TouchableOpacity
                        style={styles.pickerButton}
                        onPress={() => setShowGripPicker(true)}
                      >
                        <Text style={styles.pickerButtonText}>
                          {editData.grip || player.grip || 'Выберите хват'}
                        </Text>
                        <Ionicons name="chevron-down" size={16} color="#fff" />
                      </TouchableOpacity>
                    ) : (
                      <Text style={styles.infoValue}>{player.grip || 'Не указан'}</Text>
                    )}
                  </View>
                )}
              </View>
            </View>

            {/* Физические данные - только для игроков (не тренеры) */}
            {player.status === 'player' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Физические данные</Text>
                <View style={styles.infoGrid}>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Рост</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TextInput
                        style={styles.editInput}
                        value={editData.height !== undefined ? editData.height : (player.height || '')}
                        onChangeText={(text) => setEditData({...editData, height: text})}
                        placeholder="Рост (см)"
                        placeholderTextColor="#888"
                        keyboardType="numeric"
                      />
                    ) : (
                      <Text style={styles.infoValue}>{player.height ? `${player.height} см` : 'Не указан'}</Text>
                    )}
                  </View>
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>Вес</Text>
                    {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                      <TextInput
                        style={styles.editInput}
                        value={editData.weight !== undefined ? editData.weight : (player.weight || '')}
                        onChangeText={(text) => setEditData({...editData, weight: text})}
                        placeholder="Вес (кг)"
                        placeholderTextColor="#888"
                        keyboardType="numeric"
                      />
                    ) : (
                      <Text style={styles.infoValue}>{player.weight ? `${player.weight} кг` : 'Не указан'}</Text>
                    )}
                  </View>
                </View>
              </View>
            )}

            {/* Видео моментов - только для игроков (не тренеры) */}
            {player.status === 'player' && ((currentUser && currentUser.id === player.id && isEditing) || (player.favoriteGoals && player.favoriteGoals.trim() !== '' && player.favoriteGoals.trim() !== 'null') || (isEditing && currentUser?.status === 'admin')) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Видео моментов</Text>
                {isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id) ? (
                  <View>
                    <Text style={styles.sectionSubtitle}>
                      Добавьте ссылку на YouTube видео и время начала момента (формат: минуты:секунды, например: 1:25){'\n'}
                      Поддерживаются: youtube.com/watch?v=, youtu.be/, youtube.com/shorts/, youtube.com/live/, m.youtube.com/
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
                            placeholder="https://youtube.com/watch?v=... или youtube.com/live/..."
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
                            placeholder="мин:сек"
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
                              <Ionicons name="close-circle" size={20} color="#FF4444" />
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
                        <Ionicons name="add-circle" size={24} color="#FF4444" />
                        <Text style={styles.addMoreButtonText}>Добавить еще видео</Text>
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
                      <Text style={styles.sectionTitle}>Нормативы</Text>
                      <View style={styles.infoGrid}>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>Подтягивания</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editData.pullUps !== undefined ? editData.pullUps : (player.pullUps || '')}
                            onChangeText={(text) => setEditData({...editData, pullUps: text})}
                            placeholder="Количество раз"
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>Отжимания</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editData.pushUps !== undefined ? editData.pushUps : (player.pushUps || '')}
                            onChangeText={(text) => setEditData({...editData, pushUps: text})}
                            placeholder="Количество раз"
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>Планка</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editData.plankTime !== undefined ? editData.plankTime : (player.plankTime || '')}
                            onChangeText={(text) => setEditData({...editData, plankTime: text})}
                            placeholder="Время в секундах"
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>100 метров</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editData.sprint100m !== undefined ? editData.sprint100m : (player.sprint100m || '')}
                            onChangeText={(text) => setEditData({...editData, sprint100m: text})}
                            placeholder="Время в секундах"
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>Прыжок в длину</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editData.longJump !== undefined ? editData.longJump : (player.longJump || '')}
                            onChangeText={(text) => setEditData({...editData, longJump: text})}
                            placeholder="Длина в см"
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={styles.infoItem}>
                          <Text style={styles.infoLabel}>Скакалка</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editData.jumpRope !== undefined ? editData.jumpRope : (player.jumpRope || '')}
                            onChangeText={(text) => setEditData({...editData, jumpRope: text})}
                            placeholder="Количество раз"
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
                    />
                  )
                ) : null // Не показываем секцию, если данных нет
              ) : (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Нормативы</Text>
                  <View style={styles.lockedSectionContainer}>
                    <Ionicons name="lock-closed" size={48} color="#FF4444" />
                    <Text style={styles.lockedSectionTitle}>Добавьте в друзья</Text>
                    <Text style={styles.lockedSectionText}>
                      Добавьте {player.name} в друзья, чтобы увидеть нормативы
                    </Text>
                  </View>
                </View>
              )
            ) : null}



            {/* Достижения */}
            <AchievementsSection 
              achievements={achievements}
              isEditing={isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id)}
              onAchievementsChange={setAchievements}
            />

            {/* Фотографии */}
            <EditablePhotosSection
              photos={galleryPhotos}
              isEditing={isEditing && (currentUser?.status === 'admin' || currentUser?.id === player.id)}
              onPhotosChange={(newPhotos) => {
            
                setGalleryPhotos(newPhotos);
              }}
            />

            {/* Друзья */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Друзья</Text>
              {friends.length > 0 ? (
                <View style={styles.friendsGrid}>
                  {friends.map((friend) => (
                    <TouchableOpacity
                      key={friend.id}
                      style={styles.friendItem}
                      onPress={() => router.push(`/player/${friend.id}`)}
                    >
                      <Image 
                        source={{ uri: friend.avatar || 'https://via.placeholder.com/60/333/fff?text=Player' }} 
                        style={styles.friendAvatar}
                      />
                      <Text style={styles.friendName} numberOfLines={2}>
                        {friend.name?.toUpperCase()}
                      </Text>
                      {friend.team && (
                        <Text style={styles.friendTeam} numberOfLines={1}>
                          {friend.team}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              ) : (
                <View style={styles.friendsContainer}>
                  <Text style={styles.noDataText}>У {player.name} пока нет друзей</Text>
                  <Text style={styles.noDataSubtext}>
                    Будьте первым, кто добавит {player.name} в друзья
                  </Text>
                </View>
              )}
            </View>

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
                            style={[styles.actionButton, { backgroundColor: '#4CAF50' }]} 
                            onPress={handleSave}
                          >
                            <Ionicons name="checkmark-outline" size={20} color="#fff" />
                            <Text style={styles.actionButtonText}>Сохранить</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={[styles.actionButton, { backgroundColor: '#FF9800' }]} 
                            onPress={() => {
                              setIsEditing(false);
                              setEditData({});
                            }}
                          >
                            <Ionicons name="close-outline" size={20} color="#fff" />
                            <Text style={styles.actionButtonText}>Отменить</Text>
                          </TouchableOpacity>
                        </>
                      ) : (
                        <>
                          <TouchableOpacity 
                            style={[styles.actionButton, styles.editButton]} 
                            onPress={() => {
                              setEditData(player);
                              setIsEditing(true);
                            }}
                          >
                            <Ionicons name="create-outline" size={20} color="#fff" />
                            <Text style={styles.actionButtonText}>Редактировать</Text>
                          </TouchableOpacity>
                          
                          <TouchableOpacity 
                            style={[styles.actionButton, styles.deleteButton]} 
                            onPress={handleDeletePlayer}
                          >
                            <Ionicons name="trash-outline" size={20} color="#fff" />
                            <Text style={styles.actionButtonText}>Удалить пользователя</Text>
                          </TouchableOpacity>
                        </>
                      )}
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

            {/* Секция упражнений */}
            {player && (
              <PlayerExercisesSection 
                player={player} 
                isOwnProfile={currentUser?.id === player.id}
              />
            )}

            {/* Музей игрока - полученные предметы */}
            {/* Показываем музей только для обычных игроков, у звезд, тренеров, скаутов его быть не должно */}
            {player && player.status === 'player' && (
              <PlayerMuseum 
                playerId={player.id} 
                currentUserId={currentUser?.id}
                isOwner={currentUser?.id === player.id}
                isAdmin={currentUser?.status === 'admin'}
                isEditing={isEditing}
              />
            )}

            {/* Секция запроса подарков у звезды */}
            {player.status === 'star' && currentUser && currentUser.id !== player.id && (
              <View style={styles.section}>
                <ItemRequestButtons
                  starId={player.id}
                  playerId={currentUser.id}
                  onRequestSent={() => {
                    // Можно добавить логику после отправки запроса
                    console.log('Запрос подарка отправлен');
                  }}
                />
              </View>
            )}

            {/* Система управления предметами для звезд */}
            {player.status === 'star' && (
              <>
                {/* Управление предметами для владельца звезды */}
                {(currentUser?.id === player.id || currentUser?.status === 'admin') && (
                  <View style={styles.section}>
                    <StarItemManager
                      playerId={player.id}
                      isEditing={isEditing}
                      onItemsUpdated={() => {
                        // Обновляем данные при изменении предметов
                        loadPlayerData();
                      }}
                    />
                  </View>
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
                      style={[styles.actionButton, { backgroundColor: '#4CAF50' }]} 
                      onPress={handleSave}
                    >
                      <Ionicons name="checkmark-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Сохранить</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: '#f44336' }]} 
                      onPress={() => {
                        setIsEditing(false);
                        setEditData({});
                      }}
                    >
                      <Ionicons name="close-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Отмена</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  // Кнопки для обычного режима
                  <View style={{ gap: 15, marginTop: 20, marginBottom: 20 }}>
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: '#FF4444' }]} 
                      onPress={() => {
                        setEditData(player);
                        setIsEditing(true);
                      }}
                    >
                      <Ionicons name="create-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Редактировать профиль</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                      style={[styles.actionButton, { backgroundColor: '#000000' }]} 
                      onPress={handleLogout}
                    >
                      <Ionicons name="log-out-outline" size={20} color="#fff" />
                      <Text style={styles.actionButtonText}>Выйти из профиля</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {/* Кнопка "написать сообщение" */}
            {currentUser && currentUser.id !== player.id && player.status !== 'star' && (
              <View style={{ marginTop: 10, marginBottom: 20 }}>
                <TouchableOpacity 
                  style={styles.actionButton} 
                  onPress={() => {
                    router.push({ 
                      pathname: '/chat/[id]', 
                      params: { id: player.id } 
                    });
                  }}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>
                    {player.status === 'admin' 
                      ? 'Написать в техподдержку' 
                      : 'Написать сообщение'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

          </ScrollView>
        </View>
      </ImageBackground>
      
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
                title="Мой момент"
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
            <Text style={styles.modalTitle}>Выберите страну</Text>
            <ScrollView style={styles.modalScroll}>
              {countries.map((country) => (
                <TouchableOpacity
                  key={country}
                  style={styles.modalOption}
                  onPress={() => {
                    setEditData({...editData, country: country});
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>{country}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowCountryPicker(false)}
            >
              <Text style={styles.modalCancelButtonText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Модальное окно выбора позиции */}
      {showPositionPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Выберите позицию</Text>
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
              <Text style={styles.modalCancelButtonText}>Отмена</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Модальное окно выбора хвата */}
      {showGripPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Выберите хват</Text>
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
                  <Text style={styles.modalOptionText}>{grip}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowGripPicker(false)}
            >
              <Text style={styles.modalCancelButtonText}>Отмена</Text>
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
                  <Text style={styles.datePickerButtonText}>Отмена</Text>
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
                  <Text style={styles.datePickerButtonText}>Подтвердить</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
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
    padding: 20,
    borderRadius: 50,
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
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
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#FF4444',
    marginBottom: 15,
  },
  avatarPlaceholder: {
    backgroundColor: '#2C3E50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  playerName: {
    fontSize: 28,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginRight: 10,
  },
  numberBadge: {
    backgroundColor: '#FF4444',
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
    color: '#FF4444',
    fontWeight: 'bold',
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
    color: '#FF4444',
  },
  hockeyExperience: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#FF4444',
    marginTop: 4,
  },
  actionsSection: {
    gap: 15,
    marginTop: 20,
  },
  actionButton: {
    backgroundColor: '#FF4444',
    borderRadius: 12,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addFriendButton: {
    backgroundColor: 'rgba(255, 68, 68, 0.2)',
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  removeFriendButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: '#FF0000',
  },
  cancelRequestButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.3)',
    borderWidth: 1,
    borderColor: '#FF0000',
  },
  acceptRequestButton: {
    backgroundColor: '#FF4444',
    borderWidth: 1,
    borderColor: '#FF4444',
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

  sectionTitle: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    color: '#FF4444',
    marginBottom: 15,
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
  statValue: {
    fontSize: 24,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    marginTop: 5,
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  friendRequestButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
    marginLeft: 8,
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
  lockedSectionContainer: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  lockedSectionTitle: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#FF4444',
    marginTop: 15,
    marginBottom: 8,
  },
  lockedSectionText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#ccc',
    textAlign: 'center',
    lineHeight: 20,
  },
  editButton: {
    marginLeft: 10,
  },
  editInput: {
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
  },
  pickerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 40,
  },
  pickerButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
  },
  dateInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 40,
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    minHeight: 40,
  },
  timeCodeInput: {
    width: 80,
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
    textAlign: 'center',
  },
  removeVideoButton: {
    padding: 4,
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 10,
  },
  addMoreButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#FF4444',
    marginLeft: 8,
  },
  addPhotoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginBottom: 15,
  },
  addPhotoButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#FF4444',
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
    borderColor: '#FF4444',
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
  deleteButton: {
    backgroundColor: '#FF4444', // Красный цвет для удаления
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
  modalCancelButton: {
    marginTop: 20,
    paddingVertical: 15,
    backgroundColor: '#FF4444',
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
    color: '#FF4444',
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
    paddingVertical: 12,
    marginTop: 10,
    marginBottom: 15,
  },
  addTeamButtonText: {
    fontSize: 16,
    fontFamily: 'Gilroy-Regular',
    color: '#FF4444',
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
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  confirmButton: {
    backgroundColor: '#FF4444',
    borderColor: '#FF4444',
  },
  datePickerButtonText: {
    fontSize: 14,
    fontFamily: 'Gilroy-Bold',
    color: '#fff',
  },


}); 