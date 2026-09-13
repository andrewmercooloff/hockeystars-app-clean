import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { supabase } from '../utils/supabase';
import { useLanguage } from '../contexts/LanguageContext';
import { Player } from '../utils/playerStorage';
import {
  type AdminGiftItem,
  getCachedAdminGiftItems,
  invalidateAdminGiftItemsCache,
  loadAdminGiftItems,
} from '../utils/adminGiftItemsCache';
import { giftImageThumbUrl, prefetchGiftImages } from '../utils/giftImage';
import CachedImage from './CachedImage';

interface AdminGiftModalProps {
  visible: boolean;
  onClose: () => void;
  onGiftSent: () => void;
  adminId: string;
  playerId: string;
  playerName: string;
  updateNotificationCount?: (user?: Player | null) => Promise<void>;
}

const AdminGiftModal: React.FC<AdminGiftModalProps> = ({
  visible,
  onClose,
  onGiftSent,
  adminId,
  playerId,
  playerName,
}) => {
  const { t } = useLanguage();
  const [adminItems, setAdminItems] = useState<AdminGiftItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<AdminGiftItem | null>(null);
  const [customGiftName, setCustomGiftName] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const hydrateItems = useCallback(async () => {
    const cached = getCachedAdminGiftItems(adminId);
    if (cached) {
      setAdminItems(cached);
      setLoadingItems(false);
      void prefetchGiftImages(cached.map((item) => item.image_url));
    } else {
      setLoadingItems(true);
    }

    try {
      const items = await loadAdminGiftItems(adminId, { force: !!cached });
      setAdminItems(items);
    } catch {
      if (!cached) {
        Alert.alert(t('common.error') || 'Ошибка', t('gifts.failedToLoadItems') || 'Не удалось загрузить подарки');
      }
    } finally {
      setLoadingItems(false);
    }
  }, [adminId, t]);

  useEffect(() => {
    if (!visible) {
      setSearchQuery('');
      return;
    }
    void hydrateItems();
  }, [visible, adminId, hydrateItems]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return adminItems;
    return adminItems.filter((item) => item.name.toLowerCase().includes(q));
  }, [adminItems, searchQuery]);

  const pickImage = async () => {
    try {
      let result;
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: false,
          quality: 0.8,
          mediaTypes: ['images'],
        });
      } else {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Ошибка', 'Нет доступа к галерее');
          return;
        }

        result = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: false,
          quality: 0.8,
          mediaTypes: ['images'],
        });
      }

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Ошибка выбора изображения:', error);
      Alert.alert('Ошибка', 'Не удалось выбрать изображение');
    }
  };

  const uploadGiftImageToStorage = async (uri: string): Promise<string> => {
    const manipulatedImage = await ImageManipulator.manipulateAsync(
      uri,
      [{ resize: { width: 600 } }],
      {
        compress: 0.85,
        format: ImageManipulator.SaveFormat.PNG,
      },
    );

    const response = await fetch(manipulatedImage.uri);
    const arrayBuffer = await response.arrayBuffer();
    const filePath = `gifts/${Date.now()}.png`;
    const uint8Array = new Uint8Array(arrayBuffer);

    const { error } = await supabase.storage.from('avatars').upload(filePath, uint8Array, {
      contentType: 'image/png',
      upsert: false,
    });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from('avatars').getPublicUrl(filePath);
    return publicUrl;
  };

  const sendGift = async () => {
    if (!selectedItem && !customGiftName.trim()) {
      Alert.alert(t('common.error') || 'Ошибка', t('gifts.errorSelectOrCreate'));
      return;
    }

    try {
      setLoading(true);

      let itemToSend: AdminGiftItem;

      if (selectedItem) {
        itemToSend = selectedItem;
      } else {
        let imageUrl: string | null = null;

        if (imageUri) {
          imageUrl = await uploadGiftImageToStorage(imageUri);
        }

        const { data: newItem, error: createError } = await supabase
          .from('items')
          .insert([
            {
              owner_id: adminId,
              item_type: 'custom',
              name: customGiftName.trim(),
              description: 'Подарок от администратора',
              image_url: imageUrl,
            },
          ])
          .select('id,item_type,name,image_url,created_at')
          .single();

        if (createError) throw createError;

        itemToSend = newItem as AdminGiftItem;
        invalidateAdminGiftItemsCache(adminId);
      }

      const { data: existingGift, error: checkError } = await supabase
        .from('player_museum')
        .select('id')
        .eq('player_id', playerId)
        .eq('item_id', itemToSend.id)
        .maybeSingle();

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('Ошибка проверки дубликатов:', checkError);
      }

      if (existingGift) {
        Alert.alert(t('common.error') || 'Ошибка', t('gifts.errorGiftAlreadyExists', { playerName }));
        return;
      }

      const { error: museumError } = await supabase.from('player_museum').insert([
        {
          player_id: playerId,
          item_id: itemToSend.id,
          received_from: adminId,
          custom_name: `${selectedItem ? itemToSend.name : customGiftName.trim()} ${t('gifts.fromAdmin')}`,
        },
      ]);

      if (museumError) throw museumError;

      try {
        const { sendGiftNotification } = await import('../utils/playerStorage');
        await sendGiftNotification(
          playerId,
          playerName,
          t('gifts.fromAdmin') || 'Admin',
          itemToSend.name,
          {
            giftReceived: t('gifts.giftReceived') || 'Подарок получен!',
            giftReceivedMessage:
              t('gifts.giftReceivedFromAdmin', { giftName: itemToSend.name }) ||
              `Вы получили подарок от администратора: ${itemToSend.name}`,
            giftReceivedPushTitle: t('gifts.giftReceivedPush') || '🎁 Подарок получен!',
            giftReceivedPushBody:
              t('gifts.giftReceivedFromAdminPush', { giftName: itemToSend.name }) ||
              `Вы получили подарок от администратора: ${itemToSend.name}`,
          },
          adminId,
        );
      } catch (notificationError) {
        console.error('Ошибка отправки уведомлений:', notificationError);
      }

      setSelectedItem(null);
      setCustomGiftName('');
      setImageUri(null);
      onGiftSent();
      onClose();
      Alert.alert(t('common.success') || 'Успех', t('gifts.successGiftSent', { playerName }));
    } catch (error) {
      console.error('Ошибка отправки подарка:', error);
      Alert.alert(t('common.error') || 'Ошибка', t('gifts.errorSendingGift'));
    } finally {
      setLoading(false);
    }
  };

  const deleteAdminItem = async (itemId: string) => {
    Alert.alert(t('gifts.deleteGiftQuestion'), t('gifts.deleteGiftConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete') || 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const { data, error } = await supabase.rpc('delete_item_by_user', {
              item_id_param: itemId,
              requesting_user_id: adminId,
            });

            if (error || !data) {
              Alert.alert(t('common.error') || 'Error', t('gifts.errorDelete'));
              return;
            }

            if (selectedItem?.id === itemId) {
              setSelectedItem(null);
            }

            invalidateAdminGiftItemsCache(adminId);
            await hydrateItems();
          } catch {
            Alert.alert(t('common.error') || 'Error', t('gifts.errorDelete'));
          }
        },
      },
    ]);
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'autograph':
        return 'pencil';
      case 'stick':
        return 'sports-hockey';
      case 'puck':
        return 'ellipse';
      case 'jersey':
        return 'shirt';
      case 'custom':
        return 'gift';
      default:
        return 'cube';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{t('gifts.sendGiftTo', { playerName })}</Text>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('gifts.selectExistingGift')}</Text>

            {adminItems.length > 0 ? (
              <View style={styles.searchRow}>
                <Ionicons name="search-outline" size={18} color="#888" />
                <TextInput
                  style={styles.searchInput}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={t('gifts.searchByName')}
                  placeholderTextColor="#888"
                  autoCorrect={false}
                  autoCapitalize="none"
                  clearButtonMode="while-editing"
                />
                {searchQuery.trim() ? (
                  <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={8}>
                    <Ionicons name="close-circle" size={18} color="#888" />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {loadingItems && adminItems.length === 0 ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#fa2f40" />
                <Text style={styles.loadingText}>{t('common.loading') || 'Загрузка...'}</Text>
              </View>
            ) : filteredItems.length > 0 ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.itemsScroll}>
                {filteredItems.map((item) => (
                  <View key={item.id} style={styles.itemCardWrapper}>
                    <TouchableOpacity
                      style={[
                        styles.itemCard,
                        selectedItem?.id === item.id && styles.selectedItemCard,
                      ]}
                      onPress={() => {
                        setSelectedItem(item);
                        setCustomGiftName('');
                        setImageUri(null);
                      }}
                    >
                      {item.image_url ? (
                        <CachedImage
                          imageUrl={giftImageThumbUrl(item.image_url)}
                          style={styles.itemImage}
                          resizeMode="contain"
                          fallbackIcon={getItemTypeIcon(item.item_type)}
                          fallbackSize={24}
                          fallbackColor="#fa2f40"
                        />
                      ) : (
                        <View style={styles.placeholderImage}>
                          <Ionicons name={getItemTypeIcon(item.item_type)} size={24} color="#fa2f40" />
                        </View>
                      )}
                      <Text style={styles.itemName} numberOfLines={2}>
                        {item.name}
                      </Text>
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
            ) : adminItems.length > 0 ? (
              <Text style={styles.emptyText}>{t('gifts.noSearchResults')}</Text>
            ) : (
              <Text style={styles.emptyText}>{t('gifts.noGiftsUploaded')}</Text>
            )}
          </View>

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
                      imageUri.toLowerCase().includes('.png') && styles.pngPreviewImage,
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
            style={[styles.sendButton, !selectedItem && !customGiftName.trim() && styles.disabledButton]}
            onPress={sendGift}
            disabled={(!selectedItem && !customGiftName.trim()) || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.sendButtonText}>{t('gifts.send')}</Text>
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
    backgroundColor: '#16121c',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2430',
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
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    borderWidth: 1,
    borderColor: '#2a2430',
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    padding: 0,
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
    backgroundColor: '#2a2430',
  },
  placeholderImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: '#2a2430',
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
    borderColor: '#2a2430',
  },
  imageButton: {
    backgroundColor: '#2a2a2a',
    borderRadius: 8,
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2a2430',
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
    backgroundColor: 'transparent',
  },
  footer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#2a2430',
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
