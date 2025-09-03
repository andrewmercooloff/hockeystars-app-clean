import { Ionicons } from '@expo/vector-icons';
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
import { loadCurrentUser } from '../utils/playerStorage';
import { supabase } from '../utils/supabase';

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

      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error('Error loading items:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить предметы');
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
      console.log('Auth check before image pick:', { 
        hasUser: !!currentUser, 
        userId: currentUser?.id,
        playerId,
        existingItemId,
        isEditing: !!existingItemId
      });
      
      if (!currentUser) {
        // Убираем дублирующееся сообщение об ошибке - пользователь и так попадает на вход
        router.replace('/login');
        return;
      }
      
      // Проверяем, что текущий пользователь совпадает с playerId
      if (currentUser.id !== playerId) {
        Alert.alert('Ошибка прав доступа', 'Нет прав для загрузки предметов за другого пользователя');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        console.log('ImagePicker result:', {
          canceled: result.canceled,
          assetsCount: result.assets?.length,
          firstAsset: result.assets[0],
          uri: result.assets[0]?.uri,
          width: result.assets[0]?.width,
          height: result.assets[0]?.height,
          type: result.assets[0]?.type
        });
        
        if (result.assets[0].uri) {
          if (existingItemId) {
            // Редактируем существующий подарок
            await updateItemImage(existingItemId, result.assets[0].uri);
          } else {
            // Создаем новый подарок
            await uploadItem(result.assets[0].uri, itemType);
          }
        } else {
          Alert.alert('Ошибка', 'Не удалось получить URI изображения');
        }
      } else {
        console.log('ImagePicker canceled or no assets');
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать изображение');
    }
  };

  const uploadItem = async (imageUri: string, itemType: 'autograph' | 'stick' | 'puck' | 'jersey') => {
    try {
      setLoading(true);

      // Проверяем авторизацию через playerStorage
      const currentUser = await loadCurrentUser();
      if (!currentUser) {
        // Убираем дублирующееся сообщение об ошибке - пользователь и так попадает на вход
        router.replace('/login');
        return;
      }
      
      console.log('Current user ID:', currentUser.id);
      console.log('Player ID:', playerId);
      
      // Проверяем, что текущий пользователь совпадает с playerId
      if (currentUser.id !== playerId) {
        throw new Error('Нет прав для загрузки предметов за другого пользователя');
      }

      // Загружаем изображение в Supabase Storage
      const fileName = `${Date.now()}_${itemType}.jpg`;
      
      console.log('Image URI:', imageUri);
      console.log('URI type:', typeof imageUri);
      
      // Проверяем, что URI не пустой
      if (!imageUri || imageUri.trim() === '') {
        throw new Error('URI изображения пустой');
      }
      
      // Пробуем загрузить файл напрямую
      let uploadData;
      
      if (imageUri.startsWith('file://')) {
        // Для локальных файлов используем FormData (как в аватарах!)
        console.log('Using FormData for local file (like avatars)');
        
        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          type: 'image/jpeg',
          name: fileName,
        } as any);
        
        console.log('FormData created, attempting upload...');
        
        const { data, error } = await supabase.storage
          .from('items')
          .upload(fileName, formData, {
            contentType: 'image/jpeg',
            upsert: true
          });
        
        if (error) {
          console.error('FormData upload error:', error);
          throw new Error('Ошибка загрузки через FormData');
        }
        
        uploadData = data;
        console.log('FormData upload successful:', uploadData);
        
      } else {
        // Для других URI используем fetch + blob
        console.log('Using fetch + blob for remote file');
        
        try {
          const response = await fetch(imageUri);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const blob = await response.blob();
          console.log('Blob created, size:', blob.size, 'bytes, type:', blob.type);
          
          if (blob.size === 0) {
            throw new Error('Изображение пустое (0 байт)');
          }
          
          console.log('Attempting to upload to storage bucket "items"');
          const { data, error: uploadError } = await supabase.storage
            .from('items')
            .upload(fileName, blob, {
              contentType: blob.type || 'image/jpeg',
              cacheControl: '3600'
            });
          
          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw new Error('Ошибка загрузки изображения');
          }
          
          uploadData = data;
          console.log('File uploaded successfully:', uploadData);
          
        } catch (fetchError) {
          console.error('Fetch error:', fetchError);
          throw new Error(`Ошибка загрузки изображения: ${fetchError.message}`);
        }
      }

      // Получаем публичный URL используя uploadData
      const { data: urlData } = supabase.storage
        .from('items')
        .getPublicUrl(uploadData.path);
      
      console.log('Public URL generated:', urlData.publicUrl);

             // Создаем запись в базе данных
               const itemData = {
          owner_id: playerId,
          item_type: itemType,
          name: getItemTypeName(itemType),
          description: `${getItemTypeName(itemType)} от игрока`,
          image_url: urlData.publicUrl,
        };
       
       console.log('Attempting to insert into items table with:', itemData);
       
       const { error: insertError } = await supabase
         .from('items')
         .insert(itemData);

      // Проверяем, что файл действительно доступен по URL
      console.log('Verifying file accessibility...');
      try {
        const checkResponse = await fetch(urlData.publicUrl, { method: 'HEAD' });
        console.log('File accessibility check:', {
          url: urlData.publicUrl,
          status: checkResponse.status,
          contentLength: checkResponse.headers.get('content-length'),
          contentType: checkResponse.headers.get('content-type')
        });
        
        if (checkResponse.status !== 200) {
          console.warn('Warning: File may not be accessible yet');
        }
        
        // Дополнительная проверка - попробуем загрузить файл полностью
        console.log('Trying to download file completely...');
        const downloadResponse = await fetch(urlData.publicUrl);
        const downloadBlob = await downloadResponse.blob();
        console.log('Download check:', {
          status: downloadResponse.status,
          blobSize: downloadBlob.size,
          blobType: downloadBlob.type
        });
        
      } catch (checkError) {
        console.warn('Warning: Could not verify file accessibility:', checkError);
      }

      Alert.alert('Успех', `${getItemTypeName(itemType)} успешно загружен!`);
      loadItems();
      onItemsUpdated?.();
    } catch (error) {
      console.error('Error uploading item:', error);
      Alert.alert('Ошибка', 'Не удалось загрузить предмет');
    } finally {
      setLoading(false);
    }
  };

  const getItemTypeName = (type: string) => {
    const names = {
      autograph: 'Автограф',
      stick: 'Клюшка',
      puck: 'Шайба',
      jersey: 'Джерси',
    };
    return names[type as keyof typeof names] || type;
  };

  const updateItemImage = async (itemId: string, imageUri: string) => {
    try {
      setLoading(true);

      // Проверяем авторизацию
      const currentUser = await loadCurrentUser();
      if (!currentUser) {
        throw new Error('Пользователь не авторизован');
      }
      
      if (currentUser.id !== playerId) {
        throw new Error('Нет прав для редактирования предметов за другого пользователя');
      }

      // Находим существующий подарок
      const existingItem = items.find(item => item.id === itemId);
      if (!existingItem) {
        throw new Error('Подарок не найден');
      }

      // Загружаем новое изображение в Supabase Storage
      const fileName = `${Date.now()}_${existingItem.item_type}_updated.jpg`;
      
      let uploadData;
      
      if (imageUri.startsWith('file://')) {
        // Для локальных файлов используем FormData
        const formData = new FormData();
        formData.append('file', {
          uri: imageUri,
          type: 'image/jpeg',
          name: fileName,
        } as any);
        
        const { data, error } = await supabase.storage
          .from('items')
          .upload(fileName, formData, {
            contentType: 'image/jpeg',
            upsert: true
          });
        
        if (error) {
          throw new Error('Ошибка загрузки нового изображения');
        }
        
        uploadData = data;
      } else {
        // Для других URI используем fetch + blob
        const response = await fetch(imageUri);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const blob = await response.blob();
        if (blob.size === 0) {
          throw new Error('Изображение пустое (0 байт)');
        }
        
        const { data, error: uploadError } = await supabase.storage
          .from('items')
          .upload(fileName, blob, {
            contentType: blob.type || 'image/jpeg',
            cacheControl: '3600'
          });
        
        if (uploadError) {
          throw new Error('Ошибка загрузки нового изображения');
        }
        
        uploadData = data;
      }

      // Получаем публичный URL для нового изображения
      const { data: urlData } = supabase.storage
        .from('items')
        .getPublicUrl(uploadData.path);

      // Обновляем запись в базе данных
      const { error: updateError } = await supabase
        .from('items')
        .update({ image_url: urlData.publicUrl })
        .eq('id', itemId);

      if (updateError) {
        throw new Error('Ошибка обновления записи в базе данных');
      }

      Alert.alert('Успех', 'Изображение подарка обновлено!');
      
      // Обновляем локальное состояние
      setItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId 
            ? { ...item, image_url: urlData.publicUrl }
            : item
        )
      );
      
      onItemsUpdated?.();
    } catch (error) {
      console.error('Error updating item image:', error);
      Alert.alert('Ошибка', 'Не удалось обновить изображение подарка');
    } finally {
      setLoading(false);
    }
  };



  const showAddMenu = () => {
    const existingTypes = items.map(item => item.item_type);
    const availableTypes = [];
    
    if (!existingTypes.includes('autograph')) {
      availableTypes.push({ text: 'Автограф', onPress: () => pickImage('autograph') });
    }
    if (!existingTypes.includes('stick')) {
      availableTypes.push({ text: 'Клюшка', onPress: () => pickImage('stick') });
    }
    if (!existingTypes.includes('puck')) {
      availableTypes.push({ text: 'Шайба', onPress: () => pickImage('puck') });
    }
    if (!existingTypes.includes('jersey')) {
      availableTypes.push({ text: 'Джерси', onPress: () => pickImage('jersey') });
    }
    
    if (availableTypes.length === 0) {
      Alert.alert('Все подарки добавлены', 'У вас уже есть все типы подарков');
      return;
    }
    
    availableTypes.push({ text: 'Отмена', style: 'cancel' });
    
    Alert.alert(
      'Добавить подарок',
      'Выберите тип подарка',
      availableTypes
    );
  };

  const deleteItem = async (itemId: string) => {
    Alert.alert(
      'Удаление',
      'Удалить подарок?',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Удалить',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('items')
                .delete()
                .eq('id', itemId);

              if (error) throw error;

              setItems(items.filter(item => item.id !== itemId));
              onItemsUpdated?.();
              Alert.alert('Успех', 'Подарок удален');
            } catch (error) {
              console.error('Error deleting item:', error);
              Alert.alert('Ошибка', 'Не удалось удалить подарок');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Подарки</Text>
      
      <ScrollView style={styles.itemsList} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        {items.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Нет подарков</Text>
            <Text style={styles.emptySubtext}>Нажмите + чтобы добавить</Text>
          </View>
        ) : (
          items.map((item) => (
            <View key={item.id} style={styles.itemCard}>
              <Image source={{ uri: item.image_url }} style={styles.itemImage} />
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.name}</Text>
              </View>
              {isEditing && (
                <View style={styles.itemActions}>
                  <TouchableOpacity style={styles.editButton} onPress={() => pickImage(item.item_type, item.id)}>
                    <Ionicons name="create-outline" size={16} color="#ff4444" />
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => deleteItem(item.id)}>
                    <Ionicons name="trash" size={16} color="white" />
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ))
        )}
        
        {isEditing && items.length < 4 && (
          <TouchableOpacity style={styles.addButton} onPress={() => showAddMenu()}>
            <Ionicons name="add" size={24} color="#fff" />
            <Text style={styles.addButtonText}>Добавить подарок</Text>
          </TouchableOpacity>
        )}
          </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
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
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ff4444',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
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
