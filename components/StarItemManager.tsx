import SafeIcon from './SafeIcon';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Image,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { loadCurrentUser } from '../utils/playerStorage';
import { supabase } from '../utils/supabase';
import { useLanguage } from '../contexts/LanguageContext';

interface Item {
  id: string;
  item_type: 'autograph' | 'stick' | 'puck' | 'jersey';
  name: string;
  description?: string;
  image_url: string;
  is_available: boolean;
  created_at: string;
}

interface StarItemManagerProps {
  playerId: string;
  isEditing?: boolean;
  onItemsUpdated?: () => void;
}

export default function StarItemManager({ playerId, isEditing = false, onItemsUpdated }: StarItemManagerProps) {
  const { t } = useLanguage();
  const router = useRouter();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadItems();
  }, [playerId]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('owner_id', playerId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading items:', error);
        return;
      }

      setItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadItems();
    setRefreshing(false);
  };

  const pickImage = async (itemType: 'autograph' | 'stick' | 'puck' | 'jersey', existingItemId?: string) => {
    try {
      // Проверяем авторизацию перед выбором изображения
      const currentUser = await loadCurrentUser();
      
      if (!currentUser) {
        // Редирект убран - проверка авторизации происходит в _layout.tsx
        return;
      }
      
      // Запрашиваем разрешение на доступ к галерее
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (permissionResult.granted === false) {
        Alert.alert('Permission Required', 'Permission to access camera roll is required!');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        
        if (result.assets[0].uri) {
          if (existingItemId) {
            // Редактируем существующий подарок
            await updateItemImage(existingItemId, result.assets[0].uri);
          } else {
            // Создаем новый подарок
            await uploadItem(result.assets[0].uri, itemType);
          }
        } else {
          Alert.alert('Error', 'Failed to get image URI');
        }
      } else {
        // Пользователь отменил выбор изображения
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const uploadItem = async (imageUri: string, itemType: 'autograph' | 'stick' | 'puck' | 'jersey') => {
    try {
      const currentUser = await loadCurrentUser();
      
      if (!currentUser) {
        Alert.alert('Error', 'User not found');
        return;
      }
      
      // Генерируем уникальное имя файла
      const fileName = `${itemType}_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      
      let uploadData: any;
      
      // Определяем тип URI и загружаем соответствующим способом
      if (imageUri.startsWith('file://') || imageUri.startsWith('content://')) {
        // Для локальных файлов используем FormData (как в аватарах!)
        
        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          type: 'image/jpeg',
          name: fileName,
        } as any);
        
        const { data, error: uploadError } = await supabase.storage
          .from('items')
          .upload(fileName, formData, {
            contentType: 'image/jpeg',
            upsert: true
          });
        
        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          Alert.alert('Error', 'Failed to upload image');
          return;
        }
        
        uploadData = data;
        
      } else {
        // Для других URI используем fetch + blob
        
          const response = await fetch(imageUri);
          if (!response.ok) {
          throw new Error('Failed to fetch image');
          }
          
          const blob = await response.blob();
          
          const { data, error: uploadError } = await supabase.storage
            .from('items')
            .upload(fileName, blob, {
              contentType: blob.type || 'image/jpeg',
              cacheControl: '3600'
            });
          
          if (uploadError) {
          console.error('Error uploading file:', uploadError);
          Alert.alert('Error', 'Failed to upload image');
          return;
          }
          
          uploadData = data;
      }

      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from('items')
        .getPublicUrl(uploadData.path);

             // Создаем запись в базе данных
               const itemData = {
          owner_id: playerId,
          item_type: itemType,
          name: getItemTypeName(itemType),
          description: `${getItemTypeName(itemType)} от игрока`,
          image_url: urlData.publicUrl,
        };
       
       const { error: insertError } = await supabase
         .from('items')
         .insert(itemData);

      if (insertError) {
        console.error('Error inserting item:', insertError);
        Alert.alert('Error', 'Failed to save item');
        return;
      }

      // Проверяем, что файл действительно доступен по URL
      try {
        const checkResponse = await fetch(urlData.publicUrl, { method: 'HEAD' });
        
        if (checkResponse.status !== 200) {
          console.warn('Warning: File may not be accessible yet');
        }
        
        // Дополнительная проверка - попробуем загрузить файл полностью
        const downloadResponse = await fetch(urlData.publicUrl);
        const downloadBlob = await downloadResponse.blob();
        
      } catch (checkError) {
        console.warn('Warning: Could not verify file accessibility:', checkError);
      }

      // Обновляем список
      await loadItems();
      onItemsUpdated?.();
      
      Alert.alert('Success', `${getItemTypeName(itemType)} added successfully!`);
    } catch (error) {
      console.error('Error uploading item:', error);
      Alert.alert('Error', 'Failed to upload item');
    }
  };

  const updateItemImage = async (itemId: string, imageUri: string) => {
    try {
      const currentUser = await loadCurrentUser();
      
      if (!currentUser) {
        Alert.alert('Error', 'User not found');
        return;
      }

      // Генерируем уникальное имя файла
      const fileName = `item_${itemId}_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`;
      
      let uploadData: any;
      
      // Определяем тип URI и загружаем соответствующим способом
      if (imageUri.startsWith('file://') || imageUri.startsWith('content://')) {
        // Для локальных файлов используем FormData
        
        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          type: 'image/jpeg',
          name: fileName,
        } as any);
        
        const { data, error: uploadError } = await supabase.storage
          .from('items')
          .upload(fileName, formData, {
            contentType: 'image/jpeg',
            upsert: true
          });
        
        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          Alert.alert('Error', 'Failed to upload image');
          return;
        }
        
        uploadData = data;
        
      } else {
        // Для других URI используем fetch + blob
        
        const response = await fetch(imageUri);
        if (!response.ok) {
          throw new Error('Failed to fetch image');
        }
        
        const blob = await response.blob();
        
        const { data, error: uploadError } = await supabase.storage
          .from('items')
          .upload(fileName, blob, {
            contentType: blob.type || 'image/jpeg',
            cacheControl: '3600'
          });
        
        if (uploadError) {
          console.error('Error uploading file:', uploadError);
          Alert.alert('Error', 'Failed to upload image');
          return;
        }
        
        uploadData = data;
      }

      // Получаем публичный URL
      const { data: urlData } = supabase.storage
        .from('items')
        .getPublicUrl(uploadData.path);

      // Обновляем запись в базе данных
      const { error: updateError } = await supabase
        .from('items')
        .update({ image_url: urlData.publicUrl })
        .eq('id', itemId);

      if (updateError) {
        console.error('Error updating item:', updateError);
        Alert.alert('Error', 'Failed to update item');
        return;
      }

      // Обновляем список
      await loadItems();
      onItemsUpdated?.();
      
      Alert.alert('Success', 'Item updated successfully!');
    } catch (error) {
      console.error('Error updating item:', error);
      Alert.alert('Error', 'Failed to update item');
    }
  };

  const deleteItem = async (itemId: string) => {
    Alert.alert(
      t('common.deleteConfirm'),
      'Are you sure you want to delete this item?',
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('items')
                .delete()
                .eq('id', itemId);

              if (error) {
                console.error('Error deleting item:', error);
                Alert.alert('Error', 'Failed to delete item');
                return;
              }

              // Обновляем список
              await loadItems();
              onItemsUpdated?.();
              
              Alert.alert('Success', 'Item deleted successfully!');
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Error', 'Failed to delete item');
            }
          }
        }
      ]
    );
  };

  const getItemTypeName = (itemType: 'autograph' | 'stick' | 'puck' | 'jersey'): string => {
    const names = {
      autograph: t('gifts.autograph'),
      stick: t('gifts.stick'),
      puck: t('gifts.puck'),
      jersey: t('gifts.jersey'),
    };
    return names[itemType];
  };

  const getItemIcon = (itemType: 'autograph' | 'stick' | 'puck' | 'jersey') => {
    const icons = {
      autograph: 'create-outline',
      stick: 'fitness-outline',
      puck: 'radio-button-on-outline',
      jersey: 'shirt-outline',
    };
    return icons[itemType];
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('gifts.myGifts')}</Text>
        <Text style={styles.emptyText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{t('gifts.myGifts')}</Text>
      
      <ScrollView 
        style={styles.itemsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        removeClippedSubviews={true}
        decelerationRate="fast"
      >
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>{t('gifts.noGifts')}</Text>
            <Text style={styles.emptySubtext}>{t('gifts.noGiftsSubtext')}</Text>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <Image source={{ uri: item.image_url }} style={styles.itemImage} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemDescription}>{item.description}</Text>
              </View>
              {isEditing && (
                <View style={styles.itemActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => pickImage(item.item_type, item.id)}
                  >
                    <Ionicons name="create-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => deleteItem(item.id)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>

      {isEditing && (
        <View style={styles.addButtonContainer}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              Alert.alert(
                t('gifts.selectGiftType'),
                t('gifts.selectGiftTypeMessage'),
                [
                  {
                    text: t('gifts.autograph'),
                    onPress: () => pickImage('autograph'),
                  },
                  {
                    text: t('gifts.stick'),
                    onPress: () => pickImage('stick'),
                  },
                  {
                    text: t('gifts.puck'),
                    onPress: () => pickImage('puck'),
                  },
                  {
                    text: t('gifts.jersey'),
                    onPress: () => pickImage('jersey'),
                  },
                  {
                    text: t('common.cancel'),
                    style: 'cancel',
                  },
                ]
              );
            }}
          >
            <Ionicons name="add" size={20} color="#fff" />
            <Text style={styles.addButtonText}>{t('gifts.addGift')}</Text>
          </TouchableOpacity>
        </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'rgba(1, 0, 0, 0.9)',
    borderRadius: 12,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 20,
    fontFamily: 'Gilroy-Bold',
    marginBottom: 20,
    textAlign: 'left',
    color: '#FF4444',
  },
  itemsList: { flex: 1 },
  emptyState: {
    alignItems: 'center',
    marginTop: 40,
  },
  emptyText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    textAlign: 'center',
    color: '#999',
    fontSize: 14,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 68, 68, 0.3)',
  },
  itemImage: {
    width: 50,
    height: 50,
    borderRadius: 6,
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 14,
    color: '#999',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#333',
    padding: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  deleteButton: {
    backgroundColor: '#333',
    padding: 6,
    borderRadius: 4,
  },
  addButtonContainer: {
    marginTop: 16,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff4444',
    padding: 16,
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
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});