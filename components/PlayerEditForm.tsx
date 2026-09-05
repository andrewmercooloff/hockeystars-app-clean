import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { COUNTRIES, GRIPS } from '../utils/constants';
import {
    Alert,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Player, updatePlayer } from '../utils/playerStorage';
import { uploadImageToStorage } from '../utils/uploadImage';
import TeamSelector from './TeamSelector';
import { useLanguage } from '../contexts/LanguageContext';

interface PlayerEditFormProps {
  player: Player;
  currentUser?: Player;
  onSave: (updatedPlayer: Player) => void;
  onCancel: () => void;
}

const PlayerEditForm: React.FC<PlayerEditFormProps> = ({ player, currentUser, onSave, onCancel }) => {
  const { t } = useLanguage();
  const [editData, setEditData] = useState<Player>(player);
  const [selectedTeams, setSelectedTeams] = useState<any[]>([]);
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showPositionPicker, setShowPositionPicker] = useState(false);

  const positions = [t('profile.positions.center'), t('profile.positions.winger'), t('profile.positions.defender'), t('profile.positions.goalie')];

  const pickImage = async () => {
    Alert.alert(
      t('editProfile.selectPhotoSource'),
      t('editProfile.selectPhotoMessage'),
      [
        {
          text: t('editProfile.gallery'),
          onPress: () => pickFromGallery()
        },
        {
          text: t('editProfile.camera'),
          onPress: () => takePhoto()
        },
        {
          text: t('editProfile.cancel'),
          style: 'cancel'
        }
      ]
    );
  };

  const pickFromGallery = async () => {
    try {
      if (Platform.OS === 'web') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
              const base64String = e.target?.result as string;
              // ВАЖНО: используем фиксированное имя файла avatar_{playerId}.jpg для перезаписи старых файлов
              const uploadedUrl = await uploadImageToStorage(base64String, `avatar_${player.id}.jpg`);
              if (uploadedUrl) {
                setEditData({ ...editData, avatar: uploadedUrl });
              }
            };
            reader.readAsDataURL(file);
          }
        };
        input.click();
        return;
      } else {
        // На Android 13+ (API 33+) используем Photo Picker без разрешений
        // На старых версиях Android запрашиваем разрешения
        let result;
        if (Platform.OS === 'android' && Platform.Version >= 33) {
          // Android 13+ использует Photo Picker автоматически, разрешения не нужны
          result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
        } else {
          // Для старых версий Android запрашиваем разрешения
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert(t('error'), t('galleryPermissionRequired'));
            return;
          }

          result = await ImagePicker.launchImageLibraryAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.8,
          });
        }

        if (!result.canceled && result.assets[0]) {
          // ВАЖНО: используем фиксированное имя файла avatar_{playerId}.jpg для перезаписи старых файлов
          const uploadedUrl = await uploadImageToStorage(result.assets[0].uri, `avatar_${player.id}.jpg`);
          if (uploadedUrl) {
            setEditData({ ...editData, avatar: uploadedUrl });
          }
        }
      }
    } catch (error) {
      console.error('❌ Ошибка выбора фото из галереи:', error);
      Alert.alert(t('error'), t('galleryError'));
    }
  };

  const takePhoto = async () => {
    try {
      if (Platform.OS === 'web') {
        Alert.alert(t('info'), t('cameraNotSupported'));
        return;
      }

      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('error'), t('cameraPermissionRequired'));
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        // ВАЖНО: используем фиксированное имя файла avatar_{playerId}.jpg для перезаписи старых файлов
        const uploadedUrl = await uploadImageToStorage(result.assets[0].uri, `avatar_${player.id}.jpg`);
        if (uploadedUrl) {
          setEditData({ ...editData, avatar: uploadedUrl });
        }
      }
    } catch (error) {
      console.error('❌ Ошибка съемки фото:', error);
      Alert.alert(t('error'), t('cameraError'));
    }
  };

  const handleSave = async () => {
    try {
      // Проверяем права доступа
      if (currentUser && (currentUser.status !== 'admin' && currentUser.id !== player.id)) {
        Alert.alert(t('error'), t('noPermission'));
        return;
      }
      
      await updatePlayer(player.id, editData);
      onSave(editData);
      Alert.alert(t('success'), t('playerUpdated'));
    } catch (error) {
      console.error('❌ Ошибка сохранения:', error);
      Alert.alert(t('error'), t('saveError'));
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Фото профиля */}
      <View style={styles.photoSection}>
        <TouchableOpacity onPress={pickImage} style={styles.photoContainer}>
          {editData.avatar ? (
            <Image
              source={{ 
                uri: editData.avatar,
                cache: 'reload',
                headers: { 'Cache-Control': 'no-cache' }
              }}
              style={styles.profileImage}
            />
          ) : (
            <View style={[styles.profileImage, styles.avatarPlaceholder]}>
              <Ionicons name="person" size={48} color="#FFFFFF" />
            </View>
          )}
          <View style={styles.editOverlay}>
            <Ionicons name="camera" size={24} color="#fff" />
          </View>
        </TouchableOpacity>
      </View>

      {/* Основная информация */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('basicInfo')}</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('editProfile.name')}</Text>
          <TextInput
            style={styles.input}
            value={editData.name}
            onChangeText={(text) => setEditData({...editData, name: text})}
            placeholder={t('editProfile.namePlaceholder')}
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('editProfile.country')}</Text>
          <TouchableOpacity
            style={styles.pickerButton}
            onPress={() => setShowCountryPicker(true)}
          >
            <Text style={styles.pickerButtonText}>
              {editData.country ? t(`profile.countries.${editData.country}`) : t('selectCountry')}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        {player.status === 'player' && (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('editProfile.position')}</Text>
            <TouchableOpacity
              style={styles.pickerButton}
              onPress={() => setShowPositionPicker(true)}
            >
              <Text style={styles.pickerButtonText}>
                {editData.position ? t(`profile.positions.${editData.position.toLowerCase()}`) : t('selectPosition')}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('profile.birthDate')}</Text>
          <TextInput
            style={styles.input}
            value={editData.birthDate || ''}
            onChangeText={(text) => setEditData({...editData, birthDate: text})}
            placeholder={t('dateFormat')}
            placeholderTextColor="#888"
          />
        </View>
      </View>

      {/* Физические данные */}
      {player.status === 'player' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Физические данные</Text>
          
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('editProfile.height')}</Text>
            <TextInput
              style={styles.input}
              value={editData.height || ''}
              onChangeText={(text) => setEditData({...editData, height: text})}
              placeholder={t('editProfile.heightPlaceholder')}
              placeholderTextColor="#888"
              keyboardType="numeric"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>{t('editProfile.weight')}</Text>
            <TextInput
              style={styles.input}
              value={editData.weight || ''}
              onChangeText={(text) => setEditData({...editData, weight: text})}
              placeholder={t('editProfile.weightPlaceholder')}
              placeholderTextColor="#888"
              keyboardType="numeric"
            />
          </View>
        </View>
      )}

      {/* Статистика сезона 26/27 */}
      {player.status === 'player' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Статистика · 26/27</Text>
          
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Игр</Text>
              <TextInput
                style={styles.statInput}
                value={editData.games || ''}
                onChangeText={(text) => setEditData({...editData, games: text})}
                placeholder="0"
                placeholderTextColor="#888"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Голов</Text>
              <TextInput
                style={styles.statInput}
                value={editData.goals || ''}
                onChangeText={(text) => setEditData({...editData, goals: text})}
                placeholder="0"
                placeholderTextColor="#888"
                keyboardType="numeric"
              />
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statLabel}>Передач</Text>
              <TextInput
                style={styles.statInput}
                value={editData.assists || ''}
                onChangeText={(text) => setEditData({...editData, assists: text})}
                placeholder="0"
                placeholderTextColor="#888"
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>
      )}

      {/* Команды */}
      {(player.status === 'player' || player.status === 'coach') && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Команды</Text>
          <TeamSelector
            selectedTeams={selectedTeams}
            onTeamsChange={setSelectedTeams}
          />
        </View>
      )}

      {/* Социальные сети */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('editProfile.socialLinks')}</Text>
        
        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('socialLinks.instagram')}</Text>
          <TextInput
            style={styles.input}
            value={editData.instagram || ''}
            onChangeText={(text) => setEditData({...editData, instagram: text})}
            placeholder={t('socialLinks.instagramPlaceholder')}
            placeholderTextColor="#8a8a92"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('socialLinks.tiktok')}</Text>
          <TextInput
            style={styles.input}
            value={editData.tiktok || ''}
            onChangeText={(text) => {
              // TikTok ссылки чувствительны к регистру, преобразуем в нижний регистр
              const normalizedText = text.toLowerCase();
              setEditData({...editData, tiktok: normalizedText});
            }}
            placeholder={t('socialLinks.tiktokPlaceholder')}
            placeholderTextColor="#8a8a92"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('socialLinks.vk')}</Text>
          <TextInput
            style={styles.input}
            value={editData.vk || ''}
            onChangeText={(text) => setEditData({...editData, vk: text})}
            placeholder={t('socialLinks.vkPlaceholder')}
            placeholderTextColor="#8a8a92"
          />
        </View>

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>{t('socialLinks.website')}</Text>
          <TextInput
            style={styles.input}
            value={editData.website || ''}
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
            placeholderTextColor="#8a8a92"
          />
        </View>
      </View>

      {/* Кнопки */}
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave}>
          <Text style={styles.buttonText}>{t('editProfile.save')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
          <Text style={styles.buttonText}>{t('editProfile.cancel')}</Text>
        </TouchableOpacity>
      </View>

      {/* Модальные окна для выбора */}
      {showCountryPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('selectCountry')}</Text>
            <ScrollView style={styles.modalScroll}>
              {COUNTRIES.map((country) => (
                <TouchableOpacity
                  key={country}
                  style={styles.modalItem}
                  onPress={() => {
                    setEditData({...editData, country});
                    setShowCountryPicker(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{t(`profile.countries.${country}`)}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowCountryPicker(false)}
            >
              <Text style={styles.modalCancelText}>{t('editProfile.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {showPositionPicker && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('selectPosition')}</Text>
            <ScrollView style={styles.modalScroll}>
              {positions.map((position) => (
                <TouchableOpacity
                  key={position}
                  style={styles.modalItem}
                  onPress={() => {
                    setEditData({...editData, position});
                    setShowPositionPicker(false);
                  }}
                >
                  <Text style={styles.modalItemText}>{position}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowPositionPicker(false)}
            >
              <Text style={styles.modalCancelText}>{t('editProfile.cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#16121c',
  },
  photoSection: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  photoContainer: {
    position: 'relative',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: '#fa2f40',
  },
  avatarPlaceholder: {
    backgroundColor: '#2a2430',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#fa2f40',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    color: '#ccc',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#2a2430',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 16,
  },
  pickerButton: {
    backgroundColor: '#2a2430',
    borderRadius: 8,
    paddingHorizontal: 15,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pickerButtonText: {
    color: '#fff',
    fontSize: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  statItem: {
    flex: 1,
    marginHorizontal: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#ccc',
    textAlign: 'center',
    marginBottom: 5,
  },
  statInput: {
    backgroundColor: '#2a2430',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 14,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  button: {
    flex: 1,
    marginHorizontal: 10,
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButton: {
    backgroundColor: '#fa2f40',
  },
  cancelButton: {
    backgroundColor: '#8a8a92',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(22, 22, 26, 0.86)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#2a2430',
    borderRadius: 12,
    padding: 20,
    width: '80%',
    maxHeight: '70%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 15,
  },
  modalScroll: {
    maxHeight: 300,
  },
  modalItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#555',
  },
  modalItemText: {
    color: '#fff',
    fontSize: 16,
  },
  modalCancelButton: {
    marginTop: 15,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCancelText: {
    color: '#fa2f40',
    fontSize: 16,
  },
});

export default PlayerEditForm; 