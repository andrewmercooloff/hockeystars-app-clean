import { useFocusEffect } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { supabase } from '../utils/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CachedImage from './CachedImage';

interface MuseumItem {
  id: string;
  item_id: string;
  custom_name?: string; // Кастомное название подарка (например, "Zamboni от Админ")
  item: {
    id: string;
    name: string;
    image_url: string;
    item_type: 'autograph' | 'stick' | 'puck' | 'jersey' | 'custom';
    created_at: string;
  };
  received_from: {
    id: string;
    name: string;
  };
  received_at: string;
}

interface PlayerMuseumProps {
  playerId: string;
  currentUserId?: string; // ID текущего пользователя для проверки прав
  isOwner?: boolean; // Является ли текущий пользователь владельцем профиля
  isAdmin?: boolean; // Является ли текущий пользователь администратором
  isEditing?: boolean; // Режим редактирования профиля
  onMuseumUpdated?: () => void; // Callback для обновления родительского компонента
  cachedMuseumItems?: MuseumItem[]; // Кешированные данные музея для мгновенного отображения
  onMuseumItemsLoaded?: (items: MuseumItem[]) => void; // Callback для сохранения загруженных данных в кеш
  updateTrigger?: number; // Триггер для принудительного обновления музея
  playerName?: string; // Имя игрока для отображения в сообщении о пустом музее
}

const { width } = Dimensions.get('window');

const PlayerMuseum: React.FC<PlayerMuseumProps> = ({ 
  playerId, 
  currentUserId, 
  isOwner = false, 
  isAdmin = false,
  isEditing = false,
  onMuseumUpdated,
  cachedMuseumItems,
  onMuseumItemsLoaded,
  updateTrigger,
  playerName
}) => {
  // console.log('🎁 МУЗЕЙ: PROPS:', { playerId, isOwner, isAdmin, isEditing });
  
  const { t } = useLanguage();
  const router = useRouter();
  const [museumItems, setMuseumItems] = useState<MuseumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isStar, setIsStar] = useState(false);

  // Функция для очистки кеша музея
  const clearMuseumCache = async () => {
    try {
      const cacheKey = `museum_${playerId}`;
      await AsyncStorage.removeItem(cacheKey);
      console.log(`🗑️ Кеш музея игрока ${playerId} очищен`);
    } catch (error) {
      console.error('❌ Ошибка очистки кеша музея:', error);
    }
  };

  // Функция для перевода названий призов
  const translateItemName = (itemName: string, itemType?: string): string => {
    // Если это подарок от администратора, не переводим название
    if (itemName.includes('от Админ')) {
      return itemName;
    }
    
    // Пытаемся определить тип по названию или использовать переданный тип
    const type = itemType || itemName.toLowerCase();
    
    if (type.includes('автограф') || type === 'autograph') {
      return t('gifts.autograph');
    } else if (type.includes('клюшка') || type === 'stick') {
      return t('gifts.stick');
    } else if (type.includes('шайба') || type === 'puck') {
      return t('gifts.puck');
    } else if (type.includes('джерси') || type.includes('майка') || type === 'jersey') {
      return t('gifts.jersey');
    }
    
    return itemName; // Возвращаем оригинальное название, если не смогли определить
  };

  // Функция для парсинга custom_name и извлечения названия подарка
  // Возвращает только название подарка без предлога и имени дарителя
  const parseGiftName = (customName: string): string => {
    if (!customName) return '';
    
    let giftName = customName;
    
    // Убираем "от Админ" или "от Admin" в конце
    giftName = giftName.replace(/\s*от\s+Админ\s*$/i, '');
    giftName = giftName.replace(/\s*от\s+Admin\s*$/i, '');
    
    // Убираем "from Админ" или "from Admin" в конце
    giftName = giftName.replace(/\s*from\s+Админ\s*$/i, '');
    giftName = giftName.replace(/\s*from\s+Admin\s*$/i, '');
    
    // Убираем просто "Админ" или "Admin" в конце (без предлога)
    giftName = giftName.replace(/\s+Админ\s*$/i, '');
    giftName = giftName.replace(/\s+Admin\s*$/i, '');
    
    // Убираем "от [любое имя]" в конце (может быть несколько слов в имени)
    // Используем более точное регулярное выражение для захвата всего имени
    giftName = giftName.replace(/\s+от\s+.+$/i, '');
    
    // Убираем "from [любое имя]" в конце (может быть несколько слов в имени)
    giftName = giftName.replace(/\s+from\s+.+$/i, '');
    
    return giftName.trim();
  };

  // Функция для навигации к профилю звезды
  const navigateToStarProfile = (starId: string) => {
    router.push(`/player/${starId}`);
  };

  // Проверяем, что пользователь не является звездой
  // У звезд не должно быть музея, так как они не просят подарки у других
  useEffect(() => {
    // Если есть кешированные данные, используем их мгновенно и НЕ загружаем заново
    if (cachedMuseumItems !== undefined && cachedMuseumItems !== null) {
      setMuseumItems(cachedMuseumItems);
      setLoading(false);
      // НЕ устанавливаем isStar здесь, так как это может скрыть музей
      
      // Предзагружаем изображения из кешированных данных
      if (cachedMuseumItems.length > 0) {
        cachedMuseumItems.forEach((item) => {
          if (item.item?.image_url) {
            // Предзагружаем изображение для кеширования
            Image.prefetch(item.item.image_url).catch(() => {
              // Игнорируем ошибки предзагрузки
            });
          }
        });
      }
      
      return; // Выходим, не загружаем данные заново
    }

    const checkPlayerStatus = async () => {
      try {
        const { data: playerData, error } = await supabase
          .from('players')
          .select('status')
          .eq('id', playerId)
          .single();
        
        // Музей НЕ показываем только для звёзд (они раздают подарки, а не получают)
        // Для обычных игроков, тренеров, скаутов - показываем
        if (!error && playerData && playerData.status === 'star') {
          setIsStar(true);
          setLoading(false);
          return;
        }
        
        // Для всех остальных загружаем музей
        setIsStar(false);
        loadMuseumItems();
      } catch (error) {
        console.error('❌ Ошибка проверки статуса игрока:', error);
        // В случае ошибки все равно загружаем музей
        setIsStar(false);
        loadMuseumItems();
      }
    };
    
    checkPlayerStatus();
  }, [playerId, cachedMuseumItems, updateTrigger]);

  // Realtime подписка на новые подарки в музее
  useEffect(() => {
    if (!playerId) return;

    const channel = supabase
      .channel(`museum-${playerId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'player_museum_items',
          filter: `player_id=eq.${playerId}`
        },
        (payload) => {
          console.log('🎁 МУЗЕЙ: Новый подарок получен (realtime):', payload.new);
          // Очищаем кеш и перезагружаем
          clearMuseumCache();
          loadMuseumItemsForce();
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'player_museum_items',
          filter: `player_id=eq.${playerId}`
        },
        () => {
          console.log('🎁 МУЗЕЙ: Подарок удален (realtime)');
          clearMuseumCache();
          loadMuseumItemsForce();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId]);

  // Функция загрузки без кэша (для realtime обновлений)
  const loadMuseumItemsForce = async () => {
    try {
      const { data, error } = await supabase
        .from('player_museum_items')
        .select(`
          id,
          item_id,
          custom_name,
          item:shop_items(id, name, image_url, item_type, created_at),
          received_from:players!player_museum_items_from_player_id_fkey(id, name),
          received_at
        `)
        .eq('player_id', playerId)
        .order('received_at', { ascending: false });

      if (error) {
        console.error('❌ Ошибка загрузки музея:', error);
        return;
      }

      const validItems = (data || []).filter(item => item.item !== null) as MuseumItem[];
      setMuseumItems(validItems);
      
      // Обновляем кеш
      const cacheKey = `museum_${playerId}`;
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        items: validItems,
        timestamp: Date.now()
      }));
      
      if (onMuseumItemsLoaded) {
        onMuseumItemsLoaded(validItems);
      }
    } catch (error) {
      console.error('❌ Ошибка загрузки музея:', error);
    }
  };

  const loadMuseumItems = async () => {
    // console.log('🎁 МУЗЕЙ: ===== loadMuseumItems ВЫЗВАН =====');
    // console.log('🎁 МУЗЕЙ: playerId:', playerId);
    
    try {
      // Кешируем результат на 10 минут для улучшения производительности
      const cacheKey = `museum_${playerId}`;
      const cacheTime = 10 * 60 * 1000; // 10 минут
      
      // Проверяем кэш
      // console.log('🎁 МУЗЕЙ: Проверяем AsyncStorage кеш...');
      const cachedData = await AsyncStorage.getItem(cacheKey);
      
      if (cachedData) {
        const { items, timestamp } = JSON.parse(cachedData);
        const age = Date.now() - timestamp;
        // console.log('🎁 МУЗЕЙ: Найден кеш в AsyncStorage. Возраст:', Math.round(age / 1000), 'сек, items:', items.length);
        
        if (Date.now() - timestamp < cacheTime) {
          // console.log('🎁 МУЗЕЙ: ✅ Используем кеш из AsyncStorage');
          setMuseumItems(items);
          setLoading(false);
          return;
        } else {
          // console.log('🎁 МУЗЕЙ: ⚠️ Кеш устарел, загружаем из Supabase');
        }
      } else {
        // console.log('🎁 МУЗЕЙ: Кеш в AsyncStorage не найден');
      }
      
      // Если кеш не найден или истек, показываем загрузку
      setLoading(true);
      // console.log('🎁 МУЗЕЙ: Loading = true, запрашиваем данные из Supabase...');
      
      const { data, error } = await supabase
        .from('player_museum')
        .select(`
          id,
          item_id,
          received_at,
          custom_name,
          item:items (
            id,
            name,
            image_url,
            item_type,
            created_at
          ),
          received_from:players!player_museum_received_from_fkey (
            id,
            name
          )
        `)
        .eq('player_id', playerId)
        .order('received_at', { ascending: false });

      if (error) {
        console.error('🎁 МУЗЕЙ: ❌ Ошибка загрузки музея:', error);
        return;
      }

      // console.log('🎁 МУЗЕЙ: ✅ Данные получены из Supabase. Количество подарков:', data?.length || 0);
      
      // Сразу устанавливаем данные для быстрого отображения
      setMuseumItems(data || []);
      // console.log('🎁 МУЗЕЙ: setMuseumItems вызван с', data?.length || 0, 'подарками');
      
      // Предзагружаем изображения для кеширования
      if (data && data.length > 0) {
        data.forEach((item) => {
          if (item.item?.image_url) {
            // Предзагружаем изображение для кеширования
            Image.prefetch(item.item.image_url).catch(() => {
              // Игнорируем ошибки предзагрузки
            });
          }
        });
      }
      
      // Сохраняем данные в кеш состояния через callback
      if (onMuseumItemsLoaded && data) {
        onMuseumItemsLoaded(data);
      }
      
      // Проверку изображений делаем в фоне (не блокируем отображение)
      // Убираем проверку изображений для ускорения загрузки
      // if (data && data.length > 0 && data[0].item?.image_url) {
      //   checkImageAvailability(data[0].item.image_url).catch(err => 
      //     console.warn('Ошибка проверки изображения:', err)
      //   );
      // }
      
      // Кешируем результат
      await AsyncStorage.setItem(cacheKey, JSON.stringify({
        items: data || [],
        timestamp: Date.now()
      }));
    } catch (error) {
      console.error('Ошибка загрузки музея:', error);
    } finally {
      // console.log('🎁 МУЗЕЙ: Загрузка музея завершена');
      setLoading(false);
    }
  };

  // Функция для удаления подарка из музея игрока
  const deleteMuseumItem = async (museumItemId: string, itemId: string) => {
    // console.log('🗑️ МУЗЕЙ: Начало удаления подарка');
    // console.log('🗑️ МУЗЕЙ: museumItemId:', museumItemId);
    // console.log('🗑️ МУЗЕЙ: itemId:', itemId);
    // console.log('🗑️ МУЗЕЙ: playerId:', playerId);
    // console.log('🗑️ МУЗЕЙ: currentUserId:', currentUserId);
    
    // Проверяем аутентификацию через Supabase Auth
    const { data: sessionData } = await supabase.auth.getSession();
    // console.log('🗑️ МУЗЕЙ: Supabase session:', sessionData.session ? 'ЕСТЬ' : 'НЕТ');
    // console.log('🗑️ МУЗЕЙ: Supabase auth.uid:', sessionData.session?.user?.id || 'НЕТ');
    
    if (!sessionData.session) {
      console.error('🗑️ МУЗЕЙ: ❌ Пользователь НЕ аутентифицирован через Supabase Auth!');
      // console.log('🗑️ МУЗЕЙ: Это объясняет, почему RLS блокирует удаление');
    }
    
    try {
      // Используем серверную функцию для удаления (обходит RLS)
      // console.log('🗑️ МУЗЕЙ: Вызываем серверную функцию delete_museum_item_by_user...');
      // console.log('🗑️ МУЗЕЙ: - museum_item_id:', museumItemId);
      // console.log('🗑️ МУЗЕЙ: - requesting_user_id:', currentUserId);
      
      const { data, error } = await supabase
        .rpc('delete_museum_item_by_user', {
          museum_item_id: museumItemId,
          requesting_user_id: currentUserId
        });

      // console.log('🗑️ МУЗЕЙ: Результат RPC вызова:');
      // console.log('🗑️ МУЗЕЙ: - data:', data);
      // console.log('🗑️ МУЗЕЙ: - error:', error);

      if (error) {
        console.error('🗑️ МУЗЕЙ: ❌ Ошибка удаления подарка:', error);
        
        if (error.message.includes('Permission denied')) {
          Alert.alert(t('common.error') || 'Ошибка', t('gifts.errorPermissionDenied'));
        } else if (error.message.includes('not found')) {
          Alert.alert(t('common.error') || 'Ошибка', t('gifts.errorGiftNotFound'));
        } else {
          Alert.alert(t('common.error') || 'Ошибка', `${t('gifts.errorDelete')}: ${error.message}`);
        }
        return;
      }

      if (!data) {
        console.error('🗑️ МУЗЕЙ: ❌ Функция вернула FALSE - удаление не выполнено');
        Alert.alert(t('common.error') || 'Ошибка', t('gifts.errorGiftNotDeleted'));
        return;
      }

      // console.log('🗑️ МУЗЕЙ: ✅ Подарок успешно удален через серверную функцию');
      // console.log('🗑️ МУЗЕЙ: Обновляем локальное состояние...');

      // Обновляем локальное состояние
      const newItems = museumItems.filter(item => item.id !== museumItemId);
      // console.log('🗑️ МУЗЕЙ: Было подарков:', museumItems.length, '-> Осталось:', newItems.length);
      setMuseumItems(newItems);

      // Сразу обновляем кеш состояния в родительском компоненте с новыми данными
      if (onMuseumItemsLoaded) {
        // console.log('🗑️ МУЗЕЙ: Обновляем кеш состояния с новыми данными');
        onMuseumItemsLoaded(newItems);
      }

      // console.log('🗑️ МУЗЕЙ: Очищаем AsyncStorage кеш...');
      
      // Очищаем AsyncStorage кеш
      await clearMuseumCache();

      // console.log('🗑️ МУЗЕЙ: НЕ вызываем onMuseumUpdated() - используем локальное состояние');
      
      // НЕ вызываем onMuseumUpdated() - мы уже обновили данные через onMuseumItemsLoaded
      // Это предотвращает множественные перезагрузки и race condition
      
      // console.log('🗑️ МУЗЕЙ: ✅ Подарок успешно удален');
      Alert.alert(t('common.success') || 'Успешно', t('gifts.successDeleted'));
    } catch (error) {
      console.error('🗑️ МУЗЕЙ: ❌❌❌ КРИТИЧЕСКАЯ ОШИБКА удаления подарка:', error);
      Alert.alert(t('common.error') || 'Ошибка', t('gifts.errorDelete'));
    }
  };

  // Функция для кеширования изображений в AsyncStorage
  const cacheImageInStorage = async (imageUrl: string, itemName: string) => {
    try {
      const cacheKey = `image_cache_${imageUrl.split('/').pop()}`;
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      
      // Проверяем, есть ли уже кешированное изображение
      const cachedImage = await AsyncStorage.getItem(cacheKey);
      if (cachedImage) {
        console.log('🎁 КЕШ СТОРАДЖ: Изображение уже закешировано:', itemName);
        return cachedImage;
      }
      
      // Если нет, загружаем и кешируем
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const base64 = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      
      // Сохраняем в кеш на 24 часа
      await AsyncStorage.setItem(cacheKey, base64 as string);
      console.log('🎁 КЕШ СТОРАДЖ: Изображение закешировано:', itemName);
      
      return base64;
    } catch (error) {
      console.log('🎁 КЕШ СТОРАДЖ: Ошибка кеширования:', itemName, error);
      return imageUrl; // Возвращаем оригинальный URL при ошибке
    }
  };

  const checkImageAvailability = async (imageUrl: string) => {
    try {
      const response = await fetch(imageUrl, { method: 'HEAD' });
      return response.ok;
    } catch (error) {
      return false;
    }
  };

  // Обновление при фокусе на экране
  // Упрощенная логика загрузки - загружаем только один раз
  useEffect(() => {
    if (playerId && !isStar) {
      // console.log('🎁 МУЗЕЙ: useEffect вызван для', playerId, 'cachedMuseumItems:', cachedMuseumItems?.length || 'undefined');
      
      // Если есть кешированные данные, используем их
      if (cachedMuseumItems && Array.isArray(cachedMuseumItems)) {
        // console.log('🎁 МУЗЕЙ: Используем кешированные данные');
        setMuseumItems(cachedMuseumItems);
        setLoading(false);
        return;
      }
      
      // Иначе загружаем из базы данных
      // console.log('🎁 МУЗЕЙ: Загружаем данные из Supabase');
      loadMuseumItems();
    }
  }, [playerId, isStar, cachedMuseumItems]);

  // Проверяем, что playerId передан
  if (!playerId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Ошибка: ID игрока не указан</Text>
      </View>
    );
  }

  // Не показываем музей для звезд, тренеров, скаутов (только если это точно установлено)
  // НО если есть подарки в музее, показываем их в любом случае
  if (isStar && museumItems.length === 0) {
    return null;
  }

  if (loading) return <Text style={styles.loadingText}>{t('common.loading')}</Text>;
  
  // Если нет подарков, показываем сообщение
  if (museumItems.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="gift-outline" size={48} color="#666" />
        <Text style={styles.emptyText}>
          {t('profile.museumEmpty', { playerName: playerName || t('profile.player') })}
        </Text>
      </View>
    );
  }

  return (
    <>
      <View style={styles.gridContainer}>
        {museumItems.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              {item.item.image_url ? (
                <>
                  <CachedImage
                    imageUrl={item.item.image_url}
                    style={[
                      styles.itemImage,
                      // Для PNG изображений убираем фон и добавляем поддержку прозрачности
                      item.item.image_url.toLowerCase().includes('.png') && styles.pngImage
                    ]}
                    resizeMode="contain"
                  />
                </>
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={styles.placeholderText}>?</Text>
                </View>
              )}
              
              <Text style={styles.itemSource} numberOfLines={2}>
                {/* Унифицированный формат: "Название подарка" от "Имя дарителя" */}
                {(() => {
                  let giftName = '';
                  
                  if (item.custom_name) {
                    // Если есть custom_name - парсим его, убирая предлоги и имена
                    giftName = parseGiftName(item.custom_name);
                  } else if (item.item.name.includes('от Админ')) {
                    // Для старых административных подарков убираем "от Админ" из названия
                    giftName = item.item.name.replace(' от Админ', '').trim();
                  } else {
                    // Для старых обычных подарков используем переведенное название
                    giftName = translateItemName(item.item.name, item.item.item_type);
                  }
                  
                  // Если после парсинга название пустое, используем название из item
                  if (!giftName) {
                    giftName = translateItemName(item.item.name, item.item.item_type);
                  }
                  
                  return (
                    <>
                      {giftName} {t('gifts.from')}{' '}
                      <Text 
                        style={styles.starNameLink}
                        onPress={() => navigateToStarProfile(item.received_from.id)}
                      >
                        {item.received_from.name}
                      </Text>
                    </>
                  );
                })()}
              </Text>
              
              {!item.item.image_url && (
                <Text style={styles.warningText}>
                  ⚠️ {t('gifts.invalidGift')} ({t('gifts.noImage')})
                </Text>
              )}
              
              {(isOwner || isAdmin) && isEditing && (
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={() => {
                    const itemName = item.item.image_url ? t('gifts.gifts') : t('gifts.invalidGift');
                    Alert.alert(
                      t('common.deleteConfirm'),
                      t('gifts.deleteGiftQuestion'),
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('common.delete'),
                          style: 'destructive',
                          onPress: () => deleteMuseumItem(item.id, item.item.id)
                        }
                      ]
                    );
                  }}
                >
                  <Ionicons 
                    name="trash-outline" 
                    size={16} 
                    color={item.item.image_url ? "#fa2f40" : "#FF8800"} 
                  />
                </TouchableOpacity>
              )}
            </View>
          ))}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  title: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#fa2f40',
    marginBottom: 15,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  itemCard: {
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative', // Для позиционирования кнопки удаления
    width: '48%',
  },
  itemImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
    resizeMode: 'contain',
    borderWidth: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  pngImage: {
    // Для PNG изображений убираем фон и тени, чтобы показать прозрачность
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
  },
  placeholderImage: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#FF8800',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#fa2f40',
    borderStyle: 'dashed',
  },
  placeholderText: {
    fontSize: 48,
    color: '#666',
  },
  itemSource: {
    fontSize: 14,
    fontFamily: 'Gilroy-Regular',
    color: '#fff',
    textAlign: 'center',
  },
  starNameLink: {
    color: '#FF6666', // Слегка красноватый оттенок для ссылки
    fontFamily: 'Gilroy-Bold',
  },
  loadingText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 6,
    minHeight: 100,
  },
  emptyText: {
    fontSize: 16,
    color: '#888',
    fontFamily: 'Gilroy-Regular',
    textAlign: 'center',
    marginTop: 16,
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(1, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: '#fa2f40',
  },
  warningText: {
    fontSize: 12,
    color: '#FF8800',
    textAlign: 'center',
    marginTop: 5,
    fontFamily: 'Gilroy-Bold',
  },

  debugText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
});

export default PlayerMuseum;
