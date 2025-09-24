import { Ionicons } from '@expo/vector-icons';
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
import { supabase } from '../utils/supabase';
import { useLanguage } from '../contexts/LanguageContext';

interface MuseumItem {
  id: string;
  item_id: string;
  item: {
    id: string;
    name: string;
    image_url: string;
    item_type: 'autograph' | 'stick' | 'puck' | 'jersey';
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
}

const { width } = Dimensions.get('window');

const PlayerMuseum: React.FC<PlayerMuseumProps> = ({ 
  playerId, 
  currentUserId, 
  isOwner = false, 
  isAdmin = false,
  isEditing = false
}) => {
  const { t } = useLanguage();
  const [museumItems, setMuseumItems] = useState<MuseumItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isStar, setIsStar] = useState(false);

  // Проверяем, что пользователь не является звездой
  // У звезд не должно быть музея, так как они не просят подарки у других
  useEffect(() => {
    const checkPlayerStatus = async () => {
      try {
        const { data: playerData, error } = await supabase
          .from('players')
          .select('status')
          .eq('id', playerId)
          .single();
        
        if (!error && playerData && playerData.status !== 'player') {
          // Если это не обычный игрок (звезда, тренер, скаут), не загружаем музей
          setIsStar(true);
          setLoading(false);
          return;
        }
        
        // Если это обычный игрок, загружаем музей
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
  }, [playerId]);


  const loadMuseumItems = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('player_museum')
        .select(`
          id,
          item_id,
          received_at,
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
        console.error('❌ Ошибка загрузки музея:', error);
        return;
      }

      if (data && data.length > 0) {
        // Проверяем доступность первого изображения
        if (data[0].item?.image_url) {
          await checkImageAvailability(data[0].item.image_url);
        }
      }

      setMuseumItems(data || []);
    } catch (error) {
      console.error('❌ Ошибка загрузки музея:', error);
    } finally {
      setLoading(false);
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMuseumItems();
    setRefreshing(false);
  };

  const deleteMuseumItem = async (museumItemId: string, itemId: string) => {
    try {
      // Удаляем запись из музея
      const { error: museumError } = await supabase
        .from('player_museum')
        .delete()
        .eq('id', museumItemId);

      if (museumError) {
        console.error('❌ Ошибка удаления из музея:', museumError);
        throw new Error('Не удалось удалить подарок из музея');
      }

      // Удаляем сам подарок из таблицы items
      const { error: itemError } = await supabase
        .from('items')
        .delete()
        .eq('id', itemId);

      if (itemError) {
        console.error('❌ Ошибка удаления подарка:', itemError);
        // Не прерываем выполнение, если подарок не удалился
      }
      
      // Обновляем локальное состояние
      setMuseumItems(prev => prev.filter(item => item.id !== museumItemId));
      
      Alert.alert(t('common.success'), t('gifts.successDeleted'));
    } catch (error) {
      console.error('❌ Ошибка удаления подарка:', error);
      Alert.alert(t('common.error'), t('gifts.errorDelete'));
    }
  };

  useEffect(() => {
    if (playerId) {
      // Добавляем небольшую задержку для стабильности
      const timer = setTimeout(() => {
        loadMuseumItems();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [playerId, isOwner, isAdmin, isEditing]);

  // Обновляем музей при фокусе на экране
  useFocusEffect(
    useCallback(() => {
      if (playerId) {
        loadMuseumItems();
      }
    }, [playerId, isOwner, isAdmin, isEditing])
  );

  // Проверяем, что playerId передан
  if (!playerId) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>Ошибка: ID игрока не указан</Text>
      </View>
    );
  }

  // Не показываем музей для звезд, тренеров, скаутов
  if (isStar) {
    return null;
  }

  if (loading) return <Text style={styles.loadingText}>{t('common.loading')}</Text>;
  
  // Не показываем музей, если нет подарков
  if (museumItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.title}>{t('profile.museum')}</Text>
      
      <ScrollView style={styles.scrollView} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={styles.gridContainer}>
          {museumItems.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              {item.item.image_url ? (
                <Image source={{ uri: item.item.image_url }} style={styles.itemImage} />
              ) : (
                <View style={styles.placeholderImage}>
                  <Text style={styles.placeholderText}>?</Text>
                </View>
              )}
              
              <Text style={styles.itemSource} numberOfLines={2}>
                {item.item.name} {t('gifts.from')} {item.received_from.name}
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
                    color={item.item.image_url ? "#FF4444" : "#FF8800"} 
                  />
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  section: {
    marginTop: 10,
    marginBottom: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 15,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  container: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontFamily: 'Gilroy-Bold',
    color: '#FF4444',
    marginBottom: 15,
  },
  scrollView: { 
    flex: 1 
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
    aspectRatio: 1,
    borderRadius: 12,
    marginBottom: 8,
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
    borderColor: '#FF4444',
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
  loadingText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  deleteButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    padding: 6,
    borderWidth: 1,
    borderColor: '#FF4444',
  },
  warningText: {
    fontSize: 12,
    color: '#FF8800',
    textAlign: 'center',
    marginTop: 5,
    fontFamily: 'Gilroy-Medium',
  },

  debugText: {
    fontSize: 10,
    color: '#999',
    textAlign: 'center',
    marginTop: 5,
  },
});

export default PlayerMuseum;
