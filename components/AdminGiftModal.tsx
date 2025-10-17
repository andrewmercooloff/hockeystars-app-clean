import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Image,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../utils/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { Player } from '../utils/playerStorage';

interface AdminGiftModalProps {
  visible: boolean;
  onClose: () => void;
  onGiftSent: () => void;
  adminId: string;
  playerId: string;
  playerName: string;
  updateNotificationCount?: (user?: Player | null) => Promise<void>;
}

interface AdminItem {
  id: string;
  item_type: 'autograph' | 'stick' | 'puck' | 'jersey' | 'custom';
  name: string;
  description?: string;
  image_url: string;
  created_at: string;
}

const AdminGiftModal: React.FC<AdminGiftModalProps> = ({
  visible,
  onClose,
  onGiftSent,
  adminId,
  playerId,
  playerName,
  updateNotificationCount
}) => {
  const { t } = useLanguage();
  const [adminItems, setAdminItems] = useState<AdminItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<AdminItem | null>(null);
  const [customGiftName, setCustomGiftName] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (visible) {
      loadAdminItems();
    }
  }, [visible, adminId]);

  const loadAdminItems = async () => {
    try {
      console.log('🔄 ADMIN: Загрузка подарков для админа:', adminId);
      setLoadingItems(true);
      const { data, error } = await supabase
        .from('items')
        .select('*')
        .eq('owner_id', adminId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ ADMIN: Ошибка загрузки подарков админа:', error);
        return;
      }

      console.log('✅ ADMIN: Получено подарков из БД:', data?.length || 0);
      setAdminItems(data || []);
      console.log('✅ ADMIN: State обновлен, setAdminItems вызван');
    } catch (error) {
      console.error('❌ ADMIN: Ошибка загрузки подарков админа:', error);
    } finally {
      setLoadingItems(false);
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Ошибка', 'Нет доступа к галерее');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: false,
        quality: 0.8,
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Ошибка выбора изображения:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать изображение');
    }
  };

  const uploadGiftImageToStorage = async (imageUri: string, fileName: string): Promise<string> => {
    try {
      // Сначала уменьшаем изображение до 600px по большей стороне, сохраняя PNG
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        imageUri,
        [{ resize: { width: 600 } }], // Уменьшаем до 600px по ширине
        {
          compress: 1.0, // Без сжатия для PNG
          format: ImageManipulator.SaveFormat.PNG, // Сохраняем как PNG для прозрачности
        }
      );

      // Читаем файл как ArrayBuffer для React Native
      const response = await fetch(manipulatedImage.uri);
      const arrayBuffer = await response.arrayBuffer();
      
      const fileExt = 'png'; // Всегда PNG для подарков
      const filePath = `gifts/${Date.now()}.${fileExt}`;
      
      // Создаем Uint8Array из ArrayBuffer
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, uint8Array, {
          contentType: 'image/png',
          upsert: false
        });

      if (error) {
        console.error('Ошибка загрузки изображения:', error);
        throw error;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error) {
      console.error('Ошибка загрузки изображения подарка:', error);
      throw error;
    }
  };

  const sendGift = async () => {
    console.log('🎁 ADMIN: Начало отправки подарка');
    console.log('🎁 ADMIN: playerId:', playerId);
    console.log('🎁 ADMIN: playerName:', playerName);
    console.log('🎁 ADMIN: selectedItem:', selectedItem?.id, selectedItem?.name);
    console.log('🎁 ADMIN: customGiftName:', customGiftName);
    
    if (!selectedItem && !customGiftName.trim()) {
      console.log('🎁 ADMIN: ❌ Нет подарка для отправки');
      Alert.alert(t('common.error') || 'Ошибка', t('gifts.errorSelectOrCreate'));
      return;
    }

    try {
      setLoading(true);
      console.log('🎁 ADMIN: Loading = true');
      
      let itemToSend: AdminItem;
      
      if (selectedItem) {
        // Используем существующий подарок
        console.log('🎁 ADMIN: Используем существующий подарок:', selectedItem.id);
        itemToSend = selectedItem;
      } else {
        // Создаем новый подарок
        console.log('🎁 ADMIN: Создаем новый подарок');
        let imageUrl = null;
        
        if (imageUri) {
          console.log('🎁 ADMIN: Загружаем изображение...');
          imageUrl = await uploadGiftImageToStorage(imageUri, `custom_gift_${Date.now()}.png`);
          console.log('🎁 ADMIN: Изображение загружено:', imageUrl);
        }

        const { data: newItem, error: createError } = await supabase
          .from('items')
          .insert([{
            owner_id: adminId,
            item_type: 'custom',
            name: customGiftName.trim(),
            description: `Подарок от администратора`,
            image_url: imageUrl
          }])
          .select()
          .single();

        if (createError) {
          console.error('🎁 ADMIN: ❌ Ошибка создания подарка:', createError);
          throw createError;
        }

        console.log('🎁 ADMIN: ✅ Новый подарок создан:', newItem.id);
        itemToSend = newItem;
      }

      console.log('🎁 ADMIN: Проверяем дубликаты для item_id:', itemToSend.id);
      console.log('🎁 ADMIN: playerId:', playerId);
      
      // Проверяем, есть ли уже этот подарок у игрока
      const { data: existingGift, error: checkError } = await supabase
        .from('player_museum')
        .select('id, item_id, received_at')
        .eq('player_id', playerId)
        .eq('item_id', itemToSend.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('🎁 ADMIN: ❌ Ошибка проверки дубликатов:', checkError);
      }

      console.log('🎁 ADMIN: Результат проверки дубликатов:', existingGift ? 'НАЙДЕН' : 'НЕ НАЙДЕН');
      
      if (existingGift) {
        console.log('🎁 ADMIN: ⚠️ Найденный подарок:', existingGift);
        console.log('🎁 ADMIN: museum_id:', existingGift.id);
        console.log('🎁 ADMIN: received_at:', existingGift.received_at);
        
        // Проверяем, действительно ли этот подарок существует в базе
        // Возможно, это кеш или race condition
        console.log('🎁 ADMIN: Делаем повторную проверку...');
        
        const { data: doubleCheck, error: doubleCheckError } = await supabase
          .from('player_museum')
          .select('id')
          .eq('id', existingGift.id)
          .maybeSingle();
        
        console.log('🎁 ADMIN: Результат повторной проверки:', doubleCheck ? 'ПОДТВЕРЖДЕНО' : 'НЕ НАЙДЕНО');
        
        if (!doubleCheck) {
          console.log('🎁 ADMIN: ✅ Подарок был удален, продолжаем отправку');
          // Подарок был удален, можно продолжить
        } else {
          console.log('🎁 ADMIN: ❌ Подарок действительно есть у игрока, отменяем отправку');
          Alert.alert(
            t('common.error') || 'Ошибка', 
            t('gifts.errorGiftAlreadyExists', { playerName })
          );
          setLoading(false);
          return;
        }
      }

      console.log('🎁 ADMIN: Добавляем подарок в музей игрока...');
      
      // Добавляем подарок в музей игрока (используем ссылку на подарок, не копируем)
      const { error: museumError } = await supabase
        .from('player_museum')
        .insert([{
          player_id: playerId,
          item_id: itemToSend.id,
          received_from: adminId,
          custom_name: `${selectedItem ? itemToSend.name : customGiftName.trim()} ${t('gifts.fromAdmin')}`
        }]);

      if (museumError) {
        console.error('🎁 ADMIN: ❌ Ошибка добавления в музей:', museumError);
        throw museumError;
      }

      console.log('🎁 ADMIN: ✅ Подарок успешно добавлен в музей');

      // Отправляем уведомления
      try {
        const { sendGiftNotification } = await import('../utils/playerStorage');
        await sendGiftNotification(
          playerId,
          playerName,
          t('gifts.fromAdmin') || 'Admin',
          itemToSend.name,
          {
            giftReceived: t('gifts.giftReceived') || 'Подарок получен!',
            giftReceivedMessage: t('gifts.giftReceivedFromAdmin', { giftName: itemToSend.name }) || `Вы получили подарок от администратора: ${itemToSend.name}`,
            giftReceivedPushTitle: t('gifts.giftReceivedPush') || '🎁 Подарок получен!',
            giftReceivedPushBody: t('gifts.giftReceivedFromAdminPush', { giftName: itemToSend.name }) || `Вы получили подарок от администратора: ${itemToSend.name}`
          },
          adminId // Передаем ID админа, чтобы не отправлять уведомление самому себе
        );
        
        console.log('🎁 ADMIN: ✅ Уведомления отправлены');
      } catch (notificationError) {
        console.error('🎁 ADMIN: ⚠️ Ошибка отправки уведомлений:', notificationError);
      }

      console.log('🎁 ADMIN: ✅ Все операции завершены успешно');
      console.log('🎁 ADMIN: Очищаем форму и закрываем модальное окно');

      // Очищаем форму
      setSelectedItem(null);
      setCustomGiftName('');
      setImageUri(null);
      
      console.log('🎁 ADMIN: Вызываем onGiftSent() для обновления родительского компонента');
      onGiftSent();
      
      console.log('🎁 ADMIN: Закрываем модальное окно');
      onClose();
      
      Alert.alert(t('common.success') || 'Успех', t('gifts.successGiftSent', { playerName }));
    } catch (error) {
      console.error('🎁 ADMIN: ❌❌❌ КРИТИЧЕСКАЯ ОШИБКА отправки подарка:', error);
      Alert.alert(t('common.error') || 'Ошибка', t('gifts.errorSendingGift'));
    } finally {
      console.log('🎁 ADMIN: Loading = false');
      setLoading(false);
    }
  };

  const deleteAdminItem = async (itemId: string) => {
    Alert.alert(
      t('gifts.deleteGiftQuestion'),
      t('gifts.deleteGiftConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel'
        },
        {
          text: t('common.delete') || 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('🗑️ ADMIN: Удаление подарка:', itemId);
              console.log('🗑️ ADMIN: Вызываем серверную функцию delete_item_by_user...');
              
              // Используем серверную функцию для удаления (обходит RLS)
              const { data, error } = await supabase
                .rpc('delete_item_by_user', {
                  item_id_param: itemId,
                  requesting_user_id: adminId
                });

              console.log('🗑️ ADMIN: Результат RPC вызова - data:', data, 'error:', error);

              if (error) {
                console.error('🗑️ ADMIN: ❌ Error deleting gift:', error);
                Alert.alert(t('common.error') || 'Error', t('gifts.errorDelete'));
                return;
              }

              if (!data) {
                console.log('🗑️ ADMIN: ❌ Функция вернула FALSE');
                Alert.alert(t('common.error') || 'Error', t('gifts.errorDelete'));
                return;
              }

              console.log('🗑️ ADMIN: ✅ Подарок успешно удален через серверную функцию');

              // Если удаляемый подарок был выбран, сбрасываем выбор
              if (selectedItem?.id === itemId) {
                setSelectedItem(null);
              }

              // Обновляем список
              await loadAdminItems();
              
              console.log('🗑️ ADMIN: ✅ Список обновлен');
            } catch (error) {
              console.error('🗑️ ADMIN: ❌ Error deleting gift:', error);
              Alert.alert(t('common.error') || 'Error', t('gifts.errorDelete'));
            }
          }
        }
      ]
    );
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'autograph': return 'pencil';
      case 'stick': return 'sports-hockey';
      case 'puck': return 'ellipse';
      case 'jersey': return 'shirt';
      case 'custom': return 'gift';
      default: return 'cube';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {t('gifts.sendGiftTo', { playerName })}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Выбор существующего подарка */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('gifts.selectExistingGift')}</Text>
            
            {loadingItems ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#fa2f40" />
                <Text style={styles.loadingText}>{t('common.loading') || 'Загрузка...'}</Text>
              </View>
            ) : adminItems.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsScroll}>
                {adminItems.map((item) => (
                  <View key={item.id} style={styles.itemCardWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.itemCard,
                        selectedItem?.id === item.id && styles.selectedItemCard
                      ]}
                      onPress={() => {
                        setSelectedItem(item);
                        setCustomGiftName('');
                        setImageUri(null);
                      }}
                    >
                      {item.image_url ? (
                        <Image source={{ uri: item.image_url }} style={styles.itemImage} />
                      ) : (
                        <View style={styles.placeholderImage}>
                          <Ionicons name={getItemTypeIcon(item.item_type)} size={24} color="#fa2f40" />
                        </View>
                      )}
                      <Text style={styles.itemName} numberOfLines={2}>{item.name}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.deleteItemButton}
                      onPress={() => deleteAdminItem(item.id)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.emptyText}>{t('gifts.noGiftsUploaded')}</Text>
            )}
          </View>

          {/* Создание нового подарка */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('gifts.orCreateNew')}</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('gifts.giftName')}</Text>
              <TextInput
                style={styles.input}
                value={customGiftName}
                onChangeText={setCustomGiftName}
                placeholder={t('gifts.giftNamePlaceholder')}
                placeholderTextColor="#888"
                onFocus={() => setSelectedItem(null)}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>{t('gifts.uploadImage')}</Text>
              <TouchableOpacity style={styles.imageButton} onPress={pickImage}>
                {imageUri ? (
                  <Image 
                    source={{ uri: imageUri }} 
                    style={[
                      styles.previewImage,
                      // Для PNG изображений убираем фон и добавляем поддержку прозрачности
                      imageUri.toLowerCase().includes('.png') && styles.pngPreviewImage
                    ]} 
                  />
                ) : (
                  <View style={styles.imagePlaceholder}>
                    <Ionicons name="camera" size={40} color="#888" />
                    <Text style={styles.imagePlaceholderText}>
                      {t('gifts.selectImage') || 'Выберите изображение'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelButtonText}>{t('common.cancel') || 'Отмена'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sendButton,
              (!selectedItem && !customGiftName.trim()) && styles.disabledButton
            ]}
            onPress={sendGift}
            disabled={(!selectedItem && !customGiftName.trim()) || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>
                {t('gifts.send')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    color: '#fff',
    marginLeft: 10,
  },
  itemsScroll: {
    marginBottom: 10,
    overflow: 'visible',
  },
  itemCardWrapper: {
    position: 'relative',
    marginRight: 15,
    overflow: 'visible',
  },
  deleteItemButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: '#fa2f40',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  itemCard: {
    width: 120,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedItemCard: {
    borderColor: '#fa2f40',
    backgroundColor: '#3a2a2a',
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 12,
    color: '#fff',
    textAlign: 'center',
    fontFamily: 'Gilroy-Regular',
  },
  emptyText: {
    color: '#888',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 10,
    fontFamily: 'Gilroy-Bold',
  },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    padding: 15,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  imageButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  imagePlaceholder: {
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: '#888',
    marginTop: 10,
    fontSize: 14,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 8,
    resizeMode: 'contain',
  },
  pngPreviewImage: {
    // Для PNG изображений убираем фон и добавляем поддержку прозрачности
    backgroundColor: 'transparent',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  sendButton: {
    flex: 1,
    backgroundColor: '#fa2f40',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#555',
  },
});

export default AdminGiftModal;